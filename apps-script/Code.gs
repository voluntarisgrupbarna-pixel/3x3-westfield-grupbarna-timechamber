/**
 * 3×3 Westfield Glòries — Apps Script backend
 *
 * Pega aquest fitxer sencer al teu projecte d'Apps Script:
 *   https://script.google.com/d/1u1tBzm6fUy3hcSV81muUO7nJ729pAPB3DxqYNSCFAVVo5kBE_0-gy-iG/edit
 *
 * Després: Deploy → Manage deployments → Edit (icona llapis) → New version → Deploy.
 * La URL del webhook ha de continuar sent la mateixa.
 *
 * Què fa:
 *  - doPost(e):  rep inscripcions del form, escriu a Sheet (backup), reenvia a Fillout (primary), envia 2 emails.
 *  - doGet(e):   retorna {count, capacity} llegit DE FILLOUT (font de veritat), no del Sheet.
 *
 * Configuració REQUERIDA: Script Properties (Project Settings → Script properties → Add):
 *   - SHEET_ID            = 1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA
 *   - SHEET_NAME          = Inscripcions 2026
 *   - ADMIN_EMAIL         = anafernandezduran78@gmail.com
 *   - FILLOUT_API_KEY     = sk_prod_... (la teva clau de Fillout, des de Settings → Developer)
 *   - FILLOUT_FORM_ID     = qHCxiyaw5bus (form "My form" a Fillout)
 *   - CAPACITAT_TOTAL     = (opcional, p. ex. "48". Si no, mostra només "X equips inscrits")
 *
 * Per què aquesta arquitectura:
 *  - Fillout és la BASE DE DADES OFICIAL (no es pot modificar manualment, segura)
 *  - Sheet és BACKUP automàtic (per si Fillout fallés un dia)
 *  - Els emails es continuen enviant des d'Apps Script
 *  - El comptador de la web llegeix de Fillout (no del Sheet) → ningú pot manipular el comptador
 */

const PROPS = PropertiesService.getScriptProperties();
const FILLOUT_BASE = 'https://api.fillout.com/v1/api';

function getSheet_() {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const name = PROPS.getProperty('SHEET_NAME') || 'Inscripcions 2026';
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getCapacitat_() {
  const raw = PROPS.getProperty('CAPACITAT_TOTAL');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getFilloutAuth_() {
  const apiKey = PROPS.getProperty('FILLOUT_API_KEY');
  const formId = PROPS.getProperty('FILLOUT_FORM_ID');
  if (!apiKey || !formId) return null;
  return { apiKey: apiKey, formId: formId };
}

/**
 * GET — comptador d'equips inscrits per la web.
 * Llegeix el total de submissions de Fillout (font de veritat).
 * Si Fillout no està configurat o falla, fallback a comptar files del Sheet.
 * Retorna: { count: <num>, capacity: <num o null>, source: 'fillout'|'sheet'|'error', ts: <ISO> }
 */
function doGet(e) {
  let count = 0;
  let source = 'error';
  try {
    const auth = getFilloutAuth_();
    if (auth) {
      const url = FILLOUT_BASE + '/forms/' + encodeURIComponent(auth.formId) + '/submissions?limit=1';
      const resp = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + auth.apiKey },
        muteHttpExceptions: true,
      });
      if (resp.getResponseCode() === 200) {
        const json = JSON.parse(resp.getContentText() || '{}');
        // Fillout retorna { responses: [...], totalResponses: N, pageCount: ... }
        if (typeof json.totalResponses === 'number') {
          count = json.totalResponses;
          source = 'fillout';
        } else if (Array.isArray(json.responses)) {
          count = json.responses.length;
          source = 'fillout';
        }
      }
    }
    // Fallback al Sheet si Fillout no respon
    if (source === 'error') {
      const sheet = getSheet_();
      count = Math.max(0, sheet.getLastRow() - 1);
      source = 'sheet';
    }
  } catch (err) {
    Logger.log('doGet error: ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      count: count,
      capacity: getCapacitat_(),
      source: source,
      ts: new Date().toISOString(),
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST — rep submission del form, guarda a Sheet (backup), reenvia a Fillout (primary), envia emails.
 * El form web fa fetch amb mode "no-cors" i no llegeix la resposta.
 */
function doPost(e) {
  let filloutOk = false;
  let filloutError = '';

  try {
    const data = JSON.parse(e.postData.contents || '{}');

    // 1) Backup al Sheet
    try {
      writeToSheet_(data);
    } catch (sheetErr) {
      Logger.log('Sheet write error (no critic): ' + sheetErr);
    }

    // 2) Reenviar a Fillout (font oficial)
    const auth = getFilloutAuth_();
    if (auth) {
      try {
        const filloutBody = buildFilloutBody_(data);
        const url = FILLOUT_BASE + '/forms/' + encodeURIComponent(auth.formId) + '/submissions';
        const resp = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          headers: { 'Authorization': 'Bearer ' + auth.apiKey },
          payload: JSON.stringify(filloutBody),
          muteHttpExceptions: true,
        });
        const code = resp.getResponseCode();
        if (code >= 200 && code < 300) {
          filloutOk = true;
        } else {
          filloutError = 'HTTP ' + code + ': ' + resp.getContentText().substring(0, 300);
          Logger.log('Fillout error: ' + filloutError);
        }
      } catch (filErr) {
        filloutError = String(filErr);
        Logger.log('Fillout exception: ' + filErr);
      }
    } else {
      filloutError = 'FILLOUT_API_KEY o FILLOUT_FORM_ID no configurats';
    }

    // 3) Emails (al capità + admin)
    sendEmails_(data);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, fillout: filloutOk, filloutError: filloutError }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function writeToSheet_(data) {
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Data', 'Categoria', 'Nom equip', 'Capità', 'Email', 'Telèfon',
      'Jugadors', 'Mida samarretes', 'Notes', 'Total (€)',
      'Desc. aplicat?', 'Desc. invitacions?', 'Justificant'
    ]);
  }
  const jugadors = formatJugadors_(data);
  sheet.appendRow([
    data.data || new Date().toLocaleString('ca-ES'),
    data.categoria || '',
    data.nomEquip || '',
    data.capita || '',
    data.email || '',
    data.telefon || '',
    jugadors,
    data.mida || '',
    data.notes || '',
    data.total || '',
    data.descAplicat ? 'Sí' : 'No',
    data.descInvitacions ? 'Sí' : 'No',
    data.justificant || ''
  ]);
}

function formatJugadors_(data) {
  return (data.jugadors || []).map(function(j){
    return j.nom + (j.dni ? ' (' + j.dni + ')' : '');
  }).join(' · ');
}

/**
 * Construeix el body per Fillout API.
 * Mapping (form qHCxiyaw5bus "My form"):
 *   - nfnP → nomEquip
 *   - wJSK → capita
 *   - g54s → email
 *   - cfVA → JSON amb la resta (categoria, telefon, total, jugadors, mida, notes, etc.)
 *
 * Si afegeixes camps al form de Fillout, mira el seu ID a la resposta de
 * GET /v1/api/forms/qHCxiyaw5bus i amplia el mapping aquí.
 */
function buildFilloutBody_(data) {
  const jugadors = formatJugadors_(data);
  const detalls = {
    categoria: data.categoria || '',
    telefon: data.telefon || '',
    total: data.total || 0,
    jugadors: jugadors,
    mida: data.mida || '',
    notes: data.notes || '',
    descAplicat: !!data.descAplicat,
    descInvitacions: !!data.descInvitacions,
    justificant: data.justificant || '',
    data: data.data || new Date().toLocaleString('ca-ES'),
  };
  return {
    submissions: [{
      questions: [
        { id: 'nfnP', value: data.nomEquip || '' },
        { id: 'wJSK', value: data.capita || '' },
        { id: 'g54s', value: data.email || '' },
        { id: 'cfVA', value: JSON.stringify(detalls) },
      ]
    }]
  };
}

function sendEmails_(data) {
  if (data.email) {
    try {
      MailApp.sendEmail({
        to: data.email,
        subject: '✅ Inscripció rebuda · 3×3 Westfield Glòries 2026',
        htmlBody: buildEmailCapita_(data),
      });
    } catch (mailErr) {
      Logger.log('Error email capità: ' + mailErr);
    }
  }
  const admin = PROPS.getProperty('ADMIN_EMAIL') || 'anafernandezduran78@gmail.com';
  try {
    MailApp.sendEmail({
      to: admin,
      subject: '📩 Nova inscripció: ' + (data.nomEquip || '?') + ' (' + (data.categoria || '?') + ')',
      htmlBody: buildEmailAdmin_(data, formatJugadors_(data)),
    });
  } catch (mailErr) {
    Logger.log('Error email admin: ' + mailErr);
  }
}

function buildEmailCapita_(data) {
  return [
    '<h2 style="color:#dc2626">✅ Hem rebut la teva inscripció</h2>',
    '<p>Hola <strong>' + (data.capita || '') + '</strong>,</p>',
    '<p>Hem registrat l\'equip <strong>' + (data.nomEquip || '') + '</strong> a la categoria <strong>' + (data.categoria || '') + '</strong>.</p>',
    '<p><strong>Total a pagar:</strong> ' + (data.total || '') + ' €</p>',
    '<p>Quan rebem el justificant de transferència confirmarem la plaça per email i WhatsApp.</p>',
    '<p>Per qualsevol dubte: <a href="https://wa.me/+34698425153">WhatsApp del club</a>.</p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>'
  ].join('');
}

function buildEmailAdmin_(data, jugadors) {
  return [
    '<h2>📩 Nova inscripció</h2>',
    '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">',
    '<tr><td><strong>Equip</strong></td><td>' + (data.nomEquip || '') + '</td></tr>',
    '<tr><td><strong>Categoria</strong></td><td>' + (data.categoria || '') + '</td></tr>',
    '<tr><td><strong>Capità</strong></td><td>' + (data.capita || '') + '</td></tr>',
    '<tr><td><strong>Email</strong></td><td>' + (data.email || '') + '</td></tr>',
    '<tr><td><strong>Telèfon</strong></td><td>' + (data.telefon || '') + '</td></tr>',
    '<tr><td><strong>Jugadors</strong></td><td>' + jugadors + '</td></tr>',
    '<tr><td><strong>Mida</strong></td><td>' + (data.mida || '') + '</td></tr>',
    '<tr><td><strong>Total</strong></td><td>' + (data.total || '') + ' €</td></tr>',
    '<tr><td><strong>Notes</strong></td><td>' + (data.notes || '') + '</td></tr>',
    '<tr><td><strong>Justificant</strong></td><td>' + (data.justificant || '—') + '</td></tr>',
    '</table>'
  ].join('');
}

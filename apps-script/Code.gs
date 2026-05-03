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
 *   - SHEET_ID              = 1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA
 *   - SHEET_NAME            = Inscripcions 2026
 *   - ADMIN_EMAIL           = voluntaris@grupbarna.info
 *   - FILLOUT_API_KEY       = sk_prod_... (la teva clau de Fillout, des de Settings → Developer)
 *   - FILLOUT_FORM_ID       = qHCxiyaw5bus (form "My form" a Fillout)
 *   - DRIVE_FOLDER_NAME     = (opcional, p. ex. "3x3 Justificants 2026". Si no, "3x3 Justificants 2026")
 *   - CAPACITAT_TOTAL       = (opcional, p. ex. "48". Si no, mostra només "X equips inscrits")
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
  // Default 100 (suma de quotes per categoria a src/lib/categories.ts)
  if (!raw) return 100;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 100;
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

  // Per-categoria counts llegits del Sheet (rapid, sense gastar quota Fillout)
  let byCategory = {};
  try { byCategory = getByCategoryFromSheet_(); } catch (e) { Logger.log('byCategory err: ' + e); }

  return ContentService
    .createTextOutput(JSON.stringify({
      count: count,
      capacity: getCapacitat_(),
      byCategory: byCategory,
      source: source,
      ts: new Date().toISOString(),
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Compta inscripcions agrupades per categoria llegint del Sheet.
 * Retorna p.ex. {"Sèniors": 7, "Cadet": 3, ...}
 */
function getByCategoryFromSheet_() {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return {};
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const catCol = headers.indexOf('Categoria');
  if (catCol < 0) return {};
  const cats = sheet.getRange(2, catCol + 1, sheet.getLastRow() - 1, 1).getValues();
  const counts = {};
  cats.forEach(function(row) {
    const c = String(row[0] || '').trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  });
  return counts;
}

/**
 * POST — rep submission del form, guarda a Sheet (backup), reenvia a Fillout (primary), envia emails.
 * El form web fa fetch amb mode "no-cors" i no llegeix la resposta.
 */
function doPost(e) {
  let filloutOk = false;
  let filloutError = '';

  try {
    const raw = JSON.parse(e.postData.contents || '{}');

    // ─── Acció checkin (escanejat el QR de l'equip al torneig) ───
    if (raw.action === 'checkin' && raw.teamId) {
      try { markCheckinOnSheet_(raw.teamId, raw.local || raw.timestamp || ''); } catch (err) { Logger.log('checkin error: ' + err); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'checkin', teamId: raw.teamId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ─── Acció waitlist (algú s'apunta a la llista d'espera) ───
    if (raw.action === 'waitlist' && raw.email) {
      try { addToWaitlist_(raw); } catch (err) { Logger.log('waitlist error: ' + err); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'waitlist' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ─── Acció individual (jugador sense equip, 20€) ───
    if (raw.action === 'individual' && raw.email) {
      try { addIndividualPlayer_(raw); } catch (err) { Logger.log('individual error: ' + err); }
      // Continuem el flow normal d'emails (QR check-in personal arriba al jugador)
      // raw porta teamId/checkinUrl ja generats al frontend
      const data = normalizeFormData_(raw);
      try { sendEmails_(data, null); } catch (e) { Logger.log('individual mail err: ' + e); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'individual', teamId: raw.teamId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = normalizeFormData_(raw);

    // 1) Si arriba justificant en base64, pujar-lo a Drive primer (per tenir URL al Sheet i Fillout)
    let justificantUpload = null;
    if (raw.justificant && raw.justificant.base64) {
      try {
        justificantUpload = uploadJustificantToDrive_(raw.justificant, data.nomEquip);
      } catch (driveErr) {
        Logger.log('Drive upload error: ' + driveErr);
      }
    }

    // 2) Backup al Sheet (amb la URL del justificant si existeix)
    try {
      writeToSheet_(data, justificantUpload);
    } catch (sheetErr) {
      Logger.log('Sheet write error (no critic): ' + sheetErr);
    }

    // 3) Reenviar a Fillout (font oficial) amb la URL del justificant
    const auth = getFilloutAuth_();
    if (auth) {
      try {
        const filloutBody = buildFilloutBody_(data, justificantUpload);
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

    // 4) Emails (al capità + admin)
    sendEmails_(data, justificantUpload);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        fillout: filloutOk,
        filloutError: filloutError,
        driveUploaded: !!justificantUpload,
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Normalitza el payload del form (que té capNom/capCognom/capEmail/capTelefon/capCategoria/capTalla/capPoblacio/comentaris)
 * a un objecte uniforme que tot el codi pot llegir directament.
 */
function normalizeFormData_(data) {
  // Per a inscripcions individuals, "nomEquip" pren el nom del jugador i "capita" igual.
  const isIndividual = data.action === 'individual' || data.tipus === 'individual';
  const fullName = ((data.nom || '') + ' ' + (data.cognom || '')).trim();
  return {
    tipus: isIndividual ? 'individual' : 'equip',
    data: data.data || new Date().toLocaleString('ca-ES'),
    teamId: data.teamId || '',
    checkinUrl: data.checkinUrl || '',
    concepte: data.concepte || '',
    categoria: data.categoria || data.capCategoria || '',
    nomEquip: data.nomEquip || (isIndividual ? fullName : ''),
    capita: data.capita || ((data.capNom || '') + ' ' + (data.capCognom || '')).trim() || fullName,
    poblacio: data.poblacio || data.capPoblacio || '',
    email: data.email || data.capEmail || '',
    telefon: data.telefon || data.capTelefon || '',
    mida: data.mida || data.capTalla || data.talla || '',
    notes: data.notes || data.comentaris || data.observacions || '',
    total: data.total || (isIndividual ? 20 : 0),
    descAplicat: !!data.descAplicat,
    descInvitacions: !!data.descInvitacions,
    jugadors: Array.isArray(data.jugadors) ? data.jugadors : [],
    justificant: data.justificant || null,
  };
}

function writeToSheet_(data, justificantUpload) {
  // Defensiu: si arriba payload sense normalitzar (cas legacy), normalitzem
  const d = data && data.capita ? data : normalizeFormData_(data);
  const sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Data', 'Team ID', 'Concepte', 'Categoria', 'Nom equip', 'Capità', 'Població', 'Email', 'Telèfon',
      'Jugadors', 'Mida samarretes', 'Notes', 'Total (€)',
      'Desc. aplicat?', 'Desc. invitacions?', 'Justificant Drive URL',
      'Check-in URL', 'Arribat (timestamp)'
    ]);
  }
  const jugadors = formatJugadors_(d);
  const justifUrl = justificantUpload && justificantUpload.url ? justificantUpload.url : '';
  sheet.appendRow([
    d.data,
    d.teamId,
    d.concepte,
    d.categoria,
    d.nomEquip,
    d.capita,
    d.poblacio,
    d.email,
    d.telefon,
    jugadors,
    d.mida,
    d.notes,
    d.total,
    d.descAplicat ? 'Sí' : 'No',
    d.descInvitacions ? 'Sí' : 'No',
    justifUrl,
    d.checkinUrl,
    ''   // "Arribat" buit fins que algú escanegi el QR el dia del torneig
  ]);
}

/**
 * Desa un jugador individual (sense equip) a una pestanya pròpia "Jugadors_Individuals".
 * El club l'assignarà a un equip 1 setmana abans del torneig segons categoria/edat/posició.
 */
function addIndividualPlayer_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName('Jugadors_Individuals');
  if (!sheet) sheet = ss.insertSheet('Jugadors_Individuals');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Data', 'Team ID', 'Concepte', 'Nom', 'Cognom', 'Data naixement', 'Categoria',
      'Email', 'Telèfon', 'Població', 'Talla', 'Posició preferida', 'Nivell',
      'Observacions', 'Equip assignat', 'Pagat?', 'Arribat (timestamp)'
    ]);
  }
  sheet.appendRow([
    data.data || new Date().toLocaleString('ca-ES'),
    data.teamId || '',
    data.concepte || '',
    data.nom || '',
    data.cognom || '',
    data.dataNaix || '',
    data.categoria || '',
    data.email || '',
    data.telefon || '',
    data.poblacio || '',
    data.talla || '',
    data.posicio || '',
    data.nivell || '',
    data.observacions || '',
    '',  // Equip assignat (Ana ho omple a mà)
    'No',
    '',  // Arribat
  ]);
}

/**
 * Apunta un equip a la llista d'espera (pestanya separada del Sheet).
 * Crea la pestanya "Llista_Espera" si no existeix i envia email de confirmació
 * + alerta a admin perquè sàpiga que algú vol entrar quan s'esgotin les places.
 */
function addToWaitlist_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName('Llista_Espera');
  if (!sheet) sheet = ss.insertSheet('Llista_Espera');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Data', 'Nom equip', 'Categoria', 'Capità', 'Email', 'Telèfon', 'Població', 'Notificat?']);
  }
  sheet.appendRow([
    data.data || new Date().toLocaleString('ca-ES'),
    data.nomEquip || '',
    data.categoria || '',
    data.capita || '',
    data.email || '',
    data.telefon || '',
    data.poblacio || '',
    'No',
  ]);
  // Email a l'usuari
  if (data.email) {
    try {
      MailApp.sendEmail({
        to: data.email,
        subject: '📋 Estàs a la llista d\'espera · 3×3 Westfield Glòries 2026',
        htmlBody: '<h2 style="color:#f97316">📋 Llista d\'espera confirmada</h2>'
          + '<p>Hola <strong>' + (data.capita || '') + '</strong>,</p>'
          + '<p>Hem rebut la teva petició per a l\'equip <strong>' + (data.nomEquip || '') + '</strong> (' + (data.categoria || '') + ').</p>'
          + '<p>El torneig està ple, però si una plaça queda lliure et trucarem o enviarem WhatsApp <strong>per ordre d\'arribada</strong> a la teva categoria.</p>'
          + '<p>Mentrestant, <strong>comparteix el torneig</strong> amb els teus amics — els equips que comparteixen passen davant a la cua!</p>'
          + '<p>Per qualsevol dubte: <a href="https://wa.me/+34698425153">WhatsApp del club</a>.</p>'
          + '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>',
      });
    } catch (e) { Logger.log('waitlist mail user err: ' + e); }
  }
  // Alerta a admin
  const admin = PROPS.getProperty('ADMIN_EMAIL') || 'voluntaris@grupbarna.info';
  try {
    MailApp.sendEmail({
      to: admin,
      subject: '📋 Llista d\'espera: ' + (data.nomEquip || '?') + ' (' + (data.categoria || '?') + ')',
      htmlBody: '<h3>Nou apunt a la llista d\'espera</h3>'
        + '<p>Equip: <strong>' + (data.nomEquip || '') + '</strong> · Categoria: ' + (data.categoria || '') + '</p>'
        + '<p>Capità: ' + (data.capita || '') + '</p>'
        + '<p>Email: <a href="mailto:' + (data.email || '') + '">' + (data.email || '') + '</a></p>'
        + '<p>Telèfon: <a href="tel:' + (data.telefon || '') + '">' + (data.telefon || '') + '</a></p>'
        + '<p>Població: ' + (data.poblacio || '') + '</p>',
    });
  } catch (e) { Logger.log('waitlist mail admin err: ' + e); }
}

/**
 * Quan algú escaneja el QR el dia del torneig i prem "Marcar arribada",
 * trobem la fila amb teamId i hi posem el timestamp d'arribada.
 */
function markCheckinOnSheet_(teamId, localTimestamp) {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const teamIdCol = headers.indexOf('Team ID') + 1;
  const arribatCol = headers.indexOf('Arribat (timestamp)') + 1;
  if (!teamIdCol || !arribatCol) return;

  const allTeamIds = sheet.getRange(2, teamIdCol, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < allTeamIds.length; i++) {
    if (String(allTeamIds[i][0]).trim() === String(teamId).trim()) {
      sheet.getRange(i + 2, arribatCol).setValue(localTimestamp || new Date().toLocaleString('ca-ES'));
      return;
    }
  }
}

function formatJugadors_(data) {
  return (data.jugadors || []).map(function(j){
    return j.nom + (j.dni ? ' (' + j.dni + ')' : '');
  }).join(' · ');
}

/**
 * Puja el justificant base64 a una carpeta de Drive i el comparteix per link.
 * Retorna { url, filename, fileId } o null en cas d'error.
 *
 * El nom del fitxer porta el codi de inscripció ("3X3+EQUIPNAME") perquè
 * Ana els pugui agrupar visualment a la carpeta.
 */
function uploadJustificantToDrive_(justificant, nomEquip) {
  if (!justificant || !justificant.base64) return null;
  const folderName = PROPS.getProperty('DRIVE_FOLDER_NAME') || '3x3 Justificants 2026';
  const folder = getOrCreateFolder_(folderName);

  const codi = '3X3+' + (String(nomEquip || 'EQUIP').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''));
  const safeName = (justificant.name || 'justificant').replace(/[^a-zA-Z0-9._-]+/g, '_');
  const fname = codi + '_' + safeName;

  const blob = Utilities.newBlob(
    Utilities.base64Decode(justificant.base64),
    justificant.mimeType || 'application/octet-stream',
    fname
  );
  const file = folder.createFile(blob);

  // Compartit "anyone with link can view" perquè Fillout pugui mostrar la preview
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    Logger.log('No s\'ha pogut compartir el fitxer: ' + shareErr);
  }

  return {
    url: file.getUrl(),
    filename: file.getName(),
    fileId: file.getId(),
  };
}

function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

/**
 * Construeix el body per Fillout API.
 * Mapping (form qHCxiyaw5bus "My form"):
 *   - nfnP → nomEquip
 *   - wJSK → capita
 *   - g54s → email
 *   - cfVA → JSON amb la resta (categoria, telefon, total, jugadors, mida, notes, etc.)
 *   - 9jeb → FileUpload [{url, filename}] (justificant pujat a Drive)
 *
 * Si afegeixes camps al form de Fillout, mira el seu ID a la resposta de
 * GET /v1/api/forms/qHCxiyaw5bus i amplia el mapping aquí.
 */
function buildFilloutBody_(data, justificantUpload) {
  const jugadors = formatJugadors_(data);
  const detalls = {
    concepte: data.concepte || ('3X3+' + String(data.nomEquip || 'EQUIP').toUpperCase()),
    categoria: data.categoria || '',
    telefon: data.telefon || '',
    total: data.total || 0,
    jugadors: jugadors,
    mida: data.mida || '',
    notes: data.notes || '',
    descAplicat: !!data.descAplicat,
    descInvitacions: !!data.descInvitacions,
    justificantDriveUrl: justificantUpload ? justificantUpload.url : '',
    data: data.data || new Date().toLocaleString('ca-ES'),
  };
  const questions = [
    { id: 'nfnP', value: data.nomEquip || '' },
    { id: 'wJSK', value: data.capita || '' },
    { id: 'g54s', value: data.email || '' },
    { id: 'cfVA', value: JSON.stringify(detalls) },
  ];
  if (justificantUpload && justificantUpload.url) {
    questions.push({
      id: '9jeb',
      value: [{ url: justificantUpload.url, filename: justificantUpload.filename }],
    });
  }
  return { submissions: [{ questions: questions }] };
}

function sendEmails_(data, justificantUpload) {
  // Genera el QR PNG des del worker /qr.svg → convertir a PNG inline
  let qrBlob = null;
  if (data.checkinUrl) {
    try {
      const qrUrl = 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=400&data='
        + encodeURIComponent(data.checkinUrl);
      const resp = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) {
        // SVG → afegir imatge inline a l'email com a "checkinQr"
        // (Les apps de mail no sempre rendritzen SVG inline. Posem-la com a image/svg+xml.)
        qrBlob = resp.getBlob().setName('checkin-qr.svg');
      }
    } catch (qrErr) {
      Logger.log('QR fetch error: ' + qrErr);
    }
  }

  // Email al capità
  if (data.email) {
    try {
      const opts = { htmlBody: buildEmailCapita_(data) };
      if (qrBlob) opts.inlineImages = { checkinQr: qrBlob };
      MailApp.sendEmail({
        to: data.email,
        subject: '✅ Inscripció rebuda · 3×3 Westfield Glòries 2026',
        htmlBody: buildEmailCapita_(data),
        attachments: qrBlob ? [qrBlob] : undefined,
      });
    } catch (mailErr) {
      Logger.log('Error email capità: ' + mailErr);
    }
  }
  // Email a admin
  const admin = PROPS.getProperty('ADMIN_EMAIL') || 'voluntaris@grupbarna.info';
  try {
    MailApp.sendEmail({
      to: admin,
      subject: '📩 Nova inscripció: ' + (data.nomEquip || '?') + ' (' + (data.categoria || '?') + ')',
      htmlBody: buildEmailAdmin_(data, formatJugadors_(data), justificantUpload),
      attachments: qrBlob ? [qrBlob] : undefined,
    });
  } catch (mailErr) {
    Logger.log('Error email admin: ' + mailErr);
  }
}

function buildEmailCapita_(data) {
  const checkinUrl = data.checkinUrl || '';
  const teamId = data.teamId || '';
  const qrPngUrl = checkinUrl
    ? 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=400&data=' + encodeURIComponent(checkinUrl)
    : '';
  return [
    '<h2 style="color:#dc2626">✅ Hem rebut la teva inscripció</h2>',
    '<p>Hola <strong>' + (data.capita || '') + '</strong>,</p>',
    '<p>Hem registrat l\'equip <strong>' + (data.nomEquip || '') + '</strong> a la categoria <strong>' + (data.categoria || '') + '</strong>.</p>',
    '<p><strong>Total a pagar:</strong> ' + (data.total || '') + ' €</p>',
    '<p>Quan rebem el justificant de transferència confirmarem la plaça per email i WhatsApp.</p>',
    qrPngUrl ? (
      '<div style="margin:24px 0;padding:20px;background:#fef2f2;border:2px solid #dc2626;border-radius:16px;text-align:center">' +
      '<p style="margin:0 0 8px;font-weight:bold;color:#dc2626;text-transform:uppercase;letter-spacing:1px;font-size:13px">🎟️ QR del teu equip · ID ' + teamId + '</p>' +
      '<img src="' + qrPngUrl + '" alt="QR check-in" style="width:220px;height:220px;display:block;margin:8px auto"/>' +
      '<p style="margin:8px 0 0;font-size:12px;color:#7f1d1d"><strong>Guarda aquest email</strong> o el QR. El necessiteu el dia del torneig per a la <strong>recollida de samarretes</strong> i el <strong>check-in</strong>.</p>' +
      '<p style="margin:8px 0 0;font-size:11px;color:#7f1d1d">També pots obrir directament: <a href="' + checkinUrl + '" style="color:#dc2626">' + checkinUrl + '</a></p>' +
      '</div>'
    ) : '',
    '<p>Per qualsevol dubte: <a href="https://wa.me/+34698425153">WhatsApp del club</a>.</p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>'
  ].join('');
}

function buildEmailAdmin_(data, jugadors, justificantUpload) {
  const justifCell = justificantUpload && justificantUpload.url
    ? '<a href="' + justificantUpload.url + '">' + (justificantUpload.filename || 'Veure justificant') + '</a>'
    : '—';
  const concepte = '3X3+' + String(data.nomEquip || 'EQUIP').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const checkinUrl = data.checkinUrl || '';
  const qrUrl = checkinUrl
    ? 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=300&data=' + encodeURIComponent(checkinUrl)
    : '';
  return [
    '<h2>📩 Nova inscripció</h2>',
    '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">',
    '<tr><td><strong>Team ID</strong></td><td><code>' + (data.teamId || '—') + '</code></td></tr>',
    '<tr><td><strong>Concepte</strong></td><td><code>' + concepte + '</code></td></tr>',
    '<tr><td><strong>Equip</strong></td><td>' + (data.nomEquip || '') + '</td></tr>',
    '<tr><td><strong>Categoria</strong></td><td>' + (data.categoria || '') + '</td></tr>',
    '<tr><td><strong>Capità</strong></td><td>' + (data.capita || '') + '</td></tr>',
    '<tr><td><strong>Població</strong></td><td>' + (data.poblacio || data.capPoblacio || '—') + '</td></tr>',
    '<tr><td><strong>Email</strong></td><td>' + (data.email || '') + '</td></tr>',
    '<tr><td><strong>Telèfon</strong></td><td>' + (data.telefon || '') + '</td></tr>',
    '<tr><td><strong>Jugadors</strong></td><td>' + jugadors + '</td></tr>',
    '<tr><td><strong>Mida</strong></td><td>' + (data.mida || '') + '</td></tr>',
    '<tr><td><strong>Total</strong></td><td>' + (data.total || '') + ' €</td></tr>',
    '<tr><td><strong>Notes</strong></td><td>' + (data.notes || '') + '</td></tr>',
    '<tr><td><strong>Justificant</strong></td><td>' + justifCell + '</td></tr>',
    qrUrl ? '<tr><td><strong>Check-in QR</strong></td><td><a href="' + checkinUrl + '"><img src="' + qrUrl + '" width="180" height="180" alt="QR check-in"/></a><br><a href="' + checkinUrl + '" style="font-size:10px;font-family:monospace">' + checkinUrl + '</a></td></tr>' : '',
    '</table>'
  ].join('');
}

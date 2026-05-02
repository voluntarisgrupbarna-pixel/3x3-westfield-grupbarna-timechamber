/**
 * 3×3 Westfield Glòries — Apps Script backend
 *
 * Pegat aquest fitxer sencer al teu projecte d'Apps Script:
 *   https://script.google.com/d/1u1tBzm6fUy3hcSV81muUO7nJ729pAPB3DxqYNSCFAVVo5kBE_0-gy-iG/edit
 *
 * Després: Deploy → Manage deployments → Edit (icona llapis) → New version → Deploy.
 * La URL del webhook ha de continuar sent la mateixa.
 *
 * Què fa:
 *  - doPost(e):  rep inscripcions del form, escriu a Sheet, envia 2 emails (capità + Ana).
 *  - doGet(e):   retorna {count, capacity} en JSON perquè la web mostri el comptador live.
 *
 * Configuració: Script Properties (Project Settings → Script properties):
 *   - SHEET_ID            = 1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA
 *   - SHEET_NAME          = Inscripcions 2026
 *   - ADMIN_EMAIL         = anafernandezduran78@gmail.com
 *   - CAPACITAT_TOTAL     = (opcional, p. ex. "48" si vols mostrar X de 48 a la web)
 *
 * Si no defineixes CAPACITAT_TOTAL, el comptador a la web mostra només "X equips inscrits".
 */

const PROPS = PropertiesService.getScriptProperties();

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

/**
 * GET — comptador d'equips inscrits per la web.
 * Retorna: { count: <files - 1>, capacity: <num o null>, ts: <ISO> }
 */
function doGet(e) {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    const count = Math.max(0, lastRow - 1); // -1 pel header
    const payload = {
      count: count,
      capacity: getCapacitat_(),
      ts: new Date().toISOString(),
    };
    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST — rep submission del form i guarda + envia emails.
 * El form fa fetch amb mode "no-cors" i no llegeix la resposta.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const sheet = getSheet_();

    // Si la sheet està buida, escriu el header
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Data', 'Categoria', 'Nom equip', 'Capità', 'Email', 'Telèfon',
        'Jugadors', 'Mida samarretes', 'Notes', 'Total (€)',
        'Desc. aplicat?', 'Desc. invitacions?', 'Justificant'
      ]);
    }

    const jugadors = (data.jugadors || []).map(function(j){
      return j.nom + (j.dni ? ' (' + j.dni + ')' : '');
    }).join(' · ');

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

    // Email al capità
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

    // Email a admin
    const admin = PROPS.getProperty('ADMIN_EMAIL') || 'anafernandezduran78@gmail.com';
    try {
      MailApp.sendEmail({
        to: admin,
        subject: '📩 Nova inscripció: ' + (data.nomEquip || '?') + ' (' + (data.categoria || '?') + ')',
        htmlBody: buildEmailAdmin_(data, jugadors),
      });
    } catch (mailErr) {
      Logger.log('Error email admin: ' + mailErr);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
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

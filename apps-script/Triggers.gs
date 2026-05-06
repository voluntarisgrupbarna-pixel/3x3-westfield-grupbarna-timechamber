/**
 * 3×3 Westfield Glòries — Time-based triggers per emails de countdown
 *
 * Pega aquest fitxer al teu projecte d'Apps Script com a fitxer addicional
 * (no reemplaça Code.gs; conviuen).
 *
 * SETUP (un cop, automàtic):
 *   1. Pega aquest fitxer a Apps Script.
 *   2. Selecciona la funció `setupTriggers` al desplegable de funcions de l'editor.
 *   3. Clica "Run". La primera vegada autoritza permisos.
 *   4. Llest: instal·la els 3 triggers diaris (idempotent — es pot executar
 *      més d'un cop sense duplicar res).
 *
 *   Si vols veure'ls, "Triggers" (rellotge a l'esquerra) llistarà:
 *     · sendT7Reminders     · cada dia 9h-10h
 *     · sendT1Reminders     · cada dia 9h-10h
 *     · sendPostEventEmails · cada dia 10h-11h (només actua l'endemà del torneig)
 *
 *   Cada funció comprova internament la data; si no toca, surt sense fer res.
 *
 * Funcions:
 *   - sendT7Reminders():    7 dies abans del torneig → "Falta 1 setmana!"
 *   - sendT1Reminders():    24h abans → "Demà comença · QR + recordatoris"
 *   - sendPostEventEmails(): l'endemà del torneig → "Gràcies + comparteix experiència"
 *
 * Llegeixen tots els capitans inscrits del Sheet i envien per MailApp.
 */

const EVENT_DATE_ISO = '2026-06-06';   // canvia si la data canvia
const EVENT_DAY_2_ISO = '2026-06-07';

function _eventDate_() { return new Date(EVENT_DATE_ISO + 'T09:00:00+02:00'); }
function _daysUntil_(targetIso) {
  const ms = new Date(targetIso + 'T00:00:00+02:00').getTime() - Date.now();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Llegeix els capitans del Sheet (Inscripcions 2026) i retorna array {nom, email, equip} */
function _getCaptains_() {
  const sheet = getSheet_();   // declarat a Code.gs
  if (sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colNomEquip = headers.indexOf('Nom equip');
  const colCapita   = headers.indexOf('Capità');
  const colEmail    = headers.indexOf('Email');
  const colCheckin  = headers.indexOf('Check-in URL');
  if (colEmail < 0) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows.map(r => ({
    equip: colNomEquip >= 0 ? String(r[colNomEquip] || '') : '',
    capita: colCapita >= 0 ? String(r[colCapita] || '') : '',
    email: String(r[colEmail] || '').trim(),
    checkinUrl: colCheckin >= 0 ? String(r[colCheckin] || '') : '',
  })).filter(c => c.email.includes('@'));
}

/* ─── Email T-7 (1 setmana abans) ─── */

function sendT7Reminders() {
  const days = _daysUntil_(EVENT_DATE_ISO);
  Logger.log('sendT7Reminders · days until event: ' + days);
  if (days !== 7) return; // només envia exactament a T-7
  const captains = _getCaptains_();
  Logger.log('Sending T-7 to ' + captains.length + ' captains');
  captains.forEach(c => {
    try {
      sendMail_({
        to: c.email,
        subject: '🏀 Falta 1 setmana per al 3×3 Westfield Glòries 2026',
        htmlBody: _emailT7_(c),
      });
    } catch (e) { Logger.log('T7 mail err: ' + e); }
  });
}

function _emailT7_(c) {
  return [
    '<h2 style="color:#dc2626">🏀 Falta 1 setmana!</h2>',
    '<p>Hola <strong>' + (c.capita || c.equip) + '</strong>,</p>',
    '<p>El <strong>3×3 Westfield Glòries 2026</strong> arriba en 7 dies. El teu equip <strong>' + c.equip + '</strong> està a la llista.</p>',
    '<h3 style="color:#dc2626">Recordatoris importants</h3>',
    '<ul>',
    '<li>📅 <strong>Dissabte 6 i diumenge 7 de juny 2026</strong>, des de les 9:00.</li>',
    '<li>📍 Tres seus al barri del Clot-Glòries · sabreu la vostra exacta el divendres 5.</li>',
    '<li>🆔 Porteu <strong>DNI de tots els jugadors</strong> al check-in.</li>',
    '<li>👕 Sabatilles de pista, samarreta interior (entreguem la oficial el dia), aigua i ganes.</li>',
    '</ul>',
    '<h3 style="color:#dc2626">El teu QR de check-in</h3>',
    '<p>El necessitareu a l\'arribada per recollir samarretes i confirmar arribada:</p>',
    c.checkinUrl ? (
      '<p><a href="' + c.checkinUrl + '" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">🎟️ Obrir el meu QR</a></p>' +
      '<p style="font-size:11px;color:#666">URL directa: <a href="' + c.checkinUrl + '">' + c.checkinUrl + '</a></p>'
    ) : '<p>(El QR el pots recuperar a l\'email original de inscripció.)</p>',
    '<p>Per qualsevol dubte: <a href="https://wa.me/+34698425153">WhatsApp del club</a> · <a href="mailto:voluntaris@grupbarna.info">voluntaris@grupbarna.info</a></p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>'
  ].join('');
}

/* ─── Email T-1 (24h abans) ─── */

function sendT1Reminders() {
  const days = _daysUntil_(EVENT_DATE_ISO);
  Logger.log('sendT1Reminders · days until event: ' + days);
  if (days !== 1) return;
  const captains = _getCaptains_();
  captains.forEach(c => {
    try {
      sendMail_({
        to: c.email,
        subject: '⏰ Demà comença el 3×3 Westfield Glòries 2026',
        htmlBody: _emailT1_(c),
      });
    } catch (e) { Logger.log('T1 mail err: ' + e); }
  });
}

function _emailT1_(c) {
  return [
    '<h2 style="color:#dc2626">⏰ Demà és el dia!</h2>',
    '<p>Hola <strong>' + (c.capita || c.equip) + '</strong>,</p>',
    '<p>Demà comença el <strong>3×3 Westfield Glòries 2026</strong>. Última passada de check-list per a l\'equip <strong>' + c.equip + '</strong>:</p>',
    '<ol>',
    '<li><strong>Arriba 30 minuts abans</strong> del primer partit per check-in i recollida de samarretes.</li>',
    '<li>El check-in es fa <strong>escanejant el QR del teu equip</strong> (l\'has rebut a l\'email d\'inscripció).</li>',
    '<li><strong>DNI de tots els jugadors</strong> obligatori.</li>',
    '<li>Recollida de samarretes a la seu principal — <strong>Westfield Glòries</strong>.</li>',
    '<li>Comprova que tens <strong>4G</strong> al telèfon: usarem el QR i Google Maps tot el cap de setmana.</li>',
    '</ol>',
    c.checkinUrl ? '<p style="text-align:center;margin:20px 0"><a href="' + c.checkinUrl + '" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">🎟️ Obrir QR de check-in</a></p>' : '',
    '<p>Si tens cap dubte aquesta tarda: <strong><a href="https://wa.me/+34698425153">+34 698 425 153</a></strong> per WhatsApp.</p>',
    '<p style="color:#dc2626;font-weight:bold;font-size:18px;margin-top:20px">Sort, salut, i ens veiem demà a la pista! 🏀</p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>'
  ].join('');
}

/* ─── Notificació de nou article del blog ───
 *
 * Quan publiquis un nou article a /blog/<slug>, executa MANUALMENT a Apps Script:
 *
 *   notifyAllSubscribers({
 *     slug: 'historia-3x3-barcelona-del-carrer-als-jjoo',
 *     title: 'Història del 3×3 a Barcelona: del carrer als JJOO',
 *     excerpt: 'Com el bàsquet de carrer barceloní va passar de pistes...',
 *   });
 *
 * Envia un email a tots els subscriptors actius de la pestanya "Subscriptors_Blog".
 */

function notifyAllSubscribers(post) {
  if (!post || !post.slug || !post.title) {
    Logger.log('notifyAllSubscribers: cal {slug, title, excerpt}');
    return;
  }
  const subs = _getActiveBlogSubscribers_();
  Logger.log('Notifying ' + subs.length + ' subscribers about post: ' + post.slug);
  const url = 'https://cbgrupbarna-3x3timechamber.com/blog/' + post.slug;

  subs.forEach(function(s) {
    try {
      sendMail_({
        to: s.email,
        subject: '📰 Nou article: ' + post.title,
        htmlBody: '<h2 style="color:#dc2626">📰 Nou article al blog</h2>'
          + '<p>Hola' + (s.nom ? ' <strong>' + s.nom + '</strong>' : '') + ',</p>'
          + '<p>Hem publicat un nou article al blog del 3×3 Westfield Glòries:</p>'
          + '<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:16px 0;border-radius:4px">'
          + '<h3 style="margin:0 0 8px 0;color:#dc2626">' + post.title + '</h3>'
          + (post.excerpt ? '<p style="margin:0;color:#444">' + post.excerpt + '</p>' : '')
          + '</div>'
          + '<p style="text-align:center;margin:24px 0">'
          + '<a href="' + url + '" style="background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">📖 Llegir article</a>'
          + '</p>'
          + '<p style="font-size:11px;color:#666">Per cancel·lar les notificacions del blog respon a aquest email amb <strong>BAIXA</strong>.</p>'
          + '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>',
      });
    } catch (e) { Logger.log('notify err for ' + s.email + ': ' + e); }
  });
}

function _getActiveBlogSubscribers_() {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  const sheet = ss.getSheetByName('Subscriptors_Blog');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colEmail = headers.indexOf('Email');
  const colNom = headers.indexOf('Nom');
  const colActiu = headers.indexOf('Actiu');
  if (colEmail < 0) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return rows
    .filter(r => colActiu < 0 || String(r[colActiu]).trim().toLowerCase() !== 'no')
    .map(r => ({ email: String(r[colEmail] || '').trim(), nom: colNom >= 0 ? String(r[colNom] || '').trim() : '' }))
    .filter(s => s.email.includes('@'));
}

/* ─── Email post-event (T+1) ─── */

function sendPostEventEmails() {
  const days = _daysUntil_(EVENT_DAY_2_ISO);
  Logger.log('sendPostEventEmails · days since event end: ' + (-days));
  if (days !== -1) return; // exactament l'endemà
  const captains = _getCaptains_();
  captains.forEach(c => {
    try {
      sendMail_({
        to: c.email,
        subject: '🙌 Gràcies per jugar! · Comparteix la teva experiència 3×3',
        htmlBody: _emailPostEvent_(c),
      });
    } catch (e) { Logger.log('Post mail err: ' + e); }
  });
}

function _emailPostEvent_(c) {
  return [
    '<h2 style="color:#dc2626">🙌 Gràcies per jugar!</h2>',
    '<p>Hola <strong>' + (c.capita || c.equip) + '</strong>,</p>',
    '<p>Acabem de tancar la 4ª edició del 3×3 Westfield Glòries. <strong>' + c.equip + '</strong> ha format part d\'una història que continua creixent any rere any.</p>',
    '<h3 style="color:#dc2626">3 coses que pots fer ara</h3>',
    '<ol>',
    '<li><strong>📸 Comparteix-ho a Instagram</strong> · Etiqueta'a <a href="https://www.instagram.com/cbgrupbarna/">@cbgrupbarna</a> i <a href="https://www.instagram.com/timechamber_es/">@timechamber_es</a> a les fotos del teu equip. Republicarem les millors a la nostra story.</li>',
    '<li><strong>⭐ Enquesta ràpida</strong> · 30 segons que ens ajuden a millorar l\'edició de l\'any que ve. <a href="mailto:voluntaris@grupbarna.info?subject=Feedback%203x3%202026">Envia\'ns un email</a> amb 1-3 coses que canviaries.</li>',
    '<li><strong>🗓️ Marca el calendari</strong> · La 5ª edició serà el primer cap de setmana de juny 2027. Inscripcions obertes 6 mesos abans.</li>',
    '</ol>',
    '<p>Si vols mantenir-te al dia, segueix-nos a Instagram. Allà publiquem fotos, vídeos i totes les novetats del club al llarg de l\'any.</p>',
    '<p style="color:#dc2626;font-weight:bold">Fins l\'any que ve! 🏀</p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>'
  ].join('');
}

/* ────────────────────────────────────────────────────────────────────────────
 * SETUP AUTOMÀTIC DE TRIGGERS
 * ────────────────────────────────────────────────────────────────────────────
 * Executa això UNA vegada des de l'editor d'Apps Script:
 *   1. Selecciona "setupTriggers" al desplegable de funcions
 *   2. Clica Run
 *   3. Autoritza permisos (script.scriptapp + script.send_mail)
 *
 * Idempotent: si ja existeixen, els elimina i els torna a crear (no duplica).
 * Tornar-lo a executar després de canvis al codi també és segur.
 */
function setupTriggers() {
  const desired = [
    { handler: 'sendT7Reminders',     hour: 9,  label: 'T-7 reminder · 9h' },
    { handler: 'sendT1Reminders',     hour: 9,  label: 'T-1 reminder · 9h' },
    { handler: 'sendPostEventEmails', hour: 10, label: 'Post-event · 10h' },
  ];
  const handlerSet = new Set(desired.map(d => d.handler));

  // 1. Esborra triggers existents que coincideixin (per evitar duplicats)
  const existing = ScriptApp.getProjectTriggers();
  let removed = 0;
  existing.forEach(t => {
    if (handlerSet.has(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
      removed++;
    }
  });

  // 2. Crea els triggers desitjats (cada dia, finestra horària indicada)
  const created = [];
  desired.forEach(d => {
    ScriptApp.newTrigger(d.handler)
      .timeBased()
      .everyDays(1)
      .atHour(d.hour)
      .nearMinute(0)
      .create();
    created.push(d.label);
  });

  const msg = 'Triggers instal·lats correctament:\n  · ' + created.join('\n  · ') +
              (removed ? '\n\n(Eliminats ' + removed + ' triggers antics per evitar duplicats.)' : '');
  Logger.log(msg);
  return msg;
}

/** Llista els triggers actuals (debug). */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (!triggers.length) { Logger.log('Cap trigger instal·lat.'); return 'Cap trigger instal·lat.'; }
  const lines = triggers.map(t => '· ' + t.getHandlerFunction() + ' (' + t.getEventType() + ')');
  const out = 'Triggers actius:\n' + lines.join('\n');
  Logger.log(out);
  return out;
}

/** Elimina TOTS els triggers del projecte (clean slate). */
function clearAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  const msg = 'Eliminats ' + triggers.length + ' triggers.';
  Logger.log(msg);
  return msg;
}

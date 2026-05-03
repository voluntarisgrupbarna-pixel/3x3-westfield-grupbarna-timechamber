/**
 * 3×3 Westfield Glòries — Time-based triggers per emails de countdown
 *
 * Pega aquest fitxer al teu projecte d'Apps Script com a fitxer addicional
 * (no reemplaça Code.gs; conviuen).
 *
 * SETUP (un cop):
 *   1. Apps Script editor → "Triggers" (icona de rellotge a l'esquerra) → "Add Trigger"
 *   2. Function to run: sendT7Reminders   · Time-based · Day timer · 9h-10h
 *      Configura-ho perquè s'executi cada dia. La funció comprova internament
 *      si avui és exactament T-7 i envia mails.
 *   3. Repeteix per sendT1Reminders i sendPostEventEmails.
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
      MailApp.sendEmail({
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
      MailApp.sendEmail({
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

/* ─── Email post-event (T+1) ─── */

function sendPostEventEmails() {
  const days = _daysUntil_(EVENT_DAY_2_ISO);
  Logger.log('sendPostEventEmails · days since event end: ' + (-days));
  if (days !== -1) return; // exactament l'endemà
  const captains = _getCaptains_();
  captains.forEach(c => {
    try {
      MailApp.sendEmail({
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

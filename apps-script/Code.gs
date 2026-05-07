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
 *   - ADMIN_EMAILS          = voluntarisgrupbarna@gmail.com,voluntaris@grupbarna.info  (CSV; preferit)
 *   - ADMIN_EMAIL           = (fallback single, només si ADMIN_EMAILS no està)
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
 *
 * CRM "Contactes_WhatsApp" (setup manual al Sheet, una sola vegada):
 *  - Pestanya creada automàticament la primera vegada que arriba un lead.
 *  - Diferent de "Inscripcions 2026" (allà hi ha els PAGANTS del torneig).
 *  - Filter view "CRM Actiu": filtre per columna `Estat` ≠ "Tancat-OK" i ≠ "Tancat-NoInteressa".
 *  - Validació de dades a la columna `Estat`: llista
 *      Nou · Contactat · En seguiment · Tancat-OK · Tancat-NoInteressa
 *  - Format condicional: `Nou` → vermell suau · `Tancat-OK` → verd · `Tancat-NoInteressa` → gris.
 *  - Format de data a la columna `Següent seguiment`.
 *  - Els headers s'afegeixen sols (migració incremental dins addWhatsAppLead_).
 *  - Segmentació via columna `Tipus interès` (3×3 / Campus / Portes Obertes / Patrocinador / Premsa / Altre).
 */

const PROPS = PropertiesService.getScriptProperties();
const FILLOUT_BASE = 'https://api.fillout.com/v1/api';
const RESEND_BASE = 'https://api.resend.com/emails';

/**
 * Wrapper d'enviament d'email. Si hi ha RESEND_API_KEY i RESEND_FROM
 * configurats com a Script Properties, envia via Resend (millor deliverability,
 * no va a spam, supporta domini propi). Si no, fallback a MailApp.
 *
 * Accepta el mateix format que MailApp.sendEmail({to, subject, htmlBody, attachments, inlineImages}).
 * `inlineImages` (Blob amb cid) només funciona via MailApp; via Resend els
 * adjunts es passen com a attachments base64.
 */
function sendMail_(opts) {
  const apiKey = PROPS.getProperty('RESEND_API_KEY');
  const from = PROPS.getProperty('RESEND_FROM'); // ex: "3x3 Westfield Glòries <noreply@grupbarna.info>"
  const useResend = apiKey && from;

  if (!useResend) {
    // Fallback: MailApp (comportament històric). MailApp.sendEmail accepta
    // string CSV per `to/bcc/cc`, no array — convertim si cal.
    return MailApp.sendEmail(toMailAppOpts_(opts));
  }

  // Build Resend payload
  const payload = {
    from: from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject || '',
    html: opts.htmlBody || opts.body || '',
  };
  if (opts.replyTo) payload.reply_to = opts.replyTo;
  if (opts.bcc) payload.bcc = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];
  if (opts.cc) payload.cc = Array.isArray(opts.cc) ? opts.cc : [opts.cc];

  // Attachments (Blobs) → base64
  if (opts.attachments && opts.attachments.length) {
    payload.attachments = opts.attachments.map(function(blob) {
      return {
        filename: blob.getName ? blob.getName() : 'attachment',
        content: Utilities.base64Encode(blob.getBytes()),
      };
    });
  }

  try {
    const resp = UrlFetchApp.fetch(RESEND_BASE, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + apiKey },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return; // èxit
    }
    Logger.log('Resend error ' + code + ': ' + resp.getContentText() + ' — fallback a MailApp');
  } catch (err) {
    Logger.log('Resend exception: ' + err + ' — fallback a MailApp');
  }
  // Si Resend falla, fallback a MailApp per no perdre l'email
  return MailApp.sendEmail(toMailAppOpts_(opts));
}

/**
 * Adapta un opts amb `to/bcc/cc` array al format string CSV que MailApp accepta.
 */
function toMailAppOpts_(opts) {
  const out = Object.assign({}, opts);
  ['to', 'bcc', 'cc'].forEach(function(k) {
    if (Array.isArray(out[k])) out[k] = out[k].filter(Boolean).join(',');
  });
  return out;
}

/**
 * Llista de destinataris admin per a totes les notificacions del backend
 * (inscripcions, leads WhatsApp, subscripcions blog, etc.).
 *
 * Prioritat:
 *   1. Script Property `ADMIN_EMAILS` (CSV) — ex: "a@x.com,b@y.com"
 *   2. Script Property `ADMIN_EMAIL` (single string)
 *   3. Fallback hardcoded: voluntarisgrupbarna@gmail.com + voluntaris@grupbarna.info
 *
 * Així Ana rep TOTS els avisos al Gmail (preferit) i a l'email del domini
 * del club com a redundància, sense haver de configurar res.
 */
function getAdminEmails_() {
  const csv = PROPS.getProperty('ADMIN_EMAILS')
    || PROPS.getProperty('ADMIN_EMAIL')
    || 'anafernandezduran78@gmail.com,voluntarisgrupbarna@gmail.com,voluntaris@grupbarna.info';
  return String(csv).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
}

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

/* JSON response helper (CORS-permissive per defecte amb Apps Script Web App "Anyone"). */
function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Normalitza nom d'equip per detectar duplicats:
   - sense accents (NFD + strip diacritics)
   - lowercase
   - espais col·lapsats i trim
   El frontend (Inscripcion.logic.ts::normalizeTeamName) ha de coincidir EXACTAMENT amb aquesta funció. */
function normalizeTeamName_(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/* Retorna la llista de noms d'equip ja registrats al Sheet (font ràpida i estable). */
function getRegisteredNames_() {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonOut_({ names: [], ts: new Date().toISOString() });
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const col = headers.indexOf('Nom equip');
    if (col < 0) return jsonOut_({ names: [], ts: new Date().toISOString() });
    const values = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
    const names = values.map(function(r) { return String(r[0] || '').trim(); }).filter(Boolean);
    return jsonOut_({ names: names, ts: new Date().toISOString() });
  } catch (err) {
    Logger.log('getRegisteredNames_ error: ' + err);
    return jsonOut_({ names: [], error: String(err), ts: new Date().toISOString() });
  }
}

/* Comprova si un nom d'equip ja existeix (case/accent-insensitive). */
function isTeamNameTaken_(nomEquip) {
  const target = normalizeTeamName_(nomEquip);
  if (!target) return false;
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const col = headers.indexOf('Nom equip');
    if (col < 0) return false;
    const values = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (normalizeTeamName_(values[i][0]) === target) return true;
    }
    return false;
  } catch (err) {
    Logger.log('isTeamNameTaken_ error: ' + err);
    return false; // si fallem la lectura, deixem passar (el frontend ja ha validat)
  }
}

/**
 * GET — endpoints públics:
 *  - sense ?action o ?action=count: comptador d'equips inscrits + capacitat + by category
 *  - ?action=names: llista de noms d'equip registrats (per autocomplete + bloqueig duplicats)
 *
 * Retorna JSON. CORS: Apps Script Web App ("Anyone") afegeix Access-Control-Allow-Origin:* per defecte.
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'count';
  if (action === 'names') return getRegisteredNames_();

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

  return jsonOut_({
    count: count,
    capacity: getCapacitat_(),
    byCategory: byCategory,
    source: source,
    ts: new Date().toISOString(),
  });
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

    // ─── Acció whatsapp_lead (algú es disposa a contactar per WhatsApp · captura
    //     prèvia per llista de difusió 3x3 abans d'obrir wa.me) ───
    if (raw.action === 'whatsapp_lead' && (raw.telefon || raw.email)) {
      // RGPD: si arriba el camp acceptaRgpd, ha de ser true. Si no arriba (clients
      // antics), deixem passar per compatibilitat — els nous clients sempre l'envien.
      if (raw.acceptaRgpd === false) {
        return ContentService
          .createTextOutput(JSON.stringify({ ok: false, error: 'rgpd_consent_required' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      try { addWhatsAppLead_(raw); } catch (err) { Logger.log('whatsapp_lead error: ' + err); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'whatsapp_lead' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ─── Acció subscribe (newsletter del blog) ───
    if (raw.action === 'subscribe' && raw.email) {
      try { addBlogSubscriber_(raw); } catch (err) { Logger.log('subscribe error: ' + err); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'subscribe' }))
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

    // ─── Bloqueig de duplicats (només per inscripcions d'equip, no per individuals que ja s'han processat amunt).
    // Si dos equips envien el mateix nom (race condition) un d'ells rebrà aquest error.
    if (data.tipus === 'equip' && data.nomEquip && isTeamNameTaken_(data.nomEquip)) {
      return jsonOut_({
        ok: false,
        error: 'duplicate_team_name',
        message: "El nom d'equip '" + data.nomEquip + "' ja està registrat. Tria'n un altre.",
      });
    }

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

    // 2.5) Backup paranoid (no critic — cap d'aquests bloqueja la inscripció):
    //   a) JSON al repo GitHub privat (commit append)
    //   b) Issue al GitHub repo privat
    //   c) Notificació WhatsApp via Brevo al telèfon del club
    // El BCC d'arxiu i el setmanal a Drive personal es fan en altres llocs:
    //   BCC → dins sendEmails_
    //   Setmanal → time trigger weeklyBackupToPersonalDrive_
    try { writeToGitHubJson_(data, justificantUpload, raw); } catch (e) { Logger.log('GH JSON err: ' + e); }
    try { createGitHubIssue_(data, justificantUpload, raw); } catch (e) { Logger.log('GH Issue err: ' + e); }
    try { notifyWhatsAppViaBrevo_(data); } catch (e) { Logger.log('WhatsApp Brevo err: ' + e); }

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

    return jsonOut_({
      ok: true,
      fillout: filloutOk,
      filloutError: filloutError,
      driveUploaded: !!justificantUpload,
      teamId: data.teamId,
      nomEquip: data.nomEquip,
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
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
      'Check-in URL', 'Samarretes extra', 'Talles extra', 'Pagament estat', 'Arribat (timestamp)'
    ]);
  }
  const jugadors = formatJugadors_(d);
  const justifUrl = justificantUpload && justificantUpload.url ? justificantUpload.url : '';
  // Samarretes addicionals (afegit 2026-05-07): array d'{ talla } a 25€/u.
  const extraArr = Array.isArray(data && data.samarretesExtra) ? data.samarretesExtra : [];
  const numExtras = extraArr.length;
  const tallesExtra = extraArr.map(function (s) { return (s && s.talla) ? s.talla : '?'; }).join(', ');
  const pagEstat = data && data.pag === 'ok' ? 'Verificat' : 'Pendent';
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
    numExtras,
    tallesExtra,
    pagEstat,
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
 * Captura un lead que es disposa a contactar per WhatsApp.
 * Va a la pestanya "Llista_Difusio_3x3" del Sheet — la base que Ana
 * utilitza per crear la broadcast list de WhatsApp del torneig.
 *
 * Dedupe per telèfon (normalitzat). Notifica admin del primer contacte.
 */
/**
 * Pestanya única per a tots els leads de WhatsApp ("Contactes_WhatsApp").
 * El camp `Tipus interès` segmenta el contacte (3×3 / Campus / Portes Obertes
 * / Patrocinador / Premsa / Altre) sense necessitar pestanyes separades.
 *
 * IMPORTANT: aquesta pestanya és **diferent** de `Inscripcions 2026`
 * (els pagants del torneig hi van per separat).
 *
 * Si en el futur calgués separar per esdeveniment, només cal tornar a la
 * versió per `event` aquí — la migració incremental d'`addWhatsAppLead_`
 * crearà la nova pestanya automàticament.
 */
function getLeadSheetName_(_event) {
  return 'Contactes_WhatsApp';
}

function addWhatsAppLead_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  const sheetName = getLeadSheetName_(data.event);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);

  const HEADERS = [
    'Data', 'Nom', 'Telèfon', 'Email', 'Dubte / Consulta',
    'Tipus interès',
    'Source', 'Event', 'Intent',
    'Edat', 'Nivell', 'Setmanes',  // respostes ràpides més comunes
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'code',
    'Consentiment RGPD', 'Estat', 'Últim contacte', 'Següent seguiment', 'Notes',
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    // Migració incremental: afegim columnes que faltin a la dreta sense
    // alterar les existents (per no trencar res si ja hi ha files).
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    HEADERS.forEach(function(h) {
      if (existing.indexOf(h) < 0) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(h);
        existing.push(h);
      }
    });
  }

  // Re-llegim headers ja amb totes les columnes garantides
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const phoneClean = String(data.telefon || '').replace(/[^0-9+]/g, '');

  // Dedupe per telèfon (busca a la columna "Telèfon")
  const telCol = headers.indexOf('Telèfon') + 1;
  if (phoneClean && telCol > 0 && sheet.getLastRow() >= 2) {
    const phones = sheet.getRange(2, telCol, sheet.getLastRow() - 1, 1).getValues()
      .map(function(r) { return String(r[0]).replace(/[^0-9+]/g, ''); });
    if (phones.indexOf(phoneClean) >= 0) {
      // Ja està a la llista. No duplicar però sí continuar el flow (deixem
      // que l'usuari obri WhatsApp sense fricció).
      return;
    }
  }

  // Construïm la fila respectant l'ordre real dels headers
  const ans = data.answers || {};
  const valueByHeader = {
    'Data':              data.data || new Date().toLocaleString('ca-ES'),
    'Nom':               data.nom || '',
    'Telèfon':           phoneClean,
    'Email':             data.email || '',
    'Dubte / Consulta':  data.dubte || '',
    'Tipus interès':     data.tipusInteres || '',
    'Source':            data.source || '',
    'Event':             data.event || '',
    'Intent':            data.intent || '',
    'Edat':              ans.edat || '',
    'Nivell':            ans.nivell || '',
    'Setmanes':          ans.setmanes || '',
    'utm_source':        data.utm_source || '',
    'utm_medium':        data.utm_medium || '',
    'utm_campaign':      data.utm_campaign || '',
    'utm_content':       data.utm_content || '',
    'code':              data.code || '',
    'Consentiment RGPD': data.acceptaRgpd === true ? 'Sí' : (data.acceptaRgpd === false ? 'No' : '—'),
    'Estat':             'Nou',
    'Últim contacte':    '',
    'Següent seguiment': '',
    'Notes':             '',
  };
  const row = headers.map(function(h) { return valueByHeader[h] !== undefined ? valueByHeader[h] : ''; });
  sheet.appendRow(row);

  // Alerta admin
  const admin = getAdminEmails_();
  const eventLabel = ({
    'campus':         'Campus',
    'portes_obertes': 'Portes Obertes',
    'tres_x_tres':    '3x3',
    'general':        '',
  })[String(data.event || '').toLowerCase()] || (data.event || '3x3');
  const intentLabel = ({
    'info': 'Vol info', 'prueba': 'Vol provar', 'reserva': 'Vol reservar', 'general': 'Contacte general',
  })[String(data.intent || '').toLowerCase()] || '';
  const subjectIntent = intentLabel ? ' · ' + intentLabel : '';

  try {
    const esc = function(v) {
      return String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };
    const ansRows = Object.keys(ans).map(function(k) {
      return '<tr><td><strong>' + esc(k) + '</strong></td><td>' + esc(ans[k]) + '</td></tr>';
    }).join('');
    const utmRows = ['utm_source','utm_medium','utm_campaign','utm_content','code']
      .filter(function(k) { return data[k]; })
      .map(function(k) { return '<tr><td><strong>' + k + '</strong></td><td>' + esc(data[k]) + '</td></tr>'; })
      .join('');
    const nomEsc   = esc(data.nom);
    const emailEsc = esc(data.email);
    const tipusEsc = esc(data.tipusInteres);
    const dubteEsc = esc(data.dubte);
    const phoneEsc = esc(phoneClean);
    sendMail_({
      to: admin,
      subject: '💬 Nou lead WhatsApp · ' + eventLabel + subjectIntent
        + ' · ' + (nomEsc || phoneEsc || 'sense dades'),
      htmlBody: '<h3>Nou contacte per WhatsApp</h3>'
        + '<p>Algú acaba de deixar les seves dades des de <strong>' + esc(eventLabel || 'la web') + '</strong>'
        + (intentLabel ? ' (<strong>' + esc(intentLabel) + '</strong>)' : '') + '.</p>'
        + '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">'
        + '<tr><td><strong>Nom</strong></td><td>' + (nomEsc || '—') + '</td></tr>'
        + '<tr><td><strong>Telèfon</strong></td><td><a href="https://wa.me/' + phoneEsc + '">' + (phoneEsc || '—') + '</a></td></tr>'
        + '<tr><td><strong>Email</strong></td><td>' + (emailEsc ? '<a href="mailto:' + emailEsc + '">' + emailEsc + '</a>' : '—') + '</td></tr>'
        + '<tr><td><strong>Tipus interès</strong></td><td>' + (tipusEsc || '—') + '</td></tr>'
        + '<tr><td><strong>Dubte / Consulta</strong></td><td>' + (dubteEsc || '—') + '</td></tr>'
        + '<tr><td><strong>Source (botó)</strong></td><td>' + esc(data.source || '—') + '</td></tr>'
        + '<tr><td><strong>Event</strong></td><td>' + esc(data.event || '—') + '</td></tr>'
        + '<tr><td><strong>Intent</strong></td><td>' + esc(data.intent || '—') + '</td></tr>'
        + ansRows
        + utmRows
        + '</table>'
        + '<p style="font-size:11px;color:#666;margin-top:14px">Pestanya <strong>' + esc(sheetName)
        + '</strong> del Sheet. Estat inicial: <strong>Nou</strong> — actualitza\'l a mesura que el contactis.</p>',
    });
  } catch (e) { Logger.log('lead admin mail err: ' + e); }
}

/**
 * Subscripció al blog.
 * Arquitectura igual que les inscripcions:
 *   - Sheet pestanya "Subscriptors_Blog" → backup
 *   - Fillout form (FILLOUT_BLOG_FORM_ID) → font de veritat
 * Envia email de confirmació a l'usuari.
 *
 * Configuració requerida (Script Properties, opcional Fillout):
 *   - FILLOUT_BLOG_FORM_ID  = ID del form de Fillout específic per a subscriptors
 *   - FILLOUT_BLOG_QID_EMAIL = ID del camp email
 *   - FILLOUT_BLOG_QID_NOM   = ID del camp nom (opcional)
 *   - FILLOUT_BLOG_QID_SRC   = ID del camp source (opcional)
 */
function addBlogSubscriber_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName('Subscriptors_Blog');
  if (!sheet) sheet = ss.insertSheet('Subscriptors_Blog');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Data', 'Email', 'Nom', 'Source', 'Actiu', 'Fillout submission ID']);
  }
  const emailLower = String(data.email).trim().toLowerCase();
  // Evita duplicats al Sheet
  if (sheet.getLastRow() >= 2) {
    const emails = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().map(r => String(r[0]).trim().toLowerCase());
    if (emails.indexOf(emailLower) >= 0) return; // ja subscrit, no fem res
  }

  // 1) Reenvia a Fillout (font oficial)
  let filloutSubmissionId = '';
  const blogAuth = getFilloutBlogAuth_();
  if (blogAuth) {
    try {
      const qidEmail = PROPS.getProperty('FILLOUT_BLOG_QID_EMAIL') || FILLOUT_BLOG_QID_EMAIL_DEFAULT;
      const qidNom   = PROPS.getProperty('FILLOUT_BLOG_QID_NOM')   || FILLOUT_BLOG_QID_NOM_DEFAULT;
      const qidSrc   = PROPS.getProperty('FILLOUT_BLOG_QID_SRC')   || FILLOUT_BLOG_QID_SRC_DEFAULT;
      const questions = [];
      if (qidEmail) questions.push({ id: qidEmail, value: data.email });
      if (qidNom && data.nom) questions.push({ id: qidNom, value: data.nom });
      if (qidSrc && data.source) questions.push({ id: qidSrc, value: data.source });
      const url = FILLOUT_BASE + '/forms/' + encodeURIComponent(blogAuth.formId) + '/submissions';
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + blogAuth.apiKey },
        payload: JSON.stringify({ submissions: [{ questions: questions }] }),
        muteHttpExceptions: true,
      });
      if (resp.getResponseCode() < 300) {
        try {
          const json = JSON.parse(resp.getContentText() || '{}');
          if (json.submissions && json.submissions[0]) filloutSubmissionId = json.submissions[0].submissionId || '';
        } catch (parseErr) {}
      } else {
        Logger.log('Fillout subscribe error: HTTP ' + resp.getResponseCode() + ' · ' + resp.getContentText().substring(0, 200));
      }
    } catch (filErr) { Logger.log('Fillout subscribe exception: ' + filErr); }
  }

  // 2) Backup al Sheet
  sheet.appendRow([
    data.data || new Date().toLocaleString('ca-ES'),
    data.email,
    data.nom || '',
    data.source || 'unknown',
    'Sí',
    filloutSubmissionId,
  ]);

  // 3) Email confirmació al subscriptor
  try {
    sendMail_({
      to: data.email,
      subject: '✓ Estàs subscrit/a al blog del 3×3 Westfield Glòries',
      htmlBody: '<h2 style="color:#dc2626">Benvingut/da al blog!</h2>'
        + '<p>Hola' + (data.nom ? ' <strong>' + data.nom + '</strong>' : '') + ',</p>'
        + '<p>T\'has subscrit a les notificacions del blog del <strong>3×3 Westfield Glòries</strong>. Cada vegada que publiquem un nou article, et n\'enviarem un email amb un resum + l\'enllaç.</p>'
        + '<p><strong>Cap spam, cap pagament, sempre relevant pel 3×3.</strong></p>'
        + '<p>Si vols cancel·lar la subscripció en el futur, només respon a un email amb la paraula <strong>BAIXA</strong>.</p>'
        + '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot</p>',
    });
  } catch (e) { Logger.log('subscribe mail err: ' + e); }
}

/** Auth helper específic per al form de subscriptors.
 *  Defaults hardcoded del form "Subscriptors Blog 3x3" creat a Fillout. */
const FILLOUT_BLOG_FORM_ID_DEFAULT = 'mRRK9kAMDhus';
const FILLOUT_BLOG_QID_EMAIL_DEFAULT = '6vuu';
const FILLOUT_BLOG_QID_NOM_DEFAULT   = '5t4Y';
const FILLOUT_BLOG_QID_SRC_DEFAULT   = 'dBdB';

function getFilloutBlogAuth_() {
  const apiKey = PROPS.getProperty('FILLOUT_API_KEY');
  const formId = PROPS.getProperty('FILLOUT_BLOG_FORM_ID') || FILLOUT_BLOG_FORM_ID_DEFAULT;
  if (!apiKey || !formId) return null;
  return { apiKey: apiKey, formId: formId };
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
      sendMail_({
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
  const admin = getAdminEmails_();
  try {
    sendMail_({
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
    blob: blob,
    mimeType: justificant.mimeType || 'application/octet-stream',
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
  // Samarretes addicionals (afegit 2026-05-07): array d'{ talla } a 25€/u.
  const extraArr = Array.isArray(data && data.samarretesExtra) ? data.samarretesExtra : [];
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
    samarretesExtra: extraArr,
    numSamarretesExtra: extraArr.length,
    pag: data.pag === 'ok' ? 'ok' : 'pendent',
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
      sendMail_({
        to: data.email,
        subject: '✅ Inscripció rebuda · 3×3 Westfield Glòries 2026',
        htmlBody: buildEmailCapita_(data),
        attachments: qrBlob ? [qrBlob] : undefined,
      });
    } catch (mailErr) {
      Logger.log('Error email capità: ' + mailErr);
    }
  }
  // Email a admin (amb BCC d'arxiu si ARCHIVE_BCC_EMAIL està configurat —
  // capa de backup paranoid: cada inscripció queda copiada a una bústia
  // independent que mai s'edita, fora del compte del club)
  const admin = getAdminEmails_();
  const archiveBcc = PROPS.getProperty('ARCHIVE_BCC_EMAIL');
  try {
    sendMail_({
      to: admin,
      bcc: archiveBcc || undefined,
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

// ─────────────────────────────────────────────────────────────────────────────
// Backup paranoid: GitHub JSON + GitHub Issues + WhatsApp Brevo + setmanal Drive
// ─────────────────────────────────────────────────────────────────────────────
//
// Script Properties requerides:
//   GITHUB_TOKEN              fine-grained PAT amb scope "Contents: read+write" i "Issues: write"
//                             per al repo BACKUP_REPO. Crea'l a github.com/settings/personal-access-tokens
//   GITHUB_BACKUP_REPO        ex: "voluntarisgrupbarna-pixel/3x3-westfield-grupbarna-timechamber"
//                             (recomanat: usar un repo PRIVAT separat per no inflar el repo de la web)
//   GITHUB_BACKUP_PATH        ex: "data/inscripcions-2026.json"
//   GITHUB_BACKUP_BRANCH      "main" (o el que sigui)
//   ARCHIVE_BCC_EMAIL         ex: "inscripcions-arxiu@gmail.com" — bústia personal d'arxiu
//   BREVO_API_KEY             del compte Brevo del club
//   BREVO_WHATSAPP_TEMPLATE   ex: "31"  (id numèric del template WhatsApp aprovat)
//   BREVO_WHATSAPP_TO         "+34688265230" (telèfon del club, sense espais)
//   BREVO_WHATSAPP_FROM       l'identificador del sender WhatsApp registrat a Brevo (sender id o senderName)
//   PERSONAL_DRIVE_FOLDER_ID  id de la carpeta del Drive PERSONAL d'Ana
//                             (ha de tenir compartida edició amb el compte que executa Apps Script)
//
// El backup setmanal es dispara amb un time-driven trigger sobre
// weeklyBackupToPersonalDrive_ (creat manualment a Apps Script → Triggers).

const GITHUB_API = 'https://api.github.com';
const BREVO_API = 'https://api.brevo.com/v3';

/**
 * Append a `inscripcions-2026.json` al repo GitHub privat.
 * Estratègia: GET fitxer (per llegir SHA + contingut), parse, push, PUT amb nou SHA.
 *
 * Si el fitxer no existeix encara, el crea buit `[]`.
 */
function writeToGitHubJson_(data, justificantUpload, rawPayload) {
  const token = PROPS.getProperty('GITHUB_TOKEN');
  const repo = PROPS.getProperty('GITHUB_BACKUP_REPO');
  const path = PROPS.getProperty('GITHUB_BACKUP_PATH') || 'data/inscripcions-2026.json';
  const branch = PROPS.getProperty('GITHUB_BACKUP_BRANCH') || 'main';
  if (!token || !repo) {
    Logger.log('GH JSON: not_configured');
    return { ok: false, error: 'not_configured' };
  }
  const d = data && data.capita ? data : normalizeFormData_(data);
  if (!d.teamId) return { ok: false, error: 'no_team_id' };

  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const url = GITHUB_API + '/repos/' + repo + '/contents/' + encodeURIComponent(path) + '?ref=' + encodeURIComponent(branch);

  // 1) GET el fitxer per obtenir SHA actual i contingut
  let existing = [];
  let sha = null;
  try {
    const resp = UrlFetchApp.fetch(url, { method: 'get', headers: headers, muteHttpExceptions: true });
    const code = resp.getResponseCode();
    if (code === 200) {
      const body = JSON.parse(resp.getContentText());
      sha = body.sha;
      const decoded = Utilities.newBlob(Utilities.base64Decode(body.content || '')).getDataAsString();
      try { existing = JSON.parse(decoded || '[]'); } catch (e) { existing = []; }
      if (!Array.isArray(existing)) existing = [];
    } else if (code !== 404) {
      Logger.log('GH JSON GET error ' + code + ': ' + resp.getContentText().substring(0, 300));
    }
  } catch (e) {
    Logger.log('GH JSON GET exception: ' + e);
  }

  // 2) Append la nova inscripció
  const entry = {
    team_id: d.teamId,
    created_at: new Date().toISOString(),
    tipus: d.tipus || 'equip',
    nom_equip: d.nomEquip,
    capita: d.capita,
    email: d.email,
    telefon: d.telefon,
    poblacio: d.poblacio,
    categoria: d.categoria,
    jugadors: d.jugadors || [],
    total: Number(d.total) || 0,
    desc_aplicat: !!d.descAplicat,
    desc_invitacions: !!d.descInvitacions,
    mida_samarretes: d.mida,
    samarretes_extra: Array.isArray(rawPayload && rawPayload.samarretesExtra) ? rawPayload.samarretesExtra : [],
    notes: d.notes,
    checkin_url: d.checkinUrl,
    justificant_drive_url: justificantUpload && justificantUpload.url || '',
    pagament_estat: rawPayload && rawPayload.pag === 'ok' ? 'Verificat' : 'Pendent',
    raw_payload: rawPayload || d,
  };
  // Defensiu: no duplicar si el team_id ja és a la llista (cas de reintents)
  if (existing.some(function (x) { return x && x.team_id === d.teamId; })) {
    Logger.log('GH JSON: team_id ' + d.teamId + ' ja existeix, skip');
    return { ok: true, skipped: true };
  }
  existing.push(entry);

  // 3) PUT amb nou contingut
  const newContent = JSON.stringify(existing, null, 2);
  const putBody = {
    message: 'Inscripció ' + d.teamId + ' (' + (d.nomEquip || 'sense nom') + ')',
    content: Utilities.base64Encode(newContent),
    branch: branch,
  };
  if (sha) putBody.sha = sha;

  try {
    const resp = UrlFetchApp.fetch(GITHUB_API + '/repos/' + repo + '/contents/' + encodeURIComponent(path), {
      method: 'put',
      contentType: 'application/json',
      headers: headers,
      payload: JSON.stringify(putBody),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code >= 300) {
      Logger.log('GH JSON PUT error ' + code + ': ' + resp.getContentText().substring(0, 400));
      return { ok: false, error: 'put_http_' + code };
    }
    return { ok: true };
  } catch (e) {
    Logger.log('GH JSON PUT exception: ' + e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Crea un GitHub Issue per cada inscripció. Títol i labels permeten cerca/filtre
 * nadiu a github.com sense codi addicional. El cos té totes les dades estructurades.
 */
function createGitHubIssue_(data, justificantUpload, rawPayload) {
  const token = PROPS.getProperty('GITHUB_TOKEN');
  const repo = PROPS.getProperty('GITHUB_BACKUP_REPO');
  if (!token || !repo) return { ok: false, error: 'not_configured' };
  const d = data && data.capita ? data : normalizeFormData_(data);
  if (!d.teamId) return { ok: false, error: 'no_team_id' };

  const labels = ['inscripcio-3x3'];
  if (d.categoria) labels.push('cat:' + d.categoria);
  if (d.tipus === 'individual') labels.push('individual');
  if (rawPayload && rawPayload.pag === 'ok') labels.push('pagat'); else labels.push('pendent-pagament');

  const jugadorsLine = (d.jugadors || []).map(function (j) {
    return '- ' + (j.nom || '?') + ' ' + (j.cognom || '') + (j.email ? ' · ' + j.email : '') + (j.telefon ? ' · ' + j.telefon : '');
  }).join('\n');

  const body = [
    '**Team ID:** `' + d.teamId + '`',
    '**Nom equip:** ' + (d.nomEquip || ''),
    '**Capità:** ' + (d.capita || '') + ' · ' + (d.email || '') + ' · ' + (d.telefon || ''),
    '**Categoria:** ' + (d.categoria || '') + ' · **Tipus:** ' + (d.tipus || ''),
    '**Població:** ' + (d.poblacio || ''),
    '**Total:** ' + (d.total || 0) + ' €',
    '**Pagament:** ' + (rawPayload && rawPayload.pag === 'ok' ? 'Verificat' : 'Pendent'),
    '**Mida samarretes:** ' + (d.mida || ''),
    '**Notes:** ' + (d.notes || '—'),
    '',
    '**Jugadors:**',
    jugadorsLine || '— (sense detall)',
    '',
    '**Check-in URL:** ' + (d.checkinUrl || ''),
    '**Justificant Drive:** ' + (justificantUpload && justificantUpload.url || '—'),
    '',
    '<details><summary>Raw payload</summary>',
    '',
    '```json',
    JSON.stringify(rawPayload || d, null, 2).substring(0, 60000),
    '```',
    '',
    '</details>',
  ].join('\n');

  try {
    const resp = UrlFetchApp.fetch(GITHUB_API + '/repos/' + repo + '/issues', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      payload: JSON.stringify({
        title: '[' + d.teamId + '] ' + (d.nomEquip || 'Equip sense nom') + ' — ' + (d.categoria || ''),
        body: body,
        labels: labels,
      }),
      muteHttpExceptions: true,
    });
    if (resp.getResponseCode() >= 300) {
      Logger.log('GH Issue error ' + resp.getResponseCode() + ': ' + resp.getContentText().substring(0, 400));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    Logger.log('GH Issue exception: ' + e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Notifica el WhatsApp del club via Brevo Transactional API.
 * Requereix template WhatsApp APROVAT a Brevo (en català) amb variables:
 *   {{params.equip}}, {{params.categoria}}, {{params.capita}}, {{params.total}}.
 * Si el template demana variables diferents, ajusta `params` aquí.
 */
function notifyWhatsAppViaBrevo_(data) {
  const apiKey = PROPS.getProperty('BREVO_API_KEY');
  const tpl = PROPS.getProperty('BREVO_WHATSAPP_TEMPLATE');
  const to = PROPS.getProperty('BREVO_WHATSAPP_TO');
  const from = PROPS.getProperty('BREVO_WHATSAPP_FROM');
  if (!apiKey || !tpl || !to || !from) {
    Logger.log('Brevo WA: not_configured');
    return { ok: false, error: 'not_configured' };
  }
  const d = data && data.capita ? data : normalizeFormData_(data);
  const payload = {
    senderName: from,
    contactNumbers: [to],
    templateId: Number(tpl),
    params: {
      equip: d.nomEquip || '—',
      categoria: d.categoria || '—',
      capita: d.capita || '—',
      total: String(d.total || '0') + ' €',
      teamid: d.teamId || '',
    },
  };
  try {
    const resp = UrlFetchApp.fetch(BREVO_API + '/whatsapp/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'api-key': apiKey, 'accept': 'application/json' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code >= 300) {
      Logger.log('Brevo WA error ' + code + ': ' + resp.getContentText().substring(0, 400));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    Logger.log('Brevo WA exception: ' + e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Backup setmanal: copia el Sheet com a XLSX i tots els justificants del Drive
 * folder a la carpeta personal d'Ana (Drive PERSONAL_DRIVE_FOLDER_ID).
 *
 * Dispara amb time-driven trigger setmanal. També es pot cridar manualment.
 */
function weeklyBackupToPersonalDrive_() {
  const personalFolderId = PROPS.getProperty('PERSONAL_DRIVE_FOLDER_ID');
  if (!personalFolderId) throw new Error('PERSONAL_DRIVE_FOLDER_ID no configurat');
  const personalFolder = DriveApp.getFolderById(personalFolderId);

  const ts = Utilities.formatDate(new Date(), 'Europe/Madrid', 'yyyy-MM-dd_HHmm');
  const subFolder = personalFolder.createFolder('3x3-backup-' + ts);

  // 1) Sheet com a XLSX
  const sheetId = PROPS.getProperty('SHEET_ID');
  const exportUrl = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/export?format=xlsx';
  const xlsx = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  });
  if (xlsx.getResponseCode() < 300) {
    subFolder.createFile(xlsx.getBlob().setName('inscripcions_' + ts + '.xlsx'));
  } else {
    Logger.log('Setmanal: XLSX export error ' + xlsx.getResponseCode());
  }

  // 2) Còpia de cada justificant al subfolder
  const folderName = PROPS.getProperty('DRIVE_FOLDER_NAME') || '3x3 Justificants 2026';
  const it = DriveApp.getFoldersByName(folderName);
  if (it.hasNext()) {
    const just = it.next();
    const justSubFolder = subFolder.createFolder('justificants');
    const files = just.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      try { f.makeCopy(f.getName(), justSubFolder); } catch (e) { Logger.log('copy err ' + f.getName() + ': ' + e); }
    }
  }

  Logger.log('Backup setmanal completat a: ' + subFolder.getUrl());
  return { ok: true, url: subFolder.getUrl() };
}

/**
 * Helper manual: re-injecta a GitHub JSON les últimes N inscripcions del Sheet.
 * Útil per omplir el JSON amb inscripcions anteriors al deploy.
 */
function replayLastNInscripcionsToGitHub_(n) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { replayed: 0 };
  const startRow = Math.max(2, lastRow - n + 1);
  const numRows = lastRow - startRow + 1;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();
  const idx = {};
  headers.forEach(function (h, i) { idx[String(h).trim()] = i; });

  let ok = 0, err = 0;
  rows.forEach(function (r) {
    const teamId = String(r[idx['Team ID']] || '').trim();
    if (!teamId) return;
    const data = {
      teamId: teamId,
      tipus: 'equip',
      nomEquip: String(r[idx['Nom equip']] || ''),
      capita: String(r[idx['Capità']] || ''),
      email: String(r[idx['Email']] || ''),
      telefon: String(r[idx['Telèfon']] || ''),
      poblacio: String(r[idx['Població']] || ''),
      categoria: String(r[idx['Categoria']] || ''),
      jugadors: [],
      total: Number(r[idx['Total (€)']]) || 0,
      mida: String(r[idx['Mida samarretes']] || ''),
      notes: String(r[idx['Notes']] || ''),
      checkinUrl: String(r[idx['Check-in URL']] || ''),
    };
    const justUpload = { url: String(r[idx['Justificant Drive URL']] || '') };
    try {
      const res = writeToGitHubJson_(data, justUpload, { sheet_replay: true, row: r });
      if (res.ok) ok++; else err++;
    } catch (e) { err++; Logger.log('replay GH JSON err: ' + e); }
  });
  return { replayed: ok, errors: err };
}


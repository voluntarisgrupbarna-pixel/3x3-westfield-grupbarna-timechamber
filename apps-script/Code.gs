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
 *   - CALLMEBOT_API_KEY     = (opcional) Clau de CallMeBot per rebre cada lead WhatsApp al
 *                            mòbil del club (+34698425153). Setup: afegeix +34644909288 com
 *                            a contacte i envia "I allow callmebot to send me messages",
 *                            rebràs la clau. Sense aquesta clau, els avisos només arriben
 *                            per email (Gmail).
 *   - CALLMEBOT_PHONE       = (opcional, default +34698425153) Mòbil destinatari de l'avís.
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
 * Dashboard agregat — retorna totes les mètriques clau del club en un sol JSON.
 * Usat pel fitxer local dashboard-cbgb.html
 */
function getDashboardData_() {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  var ss;
  try { ss = SpreadsheetApp.openById(id); } catch(err) {
    return jsonOut_({ error: 'Cannot open sheet: ' + err, ts: new Date().toISOString() });
  }

  // ── Inscripcions 3x3 ──────────────────────────────────────
  var inscSheet = ss.getSheetByName('Inscripcions 2026');
  var inscTotal = 0, inscByCategory = {}, inscIngressos = 0;
  if (inscSheet && inscSheet.getLastRow() > 1) {
    var inscRows = inscSheet.getLastRow() - 1;
    inscTotal = inscRows;
    var inscHeaders = inscSheet.getRange(1, 1, 1, inscSheet.getLastColumn()).getValues()[0];
    var catCol = inscHeaders.indexOf('Categoria');
    var totalCol = inscHeaders.indexOf('Total €');
    if (catCol >= 0) {
      var cats = inscSheet.getRange(2, catCol + 1, inscRows, 1).getValues();
      cats.forEach(function(r) {
        var c = String(r[0] || '').trim();
        if (c) inscByCategory[c] = (inscByCategory[c] || 0) + 1;
      });
    }
    if (totalCol >= 0) {
      var totals = inscSheet.getRange(2, totalCol + 1, inscRows, 1).getValues();
      inscIngressos = totals.reduce(function(acc, r) { return acc + (parseFloat(r[0]) || 0); }, 0);
    }
  }

  // ── WhatsApp contacts ─────────────────────────────────────
  function sheetCount_(name) {
    var s = ss.getSheetByName(name);
    return s ? Math.max(0, s.getLastRow() - 1) : 0;
  }
  var wa3x3 = sheetCount_('Contactes_WhatsApp_3x3');
  var waCampus = sheetCount_('Contactes_WhatsApp_Campus');

  // CRM WhatsApp general (té columna Estat)
  var waSheet = ss.getSheetByName('Contactes_WhatsApp');
  var waCrmTotal = 0, waCrmByEstat = {};
  if (waSheet && waSheet.getLastRow() > 1) {
    waCrmTotal = waSheet.getLastRow() - 1;
    var waHeaders = waSheet.getRange(1, 1, 1, waSheet.getLastColumn()).getValues()[0];
    var estatCol = waHeaders.indexOf('Estat');
    if (estatCol >= 0) {
      var estats = waSheet.getRange(2, estatCol + 1, waCrmTotal, 1).getValues();
      estats.forEach(function(r) {
        var e = String(r[0] || '').trim() || 'Nou';
        waCrmByEstat[e] = (waCrmByEstat[e] || 0) + 1;
      });
    }
  }

  // ── Subscriptors blog ─────────────────────────────────────
  var blogSheet = ss.getSheetByName('Subscriptors_Blog');
  var blogTotal = 0, blogActius = 0;
  if (blogSheet && blogSheet.getLastRow() > 1) {
    blogTotal = blogSheet.getLastRow() - 1;
    var blogHeaders = blogSheet.getRange(1, 1, 1, blogSheet.getLastColumn()).getValues()[0];
    var activCol = blogHeaders.indexOf('Actiu');
    if (activCol >= 0) {
      var actius = blogSheet.getRange(2, activCol + 1, blogTotal, 1).getValues();
      blogActius = actius.filter(function(r) {
        var v = r[0];
        return v === true || v === 1 || String(v).toLowerCase() === 'true';
      }).length;
    }
  }

  return jsonOut_({
    inscripcions3x3: {
      total: inscTotal,
      capacity: getCapacitat_(),
      byCategory: inscByCategory,
      ingressos: inscIngressos,
    },
    whatsapp: {
      total3x3: wa3x3,
      totalCampus: waCampus,
      crmTotal: waCrmTotal,
      crmByEstat: waCrmByEstat,
    },
    blog: {
      total: blogTotal,
      actius: blogActius,
    },
    ts: new Date().toISOString(),
  });
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
  if (action === 'dashboard') return getDashboardData_();
  if (action === 'ga4') return getGa4Data_(e);
  if (action === 'inscripcions') return getInscripcionsForStaff_(e);
  if (action === 'leads') return getLeadsForStaff_(e);
  if (action === 'headers') {
    try {
      const sheet = getSheet_();
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      return jsonOut_({ headers: headers, totalCols: headers.length, totalRows: sheet.getLastRow() });
    } catch(err) { return jsonOut_({ error: String(err) }); }
  }
  if (action === 'migrateGenere') {
    // Afegeix la columna Gènere al Sheet si no hi és (sense necessitar nova inscripció)
    try {
      const sheet = getSheet_();
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const headerStrs = headers.map(function(h){ return String(h||'').trim(); });
      if (headerStrs.indexOf('Gènere') === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1, 1, 1).setValue('Gènere');
        return jsonOut_({ ok: true, msg: 'Columna Gènere afegida a posició ' + (sheet.getLastColumn()) });
      } else {
        return jsonOut_({ ok: true, msg: 'Gènere ja existia a posició ' + (headerStrs.indexOf('Gènere') + 1) });
      }
    } catch(err) { return jsonOut_({ error: String(err) }); }
  }

  // Comptador: font primària = Sheet (sempre actualitzat per cada inscripció).
  // Fillout s'usa com a font addicional però NO com a font de veritat per al comptador
  // perquè pot tenir 0 si FILLOUT_API_KEY no està configurat o si alguna inscripció
  // no va arribar a Fillout (fallada de xarxa temporal, etc.).
  let count = 0;
  let source = 'sheet';
  try {
    const sheet = getSheet_();
    count = Math.max(0, sheet.getLastRow() - 1);
  } catch (err) {
    Logger.log('doGet Sheet count error: ' + err);
  }

  // Per-categoria counts llegits del Sheet (total + desglosament per gènere)
  let byCategory = {};
  let byCatGen = {};
  try {
    const result = getByCategoryFromSheet_();
    byCategory = result.byCategory || result; // compatibilitat amb versió antiga
    byCatGen   = result.byCatGen   || {};
  } catch (e) { Logger.log('byCategory err: ' + e); }

  // Si byCategory suma més que Sheet count (improbable però defensiu), fem servir la suma
  const catSum = Object.values(byCategory).reduce(function(a, b) { return a + b; }, 0);
  if (catSum > count) count = catSum;

  return jsonOut_({
    count: count,
    capacity: getCapacitat_(),
    byCategory: byCategory,
    byCatGen: byCatGen,
    source: source,
    ts: new Date().toISOString(),
  });
}

/**
 * Retorna la llista completa d'inscripcions del Sheet per al dashboard d'staff.
 * Protegit per METRICS_TOKEN (la mateixa clau que s'usa per a GA4).
 * Cridat amb ?action=inscripcions&token=<METRICS_TOKEN>
 */
function getInscripcionsForStaff_(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var validToken = PROPS.getProperty('METRICS_TOKEN') || '';
  // Si METRICS_TOKEN no está configurat, deneguem per seguretat (dades personals).
  if (!validToken || token !== validToken) {
    return jsonOut_({ error: 'Unauthorized', ts: new Date().toISOString() });
  }

  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonOut_({ inscripcions: [], ts: new Date().toISOString() });

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(h) { return String(h || '').trim(); });
    var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    var idx = {};
    headers.forEach(function(h, i) { idx[h] = i; });

    var inscripcions = rows.map(function(r) {
      var jugadorsRaw = String(r[idx['Jugadors']] || '');
      // Jugadors estan separats per " · " en el Sheet
      var jugadors = jugadorsRaw ? jugadorsRaw.split(' · ').map(function(n) { return { nom: n.trim() }; }) : [];
      return {
        team_id:            String(r[idx['Team ID']] || ''),
        created_at:         String(r[idx['Data']] || ''),
        tipus:              'equip',
        nom_equip:          String(r[idx['Nom equip']] || ''),
        capita:             String(r[idx['Capità']] || ''),
        email:              String(r[idx['Email']] || ''),
        telefon:            String(r[idx['Telèfon']] || ''),
        poblacio:           String(r[idx['Població']] || ''),
        categoria:          String(r[idx['Categoria']] || ''),
        genere:             String(r[idx['Gènere']] || ''),
        jugadors:           jugadors,
        total:              Number(r[idx['Total (€)']] || r[idx['Total €']] || 0),
        desc_aplicat:       String(r[idx['Desc. aplicat?']] || '') === 'Sí',
        desc_invitacions:   String(r[idx['Desc. invitacions?']] || '') === 'Sí',
        desc_early_bird:    String(r[idx['Desc. early-bird?']] || '') === 'Sí',
        mida_samarretes:    String(r[idx['Mida samarretes']] || ''),
        samarretes_extra:   Number(r[idx['Samarretes extra']] || 0),
        notes:              String(r[idx['Notes']] || ''),
        checkin_url:        String(r[idx['Check-in URL']] || ''),
        justificant_drive_url: String(r[idx['Justificant Drive URL']] || ''),
        pagament_estat:     String(r[idx['Pagament estat']] || 'Pendent').toLowerCase(),
        codi_wr:            String(r[idx['Codi WR']] || ''),
      };
    }).filter(function(i) { return i.team_id || i.nom_equip; });

    return jsonOut_({ inscripcions: inscripcions, ts: new Date().toISOString() });
  } catch (err) {
    Logger.log('getInscripcionsForStaff_ error: ' + err);
    return jsonOut_({ error: String(err), ts: new Date().toISOString() });
  }
}

/**
 * Retorna els leads WhatsApp de les 3 pestanyes (3x3, Campus, PortesObertes)
 * per al dashboard de staff. Mateix esquema d'autenticació que inscripcions.
 * Cridat amb ?action=leads&token=<METRICS_TOKEN>
 */
function getLeadsForStaff_(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var validToken = PROPS.getProperty('METRICS_TOKEN') || '';
  if (!validToken || token !== validToken) {
    return jsonOut_({ error: 'Unauthorized', ts: new Date().toISOString() });
  }

  var sheetNames = ['Llista_Difusio_3x3', 'Llista_Difusio_Campus', 'Llista_Difusio_PortesObertes'];
  var id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  var ss = SpreadsheetApp.openById(id);
  var allLeads = [];

  try {
    sheetNames.forEach(function(name) {
      var sheet = ss.getSheetByName(name);
      if (!sheet || sheet.getLastRow() < 2) return;
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
        .map(function(h) { return String(h || '').trim(); });
      var idx = {};
      headers.forEach(function(h, i) { idx[h] = i; });
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      rows.forEach(function(r) {
        var telefon = String(r[idx['Telèfon']] || '').replace(/[^0-9+]/g, '');
        if (!telefon) return; // sense telèfon, no podem fer follow-up
        allLeads.push({
          sheet:            name,
          data:             String(r[idx['Data']] || ''),
          nom:              String(r[idx['Nom']] || ''),
          telefon:          telefon,
          email:            String(r[idx['Email']] || ''),
          dubte:            String(r[idx['Dubte / Consulta']] || ''),
          source:           String(r[idx['Source']] || ''),
          event:            String(r[idx['Event']] || ''),
          intent:           String(r[idx['Intent']] || ''),
          edat:             String(r[idx['Edat']] || ''),
          nivell:           String(r[idx['Nivell']] || ''),
          estat:            String(r[idx['Estat']] || 'Nou'),
          ultim_contacte:   String(r[idx['Últim contacte']] || ''),
          seguent_seguim:   String(r[idx['Següent seguiment']] || ''),
          notes:            String(r[idx['Notes']] || ''),
          utm_source:       String(r[idx['utm_source']] || ''),
          utm_campaign:     String(r[idx['utm_campaign']] || ''),
        });
      });
    });
    return jsonOut_({ leads: allLeads, ts: new Date().toISOString() });
  } catch (err) {
    return jsonOut_({ error: String(err), ts: new Date().toISOString() });
  }
}

/**
 * Compta inscripcions agrupades per categoria llegint del Sheet.
 * Retorna p.ex. {"Sèniors": 7, "Cadet": 3, ...}
 */
function getByCategoryFromSheet_() {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return { byCategory: {}, byCatGen: {} };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Cerca robust de columna per nom (sense accents, case-insensitive)
  // + fallback a posició fixa si el nom no es troba (compatibilitat amb Sheets antics)
  function findCol(candidates, fallbackPos) {
    var norm = function(s) { return String(s||'').trim().toLowerCase().replace(/[^\x00-\x7F]/g, function(c) {
      return c.normalize ? c.normalize('NFD').replace(/[̀-ͯ]/g, '') : c;
    }); };
    for (var i = 0; i < headers.length; i++) {
      var h = norm(headers[i]);
      for (var j = 0; j < candidates.length; j++) {
        if (h === norm(candidates[j])) return i;
      }
    }
    // Fallback per posició si tenim prou columnes
    if (fallbackPos !== undefined && headers.length > fallbackPos) return fallbackPos;
    return -1;
  }

  const catCol = findCol(['Categoria'], 3);
  // Gènere és la col 21 (0-indexed) a l'esquema actual del Sheet
  const genCol = findCol(['Gènere','Genere','Genre','Gènere equip','Genere equip'], 21);
  if (catCol < 0) return { byCategory: {}, byCatGen: {} };

  const numRows = sheet.getLastRow() - 1;
  const numCols = (genCol >= 0 ? Math.max(catCol, genCol) : catCol) + 1;
  const data = sheet.getRange(2, 1, numRows, numCols).getValues();

  const byCategory = {};
  const byCatGen   = {}; // { "Infantil": { "Masculí": 5, "Femení": 3 }, ... }

  data.forEach(function(row) {
    const cat = String(row[catCol] || '').trim();
    if (!cat) return;
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    if (genCol >= 0) {
      const gen = String(row[genCol] || '').trim() || 'No especificat';
      if (!byCatGen[cat]) byCatGen[cat] = {};
      byCatGen[cat][gen] = (byCatGen[cat][gen] || 0) + 1;
    }
  });

  return { byCategory: byCategory, byCatGen: byCatGen };
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

    // ─── Acció abandon (formulari abandonat amb email capturat) ───
    if (raw.action === 'abandon' && raw.email) {
      try { addAbandonament_(raw); } catch (err) { Logger.log('abandon error: ' + err); }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, action: 'abandon' }))
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
      // Genera codiWRI i checkinUrl al servidor (no dependre del frontend)
      if (!raw.codiWR) {
        var _indivSs = SpreadsheetApp.openById(PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA');
        var _indivSh = _indivSs.getSheetByName('Jugadors_Individuals');
        var _indivCount = _indivSh ? Math.max(0, _indivSh.getLastRow() - 1) : 0;
        var _indivNum = String(_indivCount + 1); while (_indivNum.length < 3) _indivNum = '0' + _indivNum;
        raw.codiWR = 'WRI-' + _indivNum;
      }
      if (!raw.checkinUrl && raw.teamId) {
        raw.checkinUrl = buildCheckinUrlIndividual_(raw);
      }
      try { addIndividualPlayer_(raw); } catch (err) { Logger.log('individual error: ' + err); }
      // Email personalitzat per a jugadors individuals (QR + codi WRI)
      const data = normalizeFormData_(raw);
      try { sendEmailsIndividual_(data); } catch (e) { Logger.log('individual mail err: ' + e); }
      // Enviar a JotForm adaptat (mateixa funció que equips, camps capXxx mapeats des de nom/cognom/...)
      const rawForJotForm = Object.assign({}, raw, {
        capNom:      raw.nom      || '',
        capCognom:   raw.cognom   || '',
        capEmail:    raw.email    || '',
        capTelefon:  raw.telefon  || '',
        capDataNaix: raw.dataNaix || '',
        capTalla:    raw.talla    || '',
        capCategoria: 'Individual (per assignar)',
        capPoblacio:  raw.poblacio || '',
        nomEquip:    ((raw.nom || '') + ' ' + (raw.cognom || '')).trim() + ' (Solo)',
        midaEquip:   1,
        jugadors:    [],
      });
      try { submitToJotForm3x3_(rawForJotForm, null); } catch (e) { Logger.log('JotForm individual err: ' + e); }
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
    // Generem el codi WR just abans d'escriure per tenir el número correcte.
    try {
      data.codiWR = generarCodiWR_(getSheet_());
    } catch (wrErr) {
      Logger.log('Generació WR error (no critic): ' + wrErr);
      data.codiWR = 'WR-???';
    }
    try {
      writeToSheet_(data, justificantUpload);
    } catch (sheetErr) {
      Logger.log('Sheet write error (no critic): ' + sheetErr);
    }

    // 2.1) JotForm 3x3 (font principal d'Ana — no crític, no trenca la inscripció)
    // IMPORTANT: passem el payload RAW (no el normalitzat) perquè submitToJotForm3x3_
    // espera els camps amb el prefix cap* (capNom, capCognom, capEmail, etc.)
    // que el formulari envia directament. El payload normalitzat els ha fusionat
    // (ex: capNom+capCognom → capita) i els camps individuals es perdrien.
    raw.codiWR = data.codiWR;
    try { submitToJotForm3x3_(raw, justificantUpload); } catch (e) { Logger.log('JotForm 3x3 err: ' + e); }

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
    genere: data.genere || data.capGenere || '',
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
    descEarlyBird: !!data.descEarlyBird,
    jugadors: Array.isArray(data.jugadors) ? data.jugadors : [],
    justificant: data.justificant || null,
    codiWR: data.codiWR || '',
  };
}

/* Genera el proper codi de reserva WR-XXX basat en el nombre total de files del Sheet.
   WR-001 és la primera inscripció, WR-042 la quaranta-dosena, etc.
   Llegeix ABANS d'escriure la nova fila, de manera que lastRow ja compta les files existents. */
function generarCodiWR_(sheet) {
  var totalFiles = Math.max(0, sheet.getLastRow() - 1); // -1 per capçalera
  var num = String(totalFiles + 1);
  while (num.length < 3) num = '0' + num;
  return 'WR-' + num;
}

function writeToSheet_(data, justificantUpload) {
  // Defensiu: si arriba payload sense normalitzar (cas legacy), normalitzem
  const d = data && data.capita ? data : normalizeFormData_(data);
  const sheet = getSheet_();
  const EXPECTED_HEADERS = [
    'Data', 'Team ID', 'Concepte', 'Categoria', 'Nom equip', 'Capità', 'Població', 'Email', 'Telèfon',
    'Jugadors', 'Mida samarretes', 'Notes', 'Total (€)',
    'Desc. aplicat?', 'Desc. invitacions?', 'Justificant Drive URL',
    'Check-in URL', 'Samarretes extra', 'Talles extra', 'Pagament estat', 'Arribat (timestamp)',
    'Gènere', 'Desc. early-bird?',
    'Estat CRM', 'Notes CRM', 'Proper seguiment',
    'Codi WR'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EXPECTED_HEADERS);
  } else {
    // Migració automàtica de capçaleres: si el Sheet existia abans d'aquesta versió,
    // hi ha menys columnes que les que escrivim ara. Afegim les que manquen al final
    // perquè les inscripcions noves no perdin dades (Samarretes extra, Talles extra,
    // Pagament estat, Gènere — afegits 2026-05-07).
    const headerRange = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn()));
    const current = headerRange.getValues()[0].map(function (v) { return String(v || '').trim(); });
    const missing = EXPECTED_HEADERS.filter(function (h) { return current.indexOf(h) === -1; });
    if (missing.length) {
      sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
    }
  }
  const jugadors = formatJugadors_(d);
  const justifUrl = justificantUpload && justificantUpload.url ? justificantUpload.url : '';
  // Samarretes addicionals (afegit 2026-05-07): array d'{ talla } a 25€/u.
  const extraArr = Array.isArray(data && data.samarretesExtra) ? data.samarretesExtra : [];
  const numExtras = extraArr.length;
  const tallesExtra = extraArr.map(function (s) { return (s && s.talla) ? s.talla : '?'; }).join(', ');
  const pagEstat = data && data.pag === 'ok' ? 'Verificat' : 'Pendent';

  // Escriptura per capçalera (no posicional) — funciona tant amb l'esquema antic com el nou.
  // Llegim els headers ACTUALS del Sheet (que ara inclouen els nous camps afegits per migració).
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  // Mapa camp → valor per a tots els EXPECTED_HEADERS
  var valueByHeader = {
    'Data':                  d.data,
    'Team ID':               d.teamId,
    'Concepte':              d.concepte,
    'Categoria':             d.categoria,
    'Nom equip':             d.nomEquip,
    'Capità':                d.capita,
    'Població':              d.poblacio,
    'Email':                 d.email,
    'Telèfon':               d.telefon,
    'Jugadors':              jugadors,
    'Mida samarretes':       d.mida,
    'Notes':                 d.notes,
    'Total (€)':             d.total,
    'Desc. aplicat?':        d.descAplicat ? 'Sí' : 'No',
    'Desc. invitacions?':    d.descInvitacions ? 'Sí' : 'No',
    'Justificant Drive URL': justifUrl,
    'Check-in URL':          d.checkinUrl,
    'Samarretes extra':      numExtras,
    'Talles extra':          tallesExtra,
    'Pagament estat':        pagEstat,
    'Arribat (timestamp)':   '',
    'Gènere':                d.genere,
    'Desc. early-bird?':     d.descEarlyBird ? 'Sí' : 'No',
    'Estat CRM':             'Nou',
    'Notes CRM':             '',
    'Proper seguiment':      '',
    'Codi WR':               d.codiWR || '',
  };

  // Construïm la fila respectant l'ordre real del Sheet (columna per columna)
  var row = currentHeaders.map(function(h) {
    return valueByHeader[h] !== undefined ? valueByHeader[h] : '';
  });
  sheet.appendRow(row);
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
  const INDIV_HEADERS = [
    'Data', 'Team ID', 'Concepte', 'Nom', 'Cognom', 'Data naixement', 'Categoria',
    'Email', 'Telèfon', 'Població', 'Talla', 'Posició preferida', 'Nivell',
    'Observacions', 'Equip assignat', 'Pagat?', 'Arribat (timestamp)',
    'Codi WRI', 'Check-in URL', 'Email enviat'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(INDIV_HEADERS);
  } else {
    const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function(h) { return String(h || '').trim(); });
    const missing = INDIV_HEADERS.filter(function(h) { return existing.indexOf(h) === -1; });
    if (missing.length) sheet.getRange(1, sheet.getLastColumn() + 1, 1, missing.length).setValues([missing]);
  }
  // Auto-calcular categoria si no ve informada
  var categoria = data.categoria || getCategoria3x3ByBirthDate_(data.dataNaix) || '';
  // Auto-generar checkinUrl si no ve del frontend
  var checkinUrl = data.checkinUrl || '';
  if (!checkinUrl && data.teamId) {
    checkinUrl = buildCheckinUrlIndividual_(Object.assign({}, data, { categoria: categoria }));
  }
  sheet.appendRow([
    data.data || new Date().toLocaleString('ca-ES'),
    data.teamId || '',
    data.concepte || '',
    data.nom || '',
    data.cognom || '',
    data.dataNaix || '',
    categoria,
    data.email || '',
    data.telefon || '',
    data.poblacio || '',
    data.talla || '',
    data.posicio || '',
    data.nivell || '',
    data.observacions || '',
    '',           // Equip assignat (Ana ho omple a mà)
    'No',         // Pagat?
    '',           // Arribat (timestamp)
    data.codiWR || '',
    checkinUrl,
    '',           // Email enviat (es marca després de sendEmailsIndividual_)
  ]);
  return { categoria: categoria, checkinUrl: checkinUrl };
}

/**
 * Captura un lead que es disposa a contactar per WhatsApp.
 * Va a la pestanya "Llista_Difusio_3x3" del Sheet — la base que Ana
 * utilitza per crear la broadcast list de WhatsApp del torneig.
 *
 * Dedupe per telèfon (normalitzat). Notifica admin del primer contacte.
 */
/**
 * Pestanya destinació segons el `Tipus interès` triat al formulari.
 *  - "Campus d'Estiu"               → Contactes_WhatsApp_Campus
 *  - "Portes Obertes club"          → Contactes_WhatsApp_PortesObertes
 *  - resta (3×3 / Patrocinador / Premsa / Altre / —) → Contactes_WhatsApp_3x3
 *
 * Així Ana té els leads del Campus separats dels del 3x3 i pot fer
 * broadcast lists, filtres i seguiment per cada esdeveniment.
 *
 * Separat de "Inscripcions 2026" (PAGANTS del torneig).
 *
 * La pestanya es crea automàticament la primera vegada (Apps Script:
 * `if (!sheet) sheet = ss.insertSheet(...)`).
 */
function getLeadSheetName_(_event, data) {
  const tipus = String((data && data.tipusInteres) || '').toLowerCase();
  if (tipus.indexOf('campus') >= 0) return 'Contactes_WhatsApp_Campus';
  if (tipus.indexOf('portes') >= 0) return 'Contactes_WhatsApp_PortesObertes';
  return 'Contactes_WhatsApp_3x3';
}

/**
 * Envia un missatge WhatsApp al telèfon del club via CallMeBot
 * (servei tercer gratuït, no toca el WhatsApp Web → sense risc de ban).
 *
 * Setup (una sola vegada per Ana):
 *  1. Afegeix +34 644 90 92 88 com a contacte al WhatsApp del club (+34 698 425 153).
 *  2. Envia-li el missatge: "I allow callmebot to send me messages"
 *  3. Reps una API key del propi bot.
 *  4. Apps Script → Project Settings → Script properties → afegeix:
 *      - CALLMEBOT_API_KEY  = <la-teva-key>
 *      - CALLMEBOT_PHONE    = +34698425153  (opcional; default = aquest)
 *
 * Limit: ~1 missatge/min (cua interna de CallMeBot). Pels leads del 3x3
 * sol ser de sobres. Si arriben dos leads alhora, el segon pot trigar 60s.
 */
function sendCallMeBot_(text) {
  const apiKey = PROPS.getProperty('CALLMEBOT_API_KEY');
  if (!apiKey) {
    Logger.log('CallMeBot: skip · CALLMEBOT_API_KEY no configurat');
    return false;
  }
  const phone = (PROPS.getProperty('CALLMEBOT_PHONE') || '+34698425153').replace(/[^0-9+]/g, '');
  const url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone)
    + '&apikey=' + encodeURIComponent(apiKey)
    + '&text=' + encodeURIComponent(text);
  try {
    const resp = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
    const code = resp.getResponseCode();
    if (code >= 200 && code < 300) return true;
    Logger.log('CallMeBot ' + code + ': ' + resp.getContentText().slice(0, 200));
  } catch (err) {
    Logger.log('CallMeBot exception: ' + err);
  }
  return false;
}

function addWhatsAppLead_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss = SpreadsheetApp.openById(id);
  const sheetName = getLeadSheetName_(data.event, data);
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

  // ─── WhatsApp directe al WhatsApp del club via CallMeBot ───────────
  // Així Ana rep al WhatsApp del club +34698425153 un missatge IMMEDIAT
  // amb les dades del lead, sense haver de comprovar email ni Sheet.
  // Pot copiar el telèfon i respondre al lead amb un click.
  try {
    const waMsg = [
      '🆕 Nou lead WhatsApp · ' + (eventLabel || 'web'),
      (intentLabel ? '· ' + intentLabel : ''),
      '',
      '👤 ' + (data.nom || '—'),
      '📱 ' + (phoneClean || '—') + (phoneClean ? '  (wa.me/' + phoneClean + ')' : ''),
      '✉️ ' + (data.email || '—'),
      '🎯 Tipus: ' + (data.tipusInteres || '—'),
      '💬 Dubte: ' + (data.dubte || '—'),
    ].filter(Boolean).join('\n');
    sendCallMeBot_(waMsg);
  } catch (e) { Logger.log('CallMeBot lead err: ' + e); }
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
    genere: data.genere || data.capGenere || '',
    telefon: data.telefon || '',
    total: data.total || 0,
    jugadors: jugadors,
    mida: data.mida || '',
    notes: data.notes || '',
    descAplicat: !!data.descAplicat,
    descInvitacions: !!data.descInvitacions,
    descEarlyBird: !!data.descEarlyBird,
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
  var codiWR = data.codiWR || '';
  return [
    '<h2 style="color:#dc2626">✅ Hem rebut la teva inscripció</h2>',
    '<p>Hola <strong>' + (data.capita || '') + '</strong>,</p>',
    '<p>Hem registrat l\'equip <strong>' + (data.nomEquip || '') + '</strong> a la categoria <strong>' + (data.categoria || '') + '</strong>.</p>',
    codiWR ? (
      '<div style="margin:20px 0;padding:16px 24px;background:#fef2f2;border:2px solid #dc2626;border-radius:12px;text-align:center">' +
      '<p style="margin:0 0 4px;font-size:11px;color:#7f1d1d;text-transform:uppercase;letter-spacing:1px;font-weight:bold">Codi de reserva</p>' +
      '<p style="margin:0;font-size:28px;font-weight:900;color:#dc2626;letter-spacing:3px">' + codiWR + '</p>' +
      '<p style="margin:4px 0 0;font-size:11px;color:#7f1d1d">Guarda\'l — el necessitaràs per a qualsevol consulta i el dia del torneig</p>' +
      '</div>'
    ) : '',
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
    desc_early_bird: !!d.descEarlyBird,
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

  const putUrl = GITHUB_API + '/repos/' + repo + '/contents/' + encodeURIComponent(path);
  try {
    const resp = UrlFetchApp.fetch(putUrl, {
      method: 'put',
      contentType: 'application/json',
      headers: headers,
      payload: JSON.stringify(putBody),
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code === 409) {
      // Conflicte de SHA (dues inscripcions simultànies). Re-llegim i reintentam.
      Logger.log('GH JSON PUT 409 conflict, retrying for team_id: ' + d.teamId);
      const retryGet = UrlFetchApp.fetch(url, { method: 'get', headers: headers, muteHttpExceptions: true });
      if (retryGet.getResponseCode() === 200) {
        const retryBody = JSON.parse(retryGet.getContentText());
        let retryArr = [];
        try { retryArr = JSON.parse(Utilities.newBlob(Utilities.base64Decode(retryBody.content || '')).getDataAsString()); } catch (pe) { retryArr = []; }
        if (!Array.isArray(retryArr)) retryArr = [];
        if (!retryArr.some(function (x) { return x && x.team_id === d.teamId; })) {
          retryArr.push(entry);
          const retryPut = { message: 'Inscripció ' + d.teamId + ' (retry-409)', content: Utilities.base64Encode(JSON.stringify(retryArr, null, 2)), branch: branch, sha: retryBody.sha };
          const retryResp = UrlFetchApp.fetch(putUrl, { method: 'put', contentType: 'application/json', headers: headers, payload: JSON.stringify(retryPut), muteHttpExceptions: true });
          if (retryResp.getResponseCode() < 300) return { ok: true, retried: true };
          Logger.log('GH JSON PUT retry error ' + retryResp.getResponseCode());
        }
      }
      return { ok: false, error: 'put_conflict_409' };
    }
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
  if (d.descEarlyBird) labels.push('early-bird');

  const jugadorsLine = (d.jugadors || []).map(function (j) {
    return '- ' + (j.nom || '?') + ' ' + (j.cognom || '') + (j.email ? ' · ' + j.email : '') + (j.telefon ? ' · ' + j.telefon : '');
  }).join('\n');

  const body = [
    '**Team ID:** `' + d.teamId + '`',
    '**Nom equip:** ' + (d.nomEquip || ''),
    '**Capità:** ' + (d.capita || '') + ' · ' + (d.email || '') + ' · ' + (d.telefon || ''),
    '**Categoria:** ' + (d.categoria || '') + ' · **Tipus:** ' + (d.tipus || ''),
    '**Població:** ' + (d.poblacio || ''),
    '**Total:** ' + (d.total || 0) + ' €' + (d.descEarlyBird ? ' (Early Bird -10%)' : ''),
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

/**
 * Configura el Sheet com a CRM. Executar UNA SOLA VEGADA manualment des de l'editor Apps Script:
 *   → Editor → Selecciona la funció setupSheetAsCrm_ → Executar
 *
 * Aplica:
 *   1. Freeze de la primera fila (capçaleres fixes)
 *   2. Validació de dades (desplegable) a la columna "Estat CRM"
 *   3. Format condicional per colors d'estat
 */
function setupSheetAsCrm_() {
  const sheet = getSheet_();

  // 1) Freeze capçaleres
  sheet.setFrozenRows(1);

  // 2) Trobar columna "Estat CRM"
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const estatCol = headers.indexOf('Estat CRM') + 1;
  if (estatCol < 1) {
    Logger.log('setupSheetAsCrm_: columna "Estat CRM" no trobada. Envia primer una inscripció de prova o afegeix la capçalera manualment.');
    return { ok: false, error: 'col_not_found' };
  }

  const lastRow = Math.max(sheet.getLastRow(), 2);
  const estatRange = sheet.getRange(2, estatCol, lastRow - 1, 1);

  // 3) Desplegable d'estats
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Nou', 'Contactat', 'En seguiment', 'Pagament confirmat', 'Tancat-OK', 'Tancat-NoInteressa'], true)
    .setAllowInvalid(false)
    .build();
  estatRange.setDataValidation(rule);

  // 4) Format condicional (colors per estat)
  const existingRules = sheet.getConditionalFormatRules();
  const newRules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Nou').setBackground('#fde8e8').setFontColor('#b91c1c').setRanges([estatRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Contactat').setBackground('#fef9c3').setFontColor('#854d0e').setRanges([estatRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('En seguiment').setBackground('#dbeafe').setFontColor('#1e40af').setRanges([estatRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Pagament confirmat').setBackground('#d4f4dd').setFontColor('#15803d').setRanges([estatRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Tancat-OK').setBackground('#e0e0e0').setFontColor('#6b7280').setRanges([estatRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Tancat-NoInteressa').setBackground('#f3f4f6').setFontColor('#9ca3af').setRanges([estatRange]).build(),
  ];
  sheet.setConditionalFormatRules([...existingRules, ...newRules]);

  Logger.log('setupSheetAsCrm_: CRM configurat correctament. Columna Estat CRM: ' + estatCol);
  return { ok: true, estatCol: estatCol };
}

/* ─── JotForm 3x3 ─────────────────────────────────────────────────────────
   QIDs verificats i creats 2026-05-10:
     2  Nombre del equipo
     3  Nombre completo capitán (first/last)
     4  Email capitán
     5  Telèfon capitán
     6  Jugadores ConfigurableList [{Nombre completo}]
     8  Categoria
     9  Genere equip
    10  Mida equip
    11  Data naix capita
    12  Talla capita
    13  Club capita
    14  Poblacio capita
    15  Tutor nom
    16  Tutor telefon
    17  Total EUR
    18  Descompte aplicat
    19  Concepte transferencia
    20  Team ID
    21  Check-in URL QR
    22  Justificant Drive URL
    23  Data inscripcio
    24  Jugadors detall JSON (tots els jugadors complets)
   API key: Script Property JOTFORM_3X3_API_KEY
*/
function submitToJotForm3x3_(data, justificantUpload) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('JOTFORM_3X3_API_KEY') || '';
  if (!apiKey) { Logger.log('submitToJotForm3x3_: JOTFORM_3X3_API_KEY no configurada'); return; }

  var formId = props.getProperty('JOTFORM_3X3_FORM_ID') || '261286732245055';
  var url = 'https://eu-api.jotform.com/form/' + formId + '/submissions?apiKey=' + apiKey;

  var jugadors = Array.isArray(data.jugadors) ? data.jugadors : [];

  // Jugadors per al ConfigurableList (noms visibles al form)
  var jugadorsRows = jugadors.map(function(j) {
    return { 'Nombre completo': ((j.nom || '') + ' ' + (j.cognom || '')).trim() };
  }).filter(function(r) { return r['Nombre completo']; });

  // Jugadors complets per al camp JSON (preserva totes les dades).
  // Per a inscripcions individuals (jugadors buit): codifica els camps extra del
  // formulari solo (posicio, nivell, observacions, acceptances) que no tenen QID propi.
  var jugadorsJSON;
  var isIndividualSub = !jugadors.length && (data.midaEquip == 1 || data.tipus === 'individual' || data.action === 'individual');
  if (isIndividualSub) {
    jugadorsJSON = JSON.stringify({
      tipus:         'individual',
      posicio:       data.posicio       || '',
      nivell:        data.nivell        || '',
      observacions:  data.observacions  || data.notes || data.comentaris || '',
      acceptaBases:  data.acceptaBases  ? 'Sí' : 'No',
      acceptaLopd:   data.acceptaLopd   ? 'Sí' : 'No',
      acceptaImatge: data.acceptaImatge ? 'Sí' : 'No',
    });
  } else {
    jugadorsJSON = JSON.stringify(jugadors.map(function(j) {
      return { nom: (j.nom||''), cognom: (j.cognom||''), email: (j.email||''), telefon: (j.telefon||''), dataNaix: (j.dataNaix||''), talla: (j.talla||''), club: (j.club||'') };
    }));
  }

  var justifUrl = justificantUpload && justificantUpload.url ? justificantUpload.url : '';
  var checkinUrl = data.checkinUrl || '';
  var dataInscr = data.data || new Date().toLocaleString('ca-ES');

  var payload = {
    'submission[2]':          data.nomEquip     || '',
    'submission[3][first]':   data.capNom        || '',
    'submission[3][last]':    data.capCognom     || '',
    'submission[4]':          data.capEmail      || '',
    'submission[5]':          data.capTelefon    || '',
    'submission[6]':          JSON.stringify(jugadorsRows),
    'submission[8]':          data.capCategoria  || '',
    'submission[9]':          data.capGenere     || '',
    'submission[10]':         String(data.midaEquip || ''),
    'submission[11]':         data.capDataNaix   || '',
    'submission[12]':         data.capTalla      || '',
    'submission[13]':         data.capClub       || '',
    'submission[14]':         data.capPoblacio   || '',
    'submission[15]':         data.tutorNom      || '',
    'submission[16]':         data.tutorTelefon  || '',
    'submission[17]':         String(data.total  || ''),
    'submission[18]':         data.descAplicat   ? String(data.descAplicat) : '',
    'submission[19]':         data.concepte      || data.teamId ? ('3X3+' + (data.nomEquip || '').toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')) : '',
    'submission[20]':         data.teamId        || '',
    'submission[21]':         checkinUrl,
    'submission[22]':         justifUrl,
    'submission[23]':         dataInscr,
    'submission[24]':         jugadorsJSON,
    'submission[25]':         data.codiWR || '',
  };

  var form = Object.keys(payload).filter(function(k) {
    var v = payload[k];
    return v && v.toString().trim() !== '' && v !== '[]' && v !== 'null';
  }).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
  }).join('&');

  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: form,
    muteHttpExceptions: true,
  });

  var code = resp.getResponseCode();
  Logger.log('JotForm 3x3 submission → HTTP ' + code + ' : ' + resp.getContentText().slice(0, 200));
  if (code !== 200) throw new Error('JotForm HTTP ' + code);
}

/* Executa manualment des de l'editor per veure tots els QIDs del form JotForm.
   Copia els IDs del Logger i configura les Script Properties JOTFORM_3X3_QID_*.
   Exemple: JOTFORM_3X3_QID_NOM_EQUIP = "3" */
function listJotForm3x3Fields_() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('JOTFORM_3X3_API_KEY') || '';
  if (!apiKey) { Logger.log('Configura JOTFORM_3X3_API_KEY a Script Properties primer'); return; }
  var formId = props.getProperty('JOTFORM_3X3_FORM_ID') || '261286732245055';
  var resp = UrlFetchApp.fetch('https://eu-api.jotform.com/form/' + formId + '/questions?apiKey=' + apiKey, { muteHttpExceptions: true });
  var parsed = JSON.parse(resp.getContentText());
  var qs = parsed.content || {};
  Object.keys(qs).sort(function(a,b){ return parseInt(a)-parseInt(b); }).forEach(function(id) {
    var q = qs[id];
    Logger.log('QID ' + id + ' | type: ' + q.type + ' | name: ' + (q.name||'') + ' | text: ' + (q.text||''));
  });
}

// ─── GA4 Data API proxy ───────────────────────────────────────────────────────
/**
 * GET ?action=ga4&token=SECRET
 * Retorna mètriques GA4 dels darrers 30 dies.
 * Requereix Script Properties:
 *   GA4_PROPERTY_ID  → ID numèric de la propietat GA4 (Administrador → Propietat → número)
 *   METRICS_TOKEN    → token secret per protegir l'endpoint (ex: "barna3x32026")
 */
function getGa4Data_(e) {
  var token = (e && e.parameter && e.parameter.token) || '';
  var validToken = PROPS.getProperty('METRICS_TOKEN') || '';
  if (validToken && token !== validToken) {
    return jsonOut_({ error: 'Unauthorized', ts: new Date().toISOString() });
  }

  var propertyId = PROPS.getProperty('GA4_PROPERTY_ID') || '';
  if (!propertyId) {
    return jsonOut_({ error: 'GA4_PROPERTY_ID no configurat a Script Properties', ts: new Date().toISOString() });
  }

  var baseUrl = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport';
  var headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  var opts = { method: 'post', contentType: 'application/json', headers: headers, muteHttpExceptions: true };

  // ── Report 1: sessions + activeUsers per dia, últims 30 dies ────────────────
  var daily = [];
  try {
    var body1 = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    };
    var r1 = UrlFetchApp.fetch(baseUrl, Object.assign({}, opts, { payload: JSON.stringify(body1) }));
    if (r1.getResponseCode() === 200) {
      var d1 = JSON.parse(r1.getContentText());
      (d1.rows || []).forEach(function(row) {
        var rawDate = row.dimensionValues[0].value; // "20260410"
        var fmt = rawDate.slice(4, 6) + '/' + rawDate.slice(6, 8); // "04/10"
        daily.push({
          date: fmt,
          sessions: parseInt(row.metricValues[0].value) || 0,
          users: parseInt(row.metricValues[1].value) || 0,
        });
      });
    }
  } catch (err) { Logger.log('GA4 daily error: ' + err); }

  // ── Report 2: sessions per canal (fonts de tràfic) ──────────────────────────
  var sources = [];
  try {
    var body2 = {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    };
    var r2 = UrlFetchApp.fetch(baseUrl, Object.assign({}, opts, { payload: JSON.stringify(body2) }));
    if (r2.getResponseCode() === 200) {
      var d2 = JSON.parse(r2.getContentText());
      (d2.rows || []).forEach(function(row) {
        sources.push({
          channel: row.dimensionValues[0].value,
          sessions: parseInt(row.metricValues[0].value) || 0,
        });
      });
    }
  } catch (err) { Logger.log('GA4 sources error: ' + err); }

  // ── Report 3: events del funnel d'inscripció ────────────────────────────────
  var funnelEvents = [
    'cta_inscripcio_click',
    'inscripcio_iniciada',
    'queue_passada',
    'viral_gate_passat',
    'viral_gate_skipped',
    'inscripcio_completada',
  ];
  var funnel = {};
  try {
    var body3 = {
      dateRanges: [{ startDate: '60daysAgo', endDate: 'yesterday' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: funnelEvents },
        },
      },
    };
    var r3 = UrlFetchApp.fetch(baseUrl, Object.assign({}, opts, { payload: JSON.stringify(body3) }));
    if (r3.getResponseCode() === 200) {
      var d3 = JSON.parse(r3.getContentText());
      (d3.rows || []).forEach(function(row) {
        funnel[row.dimensionValues[0].value] = parseInt(row.metricValues[0].value) || 0;
      });
    }
  } catch (err) { Logger.log('GA4 funnel error: ' + err); }

  // ── Totals darrers 30 dies ───────────────────────────────────────────────────
  var totalSessions = daily.reduce(function(a, d) { return a + d.sessions; }, 0);
  var totalUsers = daily.reduce(function(a, d) { return a + d.users; }, 0);

  return jsonOut_({
    daily: daily,
    sources: sources,
    funnel: funnel,
    totals: { sessions: totalSessions, users: totalUsers },
    ts: new Date().toISOString(),
  });
}

/**
 * BACKFILL JotForm — envia a JotForm TOTES les inscripcions existents al Sheet.
 *
 * Executa manualment des del dashboard d'Apps Script:
 *   1. Selecciona la funció "backfillJotForm" al desplegable
 *   2. Clica ▶ Ejecutar
 *   3. Obre "Registro de ejecución" per veure el progrés
 *
 * Si una inscripció ja existia a JotForm, JotForm la duplicarà.
 * Per evitar duplicats, executa-la UNA SOLA VEGADA.
 */
function backfillJotForm() {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('JOTFORM_3X3_API_KEY') || '';
  if (!apiKey) { Logger.log('[backfill] JOTFORM_3X3_API_KEY no configurada. Atura.'); return; }

  var formId = props.getProperty('JOTFORM_3X3_FORM_ID') || '261286732245055';
  var url = 'https://eu-api.jotform.com/form/' + formId + '/submissions?apiKey=' + apiKey;

  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('[backfill] Sheet buit.'); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });
  var idx = {};
  headers.forEach(function(h, i) { idx[h] = i; });
  var rows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  var ok = 0, skipped = 0, errors = 0;

  // Columnes fixes segons writeToSheet_ (la capçalera real del Sheet pot tenir etiquetes antigues)
  // Ordre: Data(0) TeamID(1) Concepte(2) Categoria(3) NomEquip(4) Capita(5) Poblacio(6)
  //        Email(7) Telefon(8) Jugadors(9) Mida(10) Notes(11) Total(12) DescAplic(13)
  //        DescInv(14) JustifUrl(15) CheckinUrl(16) SamExtra(17) TallesExtra(18)
  //        PagEstat(19) Arribat(20) Genere(21) DescEB(22) EstatCRM(23) NotesCRM(24)
  //        ProxSeg(25) CodiWR(26)
  var C = { data:0,teamId:1,concepte:2,categoria:3,nomEquip:4,capita:5,poblacio:6,
             email:7,telefon:8,jugadors:9,mida:10,notes:11,total:12,descAplic:13,
             descInv:14,justifUrl:15,checkinUrl:16,samExtra:17,tallesExtra:18,
             pagEstat:19,arribat:20,genere:21,descEB:22,estatCRM:23,notesCRM:24,
             proxSeg:25,codiWR:26 };

  function str(v) { return String(v === undefined || v === null ? '' : v).trim(); }

  rows.forEach(function(r, i) {
    var teamId   = str(r[C.teamId]);
    var nomEquip = str(r[C.nomEquip]);
    if (!nomEquip) { skipped++; return; }  // fila buida

    // Capità: és el nom complet ("Nom Cognom") — partir per primer espai
    var capitaFull = str(r[C.capita]);
    var spaceIdx   = capitaFull.indexOf(' ');
    var capNom    = spaceIdx > 0 ? capitaFull.substring(0, spaceIdx) : capitaFull;
    var capCognom = spaceIdx > 0 ? capitaFull.substring(spaceIdx + 1) : '';

    // Jugadors: "A · B · C"
    var jugadorsRaw = str(r[C.jugadors]);
    var jugadorsArr = jugadorsRaw
      ? jugadorsRaw.split(' · ').map(function(n) { return n.trim(); }).filter(Boolean)
      : [];
    var jugadorsRows = jugadorsArr.map(function(n) { return { 'Nombre completo': n }; });
    var jugadorsJSON = JSON.stringify(jugadorsArr.map(function(n) { return { nom: n }; }));

    var payload = {
      'submission[2]':        nomEquip,
      'submission[3][first]': capNom,
      'submission[3][last]':  capCognom,
      'submission[4]':        str(r[C.email]),
      'submission[5]':        str(r[C.telefon]),
      'submission[6]':        JSON.stringify(jugadorsRows),
      'submission[8]':        str(r[C.categoria]),
      'submission[9]':        str(r[C.genere]),
      'submission[10]':       str(r[C.mida]),
      'submission[14]':       str(r[C.poblacio]),
      'submission[17]':       str(r[C.total]),
      'submission[18]':       str(r[C.descAplic]) === 'Sí' ? 'Sí' : '',
      'submission[19]':       str(r[C.concepte]) || ('3X3+' + nomEquip.toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'')),
      'submission[20]':       teamId,
      'submission[21]':       str(r[C.checkinUrl]),
      'submission[22]':       str(r[C.justifUrl]),
      'submission[23]':       str(r[C.data]),
      'submission[24]':       jugadorsJSON,
      'submission[25]':       str(r[C.codiWR]),
    };

    var form = Object.keys(payload).filter(function(k) {
      var v = payload[k]; return v && v.toString().trim() !== '' && v !== '[]' && v !== 'null';
    }).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
    }).join('&');

    try {
      var resp = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/x-www-form-urlencoded',
        payload: form,
        muteHttpExceptions: true,
      });
      var code = resp.getResponseCode();
      Logger.log('[backfill] Fila ' + (i + 2) + ' · ' + nomEquip + ' → HTTP ' + code);
      if (code === 200) ok++; else { errors++; Logger.log(resp.getContentText().substring(0, 200)); }
    } catch (e) {
      Logger.log('[backfill] ERROR fila ' + (i + 2) + ': ' + e);
      errors++;
    }
    Utilities.sleep(350);  // 350ms entre peticions per respectar el rate-limit de JotForm
  });

  Logger.log('[backfill] COMPLET ✓ ' + ok + ' enviades · ' + errors + ' errors · ' + skipped + ' saltades');
}

// ─────────────────────────────────────────────────────────────────────────────
// Jugadors individuals — helpers i backfill
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construeix la URL de check-in per a un jugador individual.
 * Replicat al servidor (el frontend pot no enviar-la sempre).
 */
function buildCheckinUrlIndividual_(raw) {
  var id    = raw.teamId || '';
  var nom   = ((raw.nom || '') + ' ' + (raw.cognom || '')).trim();
  var cat   = raw.categoria || raw.capCategoria || '';
  var pob   = raw.poblacio  || raw.capPoblacio  || '';
  var tel   = String(raw.telefon || raw.capTelefon || '');
  var email = raw.email || raw.capEmail || '';
  var data  = raw.dataNaix || '';
  return 'https://cbgrupbarna-3x3timechamber.com/checkin?' + [
    'id='    + encodeURIComponent(id),
    'nom='   + encodeURIComponent(nom),
    'cap='   + encodeURIComponent(nom),
    'cat='   + encodeURIComponent(cat),
    'pob='   + encodeURIComponent(pob),
    'jug=1',
    'mida=',
    'tel='   + encodeURIComponent(tel),
    'email=' + encodeURIComponent(email),
    'data='  + encodeURIComponent(data),
  ].join('&');
}

/**
 * Envia email de confirmació + QR al jugador individual i notificació a l'admin.
 */
function sendEmailsIndividual_(data) {
  var checkinUrl = data.checkinUrl || '';
  var codiWR     = data.codiWR    || '';
  var nom        = data.capita    || data.nomEquip || '';

  // Genera QR blob (SVG del worker)
  var qrBlob = null;
  if (checkinUrl) {
    try {
      var qrUrl = 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=400&data=' + encodeURIComponent(checkinUrl);
      var qrResp = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });
      if (qrResp.getResponseCode() === 200) qrBlob = qrResp.getBlob().setName('checkin-qr.svg');
    } catch (e) { Logger.log('Individual QR error: ' + e); }
  }

  // Email al jugador
  if (data.email) {
    try {
      sendMail_({
        to: data.email,
        subject: '✅ Inscripció individual rebuda · 3×3 Westfield Glòries 2026',
        htmlBody: buildEmailIndividualHTML_(data),
        attachments: qrBlob ? [qrBlob] : undefined,
      });
    } catch (e) { Logger.log('Individual email error: ' + e); }
  }

  // Notificació a l'admin
  try {
    sendMail_({
      to: getAdminEmails_(),
      subject: '📩 Jugador individual: ' + nom + (codiWR ? ' (' + codiWR + ')' : ''),
      htmlBody: [
        '<h2>📩 Jugador individual</h2>',
        '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">',
        '<tr><td><strong>Codi</strong></td><td><strong style="color:#dc2626">' + codiWR + '</strong></td></tr>',
        '<tr><td><strong>Nom</strong></td><td>' + nom + '</td></tr>',
        '<tr><td><strong>Categoria</strong></td><td>' + (data.categoria || '—') + '</td></tr>',
        '<tr><td><strong>Email</strong></td><td>' + (data.email || '') + '</td></tr>',
        '<tr><td><strong>Telèfon</strong></td><td>' + (data.telefon || '') + '</td></tr>',
        '<tr><td><strong>Població</strong></td><td>' + (data.poblacio || '—') + '</td></tr>',
        '<tr><td><strong>Total</strong></td><td>20 €</td></tr>',
        checkinUrl ? '<tr><td><strong>Check-in URL</strong></td><td><a href="' + checkinUrl + '">' + checkinUrl.substring(0, 60) + '…</a></td></tr>' : '',
        '</table>',
      ].join(''),
      attachments: qrBlob ? [qrBlob] : undefined,
    });
  } catch (e) { Logger.log('Individual admin email error: ' + e); }
}

function buildEmailIndividualHTML_(data) {
  var nom        = data.capita || data.nomEquip || '';
  var codiWR     = data.codiWR    || '';
  var checkinUrl = data.checkinUrl || '';
  var qrPngUrl   = checkinUrl
    ? 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=400&data=' + encodeURIComponent(checkinUrl)
    : '';
  return [
    '<h2 style="color:#dc2626">✅ Inscripció individual rebuda</h2>',
    '<p>Hola <strong>' + nom + '</strong>,</p>',
    '<p>Hem registrat la teva inscripció com a <strong>jugador/a individual</strong> al torneig <strong>3×3 Westfield Glòries 2026</strong>.</p>',
    '<p>T\'assignarem a un equip una setmana abans del torneig, segons la teva categoria i posició preferida.</p>',
    codiWR ? (
      '<div style="margin:20px 0;padding:16px 24px;background:#fef2f2;border:2px solid #dc2626;border-radius:12px;text-align:center">' +
      '<p style="margin:0 0 4px;font-size:11px;color:#7f1d1d;text-transform:uppercase;letter-spacing:1px;font-weight:bold">Codi de reserva</p>' +
      '<p style="margin:0;font-size:28px;font-weight:900;color:#dc2626;letter-spacing:3px">' + codiWR + '</p>' +
      '<p style="margin:4px 0 0;font-size:11px;color:#7f1d1d">Guarda\'l — el necessitaràs per a qualsevol consulta i el dia del torneig</p>' +
      '</div>'
    ) : '',
    '<p><strong>Total a pagar:</strong> 20 € · Transferència bancària a:</p>',
    '<p style="font-family:monospace;background:#f5f5f5;padding:10px;border-radius:6px">',
    'Beneficiari: CB Grup Barna<br>',
    'IBAN: ES42 0182 1797 3902 0409 9747<br>',
    'Concepte: ' + (data.teamId || data.nomEquip || nom),
    '</p>',
    '<p>Quan rebem la transferència, confirmarem la plaça per email.</p>',
    qrPngUrl ? (
      '<div style="margin:24px 0;padding:20px;background:#fef2f2;border:2px solid #dc2626;border-radius:16px;text-align:center">' +
      '<p style="margin:0 0 8px;font-weight:bold;color:#dc2626;text-transform:uppercase;letter-spacing:1px;font-size:13px">🎟️ El teu QR personal</p>' +
      '<img src="' + qrPngUrl + '" alt="QR check-in" style="width:220px;height:220px;display:block;margin:8px auto"/>' +
      '<p style="margin:8px 0 0;font-size:12px;color:#7f1d1d"><strong>Guarda aquest email</strong> o el QR. El necessites el dia del torneig per al <strong>check-in</strong>.</p>' +
      '<p style="margin:8px 0 0;font-size:11px;color:#7f1d1d">O obre directament: <a href="' + checkinUrl + '" style="color:#dc2626">' + checkinUrl + '</a></p>' +
      '</div>'
    ) : '',
    '<p>Per qualsevol dubte: <a href="https://wa.me/+34698425153">WhatsApp del club (+34 698 425 153)</a>.</p>',
    '<hr><p style="font-size:11px;color:#666">3×3 Westfield Glòries · CB Grup Barna · Time Chamber · Eix Clot · 6-7 juny 2026</p>',
  ].join('');
}

/**
 * BACKFILL Individuals — envia email de confirmació + QR als jugadors individuals existents
 * que no van rebre email en el moment de la inscripció.
 *
 * Executa manualment UNA SOLA VEGADA:
 *   1. Selecciona la funció "backfillIndividuals" al desplegable
 *   2. Clica ▶ Ejecutar
 *   3. Comprova "Registro de ejecución"
 */
function backfillIndividuals() {
  var id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName('Jugadors_Individuals');
  if (!sheet) { Logger.log('[backfill-indiv] Sheet Jugadors_Individuals no trobat.'); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('[backfill-indiv] Sheet buit.'); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  // Afegeix columnes Codi WRI i Check-in URL si no existeixen
  if (headers.indexOf('Codi WRI') === -1) {
    sheet.getRange(1, headers.length + 1).setValue('Codi WRI');
    headers.push('Codi WRI');
  }
  if (headers.indexOf('Check-in URL') === -1) {
    sheet.getRange(1, headers.length + 1).setValue('Check-in URL');
    headers.push('Check-in URL');
  }

  var C = {};
  headers.forEach(function(h, i) { C[h] = i; });

  var allRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var ok = 0, errors = 0;

  allRows.forEach(function(r, i) {
    var teamId = String(r[C['Team ID']] || '').trim();
    var nom    = String(r[C['Nom']]     || '').trim();
    var cognom = String(r[C['Cognom']]  || '').trim();
    var email  = String(r[C['Email']]   || '').trim();
    if (!email || !teamId) {
      Logger.log('[backfill-indiv] Fila ' + (i + 2) + ' sense email/teamId, saltada.');
      return;
    }

    var fullName  = (nom + ' ' + cognom).trim();
    var categoria = String(r[C['Categoria']] || '').trim();
    var poblacio  = String(r[C['Població']]  || '').trim();
    var telefon   = String(r[C['Telèfon']]   || '').trim();

    // Genera codiWRI si no el té al Sheet
    var codiWRI = String(r[C['Codi WRI']] || '').trim();
    if (!codiWRI) {
      var num = String(i + 1); while (num.length < 3) num = '0' + num;
      codiWRI = 'WRI-' + num;
      sheet.getRange(i + 2, C['Codi WRI'] + 1).setValue(codiWRI);
      Logger.log('[backfill-indiv] Generat ' + codiWRI + ' per a ' + fullName);
    }

    // Genera checkinUrl si no la té al Sheet
    var checkinUrl = String(r[C['Check-in URL']] || '').trim();
    if (!checkinUrl) {
      checkinUrl = buildCheckinUrlIndividual_({
        teamId: teamId, nom: nom, cognom: cognom,
        categoria: categoria, poblacio: poblacio,
        telefon: telefon, email: email, dataNaix: '',
      });
      sheet.getRange(i + 2, C['Check-in URL'] + 1).setValue(checkinUrl);
    }

    // Genera QR blob
    var qrBlob = null;
    try {
      var qrUrl = 'https://og-3x3-glories.cbgrupbarna.workers.dev/qr.svg?size=400&data=' + encodeURIComponent(checkinUrl);
      var qrResp = UrlFetchApp.fetch(qrUrl, { muteHttpExceptions: true });
      if (qrResp.getResponseCode() === 200) qrBlob = qrResp.getBlob().setName('checkin-qr.svg');
    } catch (e) { Logger.log('[backfill-indiv] QR error: ' + e); }

    // Envia email al jugador
    try {
      sendMail_({
        to: email,
        subject: '✅ Inscripció individual rebuda · 3×3 Westfield Glòries 2026',
        htmlBody: buildEmailIndividualHTML_({
          capita: fullName, nomEquip: fullName, teamId: teamId,
          codiWR: codiWRI, checkinUrl: checkinUrl,
          categoria: categoria, poblacio: poblacio,
          email: email, telefon: telefon, total: 20,
        }),
        attachments: qrBlob ? [qrBlob] : undefined,
      });
      Logger.log('[backfill-indiv] ✓ Email enviat → ' + email + ' | ' + codiWRI);
      ok++;
    } catch (e) {
      Logger.log('[backfill-indiv] ✗ Error email ' + email + ': ' + e);
      errors++;
    }

    // Notifica admin
    try {
      sendMail_({
        to: getAdminEmails_(),
        subject: '📩 Jugador individual (backfill): ' + fullName + ' (' + codiWRI + ')',
        htmlBody: '<p>Backfill: email enviat a <strong>' + email + '</strong> amb codi <strong>' + codiWRI + '</strong>.</p><p>Check-in URL: <a href="' + checkinUrl + '">' + checkinUrl.substring(0, 80) + '</a></p>',
      });
    } catch (e) { Logger.log('[backfill-indiv] Admin notify error: ' + e); }

    Utilities.sleep(500);
  });

  Logger.log('[backfill-indiv] COMPLET ✓ ' + ok + ' enviats · ' + errors + ' errors');
}

// ─── VERSIÓ REFETA (idempotent + categories + flag) ──────────────────────────
// Substitueix l'anterior backfillIndividuals. Afegida a continuació com a nova
// funció per no trencar res.

/**
 * Calcula la categoria 3x3 per any de naixement (temporada 2025-2026).
 */
function getCategoria3x3ByBirthDate_(dataNaix) {
  if (!dataNaix) return '';
  var d = dataNaix instanceof Date ? dataNaix : new Date(dataNaix);
  if (isNaN(d.getTime())) return '';
  var any = d.getFullYear();
  if (any >= 2015) return 'Escola';
  if (any >= 2013) return 'Premini';
  if (any >= 2011) return 'Mini';
  if (any >= 2009) return 'Infantil';
  if (any >= 2007) return 'Cadet';
  if (any >= 2005) return 'Junior';
  return 'Sèniors';
}

/**
 * FIX individuals existents (executa UNA SOLA VEGADA):
 * 1. Calcula categoria per any de naixement si buida.
 * 2. Regenera checkinUrl amb categoria correcta.
 * 3. Marca "Email enviat" = "Sí" (les 2 persones ja van rebre email).
 * Des del dashboard: selecciona "fixExistingIndividuals" i clica ▶.
 */
function fixExistingIndividuals() {
  var id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName('Jugadors_Individuals');
  if (!sheet) { Logger.log('[fix-indiv] Sheet no trobat.'); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('[fix-indiv] Sheet buit.'); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function(h) { return String(h || '').trim(); });

  // Afegir columnes que faltin
  ['Codi WRI', 'Check-in URL', 'Email enviat'].forEach(function(col) {
    if (headers.indexOf(col) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
    }
  });

  var C = {};
  headers.forEach(function(h, i) { C[h] = i; });

  var allRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var fixed = 0;

  allRows.forEach(function(r, i) {
    var teamId   = String(r[C['Team ID']] || '').trim();
    var nom      = String(r[C['Nom']]     || '').trim();
    var cognom   = String(r[C['Cognom']]  || '').trim();
    var email    = String(r[C['Email']]   || '').trim();
    var dataNaix = r[C['Data naixement']] || '';
    var poblacio = String(r[C['Població']]  || '').trim();
    var telefon  = String(r[C['Telèfon']]   || '').trim();
    if (!email) return;

    // 1. Categoria per any de naixement
    var catActual   = String(r[C['Categoria']] || '').trim();
    var catCalculada = getCategoria3x3ByBirthDate_(dataNaix) || catActual;
    if (catCalculada !== catActual) {
      sheet.getRange(i + 2, C['Categoria'] + 1).setValue(catCalculada);
      Logger.log('[fix-indiv] ' + nom + ' ' + cognom + ' → categoria: ' + catCalculada);
    }

    // 2. Regenerar checkinUrl amb categoria correcta
    var checkinUrl = buildCheckinUrlIndividual_({
      teamId: teamId, nom: nom, cognom: cognom,
      categoria: catCalculada, poblacio: poblacio,
      telefon: telefon, email: email, dataNaix: String(dataNaix || ''),
    });
    sheet.getRange(i + 2, C['Check-in URL'] + 1).setValue(checkinUrl);

    // 3. Marcar "Email enviat" = "Sí" (ja enviat pel backfill anterior)
    sheet.getRange(i + 2, C['Email enviat'] + 1).setValue('Sí');

    Logger.log('[fix-indiv] ✓ ' + nom + ' ' + cognom + ' | ' + catCalculada + ' | URL actualitzada | enviat marcat');
    fixed++;
  });

  Logger.log('[fix-indiv] COMPLET — ' + fixed + ' files actualitzades');
}

/**
 * Captura un abandonament del formulari d'inscripció.
 * Escriu a la pestanya "Abandonaments" del Sheet.
 *
 * Camps rebuts del frontend:
 *   email, nomEquip, categoria, midaEquip, telefon, pas, ts
 *
 * Lògica de dedupe:
 *   Si ja existeix una fila amb el mateix email (columna B),
 *   actualitza el pas màxim i el timestamp en comptes de crear duplicat.
 *
 * Notifica via CallMeBot (primer abandonament d'un email nou).
 */
function addAbandonament_(data) {
  const id = PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA';
  const ss  = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName('Abandonaments');
  if (!sheet) sheet = ss.insertSheet('Abandonaments');

  const HEADERS = [
    'Data', 'Email', 'Nom Equip', 'Categoria', 'Mida Equip',
    'Telèfon', 'Pas Abandonat', 'Vegades', 'Recuperat',
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    // Format capçalera
    const hRange = sheet.getRange(1, 1, 1, HEADERS.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#1a1a2e');
    hRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const email    = String(data.email || '').trim().toLowerCase();
  const nomEquip = String(data.nomEquip  || '').trim();
  const categoria= String(data.categoria || '').trim();
  const mida     = String(data.midaEquip || '').trim();
  const telefon  = String(data.telefon   || '').trim();
  const pas      = Number(data.pas) || 1;
  const now      = new Date();

  // Dedupe: cerca si l'email ja existeix (columna B, des de la fila 2)
  const lastRow = sheet.getLastRow();
  let existingRow = -1;
  let existingPas = 0;
  if (lastRow >= 2) {
    const emailVals = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < emailVals.length; i++) {
      if (String(emailVals[i][0]).trim().toLowerCase() === email) {
        existingRow = i + 2; // fila real al Sheet (1-indexed, +1 per capçalera)
        existingPas = Number(sheet.getRange(existingRow, 7).getValue()) || 0;
        break;
      }
    }
  }

  if (existingRow > 0) {
    // Actualitza: nou pas màxim + data + vegades (+1)
    const vegades = Number(sheet.getRange(existingRow, 8).getValue()) || 1;
    sheet.getRange(existingRow, 1).setValue(now);           // Data
    sheet.getRange(existingRow, 3).setValue(nomEquip || sheet.getRange(existingRow, 3).getValue());
    sheet.getRange(existingRow, 4).setValue(categoria || sheet.getRange(existingRow, 4).getValue());
    sheet.getRange(existingRow, 5).setValue(mida      || sheet.getRange(existingRow, 5).getValue());
    sheet.getRange(existingRow, 6).setValue(telefon   || sheet.getRange(existingRow, 6).getValue());
    sheet.getRange(existingRow, 7).setValue(Math.max(pas, existingPas)); // pas màxim
    sheet.getRange(existingRow, 8).setValue(vegades + 1);
    Logger.log('[abandon] Update email=' + email + ' pas=' + pas + ' vegades=' + (vegades + 1));
    return; // ja estava → no tornem a notificar
  }

  // Nou abandonament
  sheet.appendRow([
    now, email, nomEquip, categoria, mida, telefon, pas, 1, 'No',
  ]);
  Logger.log('[abandon] Nou email=' + email + ' pas=' + pas);

  // Notificació CallMeBot (només primera vegada — dedupe ja filtra repetits)
  try {
    const msg = [
      '⚠️ Abandonament formulari 3×3',
      '✉️ ' + email,
      nomEquip ? '🏀 ' + nomEquip : '',
      categoria ? '📋 ' + categoria : '',
      '📍 Pas ' + pas + '/5',
      telefon ? '📱 ' + telefon : '',
    ].filter(Boolean).join('\n');
    sendCallMeBot_(msg);
  } catch (e) { Logger.log('[abandon] CallMeBot err: ' + e); }

  // Email als admins (només primera vegada)
  try {
    const pasLabels = ['—', 'Equip', 'Capità', 'Jugadors', 'Pagament', 'Bases'];
    const pasLabel = pasLabels[pas] || 'Pas ' + pas;
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/'
      + (PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA')
      + '/edit#gid=0';
    const mailtoRecuperar = 'mailto:' + email
      + '?subject=' + encodeURIComponent('Ei! Has deixat a mitges la inscripció al 3×3 Glòries 🏀')
      + '&body=' + encodeURIComponent(
          'Hola' + (nomEquip ? ' ' + nomEquip : '') + ',\n\n'
        + 'Hem vist que has començat a inscriure\'t al 3×3 Westfield Glòries (6-7 Juny) però no has acabat.\n\n'
        + 'Si tens algun dubte o necessites ajuda, respon aquest email i t\'ajudem!\n\n'
        + 'Inscriu-te ara: https://cbgrupbarna-3x3timechamber.com/inscripcion\n\n'
        + 'Fins aviat!\nAna · CB Grup Barna'
      );
    const html = '<div style="font-family:sans-serif;max-width:520px;margin:0 auto">'
      + '<div style="background:#dc2626;padding:20px 24px;border-radius:12px 12px 0 0">'
      + '<h2 style="color:#fff;margin:0;font-size:18px">⚠️ Abandonament formulari 3×3</h2>'
      + '</div>'
      + '<div style="background:#18181b;padding:24px;border-radius:0 0 12px 12px;color:#e4e4e7">'
      + '<table style="width:100%;border-collapse:collapse">'
      + '<tr><td style="color:#a1a1aa;padding:6px 0;width:120px">Email</td>'
      + '<td style="padding:6px 0"><strong><a href="' + mailtoRecuperar + '" style="color:#f87171">' + email + '</a></strong></td></tr>'
      + (nomEquip ? '<tr><td style="color:#a1a1aa;padding:6px 0">Equip</td><td style="padding:6px 0">' + nomEquip + '</td></tr>' : '')
      + (categoria ? '<tr><td style="color:#a1a1aa;padding:6px 0">Categoria</td><td style="padding:6px 0">' + categoria + '</td></tr>' : '')
      + (mida ? '<tr><td style="color:#a1a1aa;padding:6px 0">Mida</td><td style="padding:6px 0">' + mida + ' jugadors</td></tr>' : '')
      + (telefon ? '<tr><td style="color:#a1a1aa;padding:6px 0">Telèfon</td><td style="padding:6px 0"><a href="https://wa.me/' + telefon.replace(/[^0-9]/g,'') + '" style="color:#4ade80">' + telefon + '</a></td></tr>' : '')
      + '<tr><td style="color:#a1a1aa;padding:6px 0">Abandonat a</td><td style="padding:6px 0">Pas ' + pas + '/5 — ' + pasLabel + '</td></tr>'
      + '<tr><td style="color:#a1a1aa;padding:6px 0">Data</td><td style="padding:6px 0">' + now.toLocaleString('ca-ES') + '</td></tr>'
      + '</table>'
      + '<div style="margin-top:20px;display:flex;gap:12px">'
      + '<a href="' + mailtoRecuperar + '" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">✉️ Enviar email recuperació</a>'
      + (telefon ? ' <a href="https://wa.me/' + telefon.replace(/[^0-9]/g,'') + '" style="background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">💬 WhatsApp</a>' : '')
      + '</div>'
      + '<p style="margin-top:16px;font-size:12px;color:#71717a">Veure tots els abandonaments: <a href="' + sheetUrl + '" style="color:#a1a1aa">Google Sheets</a></p>'
      + '</div></div>';

    sendMail_({
      to: getAdminEmails_(),
      subject: '⚠️ Abandonament 3×3 — ' + (nomEquip || email) + ' (pas ' + pas + '/5)',
      htmlBody: html,
    });
  } catch (e) { Logger.log('[abandon] admin mail err: ' + e); }
}

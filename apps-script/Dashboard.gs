/**
 * Dashboard.gs — Pestanya "📊 Dashboard" al Sheet d'inscripcions del 3×3
 *
 * Executa `crearDashboard()` manualment des de l'editor d'Apps Script,
 * o usa el menú "🏀 3×3 Glòries → Actualitzar Dashboard" dins el Google Sheet.
 *
 * Lògica de classificació:
 *   Equips OK           → Pagament estat == "Verificat"
 *   Qui cal contactar   → Pagament estat == "Pendent" + Justificant Drive URL != ""
 *   Pendent justificant → Pagament estat == "Pendent" + Justificant Drive URL == ""
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🏀 3×3 Glòries')
    .addItem('Actualitzar Dashboard', 'crearDashboard')
    .addToUi();
}

function crearDashboard() {
  var ss = SpreadsheetApp.openById(
    PROPS.getProperty('SHEET_ID') || '1MG5_8cmeKOe5Jz8BWiJ2e1K669EcIdNNHN1gFGI2uPA'
  );
  var sheetName = PROPS.getProperty('SHEET_NAME') || 'Inscripcions 2026';
  var inscSheet = ss.getSheetByName(sheetName);
  if (!inscSheet) {
    Logger.log('[Dashboard] Pestanya "' + sheetName + '" no trobada.');
    return;
  }

  // ── Preparar la pestanya Dashboard (primera del fitxer) ───────────────────
  var dash = ss.getSheetByName('📊 Dashboard');
  if (!dash) {
    dash = ss.insertSheet('📊 Dashboard');
  } else {
    dash.clearContents();
    dash.clearFormats();
  }
  ss.setActiveSheet(dash);
  ss.moveActiveSheet(1);

  // ── Llegir dades d'inscripcions ───────────────────────────────────────────
  var lastRow = inscSheet.getLastRow();
  var lastCol = inscSheet.getLastColumn();

  if (lastRow < 2) {
    dash.getRange(1, 1).setValue('Encara no hi ha inscripcions al sheet "' + sheetName + '".');
    return;
  }

  var headers = inscSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || '').trim();
  });
  var idx = {};
  headers.forEach(function(h, i) { idx[h] = i; });

  var allRows = inscSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // ── Classificar ──────────────────────────────────────────────────────────
  var ok = [], calContactar = [], pendentJustif = [];
  var byCategoria = {};

  // Helpers per llegir columnes amb noms alternatius (schema antic vs nou)
  function col_(r) {
    return function() {
      for (var i = 0; i < arguments.length; i++) {
        if (idx[arguments[i]] !== undefined) return String(r[idx[arguments[i]]] || '').trim();
      }
      return '';
    };
  }

  allRows.forEach(function(r) {
    var get = col_(r);
    var nomEquip  = get('Nom equip', 'Nom Equip');
    var capNom    = get('Capità', 'Capità Nom');
    var capCog    = get('Capità Cognom');
    var capita    = capCog ? capNom + ' ' + capCog : capNom;
    var email     = get('Email', 'Capità Email');
    var telefon   = get('Telèfon', 'Capità Telèfon');
    var categoria = get('Categoria');
    var codiWR    = get('Codi WR');
    var data      = get('Data', 'Timestamp');
    var total     = idx['Total (€)'] !== undefined ? r[idx['Total (€)']] : '';
    // Justificant: schema nou = 'Justificant Drive URL', antic = 'Justificant'
    var justif    = get('Justificant Drive URL', 'Justificant');
    // Pagament estat: schema nou = 'Pagament estat', antic = 'Notes / Estat' (text lliure)
    var estatRaw  = get('Pagament estat', 'Notes / Estat');
    var CONFIRMAT_RE = /verificat|confirmat|pagat|ok\b/i;
    var pagament  = CONFIRMAT_RE.test(estatRaw) ? 'verificat' : 'pendent';

    if (!nomEquip && !email) return;

    var entry = [codiWR, nomEquip, capita, email, telefon, categoria, total, justif, data];
    var cat = categoria || '(sense categoria)';
    if (!byCategoria[cat]) byCategoria[cat] = { ok: 0, cal: 0, pendent: 0 };

    if (pagament === 'verificat') {
      ok.push(entry);
      byCategoria[cat].ok++;
    } else if (justif) {
      calContactar.push(entry);
      byCategoria[cat].cal++;
    } else {
      pendentJustif.push(entry);
      byCategoria[cat].pendent++;
    }
  });

  var total = ok.length + calContactar.length + pendentJustif.length;
  var now = new Date().toLocaleString('ca-ES', { timeZone: 'Europe/Madrid' });

  // ── ESCRIURE EL DASHBOARD ─────────────────────────────────────────────────
  var row = 1;

  // Títol principal
  dash.getRange(row, 1, 1, 9).merge()
    .setValue('3×3 Westfield Glòries 2026 — DASHBOARD')
    .setFontSize(18).setFontWeight('bold')
    .setFontColor('#ffffff').setBackground('#dc2626')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  dash.setRowHeight(row, 50);
  row++;

  // Subtítol amb data actualització
  dash.getRange(row, 1, 1, 9).merge()
    .setValue('Última actualització: ' + now + '   ·   Total equips inscrits: ' + total)
    .setFontSize(10).setFontColor('#6b7280').setBackground('#f9fafb')
    .setHorizontalAlignment('center');
  dash.setRowHeight(row, 24);
  row++;

  row++; // espai

  // ── 4 Caixes de resum ────────────────────────────────────────────────────
  var caixes = [
    { label: 'TOTAL EQUIPS', valor: total,              bgLabel: '#f3f4f6', bgValor: '#e5e7eb', font: '#1f2937' },
    { label: '✅ CONFIRMATS',  valor: ok.length,          bgLabel: '#d4f4dd', bgValor: '#bbf7d0', font: '#15803d' },
    { label: '🟠 CAL REVISAR', valor: calContactar.length, bgLabel: '#fff3cd', bgValor: '#fde68a', font: '#92400e' },
    { label: '🔴 SENSE JUSTIFICANT', valor: pendentJustif.length, bgLabel: '#fde8e8', bgValor: '#fecaca', font: '#991b1b' },
  ];

  caixes.forEach(function(cx, i) {
    var col = i * 2 + 1;
    dash.getRange(row, col, 1, 2).merge()
      .setValue(cx.label)
      .setFontSize(10).setFontWeight('bold').setFontColor(cx.font)
      .setBackground(cx.bgLabel).setHorizontalAlignment('center').setVerticalAlignment('middle');
    dash.setRowHeight(row, 28);

    dash.getRange(row + 1, col, 1, 2).merge()
      .setValue(cx.valor)
      .setFontSize(28).setFontWeight('bold').setFontColor(cx.font)
      .setBackground(cx.bgValor).setHorizontalAlignment('center').setVerticalAlignment('middle');
    dash.setRowHeight(row + 1, 52);
  });
  // Col 9: omplir fons perquè no quedi blanc
  dash.getRange(row, 9).setBackground('#f3f4f6');
  dash.getRange(row + 1, 9).setBackground('#e5e7eb');
  row += 2;

  row++; // espai

  // ── Taula per categoria ───────────────────────────────────────────────────
  dash.getRange(row, 1, 1, 9).merge()
    .setValue('RESUM PER CATEGORIA')
    .setFontSize(12).setFontWeight('bold').setFontColor('#ffffff')
    .setBackground('#374151').setHorizontalAlignment('left').setVerticalAlignment('middle');
  dash.setRowHeight(row, 28);
  row++;

  dash.getRange(row, 1, 1, 6).setValues([['Categoria', '✅ Confirmats', '🟠 Cal revisar', '🔴 Sense justificant', 'Total', '']])
    .setFontWeight('bold').setBackground('#e5e7eb').setFontColor('#1f2937');
  row++;

  Object.keys(byCategoria).sort().forEach(function(cat) {
    var c = byCategoria[cat];
    var tot = c.ok + c.cal + c.pendent;
    dash.getRange(row, 1).setValue(cat).setFontWeight('bold');
    dash.getRange(row, 2).setValue(c.ok).setFontColor('#15803d').setFontWeight('bold');
    dash.getRange(row, 3).setValue(c.cal).setFontColor('#92400e').setFontWeight('bold');
    dash.getRange(row, 4).setValue(c.pendent).setFontColor('#991b1b').setFontWeight('bold');
    dash.getRange(row, 5).setValue(tot);
    var bg = row % 2 === 0 ? '#ffffff' : '#f9fafb';
    dash.getRange(row, 1, 1, 5).setBackground(bg);
    row++;
  });

  row++; // espai

  // ── Seccions de detall ────────────────────────────────────────────────────
  var COLS = ['Codi WR', 'Equip', 'Capità', 'Email', 'Telèfon', 'Categoria', 'Total €', 'Justificant', 'Data inscripció'];

  row = escriureSeccio_(dash, row, '🟠 QUI CAL CONTACTAR (' + calContactar.length + ')', '#fff3cd', '#92400e', calContactar, COLS);
  row++;

  row = escriureSeccio_(dash, row, '🔴 PENDENT DE JUSTIFICANT (' + pendentJustif.length + ')', '#fde8e8', '#991b1b', pendentJustif, COLS);
  row++;

  escriureSeccio_(dash, row, '✅ EQUIPS CONFIRMATS (' + ok.length + ')', '#d4f4dd', '#15803d', ok, COLS);

  // ── Amplades de columna ───────────────────────────────────────────────────
  dash.setFrozenRows(1);
  dash.setColumnWidth(1, 80);   // Codi WR
  dash.setColumnWidth(2, 165);  // Equip
  dash.setColumnWidth(3, 145);  // Capità
  dash.setColumnWidth(4, 210);  // Email
  dash.setColumnWidth(5, 115);  // Telèfon
  dash.setColumnWidth(6, 165);  // Categoria
  dash.setColumnWidth(7, 75);   // Total €
  dash.setColumnWidth(8, 105);  // Justificant
  dash.setColumnWidth(9, 155);  // Data

  SpreadsheetApp.flush();
  Logger.log('[Dashboard] Creat OK: ' + ok.length + ' confirmats, ' + calContactar.length + ' cal contactar, ' + pendentJustif.length + ' sense justificant.');
}

/**
 * Escriu una secció de detall (capçalera de color + files de dades).
 * Retorna la fila on ha quedat.
 */
function escriureSeccio_(dash, startRow, titol, bgColor, fontColor, dades, cols) {
  var row = startRow;

  // Capçalera de secció
  dash.getRange(row, 1, 1, 9).merge()
    .setValue(titol)
    .setFontSize(13).setFontWeight('bold')
    .setFontColor(fontColor).setBackground(bgColor)
    .setHorizontalAlignment('left').setVerticalAlignment('middle');
  dash.setRowHeight(row, 34);
  row++;

  if (!dades || dades.length === 0) {
    dash.getRange(row, 1, 1, 9).merge()
      .setValue('Cap equip en aquesta categoria.')
      .setFontStyle('italic').setFontColor('#9ca3af').setBackground('#f9fafb');
    dash.setRowHeight(row, 24);
    return row + 1;
  }

  // Capçalera de la taula
  dash.getRange(row, 1, 1, cols.length).setValues([cols])
    .setFontWeight('bold').setBackground('#f3f4f6').setFontColor('#374151');
  row++;

  // Files de dades
  dades.forEach(function(entry) {
    var codiWR    = entry[0];
    var nomEquip  = entry[1];
    var capita    = entry[2];
    var email     = entry[3];
    var telefon   = entry[4];
    var categoria = entry[5];
    var total     = entry[6];
    var justifUrl = String(entry[7] || '').trim();
    var dataInsc  = entry[8];

    var bg = row % 2 === 0 ? '#ffffff' : '#f9fafb';
    dash.getRange(row, 1, 1, 9).setBackground(bg);

    dash.getRange(row, 1).setValue(codiWR);
    dash.getRange(row, 2).setValue(nomEquip).setFontWeight('bold');
    dash.getRange(row, 3).setValue(capita);
    dash.getRange(row, 4).setValue(email);
    dash.getRange(row, 5).setValue(telefon);
    dash.getRange(row, 6).setValue(categoria);
    dash.getRange(row, 7).setValue(typeof total === 'number' ? total : (parseFloat(total) || ''));
    dash.getRange(row, 9).setValue(dataInsc);

    // Columna 8: hyperlink si hi ha URL, guió si no
    if (justifUrl) {
      var safeUrl = justifUrl.replace(/"/g, '');
      dash.getRange(row, 8).setFormula('=HYPERLINK("' + safeUrl + '","Veure ↗")')
        .setFontColor('#2563eb');
    } else {
      dash.getRange(row, 8).setValue('—').setFontColor('#9ca3af');
    }

    row++;
  });

  return row;
}

/* =============================================================
   Leadtracker – Server (Google Apps Script)
   Speichert alle Leads in dieser Google Tabelle und trägt
   Termine in deinen Google Kalender ein.

   Einrichten:
   1. Neue Google Tabelle anlegen, z. B. "Leadtracker".
   2. Erweiterungen → Apps Script. Diesen Code einfügen.
   3. GEHEIM unten auf einen eigenen Schlüssel ändern.
   4. Einmal die Funktion einrichten() ausführen und die
      Berechtigungen bestätigen (Tabelle + Kalender).
   5. Bereitstellen → Neue Bereitstellung → Web-App,
      "Ausführen als: ich", "Zugriff: Jeder".
   6. Die /exec-Adresse und den Schlüssel in der App eintragen.
   ============================================================= */

var GEHEIM   = 'bitte-hier-einen-eigenen-schluessel-eintragen';
var ZEITZONE = 'Europe/Berlin';
var KALENDER_ID = '';   // leer = dein Hauptkalender

var TAB_LEADS = 'Leads';
var TAB_CFG   = 'Einstellungen';
var KOPF = ['Firma','Ort','Stufe','Ansprechpartner','Telefon','E-Mail','Angebot','Wiedervorlage','Zuletzt','json'];

function doGet() {
  return json({ ok: true, app: 'Leadtracker', info: 'Server laeuft. Diese Adresse in die App eintragen.' });
}

function doPost(e) {
  var req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) {}
  if (req.token !== GEHEIM) return json({ ok: false, error: 'token' });

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var leads = ladenLeads();
    var cfg = ladenCfg();
    var antwort = { ok: true };
    var geaendert = false;

    (req.ops || []).forEach(function (o) {
      if (o.op === 'calendar') {
        antwort.eventId = termin(o.args);
        return;
      }
      if (o.col === 'config') {
        if (o.op === 'set')    { cfg = o.data || {}; speichernCfg(cfg); }
        if (o.op === 'update') { for (var k in o.data) cfg[k] = o.data[k]; speichernCfg(cfg); }
        return;
      }
      if (o.col !== 'leads' || !o.id) return;
      if (o.op === 'set')    { leads[o.id] = o.data || {}; geaendert = true; }
      if (o.op === 'update') { var d = leads[o.id] || {}; for (var j in o.data) d[j] = o.data[j]; leads[o.id] = d; geaendert = true; }
      if (o.op === 'delete') { delete leads[o.id]; geaendert = true; }
    });

    if (geaendert) speichernLeads(leads);
    antwort.leads = leads;
    antwort.config = cfg;
    return json(antwort);
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Kalender ---------- */

function kal() {
  return KALENDER_ID ? CalendarApp.getCalendarById(KALENDER_ID) : CalendarApp.getDefaultCalendar();
}

function termin(a) {
  a = a || {};
  var start = new Date(a.startTime);
  var ende  = new Date(a.endTime || (start.getTime() + 3600000));
  var ev = kal().createEvent(String(a.summary || 'Termin'), start, ende, {
    location: String(a.location || ''),
    description: String(a.description || '')
  });
  return ev.getId();
}

/* ---------- Tabelle ---------- */

function blatt(name, kopf) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, kopf.length).setValues([kopf]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ladenLeads() {
  var sh = blatt(TAB_LEADS, KOPF);
  var n = sh.getLastRow() - 1;
  var out = {};
  if (n > 0) {
    sh.getRange(2, KOPF.length, n, 1).getValues().forEach(function (r) {
      try {
        var x = JSON.parse(r[0]);
        if (x && x.id) { var d = x.data || {}; out[x.id] = d; }
      } catch (e) {}
    });
  }
  return out;
}

function speichernLeads(leads) {
  var sh = blatt(TAB_LEADS, KOPF);
  var n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, KOPF.length).clearContent();
  var ids = Object.keys(leads).sort(function (a, b) {
    return String(leads[a].firma || '').localeCompare(String(leads[b].firma || ''), 'de');
  });
  if (!ids.length) return;
  var zeilen = ids.map(function (id) {
    var d = leads[id];
    return [d.firma || '', d.ort || '', d.stufe || '', d.ansprechpartner || '', d.telefon || '',
            d.email || '', d.angebot || '', d.wiedervorlage || '', d.letzterKontakt || '',
            JSON.stringify({ id: id, data: d })];
  });
  sh.getRange(2, 1, zeilen.length, KOPF.length).setValues(zeilen);
  sh.hideColumns(KOPF.length);
}

function ladenCfg() {
  var sh = blatt(TAB_CFG, ['Schluessel', 'Wert']);
  var n = sh.getLastRow() - 1;
  var out = { tagespensum: 5, tageBisAnruf: 5, tageBisBesuch: 5, nachschubSchwelle: 10 };
  if (n > 0) {
    sh.getRange(2, 1, n, 2).getValues().forEach(function (r) {
      if (r[0]) out[String(r[0])] = isNaN(r[1]) ? r[1] : Number(r[1]);
    });
  }
  return out;
}

function speichernCfg(cfg) {
  var sh = blatt(TAB_CFG, ['Schluessel', 'Wert']);
  var n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, 2).clearContent();
  var zeilen = Object.keys(cfg).map(function (k) { return [k, cfg[k]]; });
  if (zeilen.length) sh.getRange(2, 1, zeilen.length, 2).setValues(zeilen);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Einmal von Hand ausfuehren: legt die Blaetter an und fragt nach den Berechtigungen. */
function einrichten() {
  blatt(TAB_LEADS, KOPF);
  blatt(TAB_CFG, ['Schluessel', 'Wert']);
  Logger.log('Kalender: ' + kal().getName());
  Logger.log('Fertig. Jetzt als Web-App bereitstellen.');
}

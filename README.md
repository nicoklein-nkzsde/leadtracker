# Leadtracker

Akquise-Pipeline als normale Website. Läuft auf GitHub Pages, die Daten liegen in
einer Google Tabelle, Termine gehen in den Google Kalender.

## Einrichten (einmalig, ca. 10 Minuten)

1. **Google Tabelle** anlegen, zum Beispiel „Leadtracker“.
2. Darin **Erweiterungen → Apps Script** öffnen und den Inhalt von
   `apps-script/Code.gs` einfügen.
3. Ganz oben `GEHEIM` auf einen eigenen Schlüssel ändern, irgendeine zufällige
   Zeichenfolge.
4. Einmal die Funktion **`einrichten`** ausführen und die Berechtigungen für
   Tabelle und Kalender bestätigen.
5. **Bereitstellen → Neue Bereitstellung → Web-App**,
   „Ausführen als: ich“, „Zugriff: Jeder“. Die `/exec`-Adresse kopieren.
6. Die Seite öffnen, unten links auf die Statuszeile klicken,
   Adresse und Schlüssel eintragen.
7. Einmal **„Leads aus Datei importieren“** drücken und die lokale
   `leads.json` auswählen. Danach nie wieder.

Nach jeder Änderung an `Code.gs`: in Apps Script eine **neue Version**
bereitstellen, sonst läuft weiter der alte Stand.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | die komplette App |
| `leads.json` | einmaliger Import der 33 Leads, **liegt nur lokal, nicht im Repository** |
| `apps-script/Code.gs` | Server: Tabelle lesen und schreiben, Kalendertermine |


## Ohne Verbindung

Ohne eingetragene Adresse läuft die App nur im Browser und vergisst alles beim
Neuladen. Die Statuszeile unten links zeigt den Zustand an.

## Datenschutz

Das Repository ist öffentlich, damit GitHub Pages kostenlos ausliefert.
Deshalb liegen **keine Kundendaten** darin: `leads.json` ist über `.gitignore`
ausgeschlossen und bleibt auf deinem Rechner. Alle echten Daten stehen in der
Google Tabelle und sind nur mit deinem Google-Konto erreichbar.

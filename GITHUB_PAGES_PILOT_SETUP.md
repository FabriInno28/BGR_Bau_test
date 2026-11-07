# BGR BauRadar – GitHub Pages Pilot (Stand 21.09.2026)

## Was vorbereitet ist

Der Branch `gh-pages` enthält ausschliesslich den BauRadar als Website ohne interne BGR-Projekte und ohne interne Finanzdaten. Die echten 36 Projekte liegen getrennt in dieser **privaten** Datei:

[BGR BauRadar – BGR Startstand für Iris und Alex](./BGR_BauRadar_Startstand_Pilot_0.9_PRIVAT.json)

Die Website speichert neue Planungen lokal im Browser. Es gibt keine gemeinsame Bearbeitung oder Datenbank.

## Einmalig aktivieren (nur durch Repository-Admin)

1. Im **privaten** Repository `FabriInno28/BGR_Bau_test` Settings → Pages öffnen: https://github.com/FabriInno28/BGR_Bau_test/settings/pages
2. Unter Build and deployment → Source: **Deploy from a branch** wählen.
3. Branch **gh-pages**, Ordner **/(root)** wählen und auf **Save** klicken.
4. Den Link unter "Your site is live at" öffnen und im Browser prüfen.

Voraussichtliche URL: https://fabriinno28.github.io/BGR_Bau_test/ – erst nach erfolgreicher Pages-Aktivierung und Prüfung weitergeben.

**Sicherheitswarnung:** Eine GitHub-Pages-Website ist bei einem persönlichen Account öffentlich erreichbar, auch wenn das Repository privat ist. Deshalb sind im `gh-pages`-Branch bewusst keine internen Daten eingebunden. Das ursprüngliche Repository und seine Entwicklungsbranches **niemals öffentlich stellen**. Wenn GitHub Pages für dieses private Repository im Kontoplan nicht verfügbar ist: Stattdessen ein **separates neues öffentliches Repository nur mit den geprüften 10 Dateien aus dem Branch `gh-pages`** verwenden; keine privaten Daten und keine privaten Commits kopieren.

## Interner Test

Die JSON-Startdatei über den obigen privaten GitHub-Link herunterladen und **nur direkt an Iris und Alex** senden. Nach Öffnen der Website zu "Sicherung und kontrollierte Übergabe" gehen und auf "Vollsicherung einlesen" klicken; private JSON-Datei auswählen. Der BGR-Stand erscheint dann auf dem jeweiligen Gerät. Den Stand regelmässig mit "Vollsicherung erstellen" separat sichern. Auf anderen Geräten ist er nicht automatisch vorhanden.

Die normale Pilotversion im Branch `feature/sichere-pilotbasis`, der Main-Branch und die Vercel-Produktion wurden für diese Pages-Vorbereitung nicht umgestellt.

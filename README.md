# BGR Portfolio Cockpit · Prototyp V2

Ein lokales, fragegeführtes Planungswerkzeug für das Bauportfolio der Baugenossenschaft Reussbühl.

## Zweck

Das Cockpit macht gleichzeitig sichtbar:

- welches einzelne Projekt in welcher Projektphase steht,
- welche Meilensteine und Entscheide als Nächstes anstehen,
- welche Menschen, Firmen und Funktionen pro Quartal benötigt werden,
- welche Personentage pro Quartal verfügbar sind,
- wo Bedarf und Verfügbarkeit nicht zusammenpassen,
- welche finanziellen Belastungen bereits bekannt sind,
- welche lokalen Änderungen später kontrolliert nach Excel übernommen werden können.

Die bestehende Excel-Datei ist die unveränderte Mutter. Die Website schreibt nie in diese Datei. Der Arbeitsstand wird ausschliesslich im Browser des verwendeten Geräts gespeichert.

## Projektarten

- **Kleinprojekt:** ohne externen Planer, Architekten oder eine vergleichbare Fachplanung und innerhalb des bewilligten Projektrahmens. Die genaue Abgrenzung wird später im BGR Handbuch festgelegt.
- **Bauprojekt:** alle übrigen relevanten Bauvorhaben.

## Projektphasen

1. Anlass / Prüfauftrag
2. Machbarkeitsstudie
3. Planerauswahl
4. Planung / Projektierung
5. Ausschreibung / Vergabe
6. Realisierung
7. Abschluss / Übergabe

Die Farben der sieben Phasen sind im gesamten Cockpit identisch. Die beiden grossen Entscheide sind nach der Machbarkeitsstudie und nach der Planung markiert. Sie beziehen den Gesamtvorstand ein. Die Kostengenauigkeit beträgt dort grundsätzlich ±25 Prozent beziehungsweise ±10 Prozent.

## Ressourcenlogik

Für Projektbedarf und Verfügbarkeit wird dieselbe einfache Zeile verwendet:

`Name | Funktion | Quartal | PT minimum | PT maximum`

Beispiel: `Iris | BK | Q1 2027 | 4 | 6`

Die Gesamtsicht summiert die Projektbedarfe je Name und Quartal und vergleicht sie mit der erfassten Verfügbarkeit. So werden Lücken, Überschneidungen und noch offene Angaben sichtbar.

## Bedienung

1. Ein Projekt in der Zeitachse auswählen.
2. Rechts die Projektsicht prüfen.
3. Mit **Projekt öffnen** Grunddaten, Rollen, Ressourcen und Meilensteine bearbeiten.
4. Unter **Verfügbarkeit** die Quartalswerte von Personen und Firmen erfassen.
5. Die Ressourcenmatrix und die Finanzsicht prüfen.
6. Geprüfte Daten über die CSV-Schaltflächen exportieren und bewusst in Excel übernehmen.

Ein Projekt kann im lokalen Arbeitsstand gelöscht werden. Mit **Rückgängig**, dem projektspezifischen Wiederherstellen oder **Arbeitsstand zurücksetzen** kann jederzeit auf den Excel Ausgangsstand zurückgekehrt werden.

## Lokal starten

```bash
npm install
npm run dev
```

Danach die angezeigte lokale Adresse im Browser öffnen.

## GitHub Pages

Die statischen Dateien können direkt aus dem Projektroot veröffentlicht werden. Für einen Build:

```bash
npm install
npm run build
```

Das Ergebnis liegt in `dist/`.

## Datensicherheit des Prototyps

- keine Anmeldung
- kein Server und keine Datenbank
- keine automatische Synchronisation
- lokale Speicherung im Browser
- Excel bleibt unverändert
- CSV Export zur kontrollierten Übernahme

Für einen späteren Mehrbenutzerbetrieb braucht es ein bewusstes Betriebs-, Berechtigungs- und Sicherungskonzept.

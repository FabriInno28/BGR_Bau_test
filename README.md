# BGR Portfolio Cockpit · verbindlicher Planungsprototyp

Das Cockpit verbindet den aktuellen Stand der BGR Mutterliste mit einer rollenden Projekt-, Ressourcen- und Finanzplanung.

## Grundlogik

Die Mutterliste zeigt, wo ein Projekt heute steht. Sie wird durch das Cockpit nicht verändert.

Im Cockpit werden je Projekt separat geplant:

- alle sieben Projektphasen
- Start und Ende jeder Phase in Quartalen
- Rollen und Bauherrenbegleitung
- Ressourcenbedarf je Person oder Firma, Funktion, Projektphase und Quartal
- Kosten je Projektphase und Jahr
- Meilensteine und Entscheide

Der lokale Arbeitsstand kann geprüft und als CSV exportiert werden.

## Projektphasen

1. Anlass / Prüfauftrag
2. Machbarkeitsstudie
3. Planerauswahl
4. Planung / Projektierung
5. Ausschreibung / Vergabe
6. Realisierung
7. Abschluss / Übergabe

Alle Phasen haben im gesamten Cockpit dieselbe Farbe. Die beiden grossen Entscheide nach der Machbarkeitsstudie und nach der Planung beziehen den Gesamtvorstand ein.

## Verbindliche Ressourcenplanung

Der Projektbedarf wird so erfasst:

`Name | Funktion | Projektphase | Quartal | PT Minimum | PT Maximum`

Die Verfügbarkeit wird separat und verbindlich erfasst:

`Name | Funktion | Quartal | PT Minimum | PT Maximum | bestätigt`

Nur mit der Person oder Firma geklärte Kapazitäten gehören in die Verfügbarkeitsmaske.

Namen werden technisch vereinheitlicht. `Tresto` und `TRESTO` gelten als dieselbe Ressource.

Die Bewertung lautet:

- **tragbar:** maximaler Bedarf ist durch die minimale Verfügbarkeit gedeckt
- **mögliche Lücke:** die beiden Bandbreiten überschneiden sich
- **sichere Lücke:** minimaler Bedarf liegt über der maximalen Verfügbarkeit
- **offen:** Bedarf ist vorhanden, aber keine verbindliche Verfügbarkeit erfasst

Beispiel: Bedarf 25 bis 30 PT und Verfügbarkeit 15 bis 20 PT ergibt eine sichere Lücke von mindestens 5 und höchstens 15 PT.

## Finanzplanung

Kosten werden nicht mehr als «bekannt» bezeichnet. Jeder Betrag wird einer Projektphase, einem Jahr und einer Qualität zugeordnet:

- Schätzung
- budgetiert
- freigegeben
- vertraglich gebunden

Nur freigegebene und vertraglich gebundene Beträge werden in der gesicherten Sicht zusammengezählt.

Die Jahressicht wird zusätzlich in drei Planungshorizonte verdichtet:

- 0 bis 1 Jahr
- 2 bis 3 Jahre
- 4 bis 10 Jahre

Bestehende Beträge aus der Mutterliste bleiben als Hinweis sichtbar. Solange sie keiner Projektphase, keinem Jahr und keiner Qualität zugeordnet sind, werden sie nicht als gesichert gewertet.

## Projektarten

- **Kleinprojekt:** ohne externen Planer, Architekten oder vergleichbare Fachplanung und innerhalb des bewilligten Projektrahmens. Die genaue Abgrenzung wird später im BGR Handbuch festgelegt.
- **Bauprojekt:** alle übrigen relevanten Bauvorhaben.

## Bedienung

1. Projekt in der Gesamtsicht auswählen.
2. **Projekt planen** öffnen.
3. Alle relevanten Projektphasen terminieren.
4. Rollen, Ressourcenbedarf, Kosten und Meilensteine erfassen.
5. Verbindliche Verfügbarkeit der Personen und Firmen ergänzen.
6. Ressourcenwarnungen und finanzielle Jahressicht prüfen.
7. Geprüfte Daten als CSV exportieren.

## Lokal starten

```bash
npm install
npm run dev
```

## Produktionsbuild

```bash
npm install
npm run build
```

Das fertige Ergebnis liegt in `dist/` und kann auch für GitHub Pages verwendet werden.

## Grenzen des Prototyps

- keine Anmeldung
- keine Mehrbenutzerbearbeitung
- keine zentrale Datenbank
- Speicherung im Browser des verwendeten Geräts
- keine automatische Veränderung der Excel Mutterliste

Für einen späteren gemeinsamen Betrieb braucht es ein Berechtigungs-, Sicherungs- und Datenverantwortungskonzept.

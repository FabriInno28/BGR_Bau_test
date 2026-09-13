# BGR BauRadar

Lokaler Pilot für die rollende Bauplanung der Baugenossenschaft Reussbühl.

## Rolle des BauRadars

Das BauRadar beantwortet die Umsetzungsfrage:

- Welche Projekte und Phasen stehen an?
- Wer trägt die Verantwortung?
- Welche Menschen und Partner werden wann tatsächlich benötigt?
- Reicht die bestätigte Verfügbarkeit?
- Welche Phasenkosten sind geschätzt, budgetiert, freigegeben oder gebunden?
- Was ist ein verbindlicher Stand und was ist nur ein Szenario?

Die langfristige Objekt-, Investitions-, Finanzierungs- und Cashflowplanung bleibt im LUKB ImmoTool. Werte daraus können als Referenz sichtbar sein, werden aber nie automatisch mit den Phasenkosten addiert.

## Verbindliche Fachlogik

### Ressourcen

- Je Projektphase und Ressource wird genau ein Wert «Noch benötigte PT» erfasst.
- Bei zukünftigen Phasen ist dies der gesamte erwartete Bedarf. Bei laufenden Phasen ist es der Restbedarf ab dem aktuellen Monat.
- Die Verfügbarkeit jeder Person oder Firma wird einmal pro Jahr in einer Maske mit zwölf Monatswerten erfasst.
- Leer bedeutet ungeklärt. Eine bestätigte Null bedeutet nicht verfügbar.
- Es gibt keine lineare oder automatische Verteilung.
- Alle Phasen aller Projekte werden je Ressource gemeinsam geprüft. Kapazität kann nicht doppelt verwendet werden.
- Die Ampel bezieht sich auf die kritischste zusammenhängende Periode, nicht auf einen erfundenen Monatsbedarf.
- Grün bedeutet, dass eine tragfähige Verteilung innerhalb der Phasenfenster rechnerisch möglich ist. Orange bedeutet mehr als 80 bis 100 Prozent Beanspruchung. Rot bedeutet, dass keine Verteilung die Lücke lösen kann.
- Bedarf ohne vollständiges Phasenfenster oder ohne bestätigte Monatskapazitäten bleibt «noch nicht beurteilbar» und kann nie grün werden.
- Iris, Alex, Fabri, TRESTO, Büro 8 und externer Partner sind Kapazitätsressourcen.
- BK und BHB sind Rollen beziehungsweise Gremien und werden nicht mit Personentagen belastet.
- Pro Ressource und Monat ist nur ein Verfügbarkeitseintrag erlaubt.

### Phasentore

Die frühere Meilensteinliste ist entfernt. Entscheide werden direkt als Phasentore protokolliert mit:

- Phase
- Entscheidstatus
- Entscheidinstanz
- Datum
- Kurzbegründung
- Auflagen
- nächste Phase

Gespeicherte Torentscheide werden in der Oberfläche nicht still überschrieben.

### Arbeitsstände

Der scharfe Stand ist jederzeit sichtbar. Ein Szenario wird als vollständige Kopie des scharfen Standes erstellt und verändert diesen nicht. Ein Szenario hält Name, Fragestellung und Ausgangsdatum fest.

Die kontrollierte Übernahme einzelner Szenarioänderungen in den scharfen Stand ist ein nächster Ausbauschritt. Bis dahin dienen Szenarien ausschliesslich zum Spielen und Vergleichen.

## Lokale Speicherung und Sicherung

Der Pilot speichert weiterhin im lokalen Browser. Er ist noch keine Mehrbenutzeranwendung.

Nach jeder Arbeitssitzung sollte eine **Vollsicherung JSON** heruntergeladen werden. Nur diese Datei kann den gesamten Stand einschliesslich Szenarien, Ressourcen, Phasentoren und Änderungsprotokoll verlustfrei wiederherstellen.

CSV-Dateien sind lesbare Exporte für Excel. Sie sind kein vollständiges Wiederherstellungsformat.

Das Speicherschema trägt eine Versionsnummer. Alte Bandbreiten und Monatszuordnungen bleiben als Migrationshinweis erhalten, werden aber nicht automatisch zu einem Restbedarf oder einer Monatsverfügbarkeit umgerechnet.

## Entwicklung

```bash
npm install
npm test
npm run dev
npm run build
```

Die Tests prüfen überlappende Phasen, die engste kritische Periode, fehlende Phasenfenster, den Unterschied zwischen leer und null, Jahresgrenzen, sichere Migration und den Schutz des CSV-Exports vor Excel-Formeln.

## Datenschutz

Das Repository ist privat. Die frühere GitHub-Pages-Veröffentlichung ist deaktiviert. Echte Projektdaten liegen weiterhin in der Git-Historie und dürfen vor einer erneuten öffentlichen Veröffentlichung nicht nur im aktuellen Stand gelöscht werden; dafür braucht es ein bereinigtes Repository oder eine bereinigte Historie.

Supabase oder eine vergleichbare zentrale Datenbank folgt erst nach dem ausgiebigen Pilotbetrieb.

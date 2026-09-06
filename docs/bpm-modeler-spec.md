# BPM Modeler – Spezifikation

## Zielsetzung

Der BPM Modeler ist eine Desktop-Anwendung zum Erstellen, Bearbeiten, Importieren, Speichern und Dokumentieren von BPMN- und DMN-Modellen.

## Fachliche Anforderungen

### Allgemeine Funktionen

#### Anwendungssymbol

- Beim Start des BPM Modelers zeigt das native Anwendungsfenster das unter `public/favicon.png` gepflegte Anwendungssymbol statt eines Electron-Standardsymbols. Der Renderer-Build übernimmt die Datei nach `dist/favicon.png`, damit sie auch in der paketierten Anwendung verfügbar ist. Für die Installation verwenden Windows, Linux und macOS die jeweils plattformgerechte Icondatei aus dem Icon-Satz. Fehlt eine erforderliche Icondatei, darf die Paketprüfung nicht erfolgreich sein. Akzeptanz: Im lokalen Electron-Fenster ist das BPM-Modeler-Symbol sichtbar; die Paketkonfiguration verweist auf vorhandene Windows-, Linux- und macOS-Icondateien; und der Renderer-Build enthält `dist/favicon.png`.

#### User Story: Hilfefunktion – Unterstützung bei der Benutzung der Anwendung erhalten

**Titel:** Hilfefunktion – Unterstützung bei der Benutzung der Anwendung erhalten

Als Anwender der Modellierungsumgebung möchte ich eine Hilfefunktion mit mehrsprachigen, durchsuchbaren und erweiterbaren Hilfeinhalten nutzen können, um die Funktionen des Programms besser zu verstehen und effizienter arbeiten zu können.

**Akzeptanzkriterien:**

##### Allgemeine Hilfefunktion und Navigation

- Der Benutzer kann die Hilfefunktion über **Hilfe → Hilfe öffnen** im zentralen Menü und über `F1` öffnen; beide Wege sind unabhängig vom aktuell fokussierten Dokument verfügbar.
- Die Hilfe zeigt zunächst eine klar bezeichnete Übersicht aller verfügbaren Hilfethemen einschließlich Trefferanzahl. Die Themen sind alphabetisch nach ihrem ersten Schlagwort und bei Gleichstand nach Titel sortiert. Das Suchfeld nennt Beispiele und erklärt, dass auch Wortteile gesucht werden können.
- Die Hilfe zeigt immer genau ein ausgewähltes Hilfethema gleichzeitig. Über **Zurück** kehrt der Benutzer zur Themenübersicht zurück.
- Der Benutzer kann ein Thema über seinen Titel und über dessen Schlagworte finden. Beim Anklicken eines Schlagworts wird die Übersicht auf passende Themen gefiltert.
- Eine Suchfunktion durchsucht Titel, Markdown-Inhalt und sämtliche Schlagworte eines Hilfethemas. Eine Suche ohne Treffer zeigt einen lokalisierten, verständlichen Hinweis und lässt die Hilfe bedienbar.
- Die Hilfefunktion einschließlich Themen, Suche und Bilder ist ohne Internetverbindung nutzbar.

##### Inhalte, JSON-Struktur und Erweiterbarkeit

- Standardhilfeinhalte liegen als menschenlesbare JSON-Dateien unter `public/help/<Sprachcode>/` vor. Sie werden nach stabilen Funktionsbereichen strukturiert: `basics.json` für Einstieg, Oberfläche, allgemeine Modelle, Tastenkombinationen und Offline-Hinweise; `bpmn.json`; `dmn.json`; `export.json` für Exporte und Fehlerbehebung; sowie `administration.json` für die Pflege von Hilfeinhalten. Jeder Eintrag hat eine stabile `id`, einen `title`, Markdown-formatierten `content` und mindestens ein nicht leeres `keywords`-Schlagwort. Ein Eintrag kann optional mit `onboarding: "bpmn"`, `onboarding: "dmn"` oder `onboarding: "cmmn"` als Einstiegshinweis des jeweiligen Modelltyps markiert werden.
- Übersetzungen desselben Themas verwenden dieselbe `id`. Fehlerhafte JSON-Dateien oder unvollständige Einträge werden übersprungen; sie dürfen weder den Hilfedialog noch die übrige Anwendung unbenutzbar machen. Kann die Standardhilfe nicht in den benutzereigenen Ordner kopiert werden, liest die Anwendung die gebündelten Inhalte unmittelbar aus dem Anwendungspaket.
- Der Renderer darf generierte Dateien unter `dist/help/` nicht als Pflegequelle verwenden. Der Renderer-Build kopiert die Standardhilfe aus `public/help/`; Electron Builder liefert sie mit dem Renderer aus.
- Beim ersten Start kopiert die Desktop-Anwendung die Standardhilfe in ein benutzereigenes `help`-Verzeichnis. Dort können Administratoren oder Power User weitere JSON-Dateien ergänzen, ohne die Anwendung neu zu kompilieren. Neu hinzugefügte oder geänderte Dateien werden spätestens beim erneuten Öffnen des Hilfedialogs gelesen. Später ausgelieferte Standardthemen ergänzen fehlende lokale Einträge; ein benutzereigener Eintrag mit derselben Sprache und `id` hat Vorrang und wird nicht überschrieben.
- Eine Installer-Aktualisierung darf vorhandene benutzereigene Hilfeinhalte nicht überschreiben. Fehlen lokale Hilfeinhalte noch, werden die ausgelieferten Standardinhalte verwendet.
- Der optionale Hilfebeitrag **Hilfeinhalte verwalten** richtet sich ausdrücklich an Administratoren und Power User; er ist nicht Voraussetzung für die normale Nutzung der Anwendung.

##### Onboarding-Hinweise

- Beim Anlegen oder Öffnen eines BPMN-Diagramm-Reiters zeigt die Anwendung den als `onboarding: "bpmn"` markierten normalen Hilfeeintrag in einem Onboarding-Dialog. Beim Anlegen oder Öffnen eines DMN-Modell-Reiters gilt entsprechend `onboarding: "dmn"`, bei einem CMMN-Fallmodell `onboarding: "cmmn"`. Der Inhalt wird mit demselben Markdown-Renderer und in derselben UI-Sprache wie die normale Hilfe angezeigt und bleibt dort zugleich als gewöhnliches Hilfethema auffindbar.
- Eine gemeinsame Einstellung **Onboarding beim Öffnen anzeigen** unter **Hilfe** aktiviert oder deaktiviert alle automatischen BPMN-, DMN- und CMMN-Onboarding-Dialoge. Derselbe Schalter ist im angezeigten Onboarding-Dialog vorhanden. Er ist standardmäßig aktiviert, wird pro Benutzer dauerhaft gespeichert und bleibt nach Neustart oder Update erhalten.
- Die lokale Hilfe kann über die optionale `onboarding`-Markierung festlegen, welcher vorhandene Hilfebeitrag für BPMN, DMN beziehungsweise CMMN automatisch angezeigt wird. Fehlt für den geöffneten Modelltyp ein gültig markierter Beitrag oder kann Hilfe nicht geladen werden, erscheint kein Dialog; Modell anlegen und öffnen bleiben uneingeschränkt nutzbar. Die ausgelieferte CMMN-Hilfe enthält bewusst keinen gesetzten CMMN-Marker.
- Akzeptanzkriterien: Bei aktivierter Einstellung erscheint für ein neues oder geöffnetes BPMN-Diagramm nur der BPMN-Einstiegshinweis, für ein DMN-Modell nur der DMN-Einstiegshinweis und für ein CMMN-Fallmodell nur der CMMN-Einstiegshinweis. Das Deaktivieren im Menü oder Dialog unterbindet alle Dialogtypen sofort und dauerhaft; erneutes Aktivieren wirkt für spätere Öffnen- und Anlegen-Vorgänge. DE- und EN-Einträge verwenden jeweils dieselbe `id` und die passende `onboarding`-Markierung. Die Hilfe beschreibt die Konfiguration modellübergreifend für BPMN, DMN und CMMN; eine Suche nach einem Modelltyp findet den allgemeinen Konfigurationseintrag.

##### Markdown und Bilder

- Markdown-Inhalte rendern Überschriften der Ebenen 1 bis 6, geordnete und ungeordnete Listen, umschlossene Code-Blöcke, Inline-Code, Fett, Kursiv, Unterstrichen (`__Text__`), Bilder und Links. Fehlt ein zulässiger Inhalt, bleibt der jeweilige Abschnitt leer; die Unterstützung ist anhand der Hilfe- und Onboarding-Inhalte mit `####`, `#####` und `######` überprüfbar.
- Nicht unterstützte oder unvollständige Markdown-Syntax wird als Text dargestellt und darf keinen Fehler verursachen.
- Ein Markdown-Link mit dem Ziel `help:<id>` öffnet im normalen Hilfedialog das Hilfethema mit derselben stabilen `id` in der aktuellen Sprache oder dem englischen Fallback. Externe Links bleiben externe Links. Ist das referenzierte Hilfethema nicht verfügbar, bleibt der Dialog bedienbar und der Link führt zu keiner fehlerhaften oder leeren Ansicht. Akzeptanz: Der Verweis aus einem Hilfethema öffnet das Zielthema im selben Dialog; ein `https`-Link öffnet weiterhin extern.
- Bilder werden ausschließlich relativ aus `help/images/` referenziert, beispielsweise `![Beschreibung](images/beispiel.png)`. Zulässig sind PNG, JPEG, GIF, SVG und WebP.
- Ein Hilfetext kann einen Screenshot der BPM-Modeler-Oberfläche verwenden. Der Screenshot muss mit lokalisiertem Alternativtext referenziert werden und ohne Netzverbindung sichtbar sein.

##### Mehrsprachigkeit

- Standardhilfeinhalte sind mindestens auf Deutsch (`de`) und Englisch (`en`) verfügbar. Weitere Sprachen können durch zusätzliche Sprachordner und passende Benutzeroberflächen-Properties ergänzt werden.
- Die Hilfe verwendet die aktuell unter **Ansicht → Sprache** gewählte Anwendungssprache. Ein Sprachwechsel wirkt sofort und ohne Neustart; eine bereits geöffnete Hilfe zeigt danach die Themenübersicht der neuen Sprache.
- Existiert ein Hilfethema mit derselben `id` nicht in der gewählten Sprache, wird automatisch die englische Version angezeigt. Ist auch keine englische Version vorhanden, wird das Thema nicht angezeigt.

##### Tastenkombinationen

- Die Hilfe enthält ein eigenes Thema mit allen verfügbaren Tastenkombinationen. Es wird in der gewählten Sprache ausgegeben, ist nach Funktionsbereichen gegliedert und innerhalb eines Bereichs alphabetisch sortiert.
- Jede Tastenkombination ist eindeutig einem Funktionsbereich zugeordnet, mindestens Datei, Export, BPMN, DMN und Sprache. Sie darf keine andere ausführbare Aktion auslösen.
- Die Übersicht enthält mindestens die Einträge für Neu, Öffnen, Speichern, Speichern unter, SVG- und PDF-Export, Prozessumfang, Token-Simulation, Elementfarben, DMN-Testfälle und Sprachwechsel.
- Für BPMN enthält die Übersicht außerdem Kopieren, Ausschneiden und Einfügen sowie die Farb-Tastenkombinationen einschließlich „Standard“ zum Entfernen der Markierung.
- **Datei → Öffnen → DMN-Datei** verwendet `Strg/Cmd+Umschalt+O` und löst dieselbe Dateiauswahl aus wie der native Menüeintrag. Die Tastenkombination ist in der deutschen und englischen Hilfe identisch dokumentiert. Akzeptanz: Bei einer geöffneten Anwendung öffnet `Strg/Cmd+Umschalt+O` den DMN-Dateidialog; der Eintrag im Menü und beide Hilfeübersetzungen zeigen dieselbe Kombination.

### BPMN-Modellierung

1. Die Anwendung muss das Anlegen neuer BPMN-Diagramme ermöglichen.
2. Die BPMN-Modellierung muss auf **bpmn.io** basieren.
3. BPMN-Diagramme müssen als BPMN-Datei gespeichert werden können.
4. Vorhandene BPMN-Dateien müssen importiert, grafisch bearbeitet und wieder gespeichert werden können.
5. Ein BPMN-Diagramm muss als SVG exportiert werden können.
6. Ein BPMN-Diagramm muss als PNG exportiert werden können.
7. Für BPMN-Diagramme muss eine Token-Simulation bei Bedarf ein- und ausgeschaltet werden können.
8. Die Aktivierung oder Deaktivierung der Token-Simulation darf das gespeicherte BPMN-Modell nicht verändern.
9. Der Menüpunkt zur Token-Simulation öffnet unmittelbar die Simulationsansicht und wechselt danach zu **Token-Simulator deaktivieren**; das Deaktivieren entfernt die Simulationsansicht und verändert das BPMN-Modell nicht. Die Token-Simulation startet einen Prozess mit einem None-Start-Event automatisch. Ein Message-Start-Event wird erst simuliert, wenn die Anwenderin oder der Anwender es über das sichtbare Play-Symbol nach Aktivieren der Simulationsansicht auslöst. Eingebettete Subprozesse benötigen für ihre normale Ausführung ein None-Start-Event mit weiterführendem Sequenzfluss; ein Call Activity wird als einzelne Aktivität simuliert und lädt kein verknüpftes BPMN-Modell. Akzeptanz: Ein Prozess mit None-Start-Event startet automatisch; ein Prozess mit Message-Start-Event ist nach dessen manueller Auslösung simulierbar; Aktivieren und Deaktivieren sind beide über das BPMN-Tools-Menü möglich; der Hinweis erläutert die Grenzen für eingebettete Subprozesse und Call Activities.
10. Die BPMN-Modellierung muss einen am rechten Rand ein- und ausklappbaren Eigenschaftenbereich bereitstellen, über den die Eigenschaften des ausgewählten Diagrammelements bearbeitet werden können.
11. BPMN-Elemente müssen über das zentrale Menü und die Tastenkombinationen `Strg+Umschalt+R/B/G/Y/O` in Rot, Blau, Grün, Gelb oder Orange markierbar sein. Die Auswahl „Default“ (`Strg+Umschalt+U`) entfernt die Farbmarkierung. Die Farbinformation wird pro BPMN-Element als optionales namespaciertes Element in dessen `bpmn:extensionElements` gespeichert; BPMN- und BPMN-DI-Standardattribute bleiben unverändert. SVG- und PDF-Exporte müssen die Markierungen darstellen.

### CMMN-Modellierung

#### User Story: CMMN-Fallmodelle erstellen, verknüpfen und dokumentieren

Als Fachanwenderin oder Fachanwender möchte ich CMMN-Fallmodelle lokal erstellen, bearbeiten, mit Prozess-, Entscheidungs- und anderen Fallmodellen verbinden sowie dokumentieren, damit fallbasierte Arbeit neben BPMN und DMN einheitlich gepflegt und weitergegeben werden kann.

1. Beim Start ohne offene Dokumente zeigt die Anwendung eine gleichwertige CMMN-Karte neben BPMN und DMN. Sie bietet **Neu**, **Öffnen** und bis zu fünf zuletzt verwendete lokale CMMN-Dateien. **Datei → Neu/Öffnen** bietet dieselben CMMN-Aktionen; **CMMN-Fallmodell** unter **Datei → Neu** verwendet `Strg/Cmd+Alt+N`. Akzeptanz: Jede Aktion erzeugt beziehungsweise öffnet einen CMMN-Reiter; fehlende Historie zeigt einen lokalisierten Leerzustand und die Tastenkombination erscheint im Menü sowie in der Hilfe.
2. Der CMMN-Editor basiert auf cmmn-js. Er importiert, bearbeitet und speichert CMMN-1.1-XML als `.cmmn`; unbekannte Standard- oder Erweiterungselemente dürfen nicht unnötig entfernt werden. Speichern, Speichern unter, Reiter, Änderungsstatus und Schließen mit Rückfrage funktionieren wie für BPMN/DMN. Akzeptanz: Ein neu erstelltes oder geöffnetes CMMN bleibt nach Speichern und erneutem Öffnen bearbeitbar.
3. Ein CMMN Process Task kann auf eine lokale `.bpmn`-, ein Decision Task auf eine lokale `.dmn`- und ein Case Task auf eine lokale `.cmmn`-Datei verweisen. Jede dieser Tasks zeigt unabhängig von einem bestehenden Verweis ein Link-Symbol unter der Task. Ausschließlich dieses Symbol öffnet den lokalisierten Verknüpfungsdialog; das Auswählen der Task öffnet keinen Dialog und bleibt für die inhaltliche Beschriftung nutzbar. Der Dialog kann einen Dateipfad setzen, ersetzen oder entfernen. Bei einem bestehenden Verweis bietet er zusätzlich **Modell öffnen** und öffnet das typgeprüfte Zielmodell in einem neuen Reiter. Ohne Verweis oder im Browser ohne Desktop-Dateizugriff fehlt die Aktion. Fehlt die verknüpfte Datei später oder hat sie einen falschen Typ, bleibt der aktuelle CMMN-Reiter beim Bearbeiten der Verknüpfung geöffnet und bedienbar und zeigt eine lokalisierte Fehlermeldung. Akzeptanz: Bei jeder der drei Task-Arten ist das Symbol mit oder ohne Pfad sichtbar; ein ausgewählter und bestätigter Pfad bleibt nach Speichern/Öffnen erhalten; **Modell öffnen** öffnet BPMN, DMN beziehungsweise CMMN im neuen Reiter, ohne die Task-Beschriftung zu blockieren.
4. Der Name von `cmmn:casePlanModel` ist bei vorhandener Angabe der maßgebliche Falltitel; der Name von `cmmn:case` überschreibt ihn nicht. Beim ersten Speichern sowie beim SVG- und PDF-Export verwendet die Anwendung diesen Titel als bereinigten Standarddateinamen (Leerzeichen, Sonderzeichen und Umlaute werden dateisicher ersetzt; SVG/PDF erhalten zusätzlich einen Zeitstempel). Fehlt der Planmodellname, verwendet sie den vorhandenen bisherigen Fallback. Die CMMN-PDF-Dokumentation enthält Titel, Stand, exportierbares Diagramm und alle vorhandenen Process-, Decision- und Case-Tasks einschließlich Dateiname eines Verweises; sie zeigt keine BPMN-typische Abschnittsüberschrift „Zusammenarbeit“ für CMMN-Fallmetadaten. Fehlende optionale Namen, Beschreibungen, Diagramme oder Verweise erzeugen keine leeren Platzhalter; ein nicht exportierbares Diagramm führt zu einer verständlichen Fehlermeldung ohne unvollständige Ausgabe. Akzeptanz: SVG und PDF sind ohne laufende Anwendung lesbar, der PDF-Titel sowie die vorgeschlagenen CMMN-, SVG- und PDF-Dateinamen entsprechen dem Case-Plan-Model-Titel, und CMMN-PDFs enthalten keinen Zusammenarbeit-Abschnitt.
5. **Tools → CMMN → Element einfärben** sowie das CMMN-Kontextmenü bieten Rot, Blau, Grün, Gelb, Orange und **Default** im selben Farb-Untermenü; die Kommandos gelten für die aktuelle Auswahl und sind per vorhandenen Farbtastenkombinationen ausführbar. Die CMMN-Farbwahl ändert nur die Elementfläche, damit Rand, Symbol und Beschriftung lesbar bleiben; sie bleibt nach Speichern/Öffnen erhalten. **Default** verwendet eine weiße Fläche bei schwarzem Rahmen, auch für das Case Plan Model. Das CMMN-Kontextmenü bietet außerdem Kopieren, Ausschneiden und Einfügen. Akzeptanz: Ein neues oder ungekennzeichnetes Modell zeigt einen weißen Hintergrund und weißen Case-Plan-Model-Bereich mit schwarzen Rahmen; Farbe und Zurücksetzen sind im Tools-Menü, Kontextmenü und per Tastatur bedienbar; kopierte CMMN-Elemente lassen sich über das Kontextmenü einfügen.
6. Eine BPMN Call Activity kann neben BPMN zusätzlich auf eine lokale CMMN-Datei verweisen. Bei Auswahl von CMMN im erstmaligen Verlinkungsdialog zeigt die Anwendung vor der Dateiauswahl den lokalisierten Hinweis, dass der Verweis nicht BPMN-standardisiert, aber als praktische Herstellererweiterung von einigen CMMN-Engines unterstützt ist. Der Verweis bleibt als optionale `bpml`-Erweiterung erhalten und wird in BPMN-SVG/PDF wie ein BPMN-Verweis berücksichtigt. Akzeptanz: Der Hinweis erscheint nur für die CMMN-Option; ein BPMN-Editor ohne Erweiterungskenntnis kann die Datei weiter öffnen.

### Dateispeicherung und Änderungsstatus

Die Anwendung muss „Speichern“ und „Speichern unter“ unterscheiden: „Speichern“ aktualisiert eine bereits gespeicherte Datei und zeigt bei neuen Modellen einen Speicherdialog. „Speichern unter“ muss immer einen Speicherdialog öffnen und die ausgewählte Datei zum aktuellen Speicherziel machen. Die Oberfläche muss für BPMN- und DMN-Modelle sichtbar anzeigen, wenn seit dem letzten Speichern Änderungen bestehen.

### Informationsdarstellung

#### Startseite

Wenn keine Dokumente geöffnet sind, zeigt die Startseite vor den Karten für BPMN, DMN, CMMN und Lernsupport die lokalisierte Überschrift sowie den Hinweis zur Auswahl einer Modellart. Die Einführung bleibt am oberen Rand des scrollbaren Inhalts sichtbar; bei geringer Fensterhöhe wird der nachfolgende Kartenbereich nach unten gescrollt, statt die Einführung oberhalb des sichtbaren Bereichs abzuschneiden. Akzeptanz: Bei einer Fensterhöhe, in der nicht alle Startkarten gleichzeitig Platz haben, sind Überschrift und Hinweis sichtbar und alle Karten bleiben durch vertikales Scrollen erreichbar.

Mehrere BPMN- und DMN-Dateien können gleichzeitig als Dokument-Reiter geöffnet sein. Der aktive Reiter bestimmt die sichtbare Modellierungsfläche und die aktivierten nativen Menüeinträge. BPMN-spezifische Befehle, einschließlich eines nativen Rechtsklick-Kontextmenüs für Farben sowie Kopieren, Ausschneiden und Einfügen, stehen ausschließlich für den aktiven BPMN-Editor zur Verfügung. Die Zwischenablage für Diagrammelemente bleibt innerhalb von BPMN und darf nicht in DMN verwendet werden.

Beim Wechsel zwischen Reitern bleiben Inhalt, Editorzustand und Statusanzeige jedes geöffneten Dokuments erhalten. Nicht fokussierte Editoren dürfen nicht mit einer Größe von 0×0 initialisiert oder angezeigt werden.
Ein Fokuswechsel zwischen geöffneten Reitern darf keine React- oder Editor-Ausnahme auslösen; danach bleiben Menü, Kopfbereich und alle offenen Dokumente nutzbar.

Jeder Dokument-Reiter kann über ein × geschlossen werden. Bei ungespeicherten Änderungen fragt die Anwendung, ob gespeichert werden soll. „Ja“ führt Speichern beziehungsweise Speichern unter aus; „Nein“ schließt den Reiter und verwirft die Änderungen.

#### Reiter schließen und Änderungen behandeln

- Jeder geöffnete BPMN- und DMN-Reiter zeigt ein × zum Schließen an.
- Das × schließt ausschließlich das Dokument des betroffenen Reiters.
- Nach dem Schließen erhält bevorzugt der unmittelbar links liegende geöffnete Reiter den Fokus. Wird der erste Reiter geschlossen, erhält der unmittelbar rechts liegende Reiter den Fokus. Erst ohne verbleibende Dokumente wird ein leerer Arbeitsbereich angezeigt.
- Das Schließen eines DMN- oder BPMN-Reiters darf weder den Kopfbereich noch die Inhalte und den Zustand anderer geöffneter Dokumente beeinträchtigen.
- Enthält das Dokument ungespeicherte Änderungen, muss vor dem Schließen eine Abfrage erscheinen: „Möchten Sie diese speichern?“
- Bei Auswahl „Ja“ speichert die Anwendung das Dokument. Bereits gespeicherte Dokumente werden aktualisiert; bei neuen Dokumenten öffnet sich „Speichern unter“. Der Reiter wird nur nach erfolgreichem Speichern geschlossen.
- Bei Auswahl „Nein“ wird der Reiter geschlossen; nicht gespeicherte Änderungen gehen verloren.
- Wird ein Speicherdialog abgebrochen, bleibt der Reiter geöffnet.
- Der aktive Reiter zeigt am unteren Rand weiterhin den aktuellen Dateistatus (beispielsweise „Geöffnet: <Pfad>“ oder „Gespeichert: <Pfad>“) sowie den Änderungsstatus („Alle Änderungen gespeichert“ beziehungsweise „Ungespeicherte Änderungen“) an.
- Nach einem erfolgreichen Speichern oder Speichern unter zeigt der zugehörige Reiter den Dateinamen des tatsächlich verwendeten Speicherziels an.

#### Kontextabhängige Menüs und Sprache

- **Datei → Neu**, **Datei → Öffnen**, **Datei → Beenden**, das Hilfemenü und **Ansicht → Sprache** sind unabhängig vom fokussierten Dokument aktiv.
- Befehle zum Speichern, Speichern unter, Exportieren und unter Tools sind nur aktiv, wenn ein Dokument im Fokus ist und der Befehl für dessen Modelltyp unterstützt wird.
- BPMN-spezifische Befehle sind ausschließlich bei einem fokussierten BPMN-Dokument aktiv; DMN-spezifische Befehle ausschließlich bei einem fokussierten DMN-Dokument.
- **Tools → BPMN → Element einfärben** sowie die Farbtastenkombinationen sind nur aktiv, wenn im fokussierten BPMN-Dokument mindestens ein BPMN-Element ausgewählt ist.
- Mehrere BPMN-Elemente können gleichzeitig ausgewählt werden. Eine Farbaktion oder das Zurücksetzen einer Farbaktion wird auf alle aktuell ausgewählten BPMN-Elemente angewendet.
- Nicht verfügbare Menüeinträge werden deaktiviert und ausgegraut dargestellt; sie dürfen nicht ausführbar sein.
- Ein Wechsel unter **Ansicht → Sprache** aktualisiert die Texte der nativen Menüs sofort in der gewählten Sprache. Die Benutzeroberfläche und die Menüeinträge werden auf Deutsch und Englisch vorgehalten.
- Jeder ausführbare native Menüeintrag zeigt eine Tastenkombination an. Die Tastenkombination führt dieselbe kontextabhängig erlaubte Aktion aus wie ein Mausklick auf den Eintrag.
- `Strg/Cmd+S` speichert stets das aktuell fokussierte Dokument, auch wenn der graphische BPMN- oder DMN-Editor den Tastaturfokus besitzt. `Strg/Cmd+Umschalt+S` führt für das fokussierte Dokument „Speichern unter“ aus.

### BPMN-PDF-Dokumentation

#### User Story: PDF-Format und Seitengestaltung für BPMN-Diagramme

**Titel:** PDF-Dokumentation BPMN-Diagramme – PDF-Format & Seitengestaltung

Als Anwender der Modellierungsumgebung möchte ich PDF-Dokumentationen in korrektem DIN-A4-Format mit klar strukturierten Diagrammen und Message-Flow-Beschriftungen erzeugen, um Modelle zuverlässig dokumentieren und fachlich verständlich kommunizieren zu können.

**Akzeptanzkriterien:**

- Das PDF wird standardmäßig im Format DIN A4 Hochformat erzeugt.
- Zu große Prozessdiagramme werden automatisch auf eine separate Seite im Querformat ausgelagert.
- Der BPM Modeler erkennt zuverlässig, wenn ein Diagramm bei 100 % Zoom nicht vollständig auf eine DIN-A4-Seite passt.
- Diagramme im Querformat werden vollständig und ohne Abschneiden dargestellt.
- Jeder Message Flow wird im PDF nach folgendem Muster angezeigt: `<Message-Flow-Name> (ausgehend von Pool „<Pool-Name>“)`. Die Darstellung berücksichtigt die Spracheinstellungen des PDF-Dokuments.
- Überschriften, die breiter als DIN A4 sind, werden automatisch umgebrochen und in der nächsten Zeile fortgeführt.
- Der Umbruch erfolgt ohne Abschneiden oder Überlappen von Text.
- Die Reihenfolge der Elemente im Message-Flow-Titel bleibt beim Umbruch vollständig erhalten.
- Aktivitäten und Message Flows werden jeweils mit einem sichtbaren Trenner getrennt. Zwischen vorherigem Text und Trenner liegen 3 mm, zwischen Trenner und folgender Überschrift 8 mm; vor einer folgenden Abschnittsüberschrift stehen ebenfalls 8 mm Abstand.
- Beim Wechsel eines zu großen BPMN-Diagramms auf die Querseite darf keine leere Zwischenseite erzeugt werden.
- BPMN-Elementdokumentationen dürfen Markdown enthalten. Überschriften, Absätze, geordnete und ungeordnete Listen sowie fett, kursiv und als Code markierte Textteile müssen im PDF formatiert dargestellt werden.
- Die Labels in der linken Spalte der Prozessumfang-Tabelle müssen aus den Sprachdateien stammen und in der aktuell für das PDF gewählten Sprache ausgegeben werden.
- Der Abschnitt für BPMN-Aufgaben heißt im deutschen PDF „Aktivitäten“ und im englischen PDF „Activities“.
- Beim Öffnen eines BPMN-Subprozesses zeigt der Canvas oberhalb der Modellfläche einen Navigationspfad aus dem Namen des übergeordneten Prozesses als anklickbarem Rücksprung und dem Namen des aktuellen Subprozesses. Fehlt ein übergeordneter Prozess, bleibt der Navigationspfad ausgeblendet. Der Rücksprung darf XML, Änderungsstatus und Modellinhalt nicht verändern.
- Der SVG-Export bildet genau die aktuell sichtbare BPMN-Ebene ab: ein geöffneter Subprozess wird mit seinen enthaltenen Elementen exportiert, ein zugeklappter Subprozess nur als seine zusammengefasste Aktivität. Der Export ändert die sichtbare Ebene nicht.
- Der BPMN-SVG-Export verwendet den bereinigten Prozess- beziehungsweise Dateinamen und einen einmalig zum Export bestimmten Zeitstempel im Format `_<YYYYMMDD-HHMMSS>.svg`. Bei einer Call Activity mit vorhandenem lokalem BPMN-Verweis verlinkt die SVG-Grafik diese Aktivität auf die SVG-Datei mit gleichem Basisnamen, aber nur wenn diese Datei neben der BPMN-Datei vorhanden ist; ohne Verweis oder SVG bleibt sie unverlinkt. Dies ist anhand einer exportierten SVG und eines fehlenden Ziel-SVG überprüfbar.
- Wird eine einzelne Call Activity ausgewählt, zeigt die Anwendung bei fehlendem Verweis einen lokalisierten Dialog zur Auswahl und Verknüpfung einer BPMN-XML-Datei. Der Verweis wird als optionales, englisch benanntes `bpml:callActivityLink`-Extension-Element mit dem Attribut `path` gespeichert; andere BPMN-Editoren können das unbekannte Element ignorieren. Bei einem gespeicherten Verweis öffnet die Anwendung die Datei ohne erneute Auswahl in einem eigenen BPMN-Reiter. Ist der Pfad nicht lesbar oder keine BPMN-XML-Datei, bleibt der aktuelle Reiter aktiv und die lokalisierte Meldung verweist auf den Eigenschaftenbereich. Dort zeigt die ausgewählte Call Activity den Pfad und erlaubt dessen Änderung über denselben Dateidialog. In der BPMN-PDF-Dokumentation wird die Aktivität als `<Name> (Call Activity)` aufgeführt und zeigt getrennt von ihrer Beschreibung ausschließlich den Dateinamen des Verweises. Akzeptanz: Verknüpfung bleibt nach Speichern/Öffnen erhalten, ein anderer Editor lädt die Datei, und defekte Pfade verursachen keinen Absturz.
- Die BPMN-PDF-Dokumentation zeigt stets zuerst die Top-Level-Prozessgrafik, auch wenn beim Start des Exports ein Subprozess geöffnet ist. Sie ergänzt unter der bestehenden Überschrift „Aktivitäten“ für jeden vorhandenen Subprozess den Eintrag `<Name> (Subprozess)` beziehungsweise `<Name> (Subprocess)` und dessen eigene Ablaufgrafik. Passt diese Grafik nicht vollständig in die nutzbare DIN-A4-Hochformatfläche, wird sie auf einer eigenen DIN-A4-Querseite vollständig ausgegeben; ohne Detailablauf gibt es keinen Eintrag.
- Eine vorhandene Beschreibung des Top-Level-Prozesses wird direkt nach Titel und Stand-Zeitstempel ausgegeben. Sie wird nicht nochmals als Prozess-Eintrag vor dem Abschnitt „Aktivitäten“ wiederholt. Ist stattdessen ein Prozessumfang hinterlegt, wird nur die bestehende lokalisierte Prozessumfangstabelle ausgegeben.

9. Für BPMN-Modelle muss ein PDF erzeugt werden können.
10. Das PDF muss die Elementdokumentation des Process oder der Collaboration enthalten.
11. Das PDF muss alle Aufgaben enthalten.
12. Aufgaben müssen in der fachlich richtigen Reihenfolge dargestellt werden können.
13. Unter jeder Aufgabe muss deren Elementdokumentation ausgegeben werden.
14. Message Flows müssen im PDF dokumentiert werden.
15. Zu jedem dokumentierten Message Flow muss dessen Elementdokumentation ausgegeben werden.
16. Der Prozessumfang nach dem Top-down-Ansatz von Bruce Silver muss über Tools → BPMN → Prozessumfang definieren bearbeitbar sein. Die vier Angaben werden nach Klick auf „Übernehmen“ als vollständige Markdown-Tabelle in der BPMN-Process-Dokumentation gespeichert und die BPMN-Datei wird unmittelbar gespeichert. Bei fehlendem Speicherort öffnet sich dafür der normale Speichern-unter-Dialog. Bei vorhandenen Angaben wird die Tabelle am Anfang der BPMN-PDF-Dokumentation ausgegeben. Die Tabellenbezeichnungen sind bei explizit ausgewähltem Deutsch deutsch, sonst englisch.
17. Über Tools → BPMN → Hauptaktivitäten definieren muss ein Dialog zur Pflege einer High-Level-Activity-Map verfügbar sein. Er beginnt mit einer Hauptaktivität und erlaubt höchstens zehn Tabs. Jeder Tab erfasst Name, kurze Inhaltsbeschreibung sowie eine Tabelle von Endereignissen und der nächsten Top-Level-Aktivität oder dem fortführenden Endereignis. Absätze und Zeilenumbrüche in der Kurzbeschreibung bleiben nach „Übernehmen“, Speichern, Schließen und erneutem Öffnen vollständig erhalten; auch bereits gespeicherte Maps mit unkodierten Zeilenumbrüchen werden vollständig wieder eingelesen. Nach „Übernehmen“ wird die vollständige, lokalisierte Markdown-Map in der Documentation-Property des Top-Level-Prozesses gespeichert, ohne einen vorhandenen Prozessumfang zu überschreiben, und die BPMN-Datei wird unmittelbar gespeichert. Leere oder nicht gepflegte Maps werden nicht gespeichert. Akzeptanz: Eine Kurzbeschreibung mit mindestens zwei Absätzen wird nach dem erneuten Öffnen des BPMN-Modells unverändert im Dialog angezeigt.
18. Wenn eine High-Level-Activity-Map vorhanden ist, muss die BPMN-PDF-Dokumentation sie nach der Prozessumfang-Tabelle ausgeben, einschließlich Name, Inhaltsbeschreibung und einer lokalisierten Tabelle mit „Endereignis“ und „Nächste Top-Level-Aktivität/Endereignis“. Fehlt die Map, fehlen Überschrift und Leerinhalt vollständig.
19. BPMN-PDF-Dokumentationen müssen standardmäßig auf DIN A4 im Hochformat angelegt werden. Diagramme, deren unskalierte SVG-Abmessungen nicht vollständig in die nutzbare Hochformatfläche passen, müssen auf einer eigenen DIN-A4-Querseite vollständig und ohne Abschneiden dargestellt werden.
20. Die Überschrift eines Message Flows muss dessen Namen und den ausgehenden Pool enthalten. Sie lautet auf Deutsch „<Message-Flow-Name> (ausgehend von Pool \"<Pool-Name>\")“ und auf Englisch „<Message-Flow-Name> (outgoing from pool \"<Pool-Name>\")“. Lange Überschriften müssen innerhalb der Seitenbreite umbrochen werden, ohne Text abzuschneiden oder zu überlappen.

### DMN-Modellierung

16. Die DMN-Modellierung muss auf dem **Kogito DMN Editor** aus dem Apache-KIE-Projekt basieren.
17. Die Anwendung muss das Anlegen neuer DMN-Modelle ermöglichen.
18. DMN-Modelle müssen gespeichert werden können.
19. Vorhandene DMN-Dateien müssen importiert, grafisch bearbeitet und wieder gespeichert werden können.
20. Das DRD eines aktiven DMN-Modells muss als eigenständige SVG-Datei exportiert werden können.

#### DMN-SVG-Export

##### Verfügbarkeit und Bedienung

- Im nativen Menü steht unter **Exportieren als** der Eintrag **SVG** zur Verfügung, wenn ein DMN-Dokument aktiv ist.
- Der Eintrag ist nur aktiv, wenn das aktive DMN-Dokument ein exportierbares DRD enthält. Ohne aktives Dokument gelten die bestehenden kontextabhängigen Menüregeln; der bestehende BPMN-SVG-Export bleibt unverändert verfügbar.
- Der bestehende Tastaturbefehl für den SVG-Export löst bei einem aktiven DMN-Dokument dieselbe Aktion aus wie der Menüeintrag.
- In der Web-Oberfläche ist die entsprechende Exportaktion unter **Exportieren als** ebenfalls für aktive DMN-Dokumente verfügbar.

##### Exportinhalt

- Exportiert wird die vom DMN-Editor erzeugte SVG-Vorschau des aktuellen DRD.
- Die SVG enthält alle im sichtbaren DRD vorhandenen Knoten, Kanten und deren Beschriftungen, insbesondere Namen von Input Data, Decisions, Business Knowledge Models, Knowledge Sources und Decision Services, soweit sie im Modell vorhanden sind.
- Beschriftungen müssen als SVG-Inhalt erhalten bleiben; sie dürfen weder ausgelassen noch ausschließlich als Rastergrafik abgelegt werden.
- Stilinformationen, die für die lesbare Darstellung des DRD erforderlich sind, müssen im exportierten SVG verfügbar sein. Die Datei muss nach dem Speichern ohne laufenden BPM Modeler in einem üblichen SVG-fähigen Viewer geöffnet werden können.
- Der Export enthält ausschließlich die Diagrammgrafik und keine Bedien- oder Editoroberfläche, Menüs, Auswahlrahmen, Hilfsdialoge oder Testfallansichten.

##### Dateierzeugung und Fehlerbehandlung

- Die Anwendung lädt die SVG-Datei im Browser-/Electron-Renderer als Download mit dem MIME-Typ `image/svg+xml` herunter.
- Der vorgeschlagene Dateiname verwendet bei vorhandenem `name` des DMN-`definitions`-Elements den dateisystemtauglich bereinigten Modellnamen und einen beim Export bestimmten Zeitstempel im Format `_<YYYYMMDD-HHMMSS>.svg`. Fehlt der Modellname, verwendet die Anwendung den vorhandenen Fallback `diagram`.
- Ein Export verändert weder das DMN-XML noch den Änderungsstatus, den Speicherort oder den Editorzustand des aktiven Dokuments.
- Der Export funktioniert für neue, noch nicht gespeicherte DMN-Modelle ebenso wie für von Datenträger geöffnete und bearbeitete Modelle.
- Liefert der DMN-Editor keine SVG-Vorschau oder schlägt ihre Erzeugung fehl, wird keine unvollständige Datei gespeichert. Die Anwendung meldet den Fehler verständlich, bleibt weiter bedienbar und verändert das Modell nicht.

##### Akzeptanzkriterien

1. Ein DMN-Modell mit mindestens zwei beschrifteten DRD-Elementen und einer Abhängigkeit kann über **Exportieren als → SVG** exportiert werden.
2. Die erzeugte Datei heißt bei einem Modellnamen standardmäßig `<bereinigter-Modellname>_<YYYYMMDD-HHMMSS>.svg`, bei fehlendem Modellnamen `diagram_<YYYYMMDD-HHMMSS>.svg`, hat den MIME-Typ `image/svg+xml` und lässt sich als SVG öffnen.
3. Das geöffnete SVG zeigt die DRD-Elemente, ihre Verbindung und alle sichtbaren Beschriftungen lesbar an.
4. Der Export enthält keine Elemente der BPM Modeler-Bedienoberfläche.
5. Nach dem Export bleiben DMN-Inhalt, Änderungsstatus, aktiver Reiter und Editorzustand unverändert.
6. Der SVG-Menüeintrag und sein Tastaturbefehl sind bei einem aktiven DMN-Dokument aktiv und bei fehlendem aktiven Dokument deaktiviert.
7. Kann keine SVG-Vorschau erzeugt werden, erhält der Anwender eine Fehlermeldung; es wird keine fehlerhafte Exportdatei erzeugt.

##### Technische Leitplanken

- Die Benutzeroberfläche kommuniziert ausschließlich über den vorhandenen `modeler:dmn`-Port. Der Kogito-Editor bleibt hinter dessen `previewSvg()`-Methode gekapselt.
- Bibliotheksspezifische Kogito-Aufrufe verbleiben im technischen DMN-Adapter.
- Die bestehende BPMN-Exportfunktion darf sich durch die Erweiterung nicht verändern.
- Automatisierte Tests prüfen mindestens die Aktivierung der Aktion für DMN, den Aufruf der SVG-Vorschau und den Download mit Dateiname und MIME-Typ.

### DMN-PDF-Dokumentation

#### User Story DMN-03: DMN-Dokumentation als PDF exportieren

**Als** Fachanwenderin oder Fachanwender, die bzw. der ein DMN-Entscheidungsmodell pflegt, **möchte ich** aus dem aktiven DMN-Reiter eine lesbare, lokalisierte PDF-Dokumentation erzeugen, **damit** ich Modell, DRD, Data Objects, Entscheidungslogik und – falls vorhanden – Testfälle ohne laufenden BPM Modeler prüfen, teilen und archivieren kann.

##### Akzeptanzkriterien

1. Bei aktivem DMN-Dokument steht unter **Exportieren als** eine PDF-Dokumentation zur Verfügung. Der Export arbeitet ausschließlich mit dem aktuellen Editorinhalt und verändert weder DMN-XML, Speicherort, Änderungsstatus, aktiven Reiter noch Editorzustand.
2. Der Dateiname wird bei vorhandenem `name` des DMN-`definitions`-Elements aus diesem Modellnamen gebildet; er entspricht damit dem Basisnamen des DMN-SVG-Exports. Fehlt der Modellname, verwendet die Anwendung den Namen des aktiven Reiters und danach den vorhandenen Fallback. Leerzeichen, Umlaute und Sonderzeichen werden zu einem portablen Dateinamen entschärft. An den bereinigten Namen wird genau ein beim Export ermittelter Zeitstempel im Format `_<YYYYMMDD-HHMMSS>.pdf` angehängt, zum Beispiel `Verkaufspreis_bestimmen_20260819-080503.pdf`.
3. Der beim Export bestimmte Zeitpunkt wird sowohl im Dateinamen als auch im Dokument verwendet. Direkt unter dem Titel steht bei deutscher UI-Sprache `Stand: <lokalisiertes Datum und Uhrzeit>`, bei englischer UI-Sprache `Last Update: <localized date and time>`.
4. Die Dokumentation verwendet DIN A4 im Hochformat. Nur ein DRD, das nicht vollständig in die nutzbare Hochformatfläche passt, wird auf einer eigenen DIN-A4-Querseite ausgegeben. Es dürfen weder Diagramminhalte abgeschnitten noch leere Zwischenseiten erzeugt werden.
5. Jede Seite enthält den bestehenden Footer „Erstellt mit BPM Modeler“ beziehungsweise „Created with BPM Modeler“ sowie `<aktuelle Seite> / <Seitenzahl>`.
6. Alle Überschriften, Feldbezeichnungen, Fallback-Texte, Tabellenbeschriftungen und der Footer verwenden die etablierte UI-Lokalisierung. Die DMN-PDF-Textbausteine werden in den Sprachdateien gepflegt und sind mindestens für Deutsch und Englisch vollständig vorhanden. Ein Sprachwechsel vor dem Export wirkt unmittelbar auf die erzeugte PDF.

##### Dokumentstruktur

7. Die Dokumentation verwendet die nachfolgende Reihenfolge, wobei optionale Abschnitte vollständig ausgelassen werden, wenn ihre Voraussetzungen nicht erfüllt sind:

   1. Titel und Erstellungsstand
   2. Modellbeschreibung, sofern vorhanden
   3. DRD-Grafik, sofern der Editor eine exportierbare Vorschau liefert
   4. Data Objects/Eingabedaten, sofern mindestens ein `inputData` vorhanden ist
   5. Datentypen, sofern mindestens ein direktes `itemDefinition` vorhanden ist
   6. DRD-Elemente und Entscheidungslogik, sofern mindestens eine Decision, ein BKM, eine Knowledge Source oder ein Decision Service vorhanden ist
   7. Eingebundene DMN-Entscheidungsmodelle, sofern mindestens ein direktes `import` vorhanden ist
   8. Testfälle, sofern mindestens ein verknüpfter Testfall vorhanden ist

8. Zwischen Überschriften und dem vorangehenden beziehungsweise folgenden Inhalt ist ein sichtbarer, konsistenter Abstand vorzuhalten. Überschriften und der unmittelbar zugehörige erste Inhalt dürfen nicht durch einen Seitenwechsel getrennt werden.

##### Titel, Beschreibung und DRD

9. Der Titel lautet bei vorhandenem `name` des DMN-`definitions`-Elements auf Deutsch `Entscheidungsmodell: <Name>` und auf Englisch `Decision Model: <Name>`. Fehlt der Modellname, wird ausschließlich ein lokalisierter Ersatztitel verwendet.
10. Die Modellbeschreibung wird aus dem direkten `description`-Kindelement von `definitions` gelesen und nur bei nicht leerem Inhalt ausgegeben.
11. Die DRD-Grafik basiert auf der vom Kogito-DMN-Editor gelieferten SVG-Vorschau. Sie muss alle dort sichtbaren Knoten, Kanten und Beschriftungen einschließlich der Elementnamen enthalten. Die Einbettung darf Beschriftungen nicht auf Elementumrisse reduzieren oder verschwinden lassen.
12. Liefert der Editor keine gültige oder exportierbare DRD-Vorschau, wird keine unvollständige PDF gespeichert. Die Anwendung meldet einen verständlichen Fehler und bleibt bedienbar.

##### Data Objects/Eingabedaten

13. Der Abschnitt **Input Data** wird nur erzeugt, wenn das DMN mindestens ein `inputData`-Element enthält. Fehlt jedes `inputData`, fehlen auch Abschnitt und Überschrift.
14. Jedes Data Object wird mit Name und kursiv hervorgehobenem Datentyp dokumentiert. Format beziehungsweise erlaubte Werte, `description`, `question` und `allowedAnswers` werden nur ausgegeben, wenn die jeweilige Information im XML vorhanden und nicht leer ist.
15. Der Abschnitt **Datentypen** beziehungsweise **Data Type** wird nur bei mindestens einer eigenen, direkten `itemDefinition` erzeugt. Jeder Datentyp erhält eine Unterüberschrift mit seinem `name` sowie eine Tabelle für `isCollection` (Ja/Nein beziehungsweise Yes/No), `typeRef` und vorhandene `allowedValues`. Ohne das jeweilige optionale XML-Feld entfällt nur dessen Zeile.
16. Der Abschnitt **Eingebundene DMN Entscheidungsmodelle** beziehungsweise **Included Decision Models** wird nur bei mindestens einem direkten `import` erzeugt. Je Import werden `name` (oder ersatzweise Namespace) als Unterüberschrift und die vorhandene `locationURI` kursiv ausgegeben.
17. Unter **Tools → DMN → Externe DMN-Modelle einbinden** kann eine Person externe `.dmn`-Dateien aus demselben Ordner wie ein gespeichertes Hauptmodell auswählen. Für jede gültige Auswahl legt die Anwendung unmittelbar eine direkte DMN-`import`-Referenz mit Name, Namespace und Dateiname (`locationURI`) an und übergibt die Datei zusätzlich als benannte Textressource an den Apache-KIE-DMN-Editor. Der Import ist dadurch ohne erneute Auswahl in einem Editor-Reiter nutzbar. Entfernt eine Person eine Auswahl, entfernt die Anwendung nur die zugehörige `import`-Referenz, niemals die externe Quelldatei. Ist das Hauptmodell noch nicht gespeichert, liegt eine Auswahl in einem anderen Ordner oder enthält eine ausgewählte Datei kein DMN-`definitions`-Element mit Namespace, wird sie nicht eingebunden und eine lokalisierte Erklärung angezeigt. Beim erneuten Öffnen lädt die Anwendung die DMN-Dateien desselben Ordners als Ressourcen, damit der Editor gespeicherte Referenzen vor dem Öffnen auflösen kann. Akzeptanz: Nach Auswahl, Speichern und erneutem Öffnen enthält das Hauptmodell einen Import mit der gewählten `locationURI`, der Editor kann die externe Entscheidung verwenden, und der PDF-Export führt das eingebundene Modell auf.

##### DRD-Elemente und Entscheidungslogik

17. Der Abschnitt heißt **Entscheidungslogik-Ebene** beziehungsweise **Decision Logic Level** und dokumentiert alle vorhandenen `decision`-, `businessKnowledgeModel`-, `knowledgeSource`- und `decisionService`-Elemente. Andere DMN-Elementtypen müssen dort nicht dokumentiert werden.
18. Die Überschrift jedes Elements lautet `<Name> (<Typ>)`:

   - Bei einer Decision bestimmt ausschließlich die oberste Boxed Expression den Typ, etwa `Context`, `Decision Table`, `Literal Expression`, `Function`, `Invocation`, `Relation` oder `List`.
   - Verschachtelte Boxed Expressions ändern den Überschriftentyp nicht. Ein Context mit verschachtelter Function bleibt beispielsweise ein `Context`.
   - DMN-Konzeptnamen bleiben in beiden UI-Sprachen englisch, insbesondere `Decision Table`, `Context`, `Invocation`, `Knowledge Source` und `Decision Service`; ein Business Knowledge Model wird als `BKM` bezeichnet.

19. Für Decisions, BKMs und Decision Services werden vorhandener Rückgabe-/Ergebnistyp, `description`, `question`, `allowedAnswers` und die oberste Boxed Expression dokumentiert. Nicht vorhandene Angaben werden ohne Ersatztext ausgelassen.
20. Für eine Knowledge Source werden Name sowie nur bei Vorhandensein `source`, `locationURI` und `description` dokumentiert. Ein Ergebnistyp, eine Boxed Expression, eine leere `Source`-Zeile oder eine leere `Location URI`-Zeile dürfen für Knowledge Sources nicht ausgegeben werden.
21. Beschreibungen werden nur aus für das jeweilige Element direkten Kindelementen ausgelesen. Können `description`, `question`, `allowedAnswers`, `source` oder weitere optionale Angaben wegen fehlender oder abweichender XML-Struktur nicht gelesen werden, wird diese Information weggelassen. Das Fehlen darf weder einen PDF-Exportfehler noch leere Überschriften, Spalten, Zeilen oder Platzhalter verursachen.

##### Boxed Expressions

22. Jede oberste Boxed Expression wird zuerst als BPM-Modeler-Grafik mit hellblauen Kopfzellen, umrandeten Tabellenzellen und sichtbaren Zeilennummern ausgegeben. Zeilennummern sind in einer zurückhaltenden, von den FEEL-Ausdrücken abgesetzten Farbe formatiert, damit sie nicht als Teil des Ausdrucks erscheinen. In einem Context sind Variablennamen kursiv hervorgehoben. Eine Function Definition übernimmt ausschließlich aus der DMN-XML ihren optionalen `kind`, ihre `formalParameter` und ihre Body-Expression und folgt der OMG-Tabellenform: Kopfzelle für das Kind-Kürzel (nur bei einem nicht-FEEL-Kind) neben der Parameterliste in Klammern sowie darunter eine über beide Spalten reichende Body-Zelle. Für `kind="FEEL"` entfällt die Kind-Zelle. Der Body darf jede Boxed Expression enthalten. Bei einer verschachtelten Expression zeigt die Body-Zelle deren Typ und Zeilennummer; die vollständige verschachtelte Struktur wird anschließend als eigene Grafik ausgegeben. Eine Boxed List wird vertikal ohne Aufzählungspunkt-Spalte dargestellt: je Element eine Zeilennummer und eine Expression-Zelle. Eine Boxed Invocation folgt der OMG-Struktur: eine Name-Zelle, darunter die aus der XML-`literalExpression` ausgelesene function-valued expression und anschließend jeweils eine Parameter- und Bindeausdruck-Zelle. In einer Zelle darf nur eine unmittelbare Literal Expression in Monospace-Codeformatierung stehen; FEEL-Werte einer Decision Table oder Relation werden ebenfalls im Code-Stil dargestellt. Jeder verschachtelte Context, jede Function Definition, Invocation, List, Decision Table oder Relation wird zusätzlich als eigene tabellarische Boxed-Expression-Grafik ausgegeben, statt als mehrzeiliger Ersatztext in der Elternzelle. Der Kurzverweis in der Elternzelle enthält die Zeilennummer der verschachtelten Expression, einschließlich einer Decision Table, und entspricht damit ihrer nachfolgenden Grafik und der FEEL-Codezeile. Der Renderer nutzt die XML-Hierarchie.
23. Unter dieser Grafik folgt der vollständige fachliche FEEL-Ausdruck im Code-Stil. Eine Function Definition wird textuell formal als `function(Parameter1, Parameter2, ...) Body`, eine List als `[Element1, Element2, ...]` und ein Context als objektähnliche FEEL-Struktur `{ Context-Key1: Expression, Context-Key2: Expression, ... }` ausgegeben. Ein Context zeigt pro Eintrag den Namen, einen Doppelpunkt und die zugehörige Expression, trennt mehrere Einträge mit Kommas und verwendet bei verschachtelten Contexts die entsprechende Einrückung. Die Context-Keys bilden eine linke Textspalte; jede Value-Expression beginnt in einer gemeinsamen rechten Textspalte. Zeilenumbrüche innerhalb einer Value-Expression bleiben in dieser rechten Spalte eingerückt. Seine Zeilennummern entsprechen der Grafik und sind ebenfalls visuell vom FEEL-Code abgesetzt; XML-Tags, IDs und technische XML-Attribute dürfen nicht als Ersatz für den Ausdruck ausgegeben werden. Akzeptanz: Ein in einer Function Definition verschachtelter Context erscheint im FEEL-Code als `{ ... }` mit benannten, kommagetrennten Einträgen und ohne das technische Wort `context`; die Expression jedes Context-Eintrags beginnt unabhängig von der Schlüssellänge an derselben horizontalen Position.
24. Bei BKMs wird insbesondere der fachliche Ausdruck aus `encapsulatedLogic` und der darin enthaltenen Boxed Expression dokumentiert. Eine `literalExpression` wie `decimal(netPrice + (netPrice * vatRate),2)` wird folglich als dieser FEEL-Ausdruck und nicht als XML ausgegeben.
25. Eine Decision Table wird als lesbare Tabelle dargestellt und enthält die im XML vorhandenen Eingabe-, Ausgabe- und Annotationsspalten sowie sämtliche Regeln. Die `hitPolicy` des `decisionTable`-Elements, zum Beispiel `UNIQUE`, wird sichtbar in der Kopfzeile ausgegeben.
26. Reicht der verfügbare Tabellenraum für einen Zellinhalt nicht aus, wird der Inhalt an Leerzeichen innerhalb derselben Tabellenzelle umgebrochen; die Zelle und ihre Zeile wachsen entsprechend, ohne Ersatzspalten zu erzeugen. Reicht die verbleibende Seitenhöhe nicht aus, wird dieselbe Tabelle mit Kopfzeile auf einer Folgeseite fortgesetzt; auch eine einzelne hohe Zeile darf dabei ohne Abschneiden über Seiten fortgesetzt werden. Der Renderer bleibt im Hochformat, solange die Tabellenstruktur mit lesbaren Spaltenbreiten hineinpasst; erst dann, wenn dies wegen der Spaltenanzahl nicht möglich ist, beginnt die Tabelle auf einer neuen Querformatseite. Der vollständige Inhalt der betroffenen Regel wird zusätzlich unterhalb der Tabelle im Code-Stil dokumentiert. Fehlen optionale Tabellenbestandteile, etwa Annotationsspalten oder `inputExpression`, werden nur diese Bestandteile ausgelassen; die übrige Tabelle bleibt exportierbar.

##### Markdown und Testfälle

27. Vorhandene Beschreibungen unterstützen Markdown für Überschriften, Code, Fett, Kursiv, nummerierte und ungeordnete Listen sowie Links. Nicht unterstützte oder unvollständige Markdown-Syntax darf den Export nicht abbrechen und wird als Text behandelt.
28. Der Abschnitt **Testfälle** beziehungsweise **Test cases** wird nur erzeugt, wenn für das aktive Modell eine verknüpfte Testsuite mit mindestens einem Testfall vorhanden ist. Jeder Testfall wird als Tabelle mit Eingaben und vorhandenen erwarteten Ergebnissen dokumentiert. Die Bezeichnungen der Input Data werden je Testfall kursiv, ihre konkreten Werte normal dargestellt. Ohne verknüpfte Testfälle fehlen Abschnitt und Überschrift vollständig.

##### Robustheit und Prüfung

29. Der Export funktioniert auch für neue, noch nicht gespeicherte DMN-Modelle. XML-Elemente und Attribute, die für die Dokumentation optional sind, dürfen in einem Modell fehlen.
30. Die Dokumentation darf keine leeren Abschnitte, leeren Tabellen, leeren Feldbezeichnungen, technischen Fehlermeldungen oder Platzhalter allein aufgrund fehlender optionaler XML-Informationen enthalten.
31. Automatisierte Tests decken mindestens die XML-Auswertung von Data Objects, Item Definitions, Imports, Decisions, BKMs, Knowledge Sources, Decision Tables und verschachtelten Boxed Expressions sowie die bedingte Ausgabe optionaler Daten, Lokalisierung und Bereinigung/Zeitstempelbildung des Dateinamens ab.
32. Die manuelle PDF-Prüfung bestätigt mindestens DRD-Beschriftungen, Hoch-/Querformatwechsel, Abstände, Footer, Seitenzahlen, Decision-Table- und Boxed-Expression-Grafik, BKM-Ausdrücke, Knowledge-Source-Metadaten, Markdown-Formatierung und die Lesbarkeit langer Inhalte.
33. Beim Start eines DMN-PDF-Exports zeigt die Anwendung bis zur Erzeugung oder bis zum Exportfehler einen sichtbaren, unbestimmten Fortschrittsbalken mit lokalisierter Statusmeldung. Der Indikator muss vor rechenintensiver Dokumenterzeugung gerendert werden und bei Erfolg oder Fehler verschwinden. Tritt ein Fehler auf, zeigt die Statuszeile eine lokalisierte, verständliche Fehlermeldung einschließlich verfügbarer technischer Details; fehlen diese Details, verwendet sie einen lokalisierten Ersatztext. Akzeptanz: Für ein großes DMN-Modell ist während des Exports der Indikator sichtbar; nach erfolgreicher Ausgabe erscheint der Speicherdialog und eine Erfolgsmeldung; ein absichtlich ausgelöster Fehler zeigt die deutsche beziehungsweise englische Fehlermeldung und blockiert keinen weiteren Export.

## Nichtfunktionale Anforderungen

1. Die Anwendung muss als Desktop-Anwendung bereitgestellt werden.
2. Die Anwendung muss unter Windows lauffähig sein.
3. Die Anwendung muss unter Linux lauffähig sein.
4. Die Anwendung muss unter macOS lauffähig sein.
5. Die Anwendung soll mit JavaScript und zugehörigen Web-Technologien implementiert werden.
6. Electron ist die vorgesehene Plattform für die Desktop-Anwendung; eine andere plattformübergreifende Technologie ist zulässig, sofern sie JavaScript-basierte Implementierung und die genannten Funktionsanforderungen unterstützt.
7. Dateien müssen lokal über die jeweilige Betriebssystem-Dateiauswahl geöffnet und gespeichert werden können.
8. Bestehende BPMN- und DMN-Dateien müssen beim Import möglichst ohne Verlust bearbeitbarer Modellinformationen erhalten bleiben.
9. PDF-Exporte müssen Diagramm- und Dokumentationsinformationen in lesbarer Reihenfolge ausgeben.
10. Die Anwendung muss automatisierte Tests für die fachlich kritische XML-Auswertung und Dokumentation bereitstellen.
11. Wichtige Konfigurations- und Fachlogikstellen müssen im Quellcode auf Englisch kommentiert sein.
12. Für Entwickler muss eine Projektdokumentation mit Anpassungs- und Updatehinweisen vorhanden sein.
13. Fachliche Komponenten müssen über austauschbare, technologieunabhängige Schnittstellen kommunizieren.
14. Konkrete Bibliotheken für BPMN, DMN und PDF dürfen nur in dedizierten Adaptern verwendet werden; die Anwendungsoberfläche darf diese Bibliotheksschnittstellen nicht direkt verwenden.
15. Für Modellierung, Dokumentationsauswertung und Export müssen Plugin-Erweiterungspunkte bestehen, an denen kompatible Implementierungen registriert und ausgetauscht werden können.
16. Die Anwendung muss eine native Menüstruktur mit Datei-, Export-, Tools- und Hilfe-Menü bereitstellen. Kontextabhängige Einträge müssen für den aktiven BPMN- oder DMN-Editor verfügbar beziehungsweise deaktiviert sein.
17. Die Anwendung muss ihre Benutzeroberfläche auf Deutsch und Englisch lokalisieren. Beim Start wird die Betriebssystemsprache verwendet, falls sie unterstützt wird; andernfalls Englisch. Die Sprache muss unter Ansicht → Sprache direkt umschaltbar sein; die aktive Sprache ist nicht auswählbar. Jede zusätzliche Properties-Datei im Unterordner `src/lang` muss automatisch als weitere Sprache erkannt und dort angeboten werden; der Dateiname definiert den Sprachcode und `language.name` die sichtbare Bezeichnung.
18. Beim ersten Start sowie nach einer Änderung des mitgelieferten Lizenztexts muss die Anwendung eine Lizenzmaske anzeigen. Solange die Person die Bedingungen nicht bestätigt hat, sind Modellierung, Dateioperationen, Export, Tools und Hilfe deaktiviert; Beenden bleibt möglich. Die Maske und alle Erläuterungen folgen der gewählten UI-Sprache, der verbindliche MIT-Lizenztext darf Englisch bleiben. Sie enthält Zustimmung und Ablehnung: Nach Ablehnung erscheint ein lokalisierter Hinweis, dass die Anwendung beendet wird und bei Nichtnutzung deinstalliert werden soll; nach dessen Schließen beendet sich die Anwendung wie über Datei → Beenden. Nach Zustimmung speichert die Anwendung einen an den Lizenztext gebundenen, verschlüsselten lokalen Zustimmungsbeleg über den Betriebssystem-Schlüsseldienst. Ist kein sicherer Schlüsseldienst verfügbar oder kann der Beleg nicht gespeichert werden, bleibt die Anwendung gesperrt. Akzeptanzkriterien: Eine neue Benutzerkonfiguration zeigt die Maske; keine Modellfunktion ist vorher ausführbar; nach Zustimmung sind alle Funktionen verfügbar; nach Ablehnung endet die Anwendung; eine geänderte LICENSE-Datei verlangt erneut Zustimmung.
19. Unter Hilfe → Über BPM Modeler muss ein scrollbarer Dialog Autor, Version, Lizenz, Haftungshinweis, Bildnachweise für die KI-generierten Icons und das BPA-Buchcover von RheinWerk Verlag sowie den vollständigen Lizenztext anzeigen. Die Anwendung und ihr Quellcode werden sorgfältig erstellt und getestet; Fehler können nicht vollständig ausgeschlossen werden. Die Nutzung erfolgt auf eigene Gefahr, ohne die verbindliche MIT-Lizenz einzuschränken. Akzeptanzkriterien: Der Dialog ist bei langem Lizenztext scrollbar, zeigt die aktuelle Version, nennt in Deutsch und Englisch beide Bildnachweise und ist in beiden Sprachen bedienbar.

## Offene fachliche Festlegung

Bei parallelen Pfaden, Schleifen oder mehreren Start Events ist die „richtige Reihenfolge“ von BPMN-Aufgaben nicht allein aus dem BPMN-Standard eindeutig bestimmbar. Für eine verbindliche Reihenfolge sollte ein fachliches Ordnungskriterium festgelegt werden, beispielsweise ein BPMN-Extension-Attribut wie `doc:order`.

## Ergänzungen BPM Modeler und BPMN-Dokumentation


- Beim Anwendungsstart zeigt die BPMN-Karte ein Prozesspiktogramm aus Start-Ereignis, gerichteter Verbindung, Aufgabe und End-Ereignis. Der letzte Pfeil endet mit einem sichtbaren Abstand vor dem dick umrandeten End-Ereignis, der dem Abstand zwischen der linken Pfeilspitze und dem Aufgabenrechteck entspricht. BPMN-, DMN- und CMMN-Karte sowie die Lernsupport-Karte stehen bei ausreichend breitem Fenster nebeneinander; bei geringer Breite umbrechen sie lesbar. Akzeptanz: Das Piktogramm ist ohne Text verständlich, die Pfeilspitze überlappt das End-Ereignis nicht und die beiden Pfeilspitzen-Abstände sind gleich; bei einer Breite ab 1180 CSS-Pixeln stehen alle vier Karten in einer Reihe.
- Die Lernsupport-Karte beginnt mit einem horizontal mittig zur Karte ausgerichteten Lernsymbol. Unter der Überschrift „Leseempfehlung“ zeigt sie das vergrößerte Buchcover `images/book_bpa_schoenfeld_cover.jpg` als Link auf `https://www.rheinwerk-verlag.de/5716` und darunter das KI-generierte Buchbild `images/cmmn-method-and-style-book.png` mit dem Link auf `https://www.amazon.de/CMMN-Method-Style-Management-Documentation/dp/0982368194`. Beide Links öffnen die Zielseite im Standardbrowser; die KI-Herkunft der Startseiten-Icons steht im Dialog „Über BPM Modeler“. Danach listet die Karte Dateien aus `public/help/examples/` unter den hervorgehobenen Überschriften BPMN, DMN, CMMN und Weitere Dateien. BPMN-, DMN- und CMMN-Dateien öffnen als neue, ungespeicherte Dokument-Reiter in BPM Modeler; andere Dateien öffnet das Betriebssystem mit der zugeordneten Anwendung. Fehlt eine Kategorie oder sind keine Dateien vorhanden, bleibt die Überschrift sichtbar und zeigt einen lokalisierten Leerzustand. Akzeptanz: Das Lernsymbol ist wie die Symbole der Modellkarten mittig ausgerichtet; beide Buchbilder und ihre Bezeichnungen sind anklickbar, neue Dateien im Beispiele-Ordner werden nach Start beziehungsweise Neuaufbau angezeigt, Modell-Dateien sind intern öffnbar, und eine PDF- oder Bild-Datei ruft keinen Renderer-Dateizugriff auf.
- Beim Anwendungsstart ohne geöffnete Dokumente zeigt die Anwendung statt eines neuen BPMN-Modells gleichwertige Karten für BPMN-Geschäftsprozesse, DMN-Entscheidungsmodelle und CMMN-Fallmodelle. Jede Karte bietet Neu und Öffnen sowie bis zu fünf zuletzt geöffnete Dateien des passenden Typs; fehlende Historie zeigt einen erklärenden Leerzustand. Die CMMN-Karte beschriftet ihre Aktionen mit „CMMN-Modell anlegen“ und „CMMN-Modell öffnen“ beziehungsweise den englischen Entsprechungen und richtet die Buttons auf derselben Höhe wie die übrigen Modellkarten aus. Akzeptanz: Der Start erzeugt keinen Dokument-Reiter, jede Aktion öffnet beziehungsweise erzeugt den richtigen Reiter und die CMMN-Aktionen sind in Deutsch und Englisch korrekt lokalisiert.
- Datei → Öffnen → CMMN-Modell öffnen besitzt den Shortcut Strg/Cmd+Alt+O. Akzeptanz: Menü und deutsch- sowie englischsprachige Hilfe weisen denselben Shortcut aus und er öffnet den CMMN-Dateidialog.
- Die Farbwahl unter Tools → BPMN und im Kontextmenü stellt die verfügbaren Farben als Farbfelder dar; ein Hover zeigt Farbnamen und Tastenkombination. Die Auswahl gilt weiterhin für alle selektierten Elemente, Standard entfernt sie. Akzeptanz: Farbfelder, Tooltip und bestehende Shortcuts sind bedienbar.
- Bei Auswahl eines Business Rule Task fordert die Anwendung ohne Verweis zur Auswahl einer lokalen `.dmn`-Datei auf. Der Pfad wird als optionales `bpml:businessRuleTaskLink` gespeichert; bei bestehendem Verweis öffnet die Anwendung die DMN-Datei in einem neuen Reiter. Fehlende oder ungültige Dateien zeigen eine lokalisierte Meldung ohne den aktiven Reiter zu schließen. Akzeptanz: Verweis bleibt nach Speichern/Öffnen erhalten und ein anderer BPMN-Editor kann die unbekannte Erweiterung ignorieren.
- Tools → DMN → Externe DMN-Modelle einbinden besitzt den Shortcut Strg/Cmd+Alt+I. Akzeptanz: Menü, Tastatur und Hilfe weisen denselben Shortcut aus.
- **Tools → DMN → Externe DMN-Modelle einbinden** ist der BPM-Modeler-Arbeitsablauf zum Einbinden externer DMN-Modelle:
  - **Auslöser und Voraussetzung:** Das aktive Hauptmodell ist als lokale `.dmn`-Datei gespeichert. Beim Öffnen des Dialogs liest die Anwendung ausschließlich gültige `.dmn`-Dateien aus demselben Ordner. Dateien aus anderen Ordnern, das Hauptmodell selbst sowie Dateien ohne DMN-`definitions`-Element oder ohne Namespace stehen nicht als einbindbare Modelle zur Verfügung.
  - **Verfügbare und eingebundene Modelle:** Jede Ordnerdatei wird einmal als verfügbare Ressource angezeigt. Ein Kontrollfeld zeigt den tatsächlichen Zustand: aktiviert bedeutet, dass der Dateiname bereits als `locationURI` in einem `dmn:import` des Hauptmodells vorkommt; deaktiviert bedeutet nur „verfügbar“. Eine Datei darf weder mehrfach als Ressource noch mehrfach als DMN-Import vorkommen.
  - **Aktivieren und deaktivieren:** Das Aktivieren schreibt sofort genau einen DMN-`import` mit eindeutiger `id`, Modellname, Namespace, Dateiname (`locationURI`) und dem DMN-Namespace der externen Datei als `importType` in das Hauptmodell. Das Deaktivieren entfernt ausschließlich den Import mit passender `locationURI`; die externe Quelldatei bleibt unverändert.
  - **Kogito-Verhalten:** Der Apache-KIE-DMN-Editor 10.2.0 erhält die externe Datei zugleich als Textressource mit demselben Dateinamen und öffnet das Hauptmodell mit dem relativen POSIX-Pfad `model.dmn`. Dadurch kann er `locationURI` auf die Geschwisterdatei auflösen, ohne dass die Person einen zusätzlichen Reiter bedienen muss.
  - **Lebenszyklus und Fehlerverhalten:** Jede Aktivierung oder Deaktivierung öffnet die Editorinstanz kontrolliert mit aktualisiertem XML und Ressourcen neu. Die vorherige Instanz wird vollständig geschlossen und ihr verbleibender Editor-Container geleert. Ein Fehler beim Laden wird über den neutralen Modeler-Port lokalisiert angezeigt; das Hauptmodell und andere Reiter bleiben bedienbar.
  - **Kompatibilität und Akzeptanz:** Classic-DMN-Dateien ab DMN 1.2 können geöffnet werden. Der aktuelle Editor migriert ein bearbeitetes Modell nach DMN 1.6; die mitgelieferte Drools-Engine 10.2.0 ist die abgestimmte Laufzeit. Aktivieren, Speichern und erneutes Öffnen erzeugt genau einen dauerhaften Import, die externe Entscheidung ist im DRD nutzbar, und rasches Aktivieren/Deaktivieren lässt den Editor nicht dauerhaft im Ladezustand.

- Das XML-Namespace-Präfix `bpml` ist für allgemeine optionale BPM-Modeler-Erweiterungen reserviert. Standard-BPMN-Daten bleiben unverändert; unbekannte Erweiterungen dürfen von anderen Werkzeugen ignoriert werden.
- Der BPMN-SVG-Export verwendet, wenn vorhanden, den Prozessnamen statt des Dateinamens und ergänzt den bestehenden Zeitstempel. Der Name wird für Dateisysteme bereinigt.
- Der Dialog für Hauptaktivitäten ist modal: Editor-Kontextbedienelemente bleiben im Hintergrund. Ein gepflegter Name ersetzt die nummerierte Tab-Bezeichnung. Scheitert die Übernahme oder das Speichern, bleibt der Dialog geöffnet und zeigt eine lokalisierte Fehlererklärung mit den nächsten Schritten.
- Die BPMN-PDF-Dokumentation enthält nach Titel und Stand ein dynamisches Inhaltsverzeichnis. Es enthält Überschriften der Ebenen 2 und 3 mit Einrückung und Seitenzahl, ermöglicht Sprünge per Klick und setzt entsprechende PDF-Lesezeichen. Der eigentliche Inhalt beginnt danach auf einer neuen Seite. Beide Kopfzellen der Hauptaktivitäten-Tabelle werden fett dargestellt; Zellinhalte umbrechen innerhalb der jeweiligen Spalte.
- Beim Öffnen von DMN-Testfällen wird der Dialog im aktiven DMN-Reiter sofort angezeigt. Der Start des lokalen Runners läuft danach; bei dessen Fehler bleibt der Dialog sichtbar und die lokalisierte Statusmeldung erklärt die fehlende Ausführbarkeit.
- Der lokale DMN-Runner akzeptiert für die Auswertung die leeren, auch namespace-präfixierten `extensionElements`-Platzhalter des Kogito-Editors, weil sie keine ausführbare Erweiterung enthalten. Enthält ein DMN-Modell dagegen nichtleere DMN-`extensionElements` oder Verweise auf `java:` beziehungsweise `javax:`, lehnt der Runner die Anfrage vor der Auswertung mit einem verständlichen Ausführungsfehler ab. Voraussetzung ist ein über **Tools → DMN → DMN-Testfälle** gestarteter, token-geschützter lokaler Runner; fehlen diese Merkmale, bleibt das Modell unverändert und es wird kein Ausdruck ausgeführt. Akzeptanz: Das mit Kogito gespeicherte Modell mit leeren Präfix-Platzhaltern liefert reguläre Decision-Table- und FEEL-Ergebnisse; ein gleiches Modell mit einem nichtleeren `dmn:extensionElements` oder Java-Verweis wird abgelehnt.
- BPMN-SVG- und BPMN-PDF-Exporte müssen importierte BPMN-Dateien mit XML-Namespacepräfixen wie `bpmn:` vollständig unterstützen. Prozess, Collaboration, Dokumentation und optionale `bpml`-Call-Activity-Verweise werden anhand ihres lokalen XML-Namens erkannt. Ein Fehler beim Lesen der Dokumentation darf einen ansonsten exportierbaren SVG-Export nicht verhindern; nicht exportierbare SVG- oder PDF-Ausgaben zeigen eine lokalisierte Statusmeldung.

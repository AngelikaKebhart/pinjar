# Browser-Extension: Universelle Shop-übergreifende Merkliste

## 1. Idee & Problem

Beim Stöbern im Internet (z.B. nach Stoffen oder Schnittmustern für Nähprojekte, aber auch generell auf beliebigen Webseiten) stößt man oft auf interessante Dinge, die man sich für später merken möchte – ohne die Absicht, dafür einen Account im jeweiligen Shop anzulegen. Gespeicherte Dinge sind über viele verschiedene Shops und Webseiten verstreut, wodurch man schnell den Überblick verliert und vergisst, wo man was gesehen hat.

**Ziel der Extension:** Eine universelle, shop- und seitenunabhängige Merkliste, die:
- das Speichern beliebiger Seiten per Klick erlaubt (kein Account nötig),
- beim erneuten Besuch eines Shops/einer Domain sofort anzeigt, dass dort bereits etwas gemerkt wurde,
- gespeicherte Inhalte über Tags, Kategorien, Status und Notizen organisierbar macht,
- nicht auf eine bestimmte Branche (z.B. Nähen) beschränkt ist, sondern für beliebige Shops, Blogs, etc. funktioniert.

## 2. Zielplattform

- **Browser:** Chrome, Firefox und Edge (Manifest V3, möglichst browserübergreifend kompatibler Code, z.B. via `webextension-polyfill`)
- **Speicherung:** Rein lokal im Browser (z.B. `chrome.storage.local` / `browser.storage.local`), **kein Cloud-Account, kein automatischer Sync**
- **Geräteübergreifende Nutzung:** Über manuellen **Export/Import** als Datei (z.B. JSON), die der Nutzer selbst kopieren/übertragen kann

## 3. Kernfunktionen

### 3.1 Speichern eines Links
- Speichern erfolgt durch **Klick auf das Extension-Icon** in der Toolbar
- Beim Speichern werden automatisch erfasst:
  - Seiten-URL
  - Seitentitel
  - Vorschaubild/Screenshot (falls von der Seite extrahierbar, z.B. Open-Graph-Bild `og:image`; alternativ Screenshot der sichtbaren Seite)
  - Preis (falls automatisch erkennbar, z.B. über gängige Preis-Meta-Tags/Heuristiken – **kein Anspruch auf 100% Erkennung**, da wenig verlässlich)
- Alle automatisch erfassten Felder müssen **manuell nachträglich editierbar** sein (Titel, Bild ggf. austauschen, Preis)
- Beim Speichern kann der Nutzer direkt vergeben:
  - Kategorie (siehe 3.3)
  - Tags (siehe 3.3)
  - Notiz (Freitext)
  - Status (Default: "Gemerkt")

### 3.2 Indikator für bereits gemerkte Inhalte (pro Domain)
- Sobald der Nutzer eine Domain besucht, auf der bereits mindestens ein Link gespeichert wurde, zeigt das Extension-Icon einen **Badge mit der Anzahl** der auf dieser Domain gespeicherten Links (z.B. kleine Zahl auf dem Icon)
- Klick auf das Icon öffnet das **Popup** (siehe 3.4), das die gemerkten Links dieser Domain auflistet
- Jeder gelistete Link im Popup ist direkt anklickbar/öffnbar (öffnet die jeweilige gespeicherte URL)

### 3.3 Organisation: Kategorien, Tags, Status
- **Kategorien:** Vom Nutzer frei erstellbar (z.B. "Schnittmuster", "Stoffe", "Rezepte"); jeder Link kann **einer** Kategorie zugeordnet werden
- **Tags:** Vom Nutzer frei erstellbar, **mehrere Tags pro Link** möglich (z.B. "Damen", "Pullover")
- **Status:** 
  - Default-Status beim Speichern: **"Gemerkt"** (englische Oberfläche: "Saved") – das ist der einzige eingebaute Status; gespeichert wird dafür der sprachunabhängige Schlüssel `"default"` (siehe Abschnitt 4)
  - Nutzer kann eigene, zusätzliche Status-Werte frei definieren (z.B. "Gekauft", "Umgesetzt", eigene Begriffe); diese werden als eingegebener Text gespeichert und nicht übersetzt
  - Status ist pro Link änderbar
- **Notizen:** Freies Textfeld pro Link (z.B. "passt gut zu Schnitt X", "Größe M kaufen")
- **Löschen:** Links müssen jederzeit vollständig löschbar sein

### 3.4 Popup (Schnellzugriff)
- Öffnet sich bei Klick auf das Extension-Icon
- Zeigt kompakt die gespeicherten Links der **aktuell geöffneten Domain**
- Ermöglicht schnelles Speichern der aktuellen Seite
- Link zum Öffnen des vollständigen Dashboards

### 3.5 Dashboard (Verwaltung)
- Eigene große Ansicht (z.B. eigener Browser-Tab, `extension-page.html`)
- Zeigt **alle** gespeicherten Links, unabhängig von der Domain
- Anzeige inkl. Vorschaubild, Titel, Preis, Kategorie, Tags, Status, Notiz
- **Filter- und Suchfunktionen:**
  - Filter nach Kategorie
  - Filter nach Tag(s)
  - Filter nach Status
  - Volltextsuche (durchsucht Titel und Notiz)
  - Filter kombinierbar
- Möglichkeit, Links direkt im Dashboard zu bearbeiten (Kategorie, Tags, Status, Notiz, Titel, Preis) und zu löschen

### 3.6 Export / Import
- Export aller gespeicherten Daten als Datei (z.B. JSON)
- Import einer solchen Datei in einer anderen Browser-Installation, um die Daten dorthin zu übertragen
- Import sollte bestehende Daten sinnvoll ergänzen (nicht überschreiben), idealerweise mit Duplikat-Erkennung anhand der URL

### 3.7 Mehrsprachigkeit (Deutsch & Englisch)
- Die Oberfläche (Popup und Dashboard) wird **vollständig zweisprachig** angeboten: **Deutsch und Englisch**
- **Startsprache:** automatisch anhand der Browsersprache – bei einer deutschen Browsersprache (`de`, `de-DE`, `de-AT`, …) startet die Extension auf Deutsch, in allen anderen Fällen auf Englisch
- **Manueller Wechsel:** Der Nutzer kann die Sprache im Dashboard jederzeit umstellen; die Wahl wird lokal gespeichert und überschreibt ab dann die automatische Erkennung
- Übersetzt werden **alle** vom Nutzer wahrnehmbaren Texte – auch solche, die nicht sichtbar sind: Alternativtexte von Bildern, ARIA-Labels, Fehler- und Bestätigungsmeldungen sowie Datums- und Zahlenformate
- **Nicht** übersetzt werden vom Nutzer selbst eingegebene Inhalte (Kategorien, Tags, eigene Status-Werte, Notizen) und von Webseiten übernommene Daten (Titel, Preis) – diese bleiben in der Sprache, in der sie erfasst wurden
- Der Default-Status ist ein Sonderfall: Angezeigt wird er übersetzt ("Gemerkt" / "Saved"), gespeichert wird er als sprachunabhängiger Schlüssel `"default"`, damit ein Sprachwechsel bestehende Einträge nicht unbrauchbar macht (Details in Abschnitt 4)
- Auch **Name und Beschreibung der Extension** (Manifest, und damit der Store-Eintrag) werden übersetzt

## 4. Datenmodell (Vorschlag)

```json
{
  "id": "uuid",
  "url": "string",
  "domain": "string",
  "title": "string",
  "imageUrl": "string | null",
  "price": "string | null",
  "category": "string | null",
  "tags": ["string"],
  "status": "Status (siehe unten, Default: { \"kind\": \"builtin\", \"key\": \"default\" })",
  "note": "string",
  "createdAt": "ISO-Datum",
  "updatedAt": "ISO-Datum"
}
```

Der Status ist kein einfacher String, sondern unterscheidet zwei Fälle:

```json
{ "kind": "builtin", "key": "default" }
```
```json
{ "kind": "custom", "label": "Gekauft" }
```

Zusätzlich getrennt gespeichert (damit sie z.B. im Dashboard als Auswahl vorgeschlagen werden können):
- Liste bereits verwendeter Kategorien
- Liste bereits verwendeter Tags
- Liste bereits verwendeter, selbst angelegter Status-Werte (der eingebaute Default gehört nicht dazu, er ist immer verfügbar)
- Einstellungen, u.a. die gewählte Oberflächensprache (`"de"`, `"en"` oder `"auto"` für "der Browsersprache folgen")

**Warum diese Unterscheidung:** Der eingebaute Default-Status ist übersetzbar, selbst angelegte Status-Werte sind es nicht. Ein einfacher String könnte beide Fälle nicht auseinanderhalten – und ein Nutzer, der zufällig einen eigenen Status "default" anlegt, würde mit dem eingebauten kollidieren. Über `kind` ist das technisch ausgeschlossen, und die Anzeige muss nicht raten, ob sie übersetzen soll.

Im Einzelnen:
- **`kind: "builtin"`** – gespeichert wird ausschließlich der sprachunabhängige Schlüssel `"default"`, niemals der übersetzte Text. Angezeigt wird er je nach Oberflächensprache als "Gemerkt" bzw. "Saved". Würde man den übersetzten Text speichern, trügen bestehende Einträge nach einem Sprachwechsel einen Status in der alten Sprache, und der Statusfilter zerfiele in zwei Gruppen
- **`kind: "custom"`** – der vom Nutzer eingegebene Text wird unverändert gespeichert und unverändert angezeigt, in jeder Oberflächensprache. Er wird nie übersetzt
- Der Schlüssel `"default"` benennt die Rolle, nicht die Bedeutung. Sollten später weitere eingebaute Status hinzukommen, bekommen diese sprechende Schlüssel (z.B. `"bought"`); `"default"` bleibt aus Kompatibilitätsgründen unverändert, da der Wert bereits in gespeicherten Daten und Export-Dateien steckt

## 5. Design & UX

- Einfach und intuitiv bedienbar, aber optisch ansprechend gestaltet
- **Kein** thematisches Design auf einen bestimmten Anwendungsfall (z.B. Nähen) zugeschnitten – die Extension soll universell für beliebige Shops, Blogs und Webseiten wirken
- Klar erkennbarer Badge/Indikator auf dem Icon
- Übersichtliche Karten-/Listenansicht im Dashboard mit Vorschaubildern
- **Layout muss zweisprachig tragfähig sein:** Deutsche Texte sind gegenüber englischen typischerweise 20–35% länger (z.B. "Save" → "Speichern", "Settings" → "Einstellungen"). Beschriftungen, Buttons und Spaltenköpfe dürfen daher keine festen Breiten haben, die in einer der beiden Sprachen abgeschnitten werden oder umbrechen – besonders kritisch im schmalen Popup
- Die Sprachumschaltung ist eine bewusste, auffindbare Einstellung im Dashboard, kein versteckter Schalter

## 6. Technische Hinweise & Tech-Stack

### 6.1 Framework & Tooling
- **Paketmanager: [pnpm](https://pnpm.io/)** – verbindlich für dieses Projekt (nicht npm oder yarn); schneller, platzsparender durch Content-addressable Store, striktere Dependency-Auflösung (verhindert versehentlichen Zugriff auf nicht deklarierte transitive Abhängigkeiten – passt gut zum Security-Anspruch aus Abschnitt 7.4)
- **[WXT](https://wxt.dev/)** als Extension-Framework (Vite-basiert)
  - Erzeugt aus einer Codebasis passende Manifeste für Chrome, Firefox und Edge (MV3, bei Firefox intern MV2-Anpassungen)
  - Klare, konventionsbasierte Projektstruktur über "Entrypoints" (Popup, Dashboard/Options, Background, Content-Script als getrennte Dateien/Ordner)
  - Eingebaute, browserübergreifende Storage-Hilfsfunktionen (Wrapper um `storage.local`)
  - Hot Module Reload während der Entwicklung
  - Eingebaute Build-Pipeline zur Erstellung von Store-tauglichen Zip-Dateien pro Browser
- **React** als UI-Layer für Popup und Dashboard
- **TypeScript** durchgängig (von WXT standardmäßig unterstützt) für Typsicherheit und bessere Wartbarkeit
- **Tailwind CSS** für Styling (schnelle Entwicklung, konsistente Utility-Klassen, erleichtert die Einhaltung von Kontrastvorgaben)
- **Vitest** für Unit-Tests (z.B. Storage-Logik, Filter-/Suchfunktionen, Datenmodell-Validierung)
- **ESLint + Prettier** für konsistente Formatierung und Codequalität
  - Ergänzend `eslint-plugin-jsx-a11y`, um Barrierefreiheits-Verstöße in React-Komponenten bereits beim Schreiben zu erkennen

### 6.2 Architektur / Projektstruktur
- Content Script zur Extraktion von Titel, `og:image`, ggf. Preis-Heuristiken beim Speichern
- Background Service Worker zur Verwaltung des Badges (Anzahl Links pro aktueller Domain)
- Lokale Speicherung via `storage.local` (über WXT-Storage-Abstraktion)
- Popup als eigener Entrypoint (React-Komponente)
- Dashboard als eigener Entrypoint, geöffnet als neuer Tab (React-Komponente)
- Klare Trennung nach WXT-Konvention, z.B.:
  - `entrypoints/popup/` – Popup-UI
  - `entrypoints/dashboard/` – Dashboard-UI
  - `entrypoints/background.ts` – Service Worker
  - `entrypoints/content.ts` – Content-Script
  - `src/lib/` bzw. `utils/` – gemeinsame Logik (Storage-Zugriff, Datenmodell, Preis-/Titel-Extraktion, Filterfunktionen)
  - `src/components/` – wiederverwendbare React-Komponenten
  - `src/i18n/` – Nachrichtenkataloge (`de.json`, `en.json`) und Übersetzungs-Hook

### 6.3 Mehrsprachigkeit (i18n) – technische Umsetzung

Es werden **zwei getrennte Mechanismen** gebraucht, weil sie unterschiedliche Anforderungen erfüllen:

**a) Manifest und Store-Eintrag – nativer `_locales`-Mechanismus**
- Übersetzungen unter `public/_locales/de/messages.json` und `public/_locales/en/messages.json`
- Im Manifest `default_locale: "en"`; Name und Beschreibung werden als `__MSG_extensionName__` bzw. `__MSG_extensionDescription__` referenziert
- Dieser Mechanismus richtet sich zwangsläufig nach der Browsersprache. Für den Store-Eintrag ist genau das richtig – dort gibt es keine Laufzeit-Umschaltung

**b) Oberfläche (Popup & Dashboard) – eigene, leichtgewichtige Lösung**
- Der native `browser.i18n` lässt sich zur Laufzeit **nicht** umschalten. Die in 3.7 geforderte manuelle Sprachwahl ist damit nicht umsetzbar, deshalb wird die UI nicht über `browser.i18n` übersetzt
- Stattdessen: typisierte Nachrichtenkataloge unter `src/i18n/`, bereitgestellt über einen React-Context und einen `useTranslation()`-Hook
- Bewusst **ohne externe i18n-Bibliothek** (kein `i18next` o.ä.): Der Bedarf beschränkt sich auf Schlüssel-Lookup, Platzhalter-Ersetzung und Pluralformen. Das passt zum Grundsatz "bewusst wenige Abhängigkeiten" aus 7.4 und hält das Bundle klein
- Die Sprachwahl wird in `storage.local` gespeichert (`"de"`, `"en"`, `"auto"`); bei `"auto"` wird aus `navigator.language` abgeleitet
- Beide Kataloge müssen denselben Schlüsselsatz besitzen. Ein Unit-Test stellt sicher, dass keine Sprache Schlüssel vermisst oder überzählige enthält – das verhindert stillschweigend unübersetzte Stellen
- Datums- und Zahlenformate (inkl. Preisanzeige) über die native `Intl`-API (`Intl.DateTimeFormat`, `Intl.NumberFormat`) mit der aktiven Sprache, nicht über hartkodierte Formate

## 7. Code-Qualität, Barrierefreiheit, Datenschutz & Security

### 7.1 Clean Code
- **Sprache:** Der gesamte Code ist auf Englisch zu verfassen – Variablen-, Funktions-, Datei- und Ordnernamen, Kommentare, Commit-Nachrichten, README und sonstige Dokumentation im Repository. Dies gilt unabhängig davon, dass die Kommunikation/Konzeption mit dem Entwickler auf Deutsch stattfindet
- **Abgrenzung zur Mehrsprachigkeit (3.7):** Die zweisprachige Oberfläche ändert daran nichts. Auch die Übersetzungsschlüssel sind englisch und sprechend benannt (`popup.saveButton`, nicht `btn1` und nicht `popup.speichernButton`); übersetzt werden ausschließlich die **Werte** in den Katalogdateien. Im Komponentencode steht nie ein sichtbarer Text, sondern immer ein Schlüssel
- Sprechende, eindeutige Namen für Variablen, Funktionen und Dateien
- Kleine, klar abgegrenzte Funktionen mit einer einzigen Verantwortlichkeit (Single Responsibility)
- Klare Trennung der Zuständigkeiten, z.B.:
  - Storage-Zugriff (Lesen/Schreiben der Daten) getrennt von
  - UI-Logik (Popup, Dashboard) getrennt von
  - Content-Script-Logik (Datenextraktion von der Seite) getrennt von
  - Background/Service-Worker-Logik (Badge-Verwaltung)
- Konsistente Formatierung (z.B. Prettier) und Linting (z.B. ESLint)
- Aussagekräftige Kommentare nur dort, wo der Code selbst nicht selbsterklärend ist
- Vermeidung von Code-Duplikation (z.B. gemeinsame Helper-Funktionen für Storage-Zugriffe)
- Sinnvolle Fehlerbehandlung (z.B. wenn Titel/Bild/Preis nicht extrahiert werden können, Speichern trotzdem ermöglichen)
- Nachvollziehbare Projektstruktur (z.B. `/src/popup`, `/src/dashboard`, `/src/background`, `/src/content-script`, `/src/lib` oder `/src/utils`)

### 7.2 Barrierefreiheit (WCAG 2.2 Level AA)
Popup und Dashboard sollen den Anforderungen der WCAG 2.2 AA entsprechen, u.a.:
- **Wahrnehmbarkeit:** Ausreichende Farbkontraste (mind. 4.5:1 für normalen Text, 3:1 für großen Text/UI-Elemente); Informationen nicht ausschließlich über Farbe vermitteln (z.B. Status zusätzlich als Text/Icon, nicht nur farblich)
- **Bedienbarkeit:** Vollständige Bedienbarkeit per Tastatur (Tab-Reihenfolge, Fokus-Indikatoren sichtbar); ausreichend große Klickflächen (Zielgröße mind. 24x24px gemäß WCAG 2.2); keine Zeitlimits bei der Bedienung
- **Verständlichkeit:** Klare Beschriftungen für alle Formularfelder (Labels für Kategorie, Tags, Status, Notiz); verständliche Fehlermeldungen (z.B. beim Import einer fehlerhaften Datei)
- **Robustheit:** Semantisches HTML (z.B. `<button>` statt `<div>` mit Click-Handler); passende ARIA-Attribute, wo native HTML-Semantik nicht ausreicht (z.B. bei dynamischen Filterergebnissen im Dashboard, Live-Regionen für Statusänderungen)
- Bilder (Vorschaubilder) benötigen sinnvolle Alt-Texte (z.B. Seitentitel als Alternativtext)
- **Sprache der Seite (WCAG 3.1.1):** Das `lang`-Attribut am `<html>`-Element muss die aktuell aktive Oberflächensprache angeben und beim Sprachwechsel mitwandern. Screenreader wählen darüber die Aussprache – ein auf `en` stehendes Dokument mit deutschem Text wird unverständlich vorgelesen
- **Sprachumschaltung:** ist ein reguläres, beschriftetes Formularelement; die Optionen werden jeweils in ihrer eigenen Sprache benannt ("Deutsch", "English"), damit sie auch dann verständlich sind, wenn die Oberfläche gerade in der Sprache läuft, die der Nutzer nicht versteht

### 7.3 DSGVO-Konformität
Auch wenn aktuell keine Cloud-Speicherung stattfindet, sollte die Extension von Beginn an datenschutzfreundlich konzipiert werden ("Privacy by Design"), um eine spätere Veröffentlichung nicht zu erschweren:
- **Datenminimierung:** Es werden nur die Daten gespeichert, die für die Funktion notwendig sind (URL, Titel, Bild, Preis, Nutzereingaben) – keine Tracking- oder Analyse-Daten
- **Keine Weitergabe an Dritte:** Da alle Daten rein lokal gespeichert werden, findet keine Übertragung an externe Server statt; das sollte auch so bleiben bzw. bei etwaigen späteren Erweiterungen (z.B. Cloud-Sync) explizit opt-in und transparent gemacht werden
- **Transparenz:** Eine verständliche Datenschutzerklärung sollte bei Veröffentlichung bereitgestellt werden (z.B. im Chrome Web Store/Firefox Add-ons verlangt), die klar beschreibt, welche Daten wo (nur lokal) gespeichert werden
- **Berechtigungen (Permissions):** Nur die tatsächlich benötigten Browser-Berechtigungen anfordern (z.B. `activeTab`, `storage`), keine unnötig weitreichenden Rechte wie Zugriff auf alle Webseiten, falls nicht zwingend erforderlich
- **Kontrolle durch den Nutzer:** Möglichkeit, alle gespeicherten Daten jederzeit vollständig zu löschen (z.B. "Alle Daten löschen"-Funktion im Dashboard), zusätzlich zum Löschen einzelner Links
- **Keine Cookies/kein Fingerprinting:** Die Extension soll keine zusätzlichen Tracking-Mechanismen einsetzen

### 7.4 Security

Auch wenn die Extension keine Server-Kommunikation hat, bestehen reale Angriffsflächen, die von Anfang an mitgedacht werden sollten:

- **Schutz vor bösartigen Webseiten (XSS):** Von Webseiten extrahierte Daten (Titel, Bild-URL, Preis) sind nicht vertrauenswürdig und müssen beim Rendern in Popup/Dashboard sicher behandelt werden
  - `dangerouslySetInnerHTML` in React ist **grundsätzlich verboten**; alle Texte werden ausschließlich über normales JSX gerendert (automatisches Escaping)
  - Bild-URLs vor Verwendung validieren (z.B. nur `http(s)`-Schema zulassen)
- **Minimalprinzip bei Berechtigungen:** `activeTab` statt breiter Host-Permissions wie `<all_urls>`; nur die tatsächlich benötigten Permissions im Manifest deklarieren
- **Keine dynamisch nachgeladenen Skripte:** Der gesamte Code ist Teil des Extension-Bundles; es werden keine Remote-Skripte zur Laufzeit nachgeladen (entspricht auch den Vorgaben der Store-Richtlinien und der von Manifest V3 erzwungenen CSP)
- **Robuste Domain-/URL-Verarbeitung:** Domain-Erkennung für den Badge-Indikator über die native `URL`-API, nicht über eigene Regex-Logik, um Fehlklassifizierungen zu vermeiden
- **Supply-Chain-Sicherheit:** Bewusst wenige, aktiv gepflegte Abhängigkeiten; Lockfile wird versioniert; regelmäßig `pnpm audit` (oder Äquivalent) ausführen; Dependency-Updates bewusst und nicht blind automatisiert einspielen
- **Sichere Datenextraktion im Content-Script:** Extraktion von `og:image`/Preis rein lesend, keine Ausführung von Code der Zielseite
- **Übersetzungen sind Teil des Bundles:** Die Sprachdateien werden mit ausgeliefert und niemals zur Laufzeit nachgeladen. Es wird kein Online-Übersetzungsdienst angefragt – das wäre gleichzeitig eine Datenweitergabe an Dritte (7.3) und ein Verstoß gegen die Regel "keine dynamisch nachgeladenen Skripte"
- **Hinweis bei Export:** Nutzer wird darauf hingewiesen, dass die Export-Datei unverschlüsselt ist (enthält ggf. persönliche Notizen) und selbst verantwortungsvoll behandelt werden sollte

## 8. Versionskontrolle (GitHub)

- **Repository:** Öffentliches oder privates GitHub-Repository (je nach Wunsch, kann jederzeit später umgestellt werden)
- **Branching-Strategie:** Einfacher Trunk-based-Ansatz für den Start
  - `main` als stabiler, immer lauffähiger Branch
  - Feature-Branches für neue Funktionen (z.B. `feature/tagging`, `feature/dashboard-filter`), die per Pull Request in `main` gemergt werden
- **Commit-Konventionen:** [Conventional Commits](https://www.conventionalcommits.org/), auf Englisch verfasst (z.B. `feat: add tag filter to dashboard`, `fix: correct price detection`, `chore: update dependencies`) – erleichtert später automatisierte Changelogs und macht die Historie nachvollziehbar
- **`.gitignore`:** u.a. `node_modules/`, `.output/` bzw. Build-Ordner von WXT, `.env` (falls später vorhanden). **`pnpm-lock.yaml` wird explizit versioniert** (nicht ignoriert), damit alle Beteiligten und die CI dieselben Abhängigkeitsversionen verwenden
- **README.md:** Kurzbeschreibung des Projekts, Setup-Anleitung (Installation, lokale Entwicklung mit WXT, Build-Befehle), Hinweise zu Tests und Linting
- **GitHub Actions (CI):** Automatisierter Workflow, der bei jedem Push/Pull-Request läuft:
  - Linting (ESLint)
  - Typprüfung (TypeScript)
  - Tests (Vitest)
  - Build für alle Zielbrowser (Chrome, Firefox, Edge) zur Absicherung, dass der Build nicht bricht
- **Versionierung:** [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) in `package.json`/Manifest, gepflegt über Git-Tags/GitHub-Releases
- **Später (optional, sobald Veröffentlichung ansteht):** Release-Workflow, der bei einem neuen Tag automatisch die Store-tauglichen Zip-Dateien baut (WXT unterstützt das nativ) und als GitHub-Release-Artefakt bereitstellt

## 9. Lokales Testen (ohne Store-Veröffentlichung)

Diese Informationen sollen auch in der README.md dokumentiert werden, damit die Extension jederzeit unkompliziert lokal getestet werden kann:

- **Entwicklungsmodus:** `pnpm dev` startet über WXT automatisch einen Browser (standardmäßig Chrome) mit bereits geladener Extension inkl. Hot Reload bei Code-Änderungen – der schnellste Weg während der Entwicklung
- **Produktions-Build lokal testen (Chrome/Edge):** `pnpm build` ausführen, dann im Browser unter `chrome://extensions` bzw. `edge://extensions` den Entwicklermodus aktivieren und über "Entpackte Erweiterung laden" den jeweiligen Build-Ordner (z.B. `.output/chrome-mv3`) auswählen
- **Produktions-Build lokal testen (Firefox):** In Firefox zu `about:debugging#/runtime/this-firefox` navigieren, "Temporäres Add-on laden" wählen und die `manifest.json` im Firefox-Build-Ordner (z.B. `.output/firefox-mv2`) auswählen (Hinweis: Temporäre Add-ons werden bei Firefox-Neustart entfernt und müssen erneut geladen werden)
- **Browserspezifische Builds erzeugen:** `wxt build -b chrome`, `wxt build -b firefox`, `wxt build -b edge`, um für jeden Zielbrowser separat zu testen
- **Debugging:**
  - Popup: Rechtsklick im geöffneten Popup → "Untersuchen"
  - Background Service Worker: in `chrome://extensions` bei der Extension auf "Service Worker" klicken
  - Content-Script: reguläre Seiten-DevTools verwenden (Ausgaben erscheinen dort in der Konsole)

## 10. Claude Skills für dieses Projekt

Begleitend zu diesem Konzept-Dokument gibt es ein separates Bundle (`claude-skills.zip`) mit vier Claude-Skills, welche die wichtigsten Konventionen aus diesem Dokument als eigenständige, zuverlässig getriggerte Regeln kapseln:

- **`coding-conventions`** – Sprache (Englisch im Code), Clean Code, Projektstruktur (Abschnitte 6 & 7.1)
- **`accessibility-wcag`** – WCAG 2.2 AA (Abschnitt 7.2)
- **`privacy-and-security`** – DSGVO & Security (Abschnitte 7.3 & 7.4)
- **`git-workflow`** – Commits, Branching, CI, Versionierung (Abschnitt 8)

**Anwendung:** Den Inhalt des ZIPs (Ordner `.claude/skills/`) direkt ins Root-Verzeichnis des neuen Projekts entpacken. Claude Code erkennt Skills darüber automatisch anhand ihrer Beschreibung und zieht sie situationsabhängig heran (z.B. beim Schreiben von UI-Code automatisch die Accessibility-Regeln, bei Commits automatisch die Git-Konventionen) – unabhängig davon, ob sie im aktuellen Gesprächskontext gerade "präsent" sind.

## 11. Mögliche spätere Erweiterungen (nicht Teil des ersten Wurfs)

- Sortierung nach Datum/Preis
- Preis-Beobachtung/Änderungserkennung
- Cloud-Sync/Account (optional, später)
- Mobile Companion App
- Weitere Oberflächensprachen – die Struktur aus 6.3 ist darauf ausgelegt: pro Sprache genügen eine zusätzliche Katalogdatei unter `src/i18n/` und ein `_locales`-Ordner für den Store-Eintrag

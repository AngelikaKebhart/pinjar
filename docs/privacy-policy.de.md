# Datenschutzerklärung für PinJar

[This policy in English](privacy-policy.md)

**Stand:** 1. September 2026

PinJar ist eine Browser-Erweiterung zum Speichern und Wiederfinden von Links. Alle Daten, die dabei
entstehen, verbleiben im lokalen Speicher deines Browsers auf deinem Gerät.

Es gibt kein Nutzerkonto, keinen Server, keine Synchronisierung, kein Tracking und keine Analyse.
Eine Übermittlung an mich als Anbieterin oder an Dritte findet nicht statt und ist technisch nicht
vorgesehen.

Diese Erklärung führt das im Einzelnen aus, einschließlich des einzigen Netzwerkzugriffs, den die
Erweiterung verursacht.

## Verantwortliche

Angelika Kebhart
E-Mail: pinjar@kebhart.net

## Welche Daten PinJar speichert

Alle Daten werden in den lokalen Speicher der Erweiterung geschrieben (`storage.local`). Dieser
liegt in deinem Browserprofil auf deinem Gerät. Er ist nicht Teil der Synchronisierung deines
Browserkontos und wird daher nicht auf deine anderen Geräte übertragen.

Zu jedem gespeicherten Pin:

| Daten                           | Herkunft                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| Adresse der Seite (URL)         | die Seite, auf der du dich beim Speichern befunden hast              |
| Domain                          | aus der Adresse abgeleitet, als Grundlage für die Anzeige am Symbol  |
| Titel der Seite                 | `og:title` der Seite oder ihr `<title>`, von dir änderbar            |
| Adresse des Vorschaubilds (URL) | `og:image` oder `twitter:image` der Seite, sofern vorhanden          |
| Kategorie, Schlagwörter, Status | deine eigene Eingabe                                                 |
| Notiz                           | deine eigene Eingabe                                                 |
| Datum von Anlage und Änderung   | von der Erweiterung gesetzt                                          |

Getrennt von den Pins speichert PinJar die Kategorien, Schlagwörter und Status, die du bereits
verwendet hast, um sie dir erneut anbieten zu können, sowie deine beiden Einstellungen zur
Oberfläche: Sprache und helles oder dunkles Erscheinungsbild. Gespeichert wird dabei ausschließlich
deine Auswahl — keine erkannte Sprache, kein aufgelöstes Erscheinungsbild und keine Zeitstempel.

## Welche Daten PinJar nicht erhebt

- Kein Konto, keine Registrierung, keine E-Mail-Adresse, keinen Namen.
- Keine Analyse, keine Telemetrie, keine Absturzberichte, keine Nutzungsstatistik.
- Keine Cookies, keine Werbekennungen, keinen Geräte-Fingerabdruck.
- Keinen Browserverlauf. Gespeichert werden ausschließlich Seiten, bei denen du aktiv auf Speichern
  geklickt hast.
- Keine Inhalte der von dir besuchten Seiten über den oben genannten Titel und die Adresse des
  Vorschaubilds hinaus.

Deine Daten werden nicht verkauft, nicht an Dritte weitergegeben und nicht für Werbezwecke
verwendet.

## Netzwerkzugriff

Vorschaubilder werden als Adresse gespeichert, nicht als Bilddaten. Beim Öffnen des Dashboards lädt
dein Browser diese Bilder daher von den Websites, von denen sie stammen — wie bei jeder anderen
Webseite auch.

Diesen Websites werden dabei deine IP-Adresse und der Zeitpunkt des Abrufs bekannt. Der Zugriff ist
so weit wie möglich eingeschränkt:

- Es werden keine von PinJar gespeicherten Daten übertragen. Es handelt sich um eine gewöhnliche
  Bildanfrage, die keine deiner Daten enthält.
- Anfragen ergehen ausschließlich an Websites, von denen du bewusst einen Pin gespeichert hast.
- Sie werden ohne Referrer gesendet; die Website erfährt somit nicht, aus welchem Zusammenhang die
  Anfrage stammt.
- Sie erfolgen nur für Bilder, die in den sichtbaren Bereich oder in dessen Nähe gescrollt werden.

Dies ist der einzige Netzwerkzugriff, den PinJar verursacht. Die Erweiterung lädt keinen Code aus
dem Internet nach, kontaktiert keinen Übersetzungsdienst und verfügt über kein eigenes Backend.

## Berechtigungen und ihr Zweck

| Berechtigung | Zweck                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| `storage`    | Aufbewahrung deiner Pins auf diesem Gerät                                               |
| `activeTab`  | Auslesen von Titel und Vorschaubild einer Seite — nur wenn du dort auf Speichern klickst |
| `scripting`  | Ausführung dieses einen, ausschließlich lesenden Vorgangs in der zu speichernden Seite   |
| `tabs`       | Auslesen der Adresse offener Tabs, um die auf der Website gespeicherten Pins zu zählen   |

PinJar fordert **keine Host-Berechtigung** an und hat daher keinen dauerhaften Zugriff auf die
Inhalte der von dir besuchten Websites.

`tabs` ist die Berechtigung mit den sichtbarsten Auswirkungen: Browser weisen sie bei der
Installation als _„deinen Browserverlauf lesen"_ aus, da sie der Erweiterung erlaubt, die Adressen
deiner offenen Tabs zu lesen. Sie ist Voraussetzung für die Anzeige am Symbol. Diese Adressen werden
im Arbeitsspeicher mit den Domains verglichen, zu denen du Pins gespeichert hast, um daraus die
angezeigte Anzahl zu ermitteln. Sie werden nicht gespeichert, nicht protokolliert und nicht
übermittelt.

Das Auslesen einer Seite beim Speichern ist ein einzelner, ausschließlich lesender Vorgang: Er
wertet die Meta-Tags der Seite und ihren Dokumenttitel aus, sonst nichts.

## Rechtsgrundlage

Die Daten entstehen ausschließlich auf deinem Gerät und werden nirgendwo sonst verarbeitet. Soweit
die DSGVO darauf anwendbar ist, ist Art. 6 Abs. 1 lit. b DSGVO die Rechtsgrundlage: Einen Pin zu
speichern ist genau die Leistung, für die du die Erweiterung installiert und im Einzelfall auf
Speichern geklickt hast. Ohne sie hätte die Erweiterung keinen Zweck.

Eine automatisierte Entscheidungsfindung oder ein Profiling findet nicht statt.

## Speicherdauer und Löschung

PinJar löscht keine Daten selbsttätig. Deine Daten bleiben gespeichert, bis du sie entfernst — auf
einem dieser Wege:

- **Einen einzelnen Pin löschen** — im Popup oder im Dashboard.
- **Alle Daten auf einmal löschen** — Dashboard, _Verwalten_ → Daten-Dialog → alle Daten löschen.
- **Die Erweiterung deinstallieren** — der Browser entfernt ihren lokalen Speicher dabei mit.

Du kannst außerdem jederzeit **alle Daten als JSON-Datei exportieren** und in einem anderen Browser
wieder importieren. Diese Datei ist unverschlüsselter Klartext und enthält deine Notizen im
Wortlaut. Bewahre sie entsprechend sorgfältig auf und gib sie nur bewusst weiter.

## Deine Rechte

Nach der DSGVO stehen dir das Recht auf Auskunft über deine Daten sowie die Rechte auf
Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch zu.

Diese Rechte übst du in der Erweiterung selbst aus, denn ich habe keinen Zugriff auf deine Daten und
könnte auf eine Anfrage nichts herausgeben: Auskunft und Datenübertragbarkeit über den Export,
Berichtigung durch das Bearbeiten eines Pins, Löschung durch das Entfernen einzelner Pins oder aller
Daten auf einmal. Die Wege dorthin stehen oben unter _Speicherdauer und Löschung_.

Wenn du darüber hinaus Fragen zur Verarbeitung deiner Daten hast, kannst du dich jederzeit an die
oben genannte Adresse wenden.

Unabhängig davon steht dir jederzeit das Recht auf Beschwerde bei einer Aufsichtsbehörde zu.
Zuständig ist die Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Wien,
dsb@dsb.gv.at.

## Änderungen dieser Erklärung

Ändert sich, welche Daten PinJar speichert oder verarbeitet, wird diese Erklärung mit derselben
Änderung angepasst; das Datum am Anfang nennt den jeweiligen Stand. Ihre Versionsgeschichte ist im
öffentlichen Repository des Projekts einsehbar, jede Änderung dort nachvollziehbar.

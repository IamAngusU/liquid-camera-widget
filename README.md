# LumaDrop

LumaDrop ist ein schwebendes Kamera-Widget für Windows und macOS. Ein iPhone
liefert das Bild drahtlos per WebRTC; das Desktop-Fenster kann als Kreis,
Squircle, weiches Rechteck oder lebendiger Blob dargestellt werden.

## Was bereits funktioniert

- iPhone-Kamera per QR-Code koppeln
- verschlüsselter WebRTC-Stream direkt zwischen iPhone und Computer
- Formwechsel: Squircle, Kreis, Soft Rectangle und Liquid Blob
- Formate: 1:1, 3:2, 4:3, 16:9 und 9:16
- rahmenloses, transparentes Electron-Fenster
- optional immer im Vordergrund
- gespiegeltes Kamerabild
- federnd geglättetes Motiv-Tracking: Face Detection, wenn verfügbar, sonst
  lokale Bewegungserkennung
- iPhone-Wechsel zwischen Front- und Rückkamera
- Rücksicht auf `prefers-reduced-motion`

## Neu in 0.2: Aufnehmen und übertragen

- **Mediathek:** ein oder mehrere JPEG/PNG/WebP/HEIC-Dateien unverändert zum Empfänger senden. Auch „Nur Fotos verbinden“ ohne Kamerazugriff. Bis 30 Dateien pro Auswahl, je 32 MB. Serieller 48-KiB-Transfer mit Bestätigung, SHA-256-Prüfung und separater Empfangsbestätigung. Verbindungs-/Speicherfehler werden nicht als Erfolg gemeldet; keine automatische Wiederholung mit Duplikaten.
- **Jetzt Foto aufnehmen:** `ImageCapture.takePhoto()` wenn vorhanden; sonst transparent gekennzeichnetes Videobild. **Kamera-App · Originalfoto** bietet zusätzlich den nativen `capture=environment`-Fotoeingang. Safari bestimmt die genaue Oberfläche. Ein Videoframe ersetzt kein hochauflösendes Originalfoto.
- **Taschenlampe und Kamera-Zoom:** `getCapabilities()` entscheidet, ob Bedienelemente freigegeben sind. Nicht jeder Browser/iPhone-Modus unterstützt diese Funktionen. Keine nachgeahmte „Taschenlampe“, die lediglich den Bildschirm heller macht. Quellen: [MediaTrackConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints), [takePhoto](https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture/takePhoto).
- **Fernbedienung:** erst nach sichtbarer Freigabe am Sender. Dann darf der gekoppelte Computer Licht/Zoom ändern und ein Foto auslösen. Die Mediathek bleibt ausschließlich eine lokale Benutzerauswahl.
- **Ansichtszoom:** 1-4× am Sender und Widget, getrennt vom Kamera-Zoom. Vergrößert nur die Ansicht, verändert keine übertragenen Originaldateien und verbessert keine Messauflösung.
- **Vorschau:** 30 FPS Standardwunsch, 15/30/60 wählbar. Angezeigt werden die Kameratrack-Einstellungen, nicht garantierte Empfangs-FPS. 60 FPS nur, soweit Gerät/Browser es erfüllen; mehr FPS ersetzen kein scharfes Foto.
- **Keyring-Modus:** `#/send?to=PEER&mode=keyring` startet mit Rückkamera und überträgt A/B/Kante/Detail sowie Spitzenrichtung. Keine automatische Spiegelung oder Vermischung verschiedener Seiten.

Das normale Widget hält empfangene Fotos **nur im Arbeitsspeicher** (höchstens 30 Fotos / 96 MB): vor dem Schließen über die sichtbaren Links herunterladen. Ein angeschlossener Keyring-Empfänger bestätigt dagegen nach Speicherung im lokalen Archiv. Der erste verbundene Peer bindet die Sitzung; neue Kopplung durch Neuladen. Kopplungscode wie einen temporären Zugang behandeln.

Getestet: Build/TypeScript, zehn automatisierte Tests, echte Browser-zu-Browser-Übertragung zweier synthetischer PNGs nach Keyring mit Empfangsbestätigung und responsives Layout. Torch, echte Objektiv-/Sensorzoom-Stufen und Kamera-App-Rückkehr müssen noch am echten iPhone geprüft werden.

`npm audit --omit=dev` meldete beim Update keine Produktionsabhängigkeits-Funde. Die vorhandene Desktop-/Build-Toolchain meldet weiterhin 30 Audit-Funde; kein blindes `audit fix --force`, keine Behauptung einer Security-Freigabe. Ein neuer nativer Installer gehört nicht zu diesem Web-Update.

## Schnellstart

Voraussetzungen: Node.js 20 oder neuer und npm.

```powershell
npm install
npm run dev:desktop
```

Im Widget erscheint ein QR-Code. Diesen mit der iPhone-Kamera scannen, den Link
in Safari öffnen und **Kamera verbinden** wählen.

Für eine reine Browser-Vorschau:

```powershell
npm run dev
```

Für einen Windows-Installer:

```powershell
npm run build:desktop
```

Das Ergebnis liegt anschließend unter `release/`.

## Verbindung

```text
iPhone Safari ── verschlüsseltes WebRTC ── LumaDrop Desktop
       │                                      │
       └──── PeerJS-Signalisierung ───────────┘
```

PeerJS vermittelt nur die Kopplung. Das Kamerabild wird nicht auf einem
LumaDrop-Server gespeichert. Ohne TURN-Relay bleibt das Video Peer-to-Peer;
in stark eingeschränkten Firmennetzen kann die Verbindung deshalb scheitern.

Der iPhone-Sender wird über GitHub Pages ausgeliefert, weil Safari Kamerazugriff
nur in einem sicheren HTTPS-Kontext erlaubt. In der Desktop-App kann eine andere
Adresse über `VITE_SENDER_URL` gesetzt werden.

Der geprüfte Web-Build liegt im Branch `gh-pages`. Nach Änderungen wird er ohne
GitHub Actions direkt aktualisiert:

```powershell
npm run deploy:pages
```

## Warum WLAN statt Bluetooth?

Bluetooth ist für einen hochauflösenden, latenzarmen Videostream nicht geeignet
und Web Bluetooth wird von Safari auf iOS nicht angeboten. LumaDrop verwendet
daher WLAN/WebRTC für Video. Bluetooth kann später ergänzend für Steuerbefehle
oder Discovery dienen, ist aber nicht Teil des aktuellen Prototyps.

## Datenschutz

- kein Konto innerhalb von LumaDrop
- keine serverseitige Videoaufzeichnung; Fotos werden nur nach Auswahl/Auslösung per WebRTC zum gekoppelten Empfänger übertragen
- Kamera wird erst nach einer sichtbaren Aktion auf dem iPhone geöffnet
- Video- und Audiostreams enthalten nur Video; Audio ist deaktiviert
- beim Schließen der Sender-Seite werden Kameratracks beendet

## Struktur

- `electron/` – transparentes Desktop-Fenster und native Fensteraktionen
- `src/components/CameraWidget.tsx` – Empfänger, Formen und Bedienung
- `src/components/MobileSender.tsx` – iPhone-Sender
- `src/hooks/useAdaptiveFocus.ts` – Face-/Motion-Fokus und Federbewegung
- `.github/workflows/pages.yml` – HTTPS-Deployment des iPhone-Senders

## Lizenz

MIT

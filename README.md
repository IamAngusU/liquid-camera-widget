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
- Qualitäts-Toggle auf dem iPhone: volle Qualität bevorzugt bis zu 4K/60,
  50 Mbit/s und `maintain-resolution`; Balanced priorisiert Verbindungsstabilität
- Rücksicht auf `prefers-reduced-motion`

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
- kein eigener Video-Upload oder Recording-Code
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

import { QRCodeSVG } from "qrcode.react";
import { CameraIcon, CopyIcon } from "./Icons";

interface PairingPanelProps {
  pairingUrl: string;
  peerId: string;
  status: "starting" | "ready" | "connecting" | "live" | "error";
  error?: string;
}

export function PairingPanel({ pairingUrl, peerId, status, error }: PairingPanelProps) {
  const copyLink = async () => {
    if (!pairingUrl) return;
    await navigator.clipboard?.writeText(pairingUrl);
  };

  return (
    <div className="pairing-panel">
      <div className="pairing-mark" aria-hidden="true">
        <CameraIcon />
        <span />
      </div>

      <div className="pairing-copy">
        <h1>{status === "error" ? "Verbindung pausiert" : "iPhone koppeln"}</h1>
        <p>
          {status === "starting" && "Sicherer Raum wird vorbereitet …"}
          {status === "ready" && "QR-Code mit der iPhone-Kamera scannen, dann in Safari öffnen."}
          {status === "connecting" && "Kamera wird verbunden …"}
          {status === "error" && (error ?? "Verbindung konnte nicht aufgebaut werden.")}
        </p>
      </div>

      {pairingUrl && status !== "error" && (
        <div className="qr-shell" aria-label="QR-Code zum Verbinden des iPhones">
          <QRCodeSVG
            value={pairingUrl}
            size={118}
            level="M"
            bgColor="#f7f9fc"
            fgColor="#10131a"
            marginSize={1}
          />
          <button className="copy-link" onClick={copyLink} title="Kopplungslink kopieren">
            <CopyIcon />
            <span>Link kopieren</span>
          </button>
        </div>
      )}

      {peerId && <span className="room-code">{peerId.slice(0, 4)} · {peerId.slice(-4)}</span>}
    </div>
  );
}

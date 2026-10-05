import Peer, { type MediaConnection } from "peerjs";
import { FormEvent, useEffect, useRef, useState } from "react";
import { readTargetPeer } from "../lib/constants";
import { CameraIcon, RotateCameraIcon } from "./Icons";

type SenderStatus = "idle" | "requesting" | "connecting" | "live" | "error";
type FacingMode = "user" | "environment";

export function MobileSender() {
  const [target, setTarget] = useState(() => readTargetPeer(window.location.hash));
  const [status, setStatus] = useState<SenderStatus>("idle");
  const [facing, setFacing] = useState<FacingMode>("user");
  const [error, setError] = useState("");
  const localVideo = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer>();
  const callRef = useRef<MediaConnection>();
  const streamRef = useRef<MediaStream>();

  useEffect(() => {
    return () => {
      callRef.current?.close();
      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const getCamera = async (nextFacing: FacingMode) => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Safari benötigt für die Kamera eine sichere HTTPS-Verbindung.");
    }

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: nextFacing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60, max: 60 }
      }
    });
  };

  const callDesktop = (peer: Peer, media: MediaStream) => {
    callRef.current?.close();
    setStatus("connecting");
    const call = peer.call(target.trim(), media, {
      metadata: { source: "iPhone", facing }
    });
    callRef.current = call;
    call.on("stream", () => setStatus("live"));
    call.on("close", () => setStatus("idle"));
    call.on("error", () => {
      setStatus("error");
      setError("Die Verbindung wurde unterbrochen. Das Widget am Computer erneut öffnen.");
    });

    // A one-way call does not always emit a remote stream. Once WebRTC is connected,
    // the peer connection state is the reliable signal for the sender UI.
    const connection = call.peerConnection;
    connection?.addEventListener("connectionstatechange", () => {
      if (connection.connectionState === "connected") setStatus("live");
      if (["failed", "closed", "disconnected"].includes(connection.connectionState)) {
        setStatus("error");
        setError("Der Kamerastream hat die Verbindung verloren.");
      }
    });
  };

  const connect = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!target.trim()) {
      setError("Bitte den Kopplungscode aus LumaDrop eingeben.");
      setStatus("error");
      return;
    }

    setStatus("requesting");
    setError("");
    try {
      const media = await getCamera(facing);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = media;
      if (localVideo.current) {
        localVideo.current.srcObject = media;
        await localVideo.current.play();
      }

      const existingPeer = peerRef.current;
      if (existingPeer?.open) {
        callDesktop(existingPeer, media);
        return;
      }

      existingPeer?.destroy();
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" }
          ]
        }
      });
      peerRef.current = peer;
      peer.on("open", () => callDesktop(peer, media));
      peer.on("error", (peerError) => {
        setStatus("error");
        setError(
          peerError.type === "peer-unavailable"
            ? "Das Widget ist nicht erreichbar. Prüfe den Code und ob es geöffnet ist."
            : "Die Kopplung ist fehlgeschlagen. Bitte erneut versuchen."
        );
      });
    } catch (cameraError) {
      setStatus("error");
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "Safari konnte die iPhone-Kamera nicht öffnen."
      );
    }
  };

  const switchCamera = async () => {
    const nextFacing = facing === "user" ? "environment" : "user";
    setFacing(nextFacing);
    setStatus("requesting");
    try {
      const media = await getCamera(nextFacing);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = media;
      if (localVideo.current) {
        localVideo.current.srcObject = media;
        await localVideo.current.play();
      }
      if (peerRef.current?.open) callDesktop(peerRef.current, media);
    } catch {
      setStatus("error");
      setError("Die andere iPhone-Kamera konnte nicht geöffnet werden.");
    }
  };

  const connected = status === "live" || status === "connecting";

  return (
    <main className="sender-shell" data-status={status}>
      <video
        ref={localVideo}
        className="sender-preview"
        data-facing={facing}
        autoPlay
        playsInline
        muted
      />
      <div className="sender-scrim" />

      <header className="sender-header">
        <div className="sender-brand">
          <span className="sender-orb" />
          LumaDrop
        </div>
        {connected && (
          <div className="sender-live">
            <span />
            {status === "live" ? "verbunden" : "wird verbunden"}
          </div>
        )}
      </header>

      {connected ? (
        <div className="sender-connected">
          <button onClick={switchCamera} className="camera-switch">
            <RotateCameraIcon />
            Kamera wechseln
          </button>
          <p>Safari geöffnet lassen, während du LumaDrop verwendest.</p>
        </div>
      ) : (
        <form className="sender-connect" onSubmit={connect}>
          <div className="sender-camera-mark">
            <CameraIcon />
          </div>
          <h1>iPhone als Kamera</h1>
          <p>Der Stream läuft verschlüsselt direkt zu deinem LumaDrop-Widget.</p>

          {!readTargetPeer(window.location.hash) && (
            <label>
              Kopplungscode
              <input
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Code vom Computer"
              />
            </label>
          )}

          {error && <div className="sender-error">{error}</div>}

          <button className="connect-button" type="submit" disabled={status === "requesting"}>
            {status === "requesting" ? "Kamera wird geöffnet …" : "Kamera verbinden"}
          </button>
          <small>Safari fragt einmalig nach Kamerazugriff.</small>
        </form>
      )}
    </main>
  );
}

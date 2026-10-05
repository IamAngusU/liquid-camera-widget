import Peer, { type MediaConnection } from "peerjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdaptiveFocus } from "../hooks/useAdaptiveFocus";
import {
  ASPECTS,
  buildSenderUrl,
  type AspectId,
  type ShapeId
} from "../lib/constants";
import { ControlDock } from "./ControlDock";
import { CloseIcon, MinusIcon, PinIcon } from "./Icons";
import { PairingPanel } from "./PairingPanel";

type ConnectionStatus = "starting" | "ready" | "connecting" | "live" | "error";

export function CameraWidget() {
  const [shape, setShape] = useState<ShapeId>("blob");
  const [aspect, setAspect] = useState<AspectId>("square");
  const [adaptive, setAdaptive] = useState(true);
  const [mirrored, setMirrored] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [peerId, setPeerId] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("starting");
  const [error, setError] = useState<string>();
  const [stream, setStream] = useState<MediaStream>();
  const [controlsVisible, setControlsVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number>();
  const activeCall = useRef<MediaConnection>();
  const focusMode = useAdaptiveFocus(videoRef, surfaceRef, adaptive && Boolean(stream));
  const activeRatio = ASPECTS.find((item) => item.id === aspect)?.ratio ?? 1;

  const pairingUrl = useMemo(() => {
    if (!peerId) return "";
    const configured = import.meta.env.VITE_SENDER_URL as string | undefined;
    const localWebUrl = window.luma ? undefined : `${window.location.origin}${window.location.pathname}`;
    return buildSenderUrl(peerId, configured ?? localWebUrl);
  }, [peerId]);

  useEffect(() => {
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      }
    });

    peer.on("open", (id) => {
      setPeerId(id);
      setStatus("ready");
      setError(undefined);
    });

    peer.on("call", (call) => {
      activeCall.current?.close();
      activeCall.current = call;
      setStatus("connecting");
      call.answer();
      call.on("stream", (remoteStream) => {
        setStream(remoteStream);
        setStatus("live");
        setError(undefined);
      });
      call.on("close", () => {
        setStream(undefined);
        setStatus("ready");
      });
      call.on("error", () => {
        setStream(undefined);
        setStatus("error");
        setError("Der Kamerastream wurde unterbrochen. QR-Code erneut scannen.");
      });
    });

    peer.on("disconnected", () => setStatus("starting"));
    peer.on("error", (peerError) => {
      setStatus("error");
      setError(
        peerError.type === "peer-unavailable"
          ? "Das iPhone findet dieses Widget nicht mehr. Bitte neu koppeln."
          : "Der Kopplungsdienst ist gerade nicht erreichbar."
      );
    });

    return () => {
      activeCall.current?.close();
      peer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => undefined);
  }, [stream]);

  useEffect(() => {
    if (!stream) {
      setControlsVisible(true);
      return;
    }
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2600);
    return () => window.clearTimeout(hideTimer.current);
  }, [stream]);

  const revealControls = () => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    if (stream) hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2600);
  };

  const changeAspect = (nextAspect: AspectId) => {
    setAspect(nextAspect);
    const ratio = ASPECTS.find((item) => item.id === nextAspect)?.ratio ?? 1;
    void window.luma?.setAspectRatio(ratio);
  };

  const changeShape = (nextShape: ShapeId) => {
    setShape(nextShape);
    if (nextShape === "circle" && aspect !== "square") changeAspect("square");
  };

  const togglePin = async () => {
    const next = !pinned;
    setPinned(next);
    await window.luma?.setAlwaysOnTop(next);
  };

  return (
    <main
      className="widget-shell"
      style={{ aspectRatio: activeRatio }}
      data-shape={shape}
      data-controls={controlsVisible}
      data-streaming={Boolean(stream)}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
    >
      <div className="spectral-shadow" aria-hidden="true" />
      <section className="camera-surface" ref={surfaceRef}>
        <video
          ref={videoRef}
          className="camera-video"
          data-mirrored={mirrored}
          autoPlay
          playsInline
          muted
        />

        {!stream && (
          <PairingPanel pairingUrl={pairingUrl} peerId={peerId} status={status} error={error} />
        )}

        {stream && <div className="lens-vignette" aria-hidden="true" />}
        {stream && adaptive && (
          <span className="focus-glint" data-mode={focusMode} aria-hidden="true" />
        )}
      </section>

      <div className="window-bar" data-visible={controlsVisible}>
        <div className="live-chip" data-live={status === "live"}>
          <span />
          {status === "live" ? "live" : "LumaDrop"}
        </div>
        <div className="window-actions">
          <button
            data-active={pinned}
            onClick={togglePin}
            title="Immer im Vordergrund"
            aria-label="Immer im Vordergrund"
            aria-pressed={pinned}
          >
            <PinIcon />
          </button>
          <button onClick={() => window.luma?.minimize()} title="Minimieren" aria-label="Minimieren">
            <MinusIcon />
          </button>
          <button onClick={() => window.luma?.close()} title="Schließen" aria-label="Schließen">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="dock-wrap" data-visible={controlsVisible}>
        <ControlDock
          aspect={aspect}
          shape={shape}
          adaptive={adaptive}
          mirrored={mirrored}
          onAspectChange={changeAspect}
          onShapeChange={changeShape}
          onAdaptiveChange={setAdaptive}
          onMirrorChange={setMirrored}
        />
      </div>
    </main>
  );
}

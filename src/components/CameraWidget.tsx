import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { LABEL, receiveFiles } from "../lib/transfer.js";
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
  const [virtualZoom,setVirtualZoom]=useState(1);
  const [remote,setRemote]=useState<{remote?:boolean;torch?:boolean;zoom?:{min:number;max:number;step:number};settings?:{torch?:boolean;zoom?:number}}>({});
  const [photos,setPhotos]=useState<{url:string;name:string}[]>([]);
  const [transferStatus,setTransferStatus]=useState("");
  const dataLink=useRef<DataConnection>(),owner=useRef<string>(),received=useRef<{url:string;size:number}[]>([]);
  const disposeReceiver=useRef<()=>void>();
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

    peer.on("connection",connection=>{
      if(connection.label!==LABEL||(owner.current&&owner.current!==connection.peer)||dataLink.current?.open){connection.close();return;}
      owner.current=connection.peer;dataLink.current=connection;
      disposeReceiver.current?.();
      disposeReceiver.current=receiveFiles(connection,async(blob,info)=>{
        if(received.current.length>=30||received.current.reduce((n,f)=>n+f.size,0)+blob.size>96*1024*1024)throw new Error("Empfangsspeicher voll. Fotos speichern und Widget neu öffnen.");
        const url=URL.createObjectURL(blob);received.current.push({url,size:blob.size});
        setPhotos(items=>[...items,{url,name:info.name}]);
      },setTransferStatus);
      connection.on("data",raw=>{const m=raw as typeof remote & {type?:string;message?:string};if(m.type==="camera-state")setRemote(m);if(m.type==="camera-error")setTransferStatus(m.message??"Kamera-Befehl fehlgeschlagen");});
      connection.on("close",()=>{setRemote({});if(dataLink.current===connection)dataLink.current=undefined;});
    });
    peer.on("call", (call) => {
      if(owner.current&&owner.current!==call.peer){call.close();return;}
      owner.current=call.peer;
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
        if(activeCall.current!==call)return;
        activeCall.current=undefined;
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
      const previous=activeCall.current;activeCall.current=undefined;previous?.close();
      disposeReceiver.current?.();dataLink.current?.close();
      received.current.forEach(f=>URL.revokeObjectURL(f.url));received.current=[];
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
          style={{scale:`${virtualZoom}`}}
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
        <details className="widget-capture" onToggle={e=>{if(e.currentTarget.open){setControlsVisible(true);window.clearTimeout(hideTimer.current);}}}>
          <summary>Fotos & Kamera</summary>
          <label>Ansichtszoom {virtualZoom.toFixed(1)}×<input aria-label="Widget-Ansichtszoom" type="range" min="1" max="4" step=".1" value={virtualZoom} onChange={e=>setVirtualZoom(Number(e.target.value))}/></label>
          <p>Nur Anzeige; Originalfotos bleiben unverändert.</p>
          <button disabled={!remote.remote} onClick={()=>dataLink.current?.send({type:"camera-command",action:"capture"})}>Foto am Handy auslösen</button>
          <button disabled={!remote.remote||!remote.torch} onClick={()=>dataLink.current?.send({type:"camera-command",action:"torch",value:!remote.settings?.torch})}>Taschenlampe {remote.settings?.torch?"aus":"an"}</button>
          <label>Kamera-Zoom<input aria-label="Handy-Kamerazoom" type="range" min={remote.zoom?.min??1} max={remote.zoom?.max??1} step={remote.zoom?.step||.1} value={remote.settings?.zoom??1} disabled={!remote.remote||!remote.zoom} onChange={e=>dataLink.current?.send({type:"camera-command",action:"zoom",value:Number(e.target.value)})}/></label>
          {!remote.remote&&<p>Fernbedienung zuerst am Handy erlauben.</p>}
          <p role="status">{transferStatus}</p>
          {photos.length>0&&<p>Vor dem Schließen herunterladen. Fotos sind bisher nur im Arbeitsspeicher.</p>}
          {photos.map(photo=><a key={photo.url} href={photo.url} download={photo.name}>{photo.name} speichern</a>)}
        </details>
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

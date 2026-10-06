import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { useEffect, useRef, useState } from "react";
import { readTargetPeer } from "../lib/constants";
import { capabilities, cameraConstraint, capturePhoto, type CameraCaps } from "../lib/camera";
import { LABEL, sendFiles } from "../lib/transfer.js";

export function MobileSender() {
  const keyring = new URLSearchParams(location.hash.split("?")[1]).get("mode")==="keyring";
  const [target,setTarget]=useState(()=>readTargetPeer(location.hash));
  const [status,setStatus]=useState("idle"),[error,setError]=useState("");
  const [facing,setFacing]=useState<"user"|"environment">(keyring?"environment":"user");
  const [fps,setFps]=useState(30),[actual,setActual]=useState("");
  const [caps,setCaps]=useState<CameraCaps>({}),[torch,setTorch]=useState(false),[zoom,setZoom]=useState(1);
  const [virtualZoom,setVirtualZoom]=useState(1),[ready,setReady]=useState(false),[busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(""),[view,setView]=useState("front"),[direction,setDirection]=useState("right");
  const [remote,setRemote]=useState(false),[preview,setPreview]=useState(false);
  const video=useRef<HTMLVideoElement>(null),peer=useRef<Peer>(),call=useRef<MediaConnection>(),link=useRef<DataConnection>(),stream=useRef<MediaStream>();
  const remoteRef=useRef(false),busyRef=useRef(false),capturing=useRef(false),settings=useRef({view,direction});
  settings.current={view,direction};
  const snapRef=useRef<()=>Promise<void>>(async()=>{});

  function disconnect() {
    call.current?.close();link.current?.close();peer.current?.destroy();stream.current?.getTracks().forEach(t=>t.stop());
    call.current=undefined;link.current=undefined;peer.current=undefined;stream.current=undefined;
    setReady(false);setPreview(false);setStatus("idle");setCaps({});setTorch(false);setRemote(false);remoteRef.current=false;
  }
  useEffect(()=>()=>{call.current?.close();link.current?.close();peer.current?.destroy();stream.current?.getTracks().forEach(t=>t.stop());},[]);
  function advertise() {
    const track=stream.current?.getVideoTracks()[0],c=capabilities(track),s=track?.getSettings();
    setCaps(c);setActual(s?`${s.width} × ${s.height} · ${s.frameRate?.toFixed(1)??"?"} FPS`:"Nur Fotoübertragung");
    if(link.current?.open)link.current.send({type:"camera-state",remote:remoteRef.current,torch:c.torch===true,zoom:c.zoom??null,settings:s??{}});
  }
  async function change(setting:{torch?:boolean;zoom?:number}) {
    const track=stream.current?.getVideoTracks()[0];if(!track)throw new Error("Kamera nicht aktiv.");
    const supported=capabilities(track);
    if(setting.torch!==undefined&&!supported.torch)throw new Error("Taschenlampe wird von diesem Browser nicht freigegeben.");
    if(setting.zoom!==undefined&&(!supported.zoom||!Number.isFinite(setting.zoom)||setting.zoom<supported.zoom.min||setting.zoom>supported.zoom.max))throw new Error("Kamera-Zoom nicht verfügbar.");
    const state=await cameraConstraint(track,setting);
    setTorch(state.torch??false);setZoom(state.zoom??1);advertise();
  }
  function startCall(p:Peer,media:MediaStream,nextFacing:string) {
    const old=call.current;call.current=undefined;old?.close();
    const next=p.call(target.trim(),media,{metadata:{source:"LumaDrop",facing:nextFacing}});call.current=next;
    next.peerConnection?.addEventListener("connectionstatechange",()=>{if(call.current===next)setStatus(next.peerConnection.connectionState==="connected"?"live":"connecting");});
    next.on("close",()=>{if(call.current===next){call.current=undefined;setStatus("ready");}});
    next.on("error",e=>setError(e.message));
  }
  async function connect(withCamera=true) {
    if(!target.trim())return setError("Kopplungscode vom Computer eingeben.");
    if(!window.isSecureContext)return setError("Für Kamera und sichere Fotoübertragung HTTPS verwenden.");
    setError("");setStatus("connecting");
    try {
      if(withCamera)await startCamera(facing,false);
      if(peer.current?.open) {if(withCamera&&stream.current)startCall(peer.current,stream.current,facing);return;}
      peer.current?.destroy();
      const p=new Peer({config:{iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]}});peer.current=p;
      p.on("open",()=>{
        const channel=p.connect(target.trim(),{reliable:true,label:LABEL});link.current=channel;
        channel.on("open",()=>{setReady(true);setStatus("ready");advertise();});
        channel.on("close",()=>{setReady(false);setError("Dateikanal getrennt. Erneut verbinden.");});
        channel.on("error",e=>setError(e.message));
        channel.on("data",async(raw)=>{
          const m=raw as {type?:string;action?:string;value?:number|boolean};
          if(m.type!=="camera-command"||!remoteRef.current||busyRef.current)return;
          try {
            if(m.action==="torch"&&typeof m.value==="boolean")await change({torch:m.value});
            else if(m.action==="zoom"&&typeof m.value==="number")await change({zoom:m.value});
            else if(m.action==="capture")await snapRef.current();
          }catch(e){setError(String(e));channel.send({type:"camera-error",message:String(e)});}
        });
        if(stream.current)startCall(p,stream.current,facing);
      });
      p.on("error",e=>{setStatus("error");setError(e.type==="peer-unavailable"?"Empfänger nicht erreichbar. Kopplungscode prüfen.":e.message);});
    }catch(e){setStatus("error");setError(e instanceof Error?e.message:String(e));}
  }
  async function startCamera(nextFacing=facing,makeCall=true,nextFps=fps) {
    stream.current?.getTracks().forEach(t=>t.stop());setTorch(false);setZoom(1);
    try {
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:nextFacing},width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:nextFps,max:nextFps}}});
      stream.current=media;setPreview(true);setFacing(nextFacing);
      if(video.current){video.current.srcObject=media;await video.current.play();}
      advertise();if(makeCall&&peer.current?.open)startCall(peer.current,media,nextFacing);
    }catch(e){setPreview(false);setCaps({});throw e;}
  }
  async function transmit(files:File[],source:string) {
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError("");
    try {await sendFiles(link.current!,files,{view:settings.current.view,tip_direction:settings.current.direction,source},setProgress);}
    catch(e){setError(e instanceof Error?e.message:String(e));throw e;}
    finally{busyRef.current=false;setBusy(false);}
  }
  async function snapshot() {
    if(capturing.current||busyRef.current)return;
    capturing.current=true;
    try {
    const track=stream.current?.getVideoTracks()[0];if(!track||!video.current)throw new Error("Kamera zuerst starten.");
    const result=await capturePhoto(track,video.current);
    if(result.source==="video-frame")setProgress("Browser liefert nur ein Videobild. Für Originalauflösung „Kamera-App“ verwenden.");
    await transmit([result.file],result.source);
    if(result.source==="video-frame")setProgress("Videobild übertragen — kein hochauflösendes Originalfoto. Kamera-App für Details nutzen.");
    } finally {capturing.current=false;}
  }
  snapRef.current=snapshot;
  const act=(fn:()=>Promise<unknown>)=>void fn().catch(e=>setError(e instanceof Error?e.message:String(e)));

  return <main className="sender-shell" data-status={preview?"live":status}>
    <video ref={video} className="sender-preview" data-facing={facing} style={{transform:`scale(${facing==="user"?-virtualZoom:virtualZoom},${virtualZoom})`}} autoPlay playsInline muted />
    <div className="sender-scrim"/>
    <header className="sender-header"><div className="sender-brand"><span className="sender-orb"/>LumaDrop{keyring?" / Keyring":""}</div><span className="sender-live">{ready?"Dateikanal bereit":"Nicht verbunden"}</span></header>
    {!ready ? <form className="sender-connect" onSubmit={e=>{e.preventDefault();void connect();}}>
      <h1>Kamera & Originalfotos</h1><p>Vorschau streamen. Fotos einzeln oder gemeinsam direkt zum Computer senden.</p>
      <label>Kopplungscode<input value={target} onChange={e=>setTarget(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false}/></label>
      <button className="connect-button" disabled={status==="connecting"}>Kamera verbinden</button>
      <button type="button" className="sender-action" disabled={status==="connecting"} onClick={()=>void connect(false)}>Nur Fotos verbinden</button>
      {status==="connecting"&&<button type="button" className="sender-action" onClick={disconnect}>Verbindung abbrechen</button>}
      {error&&<p className="sender-error" role="alert">{error}</p>}
    </form> : <section className="sender-connected capture-console" aria-label="Aufnahmesteuerung">
      <p className="capture-telemetry">{actual}</p>
      <div className="capture-row"><label>Aufnahmeseite<select value={view} disabled={busy} onChange={e=>setView(e.target.value)}><option value="front">Vorderseite A</option><option value="back">Rückseite B</option><option value="edge">Kante</option><option value="detail">Detail</option></select></label><label>Spitze<select value={direction} disabled={busy} onChange={e=>setDirection(e.target.value)}><option value="right">Rechts</option><option value="left">Links</option><option value="unknown">Nicht zugeordnet</option></select></label></div>
      <div className="capture-row"><button className="sender-action" disabled={busy||!preview} onClick={()=>act(snapshot)}>Jetzt Foto aufnehmen</button><label className="sender-action">Mediathek · mehrere<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple disabled={busy} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value="";if(files.length)act(()=>transmit(files,"library"));}}/></label></div>
      <label className="sender-action">Kamera-App · Originalfoto<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value="";if(files.length)act(()=>transmit(files,"camera-original"));}}/></label>
      <details><summary>Licht, Zoom & Vorschau</summary>
        <div className="capture-row"><button className="sender-action" disabled={busy||!caps.torch} aria-pressed={torch} onClick={()=>act(()=>change({torch:!torch}))}>{caps.torch?`Taschenlampe ${torch?"aus":"an"}`:"Taschenlampe nicht freigegeben"}</button><button className="sender-action" disabled={busy} onClick={()=>act(()=>startCamera(preview?(facing==="user"?"environment":"user"):facing))}>{preview?"Kamera wechseln":"Vorschau starten"}</button></div>
        <label>Kamera-Zoom {zoom.toFixed(1)}× {caps.zoom?"":"· nicht freigegeben"}<input type="range" min={caps.zoom?.min??1} max={caps.zoom?.max??1} step={caps.zoom?.step||.1} value={zoom} disabled={busy||!caps.zoom} onChange={e=>act(()=>change({zoom:Number(e.target.value)}))}/></label>
        <label>Ansichtszoom {virtualZoom.toFixed(1)}× · ändert keine Fotopixel<input type="range" min="1" max="4" step=".1" value={virtualZoom} onChange={e=>setVirtualZoom(Number(e.target.value))}/></label>
        <label>Vorschau-FPS<select value={fps} disabled={busy} onChange={e=>{const n=Number(e.target.value);setFps(n);if(preview)act(()=>startCamera(facing,true,n));}}><option value="15">15 · sparsam</option><option value="30">30 · Standard</option><option value="60">60 · wenn unterstützt</option></select></label>
        <label className="remote-permission"><input type="checkbox" checked={remote} onChange={e=>{setRemote(e.target.checked);remoteRef.current=e.target.checked;advertise();}}/>Computer darf Licht, Zoom und Fotoauslöser bedienen</label>
        <p>Bei Reflexen Taschenlampe ausschalten. Safari muss geöffnet bleiben. Virtueller Zoom verbessert keine Messauflösung.</p>
      </details>
      {progress&&<p role="status">{progress}</p>}{error&&<p className="sender-error" role="alert">{error}</p>}
      <button className="sender-action" disabled={busy} onClick={disconnect}>Verbindung beenden</button>
    </section>}
  </main>;
}

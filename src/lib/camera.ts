export type CameraCaps = MediaTrackCapabilities & {torch?:boolean;zoom?:{min:number;max:number;step:number}};
export type CameraSettings = MediaTrackSettings & {torch?:boolean;zoom?:number};
export function capabilities(track?:MediaStreamTrack):CameraCaps {
  try{return track?.getCapabilities?.() ?? {};}catch{return {};}
}
export async function cameraConstraint(track:MediaStreamTrack,setting:{torch?:boolean;zoom?:number}) {
  await track.applyConstraints({advanced:[setting as MediaTrackConstraintSet]});
  return track.getSettings() as CameraSettings;
}
export async function capturePhoto(track:MediaStreamTrack,video:HTMLVideoElement):Promise<{file:File;source:string}> {
  const ctor=(window as unknown as {ImageCapture?:new(track:MediaStreamTrack)=>{takePhoto:()=>Promise<Blob>}}).ImageCapture;
  if(ctor) {
    try{const blob=await new ctor(track).takePhoto();return {file:new File([blob],`camera-${Date.now()}.${blob.type==="image/png"?"png":"jpg"}`,{type:blob.type}),source:"camera-original"};}catch{/* Explicitly labeled fallback, no claim of full-resolution capture. */}
  }
  if(!video.videoWidth)throw new Error("Noch kein Kamerabild verfügbar.");
  const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext("2d")!.drawImage(video,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Foto fehlgeschlagen")),"image/jpeg",.98));
  return {file:new File([blob],`video-frame-${Date.now()}.jpg`,{type:blob.type}),source:"video-frame"};
}

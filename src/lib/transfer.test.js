import {EventEmitter} from "node:events";
import {describe,it,expect,vi} from "vitest";
import {allowedPhoto,MAX_FILE,CHUNK,sendFiles,receiveFiles,digest} from "./transfer.js";
function links(){
  const a=new EventEmitter(),b=new EventEmitter();a.open=b.open=true;
  a.send=m=>queueMicrotask(()=>b.emit("data",structuredClone(m)));
  b.send=m=>queueMicrotask(()=>a.emit("data",structuredClone(m)));
  return [a,b];
}
describe("original photo transfer",()=>{
  it("accepts only bounded supported photo files",()=>{
    expect(allowedPhoto({name:"a.HEIC",type:"",size:10})).toBe(true);
    for(const f of [{name:"a.svg",type:"image/svg+xml",size:10},{name:"a.jpg",type:"image/jpeg",size:MAX_FILE+1},{name:"a.jpg",type:"image/jpeg",size:0}])expect(allowedPhoto(f)).toBe(false);
  });
  it("transfers multiple originals byte-exactly, with metadata",async()=>{
    const [sender,receiver]=links(),got=[];
    const dispose=receiveFiles(receiver,async(blob,info)=>got.push({bytes:await blob.arrayBuffer(),info}));
    const bytes=new Uint8Array(CHUNK*2+57).fill(137);
    await sendFiles(sender,[new File([bytes],"part.png",{type:"image/png"}),new File([bytes.slice(0,30)],"back.heic")],{view:"back",tip_direction:"right"});
    expect(new Uint8Array(got[0].bytes)).toEqual(bytes);expect(got).toHaveLength(2);expect(got[0].info.meta.view).toBe("back");dispose();
  });
  it("does not acknowledge until the receiver has persisted the file",async()=>{
    const [a,b]=links();let release;const gate=new Promise(r=>release=r);let entered;
    const waiting=new Promise(r=>entered=r),done=vi.fn();
    const dispose=receiveFiles(b,async()=>{entered();await gate;});
    const result=sendFiles(a,[new File(["pixel"],"a.png",{type:"image/png"})]).then(done);
    await waiting;expect(done).not.toHaveBeenCalled();release();await result;expect(done).toHaveBeenCalledOnce();dispose();
  });
  it("reports storage failures instead of claiming success",async()=>{
    const [a,b]=links();const dispose=receiveFiles(b,async()=>{throw new Error("disk full");});
    await expect(sendFiles(a,[new File(["bytes"],"a.jpg",{type:"image/jpeg"})])).rejects.toThrow("disk full");dispose();
  });
  it("rejects checksum corruption",async()=>{
    const [a,b]=links();const orig=a.send;a.send=m=>orig(m.type==="chunk"?{...m,bytes:new Uint8Array(m.bytes.byteLength).buffer}:m);
    const save=vi.fn(),dispose=receiveFiles(b,save);
    await expect(sendFiles(a,[new File(["bytes"],"a.png",{type:"image/png"})])).rejects.toThrow("Prüfsumme");expect(save).not.toHaveBeenCalled();dispose();
  });
  it("rejects out of sequence data and releases buffers",async()=>{
    const [a,b]=links(),messages=[];a.on("data",m=>messages.push(m));const dispose=receiveFiles(b,vi.fn());
    const bytes=new Uint8Array([1,2]).buffer;
    a.send({type:"begin",id:"x",name:"a.png",typeHint:"image/png",size:2,sha256:await digest(bytes)});
    await new Promise(r=>setTimeout(r,0));a.send({type:"chunk",id:"x",offset:1,bytes});
    await new Promise(r=>setTimeout(r,0));expect(messages.at(-1).type).toBe("error");dispose();
  });
});

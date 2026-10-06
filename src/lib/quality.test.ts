import {describe,it,expect,vi} from "vitest";
import type {MediaConnection} from "peerjs";
import {qualityConstraints,tuneOutgoingVideo} from "../components/MobileSender";
describe("preserved full quality and independent FPS",()=>{
  it("requests 4K or balanced resolution without overriding chosen FPS",()=>{
    expect(qualityConstraints(true,15)).toEqual({width:{ideal:3840},height:{ideal:2160},frameRate:{ideal:15,max:15}});
    expect(qualityConstraints(false,60)).toEqual({width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:60,max:60}});
  });
  it("retains the full-quality encoder policy",async()=>{
    const setter=vi.fn().mockResolvedValue(undefined);
    const sender={track:{kind:"video"},getParameters:()=>({encodings:[{}]}),setParameters:setter};
    const call={peerConnection:{getSenders:()=>[sender]}} as unknown as MediaConnection;
    await tuneOutgoingVideo(call,true,30);
    expect(setter).toHaveBeenLastCalledWith({encodings:[{maxBitrate:50_000_000,maxFramerate:30,scaleResolutionDownBy:1}],degradationPreference:"maintain-resolution"});
    await tuneOutgoingVideo(call,false,15);
    expect(setter.mock.lastCall?.[0].degradationPreference).toBe("balanced");
  });
  it("does not fail before a video sender exists",async()=>{
    await expect(tuneOutgoingVideo({peerConnection:{getSenders:()=>[]}} as unknown as MediaConnection,true,60)).resolves.toBeUndefined();
  });
});

import type { DataConnection } from "peerjs";
export const MAX_FILE: number;
export const CHUNK: number;
export const LABEL: string;
export function allowedPhoto(file: {name:string;type:string;size:number}): boolean;
export function digest(bytes: ArrayBuffer): Promise<string>;
export function sendFiles(link:DataConnection,files:File[],meta?:Record<string,string>,progress?:(message:string)=>void):Promise<void>;
export function receiveFiles(link:DataConnection,onFile:(blob:Blob,info:{name:string;sha256:string;meta:Record<string,string>})=>Promise<void>,onStatus?:(message:string)=>void):()=>void;

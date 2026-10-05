export type ShapeId = "squircle" | "circle" | "rounded" | "blob";
export type AspectId = "square" | "photo" | "classic" | "wide" | "portrait";

export interface AspectOption {
  id: AspectId;
  label: string;
  ratio: number;
}

export interface ShapeOption {
  id: ShapeId;
  label: string;
}

export const ASPECTS: AspectOption[] = [
  { id: "square", label: "1:1", ratio: 1 },
  { id: "photo", label: "3:2", ratio: 3 / 2 },
  { id: "classic", label: "4:3", ratio: 4 / 3 },
  { id: "wide", label: "16:9", ratio: 16 / 9 },
  { id: "portrait", label: "9:16", ratio: 9 / 16 }
];

export const SHAPES: ShapeOption[] = [
  { id: "squircle", label: "Squircle" },
  { id: "circle", label: "Kreis" },
  { id: "rounded", label: "Soft" },
  { id: "blob", label: "Blob" }
];

export const DEFAULT_SENDER_URL = "https://iamangusu.github.io/liquid-camera-widget/";

export function buildSenderUrl(peerId: string, baseUrl = DEFAULT_SENDER_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}#/send?to=${encodeURIComponent(peerId)}`;
}

export function readTargetPeer(hash: string): string {
  const query = hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get("to")?.trim() ?? "";
}

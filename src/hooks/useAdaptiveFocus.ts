import { RefObject, useEffect, useRef, useState } from "react";

type FocusMode = "face" | "motion" | "center";

interface FocusPoint {
  x: number;
  y: number;
}

interface FaceDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetectorLike;
}

function blobRadius(x: number, y: number): string {
  const horizontal = (x - 0.5) * 18;
  const vertical = (y - 0.5) * 16;
  const tl = 43 - horizontal - vertical;
  const tr = 49 + horizontal - vertical;
  const br = 45 + horizontal + vertical;
  const bl = 52 - horizontal + vertical;
  return `${tl}% ${tr}% ${br}% ${bl}% / ${tr}% ${bl}% ${tl}% ${br}%`;
}

export function useAdaptiveFocus(
  videoRef: RefObject<HTMLVideoElement>,
  surfaceRef: RefObject<HTMLElement>,
  enabled: boolean
): FocusMode {
  const [mode, setMode] = useState<FocusMode>("center");
  const target = useRef<FocusPoint>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const video = videoRef.current;
    const surface = surfaceRef.current;
    if (!video || !surface || !enabled) {
      target.current = { x: 0.5, y: 0.5 };
      surface?.style.setProperty("--focus-x", "50%");
      surface?.style.setProperty("--focus-y", "50%");
      surface?.style.setProperty("--blob-radius", blobRadius(0.5, 0.5));
      setMode("center");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 20;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let previous: Uint8ClampedArray | undefined;
    let animationFrame = 0;
    let lastSample = 0;
    let lastFaceScan = 0;
    let faceScanPending = false;
    let lastFaceFound = 0;
    let current = { x: 0.5, y: 0.5 };
    let velocity = { x: 0, y: 0 };
    let faceDetector: FaceDetectorLike | undefined;

    const FaceDetectorApi = (globalThis as typeof globalThis & {
      FaceDetector?: FaceDetectorConstructor;
    }).FaceDetector;

    if (FaceDetectorApi) {
      try {
        faceDetector = new FaceDetectorApi({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        faceDetector = undefined;
      }
    }

    const scanFace = async (now: number) => {
      if (!faceDetector || faceScanPending || now - lastFaceScan < 550) return;
      faceScanPending = true;
      lastFaceScan = now;
      try {
        const faces = await faceDetector.detect(video);
        const face = faces[0]?.boundingBox;
        if (face && video.videoWidth && video.videoHeight) {
          target.current = {
            x: Math.min(0.88, Math.max(0.12, (face.x + face.width / 2) / video.videoWidth)),
            y: Math.min(0.82, Math.max(0.12, (face.y + face.height / 2) / video.videoHeight))
          };
          lastFaceFound = performance.now();
          setMode("face");
        }
      } catch {
        faceDetector = undefined;
      } finally {
        faceScanPending = false;
      }
    };

    const scanMotion = (now: number) => {
      if (!context || now - lastSample < 120 || video.readyState < 2) return;
      lastSample = now;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      if (previous && now - lastFaceFound > 1200) {
        let total = 0;
        let weightedX = 0;
        let weightedY = 0;

        for (let y = 1; y < canvas.height - 1; y += 1) {
          for (let x = 1; x < canvas.width - 1; x += 1) {
            const index = (y * canvas.width + x) * 4;
            const difference =
              Math.abs(pixels[index] - previous[index]) +
              Math.abs(pixels[index + 1] - previous[index + 1]) +
              Math.abs(pixels[index + 2] - previous[index + 2]);
            const energy = Math.max(0, difference - 34);
            if (energy > 0) {
              total += energy;
              weightedX += energy * x;
              weightedY += energy * y;
            }
          }
        }

        if (total > 850) {
          target.current = {
            x: Math.min(0.86, Math.max(0.14, weightedX / total / canvas.width)),
            y: Math.min(0.82, Math.max(0.14, weightedY / total / canvas.height))
          };
          setMode("motion");
        } else {
          target.current.x += (0.5 - target.current.x) * 0.025;
          target.current.y += (0.5 - target.current.y) * 0.025;
        }
      }
      previous = new Uint8ClampedArray(pixels);
    };

    const animate = (now: number) => {
      void scanFace(now);
      scanMotion(now);

      const stiffness = 0.035;
      const damping = 0.82;
      velocity.x = (velocity.x + (target.current.x - current.x) * stiffness) * damping;
      velocity.y = (velocity.y + (target.current.y - current.y) * stiffness) * damping;
      current = { x: current.x + velocity.x, y: current.y + velocity.y };

      surface.style.setProperty("--focus-x", `${(current.x * 100).toFixed(2)}%`);
      surface.style.setProperty("--focus-y", `${(current.y * 100).toFixed(2)}%`);
      surface.style.setProperty("--focus-dx", `${((current.x - 0.5) * 14).toFixed(2)}px`);
      surface.style.setProperty("--focus-dy", `${((current.y - 0.5) * 12).toFixed(2)}px`);
      surface.style.setProperty("--blob-radius", blobRadius(current.x, current.y));
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [enabled, surfaceRef, videoRef]);

  return mode;
}

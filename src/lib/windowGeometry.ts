const MIN_EDGE = 280;
const MAX_LANDSCAPE_WIDTH = 620;
const MAX_PORTRAIT_HEIGHT = 680;

export interface ViewportSize {
  width: number;
  height: number;
}

export function sizeForRatio(
  ratio: number,
  workArea: ViewportSize = { width: 1440, height: 900 }
): ViewportSize {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError("ratio must be a positive finite number");
  }

  if (ratio < 0.8) {
    const height = Math.max(
      MIN_EDGE,
      Math.min(MAX_PORTRAIT_HEIGHT, Math.round(workArea.height * 0.72))
    );
    return { width: Math.round(height * ratio), height };
  }

  const width = Math.max(
    MIN_EDGE,
    Math.min(MAX_LANDSCAPE_WIDTH, Math.round(workArea.width * 0.38))
  );
  return { width, height: Math.round(width / ratio) };
}

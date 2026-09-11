/**
 * Pre-flight Image Ingestion Defense (STRESS-1 Defense)
 * Prevents tab crashes and OOM failures when handling 8K+ images on constrained devices.
 */

export interface PreflightResult {
  clampedWidth: number;
  clampedHeight: number;
  wasDownsampled: boolean;
  originalWidth: number;
  originalHeight: number;
  dataUrl?: string;
  imageData?: ImageData;
}

export const MAX_DIMENSION_LIMIT = 2048;

/**
 * Clamp image dimensions to safe memory limits (max 2048x2048).
 */
export function clampDimensions(
  width: number,
  height: number,
  maxLimit: number = MAX_DIMENSION_LIMIT
): { width: number; height: number; wasClamped: boolean } {
  if (width <= maxLimit && height <= maxLimit) {
    return { width, height, wasClamped: false };
  }

  const aspect = width / height;
  let targetW = width;
  let targetH = height;

  if (targetW > maxLimit) {
    targetW = maxLimit;
    targetH = Math.round(targetW / aspect);
  }

  if (targetH > maxLimit) {
    targetH = maxLimit;
    targetW = Math.round(targetH * aspect);
  }

  return {
    width: Math.max(1, targetW),
    height: Math.max(1, targetH),
    wasClamped: true,
  };
}

/**
 * Pre-flight downsample an HTMLImageElement or ImageBitmap onto an OffscreenCanvas.
 */
export async function preflightImageSource(
  source: HTMLImageElement | ImageBitmap,
  maxLimit: number = MAX_DIMENSION_LIMIT
): Promise<PreflightResult> {
  const origW = source.width;
  const origH = source.height;
  const { width: clampedW, height: clampedH, wasClamped } = clampDimensions(origW, origH, maxLimit);

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(clampedW, clampedH);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create OffscreenCanvas 2D context");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, clampedW, clampedH);
    const imageData = ctx.getImageData(0, 0, clampedW, clampedH);

    return {
      clampedWidth: clampedW,
      clampedHeight: clampedH,
      wasDownsampled: wasClamped,
      originalWidth: origW,
      originalHeight: origH,
      imageData,
    };
  }

  // Fallback for DOM Canvas
  const canvas = document.createElement("canvas");
  canvas.width = clampedW;
  canvas.height = clampedH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create Canvas 2D context");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, clampedW, clampedH);
  const imageData = ctx.getImageData(0, 0, clampedW, clampedH);

  return {
    clampedWidth: clampedW,
    clampedHeight: clampedH,
    wasDownsampled: wasClamped,
    originalWidth: origW,
    originalHeight: origH,
    dataUrl: canvas.toDataURL("image/png"),
    imageData,
  };
}

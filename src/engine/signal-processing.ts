import { BackgroundRemovalOptions } from "../contracts";

export interface SignalAdjustmentOptions {
  contrast?: number; // -100 to 100
  brightness?: number; // -100 to 100
  gamma?: number; // 0.1 to 3.0
  exposure?: number; // -100 to 100
  saturation?: number; // -100 to 100
  sharpness?: number; // 0 to 100
  invert?: boolean;
  edgeDetection?: boolean;
  edgeThreshold?: number; // 0 to 255
  bgRemoval?: BackgroundRemovalOptions;
}

/**
 * Stage 1 & 2: Color adjustments (exposure, saturation, contrast, brightness, gamma, invert)
 */
export function applyPixelSignalAdjustments(
  r: number,
  g: number,
  b: number,
  options: {
    contrast: number;
    brightness: number;
    gamma: number;
    exposure: number;
    saturation: number;
    invert: boolean;
  }
): { r: number; g: number; b: number; lum: number } {
  // 1. Exposure: scale RGB linearly
  let expMultiplier = 1.0;
  if (options.exposure > 0) {
    expMultiplier = 1.0 + (options.exposure / 100) * 2.0; // up to 3x
  } else if (options.exposure < 0) {
    expMultiplier = Math.max(0, 1.0 + options.exposure / 100);
  }
  let nr = Math.max(0, Math.min(255, r * expMultiplier));
  let ng = Math.max(0, Math.min(255, g * expMultiplier));
  let nb = Math.max(0, Math.min(255, b * expMultiplier));

  // 2. Saturation: interpolate towards luminance Y
  const sat = options.saturation;
  if (sat !== 0) {
    const lumBase = 0.299 * nr + 0.587 * ng + 0.114 * nb;
    const satFactor = sat >= 0 ? 1.0 + sat / 50 : Math.max(0, 1.0 + sat / 100);
    nr = Math.max(0, Math.min(255, lumBase + (nr - lumBase) * satFactor));
    ng = Math.max(0, Math.min(255, lumBase + (ng - lumBase) * satFactor));
    nb = Math.max(0, Math.min(255, lumBase + (nb - lumBase) * satFactor));
  }

  // 3. Contrast & Brightness on luminance
  let lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
  const c = Math.max(-100, Math.min(100, options.contrast));
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  lum = factor * (lum - 128) + 128;
  lum += Math.max(-100, Math.min(100, options.brightness));

  // 4. Gamma
  const invGamma = 1.0 / Math.max(0.1, Math.min(3.0, options.gamma));
  if (lum > 0) {
    lum = 255 * Math.pow(Math.min(255, lum) / 255, invGamma);
  } else {
    lum = 0;
  }
  lum = Math.max(0, Math.min(255, lum));

  // 5. Invert
  if (options.invert) {
    lum = 255 - lum;
    nr = 255 - nr;
    ng = 255 - ng;
    nb = 255 - nb;
  }

  return { r: nr, g: ng, b: nb, lum };
}

/**
 * Euclidean Color Distance
 */
export function getColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Sample corners to auto-detect background color (STRESS-3 Defense)
 */
export function sampleCornerColor(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  if (width <= 0 || height <= 0) return { r: 0, g: 0, b: 0 };
  const corners = [
    0, // top-left
    (width - 1) * 4, // top-right
    (height - 1) * width * 4, // bottom-left
    ((height - 1) * width + (width - 1)) * 4, // bottom-right
  ];

  let sumR = 0, sumG = 0, sumB = 0;
  for (const idx of corners) {
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
  }

  return {
    r: Math.round(sumR / 4),
    g: Math.round(sumG / 4),
    b: Math.round(sumB / 4),
  };
}

/**
 * Parse hex string to RGB
 */
export function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Compute background removal alpha mask (0 = background, 255 = foreground)
 */
export function computeBackgroundRemovalMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  bgOptions?: BackgroundRemovalOptions
): Uint8Array {
  const mask = new Uint8Array(width * height);
  if (!bgOptions || !bgOptions.enabled) {
    mask.fill(255);
    return mask;
  }

  let targetR = 0;
  let targetG = 0;
  let targetB = 0;

  if (bgOptions.targetColor === "white") {
    targetR = 255; targetG = 255; targetB = 255;
  } else if (bgOptions.targetColor === "black") {
    targetR = 0; targetG = 0; targetB = 0;
  } else if (bgOptions.targetColor === "custom") {
    const rgb = parseHexColor(bgOptions.customHex || "#000000");
    targetR = rgb.r; targetG = rgb.g; targetB = rgb.b;
  } else {
    // auto_corner
    const sampled = sampleCornerColor(data, width, height);
    targetR = sampled.r; targetG = sampled.g; targetB = sampled.b;
  }

  const threshold = bgOptions.threshold ?? 40;
  const feather = Math.max(0, Math.min(20, bgOptions.feather ?? 2));
  const invert = bgOptions.invertMask ?? false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const dist = getColorDistance(r, g, b, targetR, targetG, targetB);

      let isBg = false;
      if (feather > 0) {
        if (dist <= threshold) {
          isBg = true;
        } else if (dist <= threshold + feather * 5) {
          // Falloff / feather gradient
          const factor = (dist - threshold) / (feather * 5);
          mask[y * width + x] = Math.round(factor * 255);
          continue;
        }
      } else {
        isBg = dist <= threshold;
      }

      if (invert) {
        mask[y * width + x] = isBg ? 255 : 0;
      } else {
        mask[y * width + x] = isBg ? 0 : 255;
      }
    }
  }

  return mask;
}

/**
 * 3x3 Laplacian Unsharp Mask / Sharpness filter
 */
export function applySharpness(
  luminanceGrid: Float32Array,
  width: number,
  height: number,
  sharpness: number
): Float32Array {
  if (sharpness <= 0) return luminanceGrid;
  const strength = (sharpness / 100) * 1.5; // Up to 1.5x boost
  const output = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        output[idx] = luminanceGrid[idx];
        continue;
      }

      // 3x3 Laplacian kernel:
      //  0  -1   0
      // -1   4  -1
      //  0  -1   0
      const center = luminanceGrid[idx];
      const up = luminanceGrid[(y - 1) * width + x];
      const down = luminanceGrid[(y + 1) * width + x];
      const left = luminanceGrid[y * width + (x - 1)];
      const right = luminanceGrid[y * width + (x + 1)];

      const laplacian = 4 * center - (up + down + left + right);
      output[idx] = Math.max(0, Math.min(255, center + laplacian * strength));
    }
  }

  return output;
}

/**
 * Sobel Edge Detection Filter
 */
export function applySobelEdgeDetection(
  luminanceGrid: Float32Array,
  width: number,
  height: number,
  edgeThreshold: number = 50
): Float32Array {
  const output = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p00 = luminanceGrid[(y - 1) * width + (x - 1)];
      const p01 = luminanceGrid[(y - 1) * width + x];
      const p02 = luminanceGrid[(y - 1) * width + (x + 1)];

      const p10 = luminanceGrid[y * width + (x - 1)];
      const p12 = luminanceGrid[y * width + (x + 1)];

      const p20 = luminanceGrid[(y + 1) * width + (x - 1)];
      const p21 = luminanceGrid[(y + 1) * width + x];
      const p22 = luminanceGrid[(y + 1) * width + (x + 1)];

      // Gx = [-1 0 1; -2 0 2; -1 0 1]
      const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
      // Gy = [-1 -2 -1; 0 0 0; 1 2 1]
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      const mag = Math.sqrt(gx * gx + gy * gy);
      output[y * width + x] = mag >= edgeThreshold ? Math.min(255, mag) : 0;
    }
  }

  return output;
}

import { AsciiRenderOptions } from "../contracts";
import { brightnessToChar, getCharsetRamp } from "./charsets";

export interface CanvasRenderResult {
  asciiText: string;
  colorBuffer?: Uint8Array; // [r, g, b, r, g, b, ...] for each character
  width: number;
  height: number;
  durationMs: number;
}

// Pre-allocated reusable intermediate buffers to guard STRESS-1 (Downscaled grid processing)
interface GridBuffers {
  width: number;
  height: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  a: Float32Array;
  gray: Float32Array;
  edge: Float32Array;
}

let cachedBuffers: GridBuffers | null = null;

function getGridBuffers(width: number, height: number): GridBuffers {
  if (
    !cachedBuffers ||
    cachedBuffers.width !== width ||
    cachedBuffers.height !== height
  ) {
    const size = width * height;
    cachedBuffers = {
      width,
      height,
      r: new Float32Array(size),
      g: new Float32Array(size),
      b: new Float32Array(size),
      a: new Float32Array(size),
      gray: new Float32Array(size),
      edge: new Float32Array(size),
    };
  }
  return cachedBuffers;
}

// Cached 256-entry Tone/Signal LUTs to avoid Math.pow in tight loops
let lutCacheKey = "";
let cachedLut = new Uint8Array(256);

export function getToneLUT(
  contrast: number,
  brightness: number,
  gamma: number,
  exposure: number
): Uint8Array {
  const key = `${contrast}_${brightness}_${gamma}_${exposure}`;
  if (key === lutCacheKey) {
    return cachedLut;
  }
  lutCacheKey = key;
  const toneLut = new Uint8Array(256);

  const c = Math.max(-100, Math.min(100, contrast));
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const brightnessOffset = Math.max(-100, Math.min(100, brightness));
  const invGamma = 1.0 / Math.max(0.1, Math.min(3.0, gamma));
  const expScale = Math.pow(2.0, Math.max(-3, Math.min(3, exposure / 33.33)));

  for (let i = 0; i < 256; i++) {
    let val = i * expScale;
    val = factor * (val - 128) + 128;
    val += brightnessOffset;
    if (val > 0) {
      val = 255 * Math.pow(val / 255, invGamma);
    }
    toneLut[i] = Math.max(0, Math.min(255, Math.round(val)));
  }
  cachedLut = toneLut;
  return toneLut;
}

// Parse hex string "#RRGGBB" or "#RGB" to [r, g, b]
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal)) return [0, 0, 0];
  return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
}

// Corner sampling heuristic for STRESS-3
export function sampleCornerColor(
  rArr: Float32Array,
  gArr: Float32Array,
  bArr: Float32Array,
  width: number,
  height: number
): [number, number, number] {
  if (width <= 0 || height <= 0) return [0, 0, 0];
  const corners = [
    [0, 0],
    [Math.max(0, width - 1), 0],
    [0, Math.max(0, height - 1)],
    [Math.max(0, width - 1), Math.max(0, height - 1)],
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (const [cx, cy] of corners) {
    const idx = cy * width + cx;
    sumR += rArr[idx];
    sumG += gArr[idx];
    sumB += bArr[idx];
  }

  return [
    Math.round(sumR / corners.length),
    Math.round(sumG / corners.length),
    Math.round(sumB / corners.length),
  ];
}

export function renderImageDataToAscii(
  imageData: ImageData,
  options: AsciiRenderOptions
): CanvasRenderResult {
  const start = performance.now();
  const origW = imageData.width;
  const origH = imageData.height;

  const targetW = options.max_output_columns;
  const targetH = options.max_output_rows;

  const ramp = getCharsetRamp(
    options.charset.preset,
    options.charset.custom_glyphs,
    options.charset.invert
  );
  const data = imageData.data;

  const xRatio = origW / targetW;
  const yRatio = origH / targetH;

  const lut = getToneLUT(
    options.contrast ?? 0,
    options.brightness ?? 0,
    options.gamma ?? 1.0,
    options.exposure ?? 0
  );

  const buffers = getGridBuffers(targetW, targetH);
  const { r: rBuf, g: gBuf, b: bBuf, a: aBuf, gray: grayBuf, edge: edgeBuf } = buffers;

  // Step 1: Downsample frame directly into grid buffers (O(1) allocation)
  for (let ty = 0; ty < targetH; ty++) {
    const y0 = Math.floor(ty * yRatio);
    const y1 = Math.min(origH, Math.floor((ty + 1) * yRatio));
    for (let tx = 0; tx < targetW; tx++) {
      const x0 = Math.floor(tx * xRatio);
      const x1 = Math.min(origW, Math.floor((tx + 1) * xRatio));

      let sumR = 0,
        sumG = 0,
        sumB = 0,
        count = 0;
      for (let sy = y0; sy < y1; sy++) {
        const rowOffset = sy * origW;
        for (let sx = x0; sx < x1; sx++) {
          const idx = (rowOffset + sx) * 4;
          sumR += data[idx];
          sumG += data[idx + 1];
          sumB += data[idx + 2];
          count++;
        }
      }

      const gridIdx = ty * targetW + tx;
      if (count > 0) {
        rBuf[gridIdx] = sumR / count;
        gBuf[gridIdx] = sumG / count;
        bBuf[gridIdx] = sumB / count;
      } else {
        const idx = (y0 * origW + x0) * 4;
        rBuf[gridIdx] = data[idx];
        gBuf[gridIdx] = data[idx + 1];
        bBuf[gridIdx] = data[idx + 2];
      }
      aBuf[gridIdx] = 255;
    }
  }

  // Step 2: Smart Background Removal (Euclidean Distance Chroma-Key + Feathering)
  const bgOpts = options.bgRemoval;
  if (bgOpts && bgOpts.enabled) {
    let targetR = 0,
      targetG = 0,
      targetB = 0;
    if (bgOpts.targetColor === "white") {
      targetR = 255;
      targetG = 255;
      targetB = 255;
    } else if (bgOpts.targetColor === "custom" && bgOpts.customHex) {
      [targetR, targetG, targetB] = hexToRgb(bgOpts.customHex);
    } else if (bgOpts.targetColor === "auto_corner") {
      [targetR, targetG, targetB] = sampleCornerColor(
        rBuf,
        gBuf,
        bBuf,
        targetW,
        targetH
      );
    } // "black" defaults to 0,0,0

    const threshold = bgOpts.threshold ?? 40;
    const feather = Math.max(0, bgOpts.feather ?? 2);
    const innerDist = threshold;
    const outerDist = threshold + feather * 8;
    const innerSq = innerDist * innerDist;
    const outerSq = outerDist * outerDist;

    for (let i = 0; i < targetW * targetH; i++) {
      const dr = rBuf[i] - targetR;
      const dg = gBuf[i] - targetG;
      const db = bBuf[i] - targetB;
      const distSq = dr * dr + dg * dg + db * db;

      let alpha = 255;
      if (distSq <= innerSq) {
        alpha = 0;
      } else if (distSq < outerSq && outerSq > innerSq) {
        // Feather transition
        const t = (distSq - innerSq) / (outerSq - innerSq);
        alpha = Math.round(t * 255);
      }

      if (bgOpts.invertMask) {
        alpha = 255 - alpha;
      }
      aBuf[i] = alpha;
    }
  }

  // Step 3: Saturation adjustment (-100 to 100)
  const saturation = Math.max(-100, Math.min(100, options.saturation ?? 0));
  if (saturation !== 0) {
    const satFactor = (saturation + 100) / 100; // 0 to 2
    for (let i = 0; i < targetW * targetH; i++) {
      const gray = 0.299 * rBuf[i] + 0.587 * gBuf[i] + 0.114 * bBuf[i];
      rBuf[i] = Math.max(0, Math.min(255, gray + satFactor * (rBuf[i] - gray)));
      gBuf[i] = Math.max(0, Math.min(255, gray + satFactor * (gBuf[i] - gray)));
      bBuf[i] = Math.max(0, Math.min(255, gray + satFactor * (bBuf[i] - gray)));
    }
  }

  // Compute Base Grayscale using LUT
  for (let i = 0; i < targetW * targetH; i++) {
    const baseLum = Math.round(0.299 * rBuf[i] + 0.587 * gBuf[i] + 0.114 * bBuf[i]);
    grayBuf[i] = lut[Math.max(0, Math.min(255, baseLum))];
  }

  // Step 4: Sharpness Filter (3x3 Laplacian Convolution Kernel)
  const sharpness = Math.max(0, Math.min(100, options.sharpness ?? 0));
  if (sharpness > 0) {
    const weight = (sharpness / 100) * 0.5; // Up to 0.5 center boost
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const idx = y * targetW + x;
        const laplacian =
          -1 * grayBuf[(y - 1) * targetW + x] +
          -1 * grayBuf[y * targetW + (x - 1)] +
          4 * grayBuf[idx] +
          -1 * grayBuf[y * targetW + (x + 1)] +
          -1 * grayBuf[(y + 1) * targetW + x];
        grayBuf[idx] = Math.max(0, Math.min(255, grayBuf[idx] + weight * laplacian));
      }
    }
  }

  // Step 5: Sobel Edge Detection (if enabled)
  if (options.edgeDetection) {
    const edgeThreshold = options.edgeThreshold ?? 50;
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        // Gx kernel
        // -1  0 +1
        // -2  0 +2
        // -1  0 +1
        const gx =
          -1 * grayBuf[(y - 1) * targetW + (x - 1)] +
          1 * grayBuf[(y - 1) * targetW + (x + 1)] +
          -2 * grayBuf[y * targetW + (x - 1)] +
          2 * grayBuf[y * targetW + (x + 1)] +
          -1 * grayBuf[(y + 1) * targetW + (x - 1)] +
          1 * grayBuf[(y + 1) * targetW + (x + 1)];

        // Gy kernel
        // -1 -2 -1
        //  0  0  0
        // +1 +2 +1
        const gy =
          -1 * grayBuf[(y - 1) * targetW + (x - 1)] +
          -2 * grayBuf[(y - 1) * targetW + x] +
          -1 * grayBuf[(y - 1) * targetW + (x + 1)] +
          1 * grayBuf[(y + 1) * targetW + (x - 1)] +
          2 * grayBuf[(y + 1) * targetW + x] +
          1 * grayBuf[(y + 1) * targetW + (x + 1)];

        const mag = Math.sqrt(gx * gx + gy * gy);
        edgeBuf[y * targetW + x] = mag >= edgeThreshold ? 255 : 0;
      }
    }

    // Replace luminance with edge outline
    for (let i = 0; i < targetW * targetH; i++) {
      grayBuf[i] = edgeBuf[i];
    }
  }

  // Step 6: Invert (if explicitly requested in options)
  if (options.invert) {
    for (let i = 0; i < targetW * targetH; i++) {
      grayBuf[i] = 255 - grayBuf[i];
    }
  }

  // Output Construction
  const needColor =
    options.color_mode === "truecolor" || options.color_mode === "rgb_ansi";
  const colorBuffer = needColor
    ? new Uint8Array(targetW * targetH * 3)
    : undefined;
  const quant = 4;

  const lines: string[] = [];

  for (let ty = 0; ty < targetH; ty++) {
    let line = "";
    for (let tx = 0; tx < targetW; tx++) {
      const idx = ty * targetW + tx;

      if (needColor && colorBuffer) {
        const cIdx = idx * 3;
        colorBuffer[cIdx] = Math.max(
          0,
          Math.min(255, Math.floor(rBuf[idx] / quant) * quant)
        );
        colorBuffer[cIdx + 1] = Math.max(
          0,
          Math.min(255, Math.floor(gBuf[idx] / quant) * quant)
        );
        colorBuffer[cIdx + 2] = Math.max(
          0,
          Math.min(255, Math.floor(bBuf[idx] / quant) * quant)
        );
      }

      // If alpha is 0 (removed by background remover), map to whitespace character
      if (aBuf[idx] === 0) {
        line += " ";
      } else {
        line += brightnessToChar(grayBuf[idx], ramp);
      }
    }
    lines.push(line);
  }

  const durationMs = performance.now() - start;
  return {
    asciiText: lines.join("\n"),
    colorBuffer,
    width: targetW,
    height: targetH,
    durationMs,
  };
}

import { AsciiRenderOptions } from "../contracts";
import { brightnessToChar, getCharsetRamp } from "./charsets";

export interface CanvasRenderResult {
  asciiText: string;
  colorBuffer?: Uint8Array; // [r, g, b, r, g, b, ...] for each character
  width: number;
  height: number;
  durationMs: number;
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

  const ramp = getCharsetRamp(options.charset.preset, options.charset.custom_glyphs, options.charset.invert);
  const data = imageData.data;

  const xRatio = origW / targetW;
  const yRatio = origH / targetH;

  const c = Math.max(-100, Math.min(100, options.contrast));
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const brightnessOffset = Math.max(-100, Math.min(100, options.brightness));
  const invGamma = 1.0 / Math.max(0.1, Math.min(3.0, options.gamma));

  const needColor = options.color_mode === "truecolor" || options.color_mode === "rgb_ansi";
  const colorBuffer = needColor ? new Uint8Array(targetW * targetH * 3) : undefined;
  const quant = 4;

  const lines: string[] = [];

  for (let ty = 0; ty < targetH; ty++) {
    const sy = Math.min(origH - 1, Math.floor(ty * yRatio));
    let line = "";
    for (let tx = 0; tx < targetW; tx++) {
      const sx = Math.min(origW - 1, Math.floor(tx * xRatio));
      const idx = (sy * origW + sx) * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      if (needColor && colorBuffer) {
        const cIdx = (ty * targetW + tx) * 3;
        colorBuffer[cIdx] = Math.floor(r / quant) * quant;
        colorBuffer[cIdx + 1] = Math.floor(g / quant) * quant;
        colorBuffer[cIdx + 2] = Math.floor(b / quant) * quant;
      }

      // ITU BT.601 luminance
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;
      lum = factor * (lum - 128) + 128;
      lum += brightnessOffset;
      if (lum > 0) {
        lum = 255 * Math.pow(lum / 255, invGamma);
      }

      line += brightnessToChar(lum, ramp);
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

import { describe, it, expect } from "vitest";
import {
  renderImageDataToAscii,
  getToneLUT,
  hexToRgb,
  sampleCornerColor,
} from "../engine/canvas-renderer";
import { AsciiRenderOptions } from "../contracts";

describe("Canvas Renderer - Signal Adjustments & Smart Background Removal", () => {
  const createBaseOptions = (): AsciiRenderOptions => ({
    mode: "image",
    tier: "tier3_canvas2d",
    color_mode: "monochrome",
    charset: {
      preset: "standard",
      invert: false,
      glyph_aspect_ratio: 0.55,
    },
    contrast: 0,
    brightness: 0,
    gamma: 1.0,
    exposure: 0,
    saturation: 0,
    sharpness: 0,
    invert: false,
    edgeDetection: false,
    edgeThreshold: 50,
    bgRemoval: {
      enabled: false,
      threshold: 40,
      feather: 2,
      targetColor: "auto_corner",
      customHex: "#000000",
      invertMask: false,
    },
    audio: {
      enabled: true,
      volume: 1.0,
      muted: false,
      preservePitch: true,
      visualizeOutput: false,
    },
    fastfetch: {
      enabled: true,
      compactMode: false,
      showGpuTelemetry: true,
      showAudioMeter: true,
      showSignalHistogram: false,
      refreshIntervalMs: 500,
    },
    dither: "none",
    cell_width_px: 8,
    cell_height_px: 14,
    font_size_px: 12,
    font_family: "monospace",
    fps_cap: 60,
    enable_scanlines: false,
    enable_bloom: false,
    max_output_columns: 4,
    max_output_rows: 4,
  });

  it("calculates Tone LUT with contrast, brightness, gamma, and exposure caching", () => {
    const lut1 = getToneLUT(0, 0, 1.0, 0);
    expect(lut1).toHaveLength(256);
    expect(lut1[0]).toBe(0);
    expect(lut1[255]).toBe(255);

    // Caching returns exact same typed array instance
    const lutCached = getToneLUT(0, 0, 1.0, 0);
    expect(lutCached).toBe(lut1);

    // Exposure boosts values
    const lutHighExposure = getToneLUT(0, 0, 1.0, 33);
    expect(lutHighExposure[64]).toBeGreaterThan(lut1[64]);
  });

  it("parses 3-character and 6-character hex colors correctly", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#f00")).toEqual([255, 0, 0]);
    expect(hexToRgb("#0f0")).toEqual([0, 255, 0]);
    expect(hexToRgb("#00f")).toEqual([0, 0, 255]);
    expect(hexToRgb("invalid")).toEqual([0, 0, 0]);
  });

  it("samples corner pixels for auto_corner background detection (STRESS-3 defense)", () => {
    const w = 4;
    const h = 4;
    const r = new Float32Array(w * h).fill(20);
    const g = new Float32Array(w * h).fill(30);
    const b = new Float32Array(w * h).fill(40);

    // Center is high luminance subject
    r[5] = 200; g[5] = 200; b[5] = 200;
    r[6] = 200; g[6] = 200; b[6] = 200;

    const corner = sampleCornerColor(r, g, b, w, h);
    expect(corner[0]).toBe(20);
    expect(corner[1]).toBe(30);
    expect(corner[2]).toBe(40);
  });

  it("removes background pixels and maps them to spaces when bgRemoval is enabled", () => {
    const w = 4;
    const h = 4;
    const buffer = new Uint8ClampedArray(w * h * 4);

    // Black background everywhere
    buffer.fill(0);
    for (let i = 0; i < w * h; i++) {
      buffer[i * 4 + 3] = 255;
    }

    // Set 2 center pixels to bright white subject
    const centerIdx1 = (1 * w + 1) * 4;
    const centerIdx2 = (1 * w + 2) * 4;
    buffer[centerIdx1] = 255; buffer[centerIdx1 + 1] = 255; buffer[centerIdx1 + 2] = 255;
    buffer[centerIdx2] = 255; buffer[centerIdx2 + 1] = 255; buffer[centerIdx2 + 2] = 255;

    const imgData = {
      width: w,
      height: h,
      data: buffer,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    // Render with bg removal on black
    const opts = createBaseOptions();
    opts.bgRemoval.enabled = true;
    opts.bgRemoval.targetColor = "black";
    opts.bgRemoval.threshold = 50;

    const res = renderImageDataToAscii(imgData, opts);
    const lines = res.asciiText.split("\n");
    expect(lines).toHaveLength(4);

    // First row was all black background, so all spaces
    expect(lines[0].trim()).toBe("");

    // Second row contains the white subject pixels, so non-empty characters
    expect(lines[1]).not.toBe("    ");
    expect(lines[1].includes("@") || lines[1].includes("#") || lines[1].includes("%")).toBe(true);
  });

  it("inverts background mask when invertMask is enabled", () => {
    const w = 2;
    const h = 2;
    const buffer = new Uint8ClampedArray(w * h * 4);
    // Top-left is black, others white
    buffer[0] = 0; buffer[1] = 0; buffer[2] = 0; buffer[3] = 255;
    buffer[4] = 255; buffer[5] = 255; buffer[6] = 255; buffer[7] = 255;
    buffer[8] = 255; buffer[9] = 255; buffer[10] = 255; buffer[11] = 255;
    buffer[12] = 255; buffer[13] = 255; buffer[14] = 255; buffer[15] = 255;

    const imgData = {
      width: w,
      height: h,
      data: buffer,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    const opts = createBaseOptions();
    opts.max_output_columns = 2;
    opts.max_output_rows = 2;
    opts.bgRemoval.enabled = true;
    opts.bgRemoval.targetColor = "black";
    opts.bgRemoval.invertMask = true; // Inverts mask: black kept, white cleared

    const res = renderImageDataToAscii(imgData, opts);
    const lines = res.asciiText.split("\n");
    // Bottom row was white, so cleared to spaces
    expect(lines[1].trim()).toBe("");
  });

  it("applies Sobel edge detection filter when enabled", () => {
    const w = 4;
    const h = 4;
    const buffer = new Uint8ClampedArray(w * h * 4);
    // Step edge: left half black, right half white
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const val = x >= 2 ? 255 : 0;
        buffer[idx] = val;
        buffer[idx + 1] = val;
        buffer[idx + 2] = val;
        buffer[idx + 3] = 255;
      }
    }

    const imgData = {
      width: w,
      height: h,
      data: buffer,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    const opts = createBaseOptions();
    opts.edgeDetection = true;
    opts.edgeThreshold = 30;

    const res = renderImageDataToAscii(imgData, opts);
    expect(res.asciiText.length).toBeGreaterThan(0);
  });

  it("applies sharpness convolution kernel when sharpness > 0", () => {
    const w = 4;
    const h = 4;
    const buffer = new Uint8ClampedArray(w * h * 4);
    buffer.fill(128);

    const imgData = {
      width: w,
      height: h,
      data: buffer,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    const opts = createBaseOptions();
    opts.sharpness = 80;

    const res = renderImageDataToAscii(imgData, opts);
    expect(res.asciiText.split("\n")).toHaveLength(4);
  });
});

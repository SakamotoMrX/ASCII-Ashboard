import { describe, it, expect } from "vitest";
import {
  applyPixelSignalAdjustments,
  computeBackgroundRemovalMask,
  applySharpness,
  applySobelEdgeDetection,
  getColorDistance,
  sampleCornerColor,
} from "../engine/signal-processing";
import { AudioPipelineManager } from "../engine/audio-pipeline";

describe("Signal Processing Math & Background Removal", () => {
  it("calculates Euclidean color distance correctly", () => {
    expect(getColorDistance(0, 0, 0, 0, 0, 0)).toBe(0);
    expect(getColorDistance(255, 0, 0, 0, 0, 0)).toBe(255);
    expect(getColorDistance(0, 255, 0, 0, 0, 0)).toBe(255);
    expect(getColorDistance(0, 0, 255, 0, 0, 0)).toBe(255);
  });

  it("samples corner colors accurately (STRESS-3 defense)", () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    // Fill all with black
    data.fill(0);
    // Set 4 corners to white
    // (0,0), (3,0), (0,3), (3,3)
    const corners = [0, 3 * 4, 3 * 4 * 4, (3 * 4 + 3) * 4];
    for (const c of corners) {
      data[c] = 255;
      data[c + 1] = 255;
      data[c + 2] = 255;
      data[c + 3] = 255;
    }
    const sampled = sampleCornerColor(data, 4, 4);
    expect(sampled.r).toBe(255);
    expect(sampled.g).toBe(255);
    expect(sampled.b).toBe(255);
  });

  it("applies exposure, saturation, gamma, and invert adjustments", () => {
    const res = applyPixelSignalAdjustments(100, 100, 100, {
      exposure: 50,
      saturation: 0,
      contrast: 0,
      brightness: 0,
      gamma: 1.0,
      invert: false,
    });
    expect(res.r).toBeGreaterThan(100);
    expect(res.lum).toBeGreaterThan(100);

    const inverted = applyPixelSignalAdjustments(255, 255, 255, {
      exposure: 0,
      saturation: 0,
      contrast: 0,
      brightness: 0,
      gamma: 1.0,
      invert: true,
    });
    expect(inverted.lum).toBe(0);
  });

  it("removes background using Euclidean thresholding mask", () => {
    const width = 2;
    const height = 2;
    const data = new Uint8ClampedArray(width * height * 4);
    // 3 white pixels, 1 black pixel
    data.fill(255);
    data[0] = 0; data[1] = 0; data[2] = 0; // top-left is black

    const mask = computeBackgroundRemovalMask(data, width, height, {
      enabled: true,
      threshold: 30,
      feather: 0,
      targetColor: "black",
      customHex: "#000000",
      invertMask: false,
    });

    // Top-left pixel should be masked (0), others kept (255)
    expect(mask[0]).toBe(0);
    expect(mask[1]).toBe(255);
    expect(mask[2]).toBe(255);
    expect(mask[3]).toBe(255);
  });

  it("computes Sobel edge detection on high contrast transitions", () => {
    const grid = new Float32Array(9);
    // Vertical edge down the middle:
    // 0 255 255
    // 0 255 255
    // 0 255 255
    grid[0] = 0;   grid[1] = 255; grid[2] = 255;
    grid[3] = 0;   grid[4] = 255; grid[5] = 255;
    grid[6] = 0;   grid[7] = 255; grid[8] = 255;

    const edges = applySobelEdgeDetection(grid, 3, 3, 50);
    expect(edges[4]).toBeGreaterThan(50); // Center point detects edge
  });

  it("computes 3x3 Laplacian sharpness enhancement", () => {
    const grid = new Float32Array([
      10, 10, 10,
      10, 50, 10,
      10, 10, 10
    ]);
    const sharpened = applySharpness(grid, 3, 3, 50);
    expect(sharpened[4]).toBeGreaterThan(50); // Center peak boosted
  });
});

describe("Audio Pipeline & Fastfetch Telemetry", () => {
  it("initializes audio pipeline with proper state handling", () => {
    const audio = new AudioPipelineManager({ volume: 0.8, muted: false });
    const state = audio.getState();
    expect(state.volume).toBe(0.8);
    expect(state.muted).toBe(false);

    audio.setVolume(0.5);
    expect(audio.getState().volume).toBe(0.5);

    audio.setMuted(true);
    expect(audio.getState().muted).toBe(true);
    audio.dispose();
  });
});

import { describe, it, expect } from "vitest";
import { getSystemInfo } from "../engine/fastfetch-data";
import { AsciiRenderOptions } from "../contracts";

describe("Fastfetch Telemetry Data Generator", () => {
  const mockOptions: AsciiRenderOptions = {
    mode: "video",
    tier: "tier1_webgpu",
    color_mode: "monochrome",
    charset: {
      preset: "matrix",
      invert: false,
      glyph_aspect_ratio: 0.55,
    },
    contrast: 10,
    brightness: 5,
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
      volume: 0.8,
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
    max_output_columns: 120,
    max_output_rows: 60,
  };

  it("gathers hardware and runtime telemetry conforming to contracts", () => {
    const info = getSystemInfo(mockOptions, 59.4, "tier1_webgpu");

    expect(info.os).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.gpuTier).toBe("tier1_webgpu");
    expect(info.renderFps).toBeCloseTo(59.4);
    expect(info.gridDimensions).toBe("120x60");
    expect(info.activePreset).toBe("matrix");
    expect(info.activeColorMatrix).toBe("monochrome");
    expect(info.audioStatus).toBe("Active (80%)");
    expect(info.uptimeSec).toBeGreaterThanOrEqual(0);
  });

  it("reflects muted or disabled audio in status string", () => {
    const mutedOpts: AsciiRenderOptions = {
      ...mockOptions,
      audio: {
        ...mockOptions.audio,
        muted: true,
      },
    };
    const infoMuted = getSystemInfo(mutedOpts, 60, "tier2_webgl");
    expect(infoMuted.audioStatus).toBe("Muted");

    const disabledOpts: AsciiRenderOptions = {
      ...mockOptions,
      audio: {
        ...mockOptions.audio,
        enabled: false,
      },
    };
    const infoDisabled = getSystemInfo(disabledOpts, 60, "tier3_canvas2d");
    expect(infoDisabled.audioStatus).toBe("Disabled");
  });
});

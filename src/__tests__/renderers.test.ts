import { describe, it, expect } from "vitest";
import { getCharsetRamp, brightnessToChar } from "../engine/charsets";
import { renderImageDataToAscii } from "../engine/canvas-renderer";
import { AsciiRenderOptions } from "../contracts";

describe("ASCII Renderers & Character Mapping", () => {
  it("computes character ramps correctly with inversion support", () => {
    const std = getCharsetRamp("standard", undefined, false);
    expect(std).toBe(" .:-=+*#%@");

    const inverted = getCharsetRamp("standard", undefined, true);
    expect(inverted).toBe("@%#*+=-:. ");

    const custom = getCharsetRamp("custom", "01", false);
    expect(custom).toBe("01");
  });

  it("maps brightness accurately to ramp glyphs", () => {
    const ramp = " .#";
    expect(brightnessToChar(0, ramp)).toBe(" ");
    expect(brightnessToChar(128, ramp)).toBe(".");
    expect(brightnessToChar(255, ramp)).toBe("#");
    expect(brightnessToChar(-50, ramp)).toBe(" ");
    expect(brightnessToChar(300, ramp)).toBe("#");
  });

  it("rasterizes simulated ImageData into ASCII grid", () => {
    // 4x4 image
    const width = 4;
    const height = 4;
    const buffer = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < 16; i++) {
      const v = i * 16;
      buffer[i * 4] = v;
      buffer[i * 4 + 1] = v;
      buffer[i * 4 + 2] = v;
      buffer[i * 4 + 3] = 255;
    }

    const mockImageData = {
      width,
      height,
      data: buffer,
      colorSpace: "srgb" as PredefinedColorSpace,
    };

    const options: AsciiRenderOptions = {
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
    };

    const res = renderImageDataToAscii(mockImageData, options);
    expect(res.width).toBe(4);
    expect(res.height).toBe(4);
    expect(res.asciiText.split("\n")).toHaveLength(4);
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });
});

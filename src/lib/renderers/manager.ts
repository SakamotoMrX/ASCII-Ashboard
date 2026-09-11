import { AsciiRenderOptions, RenderTier } from "../../types";
import { SceneFrameData } from "../procedural/scenes";
import { CharacterAtlas, createCharacterAtlas } from "./atlas";
import { Canvas2DRenderer } from "./canvas2d";
import { WebGL2Renderer } from "./webgl";
import { WebGPURenderer } from "./webgpu";
import { getGlyphRamp } from "../charsets";

export class RenderEngineManager {
  private canvas: HTMLCanvasElement;
  private activeTier: RenderTier = "tier2_webgl";
  private webgpu: WebGPURenderer | null = null;
  private webgl: WebGL2Renderer | null = null;
  private canvas2d: Canvas2DRenderer | null = null;
  private atlas: CharacterAtlas | null = null;
  private currentRamp: string = "";
  private currentFontSize: number = 14;
  public adapterName: string = "Hardware Rasterizer";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async initialize(preferredTier: RenderTier = "tier1_webgpu"): Promise<RenderTier> {
    // Attempt Tier 1: WebGPU
    if (preferredTier === "tier1_webgpu") {
      try {
        const gpu = new WebGPURenderer(this.canvas);
        const ok = await gpu.init();
        if (ok) {
          this.webgpu = gpu;
          this.activeTier = "tier1_webgpu";
          this.adapterName = gpu.adapterName;
          return this.activeTier;
        }
      } catch {
        // Fall through to WebGL2
      }
    }

    // Attempt Tier 2: WebGL2
    if (preferredTier === "tier1_webgpu" || preferredTier === "tier2_webgl") {
      try {
        const gl = new WebGL2Renderer(this.canvas);
        this.webgl = gl;
        this.activeTier = "tier2_webgl";
        this.adapterName = "WebGL2 Shader Core";
        return this.activeTier;
      } catch {
        // Fall through to Canvas 2D
      }
    }

    // Tier 3: Canvas 2D CPU Rasterizer Fallback
    this.canvas2d = new Canvas2DRenderer(this.canvas);
    this.activeTier = "tier3_canvas2d";
    this.adapterName = "Canvas2D CPU Fallback Core";
    return this.activeTier;
  }

  public setTier(tier: RenderTier) {
    if (tier === this.activeTier) return;

    if (tier === "tier1_webgpu" && this.webgpu) {
      this.activeTier = "tier1_webgpu";
    } else if (tier === "tier2_webgl") {
      if (!this.webgl) {
        try {
          this.webgl = new WebGL2Renderer(this.canvas);
        } catch {
          this.activeTier = "tier3_canvas2d";
          return;
        }
      }
      this.activeTier = "tier2_webgl";
    } else {
      if (!this.canvas2d) {
        this.canvas2d = new Canvas2DRenderer(this.canvas);
      }
      this.activeTier = "tier3_canvas2d";
    }
  }

  public getActiveTier(): RenderTier {
    return this.activeTier;
  }

  public ensureAtlas(options: AsciiRenderOptions) {
    const ramp = getGlyphRamp(options.charset.preset, options.charset.custom_glyphs, options.charset.invert);
    if (!this.atlas || ramp !== this.currentRamp || options.font_size_px !== this.currentFontSize) {
      this.atlas = createCharacterAtlas(ramp, options.font_size_px, options.font_family);
      this.currentRamp = ramp;
      this.currentFontSize = options.font_size_px;

      if (this.webgl) this.webgl.updateAtlas(this.atlas);
      if (this.webgpu) this.webgpu.updateAtlas(this.atlas);
    }
  }

  public render(
    frame: SceneFrameData,
    options: AsciiRenderOptions
  ): { text: string; renderTimeMs: number; tier: RenderTier } {
    this.ensureAtlas(options);
    const ramp = this.currentRamp;

    try {
      if (this.activeTier === "tier1_webgpu" && this.webgpu && this.atlas) {
        const res = this.webgpu.render(frame, this.atlas, options);
        return { text: res.text, renderTimeMs: res.renderTimeMs, tier: "tier1_webgpu" };
      } else if (this.activeTier === "tier2_webgl" && this.webgl && this.atlas) {
        const res = this.webgl.render(frame, this.atlas, options);
        return { text: res.text, renderTimeMs: res.renderTimeMs, tier: "tier2_webgl" };
      } else {
        if (!this.canvas2d) {
          this.canvas2d = new Canvas2DRenderer(this.canvas);
        }
        const res = this.canvas2d.render(frame, ramp, options);
        return { text: res.text, renderTimeMs: res.renderTimeMs, tier: "tier3_canvas2d" };
      }
    } catch {
      // Soft cascade fallback
      if (this.activeTier !== "tier3_canvas2d") {
        this.activeTier = "tier3_canvas2d";
        if (!this.canvas2d) {
          this.canvas2d = new Canvas2DRenderer(this.canvas);
        }
        const res = this.canvas2d.render(frame, ramp, options);
        return { text: res.text, renderTimeMs: res.renderTimeMs, tier: "tier3_canvas2d" };
      }
      return { text: "", renderTimeMs: 0, tier: "tier3_canvas2d" };
    }
  }

  public generateAsciiText(frame: SceneFrameData, options: AsciiRenderOptions): string {
    const { columns, rows, luminanceBuffer } = frame;
    const ramp = getGlyphRamp(options.charset.preset, options.charset.custom_glyphs, options.charset.invert);
    const glyphs = Array.from(ramp);
    const glyphCount = glyphs.length;

    const contrastNorm = (options.contrast + 100) / 100;
    const brightnessNorm = options.brightness / 100;
    const gammaExp = 1.0 / Math.max(0.1, options.gamma);

    let output = "";
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < columns; c++) {
        let lum = luminanceBuffer[r * columns + c];
        lum = (lum - 0.5) * contrastNorm + 0.5 + brightnessNorm;
        lum = Math.max(0.0, Math.min(1.0, lum));
        lum = Math.pow(lum, gammaExp);

        const glyphIdx = Math.min(
          glyphCount - 1,
          Math.max(0, Math.floor(lum * (glyphCount - 1)))
        );
        line += glyphs[glyphIdx] || " ";
      }
      output += line + "\n";
    }
    return output;
  }
}

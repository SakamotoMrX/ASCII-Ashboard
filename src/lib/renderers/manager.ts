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
  private fallbackListeners: ((tier: RenderTier, reason: string) => void)[] = [];
  public adapterName: string = "Hardware Rasterizer";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public setCanvas(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) return;
    this.canvas = canvas;
    this.webgpu = null;
    this.webgl = null;
    this.canvas2d = null;
    this.atlas = null;
  }

  public onFallback(callback: (tier: RenderTier, reason: string) => void): () => void {
    this.fallbackListeners.push(callback);
    return () => {
      this.fallbackListeners = this.fallbackListeners.filter((cb) => cb !== callback);
    };
  }

  public triggerFallback(reason: string): RenderTier {
    let nextTier: RenderTier = "tier3_canvas2d";
    if (this.activeTier === "tier1_webgpu") {
      nextTier = "tier2_webgl";
    } else if (this.activeTier === "tier2_webgl") {
      nextTier = "tier3_canvas2d";
    }
    this.setTier(nextTier);
    for (const listener of this.fallbackListeners) {
      listener(nextTier, reason);
    }
    return nextTier;
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
      } catch (err: any) {
        this.triggerFallback(err?.message || "WebGPU initialization failed");
      }
    }

    // Attempt Tier 2: WebGL2
    if (preferredTier === "tier1_webgpu" || preferredTier === "tier2_webgl") {
      try {
        const gl = new WebGL2Renderer(this.canvas);
        this.webgl = gl;
        this.activeTier = "tier2_webgl";
        this.adapterName = gl.adapterName || "WebGL2 Shader Core";
        return this.activeTier;
      } catch (err: any) {
        this.triggerFallback(err?.message || "WebGL2 context acquisition failed");
      }
    }

    // Tier 3: Canvas 2D CPU Rasterizer Fallback
    try {
      this.canvas2d = new Canvas2DRenderer(this.canvas);
    } catch {
      // Ignored in headless environments
    }
    this.activeTier = "tier3_canvas2d";
    this.adapterName = "Canvas2D CPU Fallback Core";
    return this.activeTier;
  }

  public async setTier(tier: RenderTier): Promise<RenderTier> {
    if (tier === "tier1_webgpu") {
      if (!this.webgpu) {
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
          // Fall through
        }
        return this.triggerFallback("WebGPU device not available in current environment");
      }
      this.activeTier = "tier1_webgpu";
      return this.activeTier;
    }

    if (tier === "tier2_webgl") {
      if (!this.webgl) {
        try {
          this.webgl = new WebGL2Renderer(this.canvas);
          this.activeTier = "tier2_webgl";
          this.adapterName = this.webgl.adapterName || "WebGL2 Shader Core";
          return this.activeTier;
        } catch {
          return this.triggerFallback("WebGL2 context unavailable");
        }
      }
      this.activeTier = "tier2_webgl";
      return this.activeTier;
    }

    if (!this.canvas2d) {
      try {
        this.canvas2d = new Canvas2DRenderer(this.canvas);
      } catch {
        // Safe mock
      }
    }
    this.activeTier = "tier3_canvas2d";
    this.adapterName = "Canvas2D CPU Fallback Core";
    return this.activeTier;
  }

  public getActiveTier(): RenderTier {
    return this.activeTier;
  }

  public ensureAtlas(options: AsciiRenderOptions) {
    if (this.activeTier === "tier3_canvas2d") {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
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
        const text = res.text || this.generateAsciiText(frame, options);
        return { text, renderTimeMs: res.renderTimeMs, tier: "tier1_webgpu" };
      } else if (this.activeTier === "tier2_webgl" && this.webgl && this.atlas) {
        const res = this.webgl.render(frame, this.atlas, options);
        const text = res.text || this.generateAsciiText(frame, options);
        return { text, renderTimeMs: res.renderTimeMs, tier: "tier2_webgl" };
      } else {
        if (!this.canvas2d) {
          try {
            this.canvas2d = new Canvas2DRenderer(this.canvas);
          } catch {
            // Safe fallback
          }
        }
        if (this.canvas2d) {
          const res = this.canvas2d.render(frame, ramp, options);
          return { text: res.text, renderTimeMs: res.renderTimeMs, tier: "tier3_canvas2d" };
        }
        const text = this.generateAsciiText(frame, options);
        return { text, renderTimeMs: 1.0, tier: "tier3_canvas2d" };
      }
    } catch (err: any) {
      // Soft cascade fallback
      if (this.activeTier === "tier1_webgpu") {
        this.triggerFallback(err?.message || "WebGPU runtime failure");
        return this.render(frame, options);
      } else if (this.activeTier === "tier2_webgl") {
        this.triggerFallback(err?.message || "WebGL2 context lost");
        return this.render(frame, options);
      }
      const text = this.generateAsciiText(frame, options);
      return { text, renderTimeMs: 0, tier: "tier3_canvas2d" };
    }
  }

  public renderImageData(
    imageData: ImageData,
    options: AsciiRenderOptions
  ): { text: string; renderTimeMs: number; tier: RenderTier } {
    const cols = options.max_output_columns;
    const rows = options.max_output_rows;
    const count = cols * rows;
    const luminanceBuffer = new Float32Array(count);
    const colorBuffer = new Uint8ClampedArray(count * 4);

    const srcW = imageData.width;
    const srcH = imageData.height;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const srcX = Math.min(srcW - 1, Math.floor((c / cols) * srcW));
        const srcY = Math.min(srcH - 1, Math.floor((r / rows) * srcH));
        const srcIdx = (srcY * srcW + srcX) * 4;
        const red = imageData.data[srcIdx];
        const green = imageData.data[srcIdx + 1];
        const blue = imageData.data[srcIdx + 2];
        const alpha = imageData.data[srcIdx + 3];

        const idx = r * cols + c;
        luminanceBuffer[idx] = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
        const cIdx = idx * 4;
        colorBuffer[cIdx] = red;
        colorBuffer[cIdx + 1] = green;
        colorBuffer[cIdx + 2] = blue;
        colorBuffer[cIdx + 3] = alpha;
      }
    }

    const frame: SceneFrameData = {
      columns: cols,
      rows: rows,
      luminanceBuffer,
      colorBuffer,
    };

    return this.render(frame, options);
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

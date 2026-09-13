import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TierManager } from "../engine/tier-manager";
import { RenderEngineManager } from "../lib/renderers/manager";
import { SceneFrameData } from "../lib/procedural/scenes";
import { AsciiRenderOptions } from "../contracts";

describe("Real Hardware Tier Detection & Fallback Cascade", () => {
  const defaultOptions: AsciiRenderOptions = {
    mode: "procedural_3d",
    tier: "tier1_webgpu",
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
    font_family: "JetBrains Mono",
    fps_cap: 60,
    enable_scanlines: false,
    enable_bloom: false,
    max_output_columns: 20,
    max_output_rows: 10,
  };

  const sampleFrame: SceneFrameData = {
    columns: 20,
    rows: 10,
    luminanceBuffer: new Float32Array(200).fill(0.6),
    colorBuffer: new Uint8ClampedArray(800).fill(200),
  };

  let originalNavigator: any;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe("TierManager: Capability Probing & Telemetry Detection", () => {
    it("detects WebGPU when navigator.gpu is available and queries adapter info", async () => {
      const mockAdapter = {
        info: {
          vendor: "apple",
          architecture: "common-3",
          device: "Apple M2 Max",
          description: "Apple M2 Max (Metal)",
        },
        requestDevice: vi.fn().mockResolvedValue({
          destroy: vi.fn(),
        }),
      };

      const mockGpu = {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      };

      Object.defineProperty(globalThis, "navigator", {
        value: {
          ...originalNavigator,
          gpu: mockGpu,
        },
        configurable: true,
        writable: true,
      });

      const tierManager = new TierManager();
      const caps = await tierManager.detectCapabilities();

      expect(caps.webgpuSupported).toBe(true);
      expect(caps.recommendedTier).toBe("tier1_webgpu");
      expect(caps.gpuInfo?.vendor).toBe("apple");
      expect(caps.gpuInfo?.description).toContain("Apple M2 Max");
      expect(tierManager.getHardwareGpuDescription()).toContain("Apple M2 Max");
    });

    it("falls back to WebGL2 detection when WebGPU is absent or requestAdapter returns null", async () => {
      Object.defineProperty(globalThis, "navigator", {
        value: {
          ...originalNavigator,
          gpu: undefined,
        },
        configurable: true,
        writable: true,
      });

      const tierManager = new TierManager();
      const caps = await tierManager.detectCapabilities();

      expect(caps.webgpuSupported).toBe(false);
      // In node/vitest environment without real GPU context, falls back to tier3_canvas2d
      expect(caps.canvas2dSupported).toBe(true);
      expect(["tier2_webgl", "tier3_canvas2d"]).toContain(caps.recommendedTier);
    });

    it("triggers onFallback callback when triggerFallback is called", () => {
      const tierManager = new TierManager();
      tierManager.setActiveTier("tier1_webgpu");

      const fallbackSpy = vi.fn();
      tierManager.onFallback(fallbackSpy);

      const nextTier = tierManager.triggerFallback("GPU device lost event");

      expect(fallbackSpy).toHaveBeenCalledWith(nextTier, "GPU device lost event");
      expect(tierManager.getActiveTier()).toBe(nextTier);
    });
  });

  describe("RenderEngineManager: Real Cascade & Execution", () => {
    it("initializes and cascades cleanly down the hierarchy when hardware tiers are unavailable", async () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null),
        width: 160,
        height: 140,
        addEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      const manager = new RenderEngineManager(mockCanvas);
      const fallbackSpy = vi.fn();
      manager.onFallback(fallbackSpy);

      // Attempt Tier 1 initialization without WebGPU support
      const activeTier = await manager.initialize("tier1_webgpu");

      // Cascades down to tier3_canvas2d because getContext returned null for all GPU contexts
      expect(activeTier).toBe("tier3_canvas2d");
      expect(manager.getActiveTier()).toBe("tier3_canvas2d");
    });

    it("renders SceneFrameData and produces valid ASCII text and non-negative render duration", () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null),
        width: 160,
        height: 140,
        addEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      const manager = new RenderEngineManager(mockCanvas);
      manager.setTier("tier3_canvas2d");

      const result = manager.render(sampleFrame, defaultOptions);

      expect(result).toBeDefined();
      expect(result.tier).toBe("tier3_canvas2d");
      expect(result.renderTimeMs).toBeGreaterThanOrEqual(0);

      const lines = result.text.trim().split("\n");
      expect(lines).toHaveLength(10);
      expect(lines[0]).toHaveLength(20);
    });

    it("renders ImageData using renderImageData helper with correct dimensions", () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null),
        width: 160,
        height: 140,
        addEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      const manager = new RenderEngineManager(mockCanvas);
      manager.setTier("tier3_canvas2d");

      const imgWidth = 4;
      const imgHeight = 4;
      const data = new Uint8ClampedArray(imgWidth * imgHeight * 4).fill(128);
      const mockImageData = {
        width: imgWidth,
        height: imgHeight,
        data,
        colorSpace: "srgb" as PredefinedColorSpace,
      };

      const options: AsciiRenderOptions = {
        ...defaultOptions,
        max_output_columns: 4,
        max_output_rows: 4,
      };

      const result = manager.renderImageData(mockImageData, options);

      expect(result.text).toBeDefined();
      const lines = result.text.trim().split("\n");
      expect(lines).toHaveLength(4);
      expect(lines[0]).toHaveLength(4);
    });

    it("handles simulated runtime context loss by gracefully degrading without throwing", () => {
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null),
        width: 160,
        height: 140,
        addEventListener: vi.fn(),
      } as unknown as HTMLCanvasElement;

      const manager = new RenderEngineManager(mockCanvas);
      const fallbackSpy = vi.fn();
      manager.onFallback(fallbackSpy);

      // Trigger fallback manually
      const fallbackTier = manager.triggerFallback("Simulated WebGL context loss");

      expect(fallbackTier).toBe("tier3_canvas2d");
      expect(fallbackSpy).toHaveBeenCalledWith("tier3_canvas2d", "Simulated WebGL context loss");

      // Render should still succeed through CPU fallback
      const renderRes = manager.render(sampleFrame, defaultOptions);
      expect(renderRes.text.length).toBeGreaterThan(0);
      expect(renderRes.tier).toBe("tier3_canvas2d");
    });
  });
});

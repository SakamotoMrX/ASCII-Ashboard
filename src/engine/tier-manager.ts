/**
 * Hierarchical Hardware Tier Cascade & Context Loss Resilience (STRESS-2 Defense)
 * Tier 1 (WebGPU Compute) -> Tier 2 (WebGL2 Fragment) -> Tier 3 (Canvas 2D CPU Rasterizer)
 */

import { RenderTier } from "../contracts";

export interface GpuAdapterDetails {
  vendor: string;
  architecture?: string;
  device?: string;
  description?: string;
}

export interface TierCapabilities {
  webgpuSupported: boolean;
  webgl2Supported: boolean;
  canvas2dSupported: boolean;
  rustSidecarSupported: boolean;
  recommendedTier: RenderTier;
  gpuInfo?: GpuAdapterDetails | null;
  webglRendererString?: string | null;
  maxTextureDimension?: number;
}

export class TierManager {
  private activeTier: RenderTier = "tier3_canvas2d";
  private fallbackListeners: ((tier: RenderTier, reason: string) => void)[] = [];
  private capabilities: TierCapabilities = {
    webgpuSupported: false,
    webgl2Supported: false,
    canvas2dSupported: true,
    rustSidecarSupported: false,
    recommendedTier: "tier3_canvas2d",
    gpuInfo: null,
    webglRendererString: null,
  };

  async detectCapabilities(): Promise<TierCapabilities> {
    // 1. Probe WebGPU
    let webgpu = false;
    let gpuInfo: GpuAdapterDetails | null = null;

    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter({
          powerPreference: "high-performance",
        });
        if (adapter) {
          const device = await adapter.requestDevice();
          if (device) {
            webgpu = true;
            if (adapter.info) {
              gpuInfo = {
                vendor: adapter.info.vendor || "WebGPU Vendor",
                architecture: adapter.info.architecture || "",
                device: adapter.info.device || "",
                description:
                  adapter.info.description ||
                  `${adapter.info.vendor || "WebGPU"} (${adapter.info.architecture || "GPU"})`,
              };
            } else if (typeof adapter.requestAdapterInfo === "function") {
              const info = await adapter.requestAdapterInfo();
              gpuInfo = {
                vendor: info.vendor || "WebGPU Vendor",
                architecture: info.architecture || "",
                device: info.device || "",
                description:
                  info.description ||
                  `${info.vendor || "WebGPU"} (${info.architecture || "GPU"})`,
              };
            }
          }
        }
      } catch {
        webgpu = false;
      }
    }

    // 2. Probe WebGL2
    let webgl2 = false;
    let webglRendererString: string | null = null;
    let maxTextureDimension: number | undefined = undefined;

    if (typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" });
        if (gl) {
          webgl2 = true;
          maxTextureDimension = gl.getParameter(gl.MAX_TEXTURE_SIZE);
          const ext = gl.getExtension("WEBGL_debug_renderer_info");
          if (ext) {
            const unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            const unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
            webglRendererString = `${unmaskedVendor} - ${unmaskedRenderer}`;
          } else {
            webglRendererString = `${gl.getParameter(gl.VENDOR)} - ${gl.getParameter(gl.RENDERER)}`;
          }

          if (!gpuInfo && webglRendererString) {
            gpuInfo = {
              vendor: (gl.getParameter(gl.VENDOR) as string) || "WebGL2",
              description: webglRendererString,
            };
          }
        }
      } catch {
        webgl2 = false;
      }
    }

    // 3. Probe Tauri Rust IPC
    const rustSidecar = typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    let recommended: RenderTier = "tier3_canvas2d";
    if (webgpu) {
      recommended = "tier1_webgpu";
    } else if (webgl2) {
      recommended = "tier2_webgl";
    }

    this.capabilities = {
      webgpuSupported: webgpu,
      webgl2Supported: webgl2,
      canvas2dSupported: true,
      rustSidecarSupported: rustSidecar,
      recommendedTier: recommended,
      gpuInfo,
      webglRendererString,
      maxTextureDimension,
    };

    this.activeTier = recommended;
    return this.capabilities;
  }

  getActiveTier(): RenderTier {
    return this.activeTier;
  }

  setActiveTier(tier: RenderTier): void {
    this.activeTier = tier;
  }

  triggerFallback(reason: string): RenderTier {
    let nextTier: RenderTier = "tier3_canvas2d";
    if (this.activeTier === "tier1_webgpu") {
      nextTier = this.capabilities.webgl2Supported ? "tier2_webgl" : "tier3_canvas2d";
    } else if (this.activeTier === "tier2_webgl") {
      nextTier = "tier3_canvas2d";
    }

    this.activeTier = nextTier;
    for (const listener of this.fallbackListeners) {
      listener(nextTier, reason);
    }
    return nextTier;
  }

  onFallback(callback: (tier: RenderTier, reason: string) => void): () => void {
    this.fallbackListeners.push(callback);
    return () => {
      this.fallbackListeners = this.fallbackListeners.filter((cb) => cb !== callback);
    };
  }

  getCapabilities(): TierCapabilities {
    return this.capabilities;
  }

  getHardwareGpuDescription(): string {
    if (this.capabilities.gpuInfo?.description) {
      return this.capabilities.gpuInfo.description;
    }
    if (this.capabilities.webglRendererString) {
      return this.capabilities.webglRendererString;
    }
    if (this.capabilities.webgpuSupported) {
      return "WebGPU Accelerated Core";
    }
    if (this.capabilities.webgl2Supported) {
      return "WebGL2 Standard Core";
    }
    return "Canvas2D CPU Rasterizer";
  }
}

export const globalTierManager = new TierManager();

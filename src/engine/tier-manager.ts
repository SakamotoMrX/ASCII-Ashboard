/**
 * Hierarchical Hardware Tier Cascade & Context Loss Resilience (STRESS-2 Defense)
 * Tier 1 (WebGPU Compute) -> Tier 2 (WebGL2 Fragment) -> Tier 3 (Canvas 2D CPU Rasterizer)
 */

import { RenderTier } from "../contracts";

export interface TierCapabilities {
  webgpuSupported: boolean;
  webgl2Supported: boolean;
  canvas2dSupported: boolean;
  rustSidecarSupported: boolean;
  recommendedTier: RenderTier;
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
  };

  async detectCapabilities(): Promise<TierCapabilities> {
    // 1. Probe WebGPU
    let webgpu = false;
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          if (device) {
            webgpu = true;
          }
        }
      } catch {
        webgpu = false;
      }
    }

    // 2. Probe WebGL2
    let webgl2 = false;
    if (typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2");
        if (gl) {
          webgl2 = true;
        }
      } catch {
        webgl2 = false;
      }
    }

    // 3. Probe Tauri Rust IPC
    const rustSidecar = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

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
}

export const globalTierManager = new TierManager();

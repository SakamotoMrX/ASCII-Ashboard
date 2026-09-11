import { describe, it, expect } from "vitest";
import { clampDimensions } from "../engine/image-preflight";
import { TierManager } from "../engine/tier-manager";
import { StreamPipeline } from "../engine/stream-pipeline";

describe("Breaking Scenarios Defensive Architecture", () => {
  // STRESS-1 Defense Test
  describe("STRESS-1: Massive 8K Image Preflight Clamp", () => {
    it("clamps 8192x8192 image to 2048x2048 preserving square aspect ratio", () => {
      const result = clampDimensions(8192, 8192);
      expect(result.wasClamped).toBe(true);
      expect(result.width).toBe(2048);
      expect(result.height).toBe(2048);
    });

    it("clamps non-square 7680x4320 (8K 16:9) image preserving aspect ratio", () => {
      const result = clampDimensions(7680, 4320);
      expect(result.wasClamped).toBe(true);
      expect(result.width).toBe(2048);
      expect(result.height).toBe(Math.round(2048 / (7680 / 4320)));
    });

    it("passes through standard 800x600 image without downsampling", () => {
      const result = clampDimensions(800, 600);
      expect(result.wasClamped).toBe(false);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });
  });

  // STRESS-2 Defense Test
  describe("STRESS-2: Graphics Context Loss & Android WebGPU Fallback Cascade", () => {
    it("falls back from WebGPU -> WebGL2 -> Canvas2D on context loss", async () => {
      const tierMgr = new TierManager();
      tierMgr.setActiveTier("tier1_webgpu");
      expect(tierMgr.getActiveTier()).toBe("tier1_webgpu");

      let fallbackFired = false;
      tierMgr.onFallback(() => {
        fallbackFired = true;
      });

      const next = tierMgr.triggerFallback("WebGPU device lost event");
      expect(fallbackFired).toBe(true);
      expect(next).toBe("tier3_canvas2d"); // Since webgl2 not detected in node test env
      expect(tierMgr.getActiveTier()).toBe("tier3_canvas2d");
    });
  });

  // STRESS-3 Defense Test
  describe("STRESS-3: High-Frequency Slider Scrubbing IPC Backpressure & Frame Discarding", () => {
    it("discards obsolete intermediate frames under rapid burst submissions", async () => {
      let renderCount = 0;
      const pipeline = new StreamPipeline<number, string>(async (val) => {
        renderCount++;
        // Simulate async render delay
        await new Promise((r) => setTimeout(r, 20));
        return `rendered_${val}`;
      });

      // Submit 10 rapid events in burst
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          pipeline.submit(i).catch((err) => `caught_${err.message}`)
        );
      }

      const results = await Promise.all(promises);
      const telemetry = pipeline.getTelemetry();

      expect(telemetry.totalSubmitted).toBe(10);
      expect(telemetry.droppedFrames).toBeGreaterThan(0);
      expect(results[results.length - 1]).toBe("rendered_9");
    });
  });
});

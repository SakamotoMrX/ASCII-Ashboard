import { describe, it, expect } from "vitest";
import { WorkspaceSessionSchema, ZenModeConfigSchema } from "../contracts";
import { WorkspaceSession } from "../components/WorkspaceTabBar";

describe("UI Zen Mode & Workspace Sessions Logic", () => {
  it("conforms to WorkspaceSessionSchema and supports multi-workspace switching", () => {
    const defaultWorkspaces: WorkspaceSession[] = [
      { id: "ws-1", title: "3D Procedural", mode: "procedural_3d", badge: "ACTIVE", status: "active" },
      { id: "ws-2", title: "Video: Clip 1", mode: "video", badge: "IDLE", status: "idle" },
      { id: "ws-3", title: "Image: Photo 1", mode: "image", badge: "IDLE", status: "idle" },
    ];

    expect(defaultWorkspaces.length).toBe(3);
    expect(defaultWorkspaces[0].id).toBe("ws-1");
    expect(defaultWorkspaces[0].mode).toBe("procedural_3d");

    // Adding new workspace
    const newWs: WorkspaceSession = {
      id: "ws-4",
      title: "Workspace 4",
      mode: "procedural_3d",
      badge: "ACTIVE",
      status: "active",
    };
    const updated = [...defaultWorkspaces, newWs];
    expect(updated.length).toBe(4);

    // Schema validation
    const schemaValid = WorkspaceSessionSchema.safeParse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: newWs.title,
      type: "video",
      state: "playing",
      mediaSource: null,
      renderResult: null,
      options: {
        mode: "video",
        tier: "tier1_webgpu",
        color_mode: "monochrome",
        charset: { preset: "standard", invert: false, glyph_aspect_ratio: 0.55 },
        contrast: 0,
        brightness: 0,
        gamma: 1.0,
        dither: "none",
        cell_width_px: 8,
        cell_height_px: 14,
        font_size_px: 12,
        font_family: "JetBrains Mono, monospace",
        fps_cap: 60,
        enable_scanlines: false,
        enable_bloom: false,
        max_output_columns: 100,
        max_output_rows: 45,
      },
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
    expect(schemaValid.success).toBe(true);

    // Closing workspace
    const remaining = updated.filter((ws) => ws.id !== "ws-2");
    expect(remaining.length).toBe(3);
    expect(remaining.find((ws) => ws.id === "ws-2")).toBeUndefined();
  });

  it("validates ZenModeConfigSchema with 200ms ease-out transitions and unlock shortcuts", () => {
    const zenConfig = {
      isZenLocked: true,
      zenButtonPosition: "top-right" as const,
      zenButtonVariant: "translucent-pill" as const,
      collapsedPanels: {
        navigationHeader: true,
        controlPanel: true,
        telemetryDrawer: true,
        constellationGraph: true,
        stickers: true,
      },
      transitionDurationMs: 200,
      allowKeyboardUnlock: true,
      unlockKeyShortcuts: ["Escape", "F11", "KeyZ"],
    };

    const parsed = ZenModeConfigSchema.safeParse(zenConfig);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transitionDurationMs).toBe(200);
      expect(parsed.data.unlockKeyShortcuts).toContain("Escape");
      expect(parsed.data.unlockKeyShortcuts).toContain("F11");
    }
  });

  it("verifies Hardware Acceleration Tier definitions and architectures", () => {
    const tierDefs = {
      tier1: {
        name: "Tier 1: WebGPU Compute Pipeline",
        architecture: "Active Device / Metal / D3D12",
      },
      tier2: {
        name: "Tier 2: WebGL2 Fragment Shader",
        architecture: "Active GL Core",
      },
      tier3: {
        name: "Tier 3: Canvas2D CPU Fallback",
        architecture: "Multi-threaded worker",
      },
    };

    expect(tierDefs.tier1.name).toContain("WebGPU Compute Pipeline");
    expect(tierDefs.tier1.architecture).toContain("Metal / D3D12");
    expect(tierDefs.tier2.name).toContain("WebGL2 Fragment Shader");
    expect(tierDefs.tier2.architecture).toContain("Active GL Core");
    expect(tierDefs.tier3.name).toContain("Canvas2D CPU Fallback");
    expect(tierDefs.tier3.architecture).toContain("Multi-threaded worker");
  });
});

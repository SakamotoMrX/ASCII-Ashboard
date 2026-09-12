import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceManager } from "../engine/workspace-manager";
import { VideoStreamingEngine } from "../engine/video-pipeline";
import { AsciiRenderOptions } from "../contracts";

describe("WorkspaceManager Lifecycle & Collision Prevention", () => {
  let manager: WorkspaceManager;

  const sampleOptions: AsciiRenderOptions = {
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
    dither: "none",
    cell_width_px: 8,
    cell_height_px: 14,
    font_size_px: 12,
    font_family: "JetBrains Mono",
    fps_cap: 60,
    enable_scanlines: false,
    enable_bloom: false,
    max_output_columns: 80,
    max_output_rows: 40,
  };

  beforeEach(() => {
    manager = new WorkspaceManager(sampleOptions);
  });

  describe("Session Initialization & Isolation", () => {
    it("initializes with a default 3D procedural workspace", () => {
      const active = manager.getActiveWorkspace();
      expect(active).toBeDefined();
      expect(active.type).toBe("procedural_3d");
      expect(active.isActive).toBe(true);
      expect(active.name).toBe("3D Procedural");
      expect(active.options.mode).toBe("procedural_3d");
      expect(manager.getAllWorkspaces()).toHaveLength(1);
    });

    it("creates distinct workspaces with isolated options instances", () => {
      const ws3d = manager.getActiveWorkspace();

      const wsVideo = manager.createWorkspace({
        name: "Video: trailer.mp4",
        type: "video",
        isActive: false,
      });

      const wsImage = manager.createWorkspace({
        name: "Image: portrait.png",
        type: "image",
        isActive: false,
      });

      expect(manager.getAllWorkspaces()).toHaveLength(3);
      expect(wsVideo.id).not.toBe(ws3d.id);
      expect(wsImage.id).not.toBe(wsVideo.id);

      // Deep clone test: mutate options in wsVideo, verify ws3d and wsImage remain untouched
      wsVideo.options.contrast = 45;
      wsVideo.options.color_mode = "truecolor";

      expect(wsVideo.options.contrast).toBe(45);
      expect(wsVideo.options.color_mode).toBe("truecolor");
      expect(ws3d.options.contrast).toBe(0);
      expect(ws3d.options.color_mode).toBe("monochrome");
      expect(wsImage.options.contrast).toBe(0);
      expect(wsImage.options.color_mode).toBe("monochrome");
    });
  });

  describe("Workspace Switching & Clean Video Loop Suspension", () => {
    it("cleanly pauses outgoing video engine when switching to procedural 3D", () => {
      // 1. Create procedural 3D workspace
      const ws3d = manager.getActiveWorkspace();

      // 2. Create video workspace with an attached video engine
      const mockVideoEngine = new VideoStreamingEngine(sampleOptions);
      const pauseSpy = vi.spyOn(mockVideoEngine, "pause");

      const wsVideo = manager.createWorkspace({
        name: "Video: matrix.mp4",
        type: "video",
        videoEngine: mockVideoEngine,
        isActive: true,
        videoState: {
          isPlaying: true,
          isLooping: true,
          currentTime: 14.2,
          duration: 120.0,
          fileName: "matrix.mp4",
        },
      });

      expect(manager.getActiveWorkspace().id).toBe(wsVideo.id);
      expect(wsVideo.isActive).toBe(true);
      expect(ws3d.isActive).toBe(false);

      // 3. Switch back to procedural 3D workspace
      manager.switchWorkspace(ws3d.id);

      // Verification of zero collision:
      // Outgoing video engine's pause() was invoked
      expect(pauseSpy).toHaveBeenCalledTimes(1);
      expect(wsVideo.videoState?.isPlaying).toBe(false);
      expect(wsVideo.isActive).toBe(false);
      expect(ws3d.isActive).toBe(true);
      expect(manager.getActiveWorkspace().id).toBe(ws3d.id);
    });

    it("prevents video loaded in 'video-1' from conflicting with procedural '3d-1' or image 'img-1'", () => {
      // Video workspace
      const videoEngine = new VideoStreamingEngine(sampleOptions);
      const pauseSpy = vi.spyOn(videoEngine, "pause");
      const wsVideo = manager.createWorkspace({
        id: "video-1",
        name: "Video-1",
        type: "video",
        videoEngine,
        asciiOutput: "ASCII_VIDEO_FRAME_120",
        isActive: true,
        videoState: {
          isPlaying: true,
          isLooping: true,
          currentTime: 5.0,
          duration: 30.0,
          fileName: "clip.mp4",
        },
      });

      // Procedural workspace
      const ws3d = manager.createWorkspace({
        id: "3d-1",
        name: "3D-1",
        type: "procedural_3d",
        asciiOutput: "ASCII_3D_DONUT",
        isActive: false,
      });

      // Image workspace
      const wsImg = manager.createWorkspace({
        id: "img-1",
        name: "Img-1",
        type: "image",
        asciiOutput: "ASCII_IMAGE_STILL",
        isActive: false,
      });

      // Switch to 3d-1: video-1 paused
      manager.switchWorkspace("3d-1");
      expect(pauseSpy).toHaveBeenCalledTimes(1);
      expect(manager.getActiveWorkspace().asciiOutput).toBe("ASCII_3D_DONUT");
      expect(manager.getWorkspace("video-1")?.asciiOutput).toBe("ASCII_VIDEO_FRAME_120");

      // Switch to img-1:
      manager.switchWorkspace("img-1");
      expect(manager.getActiveWorkspace().asciiOutput).toBe("ASCII_IMAGE_STILL");
      expect(manager.getWorkspace("video-1")?.asciiOutput).toBe("ASCII_VIDEO_FRAME_120");
      expect(manager.getWorkspace("3d-1")?.asciiOutput).toBe("ASCII_3D_DONUT");

      // Verify each workspace retained its own output and state completely intact
      expect(wsVideo.asciiOutput).toBe("ASCII_VIDEO_FRAME_120");
      expect(ws3d.asciiOutput).toBe("ASCII_3D_DONUT");
      expect(wsImg.asciiOutput).toBe("ASCII_IMAGE_STILL");
    });
  });

  describe("Lifecycle Disposal & Boundary Handling", () => {
    it("disposes video engine resources when a workspace is closed", () => {
      const mockVideoEngine = new VideoStreamingEngine(sampleOptions);
      const disposeSpy = vi.spyOn(mockVideoEngine, "dispose");

      manager.createWorkspace({
        id: "video-close-test",
        name: "Video To Close",
        type: "video",
        videoEngine: mockVideoEngine,
        isActive: true,
      });

      expect(manager.getWorkspace("video-close-test")).toBeDefined();

      manager.removeWorkspace("video-close-test");

      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(manager.getWorkspace("video-close-test")).toBeUndefined();
    });

    it("automatically creates a fallback workspace if the last workspace is removed", () => {
      const all = manager.getAllWorkspaces();
      for (const ws of all) {
        manager.removeWorkspace(ws.id);
      }

      const active = manager.getActiveWorkspace();
      expect(active).toBeDefined();
      expect(active.type).toBe("procedural_3d");
      expect(manager.getAllWorkspaces().length).toBeGreaterThanOrEqual(1);
    });

    it("enforces max concurrent workspaces limit and evicts oldest inactive", () => {
      // Manager limit is 8
      for (let i = 0; i < 10; i++) {
        manager.createWorkspace({
          id: `ws-bulk-${i}`,
          name: `Bulk Workspace ${i}`,
          type: "procedural_3d",
          isActive: false,
        });
      }

      const total = manager.getAllWorkspaces().length;
      expect(total).toBeLessThanOrEqual(8);
    });

    it("throws a descriptive error when switching to a non-existent workspace ID", () => {
      expect(() => {
        manager.switchWorkspace("non-existent-workspace-xyz");
      }).toThrow('Workspace with ID "non-existent-workspace-xyz" not found.');
    });

    it("throws a descriptive error when updating a non-existent workspace ID", () => {
      expect(() => {
        manager.updateWorkspace("non-existent-workspace-xyz", { name: "New Name" });
      }).toThrow('Workspace with ID "non-existent-workspace-xyz" not found.');
    });

    it("pauses all background video engines cleanly via pauseAllExcept", () => {
      const engine1 = new VideoStreamingEngine(sampleOptions);
      const engine2 = new VideoStreamingEngine(sampleOptions);
      const pause1 = vi.spyOn(engine1, "pause");
      const pause2 = vi.spyOn(engine2, "pause");

      manager.createWorkspace({
        id: "v-1",
        type: "video",
        videoEngine: engine1,
        videoState: { isPlaying: true, isLooping: true, currentTime: 0, duration: 10, fileName: "1.mp4" },
      });

      manager.createWorkspace({
        id: "v-2",
        type: "video",
        videoEngine: engine2,
        videoState: { isPlaying: true, isLooping: true, currentTime: 0, duration: 10, fileName: "2.mp4" },
      });

      manager.pauseAllExcept("v-2");

      expect(pause1).toHaveBeenCalledTimes(1);
      expect(pause2).not.toHaveBeenCalled();
    });
  });
});

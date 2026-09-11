import { describe, it, expect } from "vitest";
import {
  PlatformTypeSchema,
  RenderTierSchema,
  RenderModeSchema,
  CharsetPresetSchema,
  ColorModeSchema,
  ProceduralSceneSchema,
  DitherAlgorithmSchema,
  SandboxCapabilitySchema,
  CharsetConfigSchema,
  AsciiRenderOptionsSchema,
  Procedural3DParamsSchema,
  IpcRenderRequestSchema,
  IpcRenderResponseSchema,
  IpcStreamingFrameSchema,
  MotionLifecycleContractSchema,
  DesignTokensContractSchema,
  PageCopySchema,
  BreakingScenarioSchema,
} from "../contracts";

describe("Contracts & Schemas Verification", () => {
  it("validates PlatformTypeSchema", () => {
    expect(PlatformTypeSchema.safeParse("macos").success).toBe(true);
    expect(PlatformTypeSchema.safeParse("android").success).toBe(true);
    expect(PlatformTypeSchema.safeParse("ios").success).toBe(false);
  });

  it("validates RenderTierSchema and RenderModeSchema", () => {
    expect(RenderTierSchema.safeParse("tier1_webgpu").success).toBe(true);
    expect(RenderTierSchema.safeParse("tier2_webgl").success).toBe(true);
    expect(RenderTierSchema.safeParse("tier3_canvas2d").success).toBe(true);
    expect(RenderTierSchema.safeParse("rust_sidecar").success).toBe(true);
    expect(RenderTierSchema.safeParse("directx").success).toBe(false);

    expect(RenderModeSchema.safeParse("image").success).toBe(true);
    expect(RenderModeSchema.safeParse("video").success).toBe(true);
    expect(RenderModeSchema.safeParse("procedural_3d").success).toBe(true);
    expect(RenderModeSchema.safeParse("camera_stream").success).toBe(true);
  });

  it("validates Charset, Color, Scene, and Dither Schemas", () => {
    expect(CharsetPresetSchema.safeParse("standard").success).toBe(true);
    expect(CharsetPresetSchema.safeParse("extended").success).toBe(true);
    expect(ColorModeSchema.safeParse("matrix_green").success).toBe(true);
    expect(ProceduralSceneSchema.safeParse("donut").success).toBe(true);
    expect(DitherAlgorithmSchema.safeParse("floyd_steinberg").success).toBe(true);

    const charsetConfig = {
      preset: "standard",
      invert: true,
      glyph_aspect_ratio: 0.55,
    };
    expect(CharsetConfigSchema.safeParse(charsetConfig).success).toBe(true);
  });

  it("validates SandboxCapabilitySchema with strict memory ceiling", () => {
    const valid = {
      identifier: "default",
      platform: "android",
      allow_file_system_read: true,
      allow_file_system_write: false,
      allow_camera: true,
      allow_sidecar_execution: false,
      allowed_paths: ["/data/user/0/com.asciiart.app"],
      max_memory_mb: 2048,
      max_ipc_payload_bytes: 33554432,
      csp_header: "default-src 'self'",
    };
    const parsed = SandboxCapabilitySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.max_memory_mb).toBe(2048);
      expect(parsed.data.platform).toBe("android");
    }

    // Negative: memory > 4096MB ceiling
    const invalid = { ...valid, max_memory_mb: 8192 };
    expect(SandboxCapabilitySchema.safeParse(invalid).success).toBe(false);
  });

  it("validates AsciiRenderOptionsSchema defaults and bounds", () => {
    const defaultOptions = {
      mode: "image",
      tier: "tier1_webgpu",
      color_mode: "monochrome",
      charset: {
        preset: "standard",
        invert: false,
        glyph_aspect_ratio: 0.55,
      },
      contrast: 10,
      brightness: -5,
      gamma: 1.2,
      dither: "none",
      cell_width_px: 8,
      cell_height_px: 14,
      font_size_px: 12,
      font_family: "JetBrains Mono",
      fps_cap: 60,
      enable_scanlines: false,
      enable_bloom: false,
      max_output_columns: 120,
      max_output_rows: 60,
    };
    const parsed = AsciiRenderOptionsSchema.safeParse(defaultOptions);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.contrast).toBe(10);
      expect(parsed.data.max_output_columns).toBe(120);
    }

    // Negative test: invalid contrast out of range [-100, 100]
    const outOfBounds = { ...defaultOptions, contrast: 150 };
    expect(AsciiRenderOptionsSchema.safeParse(outOfBounds).success).toBe(false);
  });

  it("validates Procedural3DParamsSchema and IPC schemas", () => {
    const procParams = {
      scene: "donut",
      rotation_speed_x: 1.0,
      rotation_speed_y: 1.0,
      rotation_speed_z: 0.0,
      camera_distance: 5.0,
      field_of_view: 60,
      light_direction: [0, 1, -1] as [number, number, number],
      ambient_light: 0.2,
      specular_strength: 0.5,
    };
    expect(Procedural3DParamsSchema.safeParse(procParams).success).toBe(true);

    const ipcReq = {
      request_id: "a0000000-0000-0000-0000-000000000001",
      timestamp_ms: 1000,
      options: {
        mode: "image",
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
        font_family: "monospace",
        fps_cap: 60,
        enable_scanlines: false,
        enable_bloom: false,
        max_output_columns: 100,
        max_output_rows: 50,
      },
      source_type: "procedural",
      source_payload: "donut",
    };
    expect(IpcRenderRequestSchema.safeParse(ipcReq).success).toBe(true);

    const ipcRes = {
      request_id: "a0000000-0000-0000-0000-000000000001",
      success: true,
      execution_tier_used: "tier1_webgpu",
      render_duration_ms: 1.5,
      columns: 100,
      rows: 50,
      ascii_text: "...",
      error_message: null,
    };
    expect(IpcRenderResponseSchema.safeParse(ipcRes).success).toBe(true);

    const streamingFrame = {
      stream_id: "a0000000-0000-0000-0000-000000000002",
      frame_index: 10,
      timestamp_ms: 2000,
      delta_ms: 16.6,
      fps_actual: 60.0,
      ascii_text: "...",
      dropped_frames: 0,
    };
    expect(IpcStreamingFrameSchema.safeParse(streamingFrame).success).toBe(true);
  });

  it("validates MotionLifecycleContractSchema and DesignTokensContractSchema", () => {
    const motion = {
      entry: "AnimatePresence mode=wait (single orchestrated character matrix cascade on load)",
      exit: "opacity: 0, scale: 0.98, duration: 0.25s, ease: easeOut",
      unmount_cleanup: "WebGL context lost handled, Canvas2D detached, Web Worker terminated, RAF cancelled, memory scrubbed",
      orchestrated_moment: "initial_grid_reveal_and_mode_switch",
      static_transitions_default: true,
    };
    expect(MotionLifecycleContractSchema.safeParse(motion).success).toBe(true);

    const tokens = {
      palette: {
        bg_deep: "#0a0a0f",
        bg_surface: "#12121a",
        bg_surface_elevated: "#1a1a26",
        primary_phosphor: "#00ff88",
        accent_crimson: "#ff3366",
        text_bright: "#f0f0f5",
        text_muted: "#8b8b9e",
        border_subtle: "#262638",
        glow_phosphor: "rgba(0, 255, 136, 0.15)",
        error_state: "#ff4444",
      },
      typography: {
        font_mono_display: "JetBrains Mono, IBM Plex Mono, monospace",
        font_mono_body: "IBM Plex Mono, monospace",
        font_ascii_grid: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        line_length_max: "80ch",
      },
      radii: {
        card_radius: "6px",
        button_radius: "4px",
        tag_radius: "2px",
      },
      motion: {
        duration_standard: "180ms",
        duration_emphasis: "320ms",
        timing_function: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    };
    expect(DesignTokensContractSchema.safeParse(tokens).success).toBe(true);
  });

  it("validates BreakingScenarioSchema", () => {
    const stress = {
      id: "STRESS-1",
      name: "Massive 8K Image Payload",
      vector: "User uploads 8192x8192 image",
      stress_parameters: { width: 8192 },
      vulnerability_surface: "Browser OOM",
      expected_defense: "Pre-flight clamp",
      failure_threshold_ms: 300,
      recovery_action: "Downsample to 2048x2048",
    };
    expect(BreakingScenarioSchema.safeParse(stress).success).toBe(true);
  });

  it("validates PageCopySchema with zero-lorem invariant", () => {
    const lockedCopy = {
      brand: {
        name: "ASCII Studio Desktop",
        tagline: "Sealed Multiplatform Terminal & GPU ASCII Engine",
        status_sandbox: "Sandbox Sealed (Tauri ACL Active)",
      },
      navigation: {
        tab_image: "Image Converter",
        tab_video: "Video Streamer",
        tab_procedural: "3D Procedural",
        tab_camera: "Live Camera",
        tab_settings: "Sandbox & Engines",
      },
      hero: {
        headline: "High-Throughput ASCII Art Engine",
        subheading:
          "Render real-time 3D geometry, high-resolution images, and video streams into crystal-clear ASCII grids with WebGPU acceleration and zero sandbox leakage.",
      },
      controls: {
        btn_import_image: "Select Source Image",
        btn_import_video: "Select Video File",
        btn_start_stream: "Start Camera Stream",
        btn_stop_stream: "Stop Camera Stream",
        btn_render_frame: "Render ASCII Frame",
        btn_export_txt: "Export Text (.txt)",
        btn_export_png: "Export Canvas PNG",
        btn_copy_clipboard: "Copy to Clipboard",
        btn_copied_feedback: "Copied to Clipboard",
        label_contrast: "Contrast Adjust",
        label_brightness: "Brightness Adjust",
        label_gamma: "Gamma Correction",
        label_charset_select: "Character Ramp Preset",
        label_color_mode: "Color Matrix Output",
        label_tier_select: "Hardware Acceleration Tier",
        label_resolution: "Grid Resolution (Columns x Rows)",
      },
      procedural_scenes: {
        donut_title: "Rotating Torus (Donut)",
        sphere_title: "Lambertian Sphere",
        cube_title: "Wireframe / Solid Cube",
        planet_title: "Orbiting Planet & Rings",
        blackhole_title: "Gravitational Lensing Black Hole",
      },
      engine_tiers: {
        tier1_title: "WebGPU Compute Atlas (Primary - 60 FPS)",
        tier2_title: "WebGL2 Fragment Shader (Fallback 1)",
        tier3_title: "Canvas 2D CPU Rasterizer (Fallback 2)",
        sidecar_title: "Rust Native Sidecar (Heavy Batch I/O)",
      },
      empty_state: {
        title: "No Source Media Loaded",
        description:
          "Drop an image, choose a 3D procedural demo, or start the camera to begin generating ASCII art.",
        action: "Load Demo Scene",
      },
      error_boundary: {
        title: "Renderer Fault Encountered",
        description:
          "The active GPU context was interrupted or the input buffer exceeded platform memory limits. The engine has automatically reset the render canvas.",
        btn_fallback_tier: "Switch to Canvas 2D Fallback",
        btn_retry: "Restart Renderer Engine",
      },
      confirmation: {
        export_success: "ASCII Art successfully saved to target path.",
        sidecar_healthy: "Rust Engine Sidecar connected and operational.",
        acl_verified: "Tauri Sandbox capabilities verified. Filesystem isolation active.",
      },
    };
    const parsed = PageCopySchema.safeParse(lockedCopy);
    expect(parsed.success).toBe(true);
  });
});


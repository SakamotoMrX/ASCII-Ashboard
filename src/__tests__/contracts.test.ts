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
  MediaPickerStateSchema,
  CameraConfigSchema,
  RecordingMetadataSchema,
  SnapshotMetadataSchema,
  MediaPickerErrorSchema,
  VideoProcessorContractSchema,
  ImageProcessorContractSchema,
  CameraProcessorContractSchema,
  AsciiRenderEngineContractSchema,
  ColorTokensSchema,
  MONOCHROME_COLOR_TOKENS,
  LoadingAnimationStateSchema,
  NodeGraphModelSchema,
  StickerCollectionSchema,
  Phase1ContractsSchema,
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

  it("validates MediaPicker Schemas", () => {
    expect(MediaPickerStateSchema.safeParse("idle").success).toBe(true);
    expect(MediaPickerStateSchema.safeParse("recording").success).toBe(true);
    expect(MediaPickerStateSchema.safeParse("captured").success).toBe(true);
    expect(MediaPickerStateSchema.safeParse("uploaded").success).toBe(true);

    const cameraCfg = {
      facingMode: "user",
      width: 1280,
      height: 720,
      frameRate: 30,
      audio: false,
    };
    expect(CameraConfigSchema.safeParse(cameraCfg).success).toBe(true);

    const recording = {
      durationMs: 5000,
      mimeType: "video/webm",
      fileSizeBytes: 10240,
      blobUrl: "blob:http://localhost/test",
      createdAt: new Date().toISOString(),
      videoWidth: 1280,
      videoHeight: 720,
    };
    expect(RecordingMetadataSchema.safeParse(recording).success).toBe(true);

    const snapshot = {
      dataUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      mimeType: "image/jpeg",
      width: 640,
      height: 480,
      fileSizeBytes: 1024,
      capturedAt: new Date().toISOString(),
    };
    expect(SnapshotMetadataSchema.safeParse(snapshot).success).toBe(true);

    const err = {
      code: "PERMISSION_DENIED",
      message: "Camera permission denied",
      recoverable: true,
    };
    expect(MediaPickerErrorSchema.safeParse(err).success).toBe(true);
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
      request_id: "a0000000-0000-4000-8000-000000000001",
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
        font_family: "JetBrains Mono, IBM Plex Mono, monospace",
        fps_cap: 60,
        enable_scanlines: false,
        enable_bloom: false,
        max_output_columns: 100,
        max_output_rows: 50,
      },
      source_type: "procedural",
      source_payload: "donut",
    };
    const parsedReq = IpcRenderRequestSchema.safeParse(ipcReq);
    if (!parsedReq.success) {
      console.error("IpcRenderRequestSchema parse error:", parsedReq.error);
    }
    expect(parsedReq.success).toBe(true);

    const ipcRes = {
      request_id: "a0000000-0000-4000-8000-000000000001",
      success: true,
      execution_tier_used: "tier1_webgpu",
      render_duration_ms: 1.5,
      columns: 100,
      rows: 50,
      ascii_text: "...",
      error_message: null,
    };
    const parsedRes = IpcRenderResponseSchema.safeParse(ipcRes);
    if (!parsedRes.success) {
      console.error("IpcRenderResponseSchema error:", parsedRes.error);
    }
    expect(parsedRes.success).toBe(true);

    const streamingFrame = {
      stream_id: "a0000000-0000-4000-8000-000000000002",
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
        background: "#121212",
        surface: "#1a1a1a",
        surface_elevated: "#242424",
        primary: "#3B82F6",
        primary_hover: "#2563EB",
        primary_muted: "rgba(59, 130, 246, 0.12)",
        accent: "#3B82F6",
        text_primary: "#FAFAFA",
        text_secondary: "#A1A1AA",
        text_muted: "#71717A",
        border: "rgba(255, 255, 255, 0.06)",
        border_focus: "#3B82F6",
        status_recording: "#EF4444",
        status_success: "#22C55E",
        status_error: "#EF4444",
      },
      typography: {
        font_sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        font_mono: "JetBrains Mono, Menlo, monospace",
        weights: {
          regular: 400,
          semibold: 600,
        },
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
        tagline: "Dark Minimalist Terminal & Real-Time ASCII Engine",
        status_sandbox: "Tauri Native Sandbox Sealed",
      },
      navigation: {
        tab_image: "Image",
        tab_video: "Video",
        tab_procedural: "3D Procedural",
        tab_camera: "Live Camera",
        tab_settings: "Settings",
      },
      hero: {
        headline: "Real-Time ASCII Art Engine",
        subheading:
          "Transform images, video streams, and live camera input into high-contrast ASCII grids.",
      },
      media_picker: {
        title: "Media Source Selection",
        description:
          "Drop video files, connect live camera, or capture stills directly into the ASCII pipeline.",
        dropzone_prompt: "Drop video file here or click to browse",
        dropzone_subtext: "Supports MP4, WebM, MOV up to 500MB",
        btn_browse: "Browse Video File",
        btn_start_camera: "Open Live Camera",
        btn_stop_camera: "Close Camera",
        btn_record_start: "Start Recording",
        btn_record_stop: "Stop Recording",
        btn_snap_photo: "Capture Snapshot",
        btn_retake: "Retake Media",
        btn_confirm_media: "Use in ASCII Engine",
        status_idle: "Awaiting media source selection",
        status_recording: "Recording live camera feed...",
        status_captured: "Media captured and ready for conversion",
        status_uploaded: "Video file loaded into engine",
      },
      permission_dialog: {
        title: "Camera Permission Required",
        description:
          "ASCII Studio requires camera access to stream live video and snap still frames. Please allow camera permissions in system settings.",
        btn_open_settings: "Open System Settings",
        btn_retry: "Retry Access",
        btn_dismiss: "Cancel",
        error_denied: "Camera permission denied by operating system.",
        error_no_device: "No compatible camera device detected on this system.",
        error_in_use: "Camera is currently in use by another application.",
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
        label_contrast: "Contrast",
        label_brightness: "Brightness",
        label_gamma: "Gamma",
        label_charset_select: "Character Ramp Preset",
        label_color_mode: "Color Matrix Output",
        label_tier_select: "Hardware Acceleration Tier",
        label_resolution: "Grid Dimensions",
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
          "Upload a video, snap a camera photo, or select a procedural 3D scene to begin.",
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
        media_loaded: "Media successfully initialized in ASCII pipeline.",
      },
    };
    const parsed = PageCopySchema.safeParse(lockedCopy);
    if (!parsed.success) {
      console.error("PageCopySchema parse error:", parsed.error);
    }
    expect(parsed.success).toBe(true);
  });

  it("validates VideoProcessorContractSchema, ImageProcessorContractSchema, and CameraProcessorContractSchema", () => {
    const videoContract = {
      state: "playing",
      config: {
        sourceUrl: "blob:http://localhost/test-video",
        fileName: "clip.mp4",
        fileSizeBytes: 1048576,
        mimeType: "video/mp4",
        targetColumns: 120,
        targetRows: 60,
        playbackRate: 1.0,
        loop: true,
        muted: true,
        autoPlay: true,
      },
      frameMetadata: {
        frameIndex: 42,
        mediaTimeSec: 1.4,
        durationSec: 10.0,
        videoWidth: 1920,
        videoHeight: 1080,
        outputColumns: 120,
        outputRows: 60,
        extractionDurationMs: 2.1,
        renderDurationMs: 4.5,
        fpsActual: 59.8,
        droppedFrames: 0,
      },
      error: null,
    };
    expect(VideoProcessorContractSchema.safeParse(videoContract).success).toBe(true);

    const imageContract = {
      state: "ready",
      fileName: "test.png",
      result: {
        asciiText: "###",
        columns: 120,
        rows: 60,
        originalWidth: 1920,
        originalHeight: 1080,
        rasterizedWidth: 120,
        rasterizedHeight: 60,
        renderDurationMs: 3.2,
        charCount: 7200,
      },
      errorMessage: null,
    };
    expect(ImageProcessorContractSchema.safeParse(imageContract).success).toBe(true);

    const cameraContract = {
      state: "streaming",
      activeDeviceId: "cam-default",
      activeResolution: { width: 1280, height: 720 },
      currentFps: 30,
      lastSnapshot: null,
      errorMessage: null,
    };
    expect(CameraProcessorContractSchema.safeParse(cameraContract).success).toBe(true);
  });

  it("validates AsciiRenderEngineContractSchema and Monochrome ColorTokens", () => {
    const engineContract = {
      state: "ready",
      activeMode: "video",
      activeTier: "tier3_canvas2d",
      options: {
        mode: "video",
        tier: "tier3_canvas2d",
        color_mode: "monochrome",
        charset: { preset: "standard", invert: false, glyph_aspect_ratio: 0.55 },
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
        max_output_columns: 120,
        max_output_rows: 60,
      },
      lastResult: null,
      gpuContextLost: false,
    };
    expect(AsciiRenderEngineContractSchema.safeParse(engineContract).success).toBe(true);

    // Validate MONOCHROME_COLOR_TOKENS against ColorTokensSchema
    expect(ColorTokensSchema.safeParse(MONOCHROME_COLOR_TOKENS).success).toBe(true);
    expect(MONOCHROME_COLOR_TOKENS.background).toBe("#000000");
    expect(MONOCHROME_COLOR_TOKENS.primary).toBe("#ffffff");
  });

  it("validates LoadingAnimationStateSchema, NodeGraphModelSchema, and StickerCollectionSchema", () => {
    const loadingState = {
      phase: "initializing",
      progress: 45,
      stepLabel: "Probing hardware tier...",
      elapsedMs: 650,
      isComplete: false,
      hardwareTierDetected: "tier3_canvas2d",
    };
    expect(LoadingAnimationStateSchema.safeParse(loadingState).success).toBe(true);

    const graphModel = {
      nodes: [
        {
          id: "node-source",
          label: "Video Decoder (rVFC)",
          type: "source",
          position: { x: 100, y: 150 },
          status: "active",
          metrics: { fps: 60, latencyMs: 2.5 },
          activeConnections: ["node-raster"],
        },
        {
          id: "node-raster",
          label: "ImageData Buffer",
          type: "rasterizer",
          position: { x: 300, y: 150 },
          status: "active",
          activeConnections: ["node-ascii"],
        },
        {
          id: "node-ascii",
          label: "Monochrome ASCII Kernel",
          type: "ascii_kernel",
          position: { x: 500, y: 150 },
          status: "active",
          activeConnections: [],
        },
      ],
      edges: [
        {
          id: "edge-1",
          sourceNodeId: "node-source",
          targetNodeId: "node-raster",
          status: "flowing",
          style: "solid",
        },
        {
          id: "edge-2",
          sourceNodeId: "node-raster",
          targetNodeId: "node-ascii",
          status: "flowing",
          style: "solid",
        },
      ],
      activePipelineId: "pipe-video-stream",
      constellationDensity: "regular",
    };
    expect(NodeGraphModelSchema.safeParse(graphModel).success).toBe(true);

    const stickerCollection = {
      stickers: [
        {
          id: "stk-tier",
          category: "tier",
          label: "TIER",
          value: "CANVAS2D_CPU",
          variant: "monochrome_pill",
          pinned: true,
        },
        {
          id: "stk-fps",
          category: "fps",
          label: "FPS",
          value: "60.0",
          variant: "dot_indicator",
          pinned: true,
        },
      ],
    };
    expect(StickerCollectionSchema.safeParse(stickerCollection).success).toBe(true);

    // Validate Phase1ContractsSchema is defined and is a Zod schema
    expect(Phase1ContractsSchema).toBeDefined();
    expect(typeof Phase1ContractsSchema.safeParse).toBe("function");
  });
});

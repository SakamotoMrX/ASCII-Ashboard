import { z } from "zod";

// ============================================================================
// 1. PLATFORM, SANDBOX & RUNTIME ENUMERATIONS
// ============================================================================

export const PlatformTypeSchema = z.enum(["macos", "windows", "android", "linux", "web"]);
export type PlatformType = z.infer<typeof PlatformTypeSchema>;

export const RenderTierSchema = z.enum([
  "tier1_webgpu",
  "tier2_webgl",
  "tier3_canvas2d",
  "rust_sidecar"
]);
export type RenderTier = z.infer<typeof RenderTierSchema>;

export const RenderModeSchema = z.enum([
  "image",
  "video",
  "procedural_3d",
  "camera_stream"
]);
export type RenderMode = z.infer<typeof RenderModeSchema>;

export const CharsetPresetSchema = z.enum([
  "standard",
  "extended",
  "block",
  "binary",
  "matrix",
  "custom"
]);
export type CharsetPreset = z.infer<typeof CharsetPresetSchema>;

export const ColorModeSchema = z.enum([
  "monochrome",
  "rgb_ansi",
  "truecolor",
  "matrix_green",
  "amber",
  "cyberpunk_neon"
]);
export type ColorMode = z.infer<typeof ColorModeSchema>;

export const ProceduralSceneSchema = z.enum([
  "donut",
  "sphere",
  "cube",
  "planet",
  "blackhole"
]);
export type ProceduralScene = z.infer<typeof ProceduralSceneSchema>;

export const DitherAlgorithmSchema = z.enum([
  "none",
  "floyd_steinberg",
  "ordered_bayer",
  "atkinson"
]);
export type DitherAlgorithm = z.infer<typeof DitherAlgorithmSchema>;

// ============================================================================
// 2. TAURI SANDBOX & ACL SECURITY CONTRACTS
// ============================================================================

export const SandboxCapabilitySchema = z.object({
  identifier: z.string().min(1),
  platform: PlatformTypeSchema,
  allow_file_system_read: z.boolean(),
  allow_file_system_write: z.boolean(),
  allow_camera: z.boolean(),
  allow_sidecar_execution: z.boolean(),
  allowed_paths: z.array(z.string()),
  max_memory_mb: z.number().int().positive().max(4096),
  max_ipc_payload_bytes: z.number().int().positive().max(32 * 1024 * 1024), // 32MB ceiling
  csp_header: z.string()
});
export type SandboxCapability = z.infer<typeof SandboxCapabilitySchema>;

// ============================================================================
// 3. ASCII RENDER OPTIONS & SCENE TRANSFORMS
// ============================================================================

export const CharsetConfigSchema = z.object({
  preset: CharsetPresetSchema,
  custom_glyphs: z.string().min(2).max(256).optional(),
  invert: z.boolean().default(false),
  glyph_aspect_ratio: z.number().positive().default(0.55) // Standard monospace cell ratio W/H
});
export type CharsetConfig = z.infer<typeof CharsetConfigSchema>;

export const AsciiRenderOptionsSchema = z.object({
  mode: RenderModeSchema,
  tier: RenderTierSchema,
  color_mode: ColorModeSchema,
  charset: CharsetConfigSchema,
  contrast: z.number().min(-100).max(100).default(0),
  brightness: z.number().min(-100).max(100).default(0),
  gamma: z.number().min(0.1).max(3.0).default(1.0),
  dither: DitherAlgorithmSchema.default("none"),
  cell_width_px: z.number().int().min(4).max(32).default(8),
  cell_height_px: z.number().int().min(6).max(48).default(14),
  font_size_px: z.number().int().min(6).max(36).default(12),
  font_family: z.string().default("JetBrains Mono, IBM Plex Mono, monospace"),
  fps_cap: z.number().int().min(1).max(120).default(60),
  enable_scanlines: z.boolean().default(false),
  enable_bloom: z.boolean().default(false),
  max_output_columns: z.number().int().min(20).max(400).default(120),
  max_output_rows: z.number().int().min(10).max(300).default(60)
});
export type AsciiRenderOptions = z.infer<typeof AsciiRenderOptionsSchema>;

export const Procedural3DParamsSchema = z.object({
  scene: ProceduralSceneSchema,
  rotation_speed_x: z.number().min(-5.0).max(5.0).default(1.0),
  rotation_speed_y: z.number().min(-5.0).max(5.0).default(1.0),
  rotation_speed_z: z.number().min(-5.0).max(5.0).default(0.0),
  camera_distance: z.number().min(1.0).max(50.0).default(5.0),
  field_of_view: z.number().min(30).max(120).default(60),
  light_direction: z.tuple([z.number(), z.number(), z.number()]).default([0.0, 1.0, -1.0]),
  ambient_light: z.number().min(0.0).max(1.0).default(0.2),
  specular_strength: z.number().min(0.0).max(2.0).default(0.5)
});
export type Procedural3DParams = z.infer<typeof Procedural3DParamsSchema>;

// ============================================================================
// 4. TAURI IPC & FRAME STREAMING CONTRACTS
// ============================================================================

export const IpcRenderRequestSchema = z.object({
  request_id: z.string().uuid(),
  timestamp_ms: z.number().nonnegative(),
  options: AsciiRenderOptionsSchema,
  source_type: z.enum(["file_path", "raw_rgba", "procedural", "base64_blob"]),
  source_payload: z.string(), // path or base64
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
});
export type IpcRenderRequest = z.infer<typeof IpcRenderRequestSchema>;

export const IpcRenderResponseSchema = z.object({
  request_id: z.string().uuid(),
  success: z.boolean(),
  execution_tier_used: RenderTierSchema,
  render_duration_ms: z.number().nonnegative(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  ascii_text: z.string(),
  color_indices: z.array(z.number().int()).optional(),
  rgba_palette: z.array(z.string()).optional(),
  error_message: z.string().nullable().default(null)
});
export type IpcRenderResponse = z.infer<typeof IpcRenderResponseSchema>;

export const IpcStreamingFrameSchema = z.object({
  stream_id: z.string().uuid(),
  frame_index: z.number().int().nonnegative(),
  timestamp_ms: z.number().nonnegative(),
  delta_ms: z.number().nonnegative(),
  fps_actual: z.number().nonnegative(),
  ascii_text: z.string(),
  dropped_frames: z.number().int().nonnegative().default(0)
});
export type IpcStreamingFrame = z.infer<typeof IpcStreamingFrameSchema>;

// ============================================================================
// 5. UNIFIED MEDIA PICKER & DESKTOP CONTRACTS
// ============================================================================

export const MediaPickerStateSchema = z.enum([
  "idle",
  "recording",
  "captured",
  "uploaded"
]);
export type MediaPickerState = z.infer<typeof MediaPickerStateSchema>;

export const MediaSourceTypeSchema = z.enum([
  "file_upload",
  "camera_stream",
  "video_recording",
  "photo_snapshot"
]);
export type MediaSourceType = z.infer<typeof MediaSourceTypeSchema>;

export const CameraFacingModeSchema = z.enum(["user", "environment"]);
export type CameraFacingMode = z.infer<typeof CameraFacingModeSchema>;

export const CameraConfigSchema = z.object({
  deviceId: z.string().optional(),
  facingMode: CameraFacingModeSchema.default("user"),
  width: z.number().int().positive().default(1280),
  height: z.number().int().positive().default(720),
  frameRate: z.number().positive().max(60).default(30),
  audio: z.boolean().default(false)
});
export type CameraConfig = z.infer<typeof CameraConfigSchema>;

export const RecordingMetadataSchema = z.object({
  durationMs: z.number().nonnegative(),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().nonnegative(),
  blobUrl: z.string().url().or(z.string().startsWith("blob:")),
  createdAt: z.string().datetime(),
  videoWidth: z.number().int().positive(),
  videoHeight: z.number().int().positive()
});
export type RecordingMetadata = z.infer<typeof RecordingMetadataSchema>;

export const SnapshotMetadataSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fileSizeBytes: z.number().nonnegative(),
  capturedAt: z.string().datetime()
});
export type SnapshotMetadata = z.infer<typeof SnapshotMetadataSchema>;

export const VideoUploadPayloadSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive().max(500 * 1024 * 1024), // 500MB safety limit
  mimeType: z.string().regex(/^video\//),
  objectUrl: z.string().url().or(z.string().startsWith("blob:")),
  durationSec: z.number().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
});
export type VideoUploadPayload = z.infer<typeof VideoUploadPayloadSchema>;

export const MediaPickerErrorSchema = z.object({
  code: z.enum([
    "PERMISSION_DENIED",
    "DEVICE_NOT_FOUND",
    "UNSUPPORTED_MIMETYPE",
    "OOM_FILE_TOO_LARGE",
    "TAURI_WEBVIEW_ERROR",
    "RECORDER_ABORTED",
    "MEDIA_TRACK_MUTED"
  ]),
  message: z.string().min(1),
  technicalDetails: z.string().optional(),
  recoverable: z.boolean().default(true)
});
export type MediaPickerError = z.infer<typeof MediaPickerErrorSchema>;

// ============================================================================
// 6. MOTION LIFECYCLE & DARK MINIMALIST DESIGN TOKENS CONTRACT (#121212 / #1a1a1a / #3B82F6)
// ============================================================================

export const MotionLifecycleContractSchema = z.object({
  entry: z.literal("AnimatePresence mode=wait (single orchestrated character matrix cascade on load)"),
  exit: z.literal("opacity: 0, scale: 0.98, duration: 0.25s, ease: easeOut"),
  unmount_cleanup: z.literal("WebGL context lost handled, Canvas2D detached, Web Worker terminated, RAF cancelled, memory scrubbed"),
  orchestrated_moment: z.literal("initial_grid_reveal_and_mode_switch"),
  static_transitions_default: z.literal(true)
});
export type MotionLifecycleContract = z.infer<typeof MotionLifecycleContractSchema>;

export const DesignTokensContractSchema = z.object({
  palette: z.object({
    background: z.literal("#121212"),
    surface: z.literal("#1a1a1a"),
    surface_elevated: z.literal("#242424"),
    primary: z.literal("#3B82F6"),
    primary_hover: z.literal("#2563EB"),
    primary_muted: z.literal("rgba(59, 130, 246, 0.12)"),
    accent: z.literal("#3B82F6"),
    text_primary: z.literal("#FAFAFA"),
    text_secondary: z.literal("#A1A1AA"),
    text_muted: z.literal("#71717A"),
    border: z.literal("rgba(255, 255, 255, 0.06)"),
    border_focus: z.literal("#3B82F6"),
    status_recording: z.literal("#EF4444"),
    status_success: z.literal("#22C55E"),
    status_error: z.literal("#EF4444")
  }),
  typography: z.object({
    font_sans: z.literal("Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"),
    font_mono: z.literal("JetBrains Mono, Menlo, monospace"),
    weights: z.object({
      regular: z.literal(400),
      semibold: z.literal(600)
    }),
    line_length_max: z.literal("80ch")
  }),
  radii: z.object({
    card_radius: z.literal("6px"),
    button_radius: z.literal("4px"),
    tag_radius: z.literal("2px")
  }),
  motion: z.object({
    duration_standard: z.literal("180ms"),
    duration_emphasis: z.literal("320ms"),
    timing_function: z.literal("cubic-bezier(0.16, 1, 0.3, 1)")
  })
});
export type DesignTokensContract = z.infer<typeof DesignTokensContractSchema>;

export const DarkMinimalistTokensSchema = DesignTokensContractSchema;
export type DarkMinimalistTokens = DesignTokensContract;

// ============================================================================
// 7. LOCKED REAL END-USER PAGE COPY (ZERO LOREM POLICY)
// ============================================================================

export const PageCopySchema = z.object({
  brand: z.object({
    name: z.literal("ASCII Studio Desktop"),
    tagline: z.literal("Dark Minimalist Terminal & Real-Time ASCII Engine"),
    status_sandbox: z.literal("Tauri Native Sandbox Sealed")
  }),
  navigation: z.object({
    tab_image: z.literal("Image"),
    tab_video: z.literal("Video"),
    tab_procedural: z.literal("3D Procedural"),
    tab_camera: z.literal("Live Camera"),
    tab_settings: z.literal("Settings")
  }),
  hero: z.object({
    headline: z.literal("Real-Time ASCII Art Engine"),
    subheading: z.literal("Transform images, video streams, and live camera input into high-contrast ASCII grids.")
  }),
  media_picker: z.object({
    title: z.literal("Media Source Selection"),
    description: z.literal("Drop video files, connect live camera, or capture stills directly into the ASCII pipeline."),
    dropzone_prompt: z.literal("Drop video file here or click to browse"),
    dropzone_subtext: z.literal("Supports MP4, WebM, MOV up to 500MB"),
    btn_browse: z.literal("Browse Video File"),
    btn_start_camera: z.literal("Open Live Camera"),
    btn_stop_camera: z.literal("Close Camera"),
    btn_record_start: z.literal("Start Recording"),
    btn_record_stop: z.literal("Stop Recording"),
    btn_snap_photo: z.literal("Capture Snapshot"),
    btn_retake: z.literal("Retake Media"),
    btn_confirm_media: z.literal("Use in ASCII Engine"),
    status_idle: z.literal("Awaiting media source selection"),
    status_recording: z.literal("Recording live camera feed..."),
    status_captured: z.literal("Media captured and ready for conversion"),
    status_uploaded: z.literal("Video file loaded into engine")
  }),
  permission_dialog: z.object({
    title: z.literal("Camera Permission Required"),
    description: z.literal("ASCII Studio requires camera access to stream live video and snap still frames. Please allow camera permissions in system settings."),
    btn_open_settings: z.literal("Open System Settings"),
    btn_retry: z.literal("Retry Access"),
    btn_dismiss: z.literal("Cancel"),
    error_denied: z.literal("Camera permission denied by operating system."),
    error_no_device: z.literal("No compatible camera device detected on this system."),
    error_in_use: z.literal("Camera is currently in use by another application.")
  }),
  controls: z.object({
    btn_import_image: z.literal("Select Source Image"),
    btn_import_video: z.literal("Select Video File"),
    btn_start_stream: z.literal("Start Camera Stream"),
    btn_stop_stream: z.literal("Stop Camera Stream"),
    btn_render_frame: z.literal("Render ASCII Frame"),
    btn_export_txt: z.literal("Export Text (.txt)"),
    btn_export_png: z.literal("Export Canvas PNG"),
    btn_copy_clipboard: z.literal("Copy to Clipboard"),
    btn_copied_feedback: z.literal("Copied to Clipboard"),
    label_contrast: z.literal("Contrast"),
    label_brightness: z.literal("Brightness"),
    label_gamma: z.literal("Gamma"),
    label_charset_select: z.literal("Character Ramp Preset"),
    label_color_mode: z.literal("Color Matrix Output"),
    label_tier_select: z.literal("Hardware Acceleration Tier"),
    label_resolution: z.literal("Grid Dimensions")
  }),
  procedural_scenes: z.object({
    donut_title: z.literal("Rotating Torus (Donut)"),
    sphere_title: z.literal("Lambertian Sphere"),
    cube_title: z.literal("Wireframe / Solid Cube"),
    planet_title: z.literal("Orbiting Planet & Rings"),
    blackhole_title: z.literal("Gravitational Lensing Black Hole")
  }),
  engine_tiers: z.object({
    tier1_title: z.literal("WebGPU Compute Atlas (Primary - 60 FPS)"),
    tier2_title: z.literal("WebGL2 Fragment Shader (Fallback 1)"),
    tier3_title: z.literal("Canvas 2D CPU Rasterizer (Fallback 2)"),
    sidecar_title: z.literal("Rust Native Sidecar (Heavy Batch I/O)")
  }),
  empty_state: z.object({
    title: z.literal("No Source Media Loaded"),
    description: z.literal("Upload a video, snap a camera photo, or select a procedural 3D scene to begin."),
    action: z.literal("Load Demo Scene")
  }),
  error_boundary: z.object({
    title: z.literal("Renderer Fault Encountered"),
    description: z.literal("The active GPU context was interrupted or the input buffer exceeded platform memory limits. The engine has automatically reset the render canvas."),
    btn_fallback_tier: z.literal("Switch to Canvas 2D Fallback"),
    btn_retry: z.literal("Restart Renderer Engine")
  }),
  confirmation: z.object({
    export_success: z.literal("ASCII Art successfully saved to target path."),
    sidecar_healthy: z.literal("Rust Engine Sidecar connected and operational."),
    acl_verified: z.literal("Tauri Sandbox capabilities verified. Filesystem isolation active."),
    media_loaded: z.literal("Media successfully initialized in ASCII pipeline.")
  })
});
export type PageCopy = z.infer<typeof PageCopySchema>;

// ============================================================================
// 8. SKEPTICAL BREAKING SCENARIO STRESS VECTORS
// ============================================================================

export const BreakingScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  vector: z.string(),
  stress_parameters: z.record(z.string(), z.any()),
  vulnerability_surface: z.string(),
  expected_defense: z.string(),
  failure_threshold_ms: z.number().int().positive(),
  recovery_action: z.string()
});
export type BreakingScenario = z.infer<typeof BreakingScenarioSchema>;

export const Phase1ContractsSchema = z.object({
  media_picker_state: MediaPickerStateSchema,
  media_source_type: MediaSourceTypeSchema,
  camera_config: CameraConfigSchema,
  recording_metadata: RecordingMetadataSchema,
  snapshot_metadata: SnapshotMetadataSchema,
  video_upload_payload: VideoUploadPayloadSchema,
  media_picker_error: MediaPickerErrorSchema,
  dark_minimalist_tokens: DarkMinimalistTokensSchema,
  sandbox: SandboxCapabilitySchema,
  ascii_options: AsciiRenderOptionsSchema,
  procedural_params: Procedural3DParamsSchema,
  ipc_request: IpcRenderRequestSchema,
  ipc_response: IpcRenderResponseSchema,
  ipc_frame: IpcStreamingFrameSchema,
  motion_lifecycle: MotionLifecycleContractSchema,
  design_tokens: DesignTokensContractSchema,
  page_copy: PageCopySchema,
  breaking_scenarios: z.array(BreakingScenarioSchema).min(4)
});
export type Phase1Contracts = z.infer<typeof Phase1ContractsSchema>;

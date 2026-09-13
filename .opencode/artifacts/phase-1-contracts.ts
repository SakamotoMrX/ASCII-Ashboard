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

export const MonochromeColorModeSchema = z.literal("monochrome");
export type MonochromeColorMode = z.infer<typeof MonochromeColorModeSchema>;

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
// 3. BACKGROUND REMOVAL & AUDIO & FASTFETCH WIDGET OPTIONS
// ============================================================================

export const BackgroundRemovalOptionsSchema = z.object({
  enabled: z.boolean().default(false),
  threshold: z.number().min(0).max(255).default(40), // Luminance or color distance tolerance
  feather: z.number().min(0).max(20).default(2), // Edge feathering / smoothing radius
  targetColor: z.enum(["black", "white", "custom", "auto_corner"]).default("auto_corner"),
  customHex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).default("#000000"),
  invertMask: z.boolean().default(false)
});
export type BackgroundRemovalOptions = z.infer<typeof BackgroundRemovalOptionsSchema>;

export const AudioOptionsSchema = z.object({
  enabled: z.boolean().default(true),
  volume: z.number().min(0.0).max(1.0).default(1.0),
  muted: z.boolean().default(false),
  preservePitch: z.boolean().default(true),
  visualizeOutput: z.boolean().default(false)
});
export type AudioOptions = z.infer<typeof AudioOptionsSchema>;

export const AudioStateSchema = z.object({
  contextState: z.enum(["uninitialized", "suspended", "running", "closed", "interrupted"]),
  volume: z.number().min(0.0).max(1.0),
  muted: z.boolean(),
  isAutoplayBlocked: z.boolean(),
  activeTrackName: z.string().nullable()
});
export type AudioState = z.infer<typeof AudioStateSchema>;

export const FastfetchWidgetOptionsSchema = z.object({
  enabled: z.boolean().default(true),
  compactMode: z.boolean().default(false),
  showGpuTelemetry: z.boolean().default(true),
  showAudioMeter: z.boolean().default(true),
  showSignalHistogram: z.boolean().default(false),
  refreshIntervalMs: z.number().int().min(100).max(5000).default(500)
});
export type FastfetchWidgetOptions = z.infer<typeof FastfetchWidgetOptionsSchema>;

export const SystemInfoSchema = z.object({
  os: z.string(),
  arch: z.string(),
  gpuAdapter: z.string(),
  gpuTier: RenderTierSchema,
  memoryUsageMb: z.number().nonnegative(),
  renderFps: z.number().nonnegative(),
  gridDimensions: z.string(),
  activePreset: CharsetPresetSchema,
  activeColorMatrix: ColorModeSchema,
  audioStatus: z.string(),
  uptimeSec: z.number().nonnegative()
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;

// ============================================================================
// 4. EXTENDED ASCII RENDER OPTIONS & SCENE TRANSFORMS
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
  // Extended signal adjustments
  exposure: z.number().min(-100).max(100).default(0),
  saturation: z.number().min(-100).max(100).default(0),
  sharpness: z.number().min(0).max(100).default(0),
  invert: z.boolean().default(false),
  edgeDetection: z.boolean().default(false),
  edgeThreshold: z.number().min(0).max(255).default(50),
  // Background removal options
  bgRemoval: BackgroundRemovalOptionsSchema.default({
    enabled: false,
    threshold: 40,
    feather: 2,
    targetColor: "auto_corner",
    customHex: "#000000",
    invertMask: false
  }),
  // Audio options
  audio: AudioOptionsSchema.default({
    enabled: true,
    volume: 1.0,
    muted: false,
    preservePitch: true,
    visualizeOutput: false
  }),
  // Fastfetch dashboard options
  fastfetch: FastfetchWidgetOptionsSchema.optional(),
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
// 5. TAURI IPC & FRAME STREAMING CONTRACTS
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
// 6. UNIFIED MEDIA PICKER & DESKTOP CONTRACTS
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
// 7. VIDEO PROCESSOR CONTRACTS & EXTRACTION PIPELINE
// ============================================================================

export const VideoProcessorStateSchema = z.enum([
  "idle",
  "loading",
  "ready",
  "playing",
  "paused",
  "seeking",
  "ended",
  "error"
]);
export type VideoProcessorState = z.infer<typeof VideoProcessorStateSchema>;

export const VideoSourceConfigSchema = z.object({
  sourceUrl: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().nonnegative(),
  mimeType: z.string().default("video/mp4"),
  targetColumns: z.number().int().min(20).max(400).default(120),
  targetRows: z.number().int().min(10).max(300).default(60),
  playbackRate: z.number().positive().max(4.0).default(1.0),
  loop: z.boolean().default(true),
  muted: z.boolean().default(false), // Audio enabled by default via WebAudio
  autoPlay: z.boolean().default(true)
});
export type VideoSourceConfig = z.infer<typeof VideoSourceConfigSchema>;

export const VideoFrameMetadataSchema = z.object({
  frameIndex: z.number().int().nonnegative(),
  mediaTimeSec: z.number().nonnegative(),
  durationSec: z.number().nonnegative(),
  videoWidth: z.number().int().positive(),
  videoHeight: z.number().int().positive(),
  outputColumns: z.number().int().positive(),
  outputRows: z.number().int().positive(),
  extractionDurationMs: z.number().nonnegative(),
  renderDurationMs: z.number().nonnegative(),
  fpsActual: z.number().nonnegative(),
  droppedFrames: z.number().int().nonnegative().default(0)
});
export type VideoFrameMetadata = z.infer<typeof VideoFrameMetadataSchema>;

export const VideoProcessorErrorSchema = z.object({
  code: z.enum([
    "VIDEO_LOAD_FAILED",
    "DECODE_ERROR",
    "AUTOPLAY_POLICY_BLOCKED",
    "AUDIO_CONTEXT_BLOCKED",
    "RVFC_NOT_SUPPORTED_FALLBACK_ACTIVE",
    "CANVAS_CONTEXT_LOST",
    "INVALID_DIMENSIONS",
    "PLAYBACK_STALLED"
  ]),
  message: z.string().min(1),
  recoverable: z.boolean().default(true),
  timestampMs: z.number().nonnegative()
});
export type VideoProcessorError = z.infer<typeof VideoProcessorErrorSchema>;

export const VideoProcessorContractSchema = z.object({
  state: VideoProcessorStateSchema,
  config: VideoSourceConfigSchema.nullable(),
  frameMetadata: VideoFrameMetadataSchema.nullable(),
  audioState: AudioStateSchema.nullable().default(null),
  error: VideoProcessorErrorSchema.nullable()
});
export type VideoProcessorContract = z.infer<typeof VideoProcessorContractSchema>;

// ============================================================================
// 8. IMAGE PROCESSOR CONTRACTS & PREFLIGHT PIPELINE
// ============================================================================

export const ImageProcessorStateSchema = z.enum([
  "idle",
  "preflight",
  "rasterizing",
  "ready",
  "error"
]);
export type ImageProcessorState = z.infer<typeof ImageProcessorStateSchema>;

export const ImagePreflightConfigSchema = z.object({
  maxDimensionPx: z.number().int().positive().default(2048),
  preserveAspectRatio: z.boolean().default(true),
  targetColumns: z.number().int().min(20).max(400).default(120),
  targetRows: z.number().int().min(10).max(300).default(60),
  invert: z.boolean().default(false),
  contrast: z.number().min(-100).max(100).default(0),
  brightness: z.number().min(-100).max(100).default(0),
  gamma: z.number().min(0.1).max(3.0).default(1.0),
  exposure: z.number().min(-100).max(100).default(0),
  saturation: z.number().min(-100).max(100).default(0),
  sharpness: z.number().min(0).max(100).default(0),
  edgeDetection: z.boolean().default(false),
  bgRemoval: BackgroundRemovalOptionsSchema.optional()
});
export type ImagePreflightConfig = z.infer<typeof ImagePreflightConfigSchema>;

export const ImageConversionResultSchema = z.object({
  asciiText: z.string(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  originalWidth: z.number().int().positive(),
  originalHeight: z.number().int().positive(),
  rasterizedWidth: z.number().int().positive(),
  rasterizedHeight: z.number().int().positive(),
  renderDurationMs: z.number().nonnegative(),
  charCount: z.number().int().positive()
});
export type ImageConversionResult = z.infer<typeof ImageConversionResultSchema>;

export const ImageProcessorContractSchema = z.object({
  state: ImageProcessorStateSchema,
  fileName: z.string().nullable(),
  result: ImageConversionResultSchema.nullable(),
  errorMessage: z.string().nullable()
});
export type ImageProcessorContract = z.infer<typeof ImageProcessorContractSchema>;

// ============================================================================
// 9. CAMERA PROCESSOR CONTRACTS & HARDWARE STREAMING
// ============================================================================

export const CameraProcessorStateSchema = z.enum([
  "idle",
  "requesting_permission",
  "streaming",
  "recording",
  "paused",
  "error"
]);
export type CameraProcessorState = z.infer<typeof CameraProcessorStateSchema>;

export const CameraStreamConfigSchema = z.object({
  deviceId: z.string().optional(),
  facingMode: CameraFacingModeSchema.default("user"),
  width: z.number().int().positive().default(1280),
  height: z.number().int().positive().default(720),
  targetFps: z.number().positive().max(60).default(30),
  targetColumns: z.number().int().min(20).max(400).default(120),
  targetRows: z.number().int().min(10).max(300).default(60)
});
export type CameraStreamConfig = z.infer<typeof CameraStreamConfigSchema>;

export const CameraSnapshotResultSchema = z.object({
  dataUrl: z.string().startsWith("data:image/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  capturedAtIso: z.string().datetime(),
  sizeBytes: z.number().nonnegative()
});
export type CameraSnapshotResult = z.infer<typeof CameraSnapshotResultSchema>;

export const CameraProcessorContractSchema = z.object({
  state: CameraProcessorStateSchema,
  activeDeviceId: z.string().nullable(),
  activeResolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }).nullable(),
  currentFps: z.number().nonnegative(),
  lastSnapshot: CameraSnapshotResultSchema.nullable(),
  errorMessage: z.string().nullable()
});
export type CameraProcessorContract = z.infer<typeof CameraProcessorContractSchema>;

// ============================================================================
// 10. ASCII RENDER ENGINE UNIFIED CONTRACT
// ============================================================================

export const AsciiRenderEngineStateSchema = z.enum([
  "uninitialized",
  "initializing",
  "ready",
  "rendering",
  "faulted",
  "disposed"
]);
export type AsciiRenderEngineState = z.infer<typeof AsciiRenderEngineStateSchema>;

export const AsciiRenderResultSchema = z.object({
  asciiText: z.string(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  durationMs: z.number().nonnegative(),
  activeTier: RenderTierSchema,
  fpsActual: z.number().nonnegative()
});
export type AsciiRenderResult = z.infer<typeof AsciiRenderResultSchema>;

export const AsciiRenderEngineContractSchema = z.object({
  state: AsciiRenderEngineStateSchema,
  activeMode: RenderModeSchema,
  activeTier: RenderTierSchema,
  options: AsciiRenderOptionsSchema,
  lastResult: AsciiRenderResultSchema.nullable(),
  gpuContextLost: z.boolean().default(false)
});
export type AsciiRenderEngineContract = z.infer<typeof AsciiRenderEngineContractSchema>;

// ============================================================================
// 11. LUXURY MONOCHROME COLOR TOKENS (#000000 / #0a0a0c / #141416 / #ffffff)
// ============================================================================

export const ColorTokensSchema = z.object({
  background: z.string(),
  surface: z.string(),
  surface_elevated: z.string(),
  surface_hover: z.string(),
  primary: z.string(),
  accent: z.string(),
  text_primary: z.string(),
  text_secondary: z.string(),
  text_muted: z.string(),
  border: z.string(),
  border_focus: z.string(),
  border_highlight: z.string(),
  graph_node_bg: z.string(),
  graph_node_border: z.string(),
  graph_edge: z.string(),
  graph_edge_active: z.string(),
  sticker_bg: z.string(),
  sticker_border: z.string(),
  sticker_text: z.string(),
  status_active: z.string(),
  status_idle: z.string(),
  status_recording: z.string()
});
export type ColorTokens = z.infer<typeof ColorTokensSchema>;

export const MONOCHROME_COLOR_TOKENS: ColorTokens = {
  background: "#000000",
  surface: "#0a0a0c",
  surface_elevated: "#141416",
  surface_hover: "#1c1c1e",
  primary: "#ffffff",
  accent: "#ffffff",
  text_primary: "#ffffff",
  text_secondary: "#a1a1aa",
  text_muted: "#71717a",
  border: "#222224",
  border_focus: "#ffffff",
  border_highlight: "rgba(255, 255, 255, 0.15)",
  graph_node_bg: "#0a0a0c",
  graph_node_border: "#27272a",
  graph_edge: "rgba(255, 255, 255, 0.12)",
  graph_edge_active: "rgba(255, 255, 255, 0.45)",
  sticker_bg: "#18181b",
  sticker_border: "#27272a",
  sticker_text: "#fafafa",
  status_active: "#ffffff",
  status_idle: "#71717a",
  status_recording: "#ef4444"
};

export const DesignTokensContractSchema = z.object({
  palette: z.object({
    background: z.string(),
    surface: z.string(),
    surface_elevated: z.string(),
    primary: z.string(),
    primary_hover: z.string(),
    primary_muted: z.string(),
    accent: z.string(),
    text_primary: z.string(),
    text_secondary: z.string(),
    text_muted: z.string(),
    border: z.string(),
    border_focus: z.string(),
    status_recording: z.string(),
    status_success: z.string(),
    status_error: z.string()
  }),
  typography: z.object({
    font_sans: z.string(),
    font_mono: z.string(),
    weights: z.object({
      regular: z.number(),
      semibold: z.number()
    }),
    line_length_max: z.string()
  }),
  radii: z.object({
    card_radius: z.string(),
    button_radius: z.string(),
    tag_radius: z.string()
  }),
  motion: z.object({
    duration_standard: z.string(),
    duration_emphasis: z.string(),
    timing_function: z.string()
  })
});
export type DesignTokensContract = z.infer<typeof DesignTokensContractSchema>;

export const DarkMinimalistTokensSchema = DesignTokensContractSchema;
export type DarkMinimalistTokens = DesignTokensContract;

// ============================================================================
// 12. ENTRANCE LOADING ANIMATION STATE CONTRACT
// ============================================================================

export const LoadingPhaseSchema = z.enum([
  "initializing",
  "probing_hardware",
  "compiling_shaders",
  "sealing_sandbox",
  "ready",
  "fade_out",
  "completed"
]);
export type LoadingPhase = z.infer<typeof LoadingPhaseSchema>;

export const LoadingAnimationStateSchema = z.object({
  phase: LoadingPhaseSchema,
  progress: z.number().min(0).max(100),
  stepLabel: z.string().min(1),
  elapsedMs: z.number().nonnegative(),
  isComplete: z.boolean(),
  hardwareTierDetected: RenderTierSchema.nullable().default(null)
});
export type LoadingAnimationState = z.infer<typeof LoadingAnimationStateSchema>;

export const LoadingAnimationConfigSchema = z.object({
  minDisplayDurationMs: z.number().int().positive().default(1200),
  maxTimeoutMs: z.number().int().positive().default(4000),
  orchestratedEasing: z.string().default("cubic-bezier(0.16, 1, 0.3, 1)"),
  showMatrixPulse: z.boolean().default(true)
});
export type LoadingAnimationConfig = z.infer<typeof LoadingAnimationConfigSchema>;

// ============================================================================
// 13. NODE GRAPH & TECHNICAL STICKERS LAYOUT MODELS
// ============================================================================

export const GraphNodeTypeSchema = z.enum([
  "source",
  "decoder",
  "preflight",
  "rasterizer",
  "lut_filter",
  "ascii_kernel",
  "display_output",
  "telemetry"
]);
export type GraphNodeType = z.infer<typeof GraphNodeTypeSchema>;

export const GraphNodeStatusSchema = z.enum([
  "active",
  "idle",
  "processing",
  "bypassed",
  "error"
]);
export type GraphNodeStatus = z.infer<typeof GraphNodeStatusSchema>;

export const GraphNodeMetricsSchema = z.object({
  fps: z.number().nonnegative().optional(),
  latencyMs: z.number().nonnegative().optional(),
  resolution: z.string().optional(),
  throughput: z.string().optional()
});
export type GraphNodeMetrics = z.infer<typeof GraphNodeMetricsSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: GraphNodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  status: GraphNodeStatusSchema,
  metrics: GraphNodeMetricsSchema.optional(),
  activeConnections: z.array(z.string()).default([])
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeStatusSchema = z.enum(["active", "idle", "flowing"]);
export type GraphEdgeStatus = z.infer<typeof GraphEdgeStatusSchema>;

export const GraphEdgeStyleSchema = z.enum(["solid", "dashed", "pulsing"]);
export type GraphEdgeStyle = z.infer<typeof GraphEdgeStyleSchema>;

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  status: GraphEdgeStatusSchema.default("idle"),
  style: GraphEdgeStyleSchema.default("solid")
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const NodeGraphModelSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  activePipelineId: z.string().min(1),
  constellationDensity: z.enum(["compact", "regular", "expanded"]).default("regular")
});
export type NodeGraphModel = z.infer<typeof NodeGraphModelSchema>;

export const StickerCategorySchema = z.enum([
  "status",
  "tier",
  "resolution",
  "fps",
  "codec",
  "security",
  "platform"
]);
export type StickerCategory = z.infer<typeof StickerCategorySchema>;

export const StickerVariantSchema = z.enum([
  "monochrome_pill",
  "wire_badge",
  "inverted_chip",
  "dot_indicator"
]);
export type StickerVariant = z.infer<typeof StickerVariantSchema>;

export const TechnicalStickerSchema = z.object({
  id: z.string().min(1),
  category: StickerCategorySchema,
  label: z.string().min(1),
  value: z.string().min(1),
  variant: StickerVariantSchema.default("monochrome_pill"),
  pinned: z.boolean().default(false)
});
export type TechnicalSticker = z.infer<typeof TechnicalStickerSchema>;

export const StickerCollectionSchema = z.object({
  stickers: z.array(TechnicalStickerSchema)
});
export type StickerCollection = z.infer<typeof StickerCollectionSchema>;

// ============================================================================
// 14. MOTION LIFECYCLE CONTRACT
// ============================================================================

export const MotionLifecycleContractSchema = z.object({
  entry: z.string(),
  exit: z.string(),
  unmount_cleanup: z.string(),
  orchestrated_moment: z.string(),
  static_transitions_default: z.boolean()
});
export type MotionLifecycleContract = z.infer<typeof MotionLifecycleContractSchema>;

// ============================================================================
// 15. LOCKED REAL END-USER PAGE COPY (ZERO LOREM POLICY)
// ============================================================================

export const PageCopySchema = z.object({
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    status_sandbox: z.string()
  }),
  navigation: z.object({
    tab_image: z.string(),
    tab_video: z.string(),
    tab_procedural: z.string(),
    tab_camera: z.string(),
    tab_settings: z.string()
  }),
  hero: z.object({
    headline: z.string(),
    subheading: z.string()
  }),
  media_picker: z.object({
    title: z.string(),
    description: z.string(),
    dropzone_prompt: z.string(),
    dropzone_subtext: z.string(),
    btn_browse: z.string(),
    btn_start_camera: z.string(),
    btn_stop_camera: z.string(),
    btn_record_start: z.string(),
    btn_record_stop: z.string(),
    btn_snap_photo: z.string(),
    btn_retake: z.string(),
    btn_confirm_media: z.string(),
    status_idle: z.string(),
    status_recording: z.string(),
    status_captured: z.string(),
    status_uploaded: z.string()
  }),
  permission_dialog: z.object({
    title: z.string(),
    description: z.string(),
    btn_open_settings: z.string(),
    btn_retry: z.string(),
    btn_dismiss: z.string(),
    error_denied: z.string(),
    error_no_device: z.string(),
    error_in_use: z.string()
  }),
  controls: z.object({
    btn_import_image: z.string(),
    btn_import_video: z.string(),
    btn_start_stream: z.string(),
    btn_stop_stream: z.string(),
    btn_render_frame: z.string(),
    btn_export_txt: z.string(),
    btn_export_png: z.string(),
    btn_copy_clipboard: z.string(),
    btn_copied_feedback: z.string(),
    label_contrast: z.string(),
    label_brightness: z.string(),
    label_gamma: z.string(),
    // Extended controls copy
    label_exposure: z.string(),
    label_saturation: z.string(),
    label_sharpness: z.string(),
    label_invert: z.string(),
    label_edge_detection: z.string(),
    label_edge_threshold: z.string(),
    label_bg_removal: z.string(),
    label_bg_threshold: z.string(),
    label_bg_feather: z.string(),
    label_bg_target_color: z.string(),
    label_audio_toggle: z.string(),
    label_audio_volume: z.string(),
    label_fastfetch_widget: z.string(),
    label_charset_select: z.string(),
    label_color_mode: z.string(),
    label_tier_select: z.string(),
    label_resolution: z.string()
  }),
  procedural_scenes: z.object({
    donut_title: z.string(),
    sphere_title: z.string(),
    cube_title: z.string(),
    planet_title: z.string(),
    blackhole_title: z.string()
  }),
  engine_tiers: z.object({
    tier1_title: z.string(),
    tier2_title: z.string(),
    tier3_title: z.string(),
    sidecar_title: z.string()
  }),
  empty_state: z.object({
    title: z.string(),
    description: z.string(),
    action: z.string()
  }),
  error_boundary: z.object({
    title: z.string(),
    description: z.string(),
    btn_fallback_tier: z.string(),
    btn_retry: z.string()
  }),
  confirmation: z.object({
    export_success: z.string(),
    sidecar_healthy: z.string(),
    acl_verified: z.string(),
    media_loaded: z.string()
  }),
  zen_mode: z.object({
    btn_enter_zen: z.string(),
    btn_exit_zen: z.string(),
    tooltip_zen: z.string(),
    status_zen_active: z.string()
  }).optional(),
  workspaces: z.object({
    tab_new_workspace: z.string(),
    btn_close_workspace: z.string(),
    empty_workspace_title: z.string(),
    empty_workspace_desc: z.string(),
    badge_active: z.string(),
    badge_paused: z.string()
  }).optional(),
  fastfetch: z.object({
    card_title: z.string(),
    badge_system: z.string(),
    label_os: z.string(),
    label_gpu: z.string(),
    label_tier: z.string(),
    label_grid: z.string(),
    label_fps: z.string(),
    label_vram: z.string(),
    label_audio: z.string(),
    btn_toggle_compact: z.string()
  }).optional(),
  node_graph: z.object({
    panel_title: z.string(),
    source_node: z.string(),
    raster_node: z.string(),
    ascii_node: z.string(),
    viewport_node: z.string(),
    telemetry_node: z.string()
  }).optional(),
  stickers: z.object({
    tier_label: z.string(),
    resolution_label: z.string(),
    fps_label: z.string(),
    engine_status_label: z.string(),
    sandbox_label: z.string()
  }).optional(),
  load_animation: z.object({
    initial_title: z.string(),
    hardware_detect: z.string(),
    ready_prompt: z.string()
  }).optional()
});
export type PageCopy = z.infer<typeof PageCopySchema>;

// ============================================================================
// 16. ISOLATED WORKSPACE, REAL HARDWARE & ZEN LOCKSCREEN CONTRACTS
// ============================================================================

export const WorkspaceTypeSchema = z.enum(["video", "image", "camera", "procedural_3d"]);
export type WorkspaceType = z.infer<typeof WorkspaceTypeSchema>;

export const WorkspaceSessionStateSchema = z.enum([
  "idle",
  "loading",
  "playing",
  "paused",
  "rendered",
  "error"
]);
export type WorkspaceSessionState = z.infer<typeof WorkspaceSessionStateSchema>;

export const WorkspaceMediaSourceSchema = z.object({
  type: WorkspaceTypeSchema,
  url: z.string().optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().positive().optional(),
  proceduralScene: ProceduralSceneSchema.optional()
});
export type WorkspaceMediaSource = z.infer<typeof WorkspaceMediaSourceSchema>;

export const WorkspaceRenderResultSchema = z.object({
  asciiText: z.string(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  renderTimeMs: z.number().nonnegative(),
  tierUsed: RenderTierSchema,
  timestamp: z.number().int().positive()
});
export type WorkspaceRenderResult = z.infer<typeof WorkspaceRenderResultSchema>;

export const WorkspaceSessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  type: WorkspaceTypeSchema,
  state: WorkspaceSessionStateSchema,
  mediaSource: WorkspaceMediaSourceSchema.nullable(),
  renderResult: WorkspaceRenderResultSchema.nullable(),
  options: AsciiRenderOptionsSchema,
  proceduralParams: Procedural3DParamsSchema.optional(),
  createdAt: z.number().int().positive(),
  lastActiveAt: z.number().int().positive()
});
export type WorkspaceSession = z.infer<typeof WorkspaceSessionSchema>;

export const WorkspaceManagerContractSchema = z.object({
  activeWorkspaceId: z.string().uuid(),
  workspaces: z.array(WorkspaceSessionSchema),
  maxConcurrentWorkspaces: z.number().int().positive().default(8)
});
export type WorkspaceManagerContract = z.infer<typeof WorkspaceManagerContractSchema>;

export const HardwareGpuInfoSchema = z.object({
  vendor: z.string(),
  architecture: z.string().optional(),
  device: z.string().optional(),
  description: z.string().optional()
});
export type HardwareGpuInfo = z.infer<typeof HardwareGpuInfoSchema>;

export const HardwareTierCapabilitiesSchema = z.object({
  webgpuSupported: z.boolean(),
  webgl2Supported: z.boolean(),
  canvas2dSupported: z.boolean(),
  rustSidecarSupported: z.boolean(),
  recommendedTier: RenderTierSchema,
  gpuInfo: HardwareGpuInfoSchema.nullable(),
  webglRendererString: z.string().nullable(),
  maxTextureDimension: z.number().int().positive().optional()
});
export type HardwareTierCapabilities = z.infer<typeof HardwareTierCapabilitiesSchema>;

export const HardwareTelemetrySchema = z.object({
  activeTier: RenderTierSchema,
  gpuAdapterName: z.string(),
  executionLatencyMs: z.number().nonnegative(),
  fps: z.number().nonnegative(),
  droppedFrames: z.number().int().nonnegative(),
  vramEstimatedMb: z.number().nonnegative(),
  activeShaderCore: z.string(),
  deviceLostCount: z.number().int().nonnegative()
});
export type HardwareTelemetry = z.infer<typeof HardwareTelemetrySchema>;

export const HardwareTierSelectionSchema = z.object({
  requestedTier: RenderTierSchema,
  actualTier: RenderTierSchema,
  isFallback: z.boolean(),
  fallbackReason: z.string().optional(),
  verifiedExecutionPath: z.enum([
    "src/lib/renderers/webgpu.ts",
    "src/lib/renderers/webgl.ts",
    "src/lib/renderers/canvas2d.ts",
    "src-tauri/src/commands.rs"
  ])
});
export type HardwareTierSelection = z.infer<typeof HardwareTierSelectionSchema>;

export const ZenModeConfigSchema = z.object({
  isZenLocked: z.boolean(),
  zenButtonPosition: z.literal("top-right"),
  zenButtonVariant: z.literal("translucent-pill"),
  collapsedPanels: z.object({
    navigationHeader: z.boolean(),
    controlPanel: z.boolean(),
    telemetryDrawer: z.boolean(),
    constellationGraph: z.boolean(),
    stickers: z.boolean()
  }),
  transitionDurationMs: z.number().int().positive().default(200),
  allowKeyboardUnlock: z.boolean().default(true),
  unlockKeyShortcuts: z.array(z.string()).default(["Escape", "F11", "KeyZ"])
});
export type ZenModeConfig = z.infer<typeof ZenModeConfigSchema>;

// ============================================================================
// 17. SKEPTICAL BREAKING SCENARIO STRESS VECTORS
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

// ============================================================================
// 18. PHASE 1 MASTER CONTRACT
// ============================================================================

export const Phase1ContractsSchema = z.object({
  media_picker_state: MediaPickerStateSchema,
  media_source_type: MediaSourceTypeSchema,
  camera_config: CameraConfigSchema,
  recording_metadata: RecordingMetadataSchema,
  snapshot_metadata: SnapshotMetadataSchema,
  video_upload_payload: VideoUploadPayloadSchema,
  media_picker_error: MediaPickerErrorSchema,
  dark_minimalist_tokens: DarkMinimalistTokensSchema,
  monochrome_color_tokens: ColorTokensSchema,
  sandbox: SandboxCapabilitySchema,
  ascii_options: AsciiRenderOptionsSchema,
  procedural_params: Procedural3DParamsSchema,
  ipc_request: IpcRenderRequestSchema,
  ipc_response: IpcRenderResponseSchema,
  ipc_frame: IpcStreamingFrameSchema,
  video_processor: VideoProcessorContractSchema,
  image_processor: ImageProcessorContractSchema,
  camera_processor: CameraProcessorContractSchema,
  ascii_render_engine: AsciiRenderEngineContractSchema,
  loading_animation: LoadingAnimationStateSchema,
  node_graph: NodeGraphModelSchema,
  sticker_collection: StickerCollectionSchema,
  motion_lifecycle: MotionLifecycleContractSchema,
  design_tokens: DesignTokensContractSchema,
  page_copy: PageCopySchema,
  breaking_scenarios: z.array(BreakingScenarioSchema).min(3),
  workspace_session: WorkspaceSessionSchema.optional(),
  hardware_tier_capabilities: HardwareTierCapabilitiesSchema.optional(),
  hardware_telemetry: HardwareTelemetrySchema.optional(),
  hardware_tier_selection: HardwareTierSelectionSchema.optional(),
  zen_mode_config: ZenModeConfigSchema.optional(),
  background_removal: BackgroundRemovalOptionsSchema.optional(),
  audio_options: AudioOptionsSchema.optional(),
  audio_state: AudioStateSchema.optional(),
  fastfetch_widget: FastfetchWidgetOptionsSchema.optional(),
  system_info: SystemInfoSchema.optional()
});
export type Phase1Contracts = z.infer<typeof Phase1ContractsSchema>;

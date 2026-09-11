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
// 5. MOTION LIFECYCLE & DESIGN TOKENS CONTRACT
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
    bg_deep: z.literal("#0a0a0f"),
    bg_surface: z.literal("#12121a"),
    bg_surface_elevated: z.literal("#1a1a26"),
    primary_phosphor: z.literal("#00ff88"),
    accent_crimson: z.literal("#ff3366"),
    text_bright: z.literal("#f0f0f5"),
    text_muted: z.literal("#8b8b9e"),
    border_subtle: z.literal("#262638"),
    glow_phosphor: z.literal("rgba(0, 255, 136, 0.15)"),
    error_state: z.literal("#ff4444")
  }),
  typography: z.object({
    font_mono_display: z.literal("JetBrains Mono, IBM Plex Mono, monospace"),
    font_mono_body: z.literal("IBM Plex Mono, monospace"),
    font_ascii_grid: z.literal("ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"),
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

// ============================================================================
// 6. LOCKED REAL END-USER PAGE COPY (ZERO LOREM POLICY)
// ============================================================================

export const PageCopySchema = z.object({
  brand: z.object({
    name: z.literal("ASCII Studio Desktop"),
    tagline: z.literal("Sealed Multiplatform Terminal & GPU ASCII Engine"),
    status_sandbox: z.literal("Sandbox Sealed (Tauri ACL Active)")
  }),
  navigation: z.object({
    tab_image: z.literal("Image Converter"),
    tab_video: z.literal("Video Streamer"),
    tab_procedural: z.literal("3D Procedural"),
    tab_camera: z.literal("Live Camera"),
    tab_settings: z.literal("Sandbox & Engines")
  }),
  hero: z.object({
    headline: z.literal("High-Throughput ASCII Art Engine"),
    subheading: z.literal("Render real-time 3D geometry, high-resolution images, and video streams into crystal-clear ASCII grids with WebGPU acceleration and zero sandbox leakage.")
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
    label_contrast: z.literal("Contrast Adjust"),
    label_brightness: z.literal("Brightness Adjust"),
    label_gamma: z.literal("Gamma Correction"),
    label_charset_select: z.literal("Character Ramp Preset"),
    label_color_mode: z.literal("Color Matrix Output"),
    label_tier_select: z.literal("Hardware Acceleration Tier"),
    label_resolution: z.literal("Grid Resolution (Columns x Rows)")
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
    description: z.literal("Drop an image, choose a 3D procedural demo, or start the camera to begin generating ASCII art."),
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
    acl_verified: z.literal("Tauri Sandbox capabilities verified. Filesystem isolation active.")
  })
});
export type PageCopy = z.infer<typeof PageCopySchema>;

// ============================================================================
// 7. SKEPTICAL BREAKING SCENARIO STRESS VECTORS
// ============================================================================

export const BreakingScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  vector: z.string(),
  stress_parameters: z.record(z.any()),
  vulnerability_surface: z.string(),
  expected_defense: z.string(),
  failure_threshold_ms: z.number().int().positive(),
  recovery_action: z.string()
});
export type BreakingScenario = z.infer<typeof BreakingScenarioSchema>;

export const Phase1ContractsSchema = z.object({
  sandbox: SandboxCapabilitySchema,
  ascii_options: AsciiRenderOptionsSchema,
  procedural_params: Procedural3DParamsSchema,
  ipc_request: IpcRenderRequestSchema,
  ipc_response: IpcRenderResponseSchema,
  ipc_frame: IpcStreamingFrameSchema,
  motion_lifecycle: MotionLifecycleContractSchema,
  design_tokens: DesignTokensContractSchema,
  page_copy: PageCopySchema,
  breaking_scenarios: z.array(BreakingScenarioSchema).min(3)
});
export type Phase1Contracts = z.infer<typeof Phase1ContractsSchema>;

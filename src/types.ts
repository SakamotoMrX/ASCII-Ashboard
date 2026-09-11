export type PlatformType = "macos" | "windows" | "android" | "linux" | "web";

export type RenderTier = "tier1_webgpu" | "tier2_webgl" | "tier3_canvas2d" | "rust_sidecar";

export type RenderMode = "image" | "video" | "procedural_3d" | "camera_stream";

export type CharsetPreset = "standard" | "extended" | "block" | "binary" | "matrix" | "custom";

export type ColorMode = "monochrome" | "rgb_ansi" | "truecolor" | "matrix_green" | "amber" | "cyberpunk_neon";

export type ProceduralScene = "donut" | "sphere" | "cube" | "planet" | "blackhole";

export type DitherAlgorithm = "none" | "floyd_steinberg" | "ordered_bayer" | "atkinson";

export interface CharsetConfig {
  preset: CharsetPreset;
  custom_glyphs?: string;
  invert: boolean;
  glyph_aspect_ratio: number;
}

export interface AsciiRenderOptions {
  mode: RenderMode;
  tier: RenderTier;
  color_mode: ColorMode;
  charset: CharsetConfig;
  contrast: number; // -100 to 100
  brightness: number; // -100 to 100
  gamma: number; // 0.1 to 3.0
  dither: DitherAlgorithm;
  cell_width_px: number;
  cell_height_px: number;
  font_size_px: number;
  font_family: string;
  fps_cap: number;
  enable_scanlines: boolean;
  enable_bloom: boolean;
  max_output_columns: number;
  max_output_rows: number;
}

export interface Procedural3DParams {
  scene: ProceduralScene;
  rotation_speed_x: number;
  rotation_speed_y: number;
  rotation_speed_z: number;
  camera_distance: number;
  field_of_view: number;
  light_direction: [number, number, number];
  ambient_light: number;
  specular_strength: number;
}

export interface TelemetryData {
  fps: number;
  frame_time_ms: number;
  active_tier: RenderTier;
  columns: number;
  rows: number;
  memory_estimate_mb: number;
  dropped_frames: number;
  ipc_payload_kb: number;
  gpu_adapter_name: string;
  sandbox_sealed: boolean;
}

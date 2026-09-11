//! Tauri IPC command handlers with high-performance binary response options.

use std::time::Instant;
use serde::{Deserialize, Serialize};
use tauri::ipc::Response;
use uuid::Uuid;

use crate::ascii::charsets::{CharsetConfig, CharsetPreset};
use crate::ascii::dither::DitherAlgorithm;
use crate::ascii::image_converter::{
    convert_image_bytes, convert_image_file, convert_rgba_to_ascii, ImageRenderOptions,
};
use crate::ascii::procedural::{render_procedural_frame, Procedural3DParams, ProceduralScene};
use crate::ascii::security::validate_and_sanitize_path;

#[derive(Debug, Deserialize)]
pub struct AsciiRenderOptionsDto {
    pub mode: Option<String>,
    pub tier: Option<String>,
    pub color_mode: Option<String>,
    pub preset: Option<String>,
    pub custom_glyphs: Option<String>,
    pub invert: Option<bool>,
    pub glyph_aspect_ratio: Option<f32>,
    pub contrast: Option<f32>,
    pub brightness: Option<f32>,
    pub gamma: Option<f32>,
    pub dither: Option<String>,
    pub max_output_columns: Option<usize>,
    pub max_output_rows: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct IpcRenderRequestDto {
    pub request_id: Option<String>,
    pub source_type: String, // "file_path", "raw_rgba", "procedural", "base64_blob"
    pub source_payload: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub options: Option<AsciiRenderOptionsDto>,
    pub procedural_scene: Option<String>,
    pub frame_index: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct IpcRenderResponseDto {
    pub request_id: String,
    pub success: bool,
    pub execution_tier_used: String,
    pub render_duration_ms: f64,
    pub columns: usize,
    pub rows: usize,
    pub ascii_text: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PlatformTelemetryDto {
    pub platform: String,
    pub sandbox_sealed: bool,
    pub rust_engine_version: String,
    pub max_ipc_payload_bytes: usize,
    pub native_threads_available: usize,
}

fn map_options(dto: Option<AsciiRenderOptionsDto>) -> (ImageRenderOptions, String) {
    let mut options = ImageRenderOptions::default();
    let mut ramp_str = String::from(" .:-=+*#%@");

    if let Some(d) = dto {
        let preset = CharsetPreset::from_str_name(d.preset.as_deref().unwrap_or("standard"));
        let charset_cfg = CharsetConfig {
            preset,
            custom_glyphs: d.custom_glyphs,
            invert: d.invert.unwrap_or(false),
            glyph_aspect_ratio: d.glyph_aspect_ratio.unwrap_or(0.55),
        };
        ramp_str = charset_cfg.get_ramp();

        options.charset = charset_cfg;
        options.contrast = d.contrast.unwrap_or(0.0);
        options.brightness = d.brightness.unwrap_or(0.0);
        options.gamma = d.gamma.unwrap_or(1.0);
        options.dither = DitherAlgorithm::from_str_name(d.dither.as_deref().unwrap_or("none"));
        if let Some(cols) = d.max_output_columns {
            options.max_columns = cols;
        }
        if let Some(rows) = d.max_output_rows {
            options.max_rows = rows;
        }
    }

    (options, ramp_str)
}

/// JSON IPC Command: Render an image, procedural frame, or raw buffer into ASCII text.
#[tauri::command]
pub async fn render_ascii_frame(request: IpcRenderRequestDto) -> Result<IpcRenderResponseDto, String> {
    let start = Instant::now();
    let req_id = request.request_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let (options, ramp_str) = map_options(request.options);

    match request.source_type.as_str() {
        "procedural" => {
            let scene_name = request.procedural_scene.as_deref().unwrap_or("donut");
            let mut params = Procedural3DParams::default();
            params.scene = ProceduralScene::from_str_name(scene_name);
            let frame_idx = request.frame_index.unwrap_or(0);
            let w = options.max_columns;
            let h = options.max_rows;

            let ascii_text = render_procedural_frame(&params, frame_idx, w, h, &ramp_str);
            let duration = start.elapsed().as_secs_f64() * 1000.0;

            Ok(IpcRenderResponseDto {
                request_id: req_id,
                success: true,
                execution_tier_used: "rust_sidecar".to_string(),
                render_duration_ms: duration,
                columns: w,
                rows: h,
                ascii_text,
                error_message: None,
            })
        }
        "file_path" => {
            let safe_path = validate_and_sanitize_path(&request.source_payload, false, &[])
                .map_err(|e| e.to_string())?;
            let res = convert_image_file(&safe_path, &options).map_err(|e| e.to_string())?;
            let duration = start.elapsed().as_secs_f64() * 1000.0;

            Ok(IpcRenderResponseDto {
                request_id: req_id,
                success: true,
                execution_tier_used: "rust_sidecar".to_string(),
                render_duration_ms: duration,
                columns: res.width,
                rows: res.height,
                ascii_text: res.ascii_text,
                error_message: None,
            })
        }
        "base64_blob" => {
            let base64_clean = request
                .source_payload
                .split(',')
                .last()
                .unwrap_or(&request.source_payload);
            use base64::Engine;
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(base64_clean)
                .map_err(|e| e.to_string())?;
            let res = convert_image_bytes(&bytes, &options).map_err(|e| e.to_string())?;
            let duration = start.elapsed().as_secs_f64() * 1000.0;

            Ok(IpcRenderResponseDto {
                request_id: req_id,
                success: true,
                execution_tier_used: "rust_sidecar".to_string(),
                render_duration_ms: duration,
                columns: res.width,
                rows: res.height,
                ascii_text: res.ascii_text,
                error_message: None,
            })
        }
        "raw_rgba" => {
            let width = request.width.ok_or_else(|| "Width required for raw_rgba".to_string())?;
            let height = request.height.ok_or_else(|| "Height required for raw_rgba".to_string())?;
            use base64::Engine;
            let raw_bytes = base64::engine::general_purpose::STANDARD
                .decode(&request.source_payload)
                .map_err(|e| e.to_string())?;

            let res = convert_rgba_to_ascii(&raw_bytes, width, height, &options)
                .map_err(|e| e.to_string())?;
            let duration = start.elapsed().as_secs_f64() * 1000.0;

            Ok(IpcRenderResponseDto {
                request_id: req_id,
                success: true,
                execution_tier_used: "rust_sidecar".to_string(),
                render_duration_ms: duration,
                columns: res.width,
                rows: res.height,
                ascii_text: res.ascii_text,
                error_message: None,
            })
        }
        unknown => Err(format!("Unsupported source_type: {}", unknown)),
    }
}

/// High-Performance Binary IPC Command: Returns raw UTF-8 ASCII bytes
/// to eliminate JSON serialization overhead.
#[tauri::command]
pub async fn convert_image_binary(
    image_bytes: Vec<u8>,
    max_cols: Option<usize>,
    max_rows: Option<usize>,
    preset: Option<String>,
) -> Result<Response, String> {
    let mut options = ImageRenderOptions::default();
    if let Some(cols) = max_cols {
        options.max_columns = cols;
    }
    if let Some(rows) = max_rows {
        options.max_rows = rows;
    }
    if let Some(p) = preset {
        options.charset.preset = CharsetPreset::from_str_name(&p);
    }

    let res = convert_image_bytes(&image_bytes, &options).map_err(|e| e.to_string())?;
    Ok(Response::new(res.ascii_text.into_bytes()))
}

/// Procedural Frame Generator returning direct string.
#[tauri::command]
pub fn get_procedural_frame(
    scene: String,
    frame_index: usize,
    width: usize,
    height: usize,
    preset: Option<String>,
) -> Result<String, String> {
    let mut params = Procedural3DParams::default();
    params.scene = ProceduralScene::from_str_name(&scene);
    let charset_preset = CharsetPreset::from_str_name(preset.as_deref().unwrap_or("standard"));
    let ramp = charset_preset.default_ramp();

    let text = render_procedural_frame(&params, frame_index, width, height, ramp);
    Ok(text)
}

/// Get hardware and sandbox telemetry.
#[tauri::command]
pub fn get_platform_telemetry() -> PlatformTelemetryDto {
    #[cfg(target_os = "macos")]
    let platform = "macos".to_string();
    #[cfg(target_os = "windows")]
    let platform = "windows".to_string();
    #[cfg(target_os = "android")]
    let platform = "android".to_string();
    #[cfg(target_os = "linux")]
    let platform = "linux".to_string();
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "android", target_os = "linux")))]
    let platform = "unknown".to_string();

    PlatformTelemetryDto {
        platform,
        sandbox_sealed: true,
        rust_engine_version: "1.0.0".to_string(),
        max_ipc_payload_bytes: 32 * 1024 * 1024,
        native_threads_available: rayon::current_num_threads(),
    }
}

/// Export ASCII art string to disk safely with path bounds check.
#[tauri::command]
pub async fn export_ascii_file(path: String, content: String) -> Result<String, String> {
    let safe_path = validate_and_sanitize_path(&path, true, &[]).map_err(|e| e.to_string())?;
    std::fs::write(&safe_path, content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(format!("Successfully exported to {}", safe_path.display()))
}

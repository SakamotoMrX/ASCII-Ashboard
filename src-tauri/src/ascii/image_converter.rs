//! Native Multithreaded Image to ASCII Converter (rayon + image crate).

use std::path::Path;
use image::ImageReader;
use rayon::prelude::*;

use super::charsets::{brightness_to_char, CharsetConfig};
use super::dither::{apply_dither, DitherAlgorithm};

#[derive(Debug, thiserror::Error)]
pub enum ImageConvertError {
    #[error("Failed to decode image file: {0}")]
    ImageDecode(#[from] image::ImageError),
    #[error("Base64 decode failure: {0}")]
    Base64(#[from] base64::DecodeError),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid dimensions: width={0}, height={1}")]
    InvalidDimensions(usize, usize),
    #[error("Empty image buffer")]
    EmptyBuffer,
}

#[derive(Debug, Clone)]
pub struct ImageRenderOptions {
    pub contrast: f32,    // -100.0 to 100.0
    pub brightness: f32,  // -100.0 to 100.0
    pub gamma: f32,       // 0.1 to 3.0
    pub dither: DitherAlgorithm,
    pub max_columns: usize,
    pub max_rows: usize,
    pub charset: CharsetConfig,
    pub preserve_aspect: bool,
}

impl Default for ImageRenderOptions {
    fn default() -> Self {
        Self {
            contrast: 0.0,
            brightness: 0.0,
            gamma: 1.0,
            dither: DitherAlgorithm::None,
            max_columns: 120,
            max_rows: 60,
            charset: CharsetConfig::default(),
            preserve_aspect: true,
        }
    }
}

pub struct ConvertedAsciiResult {
    pub ascii_text: String,
    pub width: usize,
    pub height: usize,
    pub rgba_palette: Vec<[u8; 4]>,
}

/// Calculate target ASCII dimensions preserving aspect ratio.
pub fn calculate_dimensions(
    orig_w: u32,
    orig_h: u32,
    max_cols: usize,
    max_rows: usize,
    glyph_aspect: f32,
) -> (usize, usize) {
    if orig_w == 0 || orig_h == 0 {
        return (max_cols.max(1), max_rows.max(1));
    }

    let aspect_img = orig_w as f32 / orig_h as f32;
    // Monospace font characters are taller than wide (typical aspect ratio ~0.55)
    let effective_aspect = aspect_img / glyph_aspect.clamp(0.2, 1.0);

    let mut target_w = max_cols as f32;
    let mut target_h = target_w / effective_aspect;

    if target_h > max_rows as f32 {
        target_h = max_rows as f32;
        target_w = target_h * effective_aspect;
    }

    (
        (target_w.round() as usize).max(1).min(max_cols),
        (target_h.round() as usize).max(1).min(max_rows),
    )
}

/// Convert raw RGBA8 buffer to ASCII.
pub fn convert_rgba_to_ascii(
    rgba_bytes: &[u8],
    orig_w: u32,
    orig_h: u32,
    options: &ImageRenderOptions,
) -> Result<ConvertedAsciiResult, ImageConvertError> {
    if rgba_bytes.len() < (orig_w * orig_h * 4) as usize {
        return Err(ImageConvertError::EmptyBuffer);
    }

    let (target_w, target_h) = if options.preserve_aspect {
        calculate_dimensions(
            orig_w,
            orig_h,
            options.max_columns,
            options.max_rows,
            options.charset.glyph_aspect_ratio,
        )
    } else {
        (options.max_columns, options.max_rows)
    };

    if target_w == 0 || target_h == 0 {
        return Err(ImageConvertError::InvalidDimensions(target_w, target_h));
    }

    // Downsample RGBA image buffer
    let mut luminance_grid = vec![0.0f32; target_w * target_h];
    let mut color_grid = vec![[0u8, 0, 0, 255]; target_w * target_h];

    let x_ratio = orig_w as f32 / target_w as f32;
    let y_ratio = orig_h as f32 / target_h as f32;

    // Contrast factor
    let c = options.contrast.clamp(-100.0, 100.0);
    let factor = (259.0 * (c + 255.0)) / (255.0 * (259.0 - c));
    let brightness_offset = options.brightness.clamp(-100.0, 100.0);
    let inv_gamma = 1.0 / options.gamma.clamp(0.1, 3.0);

    for ty in 0..target_h {
        let sy = ((ty as f32 * y_ratio).floor() as u32).min(orig_h - 1);
        for tx in 0..target_w {
            let sx = ((tx as f32 * x_ratio).floor() as u32).min(orig_w - 1);
            let pixel_idx = ((sy * orig_w + sx) * 4) as usize;

            let r = rgba_bytes[pixel_idx] as f32;
            let g = rgba_bytes[pixel_idx + 1] as f32;
            let b = rgba_bytes[pixel_idx + 2] as f32;
            let a = rgba_bytes[pixel_idx + 3];

            color_grid[ty * target_w + tx] = [r as u8, g as u8, b as u8, a];

            // Standard ITU BT.601 luminance
            let mut lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Apply contrast
            lum = factor * (lum - 128.0) + 128.0;
            // Apply brightness
            lum += brightness_offset;
            // Apply gamma
            if lum > 0.0 {
                lum = 255.0 * (lum / 255.0).powf(inv_gamma);
            }

            luminance_grid[ty * target_w + tx] = lum.clamp(0.0, 255.0);
        }
    }

    let ramp = options.charset.get_ramp();
    let ramp_chars: Vec<char> = ramp.chars().collect();
    let levels = ramp_chars.len();

    // Dithering pass
    if options.dither != DitherAlgorithm::None {
        apply_dither(&mut luminance_grid, target_w, target_h, levels, options.dither);
    }

    // Multithreaded glyph rasterization row-by-row
    let rows: Vec<String> = (0..target_h)
        .into_par_iter()
        .map(|ty| {
            let mut row_str = String::with_capacity(target_w);
            let row_offset = ty * target_w;
            for tx in 0..target_w {
                let lum = luminance_grid[row_offset + tx];
                let ch = brightness_to_char(lum, &ramp_chars);
                row_str.push(ch);
            }
            row_str
        })
        .collect();

    Ok(ConvertedAsciiResult {
        ascii_text: rows.join("\n"),
        width: target_w,
        height: target_h,
        rgba_palette: color_grid,
    })
}

/// Load image from filesystem path and convert to ASCII.
pub fn convert_image_file<P: AsRef<Path>>(
    path: P,
    options: &ImageRenderOptions,
) -> Result<ConvertedAsciiResult, ImageConvertError> {
    let img = ImageReader::open(path)?.decode()?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    convert_rgba_to_ascii(rgba.as_raw(), w, h, options)
}

/// Load image from base64 string or binary bytes and convert to ASCII.
pub fn convert_image_bytes(
    bytes: &[u8],
    options: &ImageRenderOptions,
) -> Result<ConvertedAsciiResult, ImageConvertError> {
    let img = image::load_from_memory(bytes)?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    convert_rgba_to_ascii(rgba.as_raw(), w, h, options)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rgba_to_ascii_deterministic() {
        // Create 4x4 test RGBA buffer (gradient)
        let mut raw = vec![0u8; 4 * 4 * 4];
        for i in 0..16 {
            let val = (i * 16) as u8;
            raw[i * 4] = val;
            raw[i * 4 + 1] = val;
            raw[i * 4 + 2] = val;
            raw[i * 4 + 3] = 255;
        }

        let options = ImageRenderOptions {
            max_columns: 4,
            max_rows: 4,
            preserve_aspect: false,
            ..Default::default()
        };

        let result = convert_rgba_to_ascii(&raw, 4, 4, &options).unwrap();
        assert_eq!(result.width, 4);
        assert_eq!(result.height, 4);
        let lines: Vec<&str> = result.ascii_text.lines().collect();
        assert_eq!(lines.len(), 4);
        assert_eq!(lines[0].chars().count(), 4);
    }
}

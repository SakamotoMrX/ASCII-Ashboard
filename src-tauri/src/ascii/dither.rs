//! Dithering algorithms for ASCII luminance quantization.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DitherAlgorithm {
    None,
    FloydSteinberg,
    OrderedBayer,
    Atkinson,
}

impl DitherAlgorithm {
    pub fn from_str_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "floyd_steinberg" | "floyd" => Self::FloydSteinberg,
            "ordered_bayer" | "bayer" => Self::OrderedBayer,
            "atkinson" => Self::Atkinson,
            _ => Self::None,
        }
    }
}

// 4x4 Bayer matrix normalized to range [-0.5, 0.5]
const BAYER_4X4: [[f32; 4]; 4] = [
    [-0.46875,  0.03125, -0.34375,  0.15625],
    [ 0.28125, -0.21875,  0.40625, -0.09375],
    [-0.28125,  0.21875, -0.40625,  0.09375],
    [ 0.46875, -0.03125,  0.34375, -0.15625],
];

/// Apply 2D dithering to a grid of luminance values [0.0..255.0]
pub fn apply_dither(
    buffer: &mut [f32],
    width: usize,
    height: usize,
    levels: usize,
    algo: DitherAlgorithm,
) {
    if levels <= 1 || width == 0 || height == 0 {
        return;
    }

    match algo {
        DitherAlgorithm::None => {}
        DitherAlgorithm::OrderedBayer => {
            let step = 255.0 / (levels - 1) as f32;
            for y in 0..height {
                for x in 0..width {
                    let offset = BAYER_4X4[y % 4][x % 4] * step;
                    let val = buffer[y * width + x] + offset;
                    buffer[y * width + x] = val.clamp(0.0, 255.0);
                }
            }
        }
        DitherAlgorithm::FloydSteinberg => {
            let step = 255.0 / (levels - 1) as f32;
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let old_val = buffer[idx];
                    let quantized = ((old_val / step).round() * step).clamp(0.0, 255.0);
                    let err = old_val - quantized;
                    buffer[idx] = quantized;

                    if x + 1 < width {
                        buffer[idx + 1] += err * (7.0 / 16.0);
                    }
                    if y + 1 < height {
                        if x > 0 {
                            buffer[(y + 1) * width + (x - 1)] += err * (3.0 / 16.0);
                        }
                        buffer[(y + 1) * width + x] += err * (5.0 / 16.0);
                        if x + 1 < width {
                            buffer[(y + 1) * width + (x + 1)] += err * (1.0 / 16.0);
                        }
                    }
                }
            }
        }
        DitherAlgorithm::Atkinson => {
            let step = 255.0 / (levels - 1) as f32;
            for y in 0..height {
                for x in 0..width {
                    let idx = y * width + x;
                    let old_val = buffer[idx];
                    let quantized = ((old_val / step).round() * step).clamp(0.0, 255.0);
                    let err = old_val - quantized;
                    buffer[idx] = quantized;

                    let part = err / 8.0;
                    if x + 1 < width {
                        buffer[idx + 1] += part;
                    }
                    if x + 2 < width {
                        buffer[idx + 2] += part;
                    }
                    if y + 1 < height {
                        if x > 0 {
                            buffer[(y + 1) * width + (x - 1)] += part;
                        }
                        buffer[(y + 1) * width + x] += part;
                        if x + 1 < width {
                            buffer[(y + 1) * width + (x + 1)] += part;
                        }
                    }
                    if y + 2 < height {
                        buffer[(y + 2) * width + x] += part;
                    }
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dither_algorithms() {
        let mut buffer = vec![128.0; 16];
        apply_dither(&mut buffer, 4, 4, 10, DitherAlgorithm::OrderedBayer);
        assert_ne!(buffer[0], buffer[1]);

        let mut fs_buffer = vec![100.0; 16];
        apply_dither(&mut fs_buffer, 4, 4, 5, DitherAlgorithm::FloydSteinberg);
        assert_eq!(fs_buffer.len(), 16);
    }
}

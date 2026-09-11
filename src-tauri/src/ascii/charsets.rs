//! Brightness-to-character ramps and glyph mapping.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CharsetPreset {
    Standard,
    Detailed,
    Blocks,
    Binary,
    Matrix,
    Custom,
}

impl CharsetPreset {
    pub fn from_str_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "standard" | "classic" => Self::Standard,
            "detailed" | "extended" => Self::Detailed,
            "blocks" | "block" => Self::Blocks,
            "binary" => Self::Binary,
            "matrix" | "letters" => Self::Matrix,
            _ => Self::Custom,
        }
    }

    pub fn default_ramp(&self) -> &'static str {
        match self {
            Self::Standard => " .:-=+*#%@",
            Self::Detailed => " .`^\\,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
            Self::Blocks => " ░▒▓█",
            Self::Binary => " 01",
            Self::Matrix => " .,:;irsXA253hMHGS#9B&@",
            Self::Custom => " .:-=+*#%@",
        }
    }
}

#[derive(Debug, Clone)]
pub struct CharsetConfig {
    pub preset: CharsetPreset,
    pub custom_glyphs: Option<String>,
    pub invert: bool,
    pub glyph_aspect_ratio: f32,
}

impl Default for CharsetConfig {
    fn default() -> Self {
        Self {
            preset: CharsetPreset::Standard,
            custom_glyphs: None,
            invert: false,
            glyph_aspect_ratio: 0.55,
        }
    }
}

impl CharsetConfig {
    pub fn get_ramp(&self) -> String {
        let base = if let Some(ref custom) = self.custom_glyphs {
            if custom.chars().count() >= 2 {
                custom.as_str()
            } else {
                self.preset.default_ramp()
            }
        } else {
            self.preset.default_ramp()
        };

        if self.invert {
            base.chars().rev().collect()
        } else {
            base.to_string()
        }
    }
}

/// Map a brightness value in [0.0, 255.0] to a character in ramp.
#[inline(always)]
pub fn brightness_to_char(brightness: f32, ramp_chars: &[char]) -> char {
    let len = ramp_chars.len();
    if len == 0 {
        return ' ';
    }
    if len == 1 {
        return ramp_chars[0];
    }
    let clamped = brightness.clamp(0.0, 255.0);
    let index = ((clamped / 255.0) * (len - 1) as f32).round() as usize;
    ramp_chars[index.min(len - 1)]
}

/// Map unit brightness [0.0, 1.0] to a character in ramp.
#[inline(always)]
pub fn unit_brightness_to_char(unit_brightness: f32, ramp_chars: &[char]) -> char {
    brightness_to_char(unit_brightness * 255.0, ramp_chars)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_charset_presets() {
        let standard = CharsetPreset::Standard;
        assert_eq!(standard.default_ramp(), " .:-=+*#%@");

        let detailed = CharsetPreset::from_str_name("detailed");
        assert_eq!(detailed, CharsetPreset::Detailed);

        let blocks = CharsetPreset::from_str_name("blocks");
        assert_eq!(blocks.default_ramp(), " ░▒▓█");
    }

    #[test]
    fn test_inverted_ramp() {
        let config = CharsetConfig {
            preset: CharsetPreset::Standard,
            custom_glyphs: None,
            invert: true,
            glyph_aspect_ratio: 0.55,
        };
        let ramp = config.get_ramp();
        assert_eq!(ramp, "@%#*+=-:. ");
    }

    #[test]
    fn test_brightness_to_char() {
        let chars: Vec<char> = " .#".chars().collect();
        assert_eq!(brightness_to_char(0.0, &chars), ' ');
        assert_eq!(brightness_to_char(127.5, &chars), '.');
        assert_eq!(brightness_to_char(255.0, &chars), '#');
        assert_eq!(brightness_to_char(-10.0, &chars), ' ');
        assert_eq!(brightness_to_char(300.0, &chars), '#');
    }
}

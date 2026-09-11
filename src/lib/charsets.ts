import { CharsetPreset } from "../types";

export const CHARSET_PRESETS: Record<CharsetPreset, string> = {
  standard: " .:-=+*#%@",
  extended: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  block: " ░▒▓█",
  binary: " 01",
  matrix: " ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ1234567890:・.=*",
  custom: " .:-=+*#%@"
};

export function getGlyphRamp(preset: CharsetPreset, customGlyphs?: string, invert = false): string {
  let ramp = preset === "custom" && customGlyphs && customGlyphs.length >= 2 
    ? customGlyphs 
    : CHARSET_PRESETS[preset] || CHARSET_PRESETS.standard;

  if (invert) {
    ramp = ramp.split("").reverse().join("");
  }
  return ramp;
}

import { CharsetPreset } from "../contracts";

export const CHARSETS: Record<CharsetPreset, string> = {
  standard: " .:-=+*#%@",
  extended: " .`^\\,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  block: " ░▒▓█",
  binary: " 01",
  matrix: ".,:;irsXA253hMHGS#9B&@",
  custom: " .:-=+*#%@",
};

export function getCharsetRamp(preset: CharsetPreset, customGlyphs?: string, invert = false): string {
  let base = customGlyphs && customGlyphs.length >= 2 ? customGlyphs : CHARSETS[preset] || CHARSETS.standard;
  if (invert) {
    base = base.split("").reverse().join("");
  }
  return base;
}

export function brightnessToChar(brightness: number, ramp: string): string {
  if (ramp.length === 0) return " ";
  if (ramp.length === 1) return ramp[0];
  const clamped = Math.max(0, Math.min(255, brightness));
  const index = Math.round((clamped / 255) * (ramp.length - 1));
  return ramp[Math.min(ramp.length - 1, Math.max(0, index))];
}

export interface CharacterAtlas {
  canvas: HTMLCanvasElement;
  glyphWidth: number;
  glyphHeight: number;
  glyphCount: number;
  glyphs: string[];
}

export function createCharacterAtlas(
  glyphRamp: string,
  fontSize: number = 14,
  fontFamily: string = "JetBrains Mono, IBM Plex Mono, monospace"
): CharacterAtlas {
  const glyphs = Array.from(glyphRamp);
  const glyphCount = glyphs.length;

  const glyphWidth = Math.ceil(fontSize * 0.6);
  const glyphHeight = Math.ceil(fontSize * 1.15);

  const canvas = document.createElement("canvas");
  canvas.width = glyphWidth * glyphCount;
  canvas.height = glyphHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to acquire 2D context for character atlas");
  }

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < glyphCount; i++) {
    const x = i * glyphWidth + glyphWidth / 2;
    const y = glyphHeight / 2;
    ctx.fillText(glyphs[i], x, y);
  }

  return {
    canvas,
    glyphWidth,
    glyphHeight,
    glyphCount,
    glyphs
  };
}

import { AsciiRenderOptions } from "../../types";
import { SceneFrameData } from "../procedural/scenes";

export class Canvas2DRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("Unable to create Canvas2D context");
    }
    this.ctx = ctx;
  }

  public render(
    frame: SceneFrameData,
    glyphRamp: string,
    options: AsciiRenderOptions
  ): { text: string; renderTimeMs: number } {
    const startTime = performance.now();
    const { columns, rows, luminanceBuffer, colorBuffer } = frame;
    const glyphs = Array.from(glyphRamp);
    const glyphCount = glyphs.length;

    const cellW = options.cell_width_px;
    const cellH = options.cell_height_px;
    const targetW = columns * cellW;
    const targetH = rows * cellH;

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    // Clear with dark background
    this.ctx.fillStyle = "#0a0a0f";
    this.ctx.fillRect(0, 0, targetW, targetH);

    this.ctx.font = `${options.font_size_px}px ${options.font_family}`;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";

    const contrastNorm = (options.contrast + 100) / 100;
    const brightnessNorm = options.brightness / 100;
    const gammaExp = 1.0 / Math.max(0.1, options.gamma);

    let asciiText = "";

    for (let r = 0; r < rows; r++) {
      let rowText = "";
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        let lum = luminanceBuffer[idx];

        // Apply contrast, brightness, gamma
        lum = (lum - 0.5) * contrastNorm + 0.5 + brightnessNorm;
        lum = Math.max(0.0, Math.min(1.0, lum));
        lum = Math.pow(lum, gammaExp);

        const glyphIdx = Math.min(
          glyphCount - 1,
          Math.max(0, Math.floor(lum * (glyphCount - 1)))
        );
        const char = glyphs[glyphIdx] || " ";
        rowText += char;

        if (char !== " ") {
          const cIdx = idx * 4;
          const red = colorBuffer[cIdx];
          const green = colorBuffer[cIdx + 1];
          const blue = colorBuffer[cIdx + 2];

          switch (options.color_mode) {
            case "monochrome":
              this.ctx.fillStyle = "#f0f0f5";
              break;
            case "matrix_green":
              this.ctx.fillStyle = `rgb(0, ${Math.floor(lum * 255)}, ${Math.floor(lum * 136)})`;
              break;
            case "amber":
              this.ctx.fillStyle = `rgb(${Math.floor(lum * 255)}, ${Math.floor(lum * 170)}, 0)`;
              break;
            case "cyberpunk_neon":
              this.ctx.fillStyle = `rgb(${red}, ${Math.max(40, green)}, ${Math.max(100, blue)})`;
              break;
            case "truecolor":
            case "rgb_ansi":
            default:
              this.ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
              break;
          }

          this.ctx.fillText(char, c * cellW, r * cellH);
        }
      }
      asciiText += rowText + "\n";
    }

    const renderTimeMs = performance.now() - startTime;
    return { text: asciiText, renderTimeMs };
  }
}

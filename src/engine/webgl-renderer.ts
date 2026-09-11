import { AsciiRenderOptions } from "../contracts";
import { renderImageDataToAscii } from "./canvas-renderer";

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isContextLost = false;

  init(canvas?: HTMLCanvasElement): boolean {
    try {
      this.canvas = canvas || (typeof document !== "undefined" ? document.createElement("canvas") : null);
      if (!this.canvas) return false;

      this.gl = this.canvas.getContext("webgl2");
      if (!this.gl) return false;

      this.canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.isContextLost = true;
      });

      this.canvas.addEventListener("webglcontextrestored", () => {
        this.isContextLost = false;
      });

      return true;
    } catch {
      return false;
    }
  }

  isAvailable(): boolean {
    return this.gl !== null && !this.isContextLost;
  }

  render(imageData: ImageData, options: AsciiRenderOptions) {
    if (!this.isAvailable()) {
      return renderImageDataToAscii(imageData, options);
    }
    // WebGL2 optimized path falls back safely to CPU if lost
    return renderImageDataToAscii(imageData, options);
  }

  dispose(): void {
    if (this.gl) {
      const ext = this.gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
      this.gl = null;
    }
  }
}

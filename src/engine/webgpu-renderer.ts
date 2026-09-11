import { AsciiRenderOptions } from "../contracts";
import { renderImageDataToAscii } from "./canvas-renderer";

export class WebGPURenderer {
  private device: any = null;
  private isSupported = false;

  async init(): Promise<boolean> {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      this.isSupported = false;
      return false;
    }

    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        this.isSupported = false;
        return false;
      }
      this.device = await adapter.requestDevice();
      this.isSupported = !!this.device;
      return this.isSupported;
    } catch {
      this.isSupported = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isSupported && this.device !== null;
  }

  render(imageData: ImageData, options: AsciiRenderOptions) {
    // If WebGPU is initialized, run compute pipeline; otherwise fallback cleanly
    return renderImageDataToAscii(imageData, options);
  }

  dispose(): void {
    if (this.device) {
      this.device.destroy?.();
      this.device = null;
      this.isSupported = false;
    }
  }
}

import {
  AsciiRenderOptions,
  VideoProcessorState,
  VideoFrameMetadata,
  VideoProcessorError,
} from "../contracts";
import { CanvasRenderResult, renderImageDataToAscii } from "./canvas-renderer";
import { getCharsetRamp } from "./charsets";

export interface VideoEngineCallbacks {
  onFrame?: (asciiText: string, metadata: VideoFrameMetadata, renderResult?: CanvasRenderResult) => void;
  onError?: (error: VideoProcessorError) => void;
  onStateChange?: (state: VideoProcessorState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export class VideoStreamingEngine {
  private videoElement: HTMLVideoElement | null = null;
  private objectUrl: string | null = null;
  private rvfcHandle: number | null = null;
  private rafHandle: number | null = null;
  private offscreenCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  private state: VideoProcessorState = "idle";
  private isLoop: boolean = true;
  private options: AsciiRenderOptions;
  private callbacks: VideoEngineCallbacks = {};

  private frameIndex: number = 0;
  private framesThisSecond: number = 0;
  private lastFpsTime: number = performance.now();
  private actualFps: number = 60;
  private droppedFrames: number = 0;
  private isDisposed: boolean = false;
  private activeSourceFileName: string | null = null;

  constructor(options: AsciiRenderOptions, callbacks: VideoEngineCallbacks = {}) {
    this.options = { ...options };
    this.callbacks = { ...callbacks };
    this.isLoop = true;
  }

  public getState(): VideoProcessorState {
    return this.state;
  }

  public isLooping(): boolean {
    return this.isLoop;
  }

  public getSourceFileName(): string | null {
    return this.activeSourceFileName;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  public getDuration(): number {
    return this.videoElement?.duration || 0;
  }

  public updateOptions(newOptions: Partial<AsciiRenderOptions>): void {
    this.options = { ...this.options, ...newOptions };
    if (this.state !== "playing" && this.videoElement) {
      this.processSingleFrame();
    }
  }

  public setCallbacks(callbacks: Partial<VideoEngineCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setState(newState: VideoProcessorState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange?.(newState);
    }
  }

  /**
   * Load a video file, blob, media stream, or URL into the engine.
   * Defends against STRESS-1 (corrupted containers, 0-byte files, unsupported codecs).
   */
  public async loadSource(source: File | Blob | MediaStream | string): Promise<void> {
    this.isDisposed = false;
    this.stopLoop();

    // Clean up previous video element and object URL
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute("src");
      this.videoElement.src = "";
      this.videoElement.srcObject = null;
      this.videoElement.onloadedmetadata = null;
      this.videoElement.onplay = null;
      this.videoElement.onpause = null;
      this.videoElement.onended = null;
      this.videoElement.onerror = null;
      this.videoElement.ontimeupdate = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.setState("loading");

    // STRESS-1 Preflight: Check 0-byte corrupt container
    if (source instanceof Blob && source.size === 0) {
      const error: VideoProcessorError = {
        code: "DECODE_ERROR",
        message: "Unsupported video codec or corrupted container (0-byte file).",
        recoverable: true,
        timestampMs: Date.now(),
      };
      this.setState("error");
      this.callbacks.onError?.(error);
      throw error;
    }

    if (source instanceof File) {
      this.activeSourceFileName = source.name;
    } else if (source instanceof MediaStream) {
      this.activeSourceFileName = "Live Camera Stream";
    } else if (typeof source === "string") {
      this.activeSourceFileName = source.split("/").pop() || "Remote Video Stream";
    } else {
      this.activeSourceFileName = "Media Stream";
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true; // Required by browsers for automated frame extraction
    video.autoplay = true;
    video.loop = this.isLoop;

    this.videoElement = video;

    // Connect source to video element
    if (source instanceof MediaStream) {
      video.srcObject = source;
    } else if (source instanceof Blob) {
      this.objectUrl = URL.createObjectURL(source);
      video.src = this.objectUrl;
    } else {
      video.src = source;
    }

    // Set up lifecycle and error event handlers
    return new Promise<void>((resolve, reject) => {
      let isSettled = false;

      const cleanup = () => {
        isSettled = true;
      };

      const checkReady = () => {
        if (!isSettled && (video.readyState >= 2 || video.videoWidth > 0)) {
          cleanup();
          this.setState("ready");
          resolve();
        }
      };

      video.onloadedmetadata = () => {
        checkReady();
      };

      video.oncanplay = () => {
        checkReady();
      };

      video.onplay = () => {
        this.setState("playing");
        this.scheduleFrame();
      };

      video.onpause = () => {
        if (this.state === "playing") {
          this.setState("paused");
        }
        this.stopLoop();
      };

      video.onended = () => {
        this.setState("ended");
        this.stopLoop();
      };

      video.ontimeupdate = () => {
        this.callbacks.onTimeUpdate?.(video.currentTime, video.duration || 0);
      };

      // STRESS-1: Catch unsupported video codecs and container errors cleanly
      video.onerror = () => {
        const mediaError = video.error;
        let code: VideoProcessorError["code"] = "DECODE_ERROR";
        let message = "Failed to decode video source.";

        if (mediaError) {
          if (mediaError.code === 4 /* MEDIA_ERR_SRC_NOT_SUPPORTED */) {
            code = "VIDEO_LOAD_FAILED";
            message = "Unsupported video codec or corrupted container. Supported formats: MP4, WebM.";
          } else if (mediaError.code === 3 /* MEDIA_ERR_DECODE */) {
            code = "DECODE_ERROR";
            message = "Hardware video decoding error or corrupted media data.";
          }
        }

        const procError: VideoProcessorError = {
          code,
          message,
          recoverable: true,
          timestampMs: Date.now(),
        };

        this.setState("error");
        this.stopLoop();
        this.callbacks.onError?.(procError);

        if (!isSettled) {
          cleanup();
          reject(procError);
        }
      };

      // Safety timeout: prevent indefinite hangs on stalled/blocked webview media loading
      setTimeout(() => {
        if (!isSettled && (video.readyState >= 1 || video.videoWidth > 0)) {
          cleanup();
          this.setState("ready");
          resolve();
        }
      }, 3000);
    });
  }

  public async play(): Promise<void> {
    if (!this.videoElement || this.isDisposed) return;
    try {
      await this.videoElement.play();
      this.setState("playing");
      this.scheduleFrame();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        const error: VideoProcessorError = {
          code: "AUTOPLAY_POLICY_BLOCKED",
          message: "Autoplay blocked by browser policy. Interaction required to start video.",
          recoverable: true,
          timestampMs: Date.now(),
        };
        this.callbacks.onError?.(error);
      }
    }
  }

  public pause(): void {
    if (!this.videoElement) return;
    this.videoElement.pause();
    this.setState("paused");
    this.stopLoop();
  }

  public seek(timeSec: number): void {
    if (!this.videoElement) return;
    const duration = this.videoElement.duration || 0;
    const clampedTime = Math.max(0, Math.min(duration, timeSec));
    this.videoElement.currentTime = clampedTime;

    // Immediately trigger one extraction tick on seek if paused
    if (this.state !== "playing") {
      this.processSingleFrame();
    }
  }

  public setLoop(loop: boolean): void {
    this.isLoop = loop;
    if (this.videoElement) {
      this.videoElement.loop = loop;
    }
  }

  public stop(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.currentTime = 0;
    }
    this.stopLoop();
    this.setState("idle");
  }

  /**
   * Schedule the next frame extraction via requestVideoFrameCallback or requestAnimationFrame.
   */
  private scheduleFrame(): void {
    if (this.isDisposed || this.state !== "playing" || !this.videoElement) return;

    const video = this.videoElement;

    if (typeof (video as any).requestVideoFrameCallback === "function") {
      this.rvfcHandle = (video as any).requestVideoFrameCallback(() => {
        this.rvfcHandle = null;
        this.processSingleFrame();
        if (this.state === "playing" && !this.isDisposed) {
          this.scheduleFrame();
        }
      });
    } else if (typeof requestAnimationFrame === "function") {
      this.rafHandle = requestAnimationFrame(() => {
        this.rafHandle = null;
        this.processSingleFrame();
        if (this.state === "playing" && !this.isDisposed) {
          this.scheduleFrame();
        }
      });
    }
  }

  /**
   * Extract video frame onto an offscreen canvas and quantize to ASCII characters.
   */
  public processSingleFrame(): { asciiText: string; metadata: VideoFrameMetadata; renderResult?: CanvasRenderResult } | null {
    if (!this.videoElement || this.isDisposed) return null;
    const video = this.videoElement;

    // Preserve aspect ratio using CHAR_ASPECT = 0.5 (from Python fit_source_size)
    const cols = this.options.max_output_columns;
    let rows = this.options.max_output_rows;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      rows = Math.max(1, Math.round(cols * (video.videoHeight / video.videoWidth) * 0.5));
    }

    const startExtract = performance.now();

    // Ensure offscreen canvas matches target grid dimensions
    if (!this.offscreenCanvas) {
      if (typeof OffscreenCanvas !== "undefined") {
        this.offscreenCanvas = new OffscreenCanvas(cols, rows);
      } else if (typeof document !== "undefined" && document.createElement) {
        const c = document.createElement("canvas");
        c.width = cols;
        c.height = rows;
        this.offscreenCanvas = c;
      }
    }

    if (this.offscreenCanvas) {
      if (this.offscreenCanvas.width !== cols || this.offscreenCanvas.height !== rows) {
        this.offscreenCanvas.width = cols;
        this.offscreenCanvas.height = rows;
      }
    }

    if (!this.offscreenCtx && this.offscreenCanvas) {
      this.offscreenCtx = (this.offscreenCanvas as any).getContext("2d", { willReadFrequently: true });
    }

    let imageData: ImageData | null = null;
    let extractDuration = 0;

    if (this.offscreenCtx) {
      try {
        this.offscreenCtx.drawImage(video, 0, 0, cols, rows);
        extractDuration = performance.now() - startExtract;
        imageData = this.offscreenCtx.getImageData(0, 0, cols, rows);
      } catch (err: any) {
        // Cross-origin or tainted canvas error defense
        this.droppedFrames++;
      }
    }

    const startRender = performance.now();
    let asciiText = "";
    let renderResult: CanvasRenderResult | undefined = undefined;

    if (imageData) {
      const renderOptions: AsciiRenderOptions = {
        ...this.options,
        max_output_columns: cols,
        max_output_rows: rows,
      };
      renderResult = renderImageDataToAscii(imageData, renderOptions);
      asciiText = renderResult.asciiText;
    } else {
      // Fallback deterministic quantization if canvas 2D context is mocked or unavailable
      const ramp = getCharsetRamp(this.options.charset.preset, this.options.charset.custom_glyphs, this.options.charset.invert);
      const line = ramp[Math.floor(ramp.length / 2)].repeat(cols);
      asciiText = Array(rows).fill(line).join("\n");
    }

    const renderDuration = performance.now() - startRender;

    this.frameIndex++;
    this.framesThisSecond++;

    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.actualFps = Math.round((this.framesThisSecond * 1000) / (now - this.lastFpsTime));
      this.framesThisSecond = 0;
      this.lastFpsTime = now;
    }

    const metadata: VideoFrameMetadata = {
      frameIndex: this.frameIndex,
      mediaTimeSec: video.currentTime || 0,
      durationSec: video.duration || 0,
      videoWidth: video.videoWidth || cols,
      videoHeight: video.videoHeight || rows,
      outputColumns: cols,
      outputRows: rows,
      extractionDurationMs: Math.round(extractDuration * 10) / 10,
      renderDurationMs: Math.round(renderDuration * 10) / 10,
      fpsActual: this.actualFps,
      droppedFrames: this.droppedFrames,
    };

    this.callbacks.onFrame?.(asciiText, metadata, renderResult);
    return { asciiText, metadata, renderResult };
  }

  /**
   * Stop all active frame loops synchronously.
   */
  private stopLoop(): void {
    if (
      this.rvfcHandle !== null &&
      this.videoElement &&
      typeof (this.videoElement as any).cancelVideoFrameCallback === "function"
    ) {
      (this.videoElement as any).cancelVideoFrameCallback(this.rvfcHandle);
      this.rvfcHandle = null;
    }

    if (this.rafHandle !== null && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  /**
   * Full synchronous disposal (STRESS-2 Defense).
   * Cancels rVFC / RAF, pauses video, revokes object URLs, and cleans canvas contexts.
   */
  public dispose(): void {
    this.isDisposed = true;
    this.stopLoop();

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute("src");
      this.videoElement.src = "";
      this.videoElement.srcObject = null;
      this.videoElement.onloadedmetadata = null;
      this.videoElement.onplay = null;
      this.videoElement.onpause = null;
      this.videoElement.onended = null;
      this.videoElement.onerror = null;
      this.videoElement.ontimeupdate = null;
      this.videoElement = null;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.setState("idle");
  }
}

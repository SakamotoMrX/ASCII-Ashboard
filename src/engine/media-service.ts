import {
  CameraConfig,
  RecordingMetadata,
  SnapshotMetadata,
  MediaPickerError,
} from "../contracts";

export interface ActiveCameraSession {
  stream: MediaStream;
  videoTrack: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
}

export interface ActiveRecordingSession {
  mediaRecorder: MediaRecorder;
  mimeType: string;
  stop: () => Promise<RecordingMetadata>;
}

export const SUPPORTED_MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
] as const;

export function getOptimalRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "video/webm";
  }
  for (const candidate of SUPPORTED_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "video/webm";
}

export class MediaEngineService {
  private activeStream: MediaStream | null = null;
  private activeRecording: {
    recorder: MediaRecorder;
    chunks: Blob[];
    startTime: number;
    mimeType: string;
    stream: MediaStream;
  } | null = null;

  async startCamera(
    config: Partial<CameraConfig> = {},
    timeoutMs: number = 2000
  ): Promise<ActiveCameraSession> {
    this.stopCamera();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const error: MediaPickerError = {
        code: "DEVICE_NOT_FOUND",
        message: "Media devices API not supported in this runtime environment.",
        recoverable: false,
      };
      throw error;
    }

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: config.facingMode || "user",
        width: { ideal: config.width || 1280 },
        height: { ideal: config.height || 720 },
        frameRate: { ideal: config.frameRate || 30 },
      },
      audio: config.audio ?? false,
    };

    if (config.deviceId) {
      (constraints.video as MediaTrackConstraints).deviceId = { exact: config.deviceId };
    }

    // Wrap getUserMedia in a timeout to detect Tauri / Webview permission deadlock (STRESS-TAURI-04)
    let timer: ReturnType<typeof setTimeout> | undefined;
    const streamPromise = navigator.mediaDevices.getUserMedia(constraints);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error: MediaPickerError = {
          code: "TAURI_WEBVIEW_ERROR",
          message: "Camera initialization timed out. Webview permission dialog may be blocked or unresponsive.",
          technicalDetails: `Timed out after ${timeoutMs}ms waiting for camera track`,
          recoverable: true,
        };
        reject(error);
      }, timeoutMs);
    });

    try {
      const stream = await Promise.race([streamPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      const videoTracks = stream.getVideoTracks();

      if (!videoTracks || videoTracks.length === 0) {
        const err: MediaPickerError = {
          code: "DEVICE_NOT_FOUND",
          message: "No active video track found on media stream.",
          recoverable: true,
        };
        throw err;
      }

      const videoTrack = videoTracks[0];
      const audioTracks = stream.getAudioTracks();
      const audioTrack = audioTracks.length > 0 ? audioTracks[0] : undefined;

      this.activeStream = stream;

      return {
        stream,
        videoTrack,
        audioTrack,
      };
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      if (err.code && err.message && typeof err.recoverable === "boolean") {
        throw err;
      }

      let code: MediaPickerError["code"] = "DEVICE_NOT_FOUND";
      let message = err.message || "Failed to initialize camera.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        code = "PERMISSION_DENIED";
        message = "Camera permission was denied by the user or operating system.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        code = "DEVICE_NOT_FOUND";
        message = "No compatible camera device detected on this system.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        code = "MEDIA_TRACK_MUTED";
        message = "Camera is currently in use by another process or unreadable.";
      }

      const pickerError: MediaPickerError = {
        code,
        message,
        technicalDetails: err.stack || String(err),
        recoverable: true,
      };
      throw pickerError;
    }
  }

  stopCamera(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }
  }

  getActiveStream(): MediaStream | null {
    return this.activeStream;
  }

  startRecording(stream: MediaStream): ActiveRecordingSession {
    if (this.activeRecording) {
      try {
        if (this.activeRecording.recorder.state !== "inactive") {
          this.activeRecording.recorder.stop();
        }
      } catch {
        // Ignore cleanup error
      }
      this.activeRecording = null;
    }

    const mimeType = getOptimalRecordingMimeType();
    const chunks: Blob[] = [];

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      // Fallback without mimeType option if constructor fails
      recorder = new MediaRecorder(stream);
    }

    const startTime = performance.now();

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.start(100);

    const recordingRef = {
      recorder,
      chunks,
      startTime,
      mimeType: recorder.mimeType || mimeType,
      stream,
    };
    this.activeRecording = recordingRef;

    const stop = (): Promise<RecordingMetadata> => {
      return new Promise<RecordingMetadata>((resolve, reject) => {
        if (recorder.state === "inactive") {
          const blob = new Blob(chunks, { type: recordingRef.mimeType });
          const blobUrl = URL.createObjectURL(blob);
          const durationMs = Math.max(0, performance.now() - startTime);

          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack?.getSettings() || {};
          const videoWidth = settings.width || 1280;
          const videoHeight = settings.height || 720;

          resolve({
            durationMs,
            mimeType: recordingRef.mimeType,
            fileSizeBytes: blob.size,
            blobUrl,
            createdAt: new Date().toISOString(),
            videoWidth,
            videoHeight,
          });
          return;
        }

        recorder.onerror = (e: any) => {
          reject({
            code: "RECORDER_ABORTED",
            message: e?.error?.message || "MediaRecorder error encountered.",
            recoverable: true,
          } as MediaPickerError);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recordingRef.mimeType });
          const blobUrl = URL.createObjectURL(blob);
          const durationMs = Math.max(0, performance.now() - startTime);

          const videoTrack = stream.getVideoTracks()[0];
          const settings = videoTrack?.getSettings() || {};
          const videoWidth = settings.width || 1280;
          const videoHeight = settings.height || 720;

          resolve({
            durationMs,
            mimeType: recordingRef.mimeType,
            fileSizeBytes: blob.size,
            blobUrl,
            createdAt: new Date().toISOString(),
            videoWidth,
            videoHeight,
          });
        };

        try {
          recorder.stop();
        } catch (err: any) {
          reject({
            code: "RECORDER_ABORTED",
            message: err.message || "Failed to stop MediaRecorder",
            recoverable: true,
          } as MediaPickerError);
        }
      });
    };

    return {
      mediaRecorder: recorder,
      mimeType: recordingRef.mimeType,
      stop,
    };
  }

  async capturePhoto(
    source: HTMLVideoElement | CanvasImageSource,
    format: "image/jpeg" | "image/png" = "image/jpeg",
    quality = 0.92
  ): Promise<SnapshotMetadata> {
    let width = 640;
    let height = 480;

    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth || 640;
      height = source.videoHeight || 480;
    } else if ("width" in source && "height" in source) {
      width = (source as any).width || 640;
      height = (source as any).height || 480;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      const err: MediaPickerError = {
        code: "TAURI_WEBVIEW_ERROR",
        message: "Failed to initialize 2D context for offscreen photo capture.",
        recoverable: true,
      };
      throw err;
    }

    ctx.drawImage(source, 0, 0, width, height);

    const dataUrl = canvas.toDataURL(format, quality);

    // Approximate byte length from dataUrl base64 length
    const head = `data:${format};base64,`;
    const base64Content = dataUrl.startsWith(head) ? dataUrl.slice(head.length) : "";
    const fileSizeBytes = Math.round((base64Content.length * 3) / 4);

    return {
      dataUrl,
      mimeType: format,
      width,
      height,
      fileSizeBytes,
      capturedAt: new Date().toISOString(),
    };
  }
}

export const mediaEngineService = new MediaEngineService();

export { VideoStreamingEngine } from "./video-pipeline";
export type { VideoEngineCallbacks } from "./video-pipeline";


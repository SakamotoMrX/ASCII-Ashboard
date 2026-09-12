import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MediaEngineService,
  getOptimalRecordingMimeType,
} from "../engine/media-service";

describe("MediaEngineService", () => {
  let mediaService: MediaEngineService;

  beforeEach(() => {
    mediaService = new MediaEngineService();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    mediaService.stopCamera();
    vi.useRealTimers();
  });

  describe("getOptimalRecordingMimeType & MIME Negotiation", () => {
    it("should return the first candidate supported by MediaRecorder.isTypeSupported", () => {
      const isTypeSupportedMock = vi.fn((mime: string) => {
        return mime === "video/webm;codecs=vp8";
      });

      // @ts-expect-error Mocking global MediaRecorder
      global.MediaRecorder = {
        isTypeSupported: isTypeSupportedMock,
      };

      const result = getOptimalRecordingMimeType();
      expect(result).toBe("video/webm;codecs=vp8");
      expect(isTypeSupportedMock).toHaveBeenCalled();
    });

    it("should fallback to video/webm if no candidate is explicitly supported", () => {
      // @ts-expect-error Mocking global MediaRecorder
      global.MediaRecorder = {
        isTypeSupported: vi.fn(() => false),
      };

      const result = getOptimalRecordingMimeType();
      expect(result).toBe("video/webm");
    });

    it("should fallback to video/webm if MediaRecorder is not defined", () => {
      const originalMediaRecorder = global.MediaRecorder;
      // @ts-expect-error Deleting global MediaRecorder
      delete global.MediaRecorder;

      const result = getOptimalRecordingMimeType();
      expect(result).toBe("video/webm");

      global.MediaRecorder = originalMediaRecorder;
    });
  });

  describe("startCamera & Hardware Permissions", () => {
    it("should initialize camera stream successfully with correct tracks", async () => {
      const mockVideoTrack = {
        kind: "video",
        id: "video-track-1",
        stop: vi.fn(),
        getSettings: () => ({ width: 1280, height: 720 }),
      };

      const mockAudioTrack = {
        kind: "audio",
        id: "audio-track-1",
        stop: vi.fn(),
      };

      const mockStream = {
        getTracks: () => [mockVideoTrack, mockAudioTrack],
        getVideoTracks: () => [mockVideoTrack],
        getAudioTracks: () => [mockAudioTrack],
      } as unknown as MediaStream;

      const getUserMediaMock = vi.fn().mockResolvedValue(mockStream);

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: { getUserMedia: getUserMediaMock } as unknown as MediaDevices,
        configurable: true,
        writable: true,
      });

      const session = await mediaService.startCamera({ width: 1280, height: 720, audio: true });
      expect(session.stream).toBe(mockStream);
      expect(session.videoTrack).toBe(mockVideoTrack);
      expect(session.audioTrack).toBe(mockAudioTrack);
      expect(getUserMediaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }),
          audio: true,
        })
      );
    });

    it("should handle NotAllowedError with PERMISSION_DENIED structured error (STRESS-CAM-01)", async () => {
      const error = new Error("Permission denied by system");
      error.name = "NotAllowedError";

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockRejectedValue(error) } as unknown as MediaDevices,
        configurable: true,
        writable: true,
      });

      await expect(mediaService.startCamera()).rejects.toMatchObject({
        code: "PERMISSION_DENIED",
        message: expect.stringContaining("Camera permission was denied"),
        recoverable: true,
      });
    });

    it("should handle NotFoundError with DEVICE_NOT_FOUND structured error", async () => {
      const error = new Error("No camera found");
      error.name = "NotFoundError";

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockRejectedValue(error) } as unknown as MediaDevices,
        configurable: true,
        writable: true,
      });

      await expect(mediaService.startCamera()).rejects.toMatchObject({
        code: "DEVICE_NOT_FOUND",
        message: expect.stringContaining("No compatible camera device detected"),
        recoverable: true,
      });
    });

    it("should detect Tauri / Webview deadlock with TAURI_WEBVIEW_ERROR when getUserMedia hangs (STRESS-TAURI-04)", async () => {
      vi.useFakeTimers();

      const hangingPromise = new Promise<MediaStream>(() => {});

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockReturnValue(hangingPromise) } as unknown as MediaDevices,
        configurable: true,
        writable: true,
      });

      const cameraPromise = mediaService.startCamera({}, 100);

      vi.advanceTimersByTime(150);

      await expect(cameraPromise).rejects.toMatchObject({
        code: "TAURI_WEBVIEW_ERROR",
        message: expect.stringContaining("Camera initialization timed out"),
        recoverable: true,
      });
    });

    it("should clean up and stop previous active tracks when new camera starts or stops", async () => {
      const stopMock = vi.fn();
      const mockVideoTrack = {
        kind: "video",
        stop: stopMock,
        getSettings: () => ({ width: 640, height: 480 }),
      };
      const mockStream = {
        getTracks: () => [mockVideoTrack],
        getVideoTracks: () => [mockVideoTrack],
        getAudioTracks: () => [],
      } as unknown as MediaStream;

      Object.defineProperty(global.navigator, "mediaDevices", {
        value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) } as unknown as MediaDevices,
        configurable: true,
        writable: true,
      });

      await mediaService.startCamera();
      expect(mediaService.getActiveStream()).toBe(mockStream);

      mediaService.stopCamera();
      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(mediaService.getActiveStream()).toBeNull();
    });
  });

  describe("startRecording & stopRecording Flow", () => {
    it("should record chunks and return valid RecordingMetadata on stop", async () => {
      const mockVideoTrack = {
        kind: "video",
        getSettings: () => ({ width: 1280, height: 720 }),
      };
      const mockStream = {
        getVideoTracks: () => [mockVideoTrack],
        getTracks: () => [mockVideoTrack],
      } as unknown as MediaStream;

      class MockMediaRecorder {
        state = "recording";
        mimeType = "video/webm;codecs=vp9";
        ondataavailable: ((e: any) => void) | null = null;
        onstop: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;

        constructor(_stream: MediaStream, options?: any) {
          if (options?.mimeType) {
            this.mimeType = options.mimeType;
          }
        }

        static isTypeSupported = vi.fn(() => true);

        start = vi.fn();
        stop = vi.fn(() => {
          this.state = "inactive";
          if (this.onstop) {
            this.onstop();
          }
        });
      }

      // @ts-expect-error Mocking global MediaRecorder
      global.MediaRecorder = MockMediaRecorder;

      global.URL.createObjectURL = vi.fn(() => "blob:http://localhost:3000/mock-recording-uuid");

      const session = mediaService.startRecording(mockStream);
      expect(session.mimeType).toBe("video/webm;codecs=vp9,opus");
      expect(session.mediaRecorder).toBeInstanceOf(MockMediaRecorder);

      session.mediaRecorder.ondataavailable?.({
        data: new Blob(["sample-chunk-data"], { type: "video/webm;codecs=vp9,opus" }),
      } as any);

      const metadata = await session.stop();

      expect(metadata.mimeType).toBe("video/webm;codecs=vp9,opus");
      expect(metadata.blobUrl).toBe("blob:http://localhost:3000/mock-recording-uuid");
      expect(metadata.videoWidth).toBe(1280);
      expect(metadata.videoHeight).toBe(720);
      expect(metadata.fileSizeBytes).toBeGreaterThan(0);
      expect(metadata.createdAt).toBeDefined();
    });

    it("should handle recorder errors gracefully with RECORDER_ABORTED", async () => {
      const mockStream = {
        getVideoTracks: () => [],
        getTracks: () => [],
      } as unknown as MediaStream;

      class FailingRecorder {
        state = "recording";
        mimeType = "video/webm";
        onerror: ((e: any) => void) | null = null;
        start = vi.fn();
        stop = vi.fn(() => {
          if (this.onerror) {
            this.onerror({ error: new Error("Buffer overflow") });
          }
        });
      }

      // @ts-expect-error Mocking global MediaRecorder
      global.MediaRecorder = FailingRecorder;

      const session = mediaService.startRecording(mockStream);
      await expect(session.stop()).rejects.toMatchObject({
        code: "RECORDER_ABORTED",
        message: expect.stringContaining("Buffer overflow"),
      });
    });
  });

  describe("capturePhoto", () => {
    it("should capture photo from video element and produce valid SnapshotMetadata", async () => {
      const drawImageMock = vi.fn();
      const getContextMock = vi.fn(() => ({
        drawImage: drawImageMock,
      }));

      // Set up global document if not present in node environment
      if (typeof global.document === "undefined") {
        // @ts-expect-error minimal mock document for photo capture
        global.document = {};
      }

      global.document.createElement = vi.fn((tagName: string) => {
        if (tagName === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: getContextMock,
            toDataURL: vi.fn(() => "data:image/jpeg;base64,dGVzdC1pbWFnZS1kYXRh"),
          } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      });

      const mockVideo = {
        videoWidth: 1920,
        videoHeight: 1080,
      } as unknown as HTMLVideoElement;

      // In node env, define HTMLVideoElement if not present
      if (typeof global.HTMLVideoElement === "undefined") {
        // @ts-expect-error stub for node
        global.HTMLVideoElement = class {};
      }
      Object.setPrototypeOf(mockVideo, global.HTMLVideoElement.prototype);

      const snapshot = await mediaService.capturePhoto(mockVideo, "image/jpeg", 0.95);

      expect(snapshot.dataUrl).toContain("data:image/jpeg;base64,");
      expect(snapshot.mimeType).toBe("image/jpeg");
      expect(snapshot.width).toBe(1920);
      expect(snapshot.height).toBe(1080);
      expect(snapshot.fileSizeBytes).toBeGreaterThan(0);
      expect(snapshot.capturedAt).toBeDefined();
      expect(drawImageMock).toHaveBeenCalledWith(mockVideo, 0, 0, 1920, 1080);
    });

    it("should reject when 2D context creation fails", async () => {
      if (typeof global.document === "undefined") {
        // @ts-expect-error minimal mock document
        global.document = {};
      }

      global.document.createElement = vi.fn((tagName: string) => {
        if (tagName === "canvas") {
          return {
            width: 0,
            height: 0,
            getContext: vi.fn(() => null),
          } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      });

      const mockVideo = {
        videoWidth: 640,
        videoHeight: 480,
      } as unknown as HTMLVideoElement;
      if (typeof global.HTMLVideoElement === "undefined") {
        // @ts-expect-error stub for node
        global.HTMLVideoElement = class {};
      }
      Object.setPrototypeOf(mockVideo, global.HTMLVideoElement.prototype);

      await expect(mediaService.capturePhoto(mockVideo)).rejects.toMatchObject({
        code: "TAURI_WEBVIEW_ERROR",
        message: expect.stringContaining("Failed to initialize 2D context"),
      });
    });
  });
});

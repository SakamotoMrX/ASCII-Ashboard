import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Camera, Square, RefreshCw, Check, Video } from "lucide-react";

export type MediaPickerState = "idle" | "recording" | "captured" | "uploaded";

export interface MediaMetadata {
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSec?: number;
  type: "image" | "video";
}

interface MediaPickerProps {
  onApplyPhotoToAscii: (canvas: HTMLCanvasElement) => void;
  onApplyMediaStream?: (stream: MediaStream) => void;
  onApplyVideoElement?: (video: HTMLVideoElement) => void;
  onApplyImageFile?: (file: File) => void;
  onApplyVideoFile?: (file: File) => void;
  onCancel?: () => void;
  initialState?: MediaPickerState;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({
  onApplyPhotoToAscii,
  onApplyMediaStream,
  onApplyVideoElement,
  onApplyImageFile,
  onApplyVideoFile,
  onCancel,
  initialState = "idle",
}) => {
  const [state, setState] = useState<MediaPickerState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recording State
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Media references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Captured snapshot state
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapshotPreviewUrl, setSnapshotPreviewUrl] = useState<string | null>(null);

  // Uploaded state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MediaMetadata | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream safely
  const stopCameraStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialState === "captured" && !snapshotPreviewUrl) {
      setSnapshotPreviewUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
    } else if (initialState === "uploaded" && !metadata) {
      setMetadata({
        fileName: "sample_recording.webm",
        fileSize: 1048576,
        width: 1280,
        height: 720,
        durationSec: 14,
        type: "video",
      });
    }
  }, [initialState]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (snapshotPreviewUrl) URL.revokeObjectURL(snapshotPreviewUrl);
      if (uploadedPreviewUrl) URL.revokeObjectURL(uploadedPreviewUrl);
    };
  }, [stopCameraStream, snapshotPreviewUrl, uploadedPreviewUrl]);

  // Request camera stream helper
  const startCamera = async (forRecording: boolean) => {
    setErrorMessage(null);
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: forRecording,
      });
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (forRecording) {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
          setUploadedFile(file);
          setUploadedPreviewUrl(url);
          setMetadata({
            fileName: file.name,
            fileSize: file.size,
            durationSec: recordingSeconds,
            type: "video",
          });
          setState("uploaded");
          stopCameraStream();
        };

        recorder.start(100);
        mediaRecorderRef.current = recorder;
        setRecordingSeconds(0);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
        setState("recording");
      } else {
        if (onApplyMediaStream) {
          onApplyMediaStream(stream);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to access camera device.");
      setState("idle");
    }
  };

  // 1. Capture Photo Snapshot
  const handleSnapPhoto = async () => {
    setErrorMessage(null);
    try {
      if (!mediaStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      }

      // Small delay to ensure frame is available
      setTimeout(() => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = snapshotCanvasRef.current || document.createElement("canvas");
        snapshotCanvasRef.current = canvas;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          setSnapshotPreviewUrl(dataUrl);
          setState("captured");
          stopCameraStream();
        }
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not snap photo.");
    }
  };

  // 2. Stop & Save Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // 3. File Drop & Picker Handler
  const handleFile = (file: File) => {
    setErrorMessage(null);
    const isVid = file.type.startsWith("video/");
    const isImg = file.type.startsWith("image/");

    if (!isVid && !isImg) {
      setErrorMessage("Unsupported file type. Please provide an image or video file.");
      return;
    }

    const url = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedPreviewUrl(url);

    if (isImg) {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setMetadata({
          fileName: file.name,
          fileSize: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          type: "image",
        });
        setState("uploaded");
      };
    } else {
      const vid = document.createElement("video");
      vid.src = url;
      vid.onloadedmetadata = () => {
        setMetadata({
          fileName: file.name,
          fileSize: file.size,
          width: vid.videoWidth,
          height: vid.videoHeight,
          durationSec: Math.round(vid.duration),
          type: "video",
        });
        setState("uploaded");
      };
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="w-full bg-[#1a1a1a] border border-[#27272a] rounded-[4px] p-6 text-[#ffffff] font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#27272a]">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-[#ffffff]">Media Ingestion</h2>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Capture, record, or upload media for real-time ASCII rasterization.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={() => {
              stopCameraStream();
              onCancel();
            }}
            className="text-xs text-[#a1a1aa] hover:text-[#ffffff] px-2 py-1 min-h-[44px] inline-flex items-center"
          >
            Close
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 px-3 py-2 bg-[#18181b] border border-[#ff4444]/40 text-[#ff4444] text-xs rounded-[4px]">
          {errorMessage}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* STATE 1: IDLE */}
      {state === "idle" && (
        <div data-testid="media-picker-idle" className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-[#27272a] hover:border-[#ffffff] transition-colors rounded-[4px] p-8 text-center bg-[#09090b] flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-[#a1a1aa] mb-2" />
            <p className="text-xs text-[#ffffff] font-medium">Drag & drop video or image files here</p>
            <p className="text-[11px] text-[#a1a1aa] mt-1">Supports MP4, WebM, PNG, JPEG, WebP</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-[#ffffff]" />
              <span>Select File</span>
            </button>

            <button
              onClick={() => startCamera(true)}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] flex items-center justify-center gap-2 transition-colors"
            >
              <Video className="w-4 h-4 text-[#ffffff]" />
              <span>Record Video</span>
            </button>

            <button
              onClick={handleSnapPhoto}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-4 h-4 text-[#ffffff]" />
              <span>Snap Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: RECORDING */}
      {state === "recording" && (
        <div data-testid="media-picker-recording" className="space-y-4">
          <div className="relative bg-[#09090b] rounded-[4px] overflow-hidden border border-[#27272a] flex items-center justify-center min-h-[300px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-[360px] object-contain"
            />
            {/* Blinking indicator & timer */}
            <div className="absolute top-3 left-3 bg-[#09090b]/90 border border-[#27272a] px-3 py-1.5 rounded-[4px] flex items-center gap-2 font-mono text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffffff] animate-pulse" />
              <span className="text-[#ffffff] font-semibold">{formatTime(recordingSeconds)}</span>
              <span className="text-[#a1a1aa] text-[10px]">REC</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStopRecording}
              className="flex-1 min-h-[44px] px-4 py-2 bg-[#ffffff] text-[#000000] hover:bg-[#e4e4e7] border border-[#ffffff] text-xs font-semibold rounded-[4px] flex items-center justify-center gap-2 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop & Save Video</span>
            </button>
            <button
              onClick={() => {
                stopCameraStream();
                setState("idle");
              }}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: CAPTURED PHOTO */}
      {state === "captured" && (
        <div data-testid="media-picker-captured" className="space-y-4">
          <div className="bg-[#09090b] rounded-[4px] p-2 border border-[#27272a] flex items-center justify-center min-h-[260px]">
            {snapshotPreviewUrl && (
              <img
                src={snapshotPreviewUrl}
                alt="Captured Snapshot"
                className="max-h-[320px] object-contain rounded-[2px]"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (snapshotCanvasRef.current) {
                  onApplyPhotoToAscii(snapshotCanvasRef.current);
                }
              }}
              className="flex-1 min-h-[44px] px-4 py-2 bg-[#ffffff] text-[#000000] hover:bg-[#e4e4e7] border border-[#ffffff] text-xs font-semibold rounded-[4px] flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply to ASCII Canvas</span>
            </button>
            <button
              onClick={() => {
                setState("idle");
                handleSnapPhoto();
              }}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-[#a1a1aa]" />
              <span>Retake Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: UPLOADED PREVIEW & METADATA */}
      {state === "uploaded" && (
        <div data-testid="media-picker-uploaded" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#09090b] rounded-[4px] p-2 border border-[#27272a] flex items-center justify-center min-h-[200px]">
              {metadata?.type === "image" && uploadedPreviewUrl && (
                <img
                  src={uploadedPreviewUrl}
                  alt="Uploaded Media"
                  className="max-h-[240px] object-contain rounded-[2px]"
                />
              )}
              {metadata?.type === "video" && uploadedPreviewUrl && (
                <video
                  src={uploadedPreviewUrl}
                  controls
                  className="max-h-[240px] w-full object-contain rounded-[2px]"
                  onPlay={(e) => {
                    if (onApplyVideoElement) {
                      onApplyVideoElement(e.currentTarget);
                    }
                  }}
                />
              )}
            </div>

            {/* Metadata Info Panel */}
            <div className="bg-[#18181b] rounded-[4px] p-4 border border-[#27272a] flex flex-col justify-between text-xs font-mono">
              <div className="space-y-2">
                <div className="text-[11px] font-sans font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Media Metadata
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#a1a1aa]">File Name</span>
                  <span className="text-[#ffffff] truncate max-w-[180px]">{metadata?.fileName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#a1a1aa]">Type</span>
                  <span className="text-[#ffffff] uppercase">{metadata?.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#a1a1aa]">Size</span>
                  <span className="text-[#ffffff]">
                    {metadata?.fileSize ? Math.round(metadata.fileSize / 1024) : 0} KB
                  </span>
                </div>
                {metadata?.width && metadata?.height && (
                  <div className="flex justify-between py-1 border-b border-[#27272a]">
                    <span className="text-[#a1a1aa]">Dimensions</span>
                    <span className="text-[#ffffff]">
                      {metadata.width} × {metadata.height}
                    </span>
                  </div>
                )}
                {metadata?.durationSec !== undefined && metadata?.durationSec > 0 && (
                  <div className="flex justify-between py-1 border-b border-[#27272a]">
                    <span className="text-[#a1a1aa]">Duration</span>
                    <span className="text-[#ffffff]">{formatTime(metadata.durationSec)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (uploadedFile) {
                  if (metadata?.type === "image" && onApplyImageFile) {
                    onApplyImageFile(uploadedFile);
                  } else if (metadata?.type === "video" && onApplyVideoFile) {
                    onApplyVideoFile(uploadedFile);
                  }
                }
              }}
              className="flex-1 min-h-[44px] px-4 py-2 bg-[#ffffff] text-[#000000] hover:bg-[#e4e4e7] border border-[#ffffff] text-xs font-semibold rounded-[4px] flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Convert to ASCII</span>
            </button>
            <button
              onClick={() => {
                setState("idle");
                fileInputRef.current?.click();
              }}
              className="min-h-[44px] px-4 py-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] text-xs font-medium rounded-[4px] border border-[#27272a] flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-[#a1a1aa]" />
              <span>Replace Media</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

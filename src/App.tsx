import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AsciiRenderOptions,
  Procedural3DParams,
  RenderMode,
  RenderTier,
} from "./contracts";
import { Header } from "./components/Header";
import { ControlPanel } from "./components/ControlPanel";
import { AsciiCanvas } from "./components/AsciiCanvas";
import { TelemetryDrawer, TelemetryData } from "./components/TelemetryDrawer";
import { MediaPicker } from "./components/MediaPicker";
import { BootLoadingScreen } from "./components/BootLoadingScreen";
import { ConstellationGraph } from "./components/ConstellationGraph";
import { TechnicalStickers } from "./components/TechnicalStickers";
import { renderProcedural3D } from "./engine/procedural-3d";
import { getCharsetRamp } from "./engine/charsets";
import { preflightImageFile } from "./engine/image-preflight";
import { CanvasRenderResult, renderImageDataToAscii } from "./engine/canvas-renderer";
import { globalTierManager } from "./engine/tier-manager";
import { StreamPipeline } from "./engine/stream-pipeline";
import { getTelemetryFromHost } from "./engine/tauri-bridge";
import { VideoStreamingEngine } from "./engine/video-pipeline";
import { mediaEngineService } from "./engine/media-service";

/**
 * Shared helper to paint ASCII text lines onto a 2D canvas backing store.
 * Supports run-length optimized True-Color RGB rendering matching ascii_colour_video.py.
 */
function paintAsciiToCanvas(
  canvas: HTMLCanvasElement | null,
  text: string,
  options: AsciiRenderOptions,
  colorBuffer?: Uint8Array
): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const lines = text.split("\n");
  const rows = lines.length;
  const cols = lines[0]?.length || options.max_output_columns;

  const charWidth = options.cell_width_px;
  const charHeight = options.cell_height_px;

  const targetWidth = cols * charWidth;
  const targetHeight = rows * charHeight;

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  // Clear background
  ctx.fillStyle = "#121212";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set font and baseline
  ctx.font = `${options.font_size_px}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "top";

  const isTruecolor = (options.color_mode === "truecolor" || options.color_mode === "rgb_ansi") && !!colorBuffer;

  if (isTruecolor && colorBuffer) {
    for (let r = 0; r < rows; r++) {
      const line = lines[r];
      if (!line) continue;
      const lineLen = line.length;
      let c = 0;

      while (c < lineLen) {
        const cIdx = (r * cols + c) * 3;
        const red = colorBuffer[cIdx];
        const green = colorBuffer[cIdx + 1];
        const blue = colorBuffer[cIdx + 2];

        // Run-length optimization: batch adjacent characters sharing the same color
        let runEnd = c + 1;
        while (runEnd < lineLen) {
          const nextIdx = (r * cols + runEnd) * 3;
          if (
            colorBuffer[nextIdx] === red &&
            colorBuffer[nextIdx + 1] === green &&
            colorBuffer[nextIdx + 2] === blue
          ) {
            runEnd++;
          } else {
            break;
          }
        }

        ctx.fillStyle = `rgb(${red},${green},${blue})`;
        ctx.fillText(line.substring(c, runEnd), c * charWidth, r * charHeight);
        c = runEnd;
      }
    }
  } else {
    switch (options.color_mode) {
      case "matrix_green":
        ctx.fillStyle = "#00ff88";
        break;
      case "amber":
        ctx.fillStyle = "#ffb700";
        break;
      case "cyberpunk_neon":
        ctx.fillStyle = "#ff3366";
        break;
      case "truecolor":
      case "rgb_ansi":
      case "monochrome":
      default:
        ctx.fillStyle = "#f3f4f6";
    }

    for (let r = 0; r < rows; r++) {
      ctx.fillText(lines[r], 0, r * charHeight);
    }
  }
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = (urlParams.get("mode") as RenderMode | "settings" | "media_picker") || "procedural_3d";
  const initialScene = (urlParams.get("scene") as any) || "donut";
  const initialPickerState = (urlParams.get("picker_state") as any) || "idle";

  const [activeTab, setActiveTab] = useState<RenderMode | "settings" | "media_picker">(initialMode);
  const [activeTier, setActiveTier] = useState<RenderTier>("tier1_webgpu");
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [showBoot, setShowBoot] = useState<boolean>(true);

  // Procedural 3D State
  const [proceduralParams, setProceduralParams] = useState<Procedural3DParams>({
    scene: initialScene,
    rotation_speed_x: 1.0,
    rotation_speed_y: 1.0,
    rotation_speed_z: 0.0,
    camera_distance: 5.0,
    field_of_view: 60,
    light_direction: [0, 1, -1],
    ambient_light: 0.2,
    specular_strength: 0.5,
  });

  // ASCII Rendering Options
  const [options, setOptions] = useState<AsciiRenderOptions>({
    mode: "procedural_3d",
    tier: "tier1_webgpu",
    color_mode: "monochrome",
    charset: {
      preset: "standard",
      invert: false,
      glyph_aspect_ratio: 0.55,
    },
    contrast: 0,
    brightness: 0,
    gamma: 1.0,
    dither: "none",
    cell_width_px: 8,
    cell_height_px: 14,
    font_size_px: 12,
    font_family: "JetBrains Mono",
    fps_cap: 60,
    enable_scanlines: false,
    enable_bloom: false,
    max_output_columns: 100,
    max_output_rows: 45,
  });

  const [asciiOutput, setAsciiOutput] = useState<string>("");
  const [renderTimeMs, setRenderTimeMs] = useState<number>(1.2);
  const [fps, setFps] = useState<number>(60);
  const [droppedFrames, setDroppedFrames] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isStreamingCamera, setIsStreamingCamera] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Video playback state
  const [videoState, setVideoState] = useState({
    isPlaying: false,
    isLooping: true,
    currentTime: 0,
    duration: 0,
    fileName: null as string | null,
  });

  const [hostTelemetry, setHostTelemetry] = useState({
    platform: "web",
    sandbox_sealed: true,
    rust_engine_version: "1.0.0",
    max_ipc_payload_bytes: 32 * 1024 * 1024,
    native_threads_available: 8,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const frameIndexRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const fpsTimerRef = useRef<number>(performance.now());
  const framesRenderedRef = useRef<number>(0);
  const streamPipelineRef = useRef<StreamPipeline<number, string> | null>(null);
  const videoEngineRef = useRef<VideoStreamingEngine | null>(null);
  const lastImageDataRef = useRef<ImageData | null>(null);
  const lastRenderResultRef = useRef<CanvasRenderResult | null>(null);

  // Clear 1 orchestrated load reveal state after initial trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Update options when active tab or tier changes
  useEffect(() => {
    if (activeTab !== "settings" && activeTab !== "media_picker") {
      setOptions((prev) => ({
        ...prev,
        mode: activeTab,
        tier: activeTier,
      }));
    }
  }, [activeTab, activeTier]);

  // Initialize Hardware Tier & Host Telemetry
  useEffect(() => {
    globalTierManager.detectCapabilities().then((caps) => {
      setActiveTier(caps.recommendedTier);
    });

    globalTierManager.onFallback((newTier, reason) => {
      setActiveTier(newTier);
      setWarningMessage(`Hardware fallback triggered: ${reason}. Switched to ${newTier}.`);
    });

    getTelemetryFromHost().then(setHostTelemetry);
  }, []);

  // Initialize VideoStreamingEngine lifecycle (STRESS-2 Defense: synchronous teardown)
  useEffect(() => {
    const engine = new VideoStreamingEngine(options, {
      onFrame: (text, meta, renderResult) => {
        setAsciiOutput(text);
        setRenderTimeMs(meta.renderDurationMs);
        setFps(meta.fpsActual || 60);
        setDroppedFrames(meta.droppedFrames);
        if (renderResult) {
          lastRenderResultRef.current = renderResult;
        }
        paintAsciiToCanvas(canvasRef.current, text, options, renderResult?.colorBuffer);
      },
      onError: (err) => {
        setWarningMessage(err.message);
      },
      onStateChange: (state) => {
        setVideoState((prev) => ({
          ...prev,
          isPlaying: state === "playing",
        }));
      },
      onTimeUpdate: (currentTime, duration) => {
        setVideoState((prev) => ({
          ...prev,
          currentTime,
          duration,
        }));
      },
    });

    videoEngineRef.current = engine;

    return () => {
      engine.dispose();
      videoEngineRef.current = null;
    };
  }, []);

  // Synchronize options changes to video engine
  useEffect(() => {
    if (videoEngineRef.current) {
      videoEngineRef.current.updateOptions(options);
    }
  }, [options]);

  // STRESS-2 Defense: Synchronously stop or pause background streams when switching away
  useEffect(() => {
    if (activeTab !== "video" && videoEngineRef.current && videoState.isPlaying) {
      videoEngineRef.current.pause();
    }
    if (activeTab !== "camera_stream" && isStreamingCamera) {
      if (videoEngineRef.current) {
        videoEngineRef.current.stop();
      }
      mediaEngineService.stopCamera();
      setIsStreamingCamera(false);
    }
  }, [activeTab, isStreamingCamera, videoState.isPlaying]);

  // STRESS-5 Defense: Debounce window resize listener (16ms boundary)
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (canvasRef.current && asciiOutput) {
          paintAsciiToCanvas(
            canvasRef.current,
            asciiOutput,
            options,
            lastRenderResultRef.current?.colorBuffer
          );
        }
      }, 16);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [asciiOutput, options]);

  // Repaint canvas whenever asciiOutput or options change
  useEffect(() => {
    if (canvasRef.current && asciiOutput) {
      paintAsciiToCanvas(
        canvasRef.current,
        asciiOutput,
        options,
        lastRenderResultRef.current?.colorBuffer
      );
    }
  }, [options.color_mode, options.enable_scanlines]);

  // Re-instantiate StreamPipeline for procedural frame processing & STRESS-3 defense
  useEffect(() => {
    streamPipelineRef.current = new StreamPipeline(async (frameIdx) => {
      const ramp = getCharsetRamp(
        options.charset.preset,
        options.charset.custom_glyphs,
        options.charset.invert
      );
      return renderProcedural3D(
        proceduralParams,
        frameIdx,
        options.max_output_columns,
        options.max_output_rows,
        ramp
      );
    });
  }, [
    options.charset.preset,
    options.charset.custom_glyphs,
    options.charset.invert,
    options.max_output_columns,
    options.max_output_rows,
    proceduralParams,
  ]);

  // Procedural Animation Render Loop
  useEffect(() => {
    if (activeTab !== "procedural_3d") return;

    let isMounted = true;

    const renderLoop = (now: number) => {
      const delta = now - lastTimeRef.current;
      const targetInterval = 1000 / options.fps_cap;

      if (delta >= targetInterval) {
        lastTimeRef.current = now;
        frameIndexRef.current++;
        framesRenderedRef.current++;

        // Calculate actual FPS every second
        if (now - fpsTimerRef.current >= 1000) {
          setFps(framesRenderedRef.current);
          framesRenderedRef.current = 0;
          fpsTimerRef.current = now;
        }

        if (streamPipelineRef.current) {
          const startTime = performance.now();
          streamPipelineRef.current
            .submit(frameIndexRef.current)
            .then((text) => {
              if (isMounted) {
                setAsciiOutput(text);
                setRenderTimeMs(Math.round((performance.now() - startTime) * 10) / 10);
                const tel = streamPipelineRef.current?.getTelemetry();
                if (tel) {
                  setDroppedFrames(tel.droppedFrames);
                }

                // Render onto canvas
                paintAsciiToCanvas(canvasRef.current, text, options);
              }
            })
            .catch(() => {
              // Discarded backpressure frame
            });
        }
      }

      if (isMounted) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activeTab, proceduralParams, options]);

  // Rasterize an ImageData object to ASCII and paint to main canvas
  const rasterizeImageData = useCallback(
    (imageData: ImageData) => {
      // Calculate target rows using CHAR_ASPECT = 0.5 (from Python fit_source_size)
      const cols = options.max_output_columns;
      const rows =
        imageData.width > 0 && imageData.height > 0
          ? Math.max(1, Math.round(cols * (imageData.height / imageData.width) * 0.5))
          : options.max_output_rows;

      const renderOptions: AsciiRenderOptions = {
        ...options,
        max_output_columns: cols,
        max_output_rows: rows,
      };

      const res = renderImageDataToAscii(imageData, renderOptions);
      lastRenderResultRef.current = res;
      setAsciiOutput(res.asciiText);
      setRenderTimeMs(Math.round(res.durationMs * 10) / 10);
      paintAsciiToCanvas(canvasRef.current, res.asciiText, renderOptions, res.colorBuffer);
    },
    [options]
  );

  // Re-rasterize cached image when options adjust in image mode
  useEffect(() => {
    if (activeTab === "image" && lastImageDataRef.current) {
      rasterizeImageData(lastImageDataRef.current);
    }
  }, [activeTab, options, rasterizeImageData]);

  // Ensure canvas is painted if canvasRef mounts or tab switches to image/video
  useEffect(() => {
    if (canvasRef.current && lastRenderResultRef.current) {
      paintAsciiToCanvas(
        canvasRef.current,
        lastRenderResultRef.current.asciiText,
        options,
        lastRenderResultRef.current.colorBuffer
      );
    }
  }, [activeTab]);

  // Direct photo canvas rasterization
  const handleApplyPhotoToAscii = useCallback(
    (snapshotCanvas: HTMLCanvasElement) => {
      const ctx = snapshotCanvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, snapshotCanvas.width, snapshotCanvas.height);
      lastImageDataRef.current = imageData;
      rasterizeImageData(imageData);
      setActiveTab("image");
    },
    [rasterizeImageData]
  );

  // Instant Image File Ingestion (STRESS-3 Defense: preflight clamp to 2048px)
  const handleSelectImageFile = useCallback(
    async (file: File) => {
      try {
        setWarningMessage(`Ingesting image: ${file.name}...`);
        const preflight = await preflightImageFile(file, 2048);

        if (preflight.wasDownsampled) {
          setWarningMessage(
            `High-resolution image (${preflight.originalWidth}x${preflight.originalHeight}) was automatically clamped to 2048x2048.`
          );
        } else {
          setWarningMessage(null);
        }

        if (preflight.imageData) {
          lastImageDataRef.current = preflight.imageData;
          rasterizeImageData(preflight.imageData);
          setActiveTab("image");
        }
      } catch (err: any) {
        setWarningMessage(`Error processing image: ${err.message}`);
      }
    },
    [rasterizeImageData]
  );

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectImageFile(file);
  };

  // Video Streaming Pipeline Ingestion (STRESS-1 Defense)
  const handleSelectVideoFile = useCallback(
    async (file: File) => {
      if (file.size === 0) {
        setWarningMessage("Invalid video file: corrupted container (0-byte file). Supported formats: MP4, WebM.");
        return;
      }

      try {
        setWarningMessage(`Loading video stream: ${file.name}...`);
        setActiveTab("video");

        if (videoEngineRef.current) {
          await videoEngineRef.current.loadSource(file);
          setVideoState({
            isPlaying: true,
            isLooping: videoEngineRef.current.isLooping(),
            currentTime: 0,
            duration: videoEngineRef.current.getDuration(),
            fileName: file.name,
          });
          await videoEngineRef.current.play();
        }
        setWarningMessage(null);
      } catch (err: any) {
        setWarningMessage(
          err.message || "Unsupported video codec or corrupted container. Supported formats: MP4, WebM."
        );
      }
    },
    []
  );

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectVideoFile(file);
  };

  // Video Playback Controls
  const handlePlayVideo = useCallback(() => {
    videoEngineRef.current?.play();
  }, []);

  const handlePauseVideo = useCallback(() => {
    videoEngineRef.current?.pause();
  }, []);

  const handleSeekVideo = useCallback((timeSec: number) => {
    videoEngineRef.current?.seek(timeSec);
    setVideoState((prev) => ({ ...prev, currentTime: timeSec }));
  }, []);

  const handleToggleLoopVideo = useCallback((loop: boolean) => {
    videoEngineRef.current?.setLoop(loop);
    setVideoState((prev) => ({ ...prev, isLooping: loop }));
  }, []);

  const handleStopVideo = useCallback(() => {
    videoEngineRef.current?.stop();
    setVideoState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  // Live Camera Streaming Engine (STRESS-4 Defense)
  const handleStartCamera = useCallback(async () => {
    try {
      setWarningMessage("Accessing camera device...");
      const session = await mediaEngineService.startCamera({ width: 640, height: 480 });
      setIsStreamingCamera(true);
      setActiveTab("camera_stream");

      if (videoEngineRef.current) {
        await videoEngineRef.current.loadSource(session.stream);
        await videoEngineRef.current.play();
      }
      setWarningMessage(null);
    } catch (err: any) {
      setIsStreamingCamera(false);
      if (err.code === "PERMISSION_DENIED") {
        setWarningMessage("Camera permission was denied. Please grant camera access in system settings.");
      } else if (err.code === "DEVICE_NOT_FOUND") {
        setWarningMessage("No compatible camera device detected on this system.");
      } else if (err.code === "TAURI_WEBVIEW_ERROR") {
        setWarningMessage("Camera initialization timed out. Operating system permissions may be blocked.");
      } else {
        setWarningMessage(err.message || "Failed to initialize camera stream.");
      }
    }
  }, []);

  const handleStopCamera = useCallback(() => {
    if (videoEngineRef.current) {
      videoEngineRef.current.stop();
    }
    mediaEngineService.stopCamera();
    setIsStreamingCamera(false);
    setWarningMessage("Camera stream stopped.");
  }, []);

  const handleCopyAscii = useCallback(() => {
    if (!asciiOutput) return;
    navigator.clipboard.writeText(asciiOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [asciiOutput]);

  const handleExportTxt = useCallback(() => {
    if (!asciiOutput) return;
    const blob = new Blob([asciiOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ascii_art_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [asciiOutput]);

  const handleExportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `ascii_art_${Date.now()}.png`;
    a.click();
  }, []);

  const telemetryData: TelemetryData = {
    fps,
    frame_time_ms: renderTimeMs,
    active_tier: activeTier,
    columns: options.max_output_columns,
    rows: options.max_output_rows,
    memory_estimate_mb: (options.max_output_columns * options.max_output_rows * 4) / 1024,
    dropped_frames: droppedFrames,
    ipc_payload_kb: Math.round((asciiOutput.length * 2) / 1024),
    gpu_adapter_name:
      activeTier === "tier1_webgpu"
        ? "Apple M-Series Metal / Direct3D 12"
        : "WebGL2 Standard Core",
    sandbox_sealed: hostTelemetry.sandbox_sealed,
  };

  return (
    <div className="min-h-screen h-screen bg-[#121212] text-[#f3f4f6] flex flex-col font-sans antialiased overflow-x-hidden select-none">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#1a1a1a] focus:text-[#3b82f6] focus:border focus:border-[#3b82f6] focus:rounded-[4px] focus:outline-none text-xs font-medium"
      >
        Skip to content
      </a>

      {/* Boot Loading Screen (orchestrated 1.2s hardware handshake reveal) */}
      {showBoot && (
        <BootLoadingScreen
          detectedTier={
            activeTier === "tier1_webgpu"
              ? "WebGPU Tier 1"
              : activeTier === "tier2_webgl"
              ? "WebGL2 Tier 2"
              : activeTier === "rust_sidecar"
              ? "Rust Native Sidecar"
              : "Canvas 2D Fallback"
          }
          durationMs={1200}
          onComplete={() => setShowBoot(false)}
        />
      )}

      {/* Top Header Bar */}
      <Header
        activeMode={activeTab}
        onModeChange={(mode) => setActiveTab(mode)}
        activeTier={activeTier}
        fps={fps}
        platform={hostTelemetry.platform}
      />

      {/* Technical Stickers Strip (TIER / FPS / GRID / ACL / HOST) */}
      <TechnicalStickers
        activeTier={activeTier}
        fps={fps}
        resolution={{ columns: options.max_output_columns, rows: options.max_output_rows }}
        platform={hostTelemetry.platform}
        sandboxSealed={hostTelemetry.sandbox_sealed}
        className="px-6 py-2 bg-[#0a0a0c] border-b border-[#222224]"
      />

      {/* Warning Notification Banner */}
      {warningMessage && (
        <div className="bg-[#222222] border-b border-[#2a2a2a] text-[#3b82f6] px-6 py-2.5 text-xs flex justify-between items-center z-30 font-sans w-full">
          <span>{warningMessage}</span>
          <button
            onClick={() => setWarningMessage(null)}
            aria-label="Dismiss notification"
            className="text-[#888888] hover:text-[#f3f4f6] font-medium px-2 py-1 min-h-[36px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Split-Pane Workbench Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full max-w-full">
        {/* Left Quadrant: Controls Sidebar */}
        <ControlPanel
          options={options}
          onOptionsChange={(newOpts) => setOptions((prev) => ({ ...prev, ...newOpts }))}
          proceduralParams={proceduralParams}
          onProceduralParamsChange={(newParams) =>
            setProceduralParams((prev) => ({ ...prev, ...newParams }))
          }
          activeTier={activeTier}
          onTierChange={(tier) => setActiveTier(tier)}
          onSelectImage={handleSelectImage}
          onSelectVideo={handleSelectVideo}
          onStartCamera={handleStartCamera}
          onStopCamera={handleStopCamera}
          isStreamingCamera={isStreamingCamera}
          onCopyAscii={handleCopyAscii}
          isCopied={isCopied}
          onExportTxt={handleExportTxt}
          onExportPng={handleExportPng}
          activeMode={activeTab}
          onOpenMediaPicker={() => setActiveTab("media_picker")}
          videoState={videoState}
          onPlayVideo={handlePlayVideo}
          onPauseVideo={handlePauseVideo}
          onSeekVideo={handleSeekVideo}
          onToggleLoopVideo={handleToggleLoopVideo}
          onStopVideo={handleStopVideo}
        />

        {/* Central Viewport & ASCII Canvas / MediaPicker */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 flex flex-col bg-[#121212] overflow-hidden relative min-h-[350px] w-full max-w-full"
        >
          {activeTab === "media_picker" ? (
            <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full flex items-center justify-center">
              <MediaPicker
                initialState={initialPickerState}
                onApplyPhotoToAscii={handleApplyPhotoToAscii}
                onApplyImageFile={handleSelectImageFile}
                onApplyVideoFile={handleSelectVideoFile}
                onCancel={() => setActiveTab("procedural_3d")}
              />
            </div>
          ) : (
            <AsciiCanvas
              canvasRef={canvasRef}
              options={options}
              asciiText={asciiOutput}
              isInitialLoad={isInitialLoad}
            />
          )}

          {/* Constellation Pipeline Graph (embedded viewport visualization, md+ to avoid 375px overflow) */}
          {activeTab !== "media_picker" && (
            <div className="hidden md:flex flex-shrink-0 border-t border-[#222224] h-[320px] bg-[#0a0a0c]">
              <ConstellationGraph
                activeMode={activeTab}
                activeTier={activeTier}
                fps={fps}
                latencyMs={renderTimeMs}
                columns={options.max_output_columns}
                rows={options.max_output_rows}
                isEmbedded
              />
            </div>
          )}
        </main>
      </div>

      {/* Real-Time Telemetry Drawer */}
      <TelemetryDrawer telemetry={telemetryData} />
    </div>
  );
}

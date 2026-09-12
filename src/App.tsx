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
import { renderProcedural3D } from "./engine/procedural-3d";
import { getCharsetRamp } from "./engine/charsets";
import { preflightImageSource } from "./engine/image-preflight";
import { renderImageDataToAscii } from "./engine/canvas-renderer";
import { globalTierManager } from "./engine/tier-manager";
import { StreamPipeline } from "./engine/stream-pipeline";
import { getTelemetryFromHost } from "./engine/tauri-bridge";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = (urlParams.get("mode") as RenderMode | "settings" | "media_picker") || "procedural_3d";
  const initialScene = (urlParams.get("scene") as any) || "donut";
  const initialPickerState = (urlParams.get("picker_state") as any) || "idle";

  const [activeTab, setActiveTab] = useState<RenderMode | "settings" | "media_picker">(initialMode);
  const [activeTier, setActiveTier] = useState<RenderTier>("tier1_webgpu");
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

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
    color_mode: "matrix_green",
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

                // Render onto canvas if present
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext("2d");
                  if (ctx) {
                    const charWidth = options.cell_width_px;
                    const charHeight = options.cell_height_px;
                    const cols = options.max_output_columns;
                    const rows = options.max_output_rows;

                    canvas.width = cols * charWidth;
                    canvas.height = rows * charHeight;

                    // Fill background
                    ctx.fillStyle = "#121212";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Set font & color
                    ctx.font = `${options.font_size_px}px "JetBrains Mono", monospace`;
                    ctx.textBaseline = "top";

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
                      case "monochrome":
                      default:
                        ctx.fillStyle = "#f3f4f6";
                    }

                    const lines = text.split("\n");
                    for (let r = 0; r < lines.length; r++) {
                      ctx.fillText(lines[r], 0, r * charHeight);
                    }
                  }
                }
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
      const res = renderImageDataToAscii(imageData, options);
      setAsciiOutput(res.asciiText);
      setRenderTimeMs(Math.round(res.durationMs * 10) / 10);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const charWidth = options.cell_width_px;
          const charHeight = options.cell_height_px;
          canvas.width = options.max_output_columns * charWidth;
          canvas.height = options.max_output_rows * charHeight;
          ctx.fillStyle = "#121212";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = `${options.font_size_px}px "JetBrains Mono", monospace`;
          ctx.textBaseline = "top";
          ctx.fillStyle = "#f3f4f6";
          const lines = res.asciiText.split("\n");
          for (let r = 0; r < lines.length; r++) {
            ctx.fillText(lines[r], 0, r * charHeight);
          }
        }
      }
    },
    [options]
  );

  // Direct photo canvas rasterization
  const handleApplyPhotoToAscii = useCallback(
    (snapshotCanvas: HTMLCanvasElement) => {
      const ctx = snapshotCanvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, snapshotCanvas.width, snapshotCanvas.height);
      rasterizeImageData(imageData);
      setActiveTab("image");
    },
    [rasterizeImageData]
  );

  // Handle Image File
  const handleSelectImageFile = useCallback(
    async (file: File) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;

      img.onload = async () => {
        try {
          const preflight = await preflightImageSource(img, 2048);
          if (preflight.wasDownsampled) {
            setWarningMessage(
              `High-resolution image (${preflight.originalWidth}x${preflight.originalHeight}) was automatically clamped to 2048x2048.`
            );
          } else {
            setWarningMessage(null);
          }

          if (preflight.imageData) {
            rasterizeImageData(preflight.imageData);
            setActiveTab("image");
          }
        } catch (err: any) {
          setWarningMessage(`Error processing image: ${err.message}`);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
    },
    [rasterizeImageData]
  );

  const handleSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectImageFile(file);
  };

  const handleSelectVideoFile = useCallback((file: File) => {
    setWarningMessage(
      `Video file loaded: ${file.name} (${Math.round(file.size / 1024)} KB). Ready for streaming rasterization.`
    );
    setActiveTab("video");
  }, []);

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectVideoFile(file);
  };

  const handleStartCamera = () => {
    setIsStreamingCamera(true);
    setWarningMessage("Camera stream active. Sandbox IPC stream locked.");
  };

  const handleStopCamera = () => {
    setIsStreamingCamera(false);
    setWarningMessage("Camera stream stopped.");
  };

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

      {/* Top Header Bar */}
      <Header
        activeMode={activeTab}
        onModeChange={(mode) => setActiveTab(mode)}
        activeTier={activeTier}
        fps={fps}
        platform={hostTelemetry.platform}
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
        </main>
      </div>

      {/* Real-Time Telemetry Drawer */}
      <TelemetryDrawer telemetry={telemetryData} />
    </div>
  );
}

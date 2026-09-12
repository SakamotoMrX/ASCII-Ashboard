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
import { ZenLockscreenToggle } from "./components/ZenLockscreenToggle";
import { WorkspaceTabBar, WorkspaceSession } from "./components/WorkspaceTabBar";
import { RenderEngineManager } from "./lib/renderers/manager";
import { SceneFrameData } from "./lib/procedural/scenes";
import { globalWorkspaceManager } from "./engine/workspace-manager";
import { renderProcedural3D, Procedural3DResult } from "./engine/procedural-3d";
import { getCharsetRamp } from "./engine/charsets";
import { preflightImageFile } from "./engine/image-preflight";
import { CanvasRenderResult, renderImageDataToAscii } from "./engine/canvas-renderer";
import { globalTierManager } from "./engine/tier-manager";
import { StreamPipeline } from "./engine/stream-pipeline";
import { getTelemetryFromHost } from "./engine/tauri-bridge";
import { VideoStreamingEngine } from "./engine/video-pipeline";
import {
  mediaEngineService,
  getOptimalRecordingMimeType,
} from "./engine/media-service";

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

function getWorkspaceTitleForMode(
  mode: RenderMode | "settings" | "media_picker",
  fallback: string
): string {
  switch (mode) {
    case "procedural_3d":
      return "⬡ 3D Procedural";
    case "video":
      return "🎬 Video: Stream";
    case "image":
      return "🖼️ Image: Photo";
    case "camera_stream":
      return "📷 Live Camera";
    case "media_picker":
      return "⚡ Media Studio";
    case "settings":
      return "⚙️ Engine Sandbox";
    default:
      return fallback;
  }
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = (urlParams.get("mode") as RenderMode | "settings" | "media_picker") || "procedural_3d";
  const initialScene = (urlParams.get("scene") as any) || "donut";
  const initialPickerState = (urlParams.get("picker_state") as any) || "idle";
  const isBootFreeze = urlParams.get("boot") === "freeze";

  const [activeTab, setActiveTab] = useState<RenderMode | "settings" | "media_picker">(initialMode);
  const [activeTier, setActiveTier] = useState<RenderTier>("tier1_webgpu");
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [showBoot, setShowBoot] = useState<boolean>(true);

  // Zen Lockscreen and Fullscreen State
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Workspace Sessions State bound to WorkspaceManager
  const [workspaces, setWorkspaces] = useState<WorkspaceSession[]>(() =>
    globalWorkspaceManager.getAllWorkspaces().map((ws) => ({
      id: ws.id,
      title: ws.name,
      mode: ws.type,
      badge: ws.isActive ? "ACTIVE" : "STANDBY",
      status: ws.isActive ? "active" : "idle",
    }))
  );
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(() =>
    globalWorkspaceManager.getActiveWorkspace().id
  );

  useEffect(() => {
    return globalWorkspaceManager.subscribe((allWs, activeWs) => {
      setWorkspaces(
        allWs.map((ws) => ({
          id: ws.id,
          title: ws.name,
          mode: ws.type,
          badge: ws.isActive ? "ACTIVE" : ws.videoEngine && ws.videoState?.isPlaying ? "PAUSED" : "IDLE",
          status: ws.isActive ? "active" : "idle",
        }))
      );
      setActiveWorkspaceId(activeWs.id);
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleSelectWorkspace = useCallback(
    (id: string) => {
      try {
        const ws = globalWorkspaceManager.switchWorkspace(id);
        setActiveWorkspaceId(ws.id);
        setActiveTab(ws.type);
        setOptions(ws.options);
        if (ws.proceduralParams) {
          setProceduralParams(ws.proceduralParams);
        }
        if (ws.asciiOutput) {
          setAsciiOutput(ws.asciiOutput);
        }
        if (ws.videoState) {
          setVideoState(ws.videoState);
        }
        if (ws.videoEngine) {
          videoEngineRef.current = ws.videoEngine;
        }
      } catch (err: any) {
        console.warn("Error switching workspace:", err);
      }
    },
    []
  );

  const handleCloseWorkspace = useCallback(
    (id: string) => {
      globalWorkspaceManager.removeWorkspace(id);
      const active = globalWorkspaceManager.getActiveWorkspace();
      handleSelectWorkspace(active.id);
    },
    [handleSelectWorkspace]
  );

  const handleNewWorkspace = useCallback(() => {
    const nextIdx = globalWorkspaceManager.getAllWorkspaces().length + 1;
    const newWs = globalWorkspaceManager.createWorkspace({
      name: `Workspace ${nextIdx}`,
      type: "procedural_3d",
      isActive: true,
    });
    handleSelectWorkspace(newWs.id);
  }, [handleSelectWorkspace]);

  const handleModeChange = useCallback(
    (mode: RenderMode | "settings" | "media_picker") => {
      setActiveTab(mode);
      if (mode !== "settings" && mode !== "media_picker") {
        globalWorkspaceManager.updateWorkspace(activeWorkspaceId, {
          type: mode,
          name: getWorkspaceTitleForMode(mode, `Workspace`),
        });
      }
    },
    [activeWorkspaceId]
  );

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
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingProgressSec, setRecordingProgressSec] = useState<number>(0);

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
    gpu_adapter_name: "Hardware Rasterizer",
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const frameIndexRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const fpsTimerRef = useRef<number>(performance.now());
  const framesRenderedRef = useRef<number>(0);
  const streamPipelineRef = useRef<StreamPipeline<number, Procedural3DResult> | null>(null);
  const videoEngineRef = useRef<VideoStreamingEngine | null>(null);
  const renderEngineRef = useRef<RenderEngineManager | null>(null);
  const lastImageDataRef = useRef<ImageData | null>(null);
  const lastRenderResultRef = useRef<CanvasRenderResult | null>(null);
  const optionsRef = useRef<AsciiRenderOptions>(options);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

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

  // Initialize RenderEngineManager (WebGPU / WebGL2 / Canvas2D)
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new RenderEngineManager(canvasRef.current);
    renderEngineRef.current = engine;

    engine.onFallback((newTier, reason) => {
      setActiveTier(newTier);
      setWarningMessage(`Hardware fallback: ${reason}. Switched to ${newTier}.`);
    });

    engine.initialize(activeTier).then((effectiveTier) => {
      if (effectiveTier !== activeTier) {
        setActiveTier(effectiveTier);
      }
    });
  }, [activeTier, activeWorkspaceId]);

  const handleTierChange = useCallback((tier: RenderTier) => {
    setActiveTier(tier);
    if (renderEngineRef.current) {
      renderEngineRef.current.setTier(tier);
    }
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
        paintAsciiToCanvas(canvasRef.current, text, optionsRef.current, renderResult?.colorBuffer);
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
    if (activeTab === "video" && videoEngineRef.current && !videoState.isPlaying) {
      videoEngineRef.current.processSingleFrame();
      return;
    }
    if (canvasRef.current && asciiOutput) {
      paintAsciiToCanvas(
        canvasRef.current,
        asciiOutput,
        options,
        lastRenderResultRef.current?.colorBuffer
      );
    }
  }, [activeTab, options.color_mode, options.enable_scanlines, videoState.isPlaying]);

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
            .then((result) => {
              if (isMounted) {
                setAsciiOutput(result.text);
                setRenderTimeMs(Math.round((performance.now() - startTime) * 10) / 10);
                const tel = streamPipelineRef.current?.getTelemetry();
                if (tel) {
                  setDroppedFrames(tel.droppedFrames);
                }

                lastRenderResultRef.current = {
                  asciiText: result.text,
                  colorBuffer: result.colorBuffer,
                  durationMs: performance.now() - startTime,
                  width: options.max_output_columns,
                  height: options.max_output_rows,
                };

                // Render onto canvas via Hardware Acceleration (WebGPU / WebGL2 / Canvas2D)
                if (renderEngineRef.current && result.luminanceBuffer && result.colorBuffer) {
                  const frameData: SceneFrameData = {
                    columns: options.max_output_columns,
                    rows: options.max_output_rows,
                    luminanceBuffer: result.luminanceBuffer,
                    colorBuffer: new Uint8ClampedArray(result.colorBuffer.buffer),
                  };
                  renderEngineRef.current.render(frameData, options);
                } else {
                  paintAsciiToCanvas(
                    canvasRef.current,
                    result.text,
                    options,
                    result.colorBuffer
                  );
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

      if (renderEngineRef.current) {
        const res = renderEngineRef.current.renderImageData(imageData, renderOptions);
        lastRenderResultRef.current = {
          asciiText: res.text,
          durationMs: res.renderTimeMs,
          width: cols,
          height: rows,
        };
        setAsciiOutput(res.text);
        setRenderTimeMs(Math.round(res.renderTimeMs * 10) / 10);
      } else {
        const res = renderImageDataToAscii(imageData, renderOptions);
        lastRenderResultRef.current = res;
        setAsciiOutput(res.asciiText);
        setRenderTimeMs(Math.round(res.durationMs * 10) / 10);
        paintAsciiToCanvas(canvasRef.current, res.asciiText, renderOptions, res.colorBuffer);
      }
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
      const ws = globalWorkspaceManager.createWorkspace({
        name: `Snapshot ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        type: "image",
        imageData,
        isActive: true,
      });
      handleSelectWorkspace(ws.id);
      lastImageDataRef.current = imageData;
      rasterizeImageData(imageData);
    },
    [handleSelectWorkspace, rasterizeImageData]
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
          const ws = globalWorkspaceManager.createWorkspace({
            name: `Image: ${file.name}`,
            type: "image",
            sourceFile: file,
            imageData: preflight.imageData,
            isActive: true,
          });

          handleSelectWorkspace(ws.id);
          lastImageDataRef.current = preflight.imageData;
          rasterizeImageData(preflight.imageData);
        }
      } catch (err: any) {
        setWarningMessage(`Error processing image: ${err.message}`);
      }
    },
    [handleSelectWorkspace, rasterizeImageData]
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

        // 1. Dedicated workspace session for isolated video
        const ws = globalWorkspaceManager.createWorkspace({
          name: `Video: ${file.name}`,
          type: "video",
          sourceFile: file,
          isActive: true,
        });

        // 2. Discrete VideoStreamingEngine bound to this workspace
        const engine = new VideoStreamingEngine(ws.options, {
          onFrame: (text, meta, renderResult) => {
            const activeWs = globalWorkspaceManager.getActiveWorkspace();
            if (activeWs.id !== ws.id) return;

            setAsciiOutput(text);
            setRenderTimeMs(meta.renderDurationMs);
            setFps(meta.fpsActual || 60);
            setDroppedFrames(meta.droppedFrames);
            ws.asciiOutput = text;
            ws.colorBuffer = renderResult?.colorBuffer;

            if (renderEngineRef.current && lastImageDataRef.current) {
              renderEngineRef.current.renderImageData(lastImageDataRef.current, ws.options);
            } else {
              paintAsciiToCanvas(canvasRef.current, text, ws.options, renderResult?.colorBuffer);
            }
          },
          onError: (err) => {
            setWarningMessage(err.message);
          },
          onStateChange: (state) => {
            const activeWs = globalWorkspaceManager.getActiveWorkspace();
            if (activeWs.id === ws.id) {
              setVideoState((prev) => ({
                ...prev,
                isPlaying: state === "playing",
              }));
            }
            if (ws.videoState) {
              ws.videoState.isPlaying = state === "playing";
            }
          },
          onTimeUpdate: (currentTime, duration) => {
            const activeWs = globalWorkspaceManager.getActiveWorkspace();
            if (activeWs.id === ws.id) {
              setVideoState((prev) => ({
                ...prev,
                currentTime,
                duration,
              }));
            }
            if (ws.videoState) {
              ws.videoState.currentTime = currentTime;
              ws.videoState.duration = duration;
            }
          },
        });

        ws.videoEngine = engine;
        videoEngineRef.current = engine;

        await engine.loadSource(file);
        setVideoState({
          isPlaying: true,
          isLooping: engine.isLooping(),
          currentTime: 0,
          duration: engine.getDuration(),
          fileName: file.name,
        });
        await engine.play();

        handleSelectWorkspace(ws.id);
        setWarningMessage(null);
      } catch (err: any) {
        setWarningMessage(
          err.message || "Unsupported video codec or corrupted container. Supported formats: MP4, WebM."
        );
      }
    },
    [handleSelectWorkspace]
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

  const handleStopRecordVideo = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
  }, []);

  const handleStartRecordVideo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setWarningMessage("Render canvas not available for recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setWarningMessage("Video recording is not supported in this browser environment.");
      return;
    }

    try {
      // 30fps canvas stream
      const stream = canvas.captureStream(30);
      recordedChunksRef.current = [];

      const mimeType = getOptimalRecordingMimeType();

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const chunks = recordedChunksRef.current;
        if (chunks.length > 0) {
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ascii_video_${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        setIsRecordingVideo(false);
        setRecordingProgressSec(0);
      };

      recorder.start(250); // timeslice 250ms
      setIsRecordingVideo(true);
      setRecordingProgressSec(0);

      // Auto start video playback if in video mode and paused
      if (activeTab === "video" && videoEngineRef.current && !videoState.isPlaying) {
        videoEngineRef.current.play();
      }

      recordingTimerRef.current = setInterval(() => {
        setRecordingProgressSec((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setWarningMessage(err?.message || "Failed to start video recording.");
      setIsRecordingVideo(false);
    }
  }, [activeTab, videoState.isPlaying]);

  const handleToggleRecordVideo = useCallback(() => {
    if (isRecordingVideo) {
      handleStopRecordVideo();
    } else {
      handleStartRecordVideo();
    }
  }, [isRecordingVideo, handleStartRecordVideo, handleStopRecordVideo]);

  // Teardown recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
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
      renderEngineRef.current?.adapterName ||
      hostTelemetry.gpu_adapter_name ||
      globalTierManager.getHardwareGpuDescription(),
    sandbox_sealed: hostTelemetry.sandbox_sealed,
  };

  return (
    <div className="min-h-screen h-screen bg-[#121212] text-[#f3f4f6] flex flex-col font-sans antialiased overflow-x-hidden select-none">
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-3 focus:min-h-[44px] focus:inline-flex focus:items-center focus:bg-[#141416] focus:text-[#ffffff] focus:border focus:border-[#ffffff] focus:rounded-[2px] focus:outline-none focus:ring-1 focus:ring-[#ffffff] text-xs font-mono"
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
          durationMs={isBootFreeze ? 9999999 : 1200}
          onComplete={() => { if (!isBootFreeze) setShowBoot(false); }}
        />
      )}

      {/* Floating Zen / Lockscreen Toggle Button (pinned in top-right with hover glow) */}
      <ZenLockscreenToggle
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Collapsible Top Chrome (Header + WorkspaceTabBar + TechnicalStickers) */}
      <div
        className={`transition-all duration-200 ease-out flex flex-col flex-shrink-0 z-20 ${
          isZenMode
            ? "max-h-0 opacity-0 pointer-events-none overflow-hidden"
            : "max-h-[300px] opacity-100"
        }`}
      >
        {/* Top Header Bar */}
        <Header
          activeMode={activeTab}
          onModeChange={handleModeChange}
          activeTier={activeTier}
          fps={fps}
          platform={hostTelemetry.platform}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        />

        {/* Workspace Session Tabs / Bar */}
        <WorkspaceTabBar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCloseWorkspace={handleCloseWorkspace}
          onNewWorkspace={handleNewWorkspace}
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
      </div>

      {/* Warning Notification Banner */}
      {!isZenMode && warningMessage && (
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
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden w-full max-w-full relative">
        {/* Left Quadrant: Controls Sidebar */}
        <div
          className={`transition-all duration-200 ease-out flex-shrink-0 ${
            isZenMode
              ? "w-0 max-w-0 opacity-0 pointer-events-none overflow-hidden m-0 p-0 border-none"
              : "w-full md:w-96 opacity-100"
          }`}
        >
          <ControlPanel
            options={options}
            onOptionsChange={(newOpts) => setOptions((prev) => ({ ...prev, ...newOpts }))}
            proceduralParams={proceduralParams}
            onProceduralParamsChange={(newParams) =>
              setProceduralParams((prev) => ({ ...prev, ...newParams }))
            }
            activeTier={activeTier}
            onTierChange={handleTierChange}
            onSelectImage={handleSelectImage}
            onSelectVideo={handleSelectVideo}
            onStartCamera={handleStartCamera}
            onStopCamera={handleStopCamera}
            isStreamingCamera={isStreamingCamera}
            onCopyAscii={handleCopyAscii}
            isCopied={isCopied}
            onExportTxt={handleExportTxt}
            onExportPng={handleExportPng}
            isRecordingVideo={isRecordingVideo}
            recordingProgressSec={recordingProgressSec}
            onToggleRecordVideo={handleToggleRecordVideo}
            activeMode={activeTab}
            onOpenMediaPicker={() => setActiveTab("media_picker")}
            videoState={videoState}
            onPlayVideo={handlePlayVideo}
            onPauseVideo={handlePauseVideo}
            onSeekVideo={handleSeekVideo}
            onToggleLoopVideo={handleToggleLoopVideo}
            onStopVideo={handleStopVideo}
          />
        </div>

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
              key={`${activeTier}-${activeWorkspaceId}`}
              canvasRef={canvasRef}
              options={options}
              asciiText={asciiOutput}
              isInitialLoad={isInitialLoad}
            />
          )}

          {/* Constellation Pipeline Graph (embedded viewport visualization, md+ to avoid 375px overflow) */}
          {activeTab !== "media_picker" && (
            <div
              className={`flex flex-shrink-0 border-t border-[#222224] bg-[#0a0a0c] transition-all duration-200 ease-out ${
                isZenMode
                  ? "h-0 max-h-0 opacity-0 pointer-events-none overflow-hidden"
                  : "h-[320px] opacity-100"
              }`}
            >
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
      <div
        className={`transition-all duration-200 ease-out ${
          isZenMode ? "max-h-0 opacity-0 pointer-events-none overflow-hidden" : "opacity-100"
        }`}
      >
        <TelemetryDrawer telemetry={telemetryData} />
      </div>
    </div>
  );
}

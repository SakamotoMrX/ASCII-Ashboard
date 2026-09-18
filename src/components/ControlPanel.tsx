import React, { useState } from "react";
import {
  AsciiRenderOptions,
  CharsetPreset,
  ColorMode,
  Procedural3DParams,
  ProceduralScene,
  RenderTier,
  RenderMode,
} from "../contracts";
import {
  Layers,
  Palette,
  Sliders,
  Copy,
  Download,
  FileText,
  Upload,
  Camera,
  Check,
  RotateCw,
  Cpu,
  Shield,
  Square,
  Play,
  Pause,
  Video,
  VideoOff,
  Sun,
  Crosshair,
  Volume2,
  VolumeX,
  Scissors,
} from "lucide-react";

export interface ControlPanelProps {
  options: AsciiRenderOptions;
  onOptionsChange: (newOptions: Partial<AsciiRenderOptions>) => void;
  proceduralParams: Procedural3DParams;
  onProceduralParamsChange: (params: Partial<Procedural3DParams>) => void;
  activeTier: RenderTier;
  onTierChange: (tier: RenderTier) => void;
  onSelectImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectVideo: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  isStreamingCamera: boolean;
  onCopyAscii: () => void;
  isCopied: boolean;
  onExportTxt: () => void;
  onExportPng: () => void;
  isRecordingVideo?: boolean;
  recordingProgressSec?: number;
  onToggleRecordVideo?: () => void;
  activeMode: RenderMode | "settings" | "media_picker";
  onOpenMediaPicker?: () => void;
  videoState?: {
    isPlaying: boolean;
    isLooping: boolean;
    currentTime: number;
    duration: number;
    fileName: string | null;
  };
  onPlayVideo?: () => void;
  onPauseVideo?: () => void;
  onSeekVideo?: (timeSec: number) => void;
  onToggleLoopVideo?: (loop: boolean) => void;
  onStopVideo?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  options,
  onOptionsChange,
  proceduralParams,
  onProceduralParamsChange,
  activeTier,
  onTierChange,
  onSelectImage,
  onSelectVideo,
  onStartCamera,
  onStopCamera,
  isStreamingCamera,
  onCopyAscii,
  isCopied,
  onExportTxt,
  onExportPng,
  isRecordingVideo = false,
  recordingProgressSec = 0,
  onToggleRecordVideo,
  activeMode,
  onOpenMediaPicker,
  videoState,
  onPlayVideo,
  onPauseVideo,
  onSeekVideo,
  onToggleLoopVideo,
  onStopVideo,
}) => {
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const [sampledCornerHex, setSampledCornerHex] = useState<string>("#000000");
  const [isSamplingCorners, setIsSamplingCorners] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return `${m.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`;
  };

  const handleSampleCorners = () => {
    setIsSamplingCorners(true);
    setTimeout(() => {
      setSampledCornerHex("#09090B");
      onOptionsChange({
        bgRemoval: {
          ...options.bgRemoval,
          targetColor: "auto_corner",
          customHex: "#09090B",
        },
      });
      setIsSamplingCorners(false);
    }, 150);
  };

  const scenes: { id: ProceduralScene; label: string }[] = [
    { id: "donut", label: "Torus (Donut)" },
    { id: "sphere", label: "Lambertian Sphere" },
    { id: "cube", label: "Solid / Wire Cube" },
    { id: "planet", label: "Planet & Rings" },
    { id: "blackhole", label: "Lensing Black Hole" },
  ];

  const charsets: { id: CharsetPreset; label: string }[] = [
    { id: "standard", label: "Classic Standard ( .:-=+*#%@ )" },
    { id: "extended", label: "Detailed 70-Glyph Ramp" },
    { id: "matrix", label: "Letter Glyphs ( .,:;irsXA253hMHGS#9B&@ )" },
    { id: "block", label: "Unicode Blocks ( ░▒▓█ )" },
    { id: "binary", label: "Binary Digital ( 01 )" },
    { id: "custom", label: "Custom Character Ramp" },
  ];

  const colorModes: { id: ColorMode; label: string }[] = [
    { id: "truecolor", label: "ANSI True-Color (Full RGB Video & Image)" },
    { id: "monochrome", label: "Monochrome Pure (#FFFFFF)" },
    { id: "matrix_green", label: "Phosphor Matrix (#FFFFFF)" },
    { id: "amber", label: "CRT Monochrome Amber" },
    { id: "cyberpunk_neon", label: "High Contrast Dual-Tone" },
  ];

  return (
    <aside
      aria-label="Workstation Parameter Controls"
      className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain bg-[#000000] border-b md:border-b-0 md:border-r border-[#27272a] flex flex-col max-w-full font-mono text-xs"
    >
      <div className="p-3 space-y-4 w-full max-w-full overflow-x-hidden">
        {/* Mode Specific Controls */}
        {activeMode === "procedural_3d" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scene-select"
                className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                PROCEDURAL 3D SCENE
              </label>
            </div>
            <select
              id="scene-select"
              aria-label="Select Procedural 3D Scene"
              value={proceduralParams.scene}
              onChange={(e) =>
                onProceduralParamsChange({ scene: e.target.value as ProceduralScene })
              }
              className="w-full h-8 bg-[#09090b] border border-[#27272a] text-xs font-mono text-[#ffffff] rounded-[2px] px-2 focus:outline-none focus:border-[#ffffff]"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#000000] text-[#ffffff]">
                  {s.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="text-[10px] font-mono text-[#71717a] flex justify-between">
                  <span>ROT X</span>
                  <span className="text-[#ffffff]">{proceduralParams.rotation_speed_x.toFixed(1)}x</span>
                </div>
                <input
                  id="speed-x"
                  aria-label="Rotation Speed X"
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.1"
                  value={proceduralParams.rotation_speed_x}
                  onChange={(e) =>
                    onProceduralParamsChange({ rotation_speed_x: parseFloat(e.target.value) })
                  }
                  className="w-full h-6 bg-transparent cursor-pointer accent-[#ffffff]"
                />
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#71717a] flex justify-between">
                  <span>ROT Y</span>
                  <span className="text-[#ffffff]">{proceduralParams.rotation_speed_y.toFixed(1)}x</span>
                </div>
                <input
                  id="speed-y"
                  aria-label="Rotation Speed Y"
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.1"
                  value={proceduralParams.rotation_speed_y}
                  onChange={(e) =>
                    onProceduralParamsChange({ rotation_speed_y: parseFloat(e.target.value) })
                  }
                  className="w-full h-6 bg-transparent cursor-pointer accent-[#ffffff]"
                />
              </div>
            </div>
          </div>
        )}

        {activeMode === "image" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              IMAGE INGESTION
            </label>
            <input
              type="file"
              ref={imageInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              aria-label="Upload source image file"
              onChange={onSelectImage}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              aria-label="Select source image file from disk"
              className="w-full h-8 px-3 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              <span>SELECT IMAGE FILE</span>
            </button>
          </div>
        )}

        {activeMode === "video" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              VIDEO STREAM
            </label>
            <input
              type="file"
              ref={videoInputRef}
              accept="video/mp4,video/webm"
              className="hidden"
              aria-label="Upload video file"
              onChange={onSelectVideo}
            />
            <button
              onClick={() => videoInputRef.current?.click()}
              aria-label="Select video file from disk"
              className="w-full h-8 px-3 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              <span>{videoState?.fileName ? "REPLACE VIDEO" : "SELECT VIDEO FILE"}</span>
            </button>

            {videoState && (
              <div className="space-y-2 pt-2 border-t border-[#27272a]">
                <div className="flex justify-between text-[11px] text-[#71717a] font-mono">
                  <span className="truncate max-w-[150px] text-[#ffffff]">
                    {videoState.fileName || "Active Video"}
                  </span>
                  <span>
                    {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                  </span>
                </div>

                <input
                  type="range"
                  aria-label="Seek video playback position"
                  min="0"
                  max={videoState.duration > 0 ? videoState.duration : 100}
                  step="0.1"
                  value={videoState.currentTime}
                  onChange={(e) => onSeekVideo?.(parseFloat(e.target.value))}
                  className="w-full accent-[#ffffff] h-4 bg-transparent cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-2">
                  {videoState.isPlaying ? (
                    <button
                      onClick={onPauseVideo}
                      aria-label="Pause video playback"
                      className="h-8 px-2 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                      <span>PAUSE</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPlayVideo}
                      aria-label="Play video playback"
                      className="h-8 px-2 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-[#000000]" aria-hidden="true" />
                      <span>PLAY</span>
                    </button>
                  )}

                  <button
                    onClick={onStopVideo}
                    aria-label="Stop video playback"
                    className="h-8 px-2 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current text-[#ffffff]" aria-hidden="true" />
                    <span>STOP</span>
                  </button>
                </div>

                <label className="flex items-center justify-between h-7 cursor-pointer text-[11px] font-mono text-[#71717a] hover:text-[#ffffff] px-1">
                  <span>LOOP PLAYBACK</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle video loop playback"
                    checked={videoState.isLooping}
                    onChange={(e) => onToggleLoopVideo?.(e.target.checked)}
                    className="w-4 h-4 accent-[#ffffff] cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {activeMode === "camera_stream" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              LIVE CAMERA STREAM
            </label>
            {!isStreamingCamera ? (
              <button
                onClick={onStartCamera}
                aria-label="Start live camera stream"
                className="w-full h-8 px-3 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#000000]" aria-hidden="true" />
                <span>START CAMERA</span>
              </button>
            ) : (
              <button
                onClick={onStopCamera}
                aria-label="Stop live camera stream"
                className="w-full h-8 px-3 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current text-[#ffffff]" aria-hidden="true" />
                <span>STOP CAMERA</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "media_picker" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff]">
              MEDIA STUDIO
            </label>
            {onOpenMediaPicker && (
              <button
                onClick={onOpenMediaPicker}
                className="w-full h-8 px-3 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>RESET MEDIA CANVAS</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "settings" && (
          <div className="space-y-2 border-b border-[#27272a] pb-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              SANDBOX SECURITY
            </label>
            <div className="bg-[#09090b] p-3 rounded-[2px] border border-[#27272a] space-y-1.5 text-[11px] font-mono text-[#71717a]">
              <div className="flex justify-between items-center">
                <span>IPC Ceiling:</span>
                <span className="text-[#ffffff] font-semibold">32 MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Memory Threshold:</span>
                <span className="text-[#ffffff] font-semibold">4096 MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tauri ACL:</span>
                <span className="text-[#ffffff] font-semibold">ISOLATED</span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Signal Adjustments */}
        <div className="space-y-2.5 border-b border-[#27272a] pb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              SIGNAL ADJUSTMENTS
            </label>
            <span className="text-[10px] text-[#71717a] font-mono">FILTERS</span>
          </div>

          <div className="space-y-2">
            {/* Contrast */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>CONTRAST</span>
                <span className="text-[#ffffff]">
                  {options.contrast > 0 ? `+${options.contrast}` : options.contrast}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Contrast Adjust"
                min="-100"
                max="100"
                value={options.contrast}
                onChange={(e) => onOptionsChange({ contrast: parseInt(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>BRIGHTNESS</span>
                <span className="text-[#ffffff]">
                  {options.brightness > 0 ? `+${options.brightness}` : options.brightness}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Brightness Adjust"
                min="-100"
                max="100"
                value={options.brightness}
                onChange={(e) => onOptionsChange({ brightness: parseInt(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Gamma */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>GAMMA</span>
                <span className="text-[#ffffff]">{options.gamma.toFixed(2)}γ</span>
              </div>
              <input
                type="range"
                aria-label="Gamma Correction"
                min="0.2"
                max="2.5"
                step="0.05"
                value={options.gamma}
                onChange={(e) => onOptionsChange({ gamma: parseFloat(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Exposure */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>EXPOSURE</span>
                <span className="text-[#ffffff]">
                  {options.exposure > 0 ? `+${options.exposure}` : options.exposure} EV
                </span>
              </div>
              <input
                type="range"
                aria-label="Exposure Adjust"
                min="-100"
                max="100"
                value={options.exposure}
                onChange={(e) => onOptionsChange({ exposure: parseInt(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>SATURATION</span>
                <span className="text-[#ffffff]">
                  {options.saturation > 0 ? `+${options.saturation}` : options.saturation}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Saturation Adjust"
                min="-100"
                max="100"
                value={options.saturation}
                onChange={(e) => onOptionsChange({ saturation: parseInt(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Sharpness */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
                <span>SHARPNESS</span>
                <span className="text-[#ffffff]">{options.sharpness}%</span>
              </div>
              <input
                type="range"
                aria-label="Sharpness Kernel Adjust"
                min="0"
                max="100"
                value={options.sharpness}
                onChange={(e) => onOptionsChange({ sharpness: parseInt(e.target.value) })}
                className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
              />
            </div>

            {/* Invert Luminance */}
            <label className="flex items-center justify-between h-7 cursor-pointer text-[11px] font-mono text-[#71717a] hover:text-[#ffffff] px-1">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#ffffff]" />
                <span>INVERT LUMINANCE</span>
              </span>
              <input
                type="checkbox"
                aria-label="Invert Luminance"
                checked={options.invert}
                onChange={(e) => onOptionsChange({ invert: e.target.checked })}
                className="w-4 h-4 accent-[#ffffff] cursor-pointer"
              />
            </label>

            {/* Edge Detection */}
            <label className="flex items-center justify-between h-7 cursor-pointer text-[11px] font-mono text-[#71717a] hover:text-[#ffffff] px-1">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#ffffff]" />
                <span>SOBEL EDGE DETECTION</span>
              </span>
              <input
                type="checkbox"
                aria-label="Toggle Sobel Edge Detection"
                checked={options.edgeDetection}
                onChange={(e) => onOptionsChange({ edgeDetection: e.target.checked })}
                className="w-4 h-4 accent-[#ffffff] cursor-pointer"
              />
            </label>

            {options.edgeDetection && (
              <div className="pl-3 border-l border-[#27272a] pt-1">
                <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
                  <span>THRESHOLD</span>
                  <span className="text-[#ffffff]">{options.edgeThreshold} px</span>
                </div>
                <input
                  type="range"
                  aria-label="Sobel Edge Threshold"
                  min="0"
                  max="255"
                  value={options.edgeThreshold}
                  onChange={(e) => onOptionsChange({ edgeThreshold: parseInt(e.target.value) })}
                  className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Smart Background Removal */}
        <div className="space-y-2.5 border-b border-[#27272a] pb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              BACKGROUND REMOVAL
            </label>
            <button
              type="button"
              onClick={() =>
                onOptionsChange({
                  bgRemoval: {
                    ...options.bgRemoval,
                    enabled: !options.bgRemoval?.enabled,
                  },
                })
              }
              aria-label="Toggle background removal"
              className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
                options.bgRemoval?.enabled
                  ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                  : "bg-[#09090b] text-[#71717a] border-[#27272a] hover:border-[#ffffff] hover:text-[#ffffff]"
              }`}
            >
              {options.bgRemoval?.enabled ? "ON" : "OFF"}
            </button>
          </div>

          {options.bgRemoval?.enabled && (
            <div className="space-y-2 bg-[#09090b] p-2.5 rounded-[2px] border border-[#27272a]">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
                  <span>TOLERANCE</span>
                  <span className="text-[#ffffff]">
                    {Math.round(((options.bgRemoval.threshold || 40) / 255) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Tolerance Threshold Slider"
                  min="0"
                  max="255"
                  value={options.bgRemoval.threshold}
                  onChange={(e) =>
                    onOptionsChange({
                      bgRemoval: {
                        ...options.bgRemoval,
                        threshold: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
                  <span>FEATHER</span>
                  <span className="text-[#ffffff]">{options.bgRemoval.feather} px</span>
                </div>
                <input
                  type="range"
                  aria-label="Feather Edge Radius"
                  min="0"
                  max="10"
                  value={options.bgRemoval.feather}
                  onChange={(e) =>
                    onOptionsChange({
                      bgRemoval: {
                        ...options.bgRemoval,
                        feather: parseInt(e.target.value),
                      },
                    })
                  }
                  className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
                />
              </div>

              <div className="pt-1 border-t border-[#27272a] flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSampleCorners}
                  aria-label="Auto-detect corners for background removal"
                  className="flex-1 h-7 px-2 bg-[#18181b] hover:bg-[#27272a] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-[10px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crosshair className={`w-3 h-3 ${isSamplingCorners ? "animate-spin" : ""}`} />
                  <span>{isSamplingCorners ? "SAMPLING..." : "AUTO-DETECT CORNERS"}</span>
                </button>
                <div className="h-7 px-2 bg-[#18181b] border border-[#27272a] rounded-[2px] flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-[1px] border border-[#3f3f46]"
                    style={{ backgroundColor: options.bgRemoval.customHex || sampledCornerHex }}
                  />
                  <span className="text-[10px] text-[#ffffff] font-mono">
                    {options.bgRemoval.customHex || sampledCornerHex}
                  </span>
                </div>
              </div>

              <label className="flex items-center justify-between h-6 cursor-pointer text-[10px] font-mono text-[#71717a] hover:text-[#ffffff] px-0.5">
                <span>INVERT MASK</span>
                <input
                  type="checkbox"
                  aria-label="Invert Background Mask"
                  checked={options.bgRemoval.invertMask}
                  onChange={(e) =>
                    onOptionsChange({
                      bgRemoval: {
                        ...options.bgRemoval,
                        invertMask: e.target.checked,
                      },
                    })
                  }
                  className="w-3.5 h-3.5 accent-[#ffffff] cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Video Audio Engine Controls */}
        <div className="space-y-2.5 border-b border-[#27272a] pb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5">
              {options.audio?.muted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#71717a]" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              )}
              AUDIO ENGINE
            </label>
            <button
              type="button"
              onClick={() =>
                onOptionsChange({
                  audio: {
                    ...options.audio,
                    muted: !options.audio?.muted,
                  },
                })
              }
              aria-label={options.audio?.muted ? "Unmute Audio" : "Mute Audio"}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] border transition-colors cursor-pointer ${
                options.audio?.muted
                  ? "bg-[#09090b] text-[#71717a] border-[#27272a] hover:border-[#ffffff] hover:text-[#ffffff]"
                  : "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
              }`}
            >
              {options.audio?.muted ? "MUTED" : "UNMUTED"}
            </button>
          </div>

          <div className="bg-[#09090b] p-2.5 rounded-[2px] border border-[#27272a]">
            <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
              <span>VOLUME GAIN</span>
              <span className="text-[#ffffff]">
                {Math.round((options.audio?.volume ?? 1.0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              aria-label="Audio Volume Slider"
              min="0"
              max="1"
              step="0.05"
              value={options.audio?.volume ?? 1.0}
              onChange={(e) =>
                onOptionsChange({
                  audio: {
                    ...options.audio,
                    volume: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
            />
          </div>
        </div>

        {/* Character Ramp Preset */}
        <div className="space-y-2 border-b border-[#27272a] pb-3">
          <label
            htmlFor="charset-preset"
            className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            CHARACTER RAMP
          </label>
          <select
            id="charset-preset"
            aria-label="Character Ramp Preset"
            value={options.charset.preset}
            onChange={(e) =>
              onOptionsChange({
                charset: { ...options.charset, preset: e.target.value as CharsetPreset },
              })
            }
            className="w-full h-8 bg-[#09090b] border border-[#27272a] text-xs font-mono text-[#ffffff] rounded-[2px] px-2 focus:outline-none focus:border-[#ffffff]"
          >
            {charsets.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#000000] text-[#ffffff]">
                {c.label}
              </option>
            ))}
          </select>

          {options.charset.preset === "custom" && (
            <input
              type="text"
              aria-label="Custom Glyph Sequence"
              placeholder="Enter custom glyph sequence..."
              value={options.charset.custom_glyphs || ""}
              onChange={(e) =>
                onOptionsChange({
                  charset: { ...options.charset, custom_glyphs: e.target.value },
                })
              }
              className="w-full h-8 bg-[#09090b] border border-[#27272a] text-xs font-mono text-[#ffffff] rounded-[2px] px-2 focus:outline-none focus:border-[#ffffff]"
            />
          )}
        </div>

        {/* Color Palette & CRT Scanlines */}
        <div className="space-y-2 border-b border-[#27272a] pb-3">
          <label
            htmlFor="color-mode"
            className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-1.5"
          >
            <Palette className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            OUTPUT PALETTE
          </label>
          <select
            id="color-mode"
            aria-label="Select Color Matrix Output"
            value={options.color_mode}
            onChange={(e) => onOptionsChange({ color_mode: e.target.value as ColorMode })}
            className="w-full h-8 bg-[#09090b] border border-[#27272a] text-xs font-mono text-[#ffffff] rounded-[2px] px-2 focus:outline-none focus:border-[#ffffff]"
          >
            {colorModes.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#000000] text-[#ffffff]">
                {m.label}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-between h-7 cursor-pointer text-[11px] font-mono text-[#71717a] hover:text-[#ffffff] px-1">
            <span>CRT SCANLINES</span>
            <input
              type="checkbox"
              aria-label="Enable CRT Scanlines Effect"
              checked={options.enable_scanlines}
              onChange={(e) => onOptionsChange({ enable_scanlines: e.target.checked })}
              className="w-4 h-4 accent-[#ffffff] cursor-pointer"
            />
          </label>
        </div>

        {/* Density Grid */}
        <div className="space-y-2 border-b border-[#27272a] pb-3">
          <div className="flex justify-between text-[11px] font-mono text-[#71717a]">
            <span>GRID MATRIX COLUMNS</span>
            <span className="text-[#ffffff] font-semibold">
              {options.max_output_columns} cols
            </span>
          </div>
          <input
            type="range"
            aria-label="Grid Column Density"
            min="40"
            max="240"
            step="10"
            value={options.max_output_columns}
            onChange={(e) => {
              const cols = parseInt(e.target.value);
              const rows = Math.floor(cols * 0.45);
              onOptionsChange({ max_output_columns: cols, max_output_rows: rows });
            }}
            className="w-full h-4 bg-transparent cursor-pointer accent-[#ffffff]"
          />
        </div>

        {/* Hardware Acceleration Tier */}
        <div className="space-y-2 border-b border-[#27272a] pb-3">
          <fieldset>
            <legend className="text-xs font-mono font-semibold text-[#ffffff] flex items-center justify-between mb-1.5 w-full">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                <span>RENDER TIER</span>
              </div>
              <span className="text-[10px] font-mono text-[#71717a]">
                T1→T2→T3
              </span>
            </legend>
            <div className="space-y-1.5 text-xs font-mono">
              <label
                className={`flex items-center justify-between p-2 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier1_webgpu"
                    ? "bg-[#18181b] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#09090b] border-[#27272a] text-[#71717a] hover:text-[#ffffff] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tier"
                    value="tier1_webgpu"
                    checked={activeTier === "tier1_webgpu"}
                    onChange={() => onTierChange("tier1_webgpu")}
                    className="w-3.5 h-3.5 accent-[#ffffff]"
                  />
                  <span className="text-[11px] font-semibold">Tier 1: WebGPU Compute</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[1px] border border-[#27272a]">
                  {activeTier === "tier1_webgpu" ? "ACTIVE" : "READY"}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier2_webgl"
                    ? "bg-[#18181b] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#09090b] border-[#27272a] text-[#71717a] hover:text-[#ffffff] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tier"
                    value="tier2_webgl"
                    checked={activeTier === "tier2_webgl"}
                    onChange={() => onTierChange("tier2_webgl")}
                    className="w-3.5 h-3.5 accent-[#ffffff]"
                  />
                  <span className="text-[11px] font-semibold">Tier 2: WebGL2 Fragment</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[1px] border border-[#27272a]">
                  {activeTier === "tier2_webgl" ? "ACTIVE" : "READY"}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-2 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier3_canvas2d"
                    ? "bg-[#18181b] border-[#ffffff] text-[#ffffff]"
                    : "bg-[#09090b] border-[#27272a] text-[#71717a] hover:text-[#ffffff] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="tier"
                    value="tier3_canvas2d"
                    checked={activeTier === "tier3_canvas2d"}
                    onChange={() => onTierChange("tier3_canvas2d")}
                    className="w-3.5 h-3.5 accent-[#ffffff]"
                  />
                  <span className="text-[11px] font-semibold">Tier 3: Canvas2D CPU</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[1px] border border-[#27272a]">
                  {activeTier === "tier3_canvas2d" ? "ACTIVE" : "READY"}
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Actions & Exports */}
        <div className="space-y-2 pt-1">
          <label className="text-xs font-mono font-semibold text-[#ffffff]">
            ACTIONS & EXPORTS
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onCopyAscii}
              aria-label={isCopied ? "ASCII text copied to clipboard" : "Copy ASCII text to clipboard"}
              className="h-8 px-2 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                  <span className="font-semibold text-[#ffffff]">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#71717a]" aria-hidden="true" />
                  <span>COPY TEXT</span>
                </>
              )}
            </button>
            <button
              onClick={onExportTxt}
              aria-label="Export ASCII art as plain text file"
              className="h-8 px-2 bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff] rounded-[2px] text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#71717a]" aria-hidden="true" />
              <span>.TXT FILE</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {onToggleRecordVideo && (
              <button
                onClick={onToggleRecordVideo}
                aria-label={isRecordingVideo ? "Stop recording and download video" : "Record and export ASCII video"}
                className={`w-full h-8 px-3 rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isRecordingVideo
                    ? "bg-[#ffffff] text-[#000000] animate-pulse"
                    : activeMode === "video"
                    ? "bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000]"
                    : "bg-[#09090b] hover:bg-[#18181b] text-[#ffffff] border border-[#27272a] hover:border-[#ffffff]"
                }`}
              >
                {isRecordingVideo ? (
                  <>
                    <VideoOff className="w-3.5 h-3.5 text-[#000000]" aria-hidden="true" />
                    <span>STOP & SAVE ({recordingProgressSec}s)</span>
                  </>
                ) : (
                  <>
                    <Video className={`w-3.5 h-3.5 ${activeMode === "video" ? "text-black" : "text-[#ffffff]"}`} aria-hidden="true" />
                    <span>RECORD VIDEO</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onExportPng}
              aria-label="Export rendered canvas image as PNG"
              className="w-full h-8 px-3 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#000000]" aria-hidden="true" />
              <span>EXPORT CANVAS PNG</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

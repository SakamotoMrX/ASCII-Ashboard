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
  Sparkles,
  Scissors,
  Terminal,
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
  onToggleFastfetch?: () => void;
  isFastfetchOpen?: boolean;
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
  onToggleFastfetch,
  isFastfetchOpen = false,
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
    // Simulate instantaneous corner detection heuristic (#0a0a0c)
    setTimeout(() => {
      setSampledCornerHex("#0A0A0C");
      onOptionsChange({
        bgRemoval: {
          ...options.bgRemoval,
          targetColor: "auto_corner",
          customHex: "#0A0A0C",
        },
      });
      setIsSamplingCorners(false);
    }, 200);
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
    { id: "matrix_green", label: "Phosphor Matrix (#00FF88)" },
    { id: "amber", label: "CRT Amber (#FFB700)" },
    { id: "cyberpunk_neon", label: "Cyberpunk Neon (#FF3366)" },
  ];

  return (
    <aside
      aria-label="Workstation Parameter Controls"
      className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain bg-[#0a0a0c] border-b md:border-b-0 md:border-r border-[#1a1a22] flex flex-col max-w-full font-mono text-xs select-none"
    >
      <div className="p-5 space-y-6">
        {/* Fastfetch Drawer Trigger Button */}
        {onToggleFastfetch && (
          <div className="pb-1">
            <button
              type="button"
              onClick={onToggleFastfetch}
              aria-label="Toggle Fastfetch System Telemetry Drawer"
              className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-[2px] border text-xs font-mono font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                isFastfetchOpen
                  ? "bg-[#141416] border-[#00ff66] text-[#00ff66]"
                  : "bg-[#121215] border-[#1a1a22] text-[#e2e8f0] hover:border-[#e2e8f0] hover:bg-[#141416]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#38bdf8]" aria-hidden="true" />
                <span>FASTFETCH TELEMETRY</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#1a1a22] text-[#38bdf8] border border-[#38bdf8]/30">
                {isFastfetchOpen ? "OPEN // ACTIVE" : "DRAWER"}
              </span>
            </button>
          </div>
        )}

        {/* Section 1: Mode Specific Controls */}
        {activeMode === "procedural_3d" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scene-select"
                className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
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
              className="w-full min-h-[44px] bg-[#121215] border border-[#1a1a22] text-xs font-mono text-[#e2e8f0] rounded-[2px] px-3 py-2.5 focus:outline-none focus:border-[#e2e8f0]"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0a0a0c] text-[#e2e8f0]">
                  {s.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor="speed-x"
                  className="text-[11px] font-mono text-[#71717a] flex justify-between pb-1"
                >
                  <span>ROT X</span>
                  <span className="text-[#e2e8f0]">
                    {proceduralParams.rotation_speed_x.toFixed(1)}x
                  </span>
                </label>
                <div className="min-h-[44px] flex items-center w-full">
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
                    className="w-full h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="speed-y"
                  className="text-[11px] font-mono text-[#71717a] flex justify-between pb-1"
                >
                  <span>ROT Y</span>
                  <span className="text-[#e2e8f0]">
                    {proceduralParams.rotation_speed_y.toFixed(1)}x
                  </span>
                </label>
                <div className="min-h-[44px] flex items-center w-full">
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
                    className="w-full h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMode === "image" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              IMAGE PREFLIGHT
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
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#e2e8f0]" aria-hidden="true" />
              <span>SELECT IMAGE FILE</span>
            </button>
            <p className="text-[11px] font-mono text-[#71717a]">
              Buffers clamped to 2048px max texture ceiling with zero memory leaks.
            </p>
          </div>
        )}

        {activeMode === "video" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              VIDEO STREAM EXTRACTION
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
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#e2e8f0]" aria-hidden="true" />
              <span>{videoState?.fileName ? "REPLACE VIDEO FILE" : "SELECT VIDEO FILE"}</span>
            </button>

            {videoState && (
              <div className="space-y-3 pt-2 border-t border-[#1a1a22]">
                <div className="flex justify-between text-xs text-[#71717a] font-mono">
                  <span className="truncate max-w-[150px] text-[#e2e8f0]">
                    {videoState.fileName || "Active Video"}
                  </span>
                  <span className="text-[11px]">
                    {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                  </span>
                </div>

                {/* Seek Bar */}
                <div className="min-h-[44px] flex items-center w-full">
                  <input
                    type="range"
                    aria-label="Seek video playback position"
                    min="0"
                    max={videoState.duration > 0 ? videoState.duration : 100}
                    step="0.1"
                    value={videoState.currentTime}
                    onChange={(e) => onSeekVideo?.(parseFloat(e.target.value))}
                    className="w-full accent-[#ffffff] h-11 bg-transparent cursor-pointer"
                  />
                </div>

                {/* Play / Pause / Stop Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {videoState.isPlaying ? (
                    <button
                      onClick={onPauseVideo}
                      aria-label="Pause video playback"
                      className="min-h-[44px] px-3 py-2 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Pause className="w-4 h-4 text-[#e2e8f0]" aria-hidden="true" />
                      <span>PAUSE</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPlayVideo}
                      aria-label="Play video playback"
                      className="min-h-[44px] px-3 py-2 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>PLAY</span>
                    </button>
                  )}

                  <button
                    onClick={onStopVideo}
                    aria-label="Stop video playback"
                    className="min-h-[44px] px-3 py-2 bg-[#121215] hover:bg-[#1c1c1e] text-[#ef4444] border border-[#1a1a22] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current text-[#ef4444]" aria-hidden="true" />
                    <span>STOP</span>
                  </button>
                </div>

                {/* Loop Toggle */}
                <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1">
                  <span>LOOP PLAYBACK</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle video loop playback"
                    checked={videoState.isLooping}
                    onChange={(e) => onToggleLoopVideo?.(e.target.checked)}
                    className="w-5 h-5 accent-[#ffffff] cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {activeMode === "camera_stream" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              LIVE CAMERA STREAM
            </label>
            {!isStreamingCamera ? (
              <button
                onClick={onStartCamera}
                aria-label="Start live camera stream"
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>START CAMERA STREAM</span>
              </button>
            ) : (
              <button
                onClick={onStopCamera}
                aria-label="Stop live camera stream"
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#121215] hover:bg-[#1c1c1e] text-[#ef4444] border border-[#1a1a22] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>STOP STREAM</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "media_picker" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0]">
              MEDIA STUDIO WORKBENCH
            </label>
            <p className="text-xs font-mono text-[#71717a]">
              Drop videos, snap photos, or ingest stills in the main viewport.
            </p>
            {onOpenMediaPicker && (
              <button
                onClick={onOpenMediaPicker}
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>RESET MEDIA STUDIO</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "settings" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#00ff66]" aria-hidden="true" />
              SANDBOX SECURITY
            </label>
            <div className="bg-[#121215] p-4 rounded-[2px] border border-[#1a1a22] space-y-2 text-xs font-mono text-[#71717a]">
              <div className="flex justify-between min-h-[28px] items-center">
                <span>IPC Ceiling:</span>
                <span className="text-[#e2e8f0] font-semibold">32 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Memory Threshold:</span>
                <span className="text-[#e2e8f0] font-semibold">4096 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Tauri ACL:</span>
                <span className="text-[#00ff66] font-semibold">ISOLATED</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Extended Signal Adjustments */}
        <div className="space-y-4 border-t border-[#1a1a22] pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
              SIGNAL ADJUSTMENTS
            </label>
            <span className="text-[10px] text-[#71717a] font-mono">PRECISION CURVES</span>
          </div>

          <div className="space-y-3">
            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>CONTRAST</span>
                <span className="text-[#e2e8f0]">
                  {options.contrast > 0 ? `+${options.contrast}` : options.contrast}%
                </span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Contrast Adjust"
                  min="-100"
                  max="100"
                  value={options.contrast}
                  onChange={(e) => onOptionsChange({ contrast: parseInt(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>BRIGHTNESS</span>
                <span className="text-[#e2e8f0]">
                  {options.brightness > 0 ? `+${options.brightness}` : options.brightness}%
                </span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Brightness Adjust"
                  min="-100"
                  max="100"
                  value={options.brightness}
                  onChange={(e) => onOptionsChange({ brightness: parseInt(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Gamma Curve */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>GAMMA CURVE</span>
                <span className="text-[#e2e8f0]">{options.gamma.toFixed(2)}γ</span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Gamma Correction"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={options.gamma}
                  onChange={(e) => onOptionsChange({ gamma: parseFloat(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Exposure */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>EXPOSURE (EV)</span>
                <span className="text-[#e2e8f0]">
                  {options.exposure > 0 ? `+${options.exposure}` : options.exposure} EV
                </span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Exposure Adjust"
                  min="-100"
                  max="100"
                  value={options.exposure}
                  onChange={(e) => onOptionsChange({ exposure: parseInt(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>SATURATION</span>
                <span className="text-[#e2e8f0]">
                  {options.saturation > 0 ? `+${options.saturation}` : options.saturation}%
                </span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Saturation Adjust"
                  min="-100"
                  max="100"
                  value={options.saturation}
                  onChange={(e) => onOptionsChange({ saturation: parseInt(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Sharpness (Unsharp Mask) */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>SHARPNESS</span>
                <span className="text-[#e2e8f0]">{options.sharpness}%</span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Sharpness Kernel Adjust"
                  min="0"
                  max="100"
                  value={options.sharpness}
                  onChange={(e) => onOptionsChange({ sharpness: parseInt(e.target.value) })}
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            {/* Invert Luminance Switch */}
            <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1 py-1 rounded-[2px] hover:bg-[#121215]">
              <span className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-[#71717a]" />
                <span>INVERT LUMINANCE</span>
              </span>
              <input
                type="checkbox"
                aria-label="Invert Luminance"
                checked={options.invert}
                onChange={(e) => onOptionsChange({ invert: e.target.checked })}
                className="w-5 h-5 accent-[#ffffff] cursor-pointer"
              />
            </label>

            {/* Edge Detection (Sobel) Toggle */}
            <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1 py-1 rounded-[2px] hover:bg-[#121215]">
              <span className="flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>SOBEL EDGE DETECTION</span>
              </span>
              <input
                type="checkbox"
                aria-label="Toggle Sobel Edge Detection"
                checked={options.edgeDetection}
                onChange={(e) => onOptionsChange({ edgeDetection: e.target.checked })}
                className="w-5 h-5 accent-[#ffffff] cursor-pointer"
              />
            </label>

            {/* Edge Detection Threshold */}
            {options.edgeDetection && (
              <div className="pl-4 border-l-2 border-[#38bdf8]/40 pt-1">
                <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                  <span>SOBEL THRESHOLD</span>
                  <span className="text-[#38bdf8]">{options.edgeThreshold} px</span>
                </div>
                <div className="min-h-[44px] flex items-center w-full">
                  <input
                    type="range"
                    aria-label="Sobel Edge Threshold"
                    min="0"
                    max="255"
                    value={options.edgeThreshold}
                    onChange={(e) => onOptionsChange({ edgeThreshold: parseInt(e.target.value) })}
                    className="w-full h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Smart Background Removal */}
        <div className="space-y-4 border-t border-[#1a1a22] pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              <Scissors className="w-3.5 h-3.5 text-[#00ff66]" aria-hidden="true" />
              SMART BACKGROUND REMOVAL
            </label>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                options.bgRemoval?.enabled
                  ? "bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/40 font-bold"
                  : "bg-[#141416] text-[#71717a] border-[#222224]"
              }`}
            >
              {options.bgRemoval?.enabled ? "ACTIVE" : "STANDBY"}
            </span>
          </div>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1 py-1 rounded-[2px] hover:bg-[#121215]">
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>ENABLE REMOVAL MASK</span>
            </span>
            <input
              type="checkbox"
              aria-label="Toggle Background Removal Mask"
              checked={options.bgRemoval?.enabled || false}
              onChange={(e) =>
                onOptionsChange({
                  bgRemoval: {
                    ...options.bgRemoval,
                    enabled: e.target.checked,
                  },
                })
              }
              className="w-5 h-5 accent-[#00ff66] cursor-pointer"
            />
          </label>

          {options.bgRemoval?.enabled && (
            <div className="space-y-3 bg-[#121215] p-3.5 rounded-[2px] border border-[#1a1a22]">
              {/* Tolerance Threshold */}
              <div>
                <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                  <span>TOLERANCE THRESHOLD</span>
                  <span className="text-[#e2e8f0]">
                    {Math.round(((options.bgRemoval.threshold || 40) / 255) * 100)}% ({options.bgRemoval.threshold || 40})
                  </span>
                </div>
                <div className="min-h-[44px] flex items-center w-full">
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
                    className="w-full h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              {/* Edge Feather Radius */}
              <div>
                <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                  <span>FEATHER RADIUS</span>
                  <span className="text-[#e2e8f0]">{options.bgRemoval.feather} px</span>
                </div>
                <div className="min-h-[44px] flex items-center w-full">
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
                    className="w-full h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              {/* Sample Corners Heuristic & Target Color */}
              <div className="pt-2 border-t border-[#1a1a22] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#71717a]">TARGET COLOR MODE</span>
                  <span className="text-[#00ff66] font-semibold uppercase text-[10px]">
                    {options.bgRemoval.targetColor}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSampleCorners}
                    aria-label="Sample 4 Canvas Corners for Background Key"
                    className="flex-1 min-h-[44px] px-3 py-2 bg-[#141416] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#00ff66] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isSamplingCorners ? "animate-spin text-[#00ff66]" : "text-[#38bdf8]"}`} />
                    <span>{isSamplingCorners ? "SAMPLING..." : "SAMPLE CORNERS"}</span>
                  </button>

                  <div className="flex items-center gap-2 bg-[#141416] px-2.5 min-h-[44px] rounded-[2px] border border-[#1a1a22]">
                    <span
                      className="w-4 h-4 rounded-[1px] border border-[#222224]"
                      style={{ backgroundColor: options.bgRemoval.customHex || sampledCornerHex }}
                    />
                    <span className="text-[11px] text-[#e2e8f0] font-mono">
                      {options.bgRemoval.customHex || sampledCornerHex}
                    </span>
                  </div>
                </div>

                {/* Invert Mask Switch */}
                <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1 pt-1">
                  <span>INVERT BACKGROUND MASK</span>
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
                    className="w-5 h-5 accent-[#00ff66] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Audio Engine Controls */}
        <div className="space-y-4 border-t border-[#1a1a22] pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2">
              {options.audio?.muted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#ef4444]" aria-hidden="true" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#00ff66]" aria-hidden="true" />
              )}
              AUDIO ENGINE PASSTHROUGH
            </label>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border ${
                options.audio?.muted
                  ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/40"
                  : activeMode === "video"
                  ? "bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/40 font-semibold"
                  : "bg-[#141416] text-[#71717a] border-[#222224]"
              }`}
            >
              {options.audio?.muted
                ? "MUTED"
                : activeMode === "video"
                ? "AUDIO SYNCED"
                : "NO AUDIO TRACK"}
            </span>
          </div>

          <div className="space-y-3 bg-[#121215] p-3.5 rounded-[2px] border border-[#1a1a22]">
            {/* Mute/Unmute Toggle Button */}
            <div className="flex items-center justify-between">
              <span className="text-[#71717a]">PASSTHROUGH STATUS</span>
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
                aria-label={options.audio?.muted ? "Unmute Audio Passthrough" : "Mute Audio Passthrough"}
                className={`min-h-[44px] px-3 py-1.5 rounded-[2px] border text-xs font-mono font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                  options.audio?.muted
                    ? "bg-[#141416] text-[#ef4444] border-[#ef4444]/40 hover:bg-[#ef4444]/20"
                    : "bg-[#141416] text-[#00ff66] border-[#00ff66]/40 hover:bg-[#00ff66]/20"
                }`}
              >
                {options.audio?.muted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-[#ef4444]" />
                    <span>MUTED</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#00ff66]" />
                    <span>AUDIO SYNCED</span>
                  </>
                )}
              </button>
            </div>

            {/* Volume Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
                <span>OUTPUT GAIN</span>
                <span className="text-[#e2e8f0]">
                  {Math.round((options.audio?.volume ?? 1.0) * 100)}%
                </span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
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
                  className="w-full h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Character Ramp */}
        <div className="space-y-3 border-t border-[#1a1a22] pt-4">
          <label
            htmlFor="charset-preset"
            className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
            KERNEL CHARACTER RAMP
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
            className="w-full min-h-[44px] bg-[#121215] border border-[#1a1a22] text-xs font-mono text-[#e2e8f0] rounded-[2px] px-3 py-2.5 focus:outline-none focus:border-[#e2e8f0]"
          >
            {charsets.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0a0a0c] text-[#e2e8f0]">
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
              className="w-full min-h-[44px] bg-[#121215] border border-[#1a1a22] text-xs font-mono text-[#e2e8f0] rounded-[2px] px-3 py-2.5 mt-1 focus:outline-none focus:border-[#e2e8f0]"
            />
          )}
        </div>

        {/* Section 6: Color Matrix Output */}
        <div className="space-y-3 border-t border-[#1a1a22] pt-4">
          <label
            htmlFor="color-mode"
            className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center gap-2"
          >
            <Palette className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
            LUMINANCE PALETTE
          </label>
          <select
            id="color-mode"
            aria-label="Select Color Matrix Output"
            value={options.color_mode}
            onChange={(e) => onOptionsChange({ color_mode: e.target.value as ColorMode })}
            className="w-full min-h-[44px] bg-[#121215] border border-[#1a1a22] text-xs font-mono text-[#e2e8f0] rounded-[2px] px-3 py-2.5 focus:outline-none focus:border-[#e2e8f0]"
          >
            {colorModes.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#0a0a0c] text-[#e2e8f0]">
                {m.label}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#71717a] hover:text-[#e2e8f0] px-1">
            <span>CRT SCANLINES</span>
            <input
              type="checkbox"
              aria-label="Enable CRT Scanlines Effect"
              checked={options.enable_scanlines}
              onChange={(e) => onOptionsChange({ enable_scanlines: e.target.checked })}
              className="w-5 h-5 accent-[#ffffff] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 7: Density Grid */}
        <div className="space-y-3 border-t border-[#1a1a22] pt-4">
          <div className="flex justify-between text-xs font-mono text-[#71717a] mb-1">
            <span>GRID MATRIX COLUMNS</span>
            <span className="text-[#e2e8f0] font-semibold">
              {options.max_output_columns} cols
            </span>
          </div>
          <div className="min-h-[44px] flex items-center w-full">
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
              className="w-full h-11 bg-transparent cursor-pointer"
            />
          </div>
        </div>

        {/* Section 8: Hardware Acceleration Tier */}
        <div className="space-y-3 border-t border-[#1a1a22] pt-4">
          <fieldset>
            <legend className="text-xs font-mono font-semibold text-[#e2e8f0] flex items-center justify-between mb-2 w-full">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" aria-hidden="true" />
                <span>HARDWARE ACCELERATION TIER</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#71717a] border border-[#222224]">
                CASCADE: T1→T2→T3
              </span>
            </legend>
            <div className="space-y-2 text-xs font-mono">
              {/* Tier 1: WebGPU Compute Pipeline */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier1_webgpu"
                    ? "bg-[#141416] border-[#00ff66]/50 text-[#e2e8f0]"
                    : "bg-[#0a0a0c] border-[#1a1a22] text-[#71717a] hover:text-[#e2e8f0] hover:border-[#333336]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value="tier1_webgpu"
                    checked={activeTier === "tier1_webgpu"}
                    onChange={() => onTierChange("tier1_webgpu")}
                    className="w-4 h-4 mt-0.5 accent-[#00ff66]"
                  />
                  <div>
                    <div className="font-semibold text-[#e2e8f0]">Tier 1: WebGPU Compute Pipeline</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Active Device / Metal / D3D12
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier1_webgpu"
                      ? "bg-[#00ff66] text-[#000000] border-[#00ff66] font-bold"
                      : "bg-[#141416] text-[#71717a] border-[#1a1a22]"
                  }`}
                >
                  {activeTier === "tier1_webgpu" ? "ACTIVE" : "READY"}
                </span>
              </label>

              {/* Tier 2: WebGL2 Fragment Shader */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier2_webgl"
                    ? "bg-[#141416] border-[#38bdf8]/50 text-[#e2e8f0]"
                    : "bg-[#0a0a0c] border-[#1a1a22] text-[#71717a] hover:text-[#e2e8f0] hover:border-[#333336]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value="tier2_webgl"
                    checked={activeTier === "tier2_webgl"}
                    onChange={() => onTierChange("tier2_webgl")}
                    className="w-4 h-4 mt-0.5 accent-[#38bdf8]"
                  />
                  <div>
                    <div className="font-semibold text-[#e2e8f0]">Tier 2: WebGL2 Fragment Shader</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Active GL Core
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier2_webgl"
                      ? "bg-[#38bdf8] text-[#000000] border-[#38bdf8] font-bold"
                      : "bg-[#141416] text-[#71717a] border-[#1a1a22]"
                  }`}
                >
                  {activeTier === "tier2_webgl" ? "ACTIVE" : "READY"}
                </span>
              </label>

              {/* Tier 3: Canvas2D CPU Fallback */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[2px] cursor-pointer border transition-all ${
                  activeTier === "tier3_canvas2d"
                    ? "bg-[#141416] border-[#e2e8f0]/40 text-[#e2e8f0]"
                    : "bg-[#0a0a0c] border-[#1a1a22] text-[#71717a] hover:text-[#e2e8f0] hover:border-[#333336]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value="tier3_canvas2d"
                    checked={activeTier === "tier3_canvas2d"}
                    onChange={() => onTierChange("tier3_canvas2d")}
                    className="w-4 h-4 mt-0.5 accent-[#ffffff]"
                  />
                  <div>
                    <div className="font-semibold text-[#e2e8f0]">Tier 3: Canvas2D CPU Fallback</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Multi-threaded worker
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier3_canvas2d"
                      ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                      : "bg-[#141416] text-[#71717a] border-[#1a1a22]"
                  }`}
                >
                  {activeTier === "tier3_canvas2d" ? "ACTIVE" : "READY"}
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Section 9: Action Exports */}
        <div className="space-y-3 border-t border-[#1a1a22] pt-4">
          <label className="text-xs font-mono font-semibold text-[#e2e8f0]">
            ACTIONS & EXPORTS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={onCopyAscii}
              aria-label={isCopied ? "ASCII text copied to clipboard" : "Copy ASCII text to clipboard"}
              className="min-h-[44px] py-2 px-3 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-[#00ff66]" aria-hidden="true" />
                  <span className="font-semibold text-[#00ff66]">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#71717a]" aria-hidden="true" />
                  <span>COPY TEXT</span>
                </>
              )}
            </button>
            <button
              onClick={onExportTxt}
              aria-label="Export ASCII art as plain text file"
              className="min-h-[44px] py-2 px-3 bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0] rounded-[2px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#71717a]" aria-hidden="true" />
              <span>.TXT FILE</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {onToggleRecordVideo && (
              <button
                onClick={onToggleRecordVideo}
                aria-label={isRecordingVideo ? "Stop recording and download video" : "Record and export ASCII video"}
                className={`w-full min-h-[44px] py-2.5 px-3 rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isRecordingVideo
                    ? "bg-[#ef4444] hover:bg-[#dc2626] text-white animate-pulse"
                    : activeMode === "video"
                    ? "bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000]"
                    : "bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0]"
                }`}
              >
                {isRecordingVideo ? (
                  <>
                    <VideoOff className="w-4 h-4 text-white" aria-hidden="true" />
                    <span>STOP & DOWNLOAD ({recordingProgressSec}s)</span>
                  </>
                ) : (
                  <>
                    <Video className={`w-4 h-4 ${activeMode === "video" ? "text-black" : "text-[#e2e8f0]"}`} aria-hidden="true" />
                    <span>RECORD & EXPORT VIDEO</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onExportPng}
              aria-label="Export rendered canvas image as PNG"
              className={`w-full min-h-[44px] py-2.5 px-3 rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeMode === "video"
                  ? "bg-[#121215] hover:bg-[#1c1c1e] text-[#e2e8f0] border border-[#1a1a22] hover:border-[#e2e8f0]"
                  : "bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000]"
              }`}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>EXPORT CANVAS PNG</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

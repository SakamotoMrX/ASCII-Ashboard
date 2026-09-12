import React from "react";
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

  const formatTime = (secs: number) => {
    const s = Math.floor(secs || 0);
    const m = Math.floor(s / 60);
    const remSec = s % 60;
    return `${m.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`;
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
      className="w-full md:w-80 flex-shrink-0 bg-[#0a0a0c] border-b md:border-b-0 md:border-r border-[#222224] flex flex-col max-w-full overflow-y-auto overflow-x-hidden select-none font-sans"
    >
      <div className="p-5 space-y-5">
        {/* Section 1: Mode Specific Controls */}
        {activeMode === "procedural_3d" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="scene-select"
                className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2"
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
              className="w-full min-h-[44px] bg-[#141416] border border-[#222224] text-xs font-mono text-[#ffffff] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#ffffff]"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0a0a0c] text-[#ffffff]">
                  {s.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor="speed-x"
                  className="text-[11px] font-mono text-[#a1a1aa] flex justify-between pb-1"
                >
                  <span>ROT X</span>
                  <span className="text-[#ffffff]">
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
                  className="text-[11px] font-mono text-[#a1a1aa] flex justify-between pb-1"
                >
                  <span>ROT Y</span>
                  <span className="text-[#ffffff]">
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
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
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
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
              <span>SELECT IMAGE FILE</span>
            </button>
            <p className="text-[11px] font-mono text-[#71717a]">
              Buffers automatically clamped to 2048px maximum texture ceiling.
            </p>
          </div>
        )}

        {activeMode === "video" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
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
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
              <span>{videoState?.fileName ? "REPLACE VIDEO FILE" : "SELECT VIDEO FILE"}</span>
            </button>

            {videoState && (
              <div className="space-y-3 pt-2 border-t border-[#222224]">
                <div className="flex justify-between text-xs text-[#a1a1aa] font-mono">
                  <span className="truncate max-w-[150px] text-[#ffffff]">
                    {videoState.fileName || "Active Video"}
                  </span>
                  <span className="text-[11px]">
                    {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                  </span>
                </div>

                {/* Seek Bar */}
                <div className="min-h-[36px] flex items-center w-full">
                  <input
                    type="range"
                    aria-label="Seek video playback position"
                    min="0"
                    max={videoState.duration > 0 ? videoState.duration : 100}
                    step="0.1"
                    value={videoState.currentTime}
                    onChange={(e) => onSeekVideo?.(parseFloat(e.target.value))}
                    className="w-full accent-[#ffffff] h-9 bg-transparent cursor-pointer"
                  />
                </div>

                {/* Play / Pause / Stop Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {videoState.isPlaying ? (
                    <button
                      onClick={onPauseVideo}
                      aria-label="Pause video playback"
                      className="min-h-[44px] px-3 py-2 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Pause className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
                      <span>PAUSE</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPlayVideo}
                      aria-label="Play video playback"
                      className="min-h-[44px] px-3 py-2 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[4px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" aria-hidden="true" />
                      <span>PLAY</span>
                    </button>
                  )}

                  <button
                    onClick={onStopVideo}
                    aria-label="Stop video playback"
                    className="min-h-[44px] px-3 py-2 bg-[#141416] hover:bg-[#1c1c1e] text-[#ef4444] border border-[#222224] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Square className="w-4 h-4 fill-current text-[#ef4444]" aria-hidden="true" />
                    <span>STOP</span>
                  </button>
                </div>

                {/* Loop Toggle */}
                <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#a1a1aa] hover:text-[#ffffff] px-1">
                  <span>LOOP PLAYBACK</span>
                  <input
                    type="checkbox"
                    aria-label="Toggle video loop playback"
                    checked={videoState.isLooping}
                    onChange={(e) => onToggleLoopVideo?.(e.target.checked)}
                    className="w-6 h-6 accent-[#ffffff] cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {activeMode === "camera_stream" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              LIVE CAMERA STREAM
            </label>
            {!isStreamingCamera ? (
              <button
                onClick={onStartCamera}
                aria-label="Start live camera stream"
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000] rounded-[4px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" aria-hidden="true" />
                <span>START CAMERA STREAM</span>
              </button>
            ) : (
              <button
                onClick={onStopCamera}
                aria-label="Stop live camera stream"
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#141416] hover:bg-[#1c1c1e] text-[#ef4444] border border-[#222224] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>STOP STREAM</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "media_picker" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff]">
              MEDIA STUDIO WORKBENCH
            </label>
            <p className="text-xs font-mono text-[#71717a]">
              Drop videos, snap photos, or ingest stills in the main viewport.
            </p>
            {onOpenMediaPicker && (
              <button
                onClick={onOpenMediaPicker}
                className="w-full min-h-[44px] py-2.5 px-4 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>RESET MEDIA STUDIO</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "settings" && (
          <div className="space-y-3">
            <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
              SANDBOX SECURITY
            </label>
            <div className="bg-[#141416] p-4 rounded-[4px] border border-[#222224] space-y-2 text-xs font-mono text-[#a1a1aa]">
              <div className="flex justify-between min-h-[28px] items-center">
                <span>IPC Ceiling:</span>
                <span className="text-[#ffffff] font-semibold">32 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Memory Threshold:</span>
                <span className="text-[#ffffff] font-semibold">4096 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Tauri ACL:</span>
                <span className="text-[#ffffff] font-semibold">ISOLATED</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Character Ramp */}
        <div className="space-y-3 border-t border-[#222224] pt-4">
          <label
            htmlFor="charset-preset"
            className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2"
          >
            <Layers className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
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
            className="w-full min-h-[44px] bg-[#141416] border border-[#222224] text-xs font-mono text-[#ffffff] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#ffffff]"
          >
            {charsets.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0a0a0c] text-[#ffffff]">
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
              className="w-full min-h-[44px] bg-[#141416] border border-[#222224] text-xs font-mono text-[#ffffff] rounded-[4px] px-3 py-2.5 mt-1 focus:outline-none focus:border-[#ffffff]"
            />
          )}

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#a1a1aa] hover:text-[#ffffff] px-1">
            <span>INVERT LUMINANCE</span>
            <input
              type="checkbox"
              aria-label="Invert Luminance"
              checked={options.charset.invert}
              onChange={(e) =>
                onOptionsChange({
                  charset: { ...options.charset, invert: e.target.checked },
                })
              }
              className="w-6 h-6 accent-[#ffffff] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 3: Color Matrix Output */}
        <div className="space-y-3 border-t border-[#222224] pt-4">
          <label
            htmlFor="color-mode"
            className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2"
          >
            <Palette className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            LUMINANCE PALETTE
          </label>
          <select
            id="color-mode"
            aria-label="Select Color Matrix Output"
            value={options.color_mode}
            onChange={(e) => onOptionsChange({ color_mode: e.target.value as ColorMode })}
            className="w-full min-h-[44px] bg-[#141416] border border-[#222224] text-xs font-mono text-[#ffffff] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#ffffff]"
          >
            {colorModes.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#0a0a0c] text-[#ffffff]">
                {m.label}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs font-mono text-[#a1a1aa] hover:text-[#ffffff] px-1">
            <span>CRT SCANLINES</span>
            <input
              type="checkbox"
              aria-label="Enable CRT Scanlines Effect"
              checked={options.enable_scanlines}
              onChange={(e) => onOptionsChange({ enable_scanlines: e.target.checked })}
              className="w-6 h-6 accent-[#ffffff] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 4: Signal Adjustments */}
        <div className="space-y-3 border-t border-[#222224] pt-4">
          <label className="text-xs font-mono font-semibold text-[#ffffff] flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            SIGNAL ADJUSTMENTS
          </label>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-[#a1a1aa] mb-1">
                <span>CONTRAST</span>
                <span className="text-[#ffffff]">
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

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a1a1aa] mb-1">
                <span>BRIGHTNESS</span>
                <span className="text-[#ffffff]">
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

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a1a1aa] mb-1">
                <span>GAMMA CURVE</span>
                <span className="text-[#ffffff]">{options.gamma.toFixed(2)}γ</span>
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

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a1a1aa] mb-1">
                <span>COLUMNS (DENSITY)</span>
                <span className="text-[#ffffff] font-semibold">
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
          </div>
        </div>

        {/* Section 5: Hardware Acceleration Tier */}
        <div className="space-y-3 border-t border-[#222224] pt-4">
          <fieldset>
            <legend className="text-xs font-mono font-semibold text-[#ffffff] flex items-center justify-between mb-2 w-full">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                <span>HARDWARE ACCELERATION TIER</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#a1a1aa] border border-[#222224]">
                CASCADE: T1→T2→T3
              </span>
            </legend>
            <div className="space-y-2 text-xs font-mono">
              {/* Tier 1: WebGPU Compute Pipeline */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[4px] cursor-pointer border transition-all ${
                  activeTier === "tier1_webgpu"
                    ? "bg-[#141416] border-[#ffffff]/40 text-[#ffffff] shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                    : "bg-[#0a0a0c] border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#333336]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value="tier1_webgpu"
                    checked={activeTier === "tier1_webgpu"}
                    onChange={() => onTierChange("tier1_webgpu")}
                    className="w-4 h-4 mt-0.5 accent-[#ffffff]"
                  />
                  <div>
                    <div className="font-semibold text-[#ffffff]">Tier 1: WebGPU Compute Pipeline</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Active Device / Metal / D3D12
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier1_webgpu"
                      ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                      : "bg-[#141416] text-[#a1a1aa] border-[#222224]"
                  }`}
                >
                  {activeTier === "tier1_webgpu" ? "ACTIVE" : "READY"}
                </span>
              </label>

              {/* Tier 2: WebGL2 Fragment Shader */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[4px] cursor-pointer border transition-all ${
                  activeTier === "tier2_webgl"
                    ? "bg-[#141416] border-[#ffffff]/40 text-[#ffffff] shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                    : "bg-[#0a0a0c] border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#333336]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tier"
                    value="tier2_webgl"
                    checked={activeTier === "tier2_webgl"}
                    onChange={() => onTierChange("tier2_webgl")}
                    className="w-4 h-4 mt-0.5 accent-[#ffffff]"
                  />
                  <div>
                    <div className="font-semibold text-[#ffffff]">Tier 2: WebGL2 Fragment Shader</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Active GL Core
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier2_webgl"
                      ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                      : "bg-[#141416] text-[#a1a1aa] border-[#222224]"
                  }`}
                >
                  {activeTier === "tier2_webgl" ? "ACTIVE" : "READY"}
                </span>
              </label>

              {/* Tier 3: Canvas2D CPU Fallback */}
              <label
                className={`flex items-start justify-between gap-3 min-h-[48px] p-2.5 rounded-[4px] cursor-pointer border transition-all ${
                  activeTier === "tier3_canvas2d"
                    ? "bg-[#141416] border-[#ffffff]/40 text-[#ffffff] shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                    : "bg-[#0a0a0c] border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#333336]"
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
                    <div className="font-semibold text-[#ffffff]">Tier 3: Canvas2D CPU Fallback</div>
                    <div className="text-[10px] text-[#71717a] font-mono mt-0.5">
                      Multi-threaded worker
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border self-start ${
                    activeTier === "tier3_canvas2d"
                      ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                      : "bg-[#141416] text-[#a1a1aa] border-[#222224]"
                  }`}
                >
                  {activeTier === "tier3_canvas2d" ? "ACTIVE" : "READY"}
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Section 6: Action Exports */}
        <div className="space-y-3 border-t border-[#222224] pt-4">
          <label className="text-xs font-mono font-semibold text-[#ffffff]">
            ACTIONS & EXPORTS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={onCopyAscii}
              aria-label={isCopied ? "ASCII text copied to clipboard" : "Copy ASCII text to clipboard"}
              className="min-h-[44px] py-2 px-3 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
                  <span className="font-semibold">COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                  <span>COPY TEXT</span>
                </>
              )}
            </button>
            <button
              onClick={onExportTxt}
              aria-label="Export ASCII art as plain text file"
              className="min-h-[44px] py-2 px-3 bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
              <span>.TXT FILE</span>
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {onToggleRecordVideo && (
              <button
                onClick={onToggleRecordVideo}
                aria-label={isRecordingVideo ? "Stop recording and download video" : "Record and export ASCII video"}
                className={`w-full min-h-[44px] py-2.5 px-3 rounded-[4px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isRecordingVideo
                    ? "bg-[#ef4444] hover:bg-[#dc2626] text-white animate-pulse"
                    : activeMode === "video"
                    ? "bg-[#ffffff] hover:bg-[#e4e4e7] text-[#000000]"
                    : "bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff]"
                }`}
              >
                {isRecordingVideo ? (
                  <>
                    <VideoOff className="w-4 h-4 text-white" aria-hidden="true" />
                    <span>STOP & DOWNLOAD ({recordingProgressSec}s)</span>
                  </>
                ) : (
                  <>
                    <Video className={`w-4 h-4 ${activeMode === "video" ? "text-black" : "text-[#ffffff]"}`} aria-hidden="true" />
                    <span>RECORD & EXPORT VIDEO</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={onExportPng}
              aria-label="Export rendered canvas image as PNG"
              className={`w-full min-h-[44px] py-2.5 px-3 rounded-[4px] text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeMode === "video"
                  ? "bg-[#141416] hover:bg-[#1c1c1e] text-[#ffffff] border border-[#222224] hover:border-[#ffffff]"
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

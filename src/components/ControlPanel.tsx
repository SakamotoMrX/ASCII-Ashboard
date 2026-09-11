import React from "react";
import {
  AsciiRenderOptions,
  CharsetPreset,
  ColorMode,
  Procedural3DParams,
  ProceduralScene,
  RenderTier,
  RenderMode
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
  Square
} from "lucide-react";

interface ControlPanelProps {
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
  activeMode: RenderMode | "settings";
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
  activeMode
}) => {
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const scenes: { id: ProceduralScene; label: string }[] = [
    { id: "donut", label: "Rotating Torus (Donut)" },
    { id: "sphere", label: "Lambertian Sphere" },
    { id: "cube", label: "Wireframe / Solid Cube" },
    { id: "planet", label: "Orbiting Planet & Rings" },
    { id: "blackhole", label: "Gravitational Lensing Black Hole" }
  ];

  const charsets: { id: CharsetPreset; label: string }[] = [
    { id: "standard", label: "Standard ( .:-=+*#%@ )" },
    { id: "extended", label: "Extended 70-Glyph Ramp" },
    { id: "block", label: "Unicode Block ( ░▒▓█ )" },
    { id: "binary", label: "Binary Digital ( 01 )" },
    { id: "matrix", label: "Matrix Katakana Stream" },
    { id: "custom", label: "Custom Glyph Ramp" }
  ];

  const colorModes: { id: ColorMode; label: string }[] = [
    { id: "matrix_green", label: "Phosphor Terminal Green" },
    { id: "amber", label: "CRT Amber Phosphor" },
    { id: "cyberpunk_neon", label: "Cyberpunk Neon Glow" },
    { id: "monochrome", label: "Cold Chrome Monochrome" },
    { id: "truecolor", label: "TrueColor RGB (24-bit)" },
    { id: "rgb_ansi", label: "ANSI 16-Color Palette" }
  ];

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 bg-[#12121a] border-b lg:border-b-0 lg:border-r border-[#262638] flex flex-col max-w-full overflow-y-auto overflow-x-hidden select-none">
      <div className="p-4 space-y-5">
        {/* Section 1: Mode Specific Controls */}
        {activeMode === "procedural_3d" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="scene-select" className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
                <RotateCw className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
                Procedural 3D Scene
              </label>
            </div>
            <select
              id="scene-select"
              aria-label="Select Procedural 3D Scene"
              value={proceduralParams.scene}
              onChange={(e) => onProceduralParamsChange({ scene: e.target.value as ProceduralScene })}
              className="w-full min-h-[44px] bg-[#0a0a0f] border border-[#262638] text-xs font-mono text-[#f0f0f5] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#00ff88]"
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label htmlFor="speed-x" className="text-[11px] text-[#a8abbf] font-mono flex justify-between pb-1">
                  <span>Speed X</span>
                  <span className="text-[#f0f0f5]">{proceduralParams.rotation_speed_x.toFixed(1)}x</span>
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
                    onChange={(e) => onProceduralParamsChange({ rotation_speed_x: parseFloat(e.target.value) })}
                    className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="speed-y" className="text-[11px] text-[#a8abbf] font-mono flex justify-between pb-1">
                  <span>Speed Y</span>
                  <span className="text-[#f0f0f5]">{proceduralParams.rotation_speed_y.toFixed(1)}x</span>
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
                    onChange={(e) => onProceduralParamsChange({ rotation_speed_y: parseFloat(e.target.value) })}
                    className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMode === "image" && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
              <Upload className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
              Image Source Preflight
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
              className="w-full min-h-[44px] py-2.5 px-3 bg-[#1a1a26] hover:bg-[#262638] text-[#f0f0f5] border border-[#262638] rounded-[4px] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
              <span>Select Source Image</span>
            </button>
            <p className="text-[11px] text-[#a8abbf] font-mono">
              High-resolution payloads automatically clamped to 2048x2048 max texture ceiling.
            </p>
          </div>
        )}

        {activeMode === "video" && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
              <Upload className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
              Video Ingestion
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
              className="w-full min-h-[44px] py-2.5 px-3 bg-[#1a1a26] hover:bg-[#262638] text-[#f0f0f5] border border-[#262638] rounded-[4px] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
              <span>Select Video File</span>
            </button>
          </div>
        )}

        {activeMode === "camera_stream" && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
              <Camera className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
              Live Camera Stream
            </label>
            {!isStreamingCamera ? (
              <button
                onClick={onStartCamera}
                aria-label="Start live camera stream"
                className="w-full min-h-[44px] py-2.5 px-3 bg-[#00ff88]/15 hover:bg-[#00ff88]/25 text-[#00ff88] border border-[#00ff88]/40 rounded-[4px] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
                <span>Start Camera Stream</span>
              </button>
            ) : (
              <button
                onClick={onStopCamera}
                aria-label="Stop live camera stream"
                className="w-full min-h-[44px] py-2.5 px-3 bg-[#ff4d79]/15 hover:bg-[#ff4d79]/25 text-[#ff4d79] border border-[#ff4d79]/40 rounded-[4px] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Square className="w-4 h-4 text-[#ff4d79]" aria-hidden="true" />
                <span>Stop Camera Stream</span>
              </button>
            )}
          </div>
        )}

        {activeMode === "settings" && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
              Sandbox Security Architecture
            </label>
            <div className="bg-[#0a0a0f] p-3 rounded-[4px] border border-[#262638] space-y-2 text-xs font-mono text-[#a8abbf]">
              <div className="flex justify-between min-h-[28px] items-center">
                <span>IPC Ceiling:</span>
                <span className="text-[#f0f0f5] font-semibold">32 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Memory Threshold:</span>
                <span className="text-[#f0f0f5] font-semibold">4096 MB</span>
              </div>
              <div className="flex justify-between min-h-[28px] items-center">
                <span>Tauri ACL:</span>
                <span className="text-[#00ff88] font-semibold">Isolated</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Character Ramp */}
        <div className="space-y-3 border-t border-[#262638] pt-4">
          <label htmlFor="charset-preset" className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
            Character Ramp Preset
          </label>
          <select
            id="charset-preset"
            aria-label="Character Ramp Preset"
            value={options.charset.preset}
            onChange={(e) =>
              onOptionsChange({
                charset: { ...options.charset, preset: e.target.value as CharsetPreset }
              })
            }
            className="w-full min-h-[44px] bg-[#0a0a0f] border border-[#262638] text-xs font-mono text-[#f0f0f5] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#00ff88]"
          >
            {charsets.map((c) => (
              <option key={c.id} value={c.id}>
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
                  charset: { ...options.charset, custom_glyphs: e.target.value }
                })
              }
              className="w-full min-h-[44px] bg-[#0a0a0f] border border-[#262638] text-xs font-mono text-[#00ff88] rounded-[4px] px-3 py-2.5 mt-1 focus:outline-none focus:border-[#00ff88]"
            />
          )}

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs text-[#a8abbf] hover:text-[#f0f0f5] font-mono px-1">
            <span>Invert Luminance</span>
            <input
              type="checkbox"
              aria-label="Invert Luminance"
              checked={options.charset.invert}
              onChange={(e) =>
                onOptionsChange({
                  charset: { ...options.charset, invert: e.target.checked }
                })
              }
              className="w-5 h-5 accent-[#00ff88] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 3: Color Matrix Output */}
        <div className="space-y-3 border-t border-[#262638] pt-4">
          <label htmlFor="color-mode" className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
            <Palette className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
            Color Matrix Output
          </label>
          <select
            id="color-mode"
            aria-label="Select Color Matrix Output"
            value={options.color_mode}
            onChange={(e) => onOptionsChange({ color_mode: e.target.value as ColorMode })}
            className="w-full min-h-[44px] bg-[#0a0a0f] border border-[#262638] text-xs font-mono text-[#f0f0f5] rounded-[4px] px-3 py-2.5 focus:outline-none focus:border-[#00ff88]"
          >
            {colorModes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          <label className="flex items-center justify-between min-h-[44px] cursor-pointer text-xs text-[#a8abbf] hover:text-[#f0f0f5] font-mono px-1">
            <span>CRT Scanlines</span>
            <input
              type="checkbox"
              aria-label="Enable CRT Scanlines Effect"
              checked={options.enable_scanlines}
              onChange={(e) => onOptionsChange({ enable_scanlines: e.target.checked })}
              className="w-5 h-5 accent-[#00ff88] cursor-pointer"
            />
          </label>
        </div>

        {/* Section 4: Image Processing Adjustments */}
        <div className="space-y-3 border-t border-[#262638] pt-4">
          <label className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono">
            <Sliders className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
            Signal Adjustments
          </label>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-mono text-[#a8abbf] mb-1">
                <span>Contrast Adjust</span>
                <span className="text-[#f0f0f5]">{options.contrast > 0 ? `+${options.contrast}` : options.contrast}%</span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Contrast Adjust"
                  min="-100"
                  max="100"
                  value={options.contrast}
                  onChange={(e) => onOptionsChange({ contrast: parseInt(e.target.value) })}
                  className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a8abbf] mb-1">
                <span>Brightness Adjust</span>
                <span className="text-[#f0f0f5]">{options.brightness > 0 ? `+${options.brightness}` : options.brightness}%</span>
              </div>
              <div className="min-h-[44px] flex items-center w-full">
                <input
                  type="range"
                  aria-label="Brightness Adjust"
                  min="-100"
                  max="100"
                  value={options.brightness}
                  onChange={(e) => onOptionsChange({ brightness: parseInt(e.target.value) })}
                  className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a8abbf] mb-1">
                <span>Gamma Correction</span>
                <span className="text-[#f0f0f5]">{options.gamma.toFixed(2)}γ</span>
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
                  className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-[#a8abbf] mb-1">
                <span>Grid Density (Cols)</span>
                <span className="text-[#00ff88] font-bold">{options.max_output_columns}</span>
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
                  className="w-full accent-[#00ff88] h-11 bg-transparent cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Hardware Acceleration Tier */}
        <div className="space-y-2 border-t border-[#262638] pt-4">
          <fieldset>
            <legend className="text-xs font-semibold text-[#f0f0f5] flex items-center gap-1.5 font-mono mb-2">
              <Cpu className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
              Hardware Acceleration Tier
            </legend>
            <div className="space-y-1 font-mono text-xs">
              <label className="flex items-center gap-3 min-h-[44px] px-2 rounded-[4px] text-[#f0f0f5] cursor-pointer hover:bg-[#1a1a26] hover:text-[#00ff88] transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="tier1_webgpu"
                  checked={activeTier === "tier1_webgpu"}
                  onChange={() => onTierChange("tier1_webgpu")}
                  className="w-4 h-4 accent-[#00ff88]"
                />
                <span>Tier 1: WebGPU Compute Atlas</span>
              </label>
              <label className="flex items-center gap-3 min-h-[44px] px-2 rounded-[4px] text-[#f0f0f5] cursor-pointer hover:bg-[#1a1a26] hover:text-[#00ff88] transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="tier2_webgl"
                  checked={activeTier === "tier2_webgl"}
                  onChange={() => onTierChange("tier2_webgl")}
                  className="w-4 h-4 accent-[#00ff88]"
                />
                <span>Tier 2: WebGL2 Fragment Shader</span>
              </label>
              <label className="flex items-center gap-3 min-h-[44px] px-2 rounded-[4px] text-[#f0f0f5] cursor-pointer hover:bg-[#1a1a26] hover:text-[#00ff88] transition-colors">
                <input
                  type="radio"
                  name="tier"
                  value="tier3_canvas2d"
                  checked={activeTier === "tier3_canvas2d"}
                  onChange={() => onTierChange("tier3_canvas2d")}
                  className="w-4 h-4 accent-[#00ff88]"
                />
                <span>Tier 3: Canvas 2D CPU Rasterizer</span>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Section 6: Action Exports */}
        <div className="space-y-3 border-t border-[#262638] pt-4">
          <label className="text-xs font-semibold text-[#f0f0f5] font-mono">
            Export & Actions
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={onCopyAscii}
              aria-label={isCopied ? "ASCII text copied to clipboard" : "Copy ASCII text to clipboard"}
              className="min-h-[44px] py-2 px-3 bg-[#1a1a26] hover:bg-[#262638] text-[#f0f0f5] border border-[#262638] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
                  <span className="text-[#00ff88] font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#a8abbf]" aria-hidden="true" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              onClick={onExportTxt}
              aria-label="Export ASCII art as plain text file"
              className="min-h-[44px] py-2 px-3 bg-[#1a1a26] hover:bg-[#262638] text-[#f0f0f5] border border-[#262638] rounded-[4px] text-xs font-mono flex items-center justify-center gap-2 hover:border-[#00ff88]/40 transition-colors"
            >
              <FileText className="w-4 h-4 text-[#a8abbf]" aria-hidden="true" />
              <span>.txt File</span>
            </button>
          </div>
          <button
            onClick={onExportPng}
            aria-label="Export rendered canvas image as PNG"
            className="w-full min-h-[44px] py-2.5 px-3 bg-[#00ff88]/10 hover:bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 rounded-[4px] text-xs font-mono font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
            <span>Export Canvas PNG</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

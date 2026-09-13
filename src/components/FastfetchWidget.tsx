import React, { useState, useEffect } from "react";
import {
  Terminal,
  Cpu,
  Activity,
  HardDrive,
  Volume2,
  VolumeX,
  Radio,
  Minimize2,
  Maximize2,
  X,
  Layers,
} from "lucide-react";
import { RenderTier, AsciiRenderOptions } from "../contracts";

export interface FastfetchTelemetry {
  os: string;
  arch: string;
  gpuAdapter: string;
  gpuTier: RenderTier;
  memoryUsageMb: number;
  renderFps: number;
  renderLatencyMs: number;
  gridDimensions: string;
  activePreset: string;
  activeColorMatrix: string;
  audioStatus: "AUDIO SYNCED" | "MUTED" | "NO AUDIO TRACK";
  audioVolume: number;
  uptimeSec: number;
}

export interface FastfetchWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: FastfetchTelemetry;
  options: AsciiRenderOptions;
  asciiSnippet?: string;
}

export const FastfetchWidget: React.FC<FastfetchWidgetProps> = ({
  isOpen,
  onClose,
  telemetry,
  options,
  asciiSnippet,
}) => {
  const [compactMode, setCompactMode] = useState<boolean>(false);
  const [liveUptime, setLiveUptime] = useState<number>(telemetry.uptimeSec || 42);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveUptime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  // ANSI-styled branding ASCII logo
  const defaultAsciiLogo = `
      /\\
     /  \\      TITAN ASCII STUDIO
    / /\\ \\     -------------------
   / /__\\ \\    ENGINE: WEBGPU CORE
  / /____\\ \\   STATUS: OPERATIONAL
 /_/      \\_\\  SANDBOX: ISOLATED
  `.trim();

  const displayAscii = asciiSnippet || defaultAsciiLogo;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Fastfetch System Telemetry Terminal"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0a0a0c] border-l border-[#1a1a22] shadow-2xl flex flex-col font-mono text-xs select-text animate-in slide-in-from-right duration-200 ease-out"
      style={{
        boxShadow: "0 4px 24px -2px rgba(0, 0, 0, 0.95)",
      }}
    >
      {/* Terminal Titlebar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#121215] border-b border-[#1a1a22] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#38bdf8]" aria-hidden="true" />
          <span className="font-semibold tracking-wider text-[#e2e8f0]">
            FASTFETCH // SYSTEM TELEMETRY
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[#1a1a22] text-[#00ff66] border border-[#00ff66]/30 uppercase font-mono">
            SYS: ONLINE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCompactMode(!compactMode)}
            aria-label={compactMode ? "Expand view" : "Compact view"}
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[2px] text-[#71717a] hover:text-[#e2e8f0] hover:bg-[#1a1a22] transition-colors"
          >
            {compactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close fastfetch telemetry panel"
            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-[2px] text-[#71717a] hover:text-[#ef4444] hover:bg-[#1a1a22] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Body: Dual Pane Layout */}
      <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Pane: ASCII Art Branding Banner */}
        <div className="flex flex-col space-y-3 bg-[#000000] p-4 rounded-[2px] border border-[#1a1a22]">
          <div className="flex items-center justify-between text-[11px] text-[#71717a] pb-1 border-b border-[#1a1a22]">
            <span>ASCII LOGO BANNER</span>
            <span className="text-[#38bdf8]">60 FPS ENGINE</span>
          </div>
          <pre
            aria-label="Terminal ASCII Logo"
            className="text-[#00ff66] font-mono text-[11px] leading-[1.15] overflow-x-auto select-all whitespace-pre py-1"
          >
            {displayAscii}
          </pre>
          <div className="pt-2 border-t border-[#1a1a22] text-[10px] text-[#71717a] space-y-1">
            <div className="flex justify-between">
              <span>Charset Preset:</span>
              <span className="text-[#e2e8f0] uppercase">{options.charset.preset}</span>
            </div>
            <div className="flex justify-between">
              <span>Luminance Palette:</span>
              <span className="text-[#e2e8f0] uppercase">{options.color_mode}</span>
            </div>
            <div className="flex justify-between">
              <span>Cell Geometry:</span>
              <span className="text-[#e2e8f0]">
                {options.cell_width_px}px × {options.cell_height_px}px ({options.font_size_px}pt)
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane: Host & Hardware Telemetry Readouts */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between text-[11px] text-[#71717a] pb-1 border-b border-[#1a1a22]">
            <span>KERNEL TELEMETRY</span>
            <span className="text-[#00ff66]">UPTIME {formatUptime(liveUptime)}</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Host OS & Architecture */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>OS / Host:</span>
              </span>
              <span className="text-[#e2e8f0] font-semibold">
                {telemetry.os} ({telemetry.arch})
              </span>
            </div>

            {/* GPU Adapter */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>GPU Core:</span>
              </span>
              <span className="text-[#e2e8f0] truncate max-w-[180px]" title={telemetry.gpuAdapter}>
                {telemetry.gpuAdapter}
              </span>
            </div>

            {/* Hardware Tier */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Render Tier:</span>
              </span>
              <span className="text-[#00ff66] font-semibold uppercase">
                {telemetry.gpuTier.replace("_", " ")}
              </span>
            </div>

            {/* Render FPS & Latency */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#00ff66]" />
                <span>Frame Rate:</span>
              </span>
              <span className="text-[#e2e8f0]">
                <span className="text-[#00ff66] font-bold">{telemetry.renderFps} FPS</span>{" "}
                <span className="text-[11px] text-[#71717a]">
                  ({telemetry.renderLatencyMs.toFixed(1)}ms)
                </span>
              </span>
            </div>

            {/* Grid Matrix Dimensions */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Matrix Grid:</span>
              </span>
              <span className="text-[#e2e8f0] font-semibold">{telemetry.gridDimensions}</span>
            </div>

            {/* Memory / VRAM footprint */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Frame Memory:</span>
              </span>
              <span className="text-[#e2e8f0]">~{telemetry.memoryUsageMb.toFixed(1)} MB</span>
            </div>

            {/* Audio Engine Subsystem */}
            <div className="flex justify-between items-center py-1 border-b border-[#1a1a22]/60">
              <span className="text-[#71717a] flex items-center gap-1.5">
                {telemetry.audioStatus === "MUTED" ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#ef4444]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-[#00ff66]" />
                )}
                <span>Audio Engine:</span>
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-semibold border ${
                  telemetry.audioStatus === "AUDIO SYNCED"
                    ? "bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66]/30"
                    : telemetry.audioStatus === "MUTED"
                    ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30"
                    : "bg-[#1a1a22] text-[#71717a] border-[#222224]"
                }`}
              >
                {telemetry.audioStatus} {telemetry.audioStatus !== "NO AUDIO TRACK" && `(${Math.round(telemetry.audioVolume * 100)}%)`}
              </span>
            </div>

            {/* Signal Adjustments Summary */}
            <div className="pt-2">
              <div className="text-[11px] text-[#71717a] mb-1.5">ACTIVE SIGNAL FILTERS</div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="bg-[#121215] p-1.5 rounded-[2px] border border-[#1a1a22] flex justify-between">
                  <span className="text-[#71717a]">EXP:</span>
                  <span className="text-[#e2e8f0]">{options.exposure > 0 ? `+${options.exposure}` : options.exposure} EV</span>
                </div>
                <div className="bg-[#121215] p-1.5 rounded-[2px] border border-[#1a1a22] flex justify-between">
                  <span className="text-[#71717a]">SAT:</span>
                  <span className="text-[#e2e8f0]">{options.saturation > 0 ? `+${options.saturation}` : options.saturation}%</span>
                </div>
                <div className="bg-[#121215] p-1.5 rounded-[2px] border border-[#1a1a22] flex justify-between">
                  <span className="text-[#71717a]">SHARP:</span>
                  <span className="text-[#e2e8f0]">{options.sharpness}%</span>
                </div>
                <div className="bg-[#121215] p-1.5 rounded-[2px] border border-[#1a1a22] flex justify-between">
                  <span className="text-[#71717a]">BG REM:</span>
                  <span className={options.bgRemoval?.enabled ? "text-[#00ff66]" : "text-[#71717a]"}>
                    {options.bgRemoval?.enabled ? "ACTIVE" : "OFF"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Footer Strip */}
      <div className="px-4 py-2.5 bg-[#121215] border-t border-[#1a1a22] flex items-center justify-between text-[11px] text-[#71717a]">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#00ff66] animate-pulse" />
          <span>REAL-TIME STREAMING PROTOCOL ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ANSI ESCAPE CODES READY</span>
        </div>
      </div>
    </div>
  );
};

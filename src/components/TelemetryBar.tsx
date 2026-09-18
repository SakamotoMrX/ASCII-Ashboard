import React from "react";
import { Activity, Cpu, HardDrive, Maximize2, ShieldCheck, AlertTriangle } from "lucide-react";
import { RenderTier } from "../contracts";

export interface TelemetryBarProps {
  fps: number;
  frameTimeMs: number;
  columns: number;
  rows: number;
  activeTier: RenderTier;
  droppedFrames: number;
  memoryEstimateMb: number;
  platform?: string;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  fps,
  frameTimeMs,
  columns,
  rows,
  activeTier,
  droppedFrames,
  memoryEstimateMb,
  platform = "MACOS",
}) => {
  return (
    <div
      role="status"
      aria-label="Real-Time System Telemetry Readouts"
      className="w-full bg-[#0a0a0c] border-t border-[#222224] px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-[#a1a1aa] select-none gap-4 max-w-full overflow-x-hidden"
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* FPS & Latency */}
        <div className="flex items-center gap-2 min-h-[32px]">
          <Activity className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
          <span className="text-[#a1a1aa]">FPS:</span>
          <span className="text-[#ffffff] font-semibold">{fps}</span>
          <span className="text-[#a1a1aa] text-[11px]">({frameTimeMs.toFixed(1)}ms)</span>
        </div>

        {/* Resolution Grid */}
        <div className="flex items-center gap-2 border-l border-[#222224] pl-4 min-h-[32px]">
          <Maximize2 className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
          <span className="text-[#a1a1aa]">GRID:</span>
          <span className="text-[#ffffff]">
            {columns}×{rows}
          </span>
        </div>

        {/* Hardware Acceleration Tier */}
        <div className="flex items-center gap-2 border-l border-[#222224] pl-4 min-h-[32px]">
          <Cpu className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
          <span className="text-[#a1a1aa]">TIER:</span>
          <span className="text-[#ffffff] uppercase">{activeTier.replace("_", " ")}</span>
        </div>

        {/* Memory Buffer */}
        <div className="flex items-center gap-2 border-l border-[#222224] pl-4 min-h-[32px]">
          <HardDrive className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
          <span className="text-[#a1a1aa]">MEM:</span>
          <span className="text-[#ffffff]">~{memoryEstimateMb.toFixed(1)}MB</span>
        </div>

        {/* Dropped Frames */}
        <div className="flex items-center gap-2 border-l border-[#222224] pl-4 min-h-[32px]">
          <AlertTriangle
            className={`w-3.5 h-3.5 ${droppedFrames > 0 ? "text-[#ffffff]" : "text-[#a1a1aa]"}`}
            aria-hidden="true"
          />
          <span className="text-[#a1a1aa]">DROPPED:</span>
          <span className={droppedFrames > 0 ? "text-[#ffffff] font-semibold" : "text-[#ffffff]"}>
            {droppedFrames}
          </span>
        </div>
      </div>

      {/* Platform & Sandbox Seal */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase text-[#a1a1aa]">PLATFORM: {platform}</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-[#141416] text-[#ffffff] border border-[#222224] text-[10px]">
          <ShieldCheck className="w-3 h-3 text-[#ffffff]" aria-hidden="true" />
          <span>TAURI SANDBOX SEALED</span>
        </div>
      </div>
    </div>
  );
};

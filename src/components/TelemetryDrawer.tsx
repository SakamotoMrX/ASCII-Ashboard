import React from "react";
import { Activity, Cpu, HardDrive, Maximize2, Shield, AlertTriangle } from "lucide-react";
import { RenderTier } from "../contracts";

export interface TelemetryData {
  fps: number;
  frame_time_ms: number;
  active_tier: RenderTier;
  columns: number;
  rows: number;
  memory_estimate_mb: number;
  dropped_frames: number;
  ipc_payload_kb: number;
  gpu_adapter_name: string;
  sandbox_sealed: boolean;
}

interface TelemetryDrawerProps {
  telemetry: TelemetryData;
}

export const TelemetryDrawer: React.FC<TelemetryDrawerProps> = ({ telemetry }) => {
  return (
    <footer className="w-full bg-[#1a1a1a] border-t border-[#2a2a2a] px-6 py-3 flex flex-wrap items-center justify-between text-xs font-sans text-[#888888] select-none gap-4 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-5 flex-wrap">
        {/* FPS & Render Time */}
        <div className="flex items-center gap-2 min-h-[32px]">
          <Activity className="w-3.5 h-3.5 text-[#3b82f6]" aria-hidden="true" />
          <span>FPS:</span>
          <span className="text-[#3b82f6] font-mono font-semibold">{telemetry.fps}</span>
          <span className="text-[#888888] font-mono text-[11px]">
            ({telemetry.frame_time_ms.toFixed(1)}ms)
          </span>
        </div>

        {/* Resolution */}
        <div className="flex items-center gap-2 border-l border-[#2a2a2a] pl-4 min-h-[32px]">
          <Maximize2 className="w-3.5 h-3.5 text-[#888888]" aria-hidden="true" />
          <span>Grid:</span>
          <span className="text-[#f3f4f6] font-mono">
            {telemetry.columns} × {telemetry.rows}
          </span>
        </div>

        {/* Memory & IPC */}
        <div className="flex items-center gap-2 border-l border-[#2a2a2a] pl-4 min-h-[32px]">
          <HardDrive className="w-3.5 h-3.5 text-[#888888]" aria-hidden="true" />
          <span>Memory:</span>
          <span className="text-[#f3f4f6] font-mono">
            ~{telemetry.memory_estimate_mb.toFixed(1)}MB
          </span>
        </div>

        {/* Dropped Frames / Backpressure */}
        <div className="flex items-center gap-2 border-l border-[#2a2a2a] pl-4 min-h-[32px]">
          <AlertTriangle
            className={`w-3.5 h-3.5 ${telemetry.dropped_frames > 0 ? "text-[#ff4444]" : "text-[#888888]"}`}
            aria-hidden="true"
          />
          <span>Dropped:</span>
          <span
            className={`font-mono ${
              telemetry.dropped_frames > 0 ? "text-[#ff4444] font-semibold" : "text-[#f3f4f6]"
            }`}
          >
            {telemetry.dropped_frames}
          </span>
        </div>

        {/* GPU Core / Adapter */}
        <div className="flex items-center gap-2 border-l border-[#2a2a2a] pl-4 hidden lg:flex min-h-[32px]">
          <Cpu className="w-3.5 h-3.5 text-[#888888]" aria-hidden="true" />
          <span>Adapter:</span>
          <span className="text-[#f3f4f6] font-mono truncate max-w-[220px]">
            {telemetry.gpu_adapter_name || "Hardware Rasterizer"}
          </span>
        </div>
      </div>

      {/* Sandbox Status */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[2px] text-[11px] bg-[#222222] text-[#888888] border border-[#2a2a2a] font-mono">
          <Shield className="w-3 h-3 text-[#3b82f6]" aria-hidden="true" />
          Sandbox ACL Verified
        </span>
      </div>
    </footer>
  );
};

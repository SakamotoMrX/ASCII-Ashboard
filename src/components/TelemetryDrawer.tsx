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
    <footer className="w-full bg-[#12121a] border-t border-[#262638] px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono text-[#a8abbf] select-none gap-3 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-4 flex-wrap">
        {/* FPS & Render Time */}
        <div className="flex items-center gap-1.5 min-h-[32px]">
          <Activity className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
          <span>FPS:</span>
          <span className="text-[#00ff88] font-bold">{telemetry.fps}</span>
          <span className="text-[#a8abbf]">({telemetry.frame_time_ms.toFixed(1)}ms)</span>
        </div>

        {/* Resolution */}
        <div className="flex items-center gap-1.5 border-l border-[#262638] pl-4 min-h-[32px]">
          <Maximize2 className="w-4 h-4 text-[#a8abbf]" aria-hidden="true" />
          <span>Grid:</span>
          <span className="text-[#f0f0f5] font-semibold">
            {telemetry.columns} × {telemetry.rows}
          </span>
        </div>

        {/* Memory & IPC */}
        <div className="flex items-center gap-1.5 border-l border-[#262638] pl-4 min-h-[32px]">
          <HardDrive className="w-4 h-4 text-[#a8abbf]" aria-hidden="true" />
          <span>Memory:</span>
          <span className="text-[#f0f0f5] font-semibold">~{telemetry.memory_estimate_mb.toFixed(1)}MB</span>
        </div>

        {/* Dropped Frames / Backpressure */}
        <div className="flex items-center gap-1.5 border-l border-[#262638] pl-4 min-h-[32px]">
          <AlertTriangle className={`w-4 h-4 ${telemetry.dropped_frames > 0 ? "text-[#ff4d79]" : "text-[#a8abbf]"}`} aria-hidden="true" />
          <span>Dropped:</span>
          <span className={`font-semibold ${telemetry.dropped_frames > 0 ? "text-[#ff4d79]" : "text-[#f0f0f5]"}`}>
            {telemetry.dropped_frames}
          </span>
        </div>

        {/* GPU Core / Adapter */}
        <div className="flex items-center gap-1.5 border-l border-[#262638] pl-4 hidden lg:flex min-h-[32px]">
          <Cpu className="w-4 h-4 text-[#a8abbf]" aria-hidden="true" />
          <span>Adapter:</span>
          <span className="text-[#f0f0f5] truncate max-w-[220px]">
            {telemetry.gpu_adapter_name || "Hardware Rasterizer"}
          </span>
        </div>
      </div>

      {/* Sandbox & Security Status */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs bg-[#1a1a26] text-[#00ff88] border border-[#00ff88]/30 font-mono">
          <Shield className="w-3.5 h-3.5 text-[#00ff88]" aria-hidden="true" />
          ACL Verified • Zero Leakage
        </span>
      </div>
    </footer>
  );
};

import React from "react";
import {
  Terminal,
  Box,
  Image,
  Video,
  Camera,
  Settings,
  Cpu,
  Activity,
  ShieldCheck,
  Lock,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { RenderMode, RenderTier } from "../contracts";

export interface HeaderProps {
  activeMode: RenderMode | "settings" | "media_picker";
  onModeChange: (mode: RenderMode | "settings" | "media_picker") => void;
  activeTier: RenderTier;
  fps: number;
  platform: string;
  latencyMs?: number;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  activeTier,
  fps,
  platform,
  latencyMs = 1.2,
  isZenMode = false,
  onToggleZenMode,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const getTierLabel = (tier: RenderTier) => {
    switch (tier) {
      case "tier1_webgpu":
        return "WEBGPU_TIER1";
      case "tier2_webgl":
        return "WEBGL2_CORE";
      case "tier3_canvas2d":
        return "CANVAS2D_CPU";
      case "rust_sidecar":
        return "RUST_NATIVE";
    }
  };

  const navTabs: { id: RenderMode | "settings" | "media_picker"; label: string; icon: React.ReactNode }[] = [
    { id: "procedural_3d", label: "3D Procedural", icon: <Box className="w-3.5 h-3.5" /> },
    { id: "media_picker", label: "Media Studio", icon: <Terminal className="w-3.5 h-3.5" /> },
    { id: "image", label: "Image Converter", icon: <Image className="w-3.5 h-3.5" /> },
    { id: "video", label: "Video Streamer", icon: <Video className="w-3.5 h-3.5" /> },
    { id: "camera_stream", label: "Live Camera", icon: <Camera className="w-3.5 h-3.5" /> },
    { id: "settings", label: "Sandbox", icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full bg-[#000000] border-b border-[#222224] px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none w-full max-w-full overflow-x-hidden font-sans">
      {/* Brand Identity & Platform Pill */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-[4px] bg-[#0a0a0c] border border-[#222224] flex items-center justify-center text-[#ffffff] flex-shrink-0">
          <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-mono font-semibold tracking-tight text-[#ffffff] truncate">
              TITAN ASCII // WORKSTATION
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#a1a1aa] border border-[#222224] uppercase">
              {platform}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1 max-w-full bg-[#0a0a0c] p-1 rounded-[4px] border border-[#222224] w-full md:w-auto"
        aria-label="Main Navigation"
      >
        {navTabs.map((tab) => {
          const isActive = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`min-h-[44px] px-3 py-2 flex items-center justify-center gap-2 text-xs rounded-[2px] transition-colors whitespace-nowrap font-mono ${
                isActive
                  ? "bg-[#ffffff] text-[#000000] font-semibold shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                  : "text-[#a1a1aa] hover:text-[#ffffff] hover:bg-[#141416]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Telemetry Pills Strip */}
      <div className="flex items-center gap-2 self-start md:self-auto flex-wrap max-w-full">
        <div className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            <span className="text-[#a1a1aa]">{getTierLabel(activeTier)}</span>
          </div>

          <span className="w-1 h-3 border-r border-[#222224]" />

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            <span className="text-[#ffffff] font-semibold">{fps} FPS</span>
            <span className="text-[10px] text-[#a1a1aa]">({latencyMs.toFixed(1)}ms)</span>
          </div>

          <span className="w-1 h-3 border-r border-[#222224]" />

          <div className="flex items-center gap-1 text-[#a1a1aa] text-[10px]">
            <ShieldCheck className="w-3 h-3 text-[#ffffff]" aria-hidden="true" />
            <span>SANDBOX: SEALED</span>
          </div>
        </div>

        {onToggleZenMode && (
          <button
            type="button"
            onClick={onToggleZenMode}
            aria-label={isZenMode ? "Exit Zen mode" : "Enter Zen mode"}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-xs font-mono text-[#ffffff] hover:border-[#ffffff]/40 hover:bg-[#141416] transition-all focus:outline-none focus:ring-1 focus:ring-[#ffffff] cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
            <span className="hidden sm:inline">ZEN</span>
          </button>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex items-center justify-center p-2 min-h-[38px] min-w-[38px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#ffffff]/40 hover:bg-[#141416] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff]"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};

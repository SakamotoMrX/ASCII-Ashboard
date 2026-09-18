import React from "react";
import {
  Terminal,
  Box,
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

  const navTabs: { id: RenderMode | "settings" | "media_picker"; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: "procedural_3d", label: "3D Procedural", shortLabel: "3D Scene", icon: <Box className="w-4 h-4" /> },
    { id: "media_picker", label: "Media Studio", shortLabel: "Media", icon: <Terminal className="w-4 h-4" /> },
    { id: "settings", label: "Sandbox", shortLabel: "Sandbox", icon: <Settings className="w-4 h-4" /> },
  ];

  const isMediaActive =
    activeMode === "media_picker" ||
    activeMode === "image" ||
    activeMode === "video" ||
    activeMode === "camera_stream";

  return (
    <header className="w-full bg-[#000000] border-b border-[#222224] px-3 sm:px-6 pt-3 pb-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 max-w-full overflow-x-hidden font-sans select-none">
      {/* Top Bar on Mobile: Brand on Left, Quick Actions (Zen, Fullscreen) on Right */}
      <div className="flex items-center justify-between gap-3 w-full md:w-auto min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[4px] bg-[#0a0a0c] border border-[#222224] flex items-center justify-center text-[#ffffff] flex-shrink-0">
            <Terminal className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-xs sm:text-sm font-mono font-semibold tracking-tight text-[#ffffff] truncate">
              TITAN ASCII
            </h1>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#a1a1aa] border border-[#222224] uppercase">
              {platform}
            </span>
          </div>
        </div>

        {/* Mobile Quick Action Buttons (Zen & Fullscreen with min 44px touch targets) */}
        <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              aria-label={isZenMode ? "Exit Zen mode" : "Enter Zen mode"}
              className="flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-xs font-mono text-[#ffffff] hover:bg-[#141416] active:bg-[#222224] transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              className="flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] active:bg-[#222224] transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs (3-column grid on mobile with 44px min-height, inline on desktop) */}
      <nav
        className="grid grid-cols-3 md:flex items-center gap-1.5 w-full md:w-auto bg-[#0a0a0c] p-1 rounded-[4px] border border-[#222224]"
        aria-label="Main Navigation"
      >
        {navTabs.map((tab) => {
          const isActive =
            tab.id === "media_picker" ? isMediaActive : activeMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onModeChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`min-h-[44px] px-2 sm:px-3.5 py-2 flex items-center justify-center gap-2 text-xs rounded-[2px] transition-colors whitespace-nowrap font-mono cursor-pointer ${
                isActive
                  ? "bg-[#ffffff] text-[#000000] font-semibold shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                  : "text-[#a1a1aa] hover:text-[#ffffff] hover:bg-[#141416] active:bg-[#222224]"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Telemetry Strip & Actions (Hidden on mobile to eliminate clutter) */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 min-h-[40px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-xs font-mono">
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
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] min-w-[40px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-xs font-mono text-[#ffffff] hover:border-[#ffffff]/40 hover:bg-[#141416] transition-all focus:outline-none focus:ring-1 focus:ring-[#ffffff] cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
            <span>ZEN</span>
          </button>
        )}

        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex items-center justify-center p-2 min-h-[40px] min-w-[40px] rounded-[4px] bg-[#0a0a0c] border border-[#222224] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#ffffff]/40 hover:bg-[#141416] transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff]"
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

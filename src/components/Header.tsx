import React from "react";
import { ShieldCheck, Cpu, Sparkles, Image, Video, Box, Camera, Settings } from "lucide-react";
import { RenderMode, RenderTier } from "../contracts";

interface HeaderProps {
  activeMode: RenderMode | "settings";
  onModeChange: (mode: RenderMode | "settings") => void;
  activeTier: RenderTier;
  fps: number;
  platform: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  activeTier,
  fps,
  platform
}) => {
  const getTierLabel = (tier: RenderTier) => {
    switch (tier) {
      case "tier1_webgpu":
        return "WebGPU 60FPS";
      case "tier2_webgl":
        return "WebGL2 Active";
      case "tier3_canvas2d":
        return "Canvas2D CPU";
      case "rust_sidecar":
        return "Rust Core";
    }
  };

  const navTabs: { id: RenderMode | "settings"; label: string; icon: React.ReactNode }[] = [
    { id: "procedural_3d", label: "3D Procedural", icon: <Box className="w-3.5 h-3.5" /> },
    { id: "image", label: "Image Converter", icon: <Image className="w-3.5 h-3.5" /> },
    { id: "video", label: "Video Streamer", icon: <Video className="w-3.5 h-3.5" /> },
    { id: "camera_stream", label: "Live Camera", icon: <Camera className="w-3.5 h-3.5" /> },
    { id: "settings", label: "Sandbox & Engines", icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full bg-[#12121a] border-b border-[#262638] px-4 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2 select-none max-w-full overflow-x-hidden flex-wrap">
      {/* Brand Identity & Sandbox Authority */}
      <div className="flex items-center gap-2 flex-wrap max-w-full min-w-0">
        <div className="w-8 h-8 rounded-[4px] bg-[#1a1a26] border border-[#00ff88]/40 flex items-center justify-center text-[#00ff88] shadow-sm flex-shrink-0">
          <Sparkles className="w-4 h-4 text-[#00ff88]" aria-hidden="true" />
        </div>
        <div className="min-w-0 max-w-full">
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <h1 className="text-sm font-semibold tracking-wide text-[#f0f0f5] truncate">
              ASCII Studio Desktop
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-[#1a1a26] text-[#00ff88] border border-[#00ff88]/30 max-w-full truncate">
              <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Sandbox Sealed (Tauri ACL Active)</span>
            </span>
          </div>
          <p className="text-[11px] text-[#a8abbf] hidden sm:block truncate">
            Multiplatform Terminal & GPU ASCII Engine
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="flex items-center gap-1.5 bg-[#0a0a0f] p-1.5 rounded-[4px] border border-[#262638] overflow-x-auto max-w-full flex-nowrap sm:flex-wrap"
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
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-mono rounded-[4px] transition-colors whitespace-nowrap max-w-full ${
                isActive
                  ? "bg-[#1a1a26] text-[#00ff88] border border-[#00ff88]/40 shadow-sm font-medium"
                  : "text-[#a8abbf] hover:text-[#f0f0f5] hover:bg-[#12121a]"
              }`}
            >
              {tab.icon}
              <span className="max-w-full truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Hardware Status Pill */}
      <div className="flex items-center gap-2 self-start lg:self-auto max-w-full flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-[4px] bg-[#1a1a26] border border-[#262638] text-xs font-mono max-w-full flex-wrap">
          <Cpu className="w-3.5 h-3.5 text-[#00ff88] flex-shrink-0" aria-hidden="true" />
          <span className="text-[#f0f0f5] truncate">{getTierLabel(activeTier)}</span>
          <span className="text-[#00ff88] font-bold">{fps} FPS</span>
          <span className="text-[11px] text-[#a8abbf] border-l border-[#262638] pl-2 uppercase truncate">
            {platform}
          </span>
        </div>
      </div>
    </header>
  );
};

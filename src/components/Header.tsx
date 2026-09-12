import React from "react";
import { Sparkles, Box, Image, Video, Camera, Settings, Cpu } from "lucide-react";
import { RenderMode, RenderTier } from "../contracts";

interface HeaderProps {
  activeMode: RenderMode | "settings" | "media_picker";
  onModeChange: (mode: RenderMode | "settings" | "media_picker") => void;
  activeTier: RenderTier;
  fps: number;
  platform: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  activeTier,
  fps,
  platform,
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

  const navTabs: { id: RenderMode | "settings" | "media_picker"; label: string; icon: React.ReactNode }[] = [
    { id: "procedural_3d", label: "3D Procedural", icon: <Box className="w-3.5 h-3.5" /> },
    { id: "media_picker", label: "Media Studio", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "image", label: "Image Converter", icon: <Image className="w-3.5 h-3.5" /> },
    { id: "video", label: "Video Streamer", icon: <Video className="w-3.5 h-3.5" /> },
    { id: "camera_stream", label: "Live Camera", icon: <Camera className="w-3.5 h-3.5" /> },
    { id: "settings", label: "Sandbox & Engines", icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full bg-[#1a1a1a] border-b border-[#2a2a2a] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none w-full max-w-full overflow-x-hidden font-sans">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-[4px] bg-[#222222] border border-[#2a2a2a] flex items-center justify-center text-[#3b82f6] flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-semibold tracking-tight text-[#f3f4f6] truncate">
              ASCII Studio Desktop
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#222222] text-[#a1a1aa] border border-[#2a2a2a]">
              ACL Sealed
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        className="flex flex-wrap items-center gap-1 bg-[#121212] p-1 rounded-[4px] border border-[#2a2a2a] overflow-x-auto w-full max-w-full"
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
              className={`min-h-[44px] px-3 py-2.5 flex items-center justify-center gap-2 text-xs rounded-[4px] transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[#222222] text-[#60a5fa] font-semibold"
                  : "text-[#888888] hover:text-[#f3f4f6] hover:bg-[#1a1a1a]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Hardware Status */}
      <div className="flex items-center gap-2 self-start md:self-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-[4px] bg-[#121212] border border-[#2a2a2a] text-xs font-mono">
          <Cpu className="w-3.5 h-3.5 text-[#3b82f6] flex-shrink-0" aria-hidden="true" />
          <span className="text-[#f3f4f6]">{getTierLabel(activeTier)}</span>
          <span className="text-[#3b82f6] font-semibold">{fps} FPS</span>
          <span className="text-[10px] text-[#888888] border-l border-[#2a2a2a] pl-2 uppercase">
            {platform}
          </span>
        </div>
      </div>
    </header>
  );
};

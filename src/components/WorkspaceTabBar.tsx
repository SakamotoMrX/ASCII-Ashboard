import React from "react";
import { Plus, X, Layers, Box, Film, Image as ImageIcon, Camera, Terminal, Settings } from "lucide-react";
import { RenderMode } from "../contracts";

export interface WorkspaceSession {
  id: string;
  title: string;
  mode: RenderMode | "settings" | "media_picker";
  badge?: string;
  status?: "idle" | "active" | "rendering" | "streaming";
}

export interface WorkspaceTabBarProps {
  workspaces: WorkspaceSession[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onCloseWorkspace: (id: string) => void;
  onNewWorkspace: () => void;
  className?: string;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCloseWorkspace,
  onNewWorkspace,
  className = "",
}) => {
  const getModeIcon = (mode: RenderMode | "settings" | "media_picker", isActive: boolean) => {
    const iconClass = `w-3 h-3 flex-shrink-0 ${isActive ? "text-[#ffffff]" : "text-[#a1a1aa] group-hover:text-[#ffffff]"}`;
    switch (mode) {
      case "procedural_3d":
        return <Box className={iconClass} aria-hidden="true" />;
      case "video":
        return <Film className={iconClass} aria-hidden="true" />;
      case "image":
        return <ImageIcon className={iconClass} aria-hidden="true" />;
      case "camera_stream":
        return <Camera className={iconClass} aria-hidden="true" />;
      case "media_picker":
        return <Terminal className={iconClass} aria-hidden="true" />;
      case "settings":
        return <Settings className={iconClass} aria-hidden="true" />;
      default:
        return <Layers className={iconClass} aria-hidden="true" />;
    }
  };

  return (
    <div
      className={`w-full max-w-full bg-[#000000] border-b border-[#222224] px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs font-mono select-none overflow-x-auto scrollbar-none flex-nowrap ${className}`}
      role="tablist"
      aria-label="Workspace Sessions"
    >
      {/* Workspaces Scrollable List */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full flex-nowrap">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const status = ws.status || (isActive ? "active" : "idle");

          return (
            <div
              key={ws.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectWorkspace(ws.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectWorkspace(ws.id);
                }
              }}
              className={`group flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-[2px] cursor-pointer transition-colors duration-150 border whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-[#ffffff] ${
                isActive
                  ? "bg-[#141416] text-[#ffffff] border-[#ffffff] font-semibold"
                  : "bg-[#0a0a0c] text-[#a1a1aa] border-[#222224] hover:text-[#ffffff] hover:border-[#ffffff]/50 hover:bg-[#141416]"
              }`}
            >
              {/* Workspace Icon */}
              <span className="flex-shrink-0">
                {getModeIcon(ws.mode, isActive)}
              </span>

              {/* Workspace Title */}
              <span className="tracking-tight text-[11px] max-w-[120px] sm:max-w-none truncate">{ws.title}</span>

              {/* Active / Status Sticker */}
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-[1px] border tracking-wider uppercase font-mono ${
                  isActive
                    ? "bg-[#ffffff] text-[#000000] border-[#ffffff] font-bold"
                    : "bg-[#141416] text-[#a1a1aa] border-[#222224]"
                }`}
              >
                {ws.badge || status}
              </span>

              {/* Close Workspace Button (Visible when > 1 workspace) */}
              {workspaces.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWorkspace(ws.id);
                  }}
                  aria-label={`Close workspace ${ws.title}`}
                  className="text-[#a1a1aa] hover:text-[#ffffff] hover:bg-[#222224] rounded-[2px] p-2 ml-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#ffffff] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Workspace Button */}
        <button
          type="button"
          onClick={onNewWorkspace}
          aria-label="Create new workspace"
          className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-[2px] border border-dashed border-[#222224] bg-[#0a0a0c] text-[#a1a1aa] hover:text-[#ffffff] hover:border-[#ffffff] hover:bg-[#141416] transition-colors duration-150 text-[11px] font-mono whitespace-nowrap cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff]"
        >
          <Plus className="w-3 h-3 text-[#a1a1aa]" aria-hidden="true" />
          <span>[ ＋ New Workspace ]</span>
        </button>
      </div>

      {/* Right telemetry/session counter pill */}
      <div className="hidden lg:flex items-center gap-2 text-[10px] text-[#a1a1aa] font-mono flex-shrink-0">
        <span>SESSIONS: {workspaces.length} ACTIVE</span>
        <span className="w-1 h-3 border-r border-[#222224]" />
        <span>BUFFER: ISOLATED</span>
      </div>
    </div>
  );
};

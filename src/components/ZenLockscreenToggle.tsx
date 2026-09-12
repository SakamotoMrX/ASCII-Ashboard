import React, { useEffect, useCallback } from "react";
import { Lock, Unlock, Maximize2, Minimize2 } from "lucide-react";

export interface ZenLockscreenToggleProps {
  isZenMode: boolean;
  onToggleZenMode: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  className?: string;
}

export const ZenLockscreenToggle: React.FC<ZenLockscreenToggleProps> = ({
  isZenMode,
  onToggleZenMode,
  isFullscreen = false,
  onToggleFullscreen,
  className = "",
}) => {
  // Global shortcut listeners for Escape and F11
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZenMode) {
          e.preventDefault();
          onToggleZenMode();
        }
      } else if (e.key === "F11") {
        e.preventDefault();
        if (onToggleFullscreen) {
          onToggleFullscreen();
        } else {
          onToggleZenMode();
        }
      }
    },
    [isZenMode, onToggleZenMode, onToggleFullscreen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <aside
      className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 sm:gap-2 select-none font-mono text-xs max-w-[calc(100vw-24px)] ${className}`}
      role="region"
      aria-label="Zen mode and display controls"
    >
      {/* Fullscreen Toggle Button */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          aria-pressed={isFullscreen}
          className="bg-[#0a0a0c] border border-[#222224] text-[#ffffff] hover:border-[#ffffff]/60 hover:bg-[#141416] px-2.5 sm:px-3.5 py-2 min-h-[44px] rounded-[2px] font-mono text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff]"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">[ ⛶ WINDOW ]</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">[ ⛶ FULLSCREEN ]</span>
            </>
          )}
        </button>
      )}

      {/* Zen / Lockscreen Toggle Button with Orchestrated Motion Moment */}
      <button
        key={isZenMode ? "zen-locked" : "zen-unlocked"}
        type="button"
        onClick={onToggleZenMode}
        aria-label={isZenMode ? "Exit Zen mode" : "Enter Zen mode"}
        aria-pressed={isZenMode}
        className={`zen-motion-moment border px-2.5 sm:px-3.5 py-2 min-h-[44px] rounded-[2px] font-mono text-xs transition-colors duration-150 flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff] ${
          isZenMode
            ? "bg-[#141416] border-[#ffffff] text-[#ffffff] font-semibold"
            : "bg-[#0a0a0c] border-[#222224] text-[#ffffff] hover:border-[#ffffff]/60 hover:bg-[#141416]"
        }`}
      >
        {isZenMode ? (
          <>
            <Unlock className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
            <span>[ 🔓 UNLOCK ]</span>
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
            <span>[ 🔒 ZEN ]</span>
          </>
        )}
      </button>
    </aside>
  );
};

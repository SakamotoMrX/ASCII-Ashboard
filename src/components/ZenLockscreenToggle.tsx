import React, { useEffect, useCallback } from "react";
import { Unlock } from "lucide-react";

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
  className = "",
}) => {
  // Global shortcut listeners for Escape key to exit Zen
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isZenMode) {
        e.preventDefault();
        onToggleZenMode();
      }
    },
    [isZenMode, onToggleZenMode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isZenMode) {
    return null;
  }

  return (
    <aside
      className={`fixed top-3 right-3 z-50 flex items-center font-mono text-xs ${className}`}
      role="region"
      aria-label="Zen mode controls"
    >
      <button
        type="button"
        onClick={onToggleZenMode}
        aria-label="Exit Zen mode"
        className="zen-motion-moment bg-[#141416] border border-[#ffffff] text-[#ffffff] px-3.5 py-2 min-h-[44px] min-w-[44px] rounded-[2px] font-mono text-xs font-semibold transition-colors duration-150 flex items-center gap-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#ffffff] shadow-lg hover:bg-[#222224]"
      >
        <Unlock className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
        <span>EXIT</span>
      </button>
    </aside>
  );
};

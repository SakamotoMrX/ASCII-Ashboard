import React, { useEffect, useRef, useState, useCallback } from "react";
import { AsciiRenderOptions } from "../contracts";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Download,
  FileText,
  Check,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Code,
  Eye,
} from "lucide-react";

export interface AsciiViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  options: AsciiRenderOptions;
  asciiText: string;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onCopyAscii?: () => void;
  onExportTxt?: () => void;
  onExportPng?: () => void;
  isInitialLoad?: boolean;
}

export const AsciiViewport: React.FC<AsciiViewportProps> = ({
  canvasRef,
  options,
  asciiText,
  isPaused = false,
  onTogglePause,
  onCopyAscii,
  onExportTxt,
  onExportPng,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetZoom = () => setZoom(1.0);

  // Internal copy with visual feedback if no handler provided
  const handleCopy = useCallback(() => {
    if (onCopyAscii) {
      onCopyAscii();
    } else if (asciiText) {
      navigator.clipboard.writeText(asciiText);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  }, [onCopyAscii, asciiText]);

  // Handle wheel zoom with Ctrl / Meta key
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => Math.max(0.4, Math.min(3.0, z - e.deltaY * 0.002)));
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const getColorClass = () => {
    switch (options.color_mode) {
      case "matrix_green":
        return "text-[#00ff88]";
      case "amber":
        return "text-[#ffb700]";
      case "cyberpunk_neon":
        return "text-[#ff3366]";
      case "monochrome":
      default:
        return "text-[#ffffff]";
    }
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="High-Contrast ASCII Terminal Viewport"
      className={`relative flex-1 bg-[#000000] flex items-center justify-center overflow-hidden min-h-[360px] h-full w-full max-w-full font-sans select-none ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Background Micro Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      {/* Top Floating Viewport Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#0a0a0c] border border-[#222224] rounded-[4px] p-1.5 text-xs font-mono max-w-[calc(100%-24px)] flex-wrap justify-end shadow-xl">
        {/* Play / Pause Toggle */}
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? "Resume stream playback" : "Pause stream playback"}
            title={isPaused ? "Resume (Space)" : "Pause (Space)"}
            className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center hover:bg-[#141416] text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Zoom Controls */}
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out ASCII viewport"
          title="Zoom Out"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <span
          aria-live="polite"
          aria-label={`Current Zoom: ${Math.round(zoom * 100)} percent`}
          className="px-2 text-xs text-[#a1a1aa] min-w-[48px] text-center select-none"
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          aria-label="Zoom in ASCII viewport"
          title="Zoom In"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          onClick={handleResetZoom}
          aria-label="Reset zoom level to 100%"
          title="Reset Zoom"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <span className="w-[1px] h-4 bg-[#222224] mx-1 hidden sm:block" />

        {/* Raw ASCII vs Canvas Toggle */}
        <button
          onClick={() => setShowRawText(!showRawText)}
          aria-label={showRawText ? "Switch to Canvas view" : "Switch to Raw ASCII view"}
          title={showRawText ? "Canvas" : "Raw ASCII"}
          className={`min-h-[36px] px-2.5 rounded-[2px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            showRawText
              ? "bg-[#ffffff] text-[#000000] font-semibold"
              : "hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff]"
          }`}
        >
          {showRawText ? (
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Code className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{showRawText ? "CANVAS" : "RAW"}</span>
        </button>

        {/* Quick Actions: Copy */}
        <button
          onClick={handleCopy}
          aria-label={isCopied ? "Copied to clipboard" : "Copy ASCII output"}
          title="Copy ASCII Text"
          className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
        >
          {isCopied ? (
            <Check className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        {/* Quick Actions: Export TXT */}
        {onExportTxt && (
          <button
            onClick={onExportTxt}
            aria-label="Export plain text file"
            title="Export .txt"
            className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer hidden sm:flex"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* Quick Actions: Export PNG */}
        {onExportPng && (
          <button
            onClick={onExportPng}
            aria-label="Export canvas PNG"
            title="Export PNG"
            className="min-w-[36px] min-h-[36px] px-2 flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer hidden sm:flex"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? "Exit fullscreen viewport" : "Enter fullscreen viewport"}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#141416] text-[#a1a1aa] hover:text-[#ffffff] rounded-[2px] transition-colors cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Center Canvas Viewport */}
      <div
        className="relative flex items-center justify-center transition-transform duration-75 origin-center max-w-full max-h-full p-6"
        style={{
          transform: `scale(${zoom})`,
          willChange: "transform",
        }}
      >
        {/* Render Canvas (WebGPU / WebGL2 / Canvas2D) */}
        <canvas
          ref={canvasRef as React.RefObject<HTMLCanvasElement>}
          aria-label="Monochrome ASCII Real-Time Visualizer Canvas"
          role="img"
          className={`bg-[#000000] border border-[#222224] max-w-full max-h-[75vh] object-contain rounded-[4px] shadow-2xl ${
            showRawText ? "hidden" : "block"
          }`}
        />

        {/* Raw Monospace Text Overlay */}
        {showRawText && (
          <div className="bg-[#0a0a0c] border border-[#222224] rounded-[4px] p-6 overflow-auto max-h-[75vh] max-w-[90vw] sm:max-w-[80vw] shadow-2xl">
            <pre
              tabIndex={0}
              aria-label="Raw ASCII monospace character matrix"
              className={`ascii-viewport text-xs leading-tight select-all ${getColorClass()}`}
            >
              {asciiText || "INITIALIZING ASCII MATRIX STREAM..."}
            </pre>
          </div>
        )}

        {/* Optional Scanlines Effect */}
        {options.enable_scanlines && !showRawText && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px]"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Paused Overlay Indicator */}
      {isPaused && (
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#141416]/90 border border-[#222224] rounded-[4px] text-xs font-mono text-[#ffffff] shadow-lg">
          <Pause className="w-3.5 h-3.5 fill-current text-[#ffffff]" aria-hidden="true" />
          <span>STREAM PAUSED</span>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import { AsciiRenderOptions } from "../contracts";
import { ZoomIn, ZoomOut, RotateCcw, Code, Eye } from "lucide-react";

interface AsciiCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  options: AsciiRenderOptions;
  asciiText: string;
  isInitialLoad?: boolean;
}

export const AsciiCanvas: React.FC<AsciiCanvasProps> = ({
  canvasRef,
  options,
  asciiText,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleResetZoom = () => setZoom(1.0);

  // Handle wheel zoom
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
      case "truecolor":
      case "rgb_ansi":
        return "text-[#38bdf8]";
      case "monochrome":
      default:
        return "text-[#f3f4f6]";
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-[#121212] flex items-center justify-center overflow-hidden min-h-[350px] h-full w-full max-w-full font-sans"
    >
      {/* Viewport Overlay Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[4px] p-1 text-xs max-w-[calc(100%-24px)] flex-wrap justify-end">
        <button
          onClick={handleZoomOut}
          aria-label="Zoom out viewport"
          title="Zoom Out"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#222222] text-[#888888] hover:text-[#f3f4f6] rounded-[2px] transition-colors"
        >
          <ZoomOut className="w-4 h-4" aria-hidden="true" />
        </button>
        <span
          aria-live="polite"
          aria-label={`Current Zoom: ${Math.round(zoom * 100)} percent`}
          className="px-2 text-xs text-[#888888] min-w-[48px] text-center font-mono select-none"
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          aria-label="Zoom in viewport"
          title="Zoom In"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#222222] text-[#888888] hover:text-[#f3f4f6] rounded-[2px] transition-colors"
        >
          <ZoomIn className="w-4 h-4" aria-hidden="true" />
        </button>
        <button
          onClick={handleResetZoom}
          aria-label="Reset zoom to 100 percent"
          title="Reset Zoom"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-[#222222] text-[#888888] hover:text-[#f3f4f6] rounded-[2px] transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>

        <div className="w-[1px] h-5 bg-[#2a2a2a] mx-1 hidden sm:block" />

        <button
          onClick={() => setShowRawText(!showRawText)}
          aria-label={showRawText ? "Switch to GPU Canvas rendering" : "Switch to Raw Monospace Text rendering"}
          title={showRawText ? "Switch to GPU Canvas" : "Switch to Raw Monospace Text"}
          className={`min-h-[36px] px-2.5 rounded-[2px] flex items-center justify-center gap-1.5 text-xs transition-colors ${
            showRawText
              ? "bg-[#222222] text-[#3b82f6] font-medium"
              : "hover:bg-[#222222] text-[#888888] hover:text-[#f3f4f6]"
          }`}
        >
          {showRawText ? <Eye className="w-3.5 h-3.5" aria-hidden="true" /> : <Code className="w-3.5 h-3.5" aria-hidden="true" />}
          <span>{showRawText ? "Canvas" : "Raw ASCII"}</span>
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
          aria-label="ASCII Art Real-Time Visualizer Canvas"
          role="img"
          className={`bg-[#121212] max-w-full max-h-[75vh] object-contain rounded-[4px] ${
            showRawText ? "hidden" : "block"
          }`}
        />

        {/* Raw Monospace Text Overlay */}
        {showRawText && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[4px] p-6 overflow-auto max-h-[75vh] max-w-[90vw] sm:max-w-[80vw]">
            <pre
              tabIndex={0}
              aria-label="Raw ASCII text content"
              className={`ascii-viewport text-xs leading-tight select-all ${getColorClass()}`}
            >
              {asciiText || "Generating ASCII stream..."}
            </pre>
          </div>
        )}

        {/* Optional Scanlines */}
        {options.enable_scanlines && !showRawText && (
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

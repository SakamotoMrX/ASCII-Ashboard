import React, { useState, useMemo } from "react";
import {
  NodeGraphModel,
  GraphNode,
  GraphEdge,
  RenderMode,
  RenderTier,
} from "../contracts";
import { Layers, X } from "lucide-react";

export interface ConstellationGraphProps {
  model?: NodeGraphModel;
  activeMode?: RenderMode | "settings" | "media_picker";
  activeTier?: RenderTier;
  fps?: number;
  latencyMs?: number;
  columns?: number;
  rows?: number;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export const ConstellationGraph: React.FC<ConstellationGraphProps> = ({
  model,
  activeMode = "procedural_3d",
  activeTier = "tier1_webgpu",
  fps = 60,
  latencyMs = 1.4,
  columns = 100,
  rows = 45,
  onClose,
  isEmbedded = false,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [density, setDensity] = useState<"compact" | "regular" | "expanded">("regular");

  // Generate dynamic pipeline model based on active mode & tier if model is not provided
  const graphData: NodeGraphModel = useMemo(() => {
    if (model) return model;

    const sourceLabel =
      activeMode === "camera_stream"
        ? "Camera Device (AVCapture)"
        : activeMode === "video"
        ? "Video Decoder (rVFC)"
        : activeMode === "image"
        ? "Image Preflight Canvas"
        : "Procedural 3D Math Engine";

    const kernelLabel =
      activeTier === "tier1_webgpu"
        ? "WebGPU Compute Atlas"
        : activeTier === "tier2_webgl"
        ? "WebGL2 Fragment Shader"
        : activeTier === "rust_sidecar"
        ? "Rust Native Sidecar"
        : "Canvas 2D CPU Rasterizer";

    const spacing = density === "compact" ? 110 : density === "expanded" ? 190 : 150;
    const baseY = 130;

    const nodes: GraphNode[] = [
      {
        id: "node-source",
        label: sourceLabel,
        type: "source",
        position: { x: 30, y: baseY },
        status: "active",
        metrics: { fps, resolution: `${columns}×${rows}` },
        activeConnections: ["node-preflight"],
      },
      {
        id: "node-preflight",
        label: "Luminance & Contrast Normalize",
        type: "preflight",
        position: { x: 30 + spacing, y: baseY },
        status: "active",
        metrics: { latencyMs: 0.3 },
        activeConnections: ["node-kernel"],
      },
      {
        id: "node-kernel",
        label: kernelLabel,
        type: "ascii_kernel",
        position: { x: 30 + spacing * 2, y: baseY },
        status: "active",
        metrics: { fps, latencyMs },
        activeConnections: ["node-display", "node-telemetry"],
      },
      {
        id: "node-display",
        label: "ASCII Viewport Renderer",
        type: "display_output",
        position: { x: 30 + spacing * 3, y: baseY - 45 },
        status: "active",
        metrics: { throughput: `${(columns * rows * 60) / 1000}k c/s` },
        activeConnections: [],
      },
      {
        id: "node-telemetry",
        label: "Hardware IPC Telemetry",
        type: "telemetry",
        position: { x: 30 + spacing * 3, y: baseY + 55 },
        status: "active",
        metrics: { latencyMs: 0.1 },
        activeConnections: [],
      },
    ];

    const edges: GraphEdge[] = [
      {
        id: "edge-1",
        sourceNodeId: "node-source",
        targetNodeId: "node-preflight",
        status: "flowing",
        style: "solid",
      },
      {
        id: "edge-2",
        sourceNodeId: "node-preflight",
        targetNodeId: "node-kernel",
        status: "flowing",
        style: "solid",
      },
      {
        id: "edge-3",
        sourceNodeId: "node-kernel",
        targetNodeId: "node-display",
        status: "flowing",
        style: "solid",
      },
      {
        id: "edge-4",
        sourceNodeId: "node-kernel",
        targetNodeId: "node-telemetry",
        status: "active",
        style: "dashed",
      },
    ];

    return {
      nodes,
      edges,
      activePipelineId: `pipeline-${activeMode}-${activeTier}`,
      constellationDensity: density,
    };
  }, [model, activeMode, activeTier, fps, latencyMs, columns, rows, density]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.id === selectedNodeId),
    [graphData.nodes, selectedNodeId]
  );

  return (
    <div
      className={`flex flex-col bg-[#0a0a0c] border border-[#222224] rounded-[4px] overflow-hidden select-none font-sans text-xs ${
        isEmbedded ? "w-full h-full" : "w-full max-w-4xl shadow-2xl"
      }`}
      role="region"
      aria-label="ASCII Pipeline Constellation Graph"
    >
      {/* Workstation Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#000000] border-b border-[#222224]">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
          <span className="font-mono text-xs font-semibold text-[#ffffff] tracking-wider uppercase">
            Constellation Pipeline Graph
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#141416] text-[#a1a1aa] border border-[#27272a]">
            {graphData.activePipelineId}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Density Toggles */}
          <div className="flex items-center rounded-[2px] border border-[#27272a] bg-[#141416] p-0.5">
            {(["compact", "regular", "expanded"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-[1px] transition-colors ${
                  density === d
                    ? "bg-[#ffffff] text-[#000000] font-bold"
                    : "text-[#a1a1aa] hover:text-[#fafafa]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close Pipeline Graph"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#a1a1aa] hover:text-[#ffffff] hover:bg-[#1c1c1e] rounded-[2px] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Visualizer Canvas / SVG */}
      <div className="relative w-full h-[260px] bg-[#050507] overflow-hidden">
        {/* Subtle CAD dot matrix background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
          aria-hidden="true"
        />

        <svg className="w-full h-full absolute inset-0">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#a1a1aa" />
            </marker>
          </defs>

          {/* Render Connection Edges */}
          {graphData.edges.map((edge) => {
            const src = graphData.nodes.find((n) => n.id === edge.sourceNodeId);
            const tgt = graphData.nodes.find((n) => n.id === edge.targetNodeId);
            if (!src || !tgt) return null;

            const isFlowing = edge.status === "flowing";
            const x1 = src.position.x + 85;
            const y1 = src.position.y + 24;
            const x2 = tgt.position.x - 5;
            const y2 = tgt.position.y + 24;

            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isFlowing ? "#ffffff" : "#3f3f46"}
                  strokeWidth={isFlowing ? 1.5 : 1}
                  strokeDasharray={edge.style === "dashed" ? "4 4" : undefined}
                  opacity={isFlowing ? 0.65 : 0.3}
                  markerEnd="url(#arrowhead)"
                />
                {isFlowing && (
                  <circle
                    r="2.5"
                    fill="#ffffff"
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    className=""
                    opacity={0.7}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Render Node Blocks */}
        <div className="absolute inset-0 pointer-events-auto">
          {graphData.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                }}
                className={`absolute w-[120px] p-2 rounded-[2px] border cursor-pointer select-none transition-all ${
                  isSelected
                    ? "bg-[#141416] border-[#ffffff] ring-1 ring-[#ffffff]"
                    : "bg-[#0a0a0c] border-[#27272a] hover:border-[#a1a1aa]"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[9px] font-mono text-[#a1a1aa] uppercase truncate">
                    {node.type}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      node.status === "active"
                        ? "bg-[#ffffff]"
                        : node.status === "processing"
                        ? "bg-[#a1a1aa]"
                        : "bg-[#3f3f46]"
                    }`}
                  />
                </div>
                <div className="text-[11px] font-semibold text-[#ffffff] truncate mb-1">
                  {node.label}
                </div>
                {node.metrics && (
                  <div className="text-[9px] font-mono text-[#a1a1aa] flex justify-between border-t border-[#1c1c1e] pt-1">
                    {node.metrics.fps !== undefined && <span>{node.metrics.fps} FPS</span>}
                    {node.metrics.latencyMs !== undefined && (
                      <span>{node.metrics.latencyMs.toFixed(1)}ms</span>
                    )}
                    {node.metrics.throughput && <span>{node.metrics.throughput}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Inspector Bar */}
      <div className="px-4 py-2 bg-[#000000] border-t border-[#222224] flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
        {selectedNode ? (
          <div className="flex items-center gap-4">
            <span className="text-[#ffffff] font-semibold">{selectedNode.label}</span>
            <span className="text-[#a1a1aa]">TYPE: {selectedNode.type.toUpperCase()}</span>
            <span className="text-[#a1a1aa]">STATUS: {selectedNode.status.toUpperCase()}</span>
          </div>
        ) : (
          <span className="text-[#a1a1aa]">Click a node to inspect hardware telemetry</span>
        )}
        <div className="flex items-center gap-3">
          <span>LATENCY: {latencyMs.toFixed(1)}ms</span>
          <span className="text-[#ffffff] font-semibold">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
};

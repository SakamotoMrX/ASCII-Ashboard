import React from "react";
import { TechnicalSticker, RenderTier } from "../contracts";

export interface TechnicalStickersProps {
  stickers?: TechnicalSticker[];
  activeTier?: RenderTier;
  fps?: number;
  resolution?: { columns: number; rows: number };
  platform?: string;
  sandboxSealed?: boolean;
  className?: string;
  onStickerClick?: (sticker: TechnicalSticker) => void;
}

export const TechnicalStickerItem: React.FC<{
  sticker: TechnicalSticker;
  onClick?: (sticker: TechnicalSticker) => void;
}> = ({ sticker, onClick }) => {
  const baseClasses =
    "inline-flex items-center gap-1.5 select-none font-mono text-[10px] tracking-wider uppercase transition-colors";

  switch (sticker.variant) {
    case "inverted_chip":
      return (
        <span
          onClick={() => onClick?.(sticker)}
          className={`${baseClasses} bg-[#ffffff] text-[#000000] px-2 py-0.5 rounded-[2px] font-bold border border-[#ffffff] shadow-sm ${
            onClick ? "cursor-pointer hover:bg-[#e4e4e7]" : ""
          }`}
          title={`${sticker.label}: ${sticker.value}`}
          role="status"
        >
          <span className="text-[9px] opacity-75">{sticker.label}:</span>
          <span>{sticker.value}</span>
        </span>
      );

    case "wire_badge":
      return (
        <span
          onClick={() => onClick?.(sticker)}
          className={`${baseClasses} bg-transparent text-[#e4e4e7] px-2 py-0.5 rounded-[2px] border border-[#3f3f46] ${
            onClick ? "cursor-pointer hover:border-[#ffffff] hover:text-[#ffffff]" : ""
          }`}
          title={`${sticker.label}: ${sticker.value}`}
          role="status"
        >
          <span className="text-[#a1a1aa]">{sticker.label}</span>
          <span className="text-[#a1a1aa]">/</span>
          <span className="font-semibold text-[#ffffff]">{sticker.value}</span>
        </span>
      );

    case "dot_indicator":
      return (
        <span
          onClick={() => onClick?.(sticker)}
          className={`${baseClasses} bg-[#0a0a0c] text-[#a1a1aa] px-2 py-0.5 rounded-[2px] border border-[#222224] ${
            onClick ? "cursor-pointer hover:border-[#3f3f46]" : ""
          }`}
          title={`${sticker.label}: ${sticker.value}`}
          role="status"
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#ffffff]"
            aria-hidden="true"
          />
          <span className="text-[#a1a1aa]">{sticker.label}</span>
          <span className="font-semibold text-[#ffffff]">{sticker.value}</span>
        </span>
      );

    case "monochrome_pill":
    default:
      return (
        <span
          onClick={() => onClick?.(sticker)}
          className={`${baseClasses} bg-[#000000] text-[#fafafa] px-2.5 py-0.5 rounded-full border border-[#27272a] ${
            onClick ? "cursor-pointer hover:border-[#ffffff]" : ""
          }`}
          title={`${sticker.label}: ${sticker.value}`}
          role="status"
        >
          <span className="text-[#a1a1aa] text-[9px]">{sticker.label}</span>
          <span className="font-medium text-[#ffffff]">{sticker.value}</span>
        </span>
      );
  }
};

export const TechnicalStickers: React.FC<TechnicalStickersProps> = ({
  stickers,
  activeTier,
  fps,
  resolution,
  platform = "web",
  sandboxSealed = true,
  className = "",
  onStickerClick,
}) => {
  // Synthesize default workstation stickers if none provided
  const resolvedStickers: TechnicalSticker[] = stickers || [
    {
      id: "stk-tier",
      category: "tier",
      label: "ACCEL",
      value:
        activeTier === "tier1_webgpu"
          ? "WEBGPU-60"
          : activeTier === "tier2_webgl"
          ? "WEBGL2"
          : activeTier === "rust_sidecar"
          ? "RUST-CORE"
          : "CANVAS2D",
      variant: "inverted_chip",
      pinned: true,
    },
    {
      id: "stk-fps",
      category: "fps",
      label: "SYNC",
      value: `${fps ?? 60} FPS`,
      variant: "dot_indicator",
      pinned: true,
    },
    {
      id: "stk-res",
      category: "resolution",
      label: "GRID",
      value: resolution ? `${resolution.columns}×${resolution.rows}` : "100×45",
      variant: "wire_badge",
      pinned: false,
    },
    {
      id: "stk-sec",
      category: "security",
      label: "ACL",
      value: sandboxSealed ? "SEALED" : "UNRESTRICTED",
      variant: "monochrome_pill",
      pinned: false,
    },
    {
      id: "stk-plat",
      category: "platform",
      label: "HOST",
      value: platform.toUpperCase(),
      variant: "wire_badge",
      pinned: false,
    },
  ];

  return (
    <div
      className={`flex items-center flex-wrap gap-1.5 select-none ${className}`}
      aria-label="Workstation Technical Badges"
    >
      {resolvedStickers.map((sticker) => (
        <TechnicalStickerItem
          key={sticker.id}
          sticker={sticker}
          onClick={onStickerClick}
        />
      ))}
    </div>
  );
};

import { SystemInfo, RenderTier, CharsetPreset, ColorMode } from "../contracts";

export function getFastfetchSystemInfo(params: {
  gpuAdapter?: string;
  gpuTier?: RenderTier;
  memoryUsageMb?: number;
  renderFps?: number;
  gridDimensions?: string;
  activePreset?: CharsetPreset;
  activeColorMatrix?: ColorMode;
  audioStatus?: string;
  uptimeSec?: number;
}): SystemInfo {
  let osName = "macOS (Darwin)";
  let arch = "arm64";

  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) osName = "Windows 11 NT 10.0";
    else if (ua.includes("linux")) osName = "Linux (x86_64)";
    else if (ua.includes("android")) osName = "Android Linux";
    else if (ua.includes("mac")) osName = "macOS 15 Sequoia (Darwin)";
  }

  return {
    os: osName,
    arch,
    gpuAdapter: params.gpuAdapter || "Apple Metal / M-Series GPU",
    gpuTier: params.gpuTier || "tier1_webgpu",
    memoryUsageMb: Math.round(params.memoryUsageMb || 32.4),
    renderFps: Math.round(params.renderFps || 60),
    gridDimensions: params.gridDimensions || "100x45",
    activePreset: params.activePreset || "standard",
    activeColorMatrix: params.activeColorMatrix || "monochrome",
    audioStatus: params.audioStatus || "WebAudio (Active 48kHz)",
    uptimeSec: Math.round(params.uptimeSec || (performance.now() / 1000)),
  };
}

export function formatFastfetchAsciiBanner(info: SystemInfo): string {
  const banner = [
    `       /\\        OS: ${info.os} ${info.arch}`,
    `      /  \\       Host: ASCII Studio Desktop v2.1`,
    `     / /\\ \\      GPU: ${info.gpuAdapter}`,
    `    / /  \\ \\     Tier: ${info.gpuTier.toUpperCase()}`,
    `   / / /\\ \\ \\    Grid: ${info.gridDimensions}`,
    `  / / /  \\ \\ \\   FPS: ${info.renderFps} (Active V-Sync)`,
    ` /_/_/    \\_\\_\\  Memory: ${info.memoryUsageMb} MB`,
    `                 Audio: ${info.audioStatus}`,
  ];
  return banner.join("\n");
}

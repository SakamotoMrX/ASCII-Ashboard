import { SystemInfo, AsciiRenderOptions, RenderTier } from "../contracts";

const bootTimestamp = Date.now();

/**
 * Probes browser & hardware environment to produce a structured SystemInfo telemetry snapshot.
 */
export function getSystemInfo(
  options: AsciiRenderOptions,
  currentFps = 60,
  activeTier: RenderTier = "tier1_webgpu"
): SystemInfo {
  let os = "Desktop / Web";
  let arch = "x86_64";

  if (typeof navigator !== "undefined") {
    const userAgent = navigator.userAgent || "";
    if (/macintosh|mac os x/i.test(userAgent)) {
      os = "macOS";
      arch = /arm|apple/i.test(userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ? "arm64" : "x86_64";
    } else if (/windows|win32/i.test(userAgent)) {
      os = "Windows";
      arch = /win64|x64|wow64/i.test(userAgent) ? "x86_64" : "x86";
    } else if (/android/i.test(userAgent)) {
      os = "Android";
      arch = "arm64";
    } else if (/linux/i.test(userAgent)) {
      os = "Linux";
      arch = "x86_64";
    }
  }

  // Memory estimation
  let memoryMb = 128;
  if (typeof performance !== "undefined" && (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory) {
    const heap = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
    if (heap) {
      memoryMb = Math.round(heap / (1024 * 1024));
    }
  }

  // GPU Adapter detection
  let gpuAdapter = "Unified Memory Graphics";
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (gl) {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        if (ext) {
          gpuAdapter = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || gpuAdapter;
        }
      }
    } catch {
      // Fallback
    }
  }

  const uptimeSec = Math.max(0, Math.floor((Date.now() - bootTimestamp) / 1000));
  const gridDimensions = `${options.max_output_columns}x${options.max_output_rows}`;
  const audioStatus = options.audio.enabled ? (options.audio.muted ? "Muted" : `Active (${Math.round(options.audio.volume * 100)}%)`) : "Disabled";

  return {
    os,
    arch,
    gpuAdapter,
    gpuTier: activeTier,
    memoryUsageMb: memoryMb,
    renderFps: currentFps,
    gridDimensions,
    activePreset: options.charset.preset,
    activeColorMatrix: options.color_mode,
    audioStatus,
    uptimeSec,
  };
}

import {
  IpcRenderRequest,
  IpcRenderResponse,
  Procedural3DParams,
} from "../contracts";
import { renderImageDataToAscii } from "./canvas-renderer";
import { renderProcedural3D } from "./procedural-3d";
import { getCharsetRamp } from "./charsets";
import { globalTierManager } from "./tier-manager";

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
};

export async function invokeRenderAscii(
  request: IpcRenderRequest,
  sourceImageData?: ImageData
): Promise<IpcRenderResponse> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<IpcRenderResponse>("render_ascii_frame", { request });
      return res;
    } catch (e: any) {
      // If Tauri IPC fails or not connected, fall through to client engine
      console.warn("Tauri IPC call failed, falling back to browser engine:", e);
    }
  }

  // Client-side fallback engine
  const start = performance.now();
  const ramp = getCharsetRamp(
    request.options.charset.preset,
    request.options.charset.custom_glyphs,
    request.options.charset.invert
  );

  let asciiText = "";
  const cols = request.options.max_output_columns;
  const rows = request.options.max_output_rows;

  if (request.source_type === "procedural") {
    const proceduralParams: Procedural3DParams = {
      scene: (request.source_payload as any) || "donut",
      rotation_speed_x: 1.0,
      rotation_speed_y: 1.0,
      rotation_speed_z: 0.0,
      camera_distance: 5.0,
      field_of_view: 60,
      light_direction: [0, 1, -1],
      ambient_light: 0.2,
      specular_strength: 0.5,
    };
    asciiText = renderProcedural3D(proceduralParams, 0, cols, rows, ramp).text;
  } else if (sourceImageData) {
    const res = renderImageDataToAscii(sourceImageData, request.options);
    asciiText = res.asciiText;
  } else {
    // Generate placeholder grid demo
    const proceduralParams: Procedural3DParams = {
      scene: "donut",
      rotation_speed_x: 1.0,
      rotation_speed_y: 1.0,
      rotation_speed_z: 0.0,
      camera_distance: 5.0,
      field_of_view: 60,
      light_direction: [0, 1, -1],
      ambient_light: 0.2,
      specular_strength: 0.5,
    };
    asciiText = renderProcedural3D(proceduralParams, 0, cols, rows, ramp).text;
  }

  const durationMs = performance.now() - start;

  return {
    request_id: request.request_id,
    success: true,
    execution_tier_used: request.options.tier,
    render_duration_ms: durationMs,
    columns: cols,
    rows: rows,
    ascii_text: asciiText,
    error_message: null,
  };
}

export async function getTelemetryFromHost(): Promise<{
  platform: string;
  sandbox_sealed: boolean;
  rust_engine_version: string;
  max_ipc_payload_bytes: number;
  native_threads_available: number;
  gpu_adapter_name: string;
}> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<any>("get_platform_telemetry");
      return {
        ...res,
        gpu_adapter_name: res.gpu_adapter_name || globalTierManager.getHardwareGpuDescription(),
      };
    } catch {
      // Fallthrough
    }
  }

  return {
    platform: "web",
    sandbox_sealed: true,
    rust_engine_version: "1.0.0 (WASM/Client)",
    max_ipc_payload_bytes: 32 * 1024 * 1024,
    native_threads_available: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
    gpu_adapter_name: globalTierManager.getHardwareGpuDescription(),
  };
}

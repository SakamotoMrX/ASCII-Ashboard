import { AsciiRenderOptions } from "../../types";
import { CharacterAtlas } from "./atlas";
import { SceneFrameData } from "../procedural/scenes";

const WGSL_SHADER = `
struct Uniforms {
  grid_cols: f32,
  grid_rows: f32,
  glyph_count: f32,
  color_mode: f32,
  contrast: f32,
  brightness: f32,
  gamma: f32,
  scanlines: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var data_sampler: sampler;
@group(0) @binding(2) var data_tex: texture_2d<f32>;
@group(0) @binding(3) var atlas_tex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_idx: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(pos[vertex_idx], 0.0, 1.0);
  output.uv = (pos[vertex_idx] + vec2f(1.0, 1.0)) * 0.5;
  output.uv.y = 1.0 - output.uv.y;
  return output;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let grid_res = vec2f(uniforms.grid_cols, uniforms.grid_rows);
  let cell_idx = floor(in.uv * grid_res);
  let cell_uv = fract(in.uv * grid_res);

  let sample_uv = (cell_idx + vec2f(0.5, 0.5)) / grid_res;
  let cell_data = textureSample(data_tex, data_sampler, sample_uv);

  var lum = (cell_data.r - 0.5) * uniforms.contrast + 0.5 + uniforms.brightness;
  lum = clamp(lum, 0.0, 1.0);
  lum = pow(lum, 1.0 / max(0.1, uniforms.gamma));

  var glyph_idx = floor(lum * (uniforms.glyph_count - 1.0));
  glyph_idx = clamp(glyph_idx, 0.0, uniforms.glyph_count - 1.0);

  let atlas_u = (glyph_idx + cell_uv.x) / uniforms.glyph_count;
  let atlas_uv = vec2f(atlas_u, cell_uv.y);
  let glyph_color = textureSample(atlas_tex, data_sampler, atlas_uv);

  if (glyph_color.r < 0.15) {
    return vec4f(0.039, 0.039, 0.059, 1.0);
  }

  var out_rgb = vec3f(0.94, 0.94, 0.96);

  if (uniforms.color_mode == 1.0) {
    out_rgb = vec3f(cell_data.a, cell_data.g, cell_data.b);
  } else if (uniforms.color_mode == 2.0) {
    out_rgb = vec3f(0.0, lum, lum * 0.53);
  } else if (uniforms.color_mode == 3.0) {
    out_rgb = vec3f(lum, lum * 0.67, 0.0);
  } else if (uniforms.color_mode == 4.0) {
    out_rgb = vec3f(cell_data.a, max(0.15, cell_data.g), max(0.4, cell_data.b));
  }

  if (uniforms.scanlines > 0.5) {
    let scan = sin(in.position.y * 1.5) * 0.15;
    out_rgb = out_rgb - vec3f(scan, scan, scan);
  }

  return vec4f(out_rgb * glyph_color.r, 1.0);
}
`;

export class WebGPURenderer {
  private canvas: HTMLCanvasElement;
  private device: any = null;
  private context: any = null;
  private pipeline: any = null;
  private uniformBuffer: any = null;
  private sampler: any = null;
  private dataTexture: any = null;
  private atlasTexture: any = null;
  private bindGroup: any = null;
  public adapterName: string = "WebGPU Accelerated Core";

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async init(): Promise<boolean> {
    if (!navigator.gpu) {
      return false;
    }
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });
      if (!adapter) return false;

      const info = (adapter as { info?: { description?: string } }).info;
      if (info && info.description) {
        this.adapterName = info.description;
      }

      this.device = await adapter.requestDevice();
      this.context = this.canvas.getContext("webgpu");
      if (!this.context) return false;

      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: presentationFormat,
        alphaMode: "opaque"
      });

      const shaderModule = this.device.createShaderModule({
        code: WGSL_SHADER
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: "auto",
        vertex: {
          module: shaderModule,
          entryPoint: "vs_main"
        },
        fragment: {
          module: shaderModule,
          entryPoint: "fs_main",
          targets: [{ format: presentationFormat }]
        },
        primitive: { topology: "triangle-list" }
      });

      this.uniformBuffer = this.device.createBuffer({
        size: 32, // 8 floats * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });

      this.sampler = this.device.createSampler({
        magFilter: "nearest",
        minFilter: "nearest"
      });

      return true;
    } catch {
      return false;
    }
  }

  public updateAtlas(atlas: CharacterAtlas) {
    if (!this.device) return;

    if (this.atlasTexture) {
      this.atlasTexture.destroy();
    }

    this.atlasTexture = this.device.createTexture({
      size: [atlas.canvas.width, atlas.canvas.height, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

    this.device.queue.copyExternalImageToTexture(
      { source: atlas.canvas },
      { texture: this.atlasTexture },
      [atlas.canvas.width, atlas.canvas.height]
    );
  }

  public render(
    frame: SceneFrameData,
    _atlas: CharacterAtlas,
    options: AsciiRenderOptions
  ): { text: string; renderTimeMs: number } {
    const startTime = performance.now();
    if (!this.device || !this.context || !this.pipeline) {
      return { text: "", renderTimeMs: 0 };
    }

    const { columns, rows, luminanceBuffer, colorBuffer } = frame;
    const targetW = columns * options.cell_width_px;
    const targetH = rows * options.cell_height_px;

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    // Reallocate data texture if dimensions changed
    if (!this.dataTexture || this.dataTexture.width !== columns || this.dataTexture.height !== rows) {
      if (this.dataTexture) this.dataTexture.destroy();
      this.dataTexture = this.device.createTexture({
        size: [columns, rows, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      });
    }

    // Pack data into byte buffer
    const packedData = new Uint8Array(columns * rows * 4);
    for (let i = 0; i < columns * rows; i++) {
      const pIdx = i * 4;
      packedData[pIdx] = Math.floor(luminanceBuffer[i] * 255);
      packedData[pIdx + 1] = colorBuffer[pIdx + 1];
      packedData[pIdx + 2] = colorBuffer[pIdx + 2];
      packedData[pIdx + 3] = colorBuffer[pIdx];
    }

    this.device.queue.writeTexture(
      { texture: this.dataTexture },
      packedData,
      { bytesPerRow: columns * 4, rowsPerImage: rows },
      [columns, rows, 1]
    );

    // Uniform values
    let colorModeVal = 0;
    if (options.color_mode === "truecolor" || options.color_mode === "rgb_ansi") colorModeVal = 1;
    else if (options.color_mode === "matrix_green") colorModeVal = 2;
    else if (options.color_mode === "amber") colorModeVal = 3;
    else if (options.color_mode === "cyberpunk_neon") colorModeVal = 4;

    const uniformArray = new Float32Array([
      columns,
      rows,
      _atlas.glyphCount,
      colorModeVal,
      (options.contrast + 100) / 100,
      options.brightness / 100,
      options.gamma,
      options.enable_scanlines ? 1.0 : 0.0
    ]);

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformArray.buffer);

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: this.dataTexture.createView() },
        { binding: 3, resource: this.atlasTexture.createView() }
      ]
    });

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.039, g: 0.039, b: 0.059, a: 1.0 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.draw(6, 1, 0, 0);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    const renderTimeMs = performance.now() - startTime;
    return { text: "", renderTimeMs };
  }
}

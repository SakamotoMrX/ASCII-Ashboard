import { AsciiRenderOptions } from "../../types";
import { CharacterAtlas } from "./atlas";
import { SceneFrameData } from "../procedural/scenes";

const VS_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  v_uv.y = 1.0 - v_uv.y; // Flip Y for screen space
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_data_texture;   // columns x rows (RGBA: R=lum, G=colorG, B=colorB, A=colorR)
uniform sampler2D u_atlas_texture;  // Character glyph atlas
uniform vec2 u_grid_resolution;     // (columns, rows)
uniform float u_glyph_count;
uniform int u_color_mode;           // 0: mono, 1: truecolor, 2: matrix, 3: amber, 4: cyberpunk
uniform float u_contrast;
uniform float u_brightness;
uniform float u_gamma;
uniform float u_scanlines;

void main() {
  vec2 cellIndex = floor(v_uv * u_grid_resolution);
  vec2 cellUV = fract(v_uv * u_grid_resolution);

  vec2 samplePos = (cellIndex + 0.5) / u_grid_resolution;
  vec4 cellData = texture(u_data_texture, samplePos);

  float rawLum = cellData.r;
  
  // Contrast, Brightness, Gamma
  float lum = (rawLum - 0.5) * u_contrast + 0.5 + u_brightness;
  lum = clamp(lum, 0.0, 1.0);
  lum = pow(lum, 1.0 / max(0.1, u_gamma));

  // Determine glyph index
  float glyphIdx = floor(lum * (u_glyph_count - 1.0));
  glyphIdx = clamp(glyphIdx, 0.0, u_glyph_count - 1.0);

  // Atlas UV
  float atlasU = (glyphIdx + cellUV.x) / u_glyph_count;
  float atlasV = cellUV.y;
  vec4 glyphColor = texture(u_atlas_texture, vec2(atlasU, atlasV));

  if (glyphColor.r < 0.15) {
    fragColor = vec4(0.039, 0.039, 0.059, 1.0); // Void background #0a0a0f
    return;
  }

  vec3 outRgb = vec3(0.94, 0.94, 0.96); // Default cold chrome

  if (u_color_mode == 1) {
    // Truecolor RGB
    outRgb = vec3(cellData.a, cellData.g, cellData.b);
  } else if (u_color_mode == 2) {
    // Matrix phosphor green
    outRgb = vec3(0.0, lum, lum * 0.53);
  } else if (u_color_mode == 3) {
    // Amber CRT
    outRgb = vec3(lum, lum * 0.67, 0.0);
  } else if (u_color_mode == 4) {
    // Cyberpunk neon
    outRgb = vec3(cellData.a, max(0.15, cellData.g), max(0.4, cellData.b));
  }

  // Scanlines effect
  if (u_scanlines > 0.5) {
    float scanline = sin(gl_FragCoord.y * 1.5) * 0.15;
    outRgb -= scanline;
  }

  fragColor = vec4(outRgb * glyphColor.r, 1.0);
}
`;

export class WebGL2Renderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private dataTexture: WebGLTexture | null = null;
  private atlasTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  public adapterName: string = "WebGL2 Shader Core";

  // Uniform locations
  private uGridResLoc: WebGLUniformLocation | null = null;
  private uGlyphCountLoc: WebGLUniformLocation | null = null;
  private uColorModeLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;
  private uBrightnessLoc: WebGLUniformLocation | null = null;
  private uGammaLoc: WebGLUniformLocation | null = null;
  private uScanlinesLoc: WebGLUniformLocation | null = null;
  private uDataTexLoc: WebGLUniformLocation | null = null;
  private uAtlasTexLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) {
      throw new Error("WebGL2 context not supported");
    }
    this.gl = gl;
    this.initGL();
  }

  private initGL() {
    const gl = this.gl;

    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        const unmaskedRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        const unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
        if (unmaskedRenderer) {
          this.adapterName = `${unmaskedVendor || "GPU"} - ${unmaskedRenderer}`;
        }
      }
    } catch {
      // Ignored
    }

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VS_SOURCE);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error(`VS error: ${gl.getShaderInfoLog(vs)}`);
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FS_SOURCE);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error(`FS error: ${gl.getShaderInfoLog(fs)}`);
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link error: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    // Uniforms
    this.uGridResLoc = gl.getUniformLocation(program, "u_grid_resolution");
    this.uGlyphCountLoc = gl.getUniformLocation(program, "u_glyph_count");
    this.uColorModeLoc = gl.getUniformLocation(program, "u_color_mode");
    this.uContrastLoc = gl.getUniformLocation(program, "u_contrast");
    this.uBrightnessLoc = gl.getUniformLocation(program, "u_brightness");
    this.uGammaLoc = gl.getUniformLocation(program, "u_gamma");
    this.uScanlinesLoc = gl.getUniformLocation(program, "u_scanlines");
    this.uDataTexLoc = gl.getUniformLocation(program, "u_data_texture");
    this.uAtlasTexLoc = gl.getUniformLocation(program, "u_atlas_texture");

    // Full screen quad geometry
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Textures
    this.dataTexture = gl.createTexture();
    this.atlasTexture = gl.createTexture();
  }

  public updateAtlas(atlas: CharacterAtlas) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
  }

  public render(
    frame: SceneFrameData,
    atlas: CharacterAtlas,
    options: AsciiRenderOptions
  ): { text: string; renderTimeMs: number } {
    const startTime = performance.now();
    const gl = this.gl;
    const { columns, rows, luminanceBuffer, colorBuffer } = frame;

    const targetW = columns * options.cell_width_px;
    const targetH = rows * options.cell_height_px;

    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
      this.canvas.width = targetW;
      this.canvas.height = targetH;
    }

    gl.viewport(0, 0, targetW, targetH);
    gl.useProgram(this.program);

    // Build packed texture (R: luminance, G: G/255, B: B/255, A: R/255)
    const packedData = new Uint8Array(columns * rows * 4);
    for (let i = 0; i < columns * rows; i++) {
      const pIdx = i * 4;
      packedData[pIdx] = Math.floor(luminanceBuffer[i] * 255);
      packedData[pIdx + 1] = colorBuffer[pIdx + 1]; // G
      packedData[pIdx + 2] = colorBuffer[pIdx + 2]; // B
      packedData[pIdx + 3] = colorBuffer[pIdx];     // R
    }

    // Bind Data Texture (Unit 0)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, columns, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, packedData);

    // Uniforms
    gl.uniform1i(this.uDataTexLoc, 0);
    gl.uniform1i(this.uAtlasTexLoc, 1);
    gl.uniform2f(this.uGridResLoc, columns, rows);
    gl.uniform1f(this.uGlyphCountLoc, atlas.glyphCount);

    let colorModeVal = 0;
    if (options.color_mode === "truecolor" || options.color_mode === "rgb_ansi") colorModeVal = 1;
    else if (options.color_mode === "matrix_green") colorModeVal = 2;
    else if (options.color_mode === "amber") colorModeVal = 3;
    else if (options.color_mode === "cyberpunk_neon") colorModeVal = 4;

    gl.uniform1i(this.uColorModeLoc, colorModeVal);
    gl.uniform1f(this.uContrastLoc, (options.contrast + 100) / 100);
    gl.uniform1f(this.uBrightnessLoc, options.brightness / 100);
    gl.uniform1f(this.uGammaLoc, options.gamma);
    gl.uniform1f(this.uScanlinesLoc, options.enable_scanlines ? 1.0 : 0.0);

    // Draw
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const renderTimeMs = performance.now() - startTime;
    return { text: "", renderTimeMs };
  }

  public destroy() {
    const gl = this.gl;
    if (this.dataTexture) gl.deleteTexture(this.dataTexture);
    if (this.atlasTexture) gl.deleteTexture(this.atlasTexture);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
  }
}

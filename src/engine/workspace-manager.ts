import { AsciiRenderOptions, Procedural3DParams } from "../contracts";
import { VideoStreamingEngine } from "./video-pipeline";
import { SceneFrameData } from "../lib/procedural/scenes";

export interface WorkspaceSession {
  id: string;
  name: string;
  type: "procedural_3d" | "video" | "image" | "camera_stream";
  videoEngine?: VideoStreamingEngine;
  canvasRef?: HTMLCanvasElement;
  asciiOutput: string;
  colorBuffer?: Uint8Array;
  options: AsciiRenderOptions;
  isActive: boolean;
  proceduralParams?: Procedural3DParams;
  sourceFile?: File;
  sourceUrl?: string;
  imageData?: ImageData;
  lastFrameData?: SceneFrameData;
  frameIndex?: number;
  lastActiveAt?: number;
  createdAt?: number;
  videoState?: {
    isPlaying: boolean;
    isLooping: boolean;
    currentTime: number;
    duration: number;
    fileName: string | null;
  };
}

export class WorkspaceManager {
  private workspaces: Map<string, WorkspaceSession> = new Map();
  private activeWorkspaceId: string = "";
  private listeners: ((workspaces: WorkspaceSession[], active: WorkspaceSession) => void)[] = [];
  private maxWorkspaces: number = 8;
  private defaultOptions: AsciiRenderOptions;

  constructor(defaultOptions?: AsciiRenderOptions) {
    this.defaultOptions = defaultOptions
      ? JSON.parse(JSON.stringify(defaultOptions))
      : {
          mode: "procedural_3d",
          tier: "tier1_webgpu",
          color_mode: "monochrome",
          charset: {
            preset: "standard",
            invert: false,
            glyph_aspect_ratio: 0.55,
          },
          contrast: 0,
          brightness: 0,
          gamma: 1.0,
          dither: "none",
          cell_width_px: 8,
          cell_height_px: 14,
          font_size_px: 12,
          font_family: "JetBrains Mono",
          fps_cap: 60,
          enable_scanlines: false,
          enable_bloom: false,
          max_output_columns: 100,
          max_output_rows: 45,
        };

    // Initialize default procedural 3D workspace
    this.createWorkspace({
      id: "ws-3d-1",
      name: "3D Procedural",
      type: "procedural_3d",
      isActive: true,
      options: { ...this.defaultOptions, mode: "procedural_3d" },
    });
  }

  public getActiveWorkspace(): WorkspaceSession {
    const ws = this.workspaces.get(this.activeWorkspaceId);
    if (!ws) {
      const first = Array.from(this.workspaces.values())[0];
      if (first) {
        this.activeWorkspaceId = first.id;
        first.isActive = true;
        return first;
      }
      return this.createWorkspace({
        name: "3D Procedural",
        type: "procedural_3d",
        isActive: true,
      });
    }
    return ws;
  }

  public getWorkspace(id: string): WorkspaceSession | undefined {
    return this.workspaces.get(id);
  }

  public getAllWorkspaces(): WorkspaceSession[] {
    return Array.from(this.workspaces.values());
  }

  public createWorkspace(
    config: Partial<WorkspaceSession> & { type: WorkspaceSession["type"] }
  ): WorkspaceSession {
    // Defense: If maxWorkspaces exceeded, evict oldest inactive workspace
    if (this.workspaces.size >= this.maxWorkspaces) {
      const oldest = Array.from(this.workspaces.values()).find((w) => !w.isActive);
      if (oldest) {
        this.removeWorkspace(oldest.id);
      }
    }

    const id =
      config.id ||
      `ws-${config.type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const sessionOptions: AsciiRenderOptions = config.options
      ? JSON.parse(JSON.stringify(config.options))
      : JSON.parse(JSON.stringify(this.defaultOptions));
    sessionOptions.mode = config.type;

    const session: WorkspaceSession = {
      id,
      name: config.name || `${config.type.replace("_", " ").toUpperCase()}`,
      type: config.type,
      videoEngine: config.videoEngine,
      canvasRef: config.canvasRef,
      asciiOutput: config.asciiOutput || "",
      colorBuffer: config.colorBuffer,
      options: sessionOptions,
      isActive: false,
      proceduralParams: config.proceduralParams
        ? { ...config.proceduralParams }
        : {
            scene: "donut",
            rotation_speed_x: 1.0,
            rotation_speed_y: 1.0,
            rotation_speed_z: 0.0,
            camera_distance: 5.0,
            field_of_view: 60,
            light_direction: [0, 1, -1],
            ambient_light: 0.2,
            specular_strength: 0.5,
          },
      sourceFile: config.sourceFile,
      sourceUrl: config.sourceUrl,
      imageData: config.imageData,
      lastFrameData: config.lastFrameData,
      frameIndex: config.frameIndex || 0,
      createdAt: config.createdAt || Date.now(),
      lastActiveAt: config.lastActiveAt || Date.now(),
      videoState: config.videoState
        ? { ...config.videoState }
        : {
            isPlaying: false,
            isLooping: true,
            currentTime: 0,
            duration: 0,
            fileName: config.sourceFile?.name || null,
          },
    };

    this.workspaces.set(id, session);

    if (config.isActive || !this.activeWorkspaceId) {
      this.switchWorkspace(id);
    } else {
      this.notifyListeners();
    }

    return session;
  }

  public switchWorkspace(id: string): WorkspaceSession {
    const target = this.workspaces.get(id);
    if (!target) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }

    if (this.activeWorkspaceId && this.activeWorkspaceId !== id) {
      const current = this.workspaces.get(this.activeWorkspaceId);
      if (current) {
        current.isActive = false;
        // Cleanly pause and suspend previous workspace's video / stream loop
        if (current.videoEngine) {
          current.videoEngine.pause();
          if (current.videoState) {
            current.videoState.isPlaying = false;
          }
        }
      }
    }

    target.isActive = true;
    target.lastActiveAt = Date.now();
    this.activeWorkspaceId = target.id;

    this.notifyListeners();
    return target;
  }

  public removeWorkspace(id: string): void {
    const ws = this.workspaces.get(id);
    if (!ws) return;

    if (ws.videoEngine) {
      ws.videoEngine.dispose();
      ws.videoEngine = undefined;
    }

    this.workspaces.delete(id);

    if (this.activeWorkspaceId === id) {
      const remaining = Array.from(this.workspaces.values());
      if (remaining.length > 0) {
        this.switchWorkspace(remaining[0].id);
      } else {
        const fallback = this.createWorkspace({
          id: "ws-3d-1",
          name: "3D Procedural",
          type: "procedural_3d",
          isActive: true,
        });
        this.activeWorkspaceId = fallback.id;
      }
    }

    this.notifyListeners();
  }

  public updateWorkspace(id: string, updates: Partial<WorkspaceSession>): WorkspaceSession {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new Error(`Workspace with ID "${id}" not found.`);
    }
    Object.assign(ws, updates);
    this.notifyListeners();
    return ws;
  }

  public pauseAllExcept(activeId: string): void {
    for (const [id, ws] of this.workspaces.entries()) {
      if (id !== activeId && ws.videoEngine) {
        ws.videoEngine.pause();
        if (ws.videoState) {
          ws.videoState.isPlaying = false;
        }
      }
    }
  }

  public subscribe(
    callback: (workspaces: WorkspaceSession[], active: WorkspaceSession) => void
  ): () => void {
    this.listeners.push(callback);
    callback(this.getAllWorkspaces(), this.getActiveWorkspace());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const all = this.getAllWorkspaces();
    const active = this.getActiveWorkspace();
    for (const cb of this.listeners) {
      cb(all, active);
    }
  }

  public dispose(): void {
    for (const ws of this.workspaces.values()) {
      if (ws.videoEngine) {
        ws.videoEngine.dispose();
      }
    }
    this.workspaces.clear();
    this.listeners = [];
  }
}

export const globalWorkspaceManager = new WorkspaceManager();

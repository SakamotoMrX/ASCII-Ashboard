import { AudioOptions, AudioState } from "../contracts";

export class AudioPipelineManager {
  private audioCtx: AudioContext | null = null;
  private sourceNodeMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private gainNode: GainNode | null = null;
  private isAutoplayBlocked = false;
  private activeTrackName: string | null = null;
  private boundGestureHandler: (() => void) | null = null;
  private options: AudioOptions;

  constructor(initialOptions?: Partial<AudioOptions>) {
    this.options = {
      enabled: initialOptions?.enabled ?? true,
      volume: initialOptions?.volume ?? 1.0,
      muted: initialOptions?.muted ?? false,
      preservePitch: initialOptions?.preservePitch ?? true,
      visualizeOutput: initialOptions?.visualizeOutput ?? false,
    };
  }

  /**
   * Initializes or returns the current AudioContext.
   */
  public getAudioContext(): AudioContext | null {
    if (typeof globalThis === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        (globalThis as any).AudioContext ||
        (globalThis as any).webkitAudioContext;
      if (AudioCtxClass) {
        const ctx: AudioContext = new AudioCtxClass();
        this.audioCtx = ctx;
        this.gainNode = ctx.createGain();
        this.applyOptions(this.options);
        this.gainNode.connect(ctx.destination);
      }
    }
    return this.audioCtx;
  }

  /**
   * STRESS-2 Defense: Intercept AudioContext.state. If suspended, track autoplay blocked
   * and attach a one-time global user gesture listener (click, keydown, touchstart)
   * that synchronously invokes audioContext.resume().
   */
  public registerAutoplayDefense(onStateChange?: (state: AudioState) => void): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      this.isAutoplayBlocked = true;
      if (onStateChange) onStateChange(this.getState());

      if (!this.boundGestureHandler && typeof window !== "undefined") {
        this.boundGestureHandler = async () => {
          try {
            if (this.audioCtx && this.audioCtx.state === "suspended") {
              await this.audioCtx.resume();
            }
            this.isAutoplayBlocked = false;
            if (onStateChange) onStateChange(this.getState());
          } catch {
            // Ignore resume failures
          } finally {
            this.removeGestureHandler();
          }
        };

        window.addEventListener("click", this.boundGestureHandler, { once: true, passive: true });
        window.addEventListener("keydown", this.boundGestureHandler, { once: true, passive: true });
        window.addEventListener("touchstart", this.boundGestureHandler, { once: true, passive: true });
      }
    } else {
      this.isAutoplayBlocked = false;
      if (onStateChange) onStateChange(this.getState());
    }
  }

  private removeGestureHandler(): void {
    if (this.boundGestureHandler && typeof window !== "undefined") {
      window.removeEventListener("click", this.boundGestureHandler);
      window.removeEventListener("keydown", this.boundGestureHandler);
      window.removeEventListener("touchstart", this.boundGestureHandler);
      this.boundGestureHandler = null;
    }
  }

  /**
   * Connects an HTMLMediaElement (video or audio) into the WebAudio pipeline.
   * Single-instance MediaElementAudioSourceNode guarding against DOMException:
   * "HTMLMediaElement already connected to an AudioSourceNode".
   */
  public connectMediaElement(
    mediaEl: HTMLMediaElement,
    trackName?: string,
    options?: Partial<AudioOptions>
  ): void {
    const ctx = this.getAudioContext();
    if (!ctx || !this.gainNode) return;

    this.activeTrackName = trackName ?? null;

    let sourceNode = this.sourceNodeMap.get(mediaEl);
    if (!sourceNode) {
      try {
        sourceNode = ctx.createMediaElementSource(mediaEl);
        this.sourceNodeMap.set(mediaEl, sourceNode);
      } catch (err) {
        // If already connected elsewhere in browser memory, ignore error
      }
    }

    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {
        // Safe disconnect
      }
      sourceNode.connect(this.gainNode);
    }

    if (options) {
      this.applyOptions(options);
    }

    this.registerAutoplayDefense();
  }

  public connectVideo(videoEl: HTMLVideoElement): void {
    this.connectMediaElement(videoEl, videoEl.title || "Video Track");
  }

  public setVolume(vol: number): void {
    this.options.volume = Math.max(0, Math.min(1, vol));
    this.applyOptions(this.options);
  }

  public setMuted(muted: boolean): void {
    this.options.muted = muted;
    this.applyOptions(this.options);
  }

  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    this.applyOptions(this.options);
  }

  /**
   * Applies volume and mute settings to the GainNode.
   */
  public applyOptions(options: Partial<AudioOptions>): void {
    this.options = { ...this.options, ...options };
    if (!this.gainNode || !this.audioCtx) return;

    const volume = this.options.volume !== undefined ? Math.max(0, Math.min(1, this.options.volume)) : 1.0;
    const isMuted = this.options.muted === true || this.options.enabled === false;
    const targetGain = isMuted ? 0 : volume;

    // Smooth gain ramp to avoid pop/crackle (STRESS-2 recovery action)
    const currentTime = this.audioCtx.currentTime;
    this.gainNode.gain.cancelScheduledValues(currentTime);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(targetGain, currentTime + 0.05);
  }

  /**
   * Explicit user action to resume audio context.
   */
  public async resume(): Promise<void> {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
      this.isAutoplayBlocked = false;
    }
  }

  /**
   * Returns serializable AudioState conforming to contracts.ts
   */
  public getState(): AudioState {
    const ctx = this.audioCtx;
    const contextState = ctx ? (ctx.state as AudioState["contextState"]) : "uninitialized";
    const currentGain = this.gainNode ? this.gainNode.gain.value : this.options.volume;

    return {
      contextState,
      volume: currentGain,
      muted: this.options.muted || !this.options.enabled,
      isAutoplayBlocked: this.isAutoplayBlocked,
      activeTrackName: this.activeTrackName,
    };
  }

  /**
   * Clean destruction and unmounting.
   */
  public dispose(): void {
    this.removeGestureHandler();
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Safe disconnect
      }
      this.gainNode = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      try {
        this.audioCtx.close();
      } catch {
        // Safe close
      }
      this.audioCtx = null;
    }
    this.activeTrackName = null;
    this.isAutoplayBlocked = false;
  }

  public destroy(): void {
    this.dispose();
  }
}

export const AudioPipeline = AudioPipelineManager;
export const globalAudioPipeline = new AudioPipelineManager();

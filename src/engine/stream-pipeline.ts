/**
 * High-Frequency Stream Pipeline & IPC Backpressure Debouncer (STRESS-3 Defense)
 * Guarantees zero UI thread frame starvation and constant memory usage under 120Hz slider scrubbing.
 */

export interface FrameTask<T> {
  payload: T;
  timestamp: number;
  resolve: (res: any) => void;
  reject: (err: any) => void;
}

export class StreamPipeline<T, R> {
  private pendingTask: FrameTask<T> | null = null;
  private isProcessing = false;
  private rafHandle: number | null = null;
  private droppedFrames = 0;
  private totalFramesSubmitted = 0;
  private renderFn: (payload: T) => Promise<R>;

  constructor(renderFn: (payload: T) => Promise<R>) {
    this.renderFn = renderFn;
  }

  /**
   * Submit a frame/param update. Replaces any pending unrendered frame in the queue.
   */
  submit(payload: T): Promise<R> {
    this.totalFramesSubmitted++;

    return new Promise<R>((resolve, reject) => {
      if (this.pendingTask) {
        // Discard superseded frame
        this.droppedFrames++;
        this.pendingTask.reject(new Error("Superseded by newer frame"));
      }

      this.pendingTask = {
        payload,
        timestamp: performance.now(),
        resolve,
        reject,
      };

      this.scheduleTick();
    });
  }

  private scheduleTick(): void {
    if (this.isProcessing) return;

    if (typeof requestAnimationFrame !== "undefined") {
      if (this.rafHandle === null) {
        this.rafHandle = requestAnimationFrame(() => {
          this.rafHandle = null;
          this.processNext();
        });
      }
    } else {
      setTimeout(() => this.processNext(), 16);
    }
  }

  private async processNext(): Promise<void> {
    if (!this.pendingTask || this.isProcessing) return;

    const task = this.pendingTask;
    this.pendingTask = null;
    this.isProcessing = true;

    try {
      const result = await this.renderFn(task.payload);
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.isProcessing = false;
      if (this.pendingTask) {
        this.scheduleTick();
      }
    }
  }

  getTelemetry(): { droppedFrames: number; totalSubmitted: number } {
    return {
      droppedFrames: this.droppedFrames,
      totalSubmitted: this.totalFramesSubmitted,
    };
  }

  resetTelemetry(): void {
    this.droppedFrames = 0;
    this.totalFramesSubmitted = 0;
  }
}

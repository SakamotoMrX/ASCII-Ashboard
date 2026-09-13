import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioPipelineManager } from "../engine/audio-pipeline";

describe("Audio Pipeline - WebAudio & STRESS-2 Autoplay Resilience", () => {
  let mockAudioContext: any;
  let mockGainNode: any;
  let mockSourceNode: any;

  beforeEach(() => {
    mockGainNode = {
      gain: {
        value: 1.0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockSourceNode = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    mockAudioContext = {
      state: "suspended",
      currentTime: 10,
      destination: {},
      createGain: vi.fn(() => mockGainNode),
      createMediaElementSource: vi.fn(() => mockSourceNode),
      resume: vi.fn().mockImplementation(async () => {
        mockAudioContext.state = "running";
      }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Polyfill window AudioContext
    (globalThis as any).AudioContext = vi.fn(() => mockAudioContext);
  });

  it("initializes AudioContext and creates GainNode connected to destination", () => {
    const pipeline = new AudioPipelineManager({ volume: 0.8, muted: false });
    const ctx = pipeline.getAudioContext();

    expect(ctx).toBeDefined();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it("detects suspended state as isAutoplayBlocked = true (STRESS-2 Defense)", () => {
    const pipeline = new AudioPipelineManager();
    let recordedState: any = null;

    pipeline.registerAutoplayDefense((state) => {
      recordedState = state;
    });

    const state = pipeline.getState();
    expect(state.isAutoplayBlocked).toBe(true);
    expect(state.contextState).toBe("suspended");
    expect(recordedState?.isAutoplayBlocked).toBe(true);
  });

  it("resumes AudioContext on explicit user gesture and clears isAutoplayBlocked", async () => {
    const pipeline = new AudioPipelineManager();
    pipeline.registerAutoplayDefense();

    expect(pipeline.getState().isAutoplayBlocked).toBe(true);

    await pipeline.resume();

    expect(mockAudioContext.resume).toHaveBeenCalled();
    const state = pipeline.getState();
    expect(state.isAutoplayBlocked).toBe(false);
    expect(state.contextState).toBe("running");
  });

  it("connects HTMLMediaElement and guards against double-connection errors", () => {
    const pipeline = new AudioPipelineManager();
    const mockVideoEl = {} as HTMLMediaElement;

    pipeline.connectMediaElement(mockVideoEl, "test-stream.mp4");
    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockGainNode);

    // Connecting the same element again should reuse existing source node without throwing
    pipeline.connectMediaElement(mockVideoEl, "test-stream.mp4");
    expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);
  });

  it("applies volume and mute settings with smooth linear ramp", () => {
    const pipeline = new AudioPipelineManager({ volume: 0.5 });
    pipeline.getAudioContext();

    pipeline.setVolume(0.75);
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.75,
      mockAudioContext.currentTime + 0.05
    );

    pipeline.setMuted(true);
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      mockAudioContext.currentTime + 0.05
    );
  });

  it("disposes nodes cleanly on destruction", () => {
    const pipeline = new AudioPipelineManager();
    pipeline.getAudioContext();
    pipeline.dispose();

    expect(mockGainNode.disconnect).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
});

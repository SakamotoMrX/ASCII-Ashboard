import React, { useEffect, useRef, useState } from "react";
import { Cpu, ShieldCheck, Terminal, CheckCircle2 } from "lucide-react";

export interface BootLoadingScreenProps {
  onComplete: () => void;
  detectedTier?: string;
  durationMs?: number;
}

interface BootStep {
  id: string;
  label: string;
  detail: string;
  targetProgress: number;
}

export const BootLoadingScreen: React.FC<BootLoadingScreenProps> = ({
  onComplete,
  detectedTier = "WebGPU Tier 1",
  durationMs = 1200,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  // Stable anchor: survives parent-render-driven effect resets (onComplete identity churn)
  const startTimeRef = useRef<number>(performance.now());

  const steps: BootStep[] = [
    {
      id: "hw_probe",
      label: "PROBING HARDWARE TIERS",
      detail: `${detectedTier} (Apple Metal / Direct3D 12)`,
      targetProgress: 28,
    },
    {
      id: "shader_compile",
      label: "COMPILING SHADER PIPELINES",
      detail: "Monochrome luminance quantization ramps ready",
      targetProgress: 56,
    },
    {
      id: "acl_seal",
      label: "SEALING DESKTOP SANDBOX",
      detail: "Tauri IPC bridge locked & isolated",
      targetProgress: 84,
    },
    {
      id: "matrix_ready",
      label: "MATRIX WORKSTATION READY",
      detail: "Zero-slop mechanical terminal online",
      targetProgress: 100,
    },
  ];

  useEffect(() => {
    const startTime = startTimeRef.current;
    let animFrame: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct < 28) {
        setCurrentStepIndex(0);
      } else if (pct < 58) {
        setCurrentStepIndex(1);
      } else if (pct < 88) {
        setCurrentStepIndex(2);
      } else {
        setCurrentStepIndex(3);
      }

      if (elapsed < durationMs) {
        animFrame = requestAnimationFrame(tick);
      } else {
        // Trigger 200ms fadeout then call onComplete
        setIsFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 200);
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [durationMs, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Application initialization hardware handshake in progress"
      className={`fixed inset-0 z-50 bg-[#000000] text-[#ffffff] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-200 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-md bg-[#0a0a0c] border border-[#222224] rounded-[4px] p-6 shadow-2xl flex flex-col gap-5">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#222224] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#ffffff]" aria-hidden="true" />
            <span className="text-xs font-mono font-semibold tracking-wider text-[#ffffff]">
              ASCII WORKSTATION // BOOT
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-[#141416] text-[#a1a1aa] border border-[#222224]">
            v2.0.0
          </span>
        </div>

        {/* Progress Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#a1a1aa]">INITIALIZING SYSTEM</span>
            <span className="text-[#ffffff] font-semibold">{Math.round(progress)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 bg-[#141416] rounded-[2px] overflow-hidden border border-[#222224]"
          >
            <div
              className="h-full bg-[#ffffff] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Handshake Telemetry Steps */}
        <div className="space-y-2 font-mono text-xs">
          {steps.map((step, idx) => {
            const isCompleted = progress >= step.targetProgress;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={step.id}
                className={`flex items-start gap-2.5 p-2 rounded-[2px] border transition-colors ${
                  isCurrent
                    ? "bg-[#141416] border-[#ffffff]/30 text-[#ffffff]"
                    : isCompleted
                    ? "border-transparent text-[#a1a1aa]"
                    : "border-transparent text-[#71717a] opacity-40"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#ffffff]" aria-hidden="true" />
                  ) : isCurrent ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#ffffff] border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-[#71717a]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold">{step.label}</span>
                    <span className="text-[10px] text-[#71717a]">
                      {isCompleted ? "DONE" : isCurrent ? "SYNC" : "WAIT"}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#a1a1aa] truncate mt-0.5">
                    {step.detail}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Hardware Pill Badges */}
        <div className="flex items-center justify-between border-t border-[#222224] pt-3 text-[10px] font-mono text-[#71717a]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-[#a1a1aa]" aria-hidden="true" />
            <span>60FPS VSYNC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-[#a1a1aa]" aria-hidden="true" />
            <span>ACL SANDBOX</span>
          </div>
          <span className="text-[#a1a1aa]">MONOCHROME ENGINE</span>
        </div>
      </div>
    </div>
  );
};

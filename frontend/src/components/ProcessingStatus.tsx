"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

interface StepItem {
  id: string;
  label: string;
}

const STEPS: StepItem[] = [
  { id: "uploaded", label: "Imagem carregada" },
  { id: "preprocess", label: "Pré-processamento e normalização" },
  { id: "model", label: "Modelo adversarial carregado" },
  { id: "optimize", label: "Otimizando perturbação adversarial" },
  { id: "finalize", label: "Finalizando imagem e metadados" },
];

export const ProcessingStatus: React.FC = () => {
  const [progress, setProgress] = useState(12);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Smooth progress simulation corresponding to backend phases
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          setCurrentStepIndex(1);
          return prev + 6;
        } else if (prev < 55) {
          setCurrentStepIndex(2);
          return prev + 5;
        } else if (prev < 85) {
          setCurrentStepIndex(3);
          return prev + 3;
        } else if (prev < 96) {
          setCurrentStepIndex(4);
          return prev + 1;
        }
        return prev;
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel w-full rounded-2xl p-8 sm:p-12 border border-white/10 text-center">
      {/* Icon */}
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/10 border border-indigo-500/30 shadow-glow">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-shield-cyan animate-pulse" />
      </div>

      {/* Main Title */}
      <h3 className="text-2xl font-bold tracking-tight text-white">
        Protegendo sua imagem...
      </h3>

      {/* Subtitle */}
      <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
        Calculando perturbação adversarial baseada nos princípios do Anti-DreamBooth
        (ICCV 2023).
      </p>

      {/* Progress Bar */}
      <div className="mx-auto mt-8 max-w-md">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
          <span>Otimizando perturbação adversarial</span>
          <span className="text-indigo-400 font-bold">{progress}%</span>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-shield-cyan to-shield-emerald transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Isso pode levar alguns segundos dependendo da resolução e do hardware disponível.
        </p>
      </div>

      {/* Step by step checklist */}
      <div className="mx-auto mt-10 max-w-sm rounded-xl border border-white/5 bg-white/[0.02] p-5 text-left space-y-3.5">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div key={step.id} className="flex items-center gap-3 text-xs">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                    : isCurrent
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-400 animate-pulse"
                    : "border-white/10 bg-white/[0.02] text-zinc-600"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>

              <span
                className={`transition-colors ${
                  isDone
                    ? "text-zinc-300 font-medium"
                    : isCurrent
                    ? "text-white font-semibold"
                    : "text-zinc-600"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

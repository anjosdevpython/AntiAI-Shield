"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";

interface CustomParametersPanelProps {
  epsilonDenom: number;
  onEpsilonChange: (val: number) => void;
  steps: number;
  onStepsChange: (val: number) => void;
  focus: string;
  onFocusChange: (val: string) => void;
}

const FOCUS_OPTIONS = [
  { id: "balanced", label: "Equilibrado", desc: "Perceptual geral" },
  { id: "texture", label: "Textura & Face", desc: "Alta frequência (traços faciais)" },
  { id: "structure", label: "Estrutura", desc: "Baixa frequência (formas & silhueta)" },
];

export const CustomParametersPanel: React.FC<CustomParametersPanelProps> = ({
  epsilonDenom,
  onEpsilonChange,
  steps,
  onStepsChange,
  focus,
  onFocusChange,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 bg-indigo-950/20 space-y-6 animate-fadeIn">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-indigo-400" />
        <h4 className="text-sm font-bold text-white">
          Parâmetros Personalizados de Otimização Adversarial
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Epsilon Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Limite de Perturbação (Norma L_∞)</span>
            <span className="font-mono text-indigo-400 font-bold">
              {epsilonDenom}/255 ({(epsilonDenom / 255).toFixed(4)})
            </span>
          </div>
          <input
            type="range"
            min="4"
            max="32"
            step="1"
            value={epsilonDenom}
            onChange={(e) => onEpsilonChange(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <p className="text-[11px] text-zinc-500">
            Orçamento máximo de desvio por pixel. Valores menores são imperceptíveis; maiores dão maior defesa.
          </p>
        </div>

        {/* Optimization Steps Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-300">
            <span>Iterações de Gradiente (Passos PGD)</span>
            <span className="font-mono text-indigo-400 font-bold">
              {steps} passos
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={steps}
            onChange={(e) => onStepsChange(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <p className="text-[11px] text-zinc-500">
            Mais passos convergem para perturbações mais refinadas, exigindo um pouco mais de processamento.
          </p>
        </div>
      </div>

      {/* Target Focus Selection */}
      <div>
        <span className="text-xs text-zinc-300 block mb-2 font-medium">
          Foco do Ataque Adversarial
        </span>
        <div className="grid grid-cols-3 gap-3">
          {FOCUS_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFocusChange(f.id)}
              className={`rounded-xl p-3 text-left border transition text-xs cursor-pointer ${
                focus === f.id
                  ? "border-indigo-400 bg-indigo-500/20 text-white font-semibold"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white"
              }`}
            >
              <div className="font-medium text-white">{f.label}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

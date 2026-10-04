"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Cpu,
  Trash2,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Sliders,
  SlidersHorizontal,
} from "lucide-react";
import { ProtectionStrength, StrategyInfo, SystemConfig } from "@/types";
import { formatBytes } from "@/lib/utils";

interface ProtectionSettingsProps {
  file: File;
  previewUrl: string;
  dimensions: { width: number; height: number };
  config: SystemConfig | null;
  onStartProtection: (options: {
    method: string;
    strength: ProtectionStrength;
    targetModel: string;
    removeExif: boolean;
    customEpsilon?: number;
    customSteps?: number;
    customFocus?: string;
  }) => void;
  onReset: () => void;
}

export const ProtectionSettings: React.FC<ProtectionSettingsProps> = ({
  file,
  previewUrl,
  dimensions,
  config,
  onStartProtection,
  onReset,
}) => {
  const [selectedStrength, setSelectedStrength] = useState<ProtectionStrength>(
    config?.default_protection_level || "balanced"
  );
  const [selectedMethod, setSelectedMethod] = useState<string>("anti-dreambooth");
  const [removeExif, setRemoveExif] = useState<boolean>(true);

  // Custom strategy sliders
  const [customEpsilonDenom, setCustomEpsilonDenom] = useState<number>(12); // numerator for /255
  const [customSteps, setCustomSteps] = useState<number>(14);
  const [customFocus, setCustomFocus] = useState<string>("balanced");

  const isCuda = config?.cuda_available ?? false;

  const strategies: StrategyInfo[] = config?.strategies || [
    {
      id: "anti-editing",
      name: "Anti-Edição (PhotoGuard)",
      description: "Defesa ativa contra ferramentas de edição por IA, Inpainting e Generative Fill (PhotoGuard / MIT).",
      is_implemented: true,
    },
    {
      id: "anti-dreambooth",
      name: "Anti-DreamBooth",
      description: "Perturbação adversarial otimizada para degradar o treinamento de modelos DreamBooth e LoRA (ICCV 2023).",
      is_implemented: true,
    },
    {
      id: "anti-lora",
      name: "Anti-LoRA",
      description: "Perturbação espectral focada em colapsar a adaptação de baixo posto (LoRA).",
      is_implemented: true,
    },
    {
      id: "ensemble",
      name: "Ensemble Multi-Modelo",
      description: "Otimização conjunta em múltiplos modelos surrogates (SD 1.5, SDXL).",
      is_implemented: true,
    },
    {
      id: "custom",
      name: "Personalizado",
      description: "Ajuste manual de parâmetros adversariais sob medida.",
      is_implemented: true,
    },
  ];

  const strengthOptions = [
    {
      id: "balanced" as ProtectionStrength,
      title: "Equilibrado",
      badge: "Recomendado",
      desc: "Boa relação entre preservação visual e proteção.",
      impact: "Perturbação sutil imperceptível a olho nu.",
    },
    {
      id: "strong" as ProtectionStrength,
      title: "Forte",
      badge: "Maior Defesa",
      desc: "Maior resistência contra treinamento, com possível alteração visual ligeiramente maior.",
      impact: "Recomendado para retratos sensíveis.",
    },
    {
      id: "maximum" as ProtectionStrength,
      title: "Máxima",
      badge: "Disrupção Extrema",
      desc: "Maior intensidade disponível, podendo aumentar artefatos ou alterações perceptíveis.",
      impact: "Máxima barreira matemática contra DreamBooth e LoRA.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartProtection({
      method: selectedMethod,
      strength: selectedStrength,
      targetModel: "stable-diffusion-v1-5",
      removeExif,
      customEpsilon: selectedMethod === "custom" ? customEpsilonDenom / 255.0 : undefined,
      customSteps: selectedMethod === "custom" ? customSteps : undefined,
      customFocus: selectedMethod === "custom" ? customFocus : undefined,
    });
  };

  return (
    <div className="w-full">
      {/* Selected Image Card */}
      <div className="glass-panel mb-8 flex flex-col sm:flex-row items-center gap-5 rounded-2xl p-5 border border-white/10">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
          <img
            src={previewUrl}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Imagem selecionada
            </span>
          </div>
          <h4
            className="mt-1 text-base font-semibold text-white truncate max-w-sm"
            title={file.name}
          >
            {file.name}
          </h4>
          <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 font-mono text-xs text-zinc-400">
            <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">
              {formatBytes(file.size)}
            </span>
            <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5">
              {dimensions.width} × {dimensions.height} px
            </span>
            <span className="rounded bg-white/5 px-2 py-0.5 border border-white/5 uppercase">
              {file.type.split("/")[1]}
            </span>
          </div>
        </div>

        <button
          onClick={onReset}
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          title="Selecionar outro arquivo"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Trocar imagem</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Method Selection */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            Método de proteção
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {strategies.map((strat) => {
              const isSelected = selectedMethod === strat.id;
              const isEditingDefense = strat.id === "anti-editing";

              return (
                <div
                  key={strat.id}
                  onClick={() => setSelectedMethod(strat.id)}
                  className={`relative flex flex-col justify-between rounded-xl p-4 border transition-all cursor-pointer ${
                    isSelected
                      ? isEditingDefense
                        ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400"
                        : "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">
                      {strat.name}
                    </span>
                    {isEditingDefense ? (
                      <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30 animate-pulse">
                        Anti-Inpaint
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {strat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Settings Panel when "Personalizado" is selected */}
        {selectedMethod === "custom" ? (
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
                    {customEpsilonDenom}/255 ({(customEpsilonDenom / 255).toFixed(4)})
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="1"
                  value={customEpsilonDenom}
                  onChange={(e) => setCustomEpsilonDenom(Number(e.target.value))}
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
                    {customSteps} passos
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={customSteps}
                  onChange={(e) => setCustomSteps(Number(e.target.value))}
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
                {[
                  { id: "balanced", label: "Equilibrado", desc: "Perceptual geral" },
                  { id: "texture", label: "Textura & Face", desc: "Alta frequência (traços faciais)" },
                  { id: "structure", label: "Estrutura", desc: "Baixa frequência (formas & silhueta)" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCustomFocus(f.id)}
                    className={`rounded-xl p-3 text-left border transition text-xs ${
                      customFocus === f.id
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
        ) : (
          /* Standard Protection Strength Level */
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Nível de proteção
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strengthOptions.map((opt) => {
                const isSelected = selectedStrength === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedStrength(opt.id)}
                    className={`group relative flex flex-col justify-between rounded-xl p-5 border cursor-pointer transition-all ${
                      isSelected
                        ? "border-shield-cyan/80 bg-shield-cyan/10 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-shield-cyan/50"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="strength"
                            checked={isSelected}
                            onChange={() => setSelectedStrength(opt.id)}
                            className="h-4 w-4 accent-shield-cyan cursor-pointer"
                          />
                          <span className="text-base font-bold text-white">
                            {opt.title}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            isSelected
                              ? "bg-shield-cyan/20 text-shield-cyan border-shield-cyan/30"
                              : "bg-white/5 text-zinc-400 border-white/5"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed mt-2">
                        {opt.desc}
                      </p>
                    </div>

                    <p className="mt-4 text-[11px] text-zinc-400 font-mono">
                      {opt.impact}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Privacy & EXIF Option */}
        <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={removeExif}
              onChange={(e) => setRemoveExif(e.target.checked)}
              className="mt-1 h-4 w-4 rounded accent-indigo-500 cursor-pointer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Remover metadados EXIF
                </span>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300 border border-indigo-500/20">
                  Privacidade
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Recomendado para imagens que serão publicadas na internet. Remove
                coordenadas GPS, modelo da câmera, data e detalhes do dispositivo.
              </p>
            </div>
          </label>
        </div>

        {/* CPU/GPU Notice */}
        {!isCuda && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-xs text-amber-200">
            <Cpu className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              <strong>Modo CPU:</strong> Aceleração CUDA não detectada. O processamento
              está sendo realizado em CPU com otimização multi-thread e pode levar alguns
              segundos a mais.
            </span>
          </div>
        )}

        {/* Submit CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
          <p className="text-xs text-zinc-400 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>A imagem original e os arquivos temporários são descartados após o processamento.</span>
          </p>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 hover:shadow-indigo-500/40 active:scale-[0.99]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Proteger imagem</span>
          </button>
        </div>
      </form>
    </div>
  );
};

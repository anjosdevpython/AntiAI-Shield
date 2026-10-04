"use client";

import React, { useState } from "react";
import { ShieldCheck, Cpu, Lock } from "lucide-react";
import { ProtectionStrength, StrategyInfo, SystemConfig } from "@/types";
import { DEFAULT_STRATEGIES, STRENGTH_OPTIONS_DETAILS } from "@/lib/constants";
import { SelectedImageCard } from "./studio/SelectedImageCard";
import { StrategySelector } from "./studio/StrategySelector";
import { CustomParametersPanel } from "./studio/CustomParametersPanel";
import { StrengthSelector } from "./studio/StrengthSelector";

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
  const [selectedMethod, setSelectedMethod] = useState<string>("anti-editing");
  const [removeExif, setRemoveExif] = useState<boolean>(true);

  // Custom strategy sliders
  const [customEpsilonDenom, setCustomEpsilonDenom] = useState<number>(12); // numerator for /255
  const [customSteps, setCustomSteps] = useState<number>(14);
  const [customFocus, setCustomFocus] = useState<string>("balanced");

  const isCuda = config?.cuda_available ?? false;
  const strategies: StrategyInfo[] = config?.strategies || DEFAULT_STRATEGIES;

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
      {/* Selected Image Information */}
      <SelectedImageCard
        file={file}
        previewUrl={previewUrl}
        dimensions={dimensions}
        onReset={onReset}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Method Selection */}
        <StrategySelector
          strategies={strategies}
          selectedMethod={selectedMethod}
          onSelectMethod={setSelectedMethod}
        />

        {/* Dynamic Panel: Custom Parameters vs Standard Strength Level */}
        {selectedMethod === "custom" ? (
          <CustomParametersPanel
            epsilonDenom={customEpsilonDenom}
            onEpsilonChange={setCustomEpsilonDenom}
            steps={customSteps}
            onStepsChange={setCustomSteps}
            focus={customFocus}
            onFocusChange={setCustomFocus}
          />
        ) : (
          <StrengthSelector
            options={STRENGTH_OPTIONS_DETAILS}
            selectedStrength={selectedStrength}
            onSelectStrength={setSelectedStrength}
          />
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 hover:shadow-indigo-500/40 active:scale-[0.99] cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Proteger imagem</span>
          </button>
        </div>
      </form>
    </div>
  );
};

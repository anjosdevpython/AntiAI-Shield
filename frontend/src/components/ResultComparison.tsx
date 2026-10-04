"use client";

import React, { useState } from "react";
import {
  Download,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldAlert,
  Sparkles,
  Info,
  Clock,
} from "lucide-react";
import { ProtectionResult } from "@/types";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { formatTime } from "@/lib/utils";
import confetti from "canvas-confetti";

interface ResultComparisonProps {
  result: ProtectionResult;
  onReset: () => void;
}

export const ResultComparison: React.FC<ResultComparisonProps> = ({
  result,
  onReset,
}) => {
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  const handleDownload = () => {
    setDownloadTriggered(true);
    // Fire celebratory particles
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#6366f1", "#06b6d4", "#10b981"],
    });

    const link = document.createElement("a");
    link.href = result.download_url;
    link.download = `antiai_protected_${result.original_filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const strengthLabels: Record<string, string> = {
    balanced: "Equilibrado",
    strong: "Forte",
    maximum: "Máxima",
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Proteção concluída
            </span>
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Imagem protegida
          </h3>
          <p className="mt-1 text-xs text-zinc-400">
            Arraste o divisor central para inspecionar a preservação visual e a perturbação adversarial.
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Proteger outra imagem</span>
          </button>

          <button
            onClick={handleDownload}
            type="button"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-glow-emerald transition hover:opacity-95 hover:shadow-emerald-500/40 active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            <span>Baixar imagem</span>
          </button>
        </div>
      </div>

      {/* Before / After Slider */}
      <div className="w-full">
        <BeforeAfterSlider
          originalSrc={result.original_preview_url}
          protectedSrc={result.protected_preview_url}
          originalAlt={`Original - ${result.original_filename}`}
          protectedAlt={`Protegida - ${result.original_filename}`}
        />
      </div>

      {/* Protection Technical Details Grid */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>Resumo da proteção aplicada</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          {/* Method */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Método</span>
            <span className="font-semibold text-white truncate block">
              {result.method_name || result.method}
            </span>
          </div>

          {/* Intensity */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Intensidade</span>
            <span className="font-semibold text-white">
              {strengthLabels[result.strength] || result.strength}
            </span>
          </div>

          {/* Resolution */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Resolução</span>
            <span className="font-mono font-medium text-white">
              {result.resolution}
            </span>
          </div>

          {/* Exif Status */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Metadados</span>
            <span
              className={`font-semibold ${
                result.exif_removed ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              {result.exif_removed ? "Removidos" : "Preservados"}
            </span>
          </div>

          {/* PSNR Quality */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Fidelidade (PSNR)</span>
            <span className="font-mono font-medium text-shield-cyan">
              {result.perturbation_psnr} dB
            </span>
          </div>

          {/* Compute Device */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
            <span className="text-[11px] text-zinc-400 block mb-1">Tempo / Dispositivo</span>
            <span className="font-mono text-[11px] text-zinc-300 block truncate">
              {formatTime(result.time_taken_ms)} • {result.device_used.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Scientific Linf Explanation */}
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <p>
            Perturbação adversarial calculada com limite de norma{" "}
            <span className="font-mono text-zinc-300">
              L_∞ ≤ {result.perturbation_norm_linf.toFixed(4)}
            </span>{" "}
            em {result.steps_computed} passos de gradiente projetado (PGD).
          </p>

          <span className="text-[11px] text-zinc-500">
            Status: <span className="text-emerald-400 font-medium">Pronta para publicação</span>
          </span>
        </div>
      </div>

      {/* Main Download Big Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-indigo-950/60 p-6 border border-indigo-500/20 shadow-glow">
        <div>
          <h4 className="text-base font-bold text-white">
            Baixe sua imagem protegida
          </h4>
          <p className="mt-1 text-xs text-zinc-300 max-w-xl">
            A imagem resultante possui a perturbação otimizada incorporada nos pixels.
            Utilize-a sempre que for publicar sua foto em redes sociais ou na web.
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 hover:shadow-indigo-500/40 active:scale-[0.99]"
        >
          <Download className="h-4 w-4" />
          <span>Baixar imagem protegida</span>
        </button>
      </div>
    </div>
  );
};

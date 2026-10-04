"use client";

import React from "react";
import { ArrowDown, ShieldCheck, Sparkles, Lock, EyeOff } from "lucide-react";

export const Hero: React.FC = () => {
  const scrollToStudio = () => {
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHowItWorks = () => {
    document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Background glow flares */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 right-10 -z-10 h-72 w-72 rounded-full bg-shield-cyan/10 blur-[100px]" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Research tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-sm mb-6">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Pesquisa Científica Anti-DreamBooth • ICCV 2023</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          Suas imagens.{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-shield-cyan to-shield-emerald bg-clip-text text-transparent">
            Sua identidade.
          </span>{" "}
          Sua escolha.
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-300 sm:text-lg md:text-xl font-normal leading-relaxed">
          Adicione uma proteção adversarial às suas imagens para dificultar seu uso em
          modelos generativos personalizados como DreamBooth e LoRA.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={scrollToStudio}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:opacity-95 hover:shadow-indigo-500/30 active:scale-[0.99]"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Proteger uma imagem</span>
          </button>

          <button
            onClick={scrollToHowItWorks}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
          >
            <span>Como funciona</span>
            <ArrowDown className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Processamento local & temporário</span>
          </div>
          <span className="hidden sm:inline text-zinc-600">•</span>
          <div className="flex items-center gap-2">
            <EyeOff className="h-3.5 w-3.5 text-indigo-400" />
            <span>Sem armazenamento permanente</span>
          </div>
          <span className="hidden sm:inline text-zinc-600">•</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Remoção segura de EXIF</span>
          </div>
        </div>
      </div>
    </section>
  );
};

"use client";

import React from "react";
import { UploadCloud, ShieldAlert, Share2, Sparkles } from "lucide-react";

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      icon: UploadCloud,
      title: "Envie",
      description: "Escolha uma imagem do seu dispositivo (JPG, PNG ou WEBP). Nenhum dado é salvo permanentemente.",
    },
    {
      num: "02",
      icon: ShieldAlert,
      title: "Proteja",
      description:
        "O sistema calcula uma perturbação adversarial sutil baseada em pesquisas de proteção contra geração personalizada.",
    },
    {
      num: "03",
      icon: Share2,
      title: "Publique",
      description:
        "Baixe a versão protegida e use-a quando for publicar sua imagem em redes sociais e na web.",
    },
  ];

  return (
    <section id="como-funciona" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1 text-xs font-medium text-zinc-300 mb-4">
          <Sparkles className="h-3.5 w-3.5 text-shield-cyan" />
          <span>Fluxo Simplificado</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Como funciona o AntiAI Shield
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Três passos simples para proteger suas fotos antes de disponibilizá-las publicamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="glass-panel-interactive relative flex flex-col rounded-2xl p-8 border border-white/10"
            >
              {/* Step Number */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="font-mono text-3xl font-extrabold text-white/10">
                  {step.num}
                </span>
              </div>

              {/* Title & Desc */}
              <h3 className="text-xl font-bold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

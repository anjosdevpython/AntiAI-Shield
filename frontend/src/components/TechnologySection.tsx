"use client";

import React from "react";
import { ExternalLink, BookOpen, Github, Cpu, ShieldCheck } from "lucide-react";

export const TechnologySection: React.FC = () => {
  return (
    <section id="tecnologia" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="glass-panel relative rounded-3xl p-8 sm:p-12 border border-white/10 overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute -bottom-10 right-0 h-80 w-80 rounded-full bg-indigo-600/10 blur-[100px]" />

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 mb-4">
            <Cpu className="h-3.5 w-3.5" />
            <span>Fundamentação Científica</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Tecnologia Adversarial de Proteção
          </h3>

          <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Este projeto é inspirado no trabalho <strong>Anti-DreamBooth</strong>, pesquisa
            apresentada no <strong>ICCV 2023</strong> que investiga técnicas adversariais para
            dificultar a utilização de imagens pessoais no treinamento de modelos de geração de
            imagens personalizados.
          </p>

          <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-relaxed">
            A proteção adiciona uma perturbação adversarial cuidadosamente otimizada via
            Gradiente Projetado (PGD) no espaço latente perceptual, com limite estrito de norma{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-zinc-300">
              L_∞ ≤ 8/255 ... 24/255
            </code>
            . Essa perturbação causa colapso na identificação de traços faciais durante etapas de
            score-matching em modelos difusores, enquanto preserva a fidelidade visual para
            olhos humanos.
          </p>

          {/* Links */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/VinAIResearch/Anti-DreamBooth"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
            >
              <Github className="h-4 w-4" />
              <span>Ver projeto no GitHub</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>

            <a
              href="https://arxiv.org/abs/2303.15433"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-2.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>Artigo científico (arXiv:2303.15433)</span>
              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

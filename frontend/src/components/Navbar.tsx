"use client";

import React from "react";
import { Shield, Sparkles, Cpu, Github, Lock } from "lucide-react";
import { SystemConfig } from "@/types";

interface NavbarProps {
  config: SystemConfig | null;
}

export const Navbar: React.FC<NavbarProps> = ({ config }) => {
  const isCuda = config?.cuda_available ?? false;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#08090d]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 via-shield-cyan/20 to-shield-emerald/20 border border-white/10 shadow-glow">
            <Shield className="h-5 w-5 text-indigo-400" />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-shield-cyan animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                AntiAI Shield
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-zinc-400">
              Proteção contra treinamento não autorizado
            </p>
          </div>
        </div>

        {/* Navigation links & status badge */}
        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#studio" className="transition hover:text-white">
              Estúdio
            </a>
            <a href="#como-funciona" className="transition hover:text-white">
              Como funciona
            </a>
            <a href="#tecnologia" className="transition hover:text-white">
              Tecnologia
            </a>
            <a href="#privacidade" className="transition hover:text-white">
              Privacidade
            </a>
          </nav>

          {/* Compute hardware status pill */}
          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300"
            title={
              isCuda
                ? `Aceleração por GPU ativa: ${config?.device_name}`
                : "Modo CPU ativo. Processamento local otimizado."
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isCuda
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              }`}
            />
            <Cpu className="h-3.5 w-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] tracking-wide">
              {isCuda ? "GPU CUDA" : "CPU MODE"}
            </span>
          </div>

          {/* GitHub link to user's profile */}
          <a
            href="https://github.com/anjosdevpython"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:border-white/20 hover:text-white"
            title="GitHub de Allan Anjos (anjosdevpython)"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
};

"use client";

import React from "react";
import { Shield, Sparkles } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/5 bg-[#07080c] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          {/* Brand info */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">
                AntiAI Shield
              </span>
              <p className="text-xs text-zinc-500">
                Proteja suas imagens antes de publicá-las.
              </p>
            </div>
          </div>

          {/* Credits - Exact requirement:
              © 2026 AntiAI Shield
              Desenvolvido por Allan Anjos
              allananjos.dev.br
          */}
          <div className="text-xs text-zinc-400 space-y-1 sm:text-right">
            <p className="font-medium text-zinc-300">© 2026 AntiAI Shield</p>
            <p>Desenvolvido por Allan Anjos</p>
            <p>
              <a
                href="https://allananjos.dev.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 transition hover:text-indigo-300 underline underline-offset-4 font-medium"
              >
                allananjos.dev.br
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

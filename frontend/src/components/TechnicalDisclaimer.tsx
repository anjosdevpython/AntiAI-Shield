"use client";

import React from "react";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";

export const TechnicalDisclaimer: React.FC = () => {
  return (
    <section id="privacidade" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Privacy Commitment */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="h-4 w-4" />
              </div>
              <h4 className="text-base font-bold text-white">
                Compromisso com sua Privacidade
              </h4>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Suas imagens são processadas estritamente em memória temporária para calcular a
              perturbação adversarial e gerar a versão protegida.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Exclusão imediata dos arquivos temporários após o download
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Nenhum banco de dados ou armazenamento persistente de imagens
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Remoção opcional e recomendada de metadados EXIF (GPS, data e dispositivo)
              </li>
            </ul>
          </div>
          <p className="mt-6 text-[11px] font-mono text-zinc-500">
            DELETE_AFTER_PROCESSING=true • Política Zero-Persistence
          </p>
        </div>

        {/* Technical Transparency Disclaimer */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h4 className="text-base font-bold text-white">
                Transparência e Aviso Técnico
              </h4>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              A proteção adiciona uma perturbação adversarial cuidadosamente otimizada para
              dificultar o treinamento e a personalização de modelos generativos a partir da imagem.
            </p>
            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-200/90 leading-relaxed">
              Nenhuma técnica científica atual garante proteção absoluta contra todos os modelos,
              técnicas de treinamento ou processos de pré-processamento (como recompressão forte,
              redimensionamento extremo ou filtros de denoising). A eficácia pode variar conforme
              o modelo e o algoritmo do atacante.
            </div>
          </div>
          <p className="mt-6 text-[11px] text-zinc-500">
            Sem marketing enganoso • Baseado em pesquisa científica aberta
          </p>
        </div>
      </div>
    </section>
  );
};

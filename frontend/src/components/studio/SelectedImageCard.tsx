"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface SelectedImageCardProps {
  file: File;
  previewUrl: string;
  dimensions: { width: number; height: number };
  onReset: () => void;
}

export const SelectedImageCard: React.FC<SelectedImageCardProps> = ({
  file,
  previewUrl,
  dimensions,
  onReset,
}) => {
  return (
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
            {file.type.split("/")[1] || "IMG"}
          </span>
        </div>
      </div>

      <button
        onClick={onReset}
        type="button"
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
        title="Selecionar outro arquivo"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Trocar imagem</span>
      </button>
    </div>
  );
};

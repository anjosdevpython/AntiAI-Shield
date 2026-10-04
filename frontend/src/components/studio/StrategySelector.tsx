"use client";

import React from "react";
import { StrategyInfo } from "@/types";

interface StrategySelectorProps {
  strategies: StrategyInfo[];
  selectedMethod: string;
  onSelectMethod: (methodId: string) => void;
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  strategies,
  selectedMethod,
  onSelectMethod,
}) => {
  return (
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
              onClick={() => onSelectMethod(strat.id)}
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
  );
};

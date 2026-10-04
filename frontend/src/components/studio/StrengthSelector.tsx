"use client";

import React from "react";
import { ProtectionStrength } from "@/types";
import { STRENGTH_OPTIONS_DETAILS } from "@/lib/constants";

interface StrengthSelectorProps {
  options?: typeof STRENGTH_OPTIONS_DETAILS;
  selectedStrength: ProtectionStrength;
  onSelectStrength: (strength: ProtectionStrength) => void;
}

export const StrengthSelector: React.FC<StrengthSelectorProps> = ({
  options = STRENGTH_OPTIONS_DETAILS,
  selectedStrength,
  onSelectStrength,
}) => {
  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-3">
        Nível de proteção
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const isSelected = selectedStrength === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => onSelectStrength(opt.id)}
              className={`group relative flex flex-col justify-between rounded-xl p-5 border cursor-pointer transition-all ${
                isSelected
                  ? "border-shield-cyan/80 bg-shield-cyan/10 shadow-[0_0_25px_rgba(6,182,212,0.15)] ring-1 ring-shield-cyan/50"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strength"
                      checked={isSelected}
                      onChange={() => onSelectStrength(opt.id)}
                      className="h-4 w-4 accent-shield-cyan cursor-pointer"
                    />
                    <span className="text-base font-bold text-white">
                      {opt.title}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      isSelected
                        ? "bg-shield-cyan/20 text-shield-cyan border-shield-cyan/30"
                        : "bg-white/5 text-zinc-400 border-white/5"
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed mt-2">
                  {opt.desc}
                </p>
              </div>

              <p className="mt-4 text-[11px] text-zinc-400 font-mono">
                {opt.impact}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

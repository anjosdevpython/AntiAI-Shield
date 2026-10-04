"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";

interface BeforeAfterSliderProps {
  originalSrc: string;
  protectedSrc: string;
  originalAlt?: string;
  protectedAlt?: string;
  aspectRatio?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalSrc,
  protectedSrc,
  originalAlt = "Imagem Original",
  protectedAlt = "Imagem Protegida",
}) => {
  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
      className="relative select-none overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-glass cursor-ew-resize max-h-[600px] w-full flex items-center justify-center"
      style={{ touchAction: "none" }}
    >
      {/* Protected Image (Full background layer) */}
      <img
        src={protectedSrc}
        alt={protectedAlt}
        className="w-full h-auto max-h-[580px] object-contain block pointer-events-none"
        draggable={false}
      />

      {/* Original Image (Clipped layer on the left) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={originalSrc}
          alt={originalAlt}
          className="absolute inset-0 w-full h-full max-h-[580px] object-contain block pointer-events-none"
          draggable={false}
          style={{
            width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%",
            maxWidth: "none",
          }}
        />
      </div>

      {/* Floating Badges */}
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        <span className="rounded-lg bg-black/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300 backdrop-blur-md border border-white/10 shadow-lg">
          Original
        </span>
      </div>

      <div className="absolute top-4 right-4 pointer-events-none z-10">
        <span className="rounded-lg bg-indigo-950/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 backdrop-blur-md border border-indigo-500/30 shadow-lg">
          Protegida
        </span>
      </div>

      {/* Draggable Divider Line */}
      <div
        className="absolute top-0 bottom-0 z-20 w-0.5 bg-gradient-to-b from-indigo-400 via-white to-indigo-400 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle Knob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl border-2 border-indigo-500 transition-transform hover:scale-110 active:scale-95">
          <MoveHorizontal className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

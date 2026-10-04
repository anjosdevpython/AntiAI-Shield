"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onImageSelected: (file: File, previewUrl: string, dimensions: { width: number; height: number }) => void;
  maxMb?: number;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onImageSelected,
  maxMb = 20,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validate mime
    if (!allowedMimeTypes.includes(file.type)) {
      setErrorMessage(
        "Esse arquivo não parece ser uma imagem compatível. Envie JPG, PNG ou WEBP."
      );
      return;
    }

    // Validate size
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(`A imagem excede o limite de ${maxMb} MB.`);
      return;
    }

    // Read dimensions & preview
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      onImageSelected(file, previewUrl, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      setErrorMessage("Não foi possível decodificar esta imagem. O arquivo pode estar corrompido.");
    };
    img.src = previewUrl;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 md:p-14 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? "border-indigo-400 bg-indigo-500/10 shadow-glow"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Upload Icon */}
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 group-hover:scale-105 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10 transition-all duration-300">
          <UploadCloud className="h-8 w-8 text-indigo-400 group-hover:text-indigo-300 transition" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white group-hover:text-indigo-200 transition">
          Arraste sua imagem aqui
        </h3>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-zinc-400">
          ou clique para selecionar do seu dispositivo
        </p>

        {/* Allowed formats */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-3.5 py-1 text-xs font-mono text-zinc-400">
          <ImageIcon className="h-3 w-3 text-zinc-500" />
          <span>PNG • JPG • WEBP</span>
          <span className="text-zinc-600">|</span>
          <span>Até {maxMb} MB</span>
        </div>

        {/* Action button inside dropzone */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/20 group-hover:bg-indigo-600 group-hover:text-white"
        >
          Selecionar imagem
        </button>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-fadeIn">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

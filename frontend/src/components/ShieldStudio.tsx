"use client";

import React, { useState } from "react";
import { UploadDropzone } from "./UploadDropzone";
import { ProtectionSettings } from "./ProtectionSettings";
import { ProcessingStatus } from "./ProcessingStatus";
import { ResultComparison } from "./ResultComparison";
import { ProtectionResult, ProtectionStrength, SystemConfig } from "@/types";
import { cleanupSessionImage, protectImage } from "@/lib/api";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ShieldStudioProps {
  config: SystemConfig | null;
}

type StudioState = "upload" | "configure" | "processing" | "result" | "error";

export const ShieldStudio: React.FC<ShieldStudioProps> = ({ config }) => {
  const [state, setState] = useState<StudioState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [result, setResult] = useState<ProtectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageSelected = (
    file: File,
    url: string,
    dims: { width: number; height: number }
  ) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    setDimensions(dims);
    setErrorMessage(null);
    setState("configure");
  };

  const handleStartProtection = async (options: {
    method: string;
    strength: ProtectionStrength;
    targetModel: string;
    removeExif: boolean;
    customEpsilon?: number;
    customSteps?: number;
    customFocus?: string;
  }) => {
    if (!selectedFile) return;

    setState("processing");
    setErrorMessage(null);

    try {
      const protectionResult = await protectImage(selectedFile, options);
      setResult(protectionResult);
      setState("result");
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Não foi possível proteger esta imagem. Tente novamente ou utilize uma imagem menor."
      );
      setState("error");
    }
  };

  const handleReset = async () => {
    if (result?.image_id) {
      // Safely cleanup temporary server files
      cleanupSessionImage(result.image_id).catch(() => {});
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMessage(null);
    setState("upload");
  };

  return (
    <section id="studio" className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Studio Header Card */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Estúdio de Proteção
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Adicione uma camada de proteção adversarial à sua imagem antes de publicá-la online.
        </p>
      </div>

      {/* Main Studio Frame */}
      <div className="glass-panel relative rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl">
        {state === "upload" && (
          <UploadDropzone
            onImageSelected={handleImageSelected}
            maxMb={config?.max_upload_mb || 20}
          />
        )}

        {state === "configure" && selectedFile && previewUrl && (
          <ProtectionSettings
            file={selectedFile}
            previewUrl={previewUrl}
            dimensions={dimensions}
            config={config}
            onStartProtection={handleStartProtection}
            onReset={handleReset}
          />
        )}

        {state === "processing" && <ProcessingStatus />}

        {state === "result" && result && (
          <ResultComparison result={result} onReset={handleReset} />
        )}

        {state === "error" && (
          <div className="text-center py-8 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-white">
                Falha no processamento
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                {errorMessage ||
                  "Não foi possível proteger esta imagem. Tente novamente ou utilize uma imagem menor."}
              </p>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

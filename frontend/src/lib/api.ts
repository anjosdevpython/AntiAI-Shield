import { ProtectionResult, ProtectionStrength, SystemConfig } from "@/types";

const DEFAULT_PRODUCTION_BACKEND = "https://antiai-shield-backend.onrender.com";

/**
 * Resolves the base URL for backend API requests.
 * In server-side functions/SSR, Vercel injects the bound URL via BACKEND_URL.
 * In browser runtime, connects directly to Render backend in production to bypass
 * Vercel's strict 15-second proxy timeout, while honoring local dev servers.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    return (
      process.env.BACKEND_URL ||
      process.env.BACKEND_INTERNAL_URL ||
      DEFAULT_PRODUCTION_BACKEND
    );
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Local development fallback
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://127.0.0.1:8000";
  }

  // Production fallback to cloud backend
  return DEFAULT_PRODUCTION_BACKEND;
}

export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (!base) {
    return cleanEndpoint;
  }
  try {
    return new URL(cleanEndpoint, base).toString();
  } catch {
    return `${base.replace(/\/+$/, "")}${cleanEndpoint}`;
  }
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  try {
    const res = await fetch(buildApiUrl("/api/config"));
    if (!res.ok) {
      throw new Error(`Falha ao obter configurações do servidor: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    // Fallback safe defaults if server is momentarily starting up
    return {
      device: "cpu",
      cuda_available: false,
      device_name: "CPU (Standard Mode)",
      max_upload_mb: 20,
      default_protection_level: "balanced",
      delete_after_processing: true,
      strategies: [
        {
          id: "anti-editing",
          name: "Anti-Edição (PhotoGuard)",
          description:
            "Defesa ativa contra edição por IA, Inpainting e Generative Fill (PhotoGuard / MIT), corrompendo codificadores latentes.",
          is_implemented: true,
        },
        {
          id: "anti-dreambooth",
          name: "Anti-DreamBooth",
          description:
            "Perturbação adversarial otimizada para degradar o treinamento de modelos DreamBooth e LoRA (ICCV 2023).",
          is_implemented: true,
        },
        {
          id: "anti-lora",
          name: "Anti-LoRA",
          description: "Perturbação espectral focada em colapsar a adaptação de baixo posto (LoRA).",
          is_implemented: true,
        },
        {
          id: "ensemble",
          name: "Ensemble Multi-Modelo",
          description: "Otimização conjunta em múltiplos modelos surrogates (SD 1.5, SDXL).",
          is_implemented: true,
        },
        {
          id: "custom",
          name: "Personalizado",
          description: "Configuração avançada de parâmetros adversariais sob medida.",
          is_implemented: true,
        },
      ],
      strength_levels: [
        {
          id: "balanced",
          label: "Equilibrado",
          description: "Boa relação entre preservação visual e proteção.",
          recommended: true,
        },
        {
          id: "strong",
          label: "Forte",
          description:
            "Maior resistência contra treinamento, com possível alteração visual ligeiramente maior.",
          recommended: false,
        },
        {
          id: "maximum",
          label: "Máxima",
          description:
            "Maior intensidade disponível, podendo aumentar artefatos ou alterações perceptíveis.",
          recommended: false,
        },
      ],
    };
  }
}

export interface ProtectOptions {
  method: string;
  strength: ProtectionStrength;
  targetModel: string;
  removeExif: boolean;
  customEpsilon?: number;
  customSteps?: number;
  customFocus?: string;
  antiLlmDirective?: boolean;
}

/**
 * Scales an image file down to maxDimension if needed, preserving aspect ratio and quality.
 * Reduces upload payload from 15MB phone photos to ~400KB, preventing mobile network timeouts.
 */
export async function optimizeImageForUpload(file: File, maxDimension = 1280): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.size < 1.2 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (Math.max(width, height) <= maxDimension) {
        resolve(file);
        return;
      }

      const scale = maxDimension / Math.max(width, height);
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const optimizedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(optimizedFile);
        },
        outputType,
        0.95
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function protectImage(
  file: File,
  options: ProtectOptions
): Promise<ProtectionResult> {
  const uploadPayload = await optimizeImageForUpload(file, 1280);

  const formData = new FormData();
  formData.append("file", uploadPayload);
  formData.append("method", options.method);
  formData.append("strength", options.strength);
  formData.append("target_model", options.targetModel);
  formData.append("remove_exif", String(options.removeExif));

  if (options.customEpsilon !== undefined) {
    formData.append("custom_epsilon", String(options.customEpsilon));
  }
  if (options.customSteps !== undefined) {
    formData.append("custom_steps", String(options.customSteps));
  }
  if (options.customFocus) {
    formData.append("custom_focus", options.customFocus);
  }
  if (options.antiLlmDirective !== undefined) {
    formData.append("anti_llm_directive", String(options.antiLlmDirective));
  }

  let res: Response;
  try {
    res = await fetch(buildApiUrl("/api/protect"), {
      method: "POST",
      body: formData,
    });
  } catch (err: unknown) {
    const errorMsg =
      (err as { message?: string })?.message === "Failed to fetch"
        ? "Não foi possível conectar ao servidor de processamento. O servidor em nuvem pode estar iniciando (cold start de ~30s no plano gratuito) ou ocorreu uma oscilação na conexão. Por favor, tente novamente em instantes."
        : `Erro de conexão com o servidor: ${(err as { message?: string })?.message || "Falha na requisição"}`;
    throw new Error(errorMsg);
  }

  if (!res.ok) {
    let errorDetail = "Falha ao proteger a imagem.";
    if (res.status === 502 || res.status === 503) {
      errorDetail =
        "O servidor em nuvem está temporariamente reiniciando ou sob carga. Aguarde cerca de 30 segundos e tente novamente.";
    } else {
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorDetail = errJson.detail;
        }
      } catch {
        errorDetail = `Erro no servidor (${res.status}): ${res.statusText}`;
      }
    }
    throw new Error(errorDetail);
  }

  return await res.json();
}

export async function cleanupSessionImage(imageId: string): Promise<boolean> {
  try {
    const res = await fetch(buildApiUrl(`/api/cleanup/${imageId}`), {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getDownloadUrl(imageId: string): string {
  return buildApiUrl(`/api/download/${imageId}`);
}

export function getPreviewUrl(imageId: string, type: "original" | "protected"): string {
  return buildApiUrl(`/api/preview/${imageId}?type=${type}`);
}

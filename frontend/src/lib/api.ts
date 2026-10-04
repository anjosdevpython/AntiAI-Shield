import { ProtectionResult, ProtectionStrength, SystemConfig } from "@/types";

/**
 * Resolves the base URL for backend API requests.
 * In server-side functions/SSR, Vercel injects the bound internal service URL via process.env.BACKEND_URL.
 * In client-side browser runtime, requests use relative paths (or NEXT_PUBLIC_API_URL if configured).
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL || process.env.BACKEND_INTERNAL_URL || "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "";
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
}

export async function protectImage(
  file: File,
  options: ProtectOptions
): Promise<ProtectionResult> {
  const formData = new FormData();
  formData.append("file", file);
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

  const res = await fetch(buildApiUrl("/api/protect"), {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = "Falha ao proteger a imagem.";
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      }
    } catch {
      errorDetail = `Erro no servidor (${res.status}): ${res.statusText}`;
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

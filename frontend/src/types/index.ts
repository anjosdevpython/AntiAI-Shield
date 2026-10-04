export type ProtectionStrength = "balanced" | "strong" | "maximum";

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  is_implemented: boolean;
}

export interface StrengthLevelInfo {
  id: ProtectionStrength;
  label: string;
  description: string;
  recommended: boolean;
}

export interface SystemConfig {
  device: string;
  cuda_available: boolean;
  device_name: string;
  max_upload_mb: number;
  default_protection_level: ProtectionStrength;
  delete_after_processing: boolean;
  strategies: StrategyInfo[];
  strength_levels: StrengthLevelInfo[];
}

export interface ProtectionResult {
  image_id: string;
  original_filename: string;
  method: string;
  method_name: string;
  strength: ProtectionStrength;
  target_model: string;
  resolution: string;
  width: number;
  height: number;
  perturbation_norm_linf: number;
  perturbation_psnr: number;
  device_used: string;
  steps_computed: number;
  time_taken_ms: number;
  exif_removed: boolean;
  download_url: string;
  original_preview_url: string;
  protected_preview_url: string;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "current" | "completed";
}

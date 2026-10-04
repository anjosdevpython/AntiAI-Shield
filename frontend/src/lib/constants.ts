import { ProtectionStrength, StrategyInfo, StrengthLevelInfo } from "@/types";

export const DEFAULT_STRATEGIES: StrategyInfo[] = [
  {
    id: "anti-editing",
    name: "Anti-Edição (PhotoGuard)",
    description: "Defesa ativa contra ferramentas de edição por IA, Inpainting e Generative Fill (PhotoGuard / MIT).",
    is_implemented: true,
  },
  {
    id: "anti-dreambooth",
    name: "Anti-DreamBooth",
    description: "Perturbação adversarial otimizada para degradar o treinamento de modelos DreamBooth e LoRA (ICCV 2023).",
    is_implemented: true,
  },
  {
    id: "anti-lora",
    name: "Anti-LoRA",
    description: "Perturbação espectral focada em colapsar a adaptação de baixo posto (LoRA) e cross-attention.",
    is_implemented: true,
  },
  {
    id: "ensemble",
    name: "Ensemble Multi-Modelo",
    description: "Otimização conjunta em múltiplos modelos surrogates (SD 1.5, SDXL) para transferibilidade máxima.",
    is_implemented: true,
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Ajuste manual de parâmetros de perturbação e foco adversarial sob medida.",
    is_implemented: true,
  },
];

export const DEFAULT_STRENGTH_LEVELS: StrengthLevelInfo[] = [
  {
    id: "balanced",
    label: "Equilibrado",
    description: "Boa relação entre preservação visual e proteção.",
    recommended: true,
  },
  {
    id: "strong",
    label: "Forte",
    description: "Maior resistência contra treinamento e edição, com possível alteração visual ligeiramente maior.",
    recommended: false,
  },
  {
    id: "maximum",
    label: "Máxima",
    description: "Maior intensidade disponível, podendo aumentar artefatos ou alterações perceptíveis.",
    recommended: false,
  },
];

export const STRENGTH_OPTIONS_DETAILS = [
  {
    id: "balanced" as ProtectionStrength,
    title: "Equilibrado",
    badge: "Recomendado",
    desc: "Boa relação entre preservação visual e proteção.",
    impact: "Perturbação sutil imperceptível a olho nu.",
  },
  {
    id: "strong" as ProtectionStrength,
    title: "Forte",
    badge: "Maior Defesa",
    desc: "Maior resistência contra treinamento e inpainting.",
    impact: "Recomendado para fotos de rosto e perfis públicos.",
  },
  {
    id: "maximum" as ProtectionStrength,
    title: "Máxima",
    badge: "Disrupção Extrema",
    desc: "Maior intensidade disponível, corrompendo latentes mesmo sob compressão.",
    impact: "Máxima barreira matemática contra IA generativa.",
  },
];

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AntiAI Shield — Proteja suas imagens antes de publicá-las",
  description:
    "Adicione uma camada de proteção adversarial às suas imagens antes de publicá-las online, dificultando o treinamento e o fine-tuning de modelos generativos (DreamBooth/LoRA).",
  keywords: [
    "AntiAI Shield",
    "Anti-DreamBooth",
    "Adversarial Defense",
    "Proteção de imagens",
    "Inteligência Artificial",
    "DreamBooth",
    "LoRA",
  ],
  authors: [{ name: "Allan Anjos", url: "https://allananjos.dev.br/" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#08090d] text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <div className="fixed inset-0 bg-radial-ambient pointer-events-none -z-10" />
        <div className="fixed inset-0 bg-radial-accent pointer-events-none -z-10" />
        {children}
      </body>
    </html>
  );
}

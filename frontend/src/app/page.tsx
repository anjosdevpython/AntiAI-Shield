"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ShieldStudio } from "@/components/ShieldStudio";
import { HowItWorks } from "@/components/HowItWorks";
import { TechnologySection } from "@/components/TechnologySection";
import { TechnicalDisclaimer } from "@/components/TechnicalDisclaimer";
import { Footer } from "@/components/Footer";
import { SystemConfig } from "@/types";
import { fetchSystemConfig } from "@/lib/api";

export default function Home() {
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    fetchSystemConfig()
      .then((cfg) => setConfig(cfg))
      .catch((err) => console.error("Error loading config:", err));
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar config={config} />
      <main className="flex-1">
        <Hero />
        <ShieldStudio config={config} />
        <HowItWorks />
        <TechnologySection />
        <TechnicalDisclaimer />
      </main>
      <Footer />
    </div>
  );
}

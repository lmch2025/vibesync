"use client";
import { Nav } from "./nav";
import { Hero } from "./hero";
import { Stats } from "./stats";
import { HowItWorks } from "./how-it-works";
import { Features } from "./features";
import { VibeCheckShowcase } from "./vibe-check";
import { Pricing } from "./pricing";
import { MultiCurrency } from "./multi-currency";
import { Faq } from "./faq";
import { FinalCta } from "./final-cta";
import { Footer } from "./footer";

export type LandingPageProps = {
  onEnterApp: () => void;
  onEnterAdmin: () => void;
};

export default function LandingPage({ onEnterApp, onEnterAdmin }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Nav onEnterApp={onEnterApp} onEnterAdmin={onEnterAdmin} />
      <main className="flex-1">
        <Hero onEnterApp={onEnterApp} />
        <Stats />
        <HowItWorks />
        <Features />
        <VibeCheckShowcase />
        <Pricing onEnterApp={onEnterApp} />
        <MultiCurrency />
        <Faq />
        <FinalCta onEnterApp={onEnterApp} onEnterAdmin={onEnterAdmin} />
      </main>
      <Footer />
    </div>
  );
}

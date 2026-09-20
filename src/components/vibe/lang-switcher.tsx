"use client";
// LangSwitcher — sélecteur bilingue FR/EN (contrôle segmenté compact).
// Deux tons : "default" (interfaces claires) et "onDark" (contextes
// immersifs sombres : auth, onboarding, overlays).
// Le changement est EXPLICITE : écrit le cookie de choix + persiste sur le
// compte (PATCH /me) — il écrase la langue du compte et du navigateur.
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/vibe/i18n";
import type { Lang } from "@/lib/vibe/i18n/core";
import { cn } from "@/lib/utils";

export function LangSwitcher({
  tone = "default",
  className,
  withGlobe = false,
}: {
  tone?: "default" | "onDark";
  className?: string;
  withGlobe?: boolean;
}) {
  const { lang, setLang, t } = useI18n();

  const seg = (l: Lang, label: string, title: string) => (
    <button
      key={l}
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      title={title}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-bold leading-none transition-all select-none",
        lang === l
          ? "vibe-gradient text-white shadow-sm"
          : tone === "onDark"
            ? "text-white/60 hover:text-white"
            : "text-foreground/55 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label={t("common.langSwitcherLabel")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full p-0.5 ring-1",
        tone === "onDark" ? "ring-white/25 bg-white/10 backdrop-blur-sm" : "ring-border bg-card/70",
        className,
      )}
    >
      {withGlobe && (
        <Globe className={cn("ml-1.5 h-3 w-3", tone === "onDark" ? "text-white/60" : "text-foreground/50")} aria-hidden />
      )}
      {seg("fr", "FR", "Français")}
      {seg("en", "EN", "English")}
    </div>
  );
}

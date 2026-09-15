"use client";
import { Instagram, Twitter, Coffee, Youtube } from "lucide-react";
import { VibeLogo } from "@/components/vibe/vibe-logo";

const COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Concept", href: "#concept" },
      { label: "Tarifs", href: "#tarifs" },
      { label: "Sécurité", href: "#faq" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Carrières", href: "#" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "CGU", href: "#" },
      { label: "RGPD", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.5 5.5a4.5 4.5 0 0 0 4 4.5v2.6a7.1 7.1 0 0 1-4-1.2v6.1a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.7a3 3 0 1 0 2.1 2.9V3h2.7a4.5 4.5 0 0 0 0 .5Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border/60 bg-card/40 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <VibeLogo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs text-pretty">
              Rencontre authentique par vidéo de 15s. Zéro abonnement, juste des Vibes.
              Vibrer sur la bonne fréquence, partout dans le monde.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Instagram, label: "Instagram" },
                { Icon: TikTokIcon, label: "TikTok" },
                { Icon: Youtube, label: "YouTube" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-border bg-background/60 hover:bg-vibe-gradient-soft hover:text-vibe-purple transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Vivilov. Tous droits réservés.</span>
          <span className="inline-flex items-center gap-1.5">
            Fait avec <span className="text-vibe-pink">❤️</span> et du bon café
            <Coffee className="h-3.5 w-3.5 text-vibe-orange" />
          </span>
        </div>
      </div>
    </footer>
  );
}

"use client";
// ThemeProvider — gestion du thème de l'app.
//
// Par défaut, toute l'app est en thème CLAIR (« vivi » : fond lavande/blanc,
// encre violette profonde, dégradé signature corail → violet conservé).
// Il revient à l'utilisateur d'opter pour le mode nuit (« sombre » :
// fond #09090B + composants shadcn assombris) depuis son profil — choix
// persistant, appliqué avant le premier rendu (aucun flash).
// Le funnel pré-app (accueil vidéo, auth, onboarding) reste immersif sombre
// en toutes circonstances (classe .immersive posée sur ces écrans).
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="vivi"
      enableSystem={false}
      themes={["vivi", "sombre"]}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

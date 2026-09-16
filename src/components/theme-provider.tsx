"use client";
// ThemeProvider — gestion du thème de l'app.
//
// Par défaut, toute l'app porte le thème immersif de la page d'accueil
// (« vivi » : fond #09090B, textes blancs /95→/70, dégradé signature
// corail → violet, halo #9B51E0). Il revient à l'utilisateur d'opter
// pour le mode sombre profond (« sombre » : noir pur AMOLED) depuis
// son profil — choix persistant, appliqué avant le premier rendu
// (aucun flash).
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

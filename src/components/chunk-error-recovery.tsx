"use client";
// Auto-récupération des échecs de chargement de chunks JavaScript (production).
//
// Contexte (retour utilisateur en production) :
//  - `Uncaught ChunkLoadError: Loading chunk 2703 failed (timeout)` :
//    après un nouveau déploiement Vercel, un navigateur peut servir une page
//    en cache qui référence des chunks qui n'existent plus côté serveur (404).
//  - `net::ERR_HTTP2_PING_FAILED` : sur réseau mobile instable, la connexion
//    HTTP/2 peut tomber au milieu du chargement d'un chunk.
//
// Au lieu de laisser une UI cassée (bouton sans effet, écran figé), on
// recharge la page pour récupérer les nouvelles références de chunks (le HTML
// est servi en no-store → toujours frais). Garde-fous anti-boucle :
//  - maximum 2 rechargements par fenêtre de 20 s (compteur sessionStorage,
//    remis à zéro après 20 s de stabilité) ;
//  - désactivé en développement : le HMR de Next.js gère déjà ses propres
//    rechargements et les chunks y sont transitoirement indisponibles pendant
//    les recompilations (faux positifs).
import { useEffect } from "react";

const KEY = "tiluu:chunk-reloads";
const MAX_RELOADS_PER_WINDOW = 2;
const STABLE_RESET_MS = 20000;

const CHUNK_FAILURE =
  /ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk|Failed to fetch dynamically imported module/i;

export function ChunkErrorRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // dev : HMR s'en charge

    const reloadBounded = () => {
      try {
        const count = Number(sessionStorage.getItem(KEY) ?? "0");
        if (count >= MAX_RELOADS_PER_WINDOW) return; // déjà tenté → pas de boucle
        sessionStorage.setItem(KEY, String(count + 1));
      } catch {
        return; // stockage indisponible → on ne risque aucune boucle
      }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      const msg = String(e?.message ?? "");
      if (CHUNK_FAILURE.test(msg)) reloadBounded();
    };

    // Les import() dynamiques échoués remontent en promesse rejetée.
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason: unknown = e?.reason;
      const msg = String(
        (reason as { message?: string } | null)?.message ?? reason ?? ""
      );
      if (CHUNK_FAILURE.test(msg)) reloadBounded();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    // Page stable → on relève le garde-fou pour l'échec éventuel suivant
    // (prochain déploiement, prochaine coupure réseau).
    const reset = setTimeout(() => {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* noop */
      }
    }, STABLE_RESET_MS);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearTimeout(reset);
    };
  }, []);

  return null;
}

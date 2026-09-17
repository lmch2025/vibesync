"use client";
// AppDemo — orchestrates auth gate + bottom-nav app shell.
// Full-screen experience (NO phone bezel — the phone visual lives only on
// the landing page). Content is centered in a mobile-width column.
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Heart, MessageCircle, Wallet as WalletIcon, User, ArrowLeft, Crown } from "lucide-react";
import { useVibe } from "@/lib/vibe/store";
import { AuthScreen } from "./auth-screen";
import { OnboardingFlow } from "./onboarding-flow";
import { SwipeScreen } from "./swipe-screen";
import { MatchesScreen } from "./matches-screen";
import { ChatScreen } from "./chat-screen";
import { WalletScreen } from "./wallet-screen";
import { ProfileScreen } from "./profile-screen";
import { MatchOverlay } from "./match-overlay";
import { InsufficientVibesModal } from "@/components/vibe/insufficient-vibes-modal";
import { PremiumActionsSheet } from "./premium-actions-sheet";
import { StreakReward } from "./streak-reward";
import { NotificationBell } from "./notification-bell";
import { PwaInstallPrompt } from "./pwa-install-prompt";
import { NotificationPermissionPrompt } from "./notification-permission-prompt";
import { GemBadge } from "@/components/vibe/gem-badge";
import { sfx, haptic } from "@/components/vibe/app/interactive-animations";
import { toast } from "sonner";

type Tab = "swipe" | "matches" | "wallet" | "profile";
type MatchData = {
  id: string;
  withProfile: { id: string; displayName: string; posterUrl: string; city: string };
};

export function AppDemo({ onExit }: { onExit: () => void }) {
  const me = useVibe((s) => s.me);
  const setMe = useVibe((s) => s.setMe);
  const [tab, setTab] = useState<Tab>("swipe");
  const [chatTarget, setChatTarget] = useState<{ id: string, name: string, poster: string | null } | null>(null);
  const [match, setMatch] = useState<MatchData | null>(null);
  const [booted, setBooted] = useState(() => !!useVibe.getState().me);
  const [premiumOpen, setPremiumOpen] = useState(false);

  // Hydrate session on mount — skipped if ClientHome already populated `me`
  // via the server-side cookie check (normal page-refresh flow). The fetch is
  // only triggered when AppDemo is rendered without a pre-hydrated user in the
  // store (e.g. direct navigation, future deep-links, etc.).
  useEffect(() => {
    let cancelled = false;
    // Already hydrated by ClientHome — mark as booted and skip the fetch.
    if (useVibe.getState().me) {
      if (!booted) setBooted(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/vibe/me");
        const data = await res.json();
        if (cancelled) return;
        if (data.user) {
          setMe(data.user);
          useVibe.getState().setRates(data.rates ?? {});
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setMe, booted]);

  const handleAuthSuccess = useCallback(() => {
    setTab("swipe");
  }, []);

  // Tab selector — fires the matches-refresh event so the (always-mounted)
  // MatchesScreen reloads its list instead of showing a stale empty state.
  const selectTab = useCallback((t: Tab) => {
    setTab(t);
    if (t === "matches") {
      window.dispatchEvent(new Event("vivilov:refresh-matches"));
    }
  }, []);

  // Booting — checking for an existing session.
  if (!booted) {
    return (
      <Shell>
        <div className="grid place-items-center h-full">
          <div className="relative grid place-items-center">
            {/* Anneau tournant autour du logo */}
            <span className="absolute h-14 w-14 rounded-full border-2 v-divider border-t-violet-400 animate-spin" />
            {/* Logo VS — même marque que l'AuthSplash */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center shadow-lg shadow-violet-500/30"
            >
              <span className="text-white text-base font-bold select-none">VS</span>
            </motion.div>
          </div>
        </div>
      </Shell>
    );
  }

  // Not authenticated — show the auth flow (centered card, no phone bezel).
  if (!me) {
    return (
      <div className="relative min-h-dvh grid place-items-center px-4 py-10">
        <AuthScreen onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  // Authenticated but onboarding not complete → immersive 3-step onboarding.
  if (!me.onboardingComplete) {
    return <OnboardingFlow onComplete={() => setTab("swipe")} />;
  }

  return (
    <Shell>
      {/* Contenu des onglets montés en permanence pour un affichage instantané */}
      <div className="absolute inset-0">
        <div className={tab === "swipe" ? "absolute inset-0 block" : "hidden"}>
          <SwipeScreen onOpenWallet={() => setTab("wallet")} onMatch={(m) => setMatch(m)} />
        </div>
        <div className={tab === "matches" ? "absolute inset-0 block" : "hidden"}>
          <MatchesScreen onOpenChat={(target) => setChatTarget(target)} />
        </div>
        <div className={tab === "wallet" ? "absolute inset-0 block" : "hidden"}>
          <WalletScreen onBack={() => setTab("swipe")} />
        </div>
        <div className={tab === "profile" ? "absolute inset-0 block" : "hidden"}>
          <ProfileScreen onBack={() => setTab("swipe")} />
        </div>
      </div>

      {/* Voile de transition — remonté à chaque changement d'onglet (key={tab}),
          donne l'impression que le nouvel écran « émerge » du fond. La stratégie
          hidden/block des onglets est préservée (aucun unmount). v-veil s'adapte
          au thème : discret en clair, marqué en mode nuit. */}
      <motion.div
        key={tab}
        initial={{ opacity: 0.55, scale: 1.015 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute inset-0 z-10 pointer-events-none v-veil backdrop-blur-[2px]"
      />

      {/* Écran de chat en superposition */}
      <AnimatePresence>
        {chatTarget && (
          <motion.div 
            key={`chat-${chatTarget.id}`} 
            initial={{ opacity: 0, x: 30 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 30 }} 
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute inset-0 z-20 v-bg-app"
          >
            <ChatScreen 
              matchId={chatTarget.id}
              initialName={chatTarget.name}
              initialPoster={chatTarget.poster}
              onBack={() => setChatTarget(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom nav (hidden in chat) — safe-area iOS/Android respectée :
          la barre reste entièrement visible au-dessus de la barre système,
          et v-fade-bottom fond la nav dans le fond de l'app (clair ou nuit). */}
      {!chatTarget && (
        <div className="absolute bottom-0 inset-x-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 v-fade-bottom pointer-events-none">
          <div className="mx-3 rounded-2xl v-glass flex items-center justify-around p-1.5 pointer-events-auto shadow-lg">
            <NavBtn icon={<Heart className="h-5 w-5" />} label="Découvrir" active={tab === "swipe"} onClick={() => selectTab("swipe")} />
            <NavBtn icon={<MessageCircle className="h-5 w-5" />} label="Matchs" active={tab === "matches"} onClick={() => selectTab("matches")} />
            <NavBtn icon={<WalletIcon className="h-5 w-5" />} label="Boutique" active={tab === "wallet"} onClick={() => selectTab("wallet")} />
            <NavBtn icon={<User className="h-5 w-5" />} label="Profil" active={tab === "profile"} onClick={() => selectTab("profile")} />
          </div>
        </div>
      )}

      <MatchOverlay
        match={match}
        myPoster={me.profile?.posterUrl}
        onClose={() => setMatch(null)}
        onMessage={(target) => {
          setMatch(null);
          setChatTarget(target);
          selectTab("matches");
        }}
      />

      <InsufficientVibesHandler
        onGoWallet={() => {
          setChatTarget(null);
          setMatch(null);
          setPremiumOpen(false);
          setTab("wallet");
        }}
      />

      {/* Streak indicator + premium actions — only when not in chat */}
      {!chatTarget && (
        <>
          <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
            <StreakReward />
            <NotificationBell />
            <motion.button
              onClick={() => { sfx.play("pop"); haptic(8); setPremiumOpen(true); }}
              whileTap={{ scale: 0.92 }}
              animate={{
                boxShadow: [
                  "0 0 0px oklch(0.6 0.25 295 / 0)",
                  "0 0 16px oklch(0.6 0.25 295 / 0.45)",
                  "0 0 0px oklch(0.6 0.25 295 / 0)",
                ],
              }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-1 rounded-full vibe-gradient px-2.5 py-1 text-[10px] font-bold text-white"
            >
              <Crown className="h-3 w-3" /> Premium
            </motion.button>
          </div>
          <PremiumActionsSheet
            open={premiumOpen}
            onOpenChange={setPremiumOpen}
            category="all"
          />
        </>
      )}

      {/* PWA install prompt + notification permission — once per session */}
      <PwaInstallPrompt />
      <NotificationPermissionPrompt />
    </Shell>
  );
}

/// Renders the InsufficientVibesModal bound to the store. Handles the purchase
/// flow: buys the recommended pack, then runs the pending proceed callback so
/// the original premium action completes automatically after refill.
function InsufficientVibesHandler({ onGoWallet }: { onGoWallet: () => void }) {
  const insufficient = useVibe((s) => s.insufficient);
  const closeInsufficient = useVibe((s) => s.closeInsufficient);
  const setMe = useVibe((s) => s.setMe);
  const patchMe = useVibe((s) => s.patchMe);
  const me = useVibe((s) => s.me);

  async function buyPack(packId: string) {
    try {
      const res = await fetch("/api/vibe/gems/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId, currency: me?.currency ?? "XAF" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      patchMe({ gems: data.gems, freeGems: data.freeGems });
      toast.success(`+${data.added} Vibes ajoutées ! 💎`);
      // Run the pending premium action now that balance is sufficient.
      const proceed = insufficient?.pendingProceed;
      closeInsufficient();
      if (proceed) setTimeout(proceed, 300);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
  }

  if (!insufficient) return null;
  return (
    <InsufficientVibesModal
      open={insufficient.open}
      onOpenChange={(o) => { if (!o) closeInsufficient(); }}
      needed={insufficient.needed}
      have={insufficient.have}
      actionLabel={insufficient.actionLabel}
      onBuyPack={buyPack}
      onViewAllPacks={onGoWallet}
    />
  );
}

/// Full-screen app shell — NO phone bezel. Centers content in a mobile-width
/// column on an ambient background. Hauteurs en dvh : le contenu tient dans
/// le viewport visible (barre d'URL mobile maintenue fixe, pas de scroll).
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh overflow-hidden flex flex-col items-center v-bg-page">
        {/* ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="v-ambient-orb absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
          <div className="v-ambient-orb absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
        </div>

        {/* Mobile-width column — full height, no phone bezel */}
        <div className="relative z-10 w-full max-w-md h-dvh flex-1 flex flex-col v-bg-app shadow-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </MotionConfig>
  );
}

function NavBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={() => {
        sfx.play("pop");
        haptic(8);
        onClick();
      }}
      whileTap={{ scale: 0.88 }}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition relative ${
        active ? "text-white" : "v-fg-muted"
      }`}
    >
      {active && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl vibe-gradient opacity-90 -z-10" />
      )}
      {icon}
      <span className="text-[9px] font-medium">{label}</span>
    </motion.button>
  );
}

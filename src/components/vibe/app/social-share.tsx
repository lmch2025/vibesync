"use client";
// SocialShare — marketing prompt shown AFTER a user opens a received gift.
// Encourages them to share their joy on social media. The premium OG-style
// preview card makes the shared post look beautiful and on-brand, so users
// actually WANT to share it. Ultra-intuitive for a non-digital audience:
// big round share buttons with clear labels, one-tap actions, toast feedback.
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Link2, MessageCircle, Send, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { VibeLogo } from "@/components/vibe/vibe-logo";
import { useI18n } from "@/lib/vibe/i18n";
import { toast } from "sonner";
import { vibeToast } from "./center-feedback";

export default function SocialShare({
  open,
  onOpenChange,
  giftEmoji,
  giftName,
  fromName,
  valueLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  giftEmoji: string;
  giftName: string;
  fromName: string;
  valueLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const shareUrl = "https://tiluu.com";
  const shareText = t("wallet.share.text", { name: fromName, gift: giftName });

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
    vibeToast({ emoji: "📤", title: t("wallet.share.sharedOn", { platform: "WhatsApp" }) });
    onOpenChange(false);
  }

  function handleFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
    vibeToast({ emoji: "📤", title: t("wallet.share.sharedOn", { platform: "Facebook" }) });
    onOpenChange(false);
  }

  function handleTwitter() {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer"
    );
    vibeToast({ emoji: "📤", title: t("wallet.share.sharedOn", { platform: "Twitter" }) });
    onOpenChange(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      vibeToast({ emoji: "🔗", title: t("wallet.share.linkCopied") });
      setTimeout(() => setCopied(false), 1800);
      onOpenChange(false);
    } catch {
      toast.error(t("wallet.share.copyError"));
    }
  }

  const buttons = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      color: "bg-[#25D366]",
      icon: <MessageCircle className="h-5 w-5" />,
      onClick: handleWhatsApp,
    },
    {
      key: "facebook",
      label: "Facebook",
      color: "bg-[#1877F2]",
      icon: <Share2 className="h-5 w-5" />,
      onClick: handleFacebook,
    },
    {
      key: "twitter",
      label: "Twitter / X",
      color: "bg-black",
      icon: <Send className="h-5 w-5" />,
      onClick: handleTwitter,
    },
    {
      key: "copy",
      label: copied ? t("wallet.share.copied") : t("wallet.share.copyLink"),
      color: "bg-primary",
      icon: copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />,
      onClick: handleCopy,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 gap-0 overflow-hidden rounded-3xl v-divider v-bg-app! v-fg">
        {/* Header — vibe-gradient with floating gift emoji */}
        <div className="relative vibe-gradient px-6 pt-8 pb-8 overflow-hidden text-center">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full v-surface-3 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

          {/* Floating gift emoji (gentle y loop) */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -6, 0],
            }}
            transition={{
              scale: { type: "spring", stiffness: 220, damping: 14 },
              opacity: { duration: 0.3 },
              y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative inline-block text-6xl leading-none drop-shadow-lg"
            aria-hidden
          >
            {giftEmoji}
          </motion.div>

          <DialogTitle className="relative font-display text-2xl font-bold text-white mt-3">
            {t("wallet.share.receivedTitle", { gift: giftName })}
          </DialogTitle>
          <DialogDescription className="relative text-white/85 text-sm mt-1">
            {t("wallet.share.fromLine", { name: fromName, value: valueLabel })}
          </DialogDescription>
        </div>

        {/* Body */}
        <div className="v-bg-app px-5 py-5">
          {/* Section label */}
          <p className="text-xs font-semibold v-fg-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5 text-primary" /> {t("wallet.share.previewLabel")}
          </p>

          {/* Premium OG-style preview card — what the shared post will look like */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="rounded-2xl ring-1 ring-[var(--v-divider)] v-surface-1 overflow-hidden shadow-sm"
          >
            {/* Preview image area: gift emoji large on gradient bg (no real OG image) */}
            <div className="relative aspect-[1.91/1] vibe-gradient overflow-hidden">
              <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full v-surface-3 blur-xl" />
              <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-black/10 blur-xl" />
              <div className="absolute inset-0 grid place-items-center">
                <motion.span
                  initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 12 }}
                  className="text-6xl drop-shadow-lg"
                  aria-hidden
                >
                  {giftEmoji}
                </motion.span>
              </div>
              <div className="absolute bottom-2 left-3 text-white/85 text-[10px] font-medium tracking-wide">
                {t("wallet.share.previewBadge")}
              </div>
            </div>

            {/* Meta block */}
            <div className="px-3.5 py-3">
              <div className="mb-1.5">
                <VibeLogo className="scale-90 origin-left [&_span:last-child]:v-fg" />
              </div>
              <p className="font-semibold text-sm v-fg leading-snug line-clamp-2">
                {t("wallet.share.previewTitle", { name: fromName })}
              </p>
              <p className="text-xs v-fg-muted leading-snug mt-1 line-clamp-2">
                {t("wallet.share.previewDesc")}
              </p>
              {/* Fake URL bar */}
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] v-fg-muted">
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">tiluu.com</span>
              </div>
            </div>
          </motion.div>

          {/* Share buttons — stagger entrance */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {buttons.map((b, i) => (
              <motion.button
                key={b.key}
                initial={{ opacity: 0, y: 12, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 0.2 + i * 0.07,
                  type: "spring",
                  stiffness: 280,
                  damping: 18,
                }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                onClick={b.onClick}
                className="flex flex-col items-center gap-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
                aria-label={b.label}
              >
                <span
                  className={`grid place-items-center h-12 w-12 rounded-full text-white ring-1 ring-white/30 shadow-md transition-shadow group-hover:shadow-lg ${b.color}`}
                >
                  {b.icon}
                </span>
                <span className="text-[10.5px] font-medium v-fg-muted text-center leading-tight max-w-[68px] line-clamp-2">
                  {b.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Marketing CTA */}
          <p className="mt-5 text-center text-sm v-fg-muted leading-relaxed">
            {t("wallet.share.cta")}
          </p>

          {/* Dismiss */}
          <button
            onClick={() => onOpenChange(false)}
            className="mt-3 w-full h-10 rounded-2xl bg-transparent ring-1 ring-[var(--v-divider)] v-fg-muted hover:v-fg hover:v-surface-2 text-sm font-medium flex items-center justify-center gap-1.5 transition"
          >
            <Clock className="h-4 w-4" /> {t("wallet.later")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

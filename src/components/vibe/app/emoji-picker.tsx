"use client";
// EmojiPicker — bottom sheet emoji picker for the Tiluu chat screen.
// 84 themed emojis across 5 categories (love / expressions / flirt / food / travel).
// Mobile-first, dark glassy sheet, spring slide-up, drag-handle to dismiss,
// gradient active-tab pill, tap-to-insert with haptic active:scale-90.
import { useState } from "react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useI18n } from "@/lib/vibe/i18n";

type EmojiCategory = {
  id: string;
  // Clé i18n du label (dictionnaire chat.*) — le libellé dépend de la langue.
  labelKey: string;
  emojis: string[];
};

const CATEGORIES: EmojiCategory[] = [
  {
    id: "love",
    labelKey: "chat.emoji.cat.love",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💖", "💗", "💓", "💞", "💕", "💟", "❣️",
      "💔", "❤️‍🔥", "💋", "💑", "💏", "💝",
    ],
  },
  {
    id: "expressions",
    labelKey: "chat.emoji.cat.expressions",
    emojis: [
      "😊", "😍", "🥰", "😘", "😏", "😜", "🤭", "😇",
      "🤗", "🙃", "😎", "🤩", "😚", "😋", "🤤", "😳",
      "🥺", "😴", "🤔", "💭",
    ],
  },
  {
    id: "flirt",
    labelKey: "chat.emoji.cat.flirt",
    emojis: [
      "😉", "🔥", "✨", "💫", "⚡", "🌟", "💯", "🎉",
      "🥳", "🤪", "😈", "👅", "🤤", "🙈",
    ],
  },
  {
    id: "food",
    labelKey: "chat.emoji.cat.food",
    emojis: [
      "🍷", "🍸", "🍹", "🍫", "🍓", "🍒", "🍰", "🧁",
      "☕", "🥂", "🍕", "🍔", "🍣", "🍦",
    ],
  },
  {
    id: "travel",
    labelKey: "chat.emoji.cat.travel",
    emojis: [
      "✈️", "🏖️", "🌅", "🌃", "🎬", "🎭", "🎡", "🏔️",
      "🚗", "🌹", "🌸", "🌺", "🚀", "🗺️",
    ],
  },
];

const TOTAL_EMOJIS = CATEGORIES.reduce((sum, c) => sum + c.emojis.length, 0); // 84

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const { t } = useI18n();
  const [activeIdx, setActiveIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const active = CATEGORIES[activeIdx];
  const dragControls = useDragControls();

  function close() {
    if (closing) return;
    setClosing(true);
    // wait for the slide-down exit animation to finish before unmounting
    window.setTimeout(() => onClose(), 260);
  }

  function handleSelect(emoji: string) {
    if (closing) return;
    onSelect(emoji);
    close();
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 90 || info.velocity.y > 480) {
      close();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <AnimatePresence>
        {!closing && (
          <motion.button
            key="emoji-backdrop"
            type="button"
            aria-label={t("chat.emoji.closeAria")}
            onClick={close}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet */}
      <AnimatePresence>
        {!closing && (
          <motion.div
            key="emoji-sheet"
            className="relative w-full max-w-md v-surface-solid ring-1 ring-[var(--v-divider)] rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: "55vh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* Drag handle (also the drag-start target) */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex flex-col items-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="h-1.5 w-12 rounded-full v-surface-3" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold v-fg tracking-tight">{t("chat.emoji.title")}</h2>
                <span className="text-[11px] v-fg-muted font-medium">
                  {t("chat.emoji.pickVibe")} · {TOTAL_EMOJIS}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t("common.close")}
                className="h-8 w-8 grid place-items-center rounded-full v-surface-1 v-fg-muted hover:v-surface-2 hover:v-fg active:scale-90 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="px-3 pb-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat, i) => {
                  const isActive = i === activeIdx;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      aria-pressed={isActive}
                      className={`relative shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                        isActive ? "text-white" : "v-fg-muted hover:v-fg"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="emoji-tab-pill"
                          className="absolute inset-0 rounded-full vibe-gradient -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      {t(cat.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emoji grid (scrollable, fades between categories) */}
            <div className="px-3 pb-4 pt-1 overflow-y-auto scrollbar-vibe min-h-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="grid grid-cols-8 gap-1"
                >
                  {active.emojis.map((emoji, idx) => (
                    <motion.button
                      key={`${active.id}-${idx}-${emoji}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      whileTap={{ scale: 0.85 }}
                      transition={{ type: "spring", stiffness: 600, damping: 22 }}
                      className="h-9 w-9 grid place-items-center rounded-lg text-xl leading-none hover:v-surface-2 active:scale-90 transition-colors"
                      aria-label={t("chat.emoji.insert", { emoji })}
                    >
                      <span className="leading-none select-none">{emoji}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

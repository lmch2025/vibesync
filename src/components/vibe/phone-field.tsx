"use client";
// PhoneField — champ téléphone unique où l'indicatif pays fait partie
// INTÉGRANTE du champ : chip « 🇨🇲 +237 ▾ » à gauche (ouvre le sélecteur),
// séparateur vertical subtil, puis input du numéro LOCAL à droite.
// Partagé entre la modale d'auth du landing (auth-modal.tsx) et l'écran
// d'auth in-app (app/auth-screen.tsx) — style immersif sombre h-12 rounded-2xl.
//
// AUCUNE logique métier ici : l'appelant construit le numéro complet
// (`country.dial + local`). Le composant gère en revanche toute l'UX du choix
// du pays :
//  • résolution initiale : dernier choix du visiteur (localStorage) >
//    GET /api/vibe/detect (x-vercel-ip-country) > valeur fournie par l'appelant ;
//  • persistance du choix à chaque sélection explicite ;
//  • sélecteur mondial (250 pays de GEO_COUNTRIES) avec recherche insensible
//    au nom FR, au nom EN, à l'ISO et à l'indicatif.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/lib/vibe/i18n";
import {
  GEO_COUNTRIES,
  countryNameLocalized,
  flagEmoji,
  getCountry,
  type GeoCountry,
} from "@/lib/vibe/geo/countries";
import { haptic, sfx } from "@/components/vibe/app/interactive-animations";

/// Valeur contrôlée : pays sélectionné + numéro LOCAL (sans indicatif).
export type PhoneFieldValue = { country: GeoCountry; local: string };

/// localStorage — dernier pays explicitement choisi par ce visiteur
/// (prime sur toute détection géo à la visite suivante).
const STORAGE_KEY = "vibesync_phone_country";

/// Détection géo mémoïsée au niveau module : UN SEUL appel à
/// /api/vibe/detect par chargement de page, même si le champ est
/// démonté/remonté (retour arrière entre les étapes d'auth par exemple).
let detectPromise: Promise<{ country?: string }> | null = null;
function detectCountry(): Promise<{ country?: string }> {
  detectPromise ??= fetch("/api/vibe/detect")
    .then((r) => r.json())
    .catch(() => ({}) as { country?: string });
  return detectPromise;
}

export function PhoneField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  onEnter,
}: {
  value: PhoneFieldValue;
  onChange: (v: PhoneFieldValue) => void;
  /// Placeholder du numéro local (ex « 6 12 34 56 78 »).
  placeholder?: string;
  /// Accessibilité du champ numéro (défaut : le placeholder).
  ariaLabel?: string;
  /// Appelé quand l'utilisateur presse Entrée dans le champ numéro —
  /// laisse l'appelant soumettre son flux (check-phone…) au clavier.
  onEnter?: () => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  /// true dès que le pays a été choisi à la main dans CETTE session :
  /// la détection asynchrone initiale ne doit jamais écraser un choix humain.
  const touchedRef = useRef(false);

  /// Dernières props vues — l'effet de résolution initiale (montage seul)
  /// doit agir sur l'état à jour (numéro déjà tapé ?) sans se ré-exécuter
  /// et sans lire/écrire de ref pendant le rendu.
  const latestRef = useRef({ value, onChange });
  useEffect(() => {
    latestRef.current = { value, onChange };
  });

  /// Résolution du pays initial — UNE fois par montage :
  /// localStorage (visite précédente) > détection géo > rien (l'appelant
  /// garde sa valeur par défaut). Ne touche jamais au numéro local.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* mode privé — équivalent absent */
    }
    const remembered = stored ? getCountry(stored) : null;
    if (remembered) {
      // Le choix d'une visite précédent prime sur toute détection.
      if (remembered.iso !== latestRef.current.value.country.iso) {
        latestRef.current.onChange({
          country: remembered,
          local: latestRef.current.value.local,
        });
      }
      return;
    }
    let cancelled = false;
    detectCountry().then((d) => {
      if (cancelled || touchedRef.current) return;
      const detected = getCountry(d?.country);
      const cur = latestRef.current.value;
      if (detected && detected.iso !== cur.country.iso) {
        latestRef.current.onChange({ country: detected, local: cur.local });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /// Lignes du sélecteur — recalculées uniquement quand la langue change.
  /// La recherche porte sur le nom FR + le nom EN + l'ISO + l'indicatif.
  const rows = useMemo(
    () =>
      GEO_COUNTRIES.map((c) => ({
        c,
        name: countryNameLocalized(c.iso, lang),
        search: `${countryNameLocalized(c.iso, "fr")} ${countryNameLocalized(c.iso, "en")} ${c.iso} ${c.dial}`,
      })),
    [lang],
  );

  function selectCountry(c: GeoCountry) {
    setOpen(false);
    if (c.iso === value.country.iso) return;
    touchedRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, c.iso);
    } catch {
      /* mode privé — le choix ne survivra pas à la session */
    }
    onChange({ country: c, local: value.local });
    sfx.play("pop");
    haptic(6);
  }

  return (
    <div className="flex h-12 items-stretch rounded-2xl border border-white/15 bg-white/5 text-white transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("auth.chooseCountry")}
            className="m-1 flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-white transition hover:bg-white/10 active:scale-95"
          >
            <span className="text-xl leading-none">{flagEmoji(value.country.iso)}</span>
            <span className="tabular-nums">{value.country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/70" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="immersive w-[280px] p-0 border-white/10 v-bg-app! text-white"
          align="start"
        >
          <Command className="[&_[data-slot=command-input-wrapper]]:border-white/10 [&_[data-slot=command-input-wrapper]_svg]:text-white/50 [&_[data-slot=command-input]]:text-white [&_[data-slot=command-input]]:placeholder:text-white/50">
            <CommandInput placeholder={t("auth.searchCountry")} />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>{t("auth.noCountry")}</CommandEmpty>
              <CommandGroup>
                {rows.map(({ c, name, search }) => (
                  <CommandItem
                    key={c.iso}
                    value={search}
                    onSelect={() => selectCountry(c)}
                    className="gap-2.5 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                  >
                    <span className="text-xl leading-none">{flagEmoji(c.iso)}</span>
                    <span className="flex-1 truncate">{name}</span>
                    <span className="text-sm tabular-nums text-white/70">{c.dial}</span>
                    {c.iso === value.country.iso && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {/* Séparateur vertical subtil entre le chip pays et le numéro. */}
      <div aria-hidden="true" className="my-2.5 shrink-0 border-l border-white/15" />
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        value={value.local}
        onChange={(e) => onChange({ country: value.country, local: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-white/50"
      />
    </div>
  );
}

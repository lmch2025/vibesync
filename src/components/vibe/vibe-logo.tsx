"use client";
import { useId } from "react";
import { cn } from "@/lib/utils";

// Logo Tiluu — piste Nº7 « Infini » validée par le propriétaire : deux cœurs
// DEBOUT (pointes en bas, double sillon vers le haut), inclinés en miroir et
// entrelacés aux deux croisements, formant un signe ∞ parfait — sur pastille
// squircle en dégradé de marque (ambre → magenta).
//
// SVG inline plutôt qu'image : net à toutes les tailles, zéro requête réseau,
// couleurs pilotées par le code. Les ids <defs> sont préfixés par useId()
// (nettoyé des « : » de React) pour rester uniques même avec plusieurs
// instances du logo dans une même page (nav + footer + modale…).
const HEART_PATH =
  "M256 404 C170 346 96 292 96 214 C96 146 138 108 186 108 C202 108 212 111 220 118 C234 130 246 150 256 166 C266 150 278 130 292 118 C300 111 310 108 326 108 C374 108 416 146 416 214 C416 292 342 346 256 404 Z";
const T_LEFT = "translate(198.7 260) rotate(-16) scale(0.74) translate(-256 -256)";
const T_RIGHT = "translate(313.3 260) rotate(16) scale(0.74) translate(-256 -256)";

export function VibeLogo({ className, withText = true }: { className?: string; withText?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gA = `tl${uid}a`;
  const cT = `tl${uid}ct`;
  const cB = `tl${uid}cb`;
  const mL = `tl${uid}ml`;
  const mR = `tl${uid}mr`;
  const cTUrl = `url(#${cT})`;
  const cBUrl = `url(#${cB})`;

  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <svg
        viewBox="0 0 512 512"
        width={36}
        height={36}
        role="img"
        aria-label="Logo Tiluu"
        className="shrink-0 drop-shadow-md"
      >
        <defs>
          {/* Pastille squircle : dégradé vertical ambre → magenta */}
          <linearGradient id={gA} x1="256" y1="16" x2="256" y2="496" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FF8A5D" />
            <stop offset="1" stopColor="#E0449C" />
          </linearGradient>
          {/* Demi-plans pour l'entrelacement dessus/dessous du ∞ */}
          <clipPath id={cT}>
            <rect x="0" y="0" width="512" height="256" />
          </clipPath>
          <clipPath id={cB}>
            <rect x="0" y="256" width="512" height="256" />
          </clipPath>
          {/* Couloirs de masque (halo 30) : le trait d'un cœur passe SOUS
              l'épaule de l'autre aux croisements, sans couture médiane */}
          <mask id={mL} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <rect width="512" height="512" fill="#fff" />
            <path d={HEART_PATH} transform={T_RIGHT} fill="none" stroke="#000" strokeWidth="30" />
          </mask>
          <mask id={mR} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <rect width="512" height="512" fill="#fff" />
            <path d={HEART_PATH} transform={T_LEFT} fill="none" stroke="#000" strokeWidth="30" />
          </mask>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="110" fill={`url(#${gA})`} />
        <g clipPath={cTUrl}>
          <path d={HEART_PATH} transform={T_LEFT} fill="none" stroke="#FFF9F7" strokeWidth="24" strokeLinejoin="round" mask={`url(#${mL})`} />
          <path d={HEART_PATH} transform={T_RIGHT} fill="none" stroke="#FFF9F7" strokeWidth="24" strokeLinejoin="round" />
        </g>
        <g clipPath={cBUrl}>
          <path d={HEART_PATH} transform={T_RIGHT} fill="none" stroke="#FFF9F7" strokeWidth="24" strokeLinejoin="round" mask={`url(#${mR})`} />
          <path d={HEART_PATH} transform={T_LEFT} fill="none" stroke="#FFF9F7" strokeWidth="24" strokeLinejoin="round" />
        </g>
      </svg>
      {withText && (
        <span className="font-serif font-light text-2xl tracking-widest lowercase flex items-center">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">Til</span>
          <span className="text-foreground">uu</span>
        </span>
      )}
    </span>
  );
}

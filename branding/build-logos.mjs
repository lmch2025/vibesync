#!/usr/bin/env bun
/**
 * Tiluu — Générateur d'identité visuelle (source unique de vérité)
 * ------------------------------------------------------------------
 * Produit :
 *   1. public/logos.html                       → galerie de choix (autonome, inline)
 *   2. public/branding/logos/*-icon.svg        → icône app carrée 512 (squircle + fond)
 *   3. public/branding/logos/*-glyph.svg       → glyphe transparent (pour lockups)
 *
 * Usage : bun branding/build-logos.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_HTML = join(ROOT, "public", "logos.html");
const OUT_DIR = join(ROOT, "public", "branding", "logos");

/* ------------------------------------------------------------------ */
/* Briques partagées                                                    */
/* ------------------------------------------------------------------ */

// Cœur canonique — 320×304, centré (256, 256), pointe douce, lobes pleins
const HEART =
  "M256 408 C160 344 96 288 96 206 C96 142 142 104 196 104 C228 104 246 122 256 144 " +
  "C266 122 284 104 316 104 C370 104 416 142 416 206 C416 288 352 344 256 408 Z";

// Étincelle 4 branches, flancs concaves
const SPARK =
  "M0 -1 C.1 -.32 .32 -.1 1 0 C.32 .1 .1 .32 0 1 C-.1 .32 -.32 .1 -1 0 " +
  "C-.32 -.1 -.1 -.32 0 -1 Z";

const heartAt = (cx, cy, s, attrs = "") =>
  `<path d="${HEART}" transform="translate(${cx} ${cy}) scale(${s}) translate(-256 -256)" ${attrs}/>`;
const sparkAt = (cx, cy, s, attrs = "") =>
  `<path d="${SPARK}" transform="translate(${cx} ${cy}) scale(${s})" ${attrs}/>`;

// Cœur optimisé pour le tracé en contour : creux élargi et plus ouvert
// (le cœur canonique a un creux trop serré qui se bouche en stroke épais)
const HEART_S =
  "M256 404 C170 346 96 292 96 214 C96 146 138 108 186 108 C202 108 212 111 220 118 " +
  "C234 130 246 150 256 166 C266 150 278 130 292 118 C300 111 310 108 326 108 " +
  "C374 108 416 146 416 214 C416 292 342 346 256 404 Z";

// Nº7 Infini — deux cœurs couchés (pointes vers l'extérieur, creux au centre)
// formant le signe ∞, entrelacés dessus-dessous aux deux croisements
const HS_L = 172.5, HS_R = 339.5, HS_S = 0.62;
const heartS7 = (side, attrs) =>
  `<path d="${HEART_S}" transform="translate(${side === "L" ? HS_L : HS_R} 256) rotate(${side === "L" ? 90 : -90}) scale(${HS_S}) translate(-256 -256)" ${attrs}/>`;
const weave7 = (sL, sR) =>
  `<g clip-path="url(#c7t)">` +
  heartS7("L", `fill="none" stroke="${sL}" stroke-width="24" stroke-linejoin="round" mask="url(#m7l)"`) +
  heartS7("R", `fill="none" stroke="${sR}" stroke-width="24" stroke-linejoin="round"`) +
  `</g>` +
  `<g clip-path="url(#c7b)">` +
  heartS7("R", `fill="none" stroke="${sR}" stroke-width="24" stroke-linejoin="round" mask="url(#m7r)"`) +
  heartS7("L", `fill="none" stroke="${sL}" stroke-width="24" stroke-linejoin="round"`) +
  `</g>`;

const lg = (id, x1, y1, x2, y2, stops) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse">` +
  stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("") +
  `</linearGradient>`;

const IVORY = "#FFF9F7";

/* ------------------------------------------------------------------ */
/* Les 15 logos                                                         */
/* ------------------------------------------------------------------ */

const LOGOS = [
  {
    num: 1, id: "pulse", name: "Pulse", tag: "Signal",
    desc: "Un cœur traversé par une pulsation — le rythme d'une rencontre. Sobriété du geste, émotion immédiate.",
    chips: ["#F23D6E", "#FF8A5D", IVORY],
    bg: "url(#g1a)",
    defs:
      lg("g1a", 256, 16, 256, 496, [[0, "#F23D6E"], [1, "#FF8A5D"]]) +
      lg("g1b", 256, 104, 256, 408, [[0, "#F23D6E"], [1, "#FF8A5D"]]) +
      `<mask id="m1a" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<path d="${HEART}" fill="#fff"/>` +
      `<path d="M150 254 H214 L242 198 L274 310 L300 254 H362" fill="none" stroke="#000" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</mask>`,
    icon: `<path d="${HEART}" fill="${IVORY}" mask="url(#m1a)"/>`,
    glyph: `<path d="${HEART}" fill="url(#g1b)" mask="url(#m1a)"/>`,
  },
  {
    num: 2, id: "accord", name: "Accord", tag: "Duo",
    desc: "Un même cœur tracé par deux mains : deux personnes, deux dégradés, un seul battement.",
    chips: ["#FF5E93", "#E0449C", "#A558E0"],
    bg: IVORY,
    defs:
      lg("g2l", 108, 396, 256, 116, [[0, "#FF5E93"], [1, "#F23D6E"]]) +
      lg("g2r", 256, 116, 404, 396, [[0, "#E0449C"], [1, "#A558E0"]]),
    icon:
      `<path d="M256 396 C194 350 116 292 108 214 C102 152 148 116 196 116 C230 116 248 132 256 154" fill="none" stroke="url(#g2l)" stroke-width="40" stroke-linecap="round"/>` +
      `<path d="M256 396 C318 350 396 292 404 214 C410 152 364 116 316 116 C282 116 264 132 256 154" fill="none" stroke="url(#g2r)" stroke-width="40" stroke-linecap="round"/>`,
    glyph: null, // identique à icon
  },
  {
    num: 3, id: "monogramme", name: "Monogramme", tag: "Lettrine",
    desc: "Le T de Tiluu gravé comme un sceau, avec un cœur en creux — la marque réduite à l'essentiel.",
    chips: ["#A558E0", "#E0449C", IVORY],
    bg: "url(#g3a)",
    defs: lg("g3a", 140, 120, 380, 410, [[0, "#A558E0"], [1, "#E0449C"]]),
    icon:
      `<path fill-rule="evenodd" fill="${IVORY}" d="M124 130 L388 130 L388 216 L299 216 L299 380 C299 400 280 412 256 412 C232 412 213 400 213 380 L213 216 L124 216 Z ` +
      `M256 350.4 C236.8 337.6 224 326.4 224 310 C224 297.2 233.2 289.6 244 289.6 C250.4 289.6 254 293.2 256 297.6 ` +
      `C258 293.2 261.6 289.6 268 289.6 C278.8 289.6 288 297.2 288 310 C288 326.4 275.2 337.6 256 350.4 Z"/>`,
    glyph:
      `<path fill-rule="evenodd" fill="url(#g3a)" d="M124 130 L388 130 L388 216 L299 216 L299 380 C299 400 280 412 256 412 C232 412 213 400 213 380 L213 216 L124 216 Z ` +
      `M256 350.4 C236.8 337.6 224 326.4 224 310 C224 297.2 233.2 289.6 244 289.6 C250.4 289.6 254 293.2 256 297.6 ` +
      `C258 293.2 261.6 289.6 268 289.6 C278.8 289.6 288 297.2 288 310 C288 326.4 275.2 337.6 256 350.4 Z"/>`,
  },
  {
    num: 4, id: "orbite", name: "Orbite", tag: "Cosmique",
    desc: "Deux astres sur la même orbite, à un souffle de se rencontrer. L'élégance de la mécanique céleste.",
    chips: ["#FF5E93", "#A558E0", "#FF8A5D"],
    bg: IVORY,
    defs:
      lg("g4a", 96, 256, 416, 256, [[0, "#FF5E93"], [1, "#A558E0"]]) +
      lg("g4b", 365, 146, 450, 231, [[0, "#FF5E93"], [1, "#FF8A5D"]]),
    icon:
      `<ellipse cx="256" cy="256" rx="166" ry="98" transform="rotate(-24 256 256)" fill="none" stroke="url(#g4a)" stroke-width="30"/>` +
      `<circle cx="407.6" cy="188.5" r="42" fill="url(#g4b)"/>` +
      `<circle cx="104.4" cy="323.5" r="32" fill="#A558E0"/>`,
    glyph: null,
  },
  {
    num: 5, id: "echo", name: "Écho", tag: "Ondes",
    desc: "Ton cœur émet, le monde répond : un signal doux qui se propage, comme une vibe.",
    chips: ["#E0449C", "#FF5E93", IVORY],
    bg: "url(#g5a)",
    defs:
      lg("g5a", 256, 16, 256, 496, [[0, "#E0449C"], [1, "#FF5E93"]]) +
      lg("g5b", 96, 256, 416, 256, [[0, "#A558E0"], [1, "#E0449C"]]),
    icon:
      heartAt(256, 260, 0.46, `fill="${IVORY}"`) +
      `<path d="M333.1 164.1 A120 120 0 1 0 347.9 333.1" fill="none" stroke="${IVORY}" stroke-width="24" stroke-linecap="round" opacity="0.95"/>` +
      `<path d="M370.5 119.7 A178 178 0 1 0 392.3 370.5" fill="none" stroke="${IVORY}" stroke-width="24" stroke-linecap="round" opacity="0.65"/>`,
    glyph:
      heartAt(256, 260, 0.46, `fill="url(#g5b)"`) +
      `<path d="M333.1 164.1 A120 120 0 1 0 347.9 333.1" fill="none" stroke="url(#g5a)" stroke-width="24" stroke-linecap="round"/>` +
      `<path d="M370.5 119.7 A178 178 0 1 0 392.3 370.5" fill="none" stroke="url(#g5a)" stroke-width="24" stroke-linecap="round" opacity="0.65"/>`,
  },
  {
    num: 6, id: "frequence", name: "Fréquence", tag: "Audio",
    desc: "Une égalisation dont la courbe dessine un cœur : ta fréquence amoureuse, mise en ondes.",
    chips: ["#FF5E93", "#E0449C", "#A558E0"],
    bg: IVORY,
    defs: lg("g6a", 59, 256, 453, 256, [[0, "#FF5E93"], [0.5, "#E0449C"], [1, "#A558E0"]]),
    icon:
      `<g fill="url(#g6a)">` +
      `<rect x="59" y="276" width="26" height="116" rx="13"/><rect x="105" y="184" width="26" height="208" rx="13"/>` +
      `<rect x="151" y="244" width="26" height="148" rx="13"/><rect x="197" y="196" width="26" height="196" rx="13"/>` +
      `<rect x="243" y="304" width="26" height="88" rx="13"/><rect x="289" y="196" width="26" height="196" rx="13"/>` +
      `<rect x="335" y="244" width="26" height="148" rx="13"/><rect x="381" y="184" width="26" height="208" rx="13"/>` +
      `<rect x="427" y="276" width="26" height="116" rx="13"/></g>` +
      heartAt(256, 238, 0.15, `fill="#E0449C"`),
    glyph: null,
  },
  {
    num: 7, id: "infini", name: "Infini", tag: "Lien",
    desc: "Deux cœurs entrelacés qui tracent le signe de l'infini : deux personnes, une seule trajectoire sans fin.",
    chips: ["#FF8A5D", "#E0449C", "#A558E0"],
    bg: "url(#g7a)",
    defs:
      lg("g7a", 256, 16, 256, 496, [[0, "#FF8A5D"], [1, "#E0449C"]]) +
      lg("g7l", 72, 256, 273, 256, [[0, "#FF5E93"], [1, "#E0449C"]]) +
      lg("g7r", 239, 256, 440, 256, [[0, "#E0449C"], [1, "#A558E0"]]) +
      `<clipPath id="c7t"><rect x="0" y="0" width="512" height="256"/></clipPath>` +
      `<clipPath id="c7b"><rect x="0" y="256" width="512" height="256"/></clipPath>` +
      `<mask id="m7l" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<rect width="512" height="512" fill="#fff"/>` +
      heartS7("R", `fill="none" stroke="#000" stroke-width="30"`) +
      `</mask>` +
      `<mask id="m7r" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<rect width="512" height="512" fill="#fff"/>` +
      heartS7("L", `fill="none" stroke="#000" stroke-width="30"`) +
      `</mask>`,
    icon: weave7(IVORY, IVORY),
    glyph: weave7("url(#g7l)", "url(#g7r)"),
  },
  {
    num: 8, id: "etincelle", name: "Étincelle", tag: "Lumière",
    desc: "L'étincelle de la première seconde : deux éclats, une lumière douce.",
    chips: ["#FFB88A", "#E0449C", IVORY],
    bg: "url(#g8a)",
    defs: lg("g8a", 120, 100, 400, 420, [[0, "#FFB88A"], [1, "#E0449C"]]),
    icon:
      sparkAt(240, 258, 104, `fill="${IVORY}"`) +
      sparkAt(366, 148, 46, `fill="#FFE1EA"`),
    glyph:
      sparkAt(240, 258, 104, `fill="url(#g8a)"`) +
      sparkAt(366, 148, 46, `fill="#FF8A5D"`),
  },
  {
    num: 9, id: "bulle", name: "Bulle", tag: "Conversation",
    desc: "Chaque rencontre commence dans une bulle ; celle-ci contient déjà un cœur.",
    chips: ["#FF5E93", "#E0449C", IVORY],
    bg: IVORY,
    defs:
      lg("g9a", 140, 132, 372, 304, [[0, "#FF5E93"], [1, "#E0449C"]]) +
      `<mask id="m9a" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<rect x="140" y="132" width="232" height="172" rx="56" fill="#fff"/>` +
      `<path d="M192 296 C186 330 192 354 216 372 C222 346 234 328 252 316 Z" fill="#fff"/>` +
      heartAt(256, 218, 0.24, `fill="#000"`) +
      `</mask>`,
    icon:
      `<rect x="140" y="132" width="232" height="172" rx="56" fill="url(#g9a)"/>` +
      `<path d="M192 296 C186 330 192 354 216 372 C222 346 234 328 252 316 Z" fill="url(#g9a)"/>` +
      heartAt(256, 218, 0.24, `fill="${IVORY}"`),
    glyph:
      `<g mask="url(#m9a)">` +
      `<rect x="140" y="132" width="232" height="172" rx="56" fill="url(#g9a)"/>` +
      `<path d="M192 296 C186 330 192 354 216 372 C222 346 234 328 252 316 Z" fill="url(#g9a)"/>` +
      `</g>`,
  },
  {
    num: 10, id: "trajectoires", name: "Trajectoires", tag: "Mouvement",
    desc: "Deux trajectoires qui se croisent — et un cœur né de leur rencontre.",
    chips: ["#FF8A5D", "#FF5E93", "#A558E0"],
    bg: IVORY,
    defs:
      lg("g10a", 148, 412, 280, 122, [[0, "#FF8A5D"], [1, "#FF5E93"]]) +
      lg("g10b", 280, 412, 394, 118, [[0, "#E0449C"], [1, "#A558E0"]]),
    icon:
      `<path d="M280 412 C238 330 188 246 148 122" fill="none" stroke="url(#g10a)" stroke-width="50" stroke-linecap="round"/>` +
      `<path d="M280 412 C338 334 376 248 394 118" fill="none" stroke="url(#g10b)" stroke-width="50" stroke-linecap="round"/>` +
      heartAt(283, 252, 0.19, `fill="#E0449C"`),
    glyph: null,
  },
  {
    num: 11, id: "jumeaux", name: "Jumeaux", tag: "Romantique",
    desc: "Deux cœurs superposés, deux intensités qui se fondent : la douceur du rapprochement.",
    chips: ["#A558E0", "#FF5E93", "#FF8A5D"],
    bg: IVORY,
    defs:
      lg("g11a", 110, 140, 320, 336, [[0, "#A558E0"], [1, "#E0449C"]]) +
      lg("g11b", 200, 200, 398, 386, [[0, "#FF5E93"], [1, "#FF8A5D"]]),
    icon:
      heartAt(212, 238, 0.62, `fill="url(#g11a)" opacity="0.94"`) +
      heartAt(300, 290, 0.58, `fill="url(#g11b)"`),
    glyph: null,
  },
  {
    num: 12, id: "constellation", name: "Constellation", tag: "Nuit",
    desc: "Des points lumineux qui dessinent un cœur : chaque point est une rencontre possible.",
    chips: ["#3A1D50", "#FFD3E1", "#D9B8FF"],
    bg: "#3A1D50",
    defs: "",
    icon:
      `<circle cx="359.9" cy="168.5" r="30" fill="#FFB98A" opacity="0.16"/><circle cx="152.1" cy="168.5" r="30" fill="#FFB98A" opacity="0.16"/>` +
      `<circle cx="256" cy="453.5" r="26" fill="#FFB98A" opacity="0.16"/>` +
      `<circle cx="256" cy="233.5" r="14" fill="#FFD3E1"/>` +
      `<circle cx="276" cy="190.9" r="16" fill="#D9B8FF"/><circle cx="236" cy="190.9" r="16" fill="#D9B8FF"/>` +
      `<circle cx="359.9" cy="168.5" r="18" fill="#FFB98A"/><circle cx="152.1" cy="168.5" r="18" fill="#FFB98A"/>` +
      `<circle cx="416" cy="243.5" r="14" fill="#FF9DB8"/><circle cx="96" cy="243.5" r="14" fill="#FF9DB8"/>` +
      `<circle cx="359.9" cy="338.5" r="16" fill="#F0A8FF"/><circle cx="152.1" cy="338.5" r="16" fill="#F0A8FF"/>` +
      `<circle cx="276" cy="416.1" r="14" fill="#FFD3E1"/><circle cx="236" cy="416.1" r="14" fill="#FFD3E1"/>` +
      `<circle cx="256" cy="453.5" r="12" fill="#FFB98A"/>`,
    glyph:
      `<circle cx="256" cy="233.5" r="14" fill="#FF5E93"/>` +
      `<circle cx="276" cy="190.9" r="16" fill="#A558E0"/><circle cx="236" cy="190.9" r="16" fill="#A558E0"/>` +
      `<circle cx="359.9" cy="168.5" r="18" fill="#FF8A5D"/><circle cx="152.1" cy="168.5" r="18" fill="#FF8A5D"/>` +
      `<circle cx="416" cy="243.5" r="14" fill="#E0449C"/><circle cx="96" cy="243.5" r="14" fill="#E0449C"/>` +
      `<circle cx="359.9" cy="338.5" r="16" fill="#F23D6E"/><circle cx="152.1" cy="338.5" r="16" fill="#F23D6E"/>` +
      `<circle cx="276" cy="416.1" r="14" fill="#FF5E93"/><circle cx="236" cy="416.1" r="14" fill="#FF5E93"/>` +
      `<circle cx="256" cy="453.5" r="12" fill="#FFB88A"/>`,
  },
  {
    num: 13, id: "sync", name: "Sync", tag: "Rotation",
    desc: "Deux flux qui s'alignent autour d'un même cœur — deux personnes qui se synchronisent, littéralement.",
    chips: ["#FF5E93", "#A558E0", "#FFB88A"],
    bg: "url(#g13a)",
    defs: lg("g13a", 112, 112, 400, 400, [[0, "#FF5E93"], [1, "#A558E0"]]),
    icon:
      `<path d="M408.6 215.1 A158 158 0 0 0 119.2 177" fill="none" stroke="${IVORY}" stroke-width="40" stroke-linecap="round"/>` +
      `<path d="M103.4 296.9 A158 158 0 0 0 392.8 335" fill="none" stroke="${IVORY}" stroke-width="40" stroke-linecap="round"/>` +
      heartAt(256, 256, 0.22, `fill="#FFB88A"`),
    glyph:
      `<path d="M408.6 215.1 A158 158 0 0 0 119.2 177" fill="none" stroke="#FF5E93" stroke-width="40" stroke-linecap="round"/>` +
      `<path d="M103.4 296.9 A158 158 0 0 0 392.8 335" fill="none" stroke="#A558E0" stroke-width="40" stroke-linecap="round"/>` +
      heartAt(256, 256, 0.22, `fill="#E0449C"`),
  },
  {
    num: 14, id: "lu-aime", name: "Lu & Aimé", tag: "Messagerie",
    desc: "Le double check des messages aimés : « lu » et « aimé » en un seul geste — un clin d'œil au « luu » de Tiluu.",
    chips: ["#A558E0", "#FF5E93", "#FF8A5D"],
    bg: IVORY,
    defs: lg("g14a", 168, 220, 388, 156, [[0, "#FF5E93"], [1, "#E0449C"]]),
    icon:
      `<path d="M92 274 L176 358 L320 190" fill="none" stroke="#A558E0" stroke-width="42" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>` +
      `<path d="M168 220 L250 302 L388 156" fill="none" stroke="url(#g14a)" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>` +
      heartAt(426, 116, 0.13, `fill="#FF8A5D"`),
    glyph: null,
  },
  {
    num: 15, id: "pur", name: "Pur", tag: "Épure",
    desc: "Le cœur absolu, habillé d'un dégradé aurore. L'épure totale, prête pour toutes les déclinaisons.",
    chips: ["#FFB37E", "#FF5E93", "#A558E0"],
    bg: IVORY,
    defs: lg("g15a", 140, 120, 380, 400, [[0, "#FFB37E"], [0.5, "#FF5E93"], [1, "#A558E0"]]),
    icon:
      `<path d="${HEART}" fill="url(#g15a)"/>` +
      sparkAt(338, 182, 28, `fill="${IVORY}" opacity="0.95"`) +
      sparkAt(300, 232, 13, `fill="${IVORY}" opacity="0.85"`),
    glyph: null,
  },
];

// glyphe par défaut = version icône sans fond
for (const L of LOGOS) if (!L.glyph) L.glyph = L.icon;

/* ------------------------------------------------------------------ */
/* Symboles + fichiers SVG                                             */
/* ------------------------------------------------------------------ */

const SQ = `<rect x="16" y="16" width="480" height="480" rx="110"/>`;
const sqWith = (bg) => `<rect x="16" y="16" width="480" height="480" rx="110" fill="${bg}"/>`;
const symbols = LOGOS.map(
  (L) =>
    `<symbol id="i${L.num}" viewBox="0 0 512 512">${sqWith(L.bg)}${L.icon}</symbol>` +
    `<symbol id="l${L.num}" viewBox="0 0 512 512">${L.glyph}</symbol>`
).join("\n");
const allDefs = LOGOS.map((L) => L.defs).join("");
const pad = (n) => String(n).padStart(2, "0");

mkdirSync(OUT_DIR, { recursive: true });
for (const L of LOGOS) {
  const nn = pad(L.num);
  const iconSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n` +
    `<defs>${L.defs}</defs>\n${sqWith(L.bg)}\n${L.icon}\n</svg>\n`;
  const glyphSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n` +
    `<defs>${L.defs}</defs>\n${L.glyph}\n</svg>\n`;
  writeFileSync(join(OUT_DIR, `tiluu-${nn}-${L.id}-icon.svg`), iconSvg);
  writeFileSync(join(OUT_DIR, `tiluu-${nn}-${L.id}-glyph.svg`), glyphSvg);
}

/* ------------------------------------------------------------------ */
/* Galerie HTML                                                         */
/* ------------------------------------------------------------------ */

const card = (L) => `
<article class="card" id="card-${L.num}" data-num="${L.num}" data-name="${L.name}">
  <span class="badge" aria-hidden="true">✓&nbsp;Choisi</span>
  <div class="card-head">
    <span class="num">Nº&nbsp;${pad(L.num)}</span>
    <div class="ttl">
      <h3>${L.name}</h3>
      <p class="tag">${L.tag}</p>
    </div>
  </div>
  <div class="preview">
    <div class="appicon"><svg viewBox="0 0 512 512" role="img" aria-label="Logo ${L.name} — icône application"><use href="#i${L.num}"/></svg></div>
    <div class="lockup">
      <svg viewBox="0 0 512 512" aria-hidden="true"><use href="#l${L.num}"/></svg>
      <span class="wordmark">Tiluu</span>
    </div>
  </div>
  <div class="ladder" aria-label="Lisibilité aux petites tailles">
    ${[64, 40, 24, 16].map((s) => `<div class="step"><svg viewBox="0 0 512 512" style="width:${s}px;height:${s}px" aria-hidden="true"><use href="#i${L.num}"/></svg><span>${s}px</span></div>`).join("")}
    <div class="ladder-note">favicon&nbsp;16px&nbsp;→&nbsp;icône app&nbsp;64px</div>
  </div>
  <p class="desc">${L.desc}</p>
  <div class="palette" aria-hidden="true">${L.chips.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
  <div class="actions">
    <button type="button" class="btn ghost" data-zoom="${L.num}">Agrandir</button>
    <button type="button" class="btn solid" data-pick="${L.num}">Choisir</button>
  </div>
</article>`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tiluu · 15 pistes de logo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#F6F2F3; --card:#FFFFFF; --stroke:rgba(32,18,38,.09); --ink:#2B2233; --muted:#8A7A93;
  --rose:#FF5E93; --rose-deep:#D92E63; --soft:#FBE9EF;
  --shadow:0 1px 2px rgba(32,18,38,.05),0 10px 30px -12px rgba(32,18,38,.14);
}
body.dark{
  --bg:#171019; --card:#221729; --stroke:rgba(255,255,255,.09); --ink:#F4EDF5; --muted:#B4A2BE;
  --soft:#3A2333; --shadow:0 1px 2px rgba(0,0,0,.4),0 14px 34px -14px rgba(0,0,0,.55);
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{
  font-family:'Outfit',system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--bg);color:var(--ink);
  min-height:100vh;display:flex;flex-direction:column;
  -webkit-font-smoothing:antialiased;transition:background .35s,color .35s;
}
main{flex:1;width:100%}
.wrap{max-width:1240px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}

/* ---------- barre du haut ---------- */
.topbar{position:sticky;top:0;z-index:40;backdrop-filter:blur(14px);
  background:color-mix(in srgb,var(--bg) 82%,transparent);
  border-bottom:1px solid var(--stroke)}
.topbar .wrap{display:flex;align-items:center;gap:14px;height:64px}
.brandmark{width:34px;height:34px;border-radius:10px;flex:0 0 auto;
  background:linear-gradient(135deg,#FF5E93,#A558E0);display:grid;place-items:center;
  color:#fff;font-weight:800;font-size:15px}
.topbar h1{font-size:17px;font-weight:700;letter-spacing:-.01em}
.topbar .sub{font-size:13px;color:var(--muted);font-weight:500}
.topbar .spacer{flex:1}
.count-pill{font-size:12.5px;font-weight:600;color:var(--rose-deep);background:var(--soft);
  border-radius:999px;padding:7px 14px;white-space:nowrap}
body.dark .count-pill{color:#FF9DBB}
.tgl{border:1px solid var(--stroke);background:var(--card);color:var(--ink);cursor:pointer;
  font:600 12.5px/1 'Outfit',sans-serif;padding:9px 14px;border-radius:999px;transition:.2s}
.tgl:hover{border-color:var(--rose);color:var(--rose-deep)}

/* ---------- intro ---------- */
.intro{padding:34px 0 8px}
.intro .kicker{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--rose-deep)}
body.dark .intro .kicker{color:#FF9DBB}
.intro h2{font-size:clamp(26px,4.4vw,38px);font-weight:800;letter-spacing:-.03em;line-height:1.12;margin:10px 0 12px}
.intro h2 em{font-style:normal;background:linear-gradient(100deg,#FF5E93,#A558E0);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.intro p.lead{max-width:640px;color:var(--muted);font-size:15.5px;line-height:1.65}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:26px 0 8px}
.step-card{background:var(--card);border:1px solid var(--stroke);border-radius:18px;padding:16px 18px;
  box-shadow:var(--shadow);display:flex;gap:13px;align-items:flex-start}
.step-card b.n{flex:0 0 auto;width:26px;height:26px;border-radius:999px;display:grid;place-items:center;
  background:linear-gradient(135deg,#FF5E93,#A558E0);color:#fff;font-size:12.5px;font-weight:700}
.step-card p{font-size:13.5px;line-height:1.55;color:var(--muted)}
.step-card p strong{color:var(--ink);display:block;font-size:14px;margin-bottom:2px}
.step-card code{background:var(--soft);color:var(--rose-deep);padding:1px 7px;border-radius:6px;
  font-size:12px;font-family:ui-monospace,monospace}
body.dark .step-card code{color:#FF9DBB}

/* ---------- grille ---------- */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:20px;
  margin:26px 0 90px;padding-bottom:env(safe-area-inset-bottom)}
.card{position:relative;background:var(--card);border:1.5px solid var(--stroke);border-radius:24px;
  padding:22px;box-shadow:var(--shadow);transition:transform .25s,border-color .25s,box-shadow .25s;
  display:flex;flex-direction:column;gap:16px}
.card:hover{transform:translateY(-3px)}
.card.sel{border-color:var(--rose);box-shadow:0 0 0 2px var(--rose),var(--shadow)}
.badge{position:absolute;top:-11px;right:16px;background:linear-gradient(135deg,#FF5E93,#D92E63);
  color:#fff;font-size:11px;font-weight:700;letter-spacing:.02em;padding:5px 11px;border-radius:999px;
  box-shadow:0 4px 12px -4px rgba(217,46,99,.6);display:none}
.card.sel .badge{display:block}
.card-head{display:flex;align-items:center;gap:12px}
.num{font:700 12px/1 ui-monospace,monospace;color:var(--rose-deep);background:var(--soft);
  padding:7px 9px;border-radius:9px;letter-spacing:.06em}
body.dark .num{color:#FF9DBB}
.ttl h3{font-size:19px;font-weight:700;letter-spacing:-.015em;line-height:1.1}
.tag{font-size:12px;color:var(--muted);font-weight:500;margin-top:2px}

.preview{display:flex;align-items:center;gap:20px;background:
  radial-gradient(120% 130% at 0% 0%,color-mix(in srgb,var(--rose) 5%,var(--card)),var(--card) 60%);
  border:1px solid var(--stroke);border-radius:18px;padding:20px 22px}
.appicon{flex:0 0 auto}
.appicon svg{width:124px;height:124px;display:block;
  filter:drop-shadow(0 7px 16px rgba(32,18,38,.18)) drop-shadow(0 0 1px rgba(32,18,38,.22))}
body.dark .appicon svg{filter:drop-shadow(0 8px 18px rgba(0,0,0,.5))}
.lockup{display:flex;align-items:center;gap:14px;min-width:0}
.lockup svg{width:46px;height:46px;flex:0 0 auto}
.lockup .wordmark{font-size:clamp(21px,2vw,25px);font-weight:700;letter-spacing:-.028em;white-space:nowrap}

.ladder{display:flex;align-items:flex-end;gap:16px;padding:2px 4px}
.step{display:flex;flex-direction:column;align-items:center;gap:7px}
.step svg{display:block;border-radius:22%;box-shadow:0 1px 4px rgba(32,18,38,.18)}
.step span{font-size:10.5px;color:var(--muted);font-weight:500}
.ladder-note{margin-left:auto;align-self:center;font-size:10.5px;color:var(--muted);
  text-align:right;line-height:1.5;max-width:110px}

.desc{font-size:13.5px;line-height:1.6;color:var(--muted);min-height:44px}
.palette{display:flex;gap:8px;align-items:center}
.palette span{width:20px;height:20px;border-radius:999px;box-shadow:inset 0 0 0 1px rgba(32,18,38,.12)}

.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto}
.btn{cursor:pointer;border-radius:13px;min-height:44px;padding:13px 14px;font:600 13.5px/1 'Outfit',sans-serif;
  transition:transform .15s,filter .2s,background .2s,border-color .2s}
.btn:active{transform:scale(.97)}
.btn.ghost{background:transparent;border:1.5px solid var(--stroke);color:var(--ink)}
.btn.ghost:hover{border-color:var(--rose);color:var(--rose-deep)}
.btn.solid{background:linear-gradient(135deg,#FF5E93,#D92E63);border:none;color:#fff;
  box-shadow:0 6px 16px -6px rgba(217,46,99,.55)}
.btn.solid:hover{filter:brightness(1.06)}
.card.sel .btn.solid{background:var(--card);border:1.5px solid var(--rose);color:var(--rose-deep);box-shadow:none}

/* ---------- barre de sélection ---------- */
.selectbar{position:fixed;left:50%;bottom:22px;transform:translate(-50%,140%);z-index:60;
  display:flex;align-items:center;gap:14px;background:var(--card);border:1.5px solid var(--stroke);
  border-radius:999px;padding:10px 12px 10px 20px;box-shadow:0 18px 44px -14px rgba(32,18,38,.4);
  transition:transform .4s cubic-bezier(.22,1.2,.36,1);max-width:calc(100vw - 32px)}
.selectbar.on{transform:translate(-50%,0)}
.selectbar .lbl{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.selectbar .lbl b{color:var(--rose-deep)}
body.dark .selectbar .lbl b{color:#FF9DBB}
.selectbar .btn{padding:10px 16px;border-radius:999px;white-space:nowrap}
.selectbar .clear{border:none;background:transparent;color:var(--muted);font-size:16px;padding:10px 8px;cursor:pointer}
.selectbar .clear:hover{color:var(--rose-deep)}

/* ---------- modale ---------- */
.modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(23,16,25,.55);backdrop-filter:blur(6px)}
.modal.open{display:flex}
.modal-panel{background:var(--card);border:1px solid var(--stroke);border-radius:28px;
  max-width:880px;width:100%;max-height:calc(100vh - 40px);overflow:auto;position:relative;
  box-shadow:0 40px 90px -20px rgba(0,0,0,.5)}
.modal-close{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:999px;
  border:1px solid var(--stroke);background:var(--card);color:var(--ink);font-size:16px;cursor:pointer;z-index:2}
.modal-close:hover{border-color:var(--rose);color:var(--rose-deep)}
.modal-head{padding:30px 34px 0;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
.modal-head .num{font-size:13px;padding:8px 10px}
.modal-head h3{font-size:28px;font-weight:800;letter-spacing:-.03em}
.modal-head .tag{font-size:13px;color:var(--muted)}
.modal-body{padding:22px 34px 34px;display:grid;gap:22px}
@media(min-width:760px){.modal-body{grid-template-columns:auto 1fr;align-items:start}}
.m-big{display:flex;flex-direction:column;gap:18px;align-items:center}
.m-big .appicon svg{width:210px;height:210px}
.m-panes{display:flex;gap:12px}
.m-pane{flex:1;border-radius:16px;display:grid;place-items:center;padding:16px 8px 10px;gap:6px}
.m-pane.light{background:#FAF5F3}.m-pane.dark{background:#221730}
.m-pane svg{width:76px;height:76px}
.m-pane span{font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.m-pane.light span{color:#8A7A93}.m-pane.dark span{color:#B4A2BE}
.m-info{display:flex;flex-direction:column;gap:18px}
.m-info .desc{min-height:0;font-size:14.5px}
.m-lockup{display:flex;align-items:center;gap:16px;border:1px solid var(--stroke);
  border-radius:16px;padding:18px 20px}
.m-lockup svg{width:54px;height:54px}
.m-lockup .wordmark{font-size:31px;font-weight:700;letter-spacing:-.03em}
.m-row-title{font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.m-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}

/* ---------- pied de page ---------- */
footer{margin-top:auto;border-top:1px solid var(--stroke);
  background:color-mix(in srgb,var(--card) 55%,transparent)}
footer .wrap{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between;
  padding-top:20px;padding-bottom:22px;color:var(--muted);font-size:12.5px}
footer b{color:var(--ink);font-weight:700}

/* ---------- toast ---------- */
.toast{position:fixed;top:18px;left:50%;transform:translate(-50%,-160%);z-index:99;
  background:linear-gradient(135deg,#FF5E93,#D92E63);color:#fff;font-size:13.5px;font-weight:600;
  padding:12px 22px;border-radius:999px;box-shadow:0 14px 34px -10px rgba(217,46,99,.65);
  transition:transform .35s cubic-bezier(.22,1.2,.36,1)}
.toast.on{transform:translate(-50%,0)}

@media(max-width:560px){
  .preview{flex-direction:column;align-items:flex-start;gap:16px}
  .ladder-note{display:none}
  .topbar .sub{display:none}
  .count-pill{display:none}
  .topbar h1{font-size:15px}
  .modal-head{padding:24px 22px 0}.modal-body{padding:18px 22px 26px}
}
</style>
</head>
<body>

<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>${allDefs}</defs>
  ${symbols}
</svg>

<header class="topbar">
  <div class="wrap">
    <span class="brandmark" aria-hidden="true">T</span>
    <div>
      <h1>Tiluu · Identité visuelle</h1>
      <p class="sub">15 pistes de logo — élégantes, épurées, douces, modernes</p>
    </div>
    <div class="spacer"></div>
    <span class="count-pill">15 logos · SVG vectoriel</span>
    <button type="button" class="tgl" id="tgl">◐ Fond sombre</button>
  </div>
</header>

<main>
  <section class="intro wrap">
    <p class="kicker">Exploration de marque</p>
    <h2>Quinze cœurs pour <em>Tiluu</em></h2>
    <p class="lead">Chaque piste est dessinée en code (SVG vectoriel, donc infiniment nette). Comparez l'icône
      d'application, le logo complet et la lisibilité aux petites tailles — puis retenez votre préférée.</p>
    <div class="steps">
      <div class="step-card"><b class="n">1</b><p><strong>Parcourez</strong>Les 15 pistes ci-dessous : chaque carte montre l'icône app, le logo complet et le test favicon 16&nbsp;px.</p></div>
      <div class="step-card"><b class="n">2</b><p><strong>Examinez</strong>Cliquez sur «&nbsp;Agrandir&nbsp;» pour voir une piste en grand, sur fond clair et sombre.</p></div>
      <div class="step-card"><b class="n">3</b><p><strong>Choisissez</strong>Cliquez «&nbsp;Choisir&nbsp;», puis indiquez-moi le numéro — par exemple <code>Logo 7</code>.</p></div>
    </div>
  </section>

  <section class="grid wrap" id="grid">
    ${LOGOS.map(card).join("")}
  </section>
</main>

<footer>
  <div class="wrap">
    <span><b>Tiluu</b> · Exploration d'identité visuelle</span>
    <span>15 logos 100&nbsp;% vectoriels, générés par code — prêts pour PNG, icônes d'app, favicon et déclinaisons</span>
  </div>
</footer>

<div class="selectbar" id="selectbar" role="status" aria-live="polite">
  <span class="lbl" id="sel-lbl"></span>
  <button type="button" class="btn solid" id="sel-copy">Copier mon choix</button>
  <button type="button" class="clear" id="sel-clear" aria-label="Effacer le choix">✕</button>
</div>

<div class="modal" id="modal" role="dialog" aria-modal="true" aria-label="Aperçu du logo">
  <div class="modal-panel">
    <button type="button" class="modal-close" id="modal-close" aria-label="Fermer">✕</button>
    <div class="modal-head">
      <span class="num" id="m-num"></span>
      <h3 id="m-name"></h3>
      <span class="tag" id="m-tag"></span>
    </div>
    <div class="modal-body">
      <div class="m-big">
        <div class="appicon"><svg viewBox="0 0 512 512" id="m-icon-svg" role="img" aria-label="Icône du logo"><use href="#i1" id="m-icon-use"/></svg></div>
        <div class="m-panes">
          <div class="m-pane light"><svg viewBox="0 0 512 512" aria-hidden="true"><use href="#i1" id="m-pane-l"/></svg><span>Fond clair</span></div>
          <div class="m-pane dark"><svg viewBox="0 0 512 512" aria-hidden="true"><use href="#i1" id="m-pane-d"/></svg><span>Fond sombre</span></div>
        </div>
      </div>
      <div class="m-info">
        <p class="desc" id="m-desc"></p>
        <div>
          <p class="m-row-title">Logo complet</p>
          <div class="m-lockup"><svg viewBox="0 0 512 512" aria-hidden="true"><use href="#l1" id="m-lock"/></svg><span class="wordmark">Tiluu</span></div>
        </div>
        <div>
          <p class="m-row-title">Aux petites tailles</p>
          <div class="ladder" id="m-ladder"></div>
        </div>
        <div class="m-actions">
          <button type="button" class="btn solid" id="m-pick">Choisir ce logo</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
var DATA = ${JSON.stringify(LOGOS.map((L) => ({ num: L.num, name: L.name })))};
var KEY = "tiluu.logoChoice";
var selNum = null;

function $(id){ return document.getElementById(id); }
function pad(n){ return (n < 10 ? "0" : "") + n; }

function renderSel(){
  var cards = document.querySelectorAll(".card");
  for (var i = 0; i < cards.length; i++) cards[i].classList.toggle("sel", String(selNum) === cards[i].dataset.num);
  var bar = $("selectbar"), lbl = $("sel-lbl");
  if (selNum){
    var d = null;
    for (var j = 0; j < DATA.length; j++) if (DATA[j].num === selNum) d = DATA[j];
    lbl.innerHTML = "Votre choix&nbsp;: <b>Nº&nbsp;" + pad(selNum) + " · " + d.name + "</b>";
    bar.classList.add("on");
  } else {
    bar.classList.remove("on");
  }
}
function pick(n){
  selNum = (selNum === n) ? null : n;
  if (selNum === null) { try { localStorage.removeItem(KEY); } catch(e){} }
  else { try { localStorage.setItem(KEY, String(selNum)); } catch(e){} }
  renderSel();
  var mp = $("m-pick");
  if (modalNum){ mp.textContent = (selNum === modalNum) ? "✓ Choisi — retirer" : "Choisir ce logo"; }
}
function toast(msg){
  var t = $("toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(t._h); t._h = setTimeout(function(){ t.classList.remove("on"); }, 2600);
}

document.addEventListener("click", function(ev){
  var el = ev.target.closest("[data-pick]");
  if (el){ pick(parseInt(el.dataset.pick, 10)); if (selNum) toast("Nº " + pad(selNum) + " retenu — communiquez-moi ce numéro ✓"); return; }
  var z = ev.target.closest("[data-zoom]");
  if (z){ openModal(parseInt(z.dataset.zoom, 10)); return; }
});

/* modale */
var modalNum = null;
function openModal(n){
  modalNum = n;
  var d = null;
  for (var i = 0; i < DATA.length; i++) if (DATA[i].num === n) d = DATA[i];
  $("m-num").textContent = "Nº " + pad(n);
  $("m-name").textContent = d.name;
  $("m-tag").textContent = "— " + $("card-" + n).querySelector(".tag").textContent;
  $("m-desc").textContent = $("card-" + n).querySelector(".desc").textContent;
  var hrefs = ["m-icon-use", "m-pane-l", "m-pane-d"], k;
  for (k = 0; k < hrefs.length; k++) $(hrefs[k]).setAttribute("href", "#i" + n);
  $("m-lock").setAttribute("href", "#l" + n);
  var ladder = $("m-ladder"); ladder.innerHTML = "";
  var sizes = [64, 40, 24, 16];
  for (k = 0; k < sizes.length; k++){
    var s = sizes[k];
    var div = document.createElement("div"); div.className = "step";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 512 512");
    svg.style.width = s + "px"; svg.style.height = s + "px";
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i" + n);
    svg.appendChild(use);
    var sp = document.createElement("span"); sp.textContent = s + "px";
    div.appendChild(svg); div.appendChild(sp); ladder.appendChild(div);
  }
  $("m-pick").textContent = (selNum === n) ? "✓ Choisi — retirer" : "Choisir ce logo";
  $("modal").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(){ $("modal").classList.remove("open"); document.body.style.overflow = ""; modalNum = null; }
$("modal-close").addEventListener("click", closeModal);
$("modal").addEventListener("click", function(ev){ if (ev.target === $("modal")) closeModal(); });
document.addEventListener("keydown", function(ev){ if (ev.key === "Escape") closeModal(); });
$("m-pick").addEventListener("click", function(){
  var n = modalNum;
  pick(n); closeModal();
  if (selNum) toast("Nº " + pad(selNum) + " retenu — communiquez-moi ce numéro ✓");
});

/* thème */
var tgl = $("tgl");
function setTheme(dark){
  document.body.classList.toggle("dark", dark);
  tgl.textContent = dark ? "◑ Fond clair" : "◐ Fond sombre";
  try { localStorage.setItem("tiluu.logoTheme", dark ? "dark" : "light"); } catch(e){}
}
tgl.addEventListener("click", function(){ setTheme(!document.body.classList.contains("dark")); });
try {
  var t = localStorage.getItem("tiluu.logoTheme");
  if (t === "dark" || (!t && window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches)) setTheme(true);
} catch(e){}

/* choix persistant */
try { var v = localStorage.getItem(KEY) || localStorage.getItem("vibesync.logoChoice"); if (v) { selNum = parseInt(v, 10) || null; if (selNum !== null) { try { localStorage.setItem(KEY, String(selNum)); } catch(e2){} } } } catch(e){}
renderSel();

/* copier */
$("sel-copy").addEventListener("click", function(){
  if (!selNum) return;
  var d = null;
  for (var i = 0; i < DATA.length; i++) if (DATA[i].num === selNum) d = DATA[i];
  var txt = "Logo Nº " + selNum + " — " + d.name + " (Tiluu)";
  var done = function(){ toast("Choix copié — collez-le dans la discussion ✓"); };
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(done, function(){ fallbackCopy(txt, done); });
  } else fallbackCopy(txt, done);
});
function fallbackCopy(txt, done){
  var ta = document.createElement("textarea");
  ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch(e){}
  document.body.removeChild(ta);
}
$("sel-clear").addEventListener("click", function(){ pick(selNum); });
</script>
</body>
</html>
`;

writeFileSync(OUT_HTML, html);

console.log("✓ Galerie générée :", OUT_HTML);
console.log("✓ SVG individuels :", OUT_DIR, "(" + LOGOS.length * 2 + " fichiers)");
LOGOS.forEach((L) =>
  console.log("  Nº" + pad(L.num), L.name.padEnd(14, " "), "→", "tiluu-" + pad(L.num) + "-" + L.id + "-icon.svg")
);

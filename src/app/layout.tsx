import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ChunkErrorRecovery } from "@/components/chunk-error-recovery";
import { detectLangFromAcceptLanguage } from "@/lib/vibe/i18n/core";

const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };
const display = { variable: "--font-display" };

// Métadonnées SEO bilingues — la langue suit la détection serveur
// (cookie de choix > Accept-Language), comme le rendu de la page.
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  const choice = cookie.match(/(?:^|;\s*)vibe_lang_choice=(fr|en)(?:;|$)/);
  const effective = cookie.match(/(?:^|;\s*)vibe_lang=(fr|en)(?:;|$)/);
  const lang =
    choice?.[1] ?? effective?.[1] ??
    (detectLangFromAcceptLanguage(h.get("accept-language")) === "en" ? "en" : "fr");

  if (lang === "en") {
    return {
      metadataBase: new URL("https://vivilov.app"),
      title: {
        default: "Vivilov — Authentic Video Dating | Mobile-First PWA",
        template: "%s · Vivilov",
      },
      description:
        "Vivilov revolutionizes dating by replacing photos with 15s videos. Smooth swiping, anti-spam messaging, monetizable virtual gifts and the Vibes economy. Zero subscription.",
      keywords: [
        "Vivilov",
        "video dating",
        "dating app",
        "PWA",
        "15 second video",
        "Vibes",
        "virtual gifts",
        "micro-payments",
        "authentic dating",
        "mobile first",
      ],
      authors: [{ name: "Vivilov" }],
      creator: "Vivilov",
      applicationName: "Vivilov",
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Vivilov",
      },
      icons: {
        icon: [
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [
          { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        ],
        shortcut: "/icon-192.png",
      },
      openGraph: {
        title: "Vivilov — Authentic Video Dating",
        description:
          "The 15s video dating PWA. Authentic, smooth, subscription-free. Vibes economy and virtual gifts.",
        url: "https://vivilov.app",
        siteName: "Vivilov",
        type: "website",
        locale: "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title: "Vivilov — Authentic Video Dating",
        description:
          "The 15s video dating PWA. Authentic, smooth, subscription-free.",
      },
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
      },
    };
  }

  return {
    metadataBase: new URL("https://vivilov.app"),
    title: {
      default: "Vivilov — Rencontre Vidéo Authentique | PWA Mobile-First",
      template: "%s · Vivilov",
    },
    description:
      "Vivilov révolutionne la rencontre en remplaçant les photos par des vidéos de 15s. Swype fluide, messagerie anti-spam, cadeaux virtuels monétisables et économie de Vibes. Zéro abonnement.",
    keywords: [
      "Vivilov",
      "rencontre vidéo",
      "dating app",
      "PWA",
      "vidéo 15 secondes",
      "Vibes",
      "cadeaux virtuels",
      "micro-paiements",
      "rencontre authentique",
      "mobile first",
    ],
    authors: [{ name: "Vivilov" }],
    creator: "Vivilov",
    applicationName: "Vivilov",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "Vivilov",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/icon-192.png",
    },
    openGraph: {
      title: "Vivilov — Rencontre Vidéo Authentique",
      description:
        "La PWA de rencontre par vidéo de 15s. Authentique, fluide, sans abonnement. Économie de Vibes et cadeaux virtuels.",
      url: "https://vivilov.app",
      siteName: "Vivilov",
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: "Vivilov — Rencontre Vidéo Authentique",
      description:
        "La PWA de rencontre par vidéo de 15s. Authentique, fluide, sans abonnement.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#6b32c4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Le clavier redimensionne le contenu (pas de recouvrement des inputs) —
  // combiné aux hauteurs dvh, la barre d'URL du navigateur mobile reste
  // visible et fixe : tout le contenu tient dans le viewport sans scroll.
  interactiveWidget: "resizes-content",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Vivilov",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "iOS, Android, Web",
      description:
        "PWA mobile-first de rencontre par vidéo de 15 secondes. Économie de Vibes, messagerie anti-spam et cadeaux virtuels monétisables.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "12840",
      },
      url: "https://vivilov.app",
    },
    {
      "@type": "Organization",
      name: "Vivilov",
      url: "https://vivilov.app",
      logo: "https://vivilov.app/icon-512.png",
      sameAs: [
        "https://twitter.com/vivilov",
        "https://instagram.com/vivilov",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Qu'est-ce que Vivilov ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vivilov est une PWA mobile-first de rencontre qui remplace les photos de profil statiques par des vidéos de présentation de 15 secondes pour une authenticité immédiate.",
          },
        },
        {
          "@type": "Question",
          name: "Comment fonctionne la rencontre par vidéo ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Chaque utilisateur publie une vidéo portrait de 15s. On swipe à droite pour like, à gauche pour pass, et en haut pour super-like. En cas de match, la messagerie anti-spam se débloque progressivement.",
          },
        },
        {
          "@type": "Question",
          name: "Vivilov est-il payant ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vivilov ne propose aucun abonnement. L'app repose sur l'achat de packs de Vibes pour des actions premium : super-like, boost, cadeaux virtuels, rewind, passport, icebreaker IA, etc.",
          },
        },
        {
          "@type": "Question",
          name: "Comment monétise-t-on les cadeaux reçus ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Les cadeaux virtuels reçus ont une valeur en euros affichée dans votre devise locale. Ils s'accumulent dans un portefeuille interne, puis peuvent être retirés vers un compte bancaire via Stripe Connect à partir de 20€.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${display.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {/* Auto-réparation ChunkLoadError (cache périmé / réseau mobile) */}
          <ChunkErrorRecovery />
          {children}
          <Toaster />
          {/* Sonner — infos/erreurs uniquement (les succès passent par le
              retour centré CenterFeedback). Décalé SOUS le header de l'app
              (~80px, desktop ET mobile) pour ne jamais obstruer ses
              éléments : sans mobileOffset, sonner retombe à 16px en
              viewport ≤768px et recouvrirait le header. */}
          <SonnerToaster position="top-center" richColors offset={80} mobileOffset={80} />
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal, SectionHeading } from "./primitives";

const FAQS = [
  {
    q: "Qu'est-ce que Vivilov ?",
    a: "Vivilov est une application mobile de rencontre PWA qui met la vidéo de 15 secondes au cœur du profil. Au lieu de photos retouchées, chaque membre présente sa vraie voix, son vrai visage, sa vraie énergie. La plateforme est gratuite, sans abonnement : tu achètes des Vibes optionnelles pour accélérer tes interactions et tu peux encaisser en € les cadeaux virtuels reçus.",
  },
  {
    q: "Comment fonctionne la rencontre par vidéo ?",
    a: "Tu enregistres une vidéo verticale de 15 secondes dans l'app. Elle remplace la photo de profil et passe par notre IA de modération (rejet auto des contenus inappropriés). Les autres membres te découvrent en swipe, voient ta vidéo en mouvement, puis passent le Vibe Check — une question légère à réponse mutuelle. Si tu matchs, la messagerie s'ouvre, et vous pouvez vous envoyer des cadeaux.",
  },
  {
    q: "Vivilov est-il payant ?",
    a: "Non, Vivilov ne fonctionne pas par abonnement. Le swipe, le match, le Vibe Check et la messagerie de base sont gratuits. Tu peux acheter des Vibes pour des actions optionnelles : Super-Like (5), Boost de profil (50), Voir les likes reçus (20), Passport (30), Icebreaker IA (3), Boost de message (10), Rewind (2) ou des cadeaux virtuels de 10 à 500 Vibes. Les Vibes ne sont jamais perdues : elles dorment dans ton wallet.",
  },
  {
    q: "Comment monétise-t-on les cadeaux reçus ?",
    a: "Quand un autre membre t'envoie un cadeau virtuel (Rose, Dîner Romantique, Weekend…), sa valeur en € est créditée sur ton wallet Vivilov. La plateforme prélève une commission de 30 %, le reste t'appartient. Tu peux retirer tes gains via Stripe Connect dès que tu atteins 20 € de solde. Le taux de change appliqué à l'affichage correspond à ta devise locale, mais le crédit est comptabilisé en euros.",
  },
  {
    q: "Vivilov est-il disponible dans mon pays / ma devise ?",
    a: "Oui. Vivilov détecte automatiquement ton pays via l'en-tête x-vercel-ip-country et préselectionne ta devise parmi EUR, USD, GBP, CAD, XAF et JPY. Les prix des Vibes sont fixes par région (style App Store) pour éviter les surprises de change, tandis que la valeur des cadeaux reçus est convertie dynamiquement au taux du jour pour l'affichage. Tu peux à tout moment changer de devise depuis le sélecteur en haut de page.",
  },
  {
    q: "Mes données et ma vidéo sont-elles protégées (RGPD) ?",
    a: "Vivilov est conforme au RGPD. Tes données personnelles (téléphone, profil, vidéo) sont stockées chiffrées dans l'Union européenne. Tu peux exporter, modifier ou supprimer ton compte à tout moment depuis l'app. Les vidéos sont automatiquement supprimées des serveurs si tu désactivés ton profil. Notre IA de modération analyse les vidéos en flux sans conservation supplémentaire. Nous ne revendons jamais tes données à des tiers.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="relative py-16 sm:py-24 scroll-mt-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title={<>Questions <span className="vibe-text-gradient">fréquentes</span></>}
            subtitle="Tout ce que tu veux savoir avant de vibrer. Reste une question ? Notre équipe répond en moins de 24 h."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-10 rounded-3xl glass ring-1 ring-border/60 p-2 sm:p-3"
          >
            <Accordion type="single" collapsible className="w-full">
              {FAQS.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-2xl px-3 sm:px-5 data-[state=open]:bg-vibe-gradient-soft transition-colors"
                >
                  <AccordionTrigger className="font-display text-base sm:text-lg font-bold text-left hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground text-pretty leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

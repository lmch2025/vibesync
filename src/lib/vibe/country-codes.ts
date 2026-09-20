// Country dialing codes for the auth phone selector.
// Sorted by common usage for a French-first dating app, then alphabetical.
// Flag is the emoji; iso is ISO 3166-1 alpha-2; dial is the calling code.
// Bilingue : name (FR) + nameEn (EN) — countryName() résout selon la langue.

export type Country = {
  iso: string;
  name: string; // nom français
  nameEn: string; // English name
  flag: string;
  dial: string; // e.g. "+33"
};

export const COUNTRY_CODES: Country[] = [
  { iso: "FR", name: "France", flag: "🇫🇷", dial: "+33" , nameEn: "France" },
  { iso: "BE", name: "Belgique", flag: "🇧🇪", dial: "+32" , nameEn: "Belgium" },
  { iso: "CH", name: "Suisse", flag: "🇨🇭", dial: "+41" , nameEn: "Switzerland" },
  { iso: "CA", name: "Canada", flag: "🇨🇦", dial: "+1" , nameEn: "Canada" },
  { iso: "CM", name: "Cameroun", flag: "🇨🇲", dial: "+237" , nameEn: "Cameroon" },
  { iso: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", dial: "+225" , nameEn: "Ivory Coast" },
  { iso: "SN", name: "Sénégal", flag: "🇸🇳", dial: "+221" , nameEn: "Senegal" },
  { iso: "MA", name: "Maroc", flag: "🇲🇦", dial: "+212" , nameEn: "Morocco" },
  { iso: "DZ", name: "Algérie", flag: "🇩🇿", dial: "+213" , nameEn: "Algeria" },
  { iso: "TN", name: "Tunisie", flag: "🇹🇳", dial: "+216" , nameEn: "Tunisia" },
  { iso: "US", name: "États-Unis", flag: "🇺🇸", dial: "+1" , nameEn: "United States" },
  { iso: "GB", name: "Royaume-Uni", flag: "🇬🇧", dial: "+44" , nameEn: "United Kingdom" },
  { iso: "DE", name: "Allemagne", flag: "🇩🇪", dial: "+49" , nameEn: "Germany" },
  { iso: "ES", name: "Espagne", flag: "🇪🇸", dial: "+34" , nameEn: "Spain" },
  { iso: "IT", name: "Italie", flag: "🇮🇹", dial: "+39" , nameEn: "Italy" },
  { iso: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351" , nameEn: "Portugal" },
  { iso: "NL", name: "Pays-Bas", flag: "🇳🇱", dial: "+31" , nameEn: "Netherlands" },
  { iso: "LU", name: "Luxembourg", flag: "🇱🇺", dial: "+352" , nameEn: "Luxembourg" },
  { iso: "IE", name: "Irlande", flag: "🇮🇪", dial: "+353" , nameEn: "Ireland" },
  { iso: "AT", name: "Autriche", flag: "🇦🇹", dial: "+43" , nameEn: "Austria" },
  { iso: "SE", name: "Suède", flag: "🇸🇪", dial: "+46" , nameEn: "Sweden" },
  { iso: "NO", name: "Norvège", flag: "🇳🇴", dial: "+47" , nameEn: "Norway" },
  { iso: "DK", name: "Danemark", flag: "🇩🇰", dial: "+45" , nameEn: "Denmark" },
  { iso: "FI", name: "Finlande", flag: "🇫🇮", dial: "+358" , nameEn: "Finland" },
  { iso: "PL", name: "Pologne", flag: "🇵🇱", dial: "+48" , nameEn: "Poland" },
  { iso: "GR", name: "Grèce", flag: "🇬🇷", dial: "+30" , nameEn: "Greece" },
  { iso: "RU", name: "Russie", flag: "🇷🇺", dial: "+7" , nameEn: "Russia" },
  { iso: "UA", name: "Ukraine", flag: "🇺🇦", dial: "+380" , nameEn: "Ukraine" },
  { iso: "RO", name: "Roumanie", flag: "🇷🇴", dial: "+40" , nameEn: "Romania" },
  { iso: "CZ", name: "Tchéquie", flag: "🇨🇿", dial: "+420" , nameEn: "Czechia" },
  { iso: "HU", name: "Hongrie", flag: "🇭🇺", dial: "+36" , nameEn: "Hungary" },
  { iso: "TR", name: "Turquie", flag: "🇹🇷", dial: "+90" , nameEn: "Turkey" },
  { iso: "JP", name: "Japon", flag: "🇯🇵", dial: "+81" , nameEn: "Japan" },
  { iso: "CN", name: "Chine", flag: "🇨🇳", dial: "+86" , nameEn: "China" },
  { iso: "KR", name: "Corée du Sud", flag: "🇰🇷", dial: "+82" , nameEn: "South Korea" },
  { iso: "IN", name: "Inde", flag: "🇮🇳", dial: "+91" , nameEn: "India" },
  { iso: "ID", name: "Indonésie", flag: "🇮🇩", dial: "+62" , nameEn: "Indonesia" },
  { iso: "TH", name: "Thaïlande", flag: "🇹🇭", dial: "+66" , nameEn: "Thailand" },
  { iso: "VN", name: "Vietnam", flag: "🇻🇳", dial: "+84" , nameEn: "Vietnam" },
  { iso: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63" , nameEn: "Philippines" },
  { iso: "MY", name: "Malaisie", flag: "🇲🇾", dial: "+60" , nameEn: "Malaysia" },
  { iso: "SG", name: "Singapour", flag: "🇸🇬", dial: "+65" , nameEn: "Singapore" },
  { iso: "HK", name: "Hong Kong", flag: "🇭🇰", dial: "+852" , nameEn: "Hong Kong" },
  { iso: "AU", name: "Australie", flag: "🇦🇺", dial: "+61" , nameEn: "Australia" },
  { iso: "NZ", name: "Nouvelle-Zélande", flag: "🇳🇿", dial: "+64" , nameEn: "New Zealand" },
  { iso: "BR", name: "Brésil", flag: "🇧🇷", dial: "+55" , nameEn: "Brazil" },
  { iso: "MX", name: "Mexique", flag: "🇲🇽", dial: "+52" , nameEn: "Mexico" },
  { iso: "AR", name: "Argentine", flag: "🇦🇷", dial: "+54" , nameEn: "Argentina" },
  { iso: "CL", name: "Chili", flag: "🇨🇱", dial: "+56" , nameEn: "Chile" },
  { iso: "CO", name: "Colombie", flag: "🇨🇴", dial: "+57" , nameEn: "Colombia" },
  { iso: "ZA", name: "Afrique du Sud", flag: "🇿🇦", dial: "+27" , nameEn: "South Africa" },
  { iso: "NG", name: "Nigéria", flag: "🇳🇬", dial: "+234" , nameEn: "Nigeria" },
  { iso: "EG", name: "Égypte", flag: "🇪🇬", dial: "+20" , nameEn: "Egypt" },
  { iso: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254" , nameEn: "Kenya" },
  { iso: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233" , nameEn: "Ghana" },
  { iso: "ET", name: "Éthiopie", flag: "🇪🇹", dial: "+251" , nameEn: "Ethiopia" },
  { iso: "SA", name: "Arabie Saoudite", flag: "🇸🇦", dial: "+966" , nameEn: "Saudi Arabia" },
  { iso: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪", dial: "+971" , nameEn: "United Arab Emirates" },
  { iso: "IL", name: "Israël", flag: "🇮🇱", dial: "+972" , nameEn: "Israel" },
  { iso: "QA", name: "Qatar", flag: "🇶🇦", dial: "+974" , nameEn: "Qatar" },
  { iso: "LB", name: "Liban", flag: "🇱🇧", dial: "+961" , nameEn: "Lebanon" },
  { iso: "CG", name: "Congo", flag: "🇨🇬", dial: "+242" , nameEn: "Congo" },
  { iso: "GA", name: "Gabon", flag: "🇬🇦", dial: "+241" , nameEn: "Gabon" },
  { iso: "ML", name: "Mali", flag: "🇲🇱", dial: "+223" , nameEn: "Mali" },
  { iso: "BF", name: "Burkina Faso", flag: "🇧🇫", dial: "+226" , nameEn: "Burkina Faso" },
  { iso: "BJ", name: "Bénin", flag: "🇧🇯", dial: "+229" , nameEn: "Benin" },
  { iso: "TG", name: "Togo", flag: "🇹🇬", dial: "+228" , nameEn: "Togo" },
  { iso: "MG", name: "Madagascar", flag: "🇲🇬", dial: "+261" , nameEn: "Madagascar" },
];

/// Nom du pays dans la langue active de l'app ("fr" | "en").
export function countryName(c: Country, lang: string): string {
  return lang === "en" ? c.nameEn : c.name;
}

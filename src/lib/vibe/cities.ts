// Cities dataset for predictive search in onboarding.
// Each city has: name, country (FR/INTL), lat, lng.
// Sorted by population relevance for a French-first dating app.

export type City = {
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
};

export const CITIES: City[] = [
  // France — major cities
  { name: "Paris", country: "France", countryCode: "FR", lat: 48.8566, lng: 2.3522 },
  { name: "Marseille", country: "France", countryCode: "FR", lat: 43.2965, lng: 5.3698 },
  { name: "Lyon", country: "France", countryCode: "FR", lat: 45.764, lng: 4.8357 },
  { name: "Toulouse", country: "France", countryCode: "FR", lat: 43.6047, lng: 1.4442 },
  { name: "Nice", country: "France", countryCode: "FR", lat: 43.7102, lng: 7.262 },
  { name: "Nantes", country: "France", countryCode: "FR", lat: 47.2184, lng: -1.5536 },
  { name: "Montpellier", country: "France", countryCode: "FR", lat: 43.6109, lng: 3.8772 },
  { name: "Strasbourg", country: "France", countryCode: "FR", lat: 48.5734, lng: 7.7521 },
  { name: "Bordeaux", country: "France", countryCode: "FR", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", country: "France", countryCode: "FR", lat: 50.6292, lng: 3.0573 },
  { name: "Rennes", country: "France", countryCode: "FR", lat: 48.1173, lng: -1.6778 },
  { name: "Reims", country: "France", countryCode: "FR", lat: 49.2583, lng: 4.0317 },
  { name: "Le Havre", country: "France", countryCode: "FR", lat: 49.4944, lng: 0.1079 },
  { name: "Saint-Étienne", country: "France", countryCode: "FR", lat: 45.4397, lng: 4.3872 },
  { name: "Toulon", country: "France", countryCode: "FR", lat: 43.1242, lng: 5.928 },
  { name: "Grenoble", country: "France", countryCode: "FR", lat: 45.1885, lng: 5.7245 },
  { name: "Dijon", country: "France", countryCode: "FR", lat: 47.322, lng: 5.0415 },
  { name: "Angers", country: "France", countryCode: "FR", lat: 47.4784, lng: -0.5632 },
  { name: "Nîmes", country: "France", countryCode: "FR", lat: 43.8367, lng: 4.3601 },
  { name: "Villeurbanne", country: "France", countryCode: "FR", lat: 45.7662, lng: 4.8795 },
  { name: "Le Mans", country: "France", countryCode: "FR", lat: 48.0077, lng: 0.3745 },
  { name: "Aix-en-Provence", country: "France", countryCode: "FR", lat: 43.5297, lng: 5.4474 },
  { name: "Brest", country: "France", countryCode: "FR", lat: 48.3904, lng: -4.4861 },
  { name: "Tours", country: "France", countryCode: "FR", lat: 47.3941, lng: 0.6843 },
  { name: "Amiens", country: "France", countryCode: "FR", lat: 49.8941, lng: 2.2957 },
  { name: "Limoges", country: "France", countryCode: "FR", lat: 45.8336, lng: 1.2625 },
  { name: "Annecy", country: "France", countryCode: "FR", lat: 45.8992, lng: 6.1294 },
  { name: "Perpignan", country: "France", countryCode: "FR", lat: 42.6886, lng: 2.8949 },
  { name: "Boulogne-Billancourt", country: "France", countryCode: "FR", lat: 48.8397, lng: 2.2398 },
  { name: "Metz", country: "France", countryCode: "FR", lat: 49.1193, lng: 6.1757 },
  { name: "Besançon", country: "France", countryCode: "FR", lat: 47.2378, lng: 6.0241 },
  { name: "Orléans", country: "France", countryCode: "FR", lat: 47.9029, lng: 1.9039 },
  { name: "Rouen", country: "France", countryCode: "FR", lat: 49.4432, lng: 1.0993 },
  { name: "Saint-Denis", country: "France", countryCode: "FR", lat: 48.9362, lng: 2.3594 },
  { name: "Argenteuil", country: "France", countryCode: "FR", lat: 48.95, lng: 2.25 },
  { name: "Montreuil", country: "France", countryCode: "FR", lat: 48.8641, lng: 2.4434 },
  { name: "Mulhouse", country: "France", countryCode: "FR", lat: 47.7508, lng: 7.3359 },
  { name: "Roubaix", country: "France", countryCode: "FR", lat: 50.6916, lng: 3.1815 },
  { name: "Tourcoing", country: "France", countryCode: "FR", lat: 50.7239, lng: 3.1606 },
  { name: "Nanterre", country: "France", countryCode: "FR", lat: 48.8916, lng: 2.2052 },
  { name: "Avignon", country: "France", countryCode: "FR", lat: 43.9493, lng: 4.8055 },
  { name: "Vitry-sur-Seine", country: "France", countryCode: "FR", lat: 48.7873, lng: 2.4037 },
  { name: "Créteil", country: "France", countryCode: "FR", lat: 48.7792, lng: 2.4559 },
  { name: "Dunkirk", country: "France", countryCode: "FR", lat: 51.0344, lng: 2.3768 },
  { name: "Poitiers", country: "France", countryCode: "FR", lat: 46.5802, lng: 0.3404 },
  { name: "Asnières-sur-Seine", country: "France", countryCode: "FR", lat: 48.9106, lng: 2.2893 },
  { name: "Courbevoie", country: "France", countryCode: "FR", lat: 48.8958, lng: 2.2567 },
  { name: "Versailles", country: "France", countryCode: "FR", lat: 48.8014, lng: 2.1301 },
  { name: "Colombes", country: "France", countryCode: "FR", lat: 48.9219, lng: 2.2532 },
  { name: "Aubervilliers", country: "France", countryCode: "FR", lat: 48.9163, lng: 2.3839 },
  { name: "Aulnay-sous-Bois", country: "France", countryCode: "FR", lat: 48.9349, lng: 2.4968 },
  { name: "Cherbourg", country: "France", countryCode: "FR", lat: 49.642, lng: -1.6245 },
  { name: "La Rochelle", country: "France", countryCode: "FR", lat: 46.1591, lng: -1.1521 },
  { name: "Antibes", country: "France", countryCode: "FR", lat: 43.5804, lng: 7.1238 },
  { name: "Cannes", country: "France", countryCode: "FR", lat: 43.5528, lng: 7.0174 },
  { name: "Saint-Nazaire", country: "France", countryCode: "FR", lat: 47.2735, lng: -2.2139 },
  { name: "Pau", country: "France", countryCode: "FR", lat: 43.2951, lng: -0.3708 },
  { name: "La Seyne-sur-Mer", country: "France", countryCode: "FR", lat: 43.1003, lng: 5.8792 },
  { name: "Biarritz", country: "France", countryCode: "FR", lat: 43.4832, lng: -1.5586 },
  { name: "Calais", country: "France", countryCode: "FR", lat: 50.9513, lng: 1.8587 },
  { name: "Brive-la-Gaillarde", country: "France", countryCode: "FR", lat: 45.1485, lng: 1.5161 },
  { name: "Clermont-Ferrand", country: "France", countryCode: "FR", lat: 45.7772, lng: 3.0823 },

  // DOM-TOM
  { name: "Fort-de-France", country: "Martinique", countryCode: "MQ", lat: 14.6069, lng: -61.0696 },
  { name: "Saint-Denis", country: "Réunion", countryCode: "RE", lat: -20.8821, lng: 55.4506 },
  { name: "Nouméa", country: "Nouvelle-Calédonie", countryCode: "NC", lat: -22.2758, lng: 166.458 },
  { name: "Papeete", country: "Polynésie", countryCode: "PF", lat: -17.5331, lng: -149.5664 },
  { name: "Cayenne", country: "Guyane", countryCode: "GF", lat: 4.9224, lng: -52.3135 },
  { name: "Basse-Terre", country: "Guadeloupe", countryCode: "GP", lat: 16.0141, lng: -61.7156 },
  { name: "Yaoundé", country: "Cameroun", countryCode: "CM", lat: 3.848, lng: 11.5021 },
  { name: "Douala", country: "Cameroun", countryCode: "CM", lat: 4.0511, lng: 9.7679 },
  { name: "Bafoussam", country: "Cameroun", countryCode: "CM", lat: 5.477, lng: 10.4187 },
  { name: "Bamenda", country: "Cameroun", countryCode: "CM", lat: 5.9597, lng: 10.146 },
  { name: "Garoua", country: "Cameroun", countryCode: "CM", lat: 9.3014, lng: 13.3977 },
  { name: "Maroua", country: "Cameroun", countryCode: "CM", lat: 10.5909, lng: 14.2634 },

  // Belgique
  { name: "Bruxelles", country: "Belgique", countryCode: "BE", lat: 50.8503, lng: 4.3517 },
  { name: "Anvers", country: "Belgique", countryCode: "BE", lat: 51.2194, lng: 4.4025 },
  { name: "Gand", country: "Belgique", countryCode: "BE", lat: 51.0543, lng: 3.7174 },
  { name: "Charleroi", country: "Belgique", countryCode: "BE", lat: 50.4108, lng: 4.4446 },
  { name: "Liège", country: "Belgique", countryCode: "BE", lat: 50.6326, lng: 5.5797 },

  // Suisse
  { name: "Genève", country: "Suisse", countryCode: "CH", lat: 46.2044, lng: 6.1432 },
  { name: "Lausanne", country: "Suisse", countryCode: "CH", lat: 46.5197, lng: 6.6323 },
  { name: "Zurich", country: "Suisse", countryCode: "CH", lat: 47.3769, lng: 8.5417 },
  { name: "Bâle", country: "Suisse", countryCode: "CH", lat: 47.5596, lng: 7.5886 },

  // Canada (québécois)
  { name: "Montréal", country: "Canada", countryCode: "CA", lat: 45.5017, lng: -73.5673 },
  { name: "Québec", country: "Canada", countryCode: "CA", lat: 46.8139, lng: -71.208 },
  { name: "Ottawa", country: "Canada", countryCode: "CA", lat: 45.4215, lng: -75.6972 },
  { name: "Toronto", country: "Canada", countryCode: "CA", lat: 43.6532, lng: -79.3832 },

  // Maroc / Tunisie / Algérie
  { name: "Casablanca", country: "Maroc", countryCode: "MA", lat: 33.5731, lng: -7.5898 },
  { name: "Rabat", country: "Maroc", countryCode: "MA", lat: 34.0209, lng: -6.8416 },
  { name: "Marrakech", country: "Maroc", countryCode: "MA", lat: 31.6295, lng: -7.9811 },
  { name: "Tunis", country: "Tunisie", countryCode: "TN", lat: 36.8065, lng: 10.1815 },
  { name: "Alger", country: "Algérie", countryCode: "DZ", lat: 36.7538, lng: 3.0588 },

  // International major
  { name: "Londres", country: "Royaume-Uni", countryCode: "GB", lat: 51.5074, lng: -0.1278 },
  { name: "New York", country: "États-Unis", countryCode: "US", lat: 40.7128, lng: -74.006 },
  { name: "Berlin", country: "Allemagne", countryCode: "DE", lat: 52.52, lng: 13.405 },
  { name: "Madrid", country: "Espagne", countryCode: "ES", lat: 40.4168, lng: -3.7038 },
  { name: "Barcelone", country: "Espagne", countryCode: "ES", lat: 41.3851, lng: 2.1734 },
  { name: "Rome", country: "Italie", countryCode: "IT", lat: 41.9028, lng: 12.4964 },
  { name: "Milan", country: "Italie", countryCode: "IT", lat: 45.4642, lng: 9.19 },
  { name: "Lisbonne", country: "Portugal", countryCode: "PT", lat: 38.7223, lng: -9.1393 },
  { name: "Amsterdam", country: "Pays-Bas", countryCode: "NL", lat: 52.3676, lng: 4.9041 },
  { name: "Tokyo", country: "Japon", countryCode: "JP", lat: 35.6762, lng: 139.6503 },
  { name: "Dubaï", country: "Émirats", countryCode: "AE", lat: 25.2048, lng: 55.2708 },
  { name: "Abidjan", country: "Côte d'Ivoire", countryCode: "CI", lat: 5.36, lng: -4.0083 },
  { name: "Dakar", country: "Sénégal", countryCode: "SN", lat: 14.7167, lng: -17.4677 },
];

export function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  // Match by name (starts-with first, then includes), accent-insensitive.
  const startsWith = CITIES.filter((c) => c.name.toLowerCase().startsWith(q));
  const includes = CITIES.filter(
    (c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q)
  );
  return [...startsWith, ...includes].slice(0, limit);
}

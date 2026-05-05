/**
 * Dades canòniques de les 3 seus del torneig 3×3 Westfield Glòries 2026.
 * Usat per:
 *   - /seu/:slug (pàgina dedicada per cada seu, amb mapa, transport, etc.)
 *   - Home.tsx (secció UBICACIONS, cards enllaçades a /seu/:slug)
 *   - JSON-LD SportsEvent (a index.html, per local SEO)
 *
 * Si afegeixes una nova seu, només cal afegir una entrada aquí i la pàgina
 * i el sitemap es regeneren automàticament.
 */

export type Seu = {
  slug: string;
  id: "WG" | "NC" | "RC";
  nom: string;
  tipus: string;
  rol: string;
  adreca: string;
  codiPostal: string;
  emoji: string;
  color: string;
  coords: { lat: number; lng: number };
  description: string;
  // Imatge hero (1200×630 ideal, sino zoom out)
  heroImage: string;
  // Categories que hi jugaran (slugs de la llista CATS)
  categories: string[];
  horari: string;
  // Transport públic + parking
  metro: { linies: string[]; nom: string; minutsAPeu: number };
  bus?: { linies: string[]; parada: string };
  tram?: { linies: string[]; parada: string };
  bicing?: { estacio: string; minutsAPeu: number };
  parking: { nom: string; tipus: string; preu?: string }[];
  serveis: string[];
  // Maps embed
  mapsEmbedUrl: string;
  mapsLinkUrl: string;
};

export const SEUS: Seu[] = [
  {
    slug: "westfield-glories",
    id: "WG",
    nom: "Westfield Glòries",
    tipus: "Seu Principal · FIBA 3×3",
    rol: "Pista oficial de competició Sèniors/Veterans amb punts FIBA",
    adreca: "Av. Diagonal 208, Barcelona",
    codiPostal: "08018",
    emoji: "🏬",
    color: "#F97316",
    coords: { lat: 41.4034, lng: 2.1896 },
    description:
      "La seu principal del torneig. Pista oficial de competició al pavelló del centre comercial Westfield Glòries, amb les pistes principals on es disputen les categories Sèniors i Veterans amb punts FIBA 3×3. Espai cobert i vestit per a competició internacional, amb el cartell del torneig pintat al terra: TIME CHAMBER · ETC3.",
    heroImage: "https://cbgrupbarna-3x3timechamber.com/og-court-bg.jpg",
    categories: ["Sèniors", "Veterans", "Màgics"],
    horari: "Dissabte 6 i diumenge 7 de juny · 09:00 - 21:00",
    metro: {
      linies: ["L1"],
      nom: "Glòries",
      minutsAPeu: 2,
    },
    bus: {
      linies: ["H12", "H14", "7", "92", "192"],
      parada: "Pl. Glòries / Diagonal",
    },
    tram: {
      linies: ["T4", "T5", "T6"],
      parada: "Glòries",
    },
    bicing: {
      estacio: "Plaça de les Glòries",
      minutsAPeu: 1,
    },
    parking: [
      { nom: "Pàrquing Westfield Glòries", tipus: "Soterrani 24h", preu: "Tarifa centre comercial" },
      { nom: "Encants Vells", tipus: "Zona blava", preu: "1,40€/h" },
    ],
    serveis: ["Vestidors", "Bar i restauració", "Lavabos accessibles", "Wi-Fi", "Botiga del torneig", "Punt d'aigua gratuïta"],
    mapsEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2992.0815!2d2.18713!3d41.40338!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a4a297d8d2f17b%3A0x5f7e8f6e8e3e!2sWestfield%20Gl%C3%B2ries!5e0!3m2!1sca!2ses!4v1700000000000",
    mapsLinkUrl: "https://maps.google.com/?q=Westfield+Glòries+Av+Diagonal+208+Barcelona",
  },
  {
    slug: "nau-del-clot",
    id: "NC",
    nom: "La Nau del Clot",
    tipus: "Pavelló Oficial · Categories Formatives",
    rol: "Pavelló del CB Grup Barna · Escola, Premini, Mini, Preinfantil, Infantil, Cadet, Junior",
    adreca: "Carrer de la Llacuna 172, Barcelona",
    codiPostal: "08018",
    emoji: "🏟️",
    color: "#E31E24",
    coords: { lat: 41.4063, lng: 2.1921 },
    description:
      "El pavelló històric del CB Grup Barna al Clot. Pista coberta on es disputen totes les categories formatives (Escola → Junior). És el pavelló on entrenen els equips del club tot l'any: ambient familiar, grades acollidores i molta energia base.",
    heroImage: "/images/hero-edicio-anterior.jpg",
    categories: ["Escola", "Premini", "Mini", "Preinfantil", "Infantil", "Cadet", "Junior"],
    horari: "Dissabte 6 i diumenge 7 de juny · 08:30 - 20:00",
    metro: {
      linies: ["L1"],
      nom: "Clot",
      minutsAPeu: 6,
    },
    bus: {
      linies: ["H12", "92", "192", "B23"],
      parada: "Llacuna / Trinxant",
    },
    bicing: {
      estacio: "Llacuna - Pere IV",
      minutsAPeu: 3,
    },
    parking: [
      { nom: "Carrer Llacuna", tipus: "Zona blava + verda", preu: "Variable per zona" },
      { nom: "Aparcament Clot Comerç", tipus: "Privat soterrani" },
    ],
    serveis: ["Vestidors club", "Lavabos", "Punt d'aigua", "Zona pares/familiars"],
    mapsEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2991.7!2d2.1921!3d41.4063!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCarrer+de+la+Llacuna+172%2C+Barcelona!5e0!3m2!1sca!2ses!4v1700000000000",
    mapsLinkUrl: "https://maps.google.com/?q=Carrer+de+la+Llacuna+172+Barcelona",
  },
  {
    slug: "rambleta-del-clot",
    id: "RC",
    nom: "Rambleta del Clot",
    tipus: "Pista Exterior · Streetball",
    rol: "Pista 3×3 a l'aire lliure al Poblenou-Clot · ambient de barri, exhibicions i Open Day",
    adreca: "Rambla del Poblenou / Clot, Barcelona",
    codiPostal: "08018",
    emoji: "🌳",
    color: "#EAB308",
    coords: { lat: 41.4074, lng: 2.1876 },
    description:
      "La pista exterior del barri del Clot, sobre la rambla, amb arbres i terrasses al voltant. Espai d'exhibicions, partits oberts d'Open Day i activitats per a famílies. La més 'streetball' del torneig: ambient festiu, públic de pas, ideal per veure 3×3 amb una canya a la mà.",
    heroImage: "/images/streetball-urba.jpg",
    categories: ["Open Day", "Exhibicions", "Concursos (mate, triple)"],
    horari: "Dissabte 6 i diumenge 7 de juny · 11:00 - 22:00",
    metro: {
      linies: ["L1"],
      nom: "Clot",
      minutsAPeu: 5,
    },
    bus: {
      linies: ["H12", "B25", "40", "42"],
      parada: "Rambla del Poblenou",
    },
    bicing: {
      estacio: "Rambla del Poblenou",
      minutsAPeu: 1,
    },
    parking: [
      { nom: "Rambla del Poblenou", tipus: "Zona verda (residents)" },
      { nom: "Aragó / Clot", tipus: "Zona blava", preu: "1,40€/h" },
    ],
    serveis: ["Pista oberta a l'aire lliure", "Bars i restaurants a la rambla", "Bici-parking", "Zona DJ + activitats"],
    mapsEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2991.7!2d2.1876!3d41.4074!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sRambla+del+Poblenou+Clot!5e0!3m2!1sca!2ses!4v1700000000000",
    mapsLinkUrl: "https://maps.google.com/?q=Rambla+del+Poblenou+Clot+Barcelona",
  },
];

export function getSeuBySlug(slug: string | undefined): Seu | undefined {
  if (!slug) return undefined;
  return SEUS.find(s => s.slug === slug);
}

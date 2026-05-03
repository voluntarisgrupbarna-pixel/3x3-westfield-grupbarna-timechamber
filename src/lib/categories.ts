/**
 * Categories del torneig 3×3 Westfield Glòries 2026 amb places per categoria.
 *
 * Total = 100 equips (canviar `quota` per redistribuir).
 *
 * Aquesta llista és la font canònica i s'utilitza a:
 *   - Inscripcion.tsx (form dropdown)
 *   - LlistaEspera.tsx (form dropdown)
 *   - CategoryChart.tsx (visualització de places ocupades)
 *   - Apps Script (doGet retorna byCategory amb aquestes claus)
 */

export type CategoriaInfo = {
  /** Nom canònic (mateix que apareix al dropdown del form i al Sheet) */
  name: string;
  /** Places previstes per aquesta categoria */
  quota: number;
  /** Edats orientatives (per ajudar els jugadors a triar) */
  edats: string;
  /** Color tailwind per la barra de progrés */
  color: string;
  /** Emoji representatiu */
  emoji: string;
  /** És categoria principal amb prize money / punts FIBA? */
  premium?: boolean;
};

export const CATEGORIES: CategoriaInfo[] = [
  { name: "Escola",      quota:  8, edats: "fins 7 anys",   emoji: "🌱", color: "from-green-400 to-emerald-400" },
  { name: "Premini",     quota:  6, edats: "8-9 anys",      emoji: "🍼", color: "from-cyan-400 to-blue-400" },
  { name: "Mini",        quota:  8, edats: "10-11 anys",    emoji: "⭐", color: "from-blue-400 to-indigo-400" },
  { name: "Preinfantil", quota: 10, edats: "12 anys",       emoji: "🚀", color: "from-indigo-400 to-purple-400" },
  { name: "Infantil",    quota: 12, edats: "13-14 anys",    emoji: "🔥", color: "from-purple-400 to-pink-400" },
  { name: "Cadet",       quota: 12, edats: "15-16 anys",    emoji: "⚡", color: "from-pink-400 to-rose-400" },
  { name: "Junior",      quota: 15, edats: "17-18 anys",    emoji: "🏀", color: "from-rose-400 to-red-400" },
  { name: "Sèniors",     quota: 15, edats: "18+ FIBA",      emoji: "🏆", color: "from-red-500 to-orange-500", premium: true },
  { name: "Veterans",    quota: 10, edats: "+35 anys",      emoji: "💪", color: "from-orange-500 to-amber-500", premium: true },
  { name: "Màgics",      quota:  4, edats: "Inclusiva",     emoji: "✨", color: "from-amber-400 to-yellow-400" },
];

export const TOTAL_CAPACITY = CATEGORIES.reduce((sum, c) => sum + c.quota, 0);

export const CAT_NAMES = CATEGORIES.map(c => c.name);

/** Retorna la quota d'una categoria pel seu nom (case-insensitive). 0 si no existeix. */
export function getQuota(name: string | undefined): number {
  if (!name) return 0;
  const c = CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase());
  return c?.quota ?? 0;
}

/** Retorna la info completa d'una categoria. */
export function getCategoryInfo(name: string | undefined): CategoriaInfo | undefined {
  if (!name) return undefined;
  return CATEGORIES.find(c => c.name.toLowerCase() === name.toLowerCase());
}

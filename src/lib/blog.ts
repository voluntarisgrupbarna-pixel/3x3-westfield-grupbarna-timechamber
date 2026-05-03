/**
 * Blog del 3×3 Westfield Glòries.
 * Posts per long-tail SEO. Cada post té un slug, metadata i el component JSX.
 */
import { ComponentType } from "react";
import PostComPreparar from "@/blog/post-com-preparar";
import PostDiferencies from "@/blog/post-diferencies-3x3-5x5";
import PostHistoria from "@/blog/post-historia-3x3-barcelona";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;        // ISO yyyy-mm-dd
  readingMinutes: number;
  tags: string[];
  cover: string;
  Component: ComponentType;
};

export const POSTS: BlogPost[] = [
  {
    slug: "com-preparar-el-teu-primer-torneig-3x3",
    title: "Com preparar el teu primer torneig 3×3: guia per equips novells",
    excerpt: "Tot el que has de saber abans del teu primer 3×3: com triar els 3-5 jugadors, regles bàsiques que solen sorprendre, què portar el dia, estratègia d'equip i errors típics que pots estalviar-te.",
    date: "2026-05-04",
    readingMinutes: 8,
    tags: ["3x3", "primer torneig", "guia", "preparació"],
    cover: "https://cbgrupbarna-3x3timechamber.com/og-court-action.jpg",
    Component: PostComPreparar,
  },
  {
    slug: "diferencies-3x3-5x5-regles-fiba",
    title: "Diferències entre 3×3 i 5×5: regles oficials FIBA explicades",
    excerpt: "Pista, sistema de punteig, shot clock, faltes, substitucions: comparativa pràctica de les regles de 3×3 vs el bàsquet tradicional 5×5 segons la federació FIBA.",
    date: "2026-05-04",
    readingMinutes: 9,
    tags: ["3x3", "regles", "fiba", "diferències", "5x5"],
    cover: "https://cbgrupbarna-3x3timechamber.com/og-court-bg.jpg",
    Component: PostDiferencies,
  },
  {
    slug: "historia-3x3-barcelona-del-carrer-als-jjoo",
    title: "Història del 3×3 a Barcelona: del carrer als Jocs Olímpics",
    excerpt: "Com el bàsquet de carrer barceloní va passar de pistes de barri a esport olímpic. Cronologia 1980-2026: streetball als 90s, FIBA 3×3 oficial el 2017, debut a Tòquio 2021 i el present del 3×3 a la ciutat.",
    date: "2026-05-04",
    readingMinutes: 10,
    tags: ["3x3", "història", "barcelona", "olímpics", "streetball"],
    cover: "https://cbgrupbarna-3x3timechamber.com/og-image.png",
    Component: PostHistoria,
  },
];

export function getPostBySlug(slug: string | undefined): BlogPost | undefined {
  if (!slug) return undefined;
  return POSTS.find(p => p.slug === slug);
}

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Calendar, ArrowRight } from "lucide-react";
import { POSTS } from "@/lib/blog";

/**
 * /blog — Index de tots els articles. Seu SEO long-tail per intents informacionals.
 * Cada post enllaça a /blog/:slug.
 */

export default function Blog() {
  useEffect(() => {
    document.title = "Blog · Articles 3×3 · CB Grup Barna · Time Chamber 2026";
    setMeta("description", "Articles sobre bàsquet 3×3: regles oficials FIBA, com preparar el teu primer torneig i la història del 3×3 a Barcelona, dels carrers als Jocs Olímpics.");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">BLOG</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl relative">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-center mb-10">
          <span className="inline-block bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            Articles · Bàsquet 3×3 · Català
          </span>
          <h1 className="font-black text-4xl sm:text-5xl uppercase tracking-tight mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Blog del torneig
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-sm leading-relaxed">
            Articles llargs sobre bàsquet 3×3: regles, història, preparació de torneigs i tot el que has de saber abans de jugar.
          </p>
        </motion.div>

        {/* Llistat de posts */}
        <div className="space-y-5">
          {POSTS.map((p, i) => (
            <motion.article key={p.slug}
              initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}>
              <Link to={`/blog/${p.slug}`} className="block bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-red-500/40 rounded-2xl overflow-hidden transition-colors group">
                <div className="grid sm:grid-cols-[200px_1fr]">
                  <div className="aspect-video sm:aspect-auto sm:h-full relative overflow-hidden">
                    <img src={p.cover} alt="" loading="lazy" decoding="async"
                      className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent sm:bg-gradient-to-r"/>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(p.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {p.readingMinutes} min</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black leading-tight mb-2 group-hover:text-red-300 transition-colors" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
                      {p.title}
                    </h2>
                    <p className="text-sm text-white/60 leading-relaxed mb-3">{p.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {p.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] uppercase tracking-wider font-bold bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                      <span className="text-xs text-red-300 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Llegir <ArrowRight className="w-3.5 h-3.5"/>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["", "Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10)]} ${y}`;
}

function setMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

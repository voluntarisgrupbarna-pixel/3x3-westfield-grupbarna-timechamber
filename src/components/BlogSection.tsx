import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Mail, Bell, Check, Loader2 } from "lucide-react";
import { POSTS } from "@/lib/blog";
import { tracker } from "@/lib/track";

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";

/**
 * Secció Blog del Home: 3 articles destacats + formulari de subscripció
 * a notificacions per email quan publiquem nou contingut.
 */

export default function BlogSection() {
  return (
    <section id="blog" className="py-20 bg-slate-900 relative overflow-hidden scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="text-center mb-10">
          <span className="inline-block bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            Blog · Articles 3×3
          </span>
          <h2 className="font-black text-3xl sm:text-5xl uppercase tracking-tight mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Aprèn 3×3 amb<br /><span className="text-red-500">els nostres articles</span>
          </h2>
          <p className="text-white/55 max-w-xl mx-auto text-sm leading-relaxed">
            Guies, regles oficials FIBA i història del bàsquet 3×3. Articles llargs en català, fets pel CB Grup Barna.
          </p>
        </motion.div>

        {/* 3 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {POSTS.map((p, i) => (
            <motion.article key={p.slug}
              initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              transition={{ delay: i * 0.08 }}>
              <Link to={`/blog/${p.slug}`}
                className="block bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-red-500/40 rounded-2xl overflow-hidden transition-colors group h-full">
                <div className="aspect-video relative overflow-hidden">
                  <img src={p.cover} alt="" loading="lazy" decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/80 font-bold">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(p.date)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {p.readingMinutes} min</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-black text-lg leading-tight mb-2 group-hover:text-red-300 transition-colors line-clamp-2" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
                    {p.title}
                  </h3>
                  <p className="text-xs text-white/55 leading-relaxed line-clamp-3 mb-3">{p.excerpt}</p>
                  <span className="text-xs text-red-300 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Llegir article <ArrowRight className="w-3.5 h-3.5"/>
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Veure tot */}
        <div className="text-center mb-12">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-red-300 hover:text-red-200 transition-colors">
            Veure tots els articles <ArrowRight className="w-4 h-4"/>
          </Link>
        </div>

        {/* Subscribe form */}
        <SubscribeForm />
      </div>
    </section>
  );
}

function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [name, setName]   = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<"" | "ok" | "err">("");

  // Si ja s'ha subscrit en aquesta sessió no tornem a mostrar el form
  const alreadySubscribed = typeof window !== "undefined"
    && localStorage.getItem("blog_subscribed_v1") === "1";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSending(true);
    setDone("");
    try {
      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            email: email.trim(),
            nom: name.trim(),
            data: new Date().toLocaleString("ca-ES"),
            source: "home_blog_section",
          }),
        });
      }
      tracker.equipShared("newsletter_subscribed");
      try { localStorage.setItem("blog_subscribed_v1", "1"); } catch {}
      setDone("ok");
    } catch {
      setDone("err");
    } finally {
      setSending(false);
    }
  };

  if (alreadySubscribed || done === "ok") {
    return (
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
        className="bg-green-500/10 border-2 border-green-500/40 rounded-2xl p-5 max-w-2xl mx-auto text-center">
        <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto mb-2">
          <Check className="w-5 h-5 text-green-400"/>
        </div>
        <p className="font-bold text-green-300 text-sm">✓ Estàs subscrit/a al blog</p>
        <p className="text-xs text-white/50 mt-1">T'enviarem un email cada vegada que publiquem un nou article. Sense spam, només contingut útil.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
      className="bg-gradient-to-br from-red-600/15 to-orange-500/10 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
          <Bell className="w-5 h-5 text-red-300"/>
        </div>
        <div>
          <h3 className="font-black text-lg uppercase tracking-tight" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Subscriu-te al blog
          </h3>
          <p className="text-xs text-white/55">Rebràs un email quan publiquem nous articles. Cap spam.</p>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-2.5">
        <div className="grid sm:grid-cols-2 gap-2.5">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="El teu nom (opcional)"
            className="bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors" />
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="email@exemple.com *"
            className="bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors" />
        </div>
        <button type="submit" disabled={sending}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold uppercase tracking-wider py-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
          {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Subscrivint…</> : <><Mail className="w-4 h-4"/> Subscriu-me</>}
        </button>
        {done === "err" && <p className="text-red-400 text-xs text-center">Error. Torna a provar o escriu-nos per WhatsApp.</p>}
        <p className="text-[10px] text-white/35 text-center leading-relaxed">
          En subscriure't acceptes que rebem el teu email per enviar-te articles del blog. Pots cancel·lar la subscripció en qualsevol moment respondent un email amb "BAIXA".
        </p>
      </form>
    </motion.div>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["", "Gen","Feb","Mar","Abr","Mai","Jun","Jul","Ago","Set","Oct","Nov","Des"];
  return `${parseInt(d, 10)} ${meses[parseInt(m, 10)]} ${y}`;
}

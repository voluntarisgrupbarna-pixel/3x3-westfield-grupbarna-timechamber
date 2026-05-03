import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, User, MapPin, Calendar, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tracker } from "@/lib/track";

/* ─── Page d'equip · llegeix params de la URL ───
   Format URL: /equip?nom=Barcelona+Ballers&cap=Joan+Garcia&cat=Senior+Pro+Masculí
   Quan tinguem Apps Script al backend, en lloc de query params hi haurà
   /equip/[slug] que farà fetch del Sheet via Apps Script per data fresca.
*/

const SPA_URL_BASE = "https://cbgrupbarna-3x3timechamber.com";
/* Worker URL per compartir — quan algú comparteix l'URL del worker, els crawlers de
   xarxes socials (WhatsApp/Twitter/IG) reben una imatge OG personalitzada amb el nom
   de l'equip. Els humans es redirigeixen automàticament a la SPA. */
const SHARE_URL_BASE = (import.meta.env.VITE_SHARE_BASE as string | undefined) || SPA_URL_BASE;

function buildShareUrl(params: URLSearchParams): string {
  const usp = new URLSearchParams();
  ["nom", "cap", "cat", "club", "jug"].forEach(k => {
    const v = params.get(k);
    if (v) usp.set(k, v);
  });
  return `${SHARE_URL_BASE}/equip?${usp.toString()}`;
}

export default function Equip() {
  const [params] = useSearchParams();

  const nom      = params.get("nom")  || "Equip Sense Nom";
  const cap      = params.get("cap")  || "—";
  const cat      = params.get("cat")  || "Categoria pendent";
  const club     = params.get("club") || "";
  const numJug   = params.get("jug")  || "4";

  // GA4: trackejar visualització de pàgina d'equip
  useEffect(() => {
    tracker.equipVisualitzat(nom, cat);
  }, [nom, cat]);

  const shareUrl = buildShareUrl(params);
  const shareTextWA  = `🏀 ${nom} ja som al 3×3 Westfield Glòries 2026! Categoria ${cat} · 6-7 Juny a Barcelona. Vine a animar-nos! 👉 ${shareUrl}`;
  const shareTextTW  = `🏀 ${nom} · 3×3 Westfield Glòries 2026 · ${cat} · 6-7 Juny BCN`;
  const shareTextIG  = `${shareUrl}`;

  const onNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: `${nom} · 3×3 Westfield Glòries`, text: shareTextWA, url: shareUrl });
        tracker.equipShared("native");
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard?.writeText(shareUrl);
      tracker.equipShared("clipboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">EQUIP</span>
          <div className="text-xs text-white/30 hidden sm:block">6-7 Juny 2026</div>
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-10 md:py-16 max-w-2xl">
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 mb-5">
            <Trophy className="w-3.5 h-3.5 text-red-400"/>
            <span className="text-xs font-bold uppercase tracking-widest text-red-300">Equip inscrit</span>
          </div>
          <h1
            className="text-4xl md:text-6xl font-black mb-3 leading-[1.05] bg-gradient-to-br from-white via-white to-red-200 bg-clip-text text-transparent"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            {nom.toUpperCase()}
          </h1>
          <p className="text-white/60 text-sm md:text-base">
            Som al 3×3 Westfield Glòries · {cat}
          </p>
        </motion.div>

        {/* Card amb info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-red-400 mt-1 shrink-0"/>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Capità</p>
                <p className="text-white font-semibold">{cap}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-4 h-4 text-red-400 mt-1 shrink-0"/>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Categoria</p>
                <p className="text-white font-semibold">{cat}</p>
              </div>
            </div>
            {club && (
              <div className="flex items-start gap-3">
                <Trophy className="w-4 h-4 text-red-400 mt-1 shrink-0"/>
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Club</p>
                  <p className="text-white font-semibold">{club}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-red-400 mt-1 shrink-0"/>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Dates</p>
                <p className="text-white font-semibold">6-7 Juny 2026</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-red-400 mt-1 shrink-0"/>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Seu</p>
                <p className="text-white font-semibold">Westfield Glòries · Barcelona</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-4 h-4 mt-1 shrink-0 text-red-400 text-sm">👥</span>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-0.5">Mida equip</p>
                <p className="text-white font-semibold">{numJug} jugadors</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Share section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-br from-red-600/15 to-orange-500/10 border border-red-500/30 rounded-3xl p-6 md:p-8 mb-6"
        >
          <h2 className="text-lg font-black mb-2 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-red-400"/> Vols que vinguin a animar-vos?
          </h2>
          <p className="text-sm text-white/60 mb-5">
            Comparteix la pàgina del teu equip. Que els teus, els seus, i els seus, sàpiguen on jugareu.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareTextWA)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => tracker.equipShared("whatsapp")}
              className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-bold px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              WhatsApp
            </a>
            {/* Twitter / X */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextTW)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => tracker.equipShared("twitter")}
              className="flex items-center justify-center gap-2 bg-black hover:bg-white/10 text-white font-bold px-4 py-3 rounded-xl border border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X / Twitter
            </a>
            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTextTW)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => tracker.equipShared("telegram")}
              className="flex items-center justify-center gap-2 bg-[#26A5E4] hover:bg-[#1f8fc6] text-white font-bold px-4 py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.192-.46.16-1.082.362-1.61.984-.133.155-.265.354-.347.628s-.111.67.039 1.001c.181.398.518.625.829.808.31.183.621.3.94.42.55.21 1.135.408 1.638.564.504.156.945.282 1.247.36.04.01.077.018.11.026 0 0 1.018.358 1.6.55.337.116.715.262 1.103.413.388.15.788.305 1.143.42.184.06.353.114.494.16.073.025.13.044.18.06l.063.018.064.018a.5.5 0 0 0 .11.022c.022.002.044.003.066.003.044 0 .088-.005.13-.013l.022-.005.073-.012c.058-.011.139-.027.235-.05a3.06 3.06 0 0 0 .55-.183c.236-.103.526-.262.847-.493.642-.461 1.482-1.222 2.43-2.142.95-.92 2.005-1.997 3.026-3.044a91.5 91.5 0 0 0 1.461-1.527l.184-.197.05-.054.013-.014.003-.003.001-.001v-.001c.001 0 0 0 0 0l-.71-.708.71.708s.001-.001 0-.001v-.001c.082-.087.155-.187.215-.298.06-.111.107-.234.137-.367a1.524 1.524 0 0 0-.04-.84 1.41 1.41 0 0 0-.292-.477 1.32 1.32 0 0 0-.42-.295 1.276 1.276 0 0 0-.487-.099z"/></svg>
              Telegram
            </a>
            {/* Native share / copy */}
            <button
              onClick={onNativeShare}
              className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 text-white font-bold px-4 py-3 rounded-xl border border-white/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4"/>
              Més opcions
            </button>
          </div>
          <p className="text-[10px] text-white/40 text-center">
            En compartir el link, els teus contactes veuran una preview chula amb el cartell del torneig.
          </p>
        </motion.div>

        {/* CTA al torneig */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm mb-4">Encara no t'has inscrit? Estàs a temps:</p>
          <Link to="/inscripcion">
            <Button className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider py-4 px-7 rounded-xl hover:scale-105 transition-all h-auto">
              🏀 Inscriu el teu equip
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

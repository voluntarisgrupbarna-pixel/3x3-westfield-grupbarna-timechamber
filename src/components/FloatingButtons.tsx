import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Copy, Check, MessageCircle } from "lucide-react";
import { tracker } from "@/lib/track";

/**
 * 2 botons flotants al cantó dret del Home:
 *
 *   ⬛ WhatsApp Q&A (verd, baix-dreta)
 *      → obre wa.me/+34698425153 amb missatge pre-omplert "Tinc dubtes…"
 *      → conversa directa amb Ana per a conversion 1:1
 *
 *   ⬜ Share (vermell, baix-dreta sobre el WhatsApp)
 *      → desplega menú: TikTok, Instagram, WhatsApp share, X/Twitter,
 *        Telegram, Copy link, Native Share API si disponible.
 */

const WHATSAPP_QA_URL = "https://wa.me/+34698425153?text=" + encodeURIComponent(
  "Hola! 👋 Tinc dubtes sobre el 3×3 Westfield Glòries 2026. Em podeu ajudar?"
);

const SHARE_URL = "https://cbgrupbarna-3x3timechamber.com/";
const SHARE_TEXT = "🏀 3×3 Westfield Glòries 2026 · Torneig FIBA a Barcelona · 100 equips · 6-7 Juny · 2.400€ prize money. Inscriu-te ja!";

export default function FloatingButtons() {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tanca el menú quan es fa clic fora
  useEffect(() => {
    if (!shareOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [shareOpen]);

  const tryNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "3×3 Westfield Glòries 2026", text: SHARE_TEXT, url: SHARE_URL });
        tracker.equipShared("native_home");
        setShareOpen(false);
        return true;
      } catch { /* user cancelled */ }
    }
    return false;
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      tracker.equipShared("copy_link_home");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <>
      {/* Share button (sobre el WhatsApp) */}
      <div className="fixed bottom-24 right-5 z-[55]" ref={menuRef}>
        <AnimatePresence>
          {shareOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-14 right-0 bg-slate-900 border border-white/15 rounded-2xl p-3 shadow-2xl min-w-[260px] max-w-[300px]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/55">Comparteix el torneig</span>
                <button onClick={() => setShareOpen(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <ShareItem
                color="bg-[#25D366]"
                label="WhatsApp"
                url={`https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} 👉 ${SHARE_URL}`)}`}
                onClick={() => tracker.equipShared("whatsapp_home")}
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>}
              />

              <ShareItem
                color="bg-gradient-to-r from-[#FF0069] via-[#D300C5] to-[#7638FA]"
                label="Instagram (story)"
                onClick={async () => {
                  const ok = await tryNativeShare();
                  if (!ok) {
                    await copyLink();
                    alert("Enllaç copiat ✓ · Obre Instagram, posa una nova story i enganxa l'enllaç al sticker 'Link'.");
                  }
                  tracker.equipShared("instagram_home");
                }}
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
              />

              <ShareItem
                color="bg-black border border-white/20"
                label="TikTok (copia link)"
                onClick={async () => {
                  await copyLink();
                  alert("Enllaç copiat ✓ · Obre TikTok, fes una story o vídeo i enganxa l'enllaç al text o als comentaris fixats.");
                  tracker.equipShared("tiktok_home");
                }}
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>}
              />

              <ShareItem
                color="bg-black"
                label="X / Twitter"
                url={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`}
                onClick={() => tracker.equipShared("twitter_home")}
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
              />

              <ShareItem
                color="bg-[#0088CC]"
                label="Telegram"
                url={`https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}`}
                onClick={() => tracker.equipShared("telegram_home")}
                icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>}
              />

              <button onClick={copyLink}
                className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors mt-1.5">
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400"/> : <Copy className="w-3.5 h-3.5 text-white/60"/>}
                </div>
                {copied ? "Enllaç copiat ✓" : "Copiar enllaç"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setShareOpen(o => !o)}
          aria-label={shareOpen ? "Tancar menú compartir" : "Compartir el torneig"}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 transition-all text-white font-bold px-4 py-3 rounded-full shadow-lg shadow-red-600/30 ring-2 ring-white/10"
        >
          <Share2 className="w-5 h-5"/>
          <span className="text-sm hidden sm:inline">Compartir</span>
        </button>
      </div>

      {/* WhatsApp Q&A — bottom-right, separat del Share */}
      <a
        href={WHATSAPP_QA_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pregunta'ns per WhatsApp · Contact directe"
        onClick={() => tracker.ctaWhatsAppHomeClick()}
        className="fixed bottom-5 right-5 z-[55] flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] active:scale-95 transition-all text-white px-4 py-3 rounded-full shadow-lg shadow-green-500/30 ring-2 ring-white/10 motion-safe:animate-pulse motion-safe:hover:animate-none"
      >
        <MessageCircle className="w-5 h-5" fill="currentColor"/>
        <span className="text-sm font-bold hidden sm:inline">Pregunta'ns</span>
      </a>
    </>
  );
}

function ShareItem({ color, label, url, onClick, icon }: {
  color: string;
  label: string;
  url?: string;
  onClick?: () => void;
  icon: React.ReactNode;
}) {
  const Component: any = url ? "a" : "button";
  const props = url ? { href: url, target: "_blank", rel: "noopener noreferrer", onClick } : { onClick };
  return (
    <Component {...props}
      className="w-full flex items-center gap-3 hover:bg-white/5 rounded-lg px-2 py-2 text-sm font-semibold text-white transition-colors group">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${color}`}>{icon}</div>
      <span className="flex-1 text-left">{label}</span>
    </Component>
  );
}

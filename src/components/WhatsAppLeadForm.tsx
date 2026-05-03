import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Phone, Loader2, Check } from "lucide-react";
import { tracker } from "@/lib/track";

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";

const WHATSAPP_NUMBER = "+34698425153";

export type WhatsAppLeadSource =
  | "home_fab"
  | "faq"
  | "premsa"
  | "sobre_nosaltres"
  | "inscripcio_individual"
  | "post_inscripcio"
  | "landing_contacte"
  | "linktree";

const PRE_TEXT_BY_SOURCE: Record<WhatsAppLeadSource, string> = {
  home_fab: "Hola! Tinc un dubte sobre el 3×3 Westfield Glòries.",
  faq: "Hola! Tinc una pregunta sobre el 3×3 Westfield Glòries.",
  premsa: "Hola · sóc de premsa, sobre el 3×3 Westfield Glòries.",
  sobre_nosaltres: "Hola! M'agradaria contactar amb el CB Grup Barna.",
  inscripcio_individual: "Hola! Tinc dubtes sobre la inscripció individual al 3×3.",
  post_inscripcio: "Hola! Acabo d'enviar la inscripció del meu equip al 3×3 Westfield Glòries. Podeu confirmar la recepció?",
  landing_contacte: "Hola CB Grup Barna! M'agradaria contactar amb vosaltres.",
  linktree: "Hola CB Grup Barna! Vinc del Linktree i vull contactar amb vosaltres.",
};

// Format espanyol o internacional. Accepta espais i guions; els netegem abans de validar.
const PHONE_REGEX = /^(\+?\d{8,15})$/;

/**
 * Modal que captura el telèfon del lead ABANS d'obrir WhatsApp.
 * El telèfon es desa a la pestanya `Llista_Difusio_3x3` del Sheet (via Apps Script)
 * perquè Ana el pugui afegir més tard a una llista de difusió de WhatsApp.
 *
 * Mínima fricció: només telèfon + casella RGPD obligatòria.
 */
export default function WhatsAppLeadForm({
  open,
  onClose,
  source = "home_fab",
}: {
  open: boolean;
  onClose: () => void;
  source?: WhatsAppLeadSource;
}) {
  const [telefon, setTelefon] = useState("");
  const [acceptaRgpd, setAcceptaRgpd] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 150);
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneClean = telefon.replace(/[\s\-().]/g, "");
    if (!PHONE_REGEX.test(phoneClean)) {
      setError("Telèfon no vàlid. Format: 600000000 o +34600000000.");
      return;
    }
    if (!acceptaRgpd) {
      setError("Has d'acceptar rebre informació per WhatsApp per continuar.");
      return;
    }
    setSending(true);
    setError("");
    try {
      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "whatsapp_lead",
            nom: "",
            telefon: phoneClean,
            email: "",
            dubte: "",
            acceptaRgpd: true,
            data: new Date().toLocaleString("ca-ES"),
            source,
          }),
        });
      }
      tracker.ctaWhatsAppHomeClick();

      const text = PRE_TEXT_BY_SOURCE[source] || PRE_TEXT_BY_SOURCE.home_fab;
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        onClose();
        setTelefon("");
        setAcceptaRgpd(false);
      }, 300);
    } catch {
      setError("Error enviant. Prova de nou o escriu-nos a voluntaris@grupbarna.info");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-slate-950 border-2 border-[#25D366]/40 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-green-500/20 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] p-5 relative">
              <button onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
                aria-label="Tancar">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-white" fill="currentColor"/>
                </div>
                <div>
                  <h2 className="font-black text-xl text-white" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
                    Pregunta'ns per WhatsApp
                  </h2>
                  <p className="text-white/85 text-xs">T'enviem novetats del 3×3 quan hi hagi</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="p-5 space-y-4">
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#25D366]"/>
                  El teu telèfon *
                </span>
                <input
                  ref={firstFieldRef}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={telefon}
                  onChange={e => setTelefon(e.target.value)}
                  placeholder="600 000 000"
                  className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] text-white placeholder:text-white/30 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                />
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptaRgpd}
                  onChange={e => setAcceptaRgpd(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/30 bg-white/10 text-[#25D366] focus:ring-[#25D366] focus:ring-offset-slate-950 cursor-pointer accent-[#25D366]"
                />
                <span className="text-[11px] text-white/65 leading-relaxed">
                  Accepto rebre informació del torneig 3×3 per WhatsApp (categories, places, recordatoris). Pots demanar baixa quan vulguis. <span className="text-white/40">(RGPD · CB Grup Barna)</span>
                </span>
              </label>

              {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}

              <button type="submit" disabled={sending}
                className="w-full bg-[#25D366] hover:bg-[#1da851] disabled:opacity-60 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Obrint WhatsApp…</> : <><Check className="w-4 h-4"/> Continuar a WhatsApp</>}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

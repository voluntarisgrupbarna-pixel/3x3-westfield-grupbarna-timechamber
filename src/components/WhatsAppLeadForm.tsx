import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Phone, Loader2, Check, ArrowRight } from "lucide-react";
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

export type LeadEvent = "tres_x_tres" | "campus" | "portes_obertes" | "general";
export type LeadIntent = "info" | "prueba" | "reserva" | "general";

export type LeadQuestion = {
  id: string;
  label: string;
  options: string[];
  required?: boolean;
};

/**
 * Opció ràpida de "tipus de dubte" que es mostra com a chip al pas 1
 * (al costat del telèfon). Quan l'usuari en selecciona una:
 *   - El missatge prellenat de WhatsApp passa a ser `waText`
 *   - El `label` es desa a la columna "Dubte / Consulta" del Sheet
 *
 * Pensat per al cas "1 botó WhatsApp + N intents" típic del FAB del 3x3.
 */
export type DubteOption = {
  id: string;
  label: string;
  waText: string;
};

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

const PRE_TEXT_BY_EVENT_INTENT: Record<string, string> = {
  "tres_x_tres:info":      "Hola! Vull info del torneig 3×3 Westfield Glòries.",
  "tres_x_tres:reserva":   "Hola! Vull inscriure el meu equip al 3×3 Westfield Glòries.",
  "campus:info":           "Hola! Vull info del Campus d'Estiu Time Chamber.",
  "campus:prueba":         "Hola! M'agradaria que el meu fill/a provi gratis el Campus d'Estiu.",
  "campus:reserva":        "Hola! Vull reservar plaça al Campus d'Estiu Time Chamber.",
  "portes_obertes:info":   "Hola! Vull info de les Portes Obertes del CB Grup Barna.",
  "portes_obertes:prueba": "Hola! Vull venir a una sessió de prova del CB Grup Barna.",
  "portes_obertes:reserva":"Hola! Vull apuntar el meu fill/a al CB Grup Barna.",
  "general:info":          "Hola CB Grup Barna! Vull més info.",
};

const ACCENT_BY_EVENT: Record<LeadEvent, { ring: string; from: string; to: string }> = {
  tres_x_tres:    { ring: "border-[#25D366]/40 shadow-green-500/20", from: "from-[#25D366]",   to: "to-[#128C7E]" },
  campus:         { ring: "border-orange-400/40 shadow-orange-500/20", from: "from-orange-500", to: "to-amber-600" },
  portes_obertes: { ring: "border-red-400/40 shadow-red-500/20",        from: "from-red-600",    to: "to-rose-700" },
  general:        { ring: "border-[#25D366]/40 shadow-green-500/20",    from: "from-[#25D366]",   to: "to-[#128C7E]" },
};

const PHONE_REGEX = /^(\+?\d{8,15})$/;

function getUtms(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "code"].forEach(k => {
    const v = sp.get(k);
    if (v) out[k] = v;
  });
  return out;
}

/**
 * Modal de captura WhatsApp generalitzat per a 3 events:
 *  - 3×3 (tres_x_tres) · Campus (campus) · Portes Obertes (portes_obertes)
 *
 * Flux: tel + RGPD → (opcional) preguntes ràpides → wa.me amb missatge prellenat.
 * Tots els camps es desen a la pestanya `Llista_Difusio_<Event>` del Sheet via Apps Script.
 */
export default function WhatsAppLeadForm({
  open,
  onClose,
  source = "home_fab",
  event,
  intent,
  questions,
  dubteOptions,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  source?: WhatsAppLeadSource;
  event?: LeadEvent;
  intent?: LeadIntent;
  questions?: LeadQuestion[];
  dubteOptions?: DubteOption[];
  title?: string;
  subtitle?: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [telefon, setTelefon] = useState("");
  const [acceptaRgpd, setAcceptaRgpd] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dubteId, setDubteId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const accent = ACCENT_BY_EVENT[event || "general"];
  const hasQuestions = !!(questions && questions.length > 0);
  const hasDubteOptions = !!(dubteOptions && dubteOptions.length > 0);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTimeout(() => firstFieldRef.current?.focus(), 150);
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  const submitTel = (e: React.FormEvent) => {
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
    if (hasDubteOptions && !dubteId) {
      setError("Tria sobre què preguntes per continuar.");
      return;
    }
    setError("");
    if (hasQuestions) {
      setStep(2);
    } else {
      finalSubmit(phoneClean, {});
    }
  };

  const submitQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    if (questions) {
      for (const q of questions) {
        if (q.required && !answers[q.id]) {
          setError(`Tria una opció per "${q.label}"`);
          return;
        }
      }
    }
    setError("");
    const phoneClean = telefon.replace(/[\s\-().]/g, "");
    finalSubmit(phoneClean, answers);
  };

  const skipQuestions = () => {
    const phoneClean = telefon.replace(/[\s\-().]/g, "");
    finalSubmit(phoneClean, {});
  };

  const finalSubmit = async (phoneClean: string, ans: Record<string, string>) => {
    setSending(true);
    const selectedDubte = hasDubteOptions ? dubteOptions!.find(d => d.id === dubteId) : undefined;
    try {
      if (GOOGLE_WEBHOOK) {
        const utms = getUtms();
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "whatsapp_lead",
            telefon: phoneClean,
            nom: "",
            email: "",
            dubte: selectedDubte?.label || "",
            acceptaRgpd: true,
            data: new Date().toLocaleString("ca-ES"),
            source,
            event: event || null,
            intent: selectedDubte?.id || intent || null,
            answers: ans,
            ...utms,
          }),
        });
      }
      tracker.ctaWhatsAppHomeClick();

      const key = `${event || ""}:${intent || ""}`;
      const text = selectedDubte?.waText
        || PRE_TEXT_BY_EVENT_INTENT[key]
        || PRE_TEXT_BY_SOURCE[source]
        || PRE_TEXT_BY_SOURCE.home_fab;
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        onClose();
        setTelefon("");
        setAcceptaRgpd(false);
        setAnswers({});
        setDubteId(null);
        setStep(1);
      }, 300);
    } catch {
      setError("Error enviant. Prova de nou o escriu-nos a voluntaris@grupbarna.info");
    } finally {
      setSending(false);
    }
  };

  const heading = title || "Pregunta'ns per WhatsApp";
  const sub = subtitle ||
    (event === "campus"         ? "Et responem en menys de 24h" :
     event === "portes_obertes" ? "Et responem en menys de 24h" :
     "T'enviem novetats quan hi hagi");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full max-w-md bg-slate-950 border-2 ${accent.ring} rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`bg-gradient-to-br ${accent.from} ${accent.to} p-5 relative`}>
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
                    {heading}
                  </h2>
                  <p className="text-white/85 text-xs">{sub}</p>
                </div>
              </div>
              {hasQuestions && (
                <div className="mt-3 flex gap-1.5">
                  <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-white" : "bg-white/30"}`} />
                  <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-white" : "bg-white/30"}`} />
                </div>
              )}
            </div>

            {step === 1 ? (
              <form onSubmit={submitTel} className="p-5 space-y-4">
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#25D366]"/>
                    El teu telèfon *
                  </span>
                  <input ref={firstFieldRef} type="tel" inputMode="tel" autoComplete="tel"
                    value={telefon} onChange={e => setTelefon(e.target.value)}
                    placeholder="600 000 000"
                    className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] text-white placeholder:text-white/30 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                  />
                </label>

                {hasDubteOptions && (
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-semibold text-white/60 mb-1.5">Sobre què preguntes? *</legend>
                    <div className="flex flex-col gap-1.5">
                      {dubteOptions!.map(d => {
                        const sel = dubteId === d.id;
                        return (
                          <button key={d.id} type="button"
                            onClick={() => setDubteId(d.id)}
                            className={`text-left text-xs px-3.5 py-2.5 rounded-xl border transition-colors ${sel
                              ? "bg-[#25D366] border-[#25D366] text-white font-semibold"
                              : "bg-white/5 border-white/15 text-white/75 hover:bg-white/10"}`}>
                            {sel && <Check className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5"/>}
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={acceptaRgpd}
                    onChange={e => setAcceptaRgpd(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-white/30 bg-white/10 text-[#25D366] focus:ring-[#25D366] focus:ring-offset-slate-950 cursor-pointer accent-[#25D366]"
                  />
                  <span className="text-[11px] text-white/65 leading-relaxed">
                    Accepto rebre informació per WhatsApp del CB Grup Barna. Pots demanar baixa quan vulguis. <span className="text-white/40">(RGPD)</span>
                  </span>
                </label>

                {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}

                <button type="submit" disabled={sending}
                  className="w-full bg-[#25D366] hover:bg-[#1da851] disabled:opacity-60 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Obrint WhatsApp…</>
                    : hasQuestions ? <>Següent <ArrowRight className="w-4 h-4"/></>
                    : <><Check className="w-4 h-4"/> Continuar a WhatsApp</>}
                </button>
              </form>
            ) : (
              <form onSubmit={submitQuestions} className="p-5 space-y-4">
                <p className="text-xs text-white/55 leading-relaxed">
                  Per recomanar-te millor (et responem més ràpid):
                </p>
                {questions!.map(q => (
                  <fieldset key={q.id} className="space-y-1.5">
                    <legend className="text-xs font-semibold text-white/70 mb-1.5">
                      {q.label}{q.required && " *"}
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map(opt => {
                        const sel = answers[q.id] === opt;
                        return (
                          <button key={opt} type="button"
                            onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${sel
                              ? "bg-[#25D366] border-[#25D366] text-white font-semibold"
                              : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"}`}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}

                {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={skipQuestions} disabled={sending}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 font-semibold py-3 rounded-xl text-sm transition-colors">
                    Saltar
                  </button>
                  <button type="submit" disabled={sending}
                    className="flex-[2] bg-[#25D366] hover:bg-[#1da851] disabled:opacity-60 text-white font-bold uppercase tracking-wider py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Obrint WhatsApp…</>
                      : <><Check className="w-4 h-4"/> Continuar a WhatsApp</>}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

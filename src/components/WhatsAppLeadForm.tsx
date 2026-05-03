import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, User, Phone, HelpCircle, Loader2, Check } from "lucide-react";
import { tracker } from "@/lib/track";

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";

const WHATSAPP_NUMBER = "+34698425153";

const QUICK_OPTIONS = [
  "Vull inscriure el meu equip",
  "Vull inscriure'm individualment (20€)",
  "Tinc dubtes sobre les categories",
  "Pregunta sobre pagament / inscripció",
  "Som mitjà / premsa",
  "Altre dubte",
];

/**
 * Modal que captura el lead (nom + telèfon + dubte) ABANS d'obrir WhatsApp.
 * Així Ana es queda amb llista de contactes per fer broadcast quan tingui
 * novetats. L'usuari ho rep com una "pre-conversa" abans del xat real.
 */
export default function WhatsAppLeadForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ nom: "", telefon: "", email: "", dubte: QUICK_OPTIONS[0] });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Auto-focus al obrir
      setTimeout(() => firstFieldRef.current?.focus(), 150);
      // ESC per tancar
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.telefon.trim()) {
      setError("Nom i telèfon obligatoris.");
      return;
    }
    setSending(true);
    setError("");
    try {
      // 1) Registrem el lead a Apps Script (mode no-cors, no llegim resposta)
      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "whatsapp_lead",
            ...form,
            data: new Date().toLocaleString("ca-ES"),
            source: "home_fab",
          }),
        });
      }
      tracker.ctaWhatsAppHomeClick();

      // 2) Obrim WhatsApp amb missatge pre-omplert
      const text = `Hola! Soc ${form.nom}. ${form.dubte}.${form.telefon ? "" : ""}`;
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");

      // 3) Tanquem el modal després d'obrir WhatsApp
      setTimeout(() => {
        onClose();
        // Reset per la pròxima vegada
        setForm({ nom: "", telefon: "", email: "", dubte: QUICK_OPTIONS[0] });
      }, 300);
    } catch (err) {
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
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
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
            <form onSubmit={submit} className="p-5 space-y-3">
              <Field icon={User} label="El teu nom *">
                <input ref={firstFieldRef} value={form.nom} onChange={setField("nom")} placeholder="Joan Garcia"
                  className={inputCls}/>
              </Field>

              <Field icon={Phone} label="Telèfon *">
                <input type="tel" value={form.telefon} onChange={setField("telefon")} placeholder="600 000 000"
                  className={inputCls}/>
              </Field>

              <Field icon={HelpCircle} label="Sobre què preguntes?">
                <select value={form.dubte} onChange={setField("dubte") as any} className={inputCls}>
                  {QUICK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>

              {error && <p className="text-red-400 text-xs">⚠️ {error}</p>}

              <button type="submit" disabled={sending}
                className="w-full bg-[#25D366] hover:bg-[#1da851] disabled:opacity-60 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2">
                {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Obrint WhatsApp…</> : <><Check className="w-4 h-4"/> Continuar a WhatsApp</>}
              </button>

              <p className="text-[10px] text-white/35 text-center leading-relaxed pt-1">
                En continuar, el teu telèfon s'afegirà a la llista de difusió 3×3 per rebre notificacions del torneig (categories, places, recordatoris). Pots demanar baixa en qualsevol moment.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputCls = "w-full bg-white/8 border border-white/15 focus:border-[#25D366] text-white placeholder:text-white/30 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors";

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#25D366]"/>
        {label}
      </span>
      {children}
    </label>
  );
}

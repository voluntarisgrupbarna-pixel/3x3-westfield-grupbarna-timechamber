import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, User, Mail, Phone, MessageSquare, Loader2, Check, AlertCircle } from "lucide-react";
import SEO from "@/components/SEO";

/**
 * Pàgina mòbil-first per afegir manualment un lead WhatsApp al CRM.
 *
 * Cas d'ús: la gent contacta directament el WhatsApp del club (+34698425153)
 * sense passar pel formulari del web (vénen del Linktree, IG, recomanació, etc.).
 * Ana obre aquesta pàgina al mòbil, omple les dades en 20 segons i el lead
 * queda al mateix Sheet (`Contactes_WhatsApp_3x3` o `_Campus`) amb totes les
 * automatitzacions: email admin als 3 destinataris + CallMeBot al WhatsApp.
 *
 * No publicada al menú. Bookmark al mòbil: cbgrupbarna-3x3timechamber.com/staff/lead
 *
 * Reusa exactament el mateix webhook (`action: whatsapp_lead`) → cap canvi
 * al backend. La columna `Source` queda marcada com `staff_manual` per
 * distingir-los dels leads automàtics.
 */
const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";
const PHONE_REGEX = /^(\+?\d{8,15})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TIPUS_OPTIONS = [
  { id: "3x3",            label: "3×3 Westfield Glòries" },
  { id: "campus",         label: "Campus d'Estiu" },
  { id: "portes_obertes", label: "Portes Obertes club" },
  { id: "patrocinador",   label: "Patrocinador / col·laboració" },
  { id: "premsa",         label: "Premsa" },
  { id: "altre",          label: "Altre" },
] as const;
type TipusId = typeof TIPUS_OPTIONS[number]["id"];

export default function StaffLead() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [tipusId, setTipusId] = useState<TipusId>("3x3");
  const [dubte, setDubte] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => firstFieldRef.current?.focus(), 100);
  }, []);

  const tipusLabel = TIPUS_OPTIONS.find(t => t.id === tipusId)?.label || "";

  const reset = () => {
    setNom(""); setEmail(""); setTelefon(""); setDubte("");
    setTipusId("3x3"); setError(""); setSuccess(false);
    setTimeout(() => firstFieldRef.current?.focus(), 100);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomClean = nom.trim().replace(/\s+/g, " ");
    if (nomClean.length < 2) {
      setError("Posa el nom del contacte.");
      return;
    }
    const phoneClean = telefon.replace(/[\s\-().]/g, "");
    if (!PHONE_REGEX.test(phoneClean)) {
      setError("Telèfon no vàlid. Format: 600000000 o +34600000000.");
      return;
    }
    const emailClean = email.trim().toLowerCase();
    // Email opcional al modus manual; només validar si s'ha posat alguna cosa
    if (emailClean && !EMAIL_REGEX.test(emailClean)) {
      setError("Email no vàlid. Format: nom@domini.com (o deixa-ho buit).");
      return;
    }

    setError("");
    setSending(true);
    try {
      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "whatsapp_lead",
            telefon: phoneClean,
            nom: nomClean,
            email: emailClean,
            tipusInteres: tipusLabel,
            dubte: dubte.trim() || "Contacte directe per WhatsApp",
            acceptaRgpd: true, // staff afegeix → ja s'ha verbalitzat
            data: new Date().toLocaleString("ca-ES"),
            source: "staff_manual",
            event: tipusId === "campus" ? "campus" : tipusId === "portes_obertes" ? "portes_obertes" : "tres_x_tres",
            intent: "general",
            answers: {},
          }),
        });
      }
      setSuccess(true);
    } catch {
      setError("Error d'enviament. Comprova la connexió i prova de nou.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SEO title="Staff · Afegir lead manualment" description="" path="/staff/lead" />
      <div className="absolute inset-0 bg-gradient-to-br from-green-950/15 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between max-w-md">
          <Link to="/staff/cerca" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">Staff</span>
          </Link>
          <span className="text-xs font-black font-mono text-[#25D366] tracking-widest">+ LEAD</span>
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-6 max-w-md">
        <h1 className="font-black text-2xl mb-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          Afegir lead manualment
        </h1>
        <p className="text-xs text-white/50 mb-6">
          Per a contactes que arriben directament per WhatsApp/IG/Linktree i no han passat pel form del web. Es desa a la mateixa pestanya CRM segons Tipus d'interès.
        </p>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div key="ok"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-[#25D366]/10 border-2 border-[#25D366]/40 rounded-2xl p-5 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#25D366]/20 border-2 border-[#25D366] flex items-center justify-center mx-auto mb-3">
                <Check className="w-7 h-7 text-[#25D366]" strokeWidth={3} />
              </div>
              <h2 className="font-black text-lg mb-1">Lead desat al CRM</h2>
              <p className="text-xs text-white/60 mb-5">
                S'ha enviat email als 3 destinataris i (si CallMeBot està configurat) un missatge al WhatsApp del club.
              </p>
              <button onClick={reset}
                className="w-full bg-[#25D366] hover:bg-[#1da851] active:scale-[0.99] text-white font-bold uppercase tracking-wider py-3 rounded-xl text-sm">
                + Afegir un altre
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Field icon={User} label="Nom i cognoms *" autoFocus={false}>
                <input ref={firstFieldRef} type="text" autoComplete="name"
                  value={nom} onChange={e => setNom(e.target.value)}
                  placeholder="Maria García López"
                  className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </Field>

              <Field icon={Phone} label="Telèfon *">
                <input type="tel" inputMode="tel" autoComplete="tel"
                  value={telefon} onChange={e => setTelefon(e.target.value)}
                  placeholder="600 000 000"
                  className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </Field>

              <Field icon={Mail} label="Email (opcional)">
                <input type="email" inputMode="email" autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="(buit si no l'ha donat)"
                  className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] rounded-xl px-3.5 py-2.5 text-sm outline-none" />
              </Field>

              <fieldset className="space-y-1.5">
                <legend className="text-xs font-semibold text-white/60 mb-1.5">Tipus d'interès *</legend>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIPUS_OPTIONS.map(t => {
                    const sel = tipusId === t.id;
                    return (
                      <button key={t.id} type="button"
                        onClick={() => setTipusId(t.id)}
                        className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${sel
                          ? "bg-[#25D366] border-[#25D366] text-white font-semibold"
                          : "bg-white/5 border-white/15 text-white/75 hover:bg-white/10"}`}>
                        {sel && <Check className="inline w-3 h-3 mr-1 -mt-0.5" />}
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <Field icon={MessageSquare} label="Dubte / motiu (opcional)">
                <textarea rows={2} value={dubte} onChange={e => setDubte(e.target.value)}
                  placeholder="Què demanen / per què t'han escrit"
                  className="w-full bg-white/8 border border-white/15 focus:border-[#25D366] rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none" />
              </Field>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={sending}
                className="w-full bg-[#25D366] hover:bg-[#1da851] disabled:opacity-50 active:scale-[0.99] transition-all text-white font-black uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-green-500/25 ring-2 ring-white/10 flex items-center justify-center gap-2 text-sm">
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Desant…</>
                  : <><Check className="w-5 h-5" /> Afegir al CRM</>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: {
  icon: any; label: string; autoFocus?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#25D366]" />
        {label}
      </span>
      {children}
    </label>
  );
}

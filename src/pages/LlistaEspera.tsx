import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Check, Loader2, Mail, Phone, User, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tracker } from "@/lib/track";

/**
 * Pàgina de llista d'espera.
 * S'arriba aquí quan totes les places estan plenes (CTA des de Home / Inscripcion).
 * Form mínim: nom equip, capità, categoria, email, telèfon.
 * Apps Script desa a una pestanya separada del Sheet i envia email de confirmació.
 */

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";

const CATS = [
  "Escola", "Premini", "Mini", "Preinfantil", "Infantil",
  "Cadet", "Junior", "Sèniors", "Veterans", "Màgics",
];

export default function LlistaEspera() {
  useEffect(() => { document.title = "Llista d'espera · 3×3 Westfield Glòries 2026"; }, []);

  const [form, setForm] = useState({
    nomEquip: "", capita: "", categoria: "", email: "", telefon: "", poblacio: "",
  });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomEquip || !form.capita || !form.categoria || !form.email || !form.telefon) {
      setError("Omple tots els camps obligatoris.");
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
            action: "waitlist",
            ...form,
            data: new Date().toLocaleString("ca-ES"),
          }),
        });
      }
      tracker.equipShared("waitlist_submitted"); // genèric event
      setDone(true);
    } catch (err) {
      setError("Error enviant. Prova de nou o contacta'ns per WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500 flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow:"0 0 60px rgba(34,197,94,0.3)" }}>
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-black mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            ESTÀS A LA <span className="text-green-400">LLISTA D'ESPERA</span>
          </h1>
          <p className="text-white/60 mb-8">
            Si una plaça queda lliure, et trucarem o enviarem WhatsApp <strong className="text-white">primer a tu</strong> en ordre d'arribada. Mentrestant, comparteix el torneig amb els teus amics: els equips que comparteixen passen davant.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="https://wa.me/?text=Estem%20a%20la%20llista%20d'espera%20del%203x3%20Westfield%20Gl%C3%B2ries!%20https%3A%2F%2Fcbgrupbarna-3x3timechamber.com%2F" target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#25D366] hover:bg-[#1da851] text-white font-bold uppercase tracking-wider w-full">
                📱 Compartir per WhatsApp
              </Button>
            </a>
            <Link to="/">
              <Button variant="outline" className="border-white/20 text-white/70 w-full">Tornar a l'inici</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-orange-500 tracking-widest hidden sm:block">LLISTA D'ESPERA</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-xl relative">
        {/* Banner FOMO */}
        <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
          className="bg-orange-500/10 border-2 border-orange-500/50 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5"/>
            <div>
              <p className="font-black uppercase tracking-wider text-orange-300 text-sm mb-1">Places esgotades</p>
              <p className="text-sm text-white/80 leading-relaxed">
                Totes les places del 3×3 Westfield Glòries 2026 estan ocupades. Pots apuntar-te a la <strong>llista d'espera</strong> i si una plaça es llibera, et trucarem en ordre d'arribada.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <Field icon={Trophy} label="Nom equip *">
            <input value={form.nomEquip} onChange={setField("nomEquip")} placeholder="Nom de l'equip"
              className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </Field>
          <Field icon={Users} label="Categoria *">
            <select value={form.categoria} onChange={setField("categoria") as any}
              className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none">
              <option value="">Tria categoria…</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field icon={User} label="Capità (nom complet) *">
            <input value={form.capita} onChange={setField("capita")} placeholder="Nom i cognoms"
              className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field icon={Mail} label="Email *">
              <input type="email" value={form.email} onChange={setField("email")} placeholder="email@exemple.com"
                className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </Field>
            <Field icon={Phone} label="Telèfon *">
              <input type="tel" value={form.telefon} onChange={setField("telefon")} placeholder="+34 600 000 000"
                className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none" />
            </Field>
          </div>
          <Field label="Població (opcional)">
            <input value={form.poblacio} onChange={setField("poblacio")} placeholder="Sant Martí, Barcelona…"
              className="w-full bg-white/8 border border-white/15 focus:border-red-500 rounded-xl px-3 py-2.5 text-sm outline-none" />
          </Field>

          {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

          <Button type="submit" size="lg" disabled={sending}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider py-6 rounded-2xl text-lg shadow-lg shadow-orange-600/30 disabled:opacity-50">
            {sending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Enviant…</> : <>📋 Apuntar a la llista d'espera</>}
          </Button>
        </form>

        <p className="text-xs text-white/40 mt-6 text-center">
          Cap pagament fins que es confirmi una plaça. T'avisem per WhatsApp i email només si s'allibera plaça a la teva categoria.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon?: any; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-red-400"/>}
        {label}
      </span>
      {children}
    </label>
  );
}

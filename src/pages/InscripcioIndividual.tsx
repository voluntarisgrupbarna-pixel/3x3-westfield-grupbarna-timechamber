import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Check, User, Mail, Phone, Calendar, MapPin, Trophy,
  Loader2, Copy, Users, Target, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { tracker } from "@/lib/track";

/**
 * Pàgina d'inscripció INDIVIDUAL.
 *
 * Per als jugadors que no tenen equip. Paguen 20€ i el club els assigna
 * a un equip d'acord amb categoria/edat/posició una setmana abans del torneig.
 */

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";
const PREU = 20;
const IBAN = "ES42 0182 1797 3902 0409 9747";
const BENEFICIARI = "CB Grup Barna";

const TALLES = ["8-10", "12-14", "16", "XS", "S", "M", "L", "XL", "XXL"];
const POSICIONS = ["Indiferent", "Base", "Escorta", "Aler", "Aler-Pivot", "Pivot"];
const NIVELLS = ["Principiant", "Intermedi", "Avançat", "Federat"];

function buildConcepte(nom: string, cognom: string): string {
  const slug = `${nom} ${cognom}`.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
  return `3X3+SOLO+${slug || "JUGADOR"}`;
}

function buildTeamId(nom: string, cognom: string): string {
  const slug = `${nom} ${cognom}`.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24).toLowerCase();
  const tsBase36 = Math.floor(Date.now() / 1000).toString(36);
  return `solo-${slug}-${tsBase36}`;
}

function buildCheckinUrl(p: { id: string; nom: string; cat: string; pob: string; tel: string; email: string; data: string }): string {
  const usp = new URLSearchParams({
    id: p.id, nom: p.nom, cap: p.nom, cat: p.cat,
    pob: p.pob, jug: "1", mida: "", tel: p.tel, email: p.email, data: p.data,
  });
  return `https://cbgrupbarna-3x3timechamber.com/checkin?${usp.toString()}`;
}

function buildEpcQr(amount: number, concepte: string): string {
  const ibanClean = IBAN.replace(/\s/g, "");
  return [
    "BCD", "002", "1", "SCT", "",
    BENEFICIARI, ibanClean,
    `EUR${amount.toFixed(2)}`,
    "", "", concepte,
  ].join("\n");
}

export default function InscripcioIndividual() {
  useEffect(() => {
    document.title = "Inscripció individual · 20€ · 3×3 Westfield Glòries 2026";
    tracker.inscripcioIniciada();
  }, []);

  const [form, setForm] = useState({
    nom: "", cognom: "", dataNaix: "", email: "", telefon: "",
    talla: "", posicio: "Indiferent", nivell: "Intermedi",
    poblacio: "", observacions: "",
  });
  const [accept, setAccept] = useState({ bases: false, lopd: false, imatge: false });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [checkinUrl, setCheckinUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  const concepte = buildConcepte(form.nom, form.cognom);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.cognom || !form.email || !form.telefon || !form.dataNaix || !form.talla) {
      setError("Omple tots els camps obligatoris.");
      return;
    }
    if (!accept.bases || !accept.lopd || !accept.imatge) {
      setError("Has d'acceptar les bases, l'apartat legal i els drets d'imatge.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const newTeamId = buildTeamId(form.nom, form.cognom);
      const submissionDate = new Date().toLocaleString("ca-ES");
      const fullName = `${form.nom} ${form.cognom}`.trim();
      const newCheckinUrl = buildCheckinUrl({
        id: newTeamId, nom: fullName, cat: "Per assignar (Solo)",
        pob: form.poblacio, tel: form.telefon, email: form.email, data: submissionDate,
      });
      setTeamId(newTeamId);
      setCheckinUrl(newCheckinUrl);

      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "individual",
            tipus: "individual",
            ...form,
            total: PREU,
            concepte,
            teamId: newTeamId,
            checkinUrl: newCheckinUrl,
            data: submissionDate,
          }),
        });
      }
      tracker.inscripcioCompletada({ categoria: "individual", total: PREU, jugadors: 1, teamId: newTeamId });
      setSubmitted(true);
    } catch (err) {
      tracker.inscripcioError(err instanceof Error ? err.message : String(err));
      setError("Error enviant la inscripció. Prova de nou o contacta'ns per WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const copyIban = () => {
    navigator.clipboard?.writeText(IBAN.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ─── Pantalla d'èxit ─── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 py-12">
        <div className="max-w-lg mx-auto text-center">
          <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}>
            <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500 flex items-center justify-center mx-auto mb-6"
              style={{ boxShadow:"0 0 60px rgba(34,197,94,0.3)" }}>
              <Check className="w-10 h-10 text-green-400"/>
            </div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
              INSCRIPCIÓ <span className="text-green-400">REBUDA!</span>
            </h1>
            <p className="text-white/55 mb-7 leading-relaxed text-sm">
              Hola <strong className="text-white">{form.nom}</strong>! Nosaltres t'assignarem a un equip d'acord amb la teva edat i posició preferida (<strong className="text-white">{form.posicio}</strong>). Et trucarem 1 setmana abans del torneig.
            </p>

            {/* QR personal del jugador */}
            {checkinUrl && (
              <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-5 mb-3 text-white text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider">🎟️ El teu QR</span>
                  <span className="text-[10px] uppercase tracking-wider font-mono bg-black/30 px-2 py-1 rounded">ID: {teamId}</span>
                </div>
                <div className="bg-white rounded-xl p-4 flex flex-col items-center">
                  <QRCodeSVG value={checkinUrl} size={180} level="M" includeMargin={false}/>
                </div>
                <p className="text-[11px] mt-3 leading-relaxed text-white/90">
                  <strong>Guarda aquest QR.</strong> El necessitaràs el dia del torneig per a la <strong>recollida de samarreta</strong> i el <strong>check-in</strong>. També te l'enviem per email.
                </p>
              </div>
            )}

            {/* QR pagament EPC */}
            <div className="bg-white rounded-2xl p-4 mb-3 text-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">💳 Pagar 20€ amb el banc · QR</p>
              <div className="flex justify-center mb-2">
                <QRCodeSVG value={buildEpcQr(PREU, concepte)} size={150} level="M" includeMargin={false}/>
              </div>
              <p className="text-[10px] text-slate-500 text-center">Escaneja amb l'app del teu banc</p>
            </div>

            {/* Dades transferència */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5 text-left space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase tracking-wider">IBAN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{IBAN}</span>
                  <button onClick={copyIban} className="text-red-400 hover:text-red-300 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase tracking-wider">Concepte</span>
                <span className="font-semibold text-white text-xs">{concepte}</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-1">
                <span className="text-white/40 text-xs uppercase tracking-wider">Import</span>
                <span className="text-2xl font-black text-red-400">{PREU.toFixed(2)}€</span>
              </div>
            </div>

            <Link to="/">
              <Button variant="outline" className="border-white/20 text-white/70 w-full">Tornar a l'inici</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-slate-950 to-slate-950 pointer-events-none"/>

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">SOLO · 20€</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-xl relative">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-center mb-7">
          <span className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/40 text-orange-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            <Target className="w-3 h-3"/> No tens equip · No passa res
          </span>
          <h1 className="font-black text-3xl sm:text-5xl uppercase leading-tight mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Inscripció <span className="text-red-500">individual</span>
          </h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
            Apunta't sol per <strong className="text-white">20€</strong> i nosaltres t'assignem a un equip 1 setmana abans del torneig segons categoria, edat i posició.
          </p>
        </motion.div>

        {/* Info benefits */}
        <div className="grid grid-cols-3 gap-2 mb-7">
          {[
            { icon: "✅", label: "Samarreta inclosa" },
            { icon: "✅", label: "Equip assignat" },
            { icon: "✅", label: "Punts FIBA*" },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
              <div className="text-xl mb-0.5">{icon}</div>
              <p className="text-[10px] text-white/60">{label}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-3.5">
          {/* Nom + Cognom */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={User} label="Nom *">
              <input value={form.nom} onChange={setField("nom")} placeholder="Joan"
                className={inputCls}/>
            </Field>
            <Field label="Cognom *">
              <input value={form.cognom} onChange={setField("cognom")} placeholder="Garcia"
                className={inputCls}/>
            </Field>
          </div>

          <Field icon={Calendar} label="Data de naixement *">
            <input type="date" value={form.dataNaix} onChange={setField("dataNaix")}
              className={inputCls}/>
          </Field>

          {/* Email + Telèfon */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={Mail} label="Email *">
              <input type="email" value={form.email} onChange={setField("email")} placeholder="email@example.com"
                className={inputCls}/>
            </Field>
            <Field icon={Phone} label="Telèfon *">
              <input type="tel" value={form.telefon} onChange={setField("telefon")} placeholder="600 000 000"
                className={inputCls}/>
            </Field>
          </div>

          {/* Talla samarreta + Posició */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={Trophy} label="Talla samarreta *">
              <select value={form.talla} onChange={setField("talla") as any} className={inputCls}>
                <option value="">Tria...</option>
                {TALLES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field icon={Users} label="Posició preferida">
              <select value={form.posicio} onChange={setField("posicio") as any} className={inputCls}>
                {POSICIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <Field icon={Star} label="Nivell de joc">
            <select value={form.nivell} onChange={setField("nivell") as any} className={inputCls}>
              {NIVELLS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>

          <Field icon={MapPin} label="Població">
            <input value={form.poblacio} onChange={setField("poblacio")} placeholder="Sant Martí, Barcelona…"
              className={inputCls}/>
          </Field>

          <Field label="Observacions (opcional)">
            <textarea value={form.observacions} onChange={setField("observacions")}
              placeholder="Hi ha alguna cosa que ens hagis de dir? club d'on vens, lesions, etc."
              className={inputCls + " min-h-[70px] resize-none"}/>
          </Field>

          {/* Total */}
          <div className="bg-red-600 rounded-2xl p-4 text-center my-4">
            <p className="text-white/70 text-xs mb-1">Import total</p>
            <p className="text-3xl font-black font-mono text-white">{PREU}€</p>
            <p className="text-white/60 text-[10px] mt-1">Inclou samarreta, dorsal, accés 2 dies</p>
          </div>

          {/* Apartat legal · text obligatori (heretat del JotForm Campus Time Chamber) */}
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mt-3 mb-2 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2">
              <span>📑</span> Apartat legal
            </p>
            <div className="text-xs text-white/65 leading-relaxed space-y-2">
              <p>
                Com a tutor/a legal (o jugador/a major d'edat), consento i autoritzo la captació i publicació d'imatges per part de <strong>Timechamber S.L. i C.B. Grup Barna</strong>, amb finalitats promocionals del torneig, respectant la dignitat i la integritat de la persona captada.
              </p>
              <p>
                Declaro que he llegit la <strong>informació legal de Timechamber Experience</strong> relativa a la política de privacitat, tractament de dades, finalitats, base legal, conservació, drets, autorització mèdica i normativa interna.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={accept.bases} onChange={e => setAccept(s => ({ ...s, bases: e.target.checked }))}
                className="mt-1 w-4 h-4 accent-red-500"/>
              <span className="text-white/75 text-xs">He llegit i accepto les <Link to="/preguntes-frequents" className="text-red-400 underline">bases del torneig 3×3 Westfield Glòries 2026</Link>. *</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={accept.lopd} onChange={e => setAccept(s => ({ ...s, lopd: e.target.checked }))}
                className="mt-1 w-4 h-4 accent-red-500"/>
              <span className="text-white/75 text-xs">Accepto l'apartat legal de Timechamber Experience: política de privacitat, tractament de dades (RGPD), autorització mèdica i normativa interna. *</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={accept.imatge} onChange={e => setAccept(s => ({ ...s, imatge: e.target.checked }))}
                className="mt-1 w-4 h-4 accent-red-500"/>
              <span className="text-white/75 text-xs">Autoritzo expressament la captació i publicació d'imatges meves (o del meu fill/a si soc tutor/a legal) per part de Timechamber S.L. i C.B. Grup Barna a xarxes socials i mitjans del torneig. *</span>
            </label>
          </div>

          {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}

          <Button type="submit" size="lg" disabled={sending}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider py-6 rounded-2xl text-lg shadow-lg shadow-red-600/30 disabled:opacity-50">
            {sending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Enviant…</> : <><Check className="w-5 h-5 mr-2"/> Enviar inscripció (20€)</>}
          </Button>
        </form>

        <div className="text-center mt-6 text-xs text-white/30">
          Tens equip? <Link to="/inscripcion" className="text-red-400 hover:underline">Inscripció en grup</Link>
        </div>

        <p className="text-[10px] text-white/30 mt-4 text-center max-w-md mx-auto">
          *Punts FIBA només a la categoria Sèniors. Les altres categories no atorguen punts FIBA però sí premis i samarreta oficial.
        </p>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-white/8 border border-white/15 focus:border-red-500 text-white placeholder:text-white/30 rounded-xl px-3 py-2.5 text-sm outline-none transition-colors";

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

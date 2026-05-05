import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Sparkles, Calendar, Users, Trophy, Heart, Check } from "lucide-react";
import WhatsAppLeadForm, { type LeadIntent, type LeadQuestion } from "@/components/WhatsAppLeadForm";

/**
 * Landing /campus — Campus d'Estiu Time Chamber 2026.
 *
 * Funnel: 3 botons WhatsApp (Info / Prueba gratis / Reservar) → modal captura
 * tel + RGPD → 3 preguntes ràpides (edat, nivell, setmanes) → wa.me amb missatge
 * prellenat. Tot va a la pestanya `Llista_Difusio_Campus` del Sheet via Apps Script.
 *
 * UTMs venen de l'URL (ex. ?utm_source=instagram&utm_campaign=campus_estiu&code=PRUEBA_QR)
 * i el modal els passa al backend automàticament.
 */

const CAMPUS_QUESTIONS: LeadQuestion[] = [
  { id: "edat",     label: "Edat del jugador/a",       options: ["4-6 anys", "7-9", "10-12", "13-15", "16+"] },
  { id: "nivell",   label: "Nivell",                    options: ["Comença ara", "Ha jugat abans", "Federat", "Competitiu"] },
  { id: "setmanes", label: "Quantes setmanes us interessen?", options: ["1 setmana", "2 setmanes", "3+", "Encara no ho sé"] },
];

export default function Campus() {
  const [openIntent, setOpenIntent] = useState<LeadIntent | null>(null);

  useEffect(() => {
    document.title = "Campus d'Estiu · CB Grup Barna · Time Chamber 2026";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[24rem] h-[24rem] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">CB Grup Barna</span>
          </Link>
          <span className="text-sm font-black font-mono text-orange-400 tracking-widest hidden sm:block">CAMPUS</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 relative max-w-3xl">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          className="text-center mb-10">
          <span className="inline-block bg-orange-500/15 border border-orange-500/30 text-orange-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            Time Chamber · Estiu 2026
          </span>
          <h1 className="font-black text-4xl sm:text-6xl uppercase tracking-tight mb-4 leading-[0.95]"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Campus d'Estiu<br/><span className="text-orange-400">Grup Barna</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-xl mx-auto mb-2">
            <strong className="text-orange-200">El teu fill/a pot provar gratis</strong> abans d'inscriure's.
          </p>
          <p className="text-sm text-white/55 max-w-lg mx-auto">
            Més de 400 famílies ja confien en nosaltres · Bàsquet al barri del Clot des de 1965
          </p>
        </motion.div>

        {/* 3 botons CTA — la peça central de la conversió */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.1 }}
          className="grid sm:grid-cols-3 gap-3 mb-12">
          <CtaButton
            color="bg-white/5 hover:bg-white/10 border-white/15 text-white"
            label="Vull info"
            sub="Et passem detalls i grups"
            onClick={() => setOpenIntent("info")}
          />
          <CtaButton
            color="bg-orange-500 hover:bg-orange-400 border-orange-400 text-white shadow-orange-500/30 ring-orange-300/30"
            label="Provar gratis"
            sub="Una sessió sense compromís"
            highlight
            onClick={() => setOpenIntent("prueba")}
          />
          <CtaButton
            color="bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-red-600/30"
            label="Reservar plaça"
            sub="Vull entrar al campus"
            onClick={() => setOpenIntent("reserva")}
          />
        </motion.div>

        {/* Bloc confiança */}
        <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 mb-7">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/55 mb-5">Detalls del campus</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Detail icon={Calendar} label="Quan" value="Juny–Juliol 2026 · setmanes a triar" />
            <Detail icon={Users} label="Edats" value="De 4 a 16 anys · grups per nivell" />
            <Detail icon={Trophy} label="Què inclou" value="Entrenaments, partits, samarreta, dorsal" />
            <Detail icon={Heart} label="Per què" value="Bàsquet, valors, fer pinya · diversió real" />
          </div>
        </motion.section>

        {/* Què passa quan toques un botó */}
        <motion.div initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="bg-gradient-to-br from-orange-500/15 to-amber-600/10 border border-orange-500/30 rounded-3xl p-6 sm:p-7 mb-7">
          <h3 className="font-black text-xl mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-300"/>
            Com funciona
          </h3>
          <ol className="space-y-2.5 text-sm text-white/75">
            <Step n={1}>Toques un botó (Info, Provar o Reservar).</Step>
            <Step n={2}>Ens deixes el teu telèfon i 3 dades ràpides (edat, nivell, setmanes).</Step>
            <Step n={3}>S'obre WhatsApp amb el missatge ja preparat. Et responem en menys de 24h.</Step>
            <Step n={4}>Si t'encaixa, et reservem plaça.</Step>
          </ol>
        </motion.div>

        {/* Footer mini */}
        <p className="text-[11px] text-white/40 text-center leading-relaxed mt-8">
          CB Grup Barna · Bàsquet al barri del Clot des de 1965<br/>
          Plaça poliesportiva NAU del Clot · Parc del Clot, Barcelona<br/>
          <a href="mailto:voluntaris@grupbarna.info" className="text-white/55 hover:text-orange-300">voluntaris@grupbarna.info</a>
        </p>
      </div>

      {/* Modal lead capture amb questions */}
      <WhatsAppLeadForm
        open={openIntent !== null}
        onClose={() => setOpenIntent(null)}
        source="landing_contacte"
        event="campus"
        intent={openIntent || "info"}
        questions={CAMPUS_QUESTIONS}
        title={
          openIntent === "prueba"  ? "Provar gratis el Campus" :
          openIntent === "reserva" ? "Reservar plaça al Campus" :
                                     "Info del Campus d'Estiu"
        }
        subtitle="Et responem per WhatsApp en menys de 24h"
      />
    </div>
  );
}

function CtaButton({ color, label, sub, highlight, onClick }: {
  color: string; label: string; sub: string; highlight?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`relative ${color} border-2 ${highlight ? "ring-4" : ""} font-bold uppercase tracking-wider py-5 px-4 rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99] flex flex-col items-center gap-1.5`}>
      <MessageCircle className="w-5 h-5" fill="currentColor" />
      <span className="text-base">{label}</span>
      <span className="text-[10px] opacity-80 font-medium normal-case tracking-normal">{sub}</span>
      {highlight && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
          ⭐ Recomanat
        </span>
      )}
    </button>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-orange-300"/>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{label}</p>
        <p className="text-sm text-white/85">{value}</p>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <span>{children}</span>
    </li>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";

/**
 * Landing simple "Contacta'ns per WhatsApp" pensada perquè el botó WhatsApp
 * del Linktree (linktr.ee/cbgrupbarna) hi apunti, en lloc d'obrir wa.me directe.
 *
 * Mateix flux que la resta de botons del web: capturem el telèfon abans
 * d'obrir WhatsApp → Apps Script l'escriu a la pestanya `Llista_Difusio_3x3`
 * del Sheet → Ana l'utilitzarà per la llista de difusió del torneig.
 *
 * Source = "linktree" per defecte. Si en el futur cbgrupbarna.info l'utilitza
 * directament, n'hi hauria prou d'afegir un query param `?from=info` i llegir-lo
 * per ajustar la `source` enviada al backend.
 */
export default function Contacte() {
  const [waOpen, setWaOpen] = useState(false);

  useEffect(() => {
    document.title = "Contacta'ns · CB Grup Barna · 3×3 Westfield Glòries";
    // Auto-obrir el modal a l'arribar (l'usuari ja ha clicat amb la intenció
    // de contactar; no cal una segona acció per obrir-lo).
    const t = setTimeout(() => setWaOpen(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-green-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header minimal */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-[#25D366] tracking-widest hidden sm:block">CONTACTE</span>
        </div>
      </div>

      {/* Centre */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-[#25D366]/15 border-2 border-[#25D366] flex items-center justify-center mx-auto mb-6"
            style={{ boxShadow: "0 0 50px rgba(37,211,102,0.25)" }}>
            <MessageCircle className="w-9 h-9 text-[#25D366]" fill="currentColor"/>
          </div>

          <h1 className="font-black text-3xl sm:text-4xl uppercase tracking-tight mb-3"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Contacta'ns per <span className="text-[#25D366]">WhatsApp</span>
          </h1>

          <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-8">
            CB Grup Barna · Bàsquet al barri del Clot des de 1965.<br/>
            Deixa'ns el teu telèfon i et responem en menys de 24h.
          </p>

          <button
            type="button"
            onClick={() => setWaOpen(true)}
            className="w-full bg-[#25D366] hover:bg-[#1da851] active:scale-[0.99] transition-all text-white font-black uppercase tracking-wider py-4 rounded-2xl shadow-xl shadow-green-500/25 ring-2 ring-white/10 flex items-center justify-center gap-2.5"
          >
            <MessageCircle className="w-5 h-5" fill="currentColor"/>
            Obrir WhatsApp
          </button>

          <p className="text-[11px] text-white/40 mt-6 leading-relaxed">
            També pots escriure a <a href="mailto:voluntaris@grupbarna.info" className="text-white/60 hover:text-[#25D366]">voluntaris@grupbarna.info</a>
          </p>
        </motion.div>
      </div>

      <WhatsAppLeadForm open={waOpen} onClose={() => setWaOpen(false)} source="linktree" />
    </div>
  );
}

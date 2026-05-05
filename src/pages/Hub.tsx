import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Sun, DoorOpen, Mail, Instagram, ExternalLink } from "lucide-react";

/**
 * Landing /hub — substitut de Linktree.
 * Pensada com a punt d'entrada únic (link in bio) que dirigeix als 3 events
 * actius del club: 3x3, Campus i Portes Obertes.
 *
 * Si en el futur cbgrupbarna.info té el seu propi build, aquesta pàgina pot
 * traslladar-s'hi tal qual. Mentrestant viu sota el domini del 3x3.
 */
export default function Hub() {
  useEffect(() => {
    document.title = "CB Grup Barna · Bàsquet al barri del Clot";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-slate-950 to-orange-950/15 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[24rem] h-[24rem] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 py-12 relative max-w-md">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
          className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-orange-500 shadow-xl shadow-red-500/30 mb-5">
            <span className="text-3xl font-black text-white" style={{ fontFamily:"'Rajdhani', sans-serif" }}>GB</span>
          </div>
          <h1 className="font-black text-3xl uppercase tracking-tight mb-2" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            CB Grup Barna
          </h1>
          <p className="text-sm text-white/55 leading-relaxed">
            Bàsquet al barri del Clot des de 1965<br/>
            Sant Martí · Barcelona
          </p>
        </motion.div>

        {/* 3 destinacions principals */}
        <div className="space-y-3 mb-8">
          <HubLink
            to="/portes-obertes"
            color="from-red-600 to-rose-700"
            icon={DoorOpen}
            label="Portes Obertes"
            sub="Apuntar-se al club · 34 equips · sessió de prova"
          />
          <HubLink
            to="/campus"
            color="from-orange-500 to-amber-600"
            icon={Sun}
            label="Campus d'Estiu"
            sub="Time Chamber 2026 · pots provar gratis"
          />
          <HubLink
            to="/"
            color="from-[#25D366] to-[#128C7E]"
            icon={Trophy}
            label="Torneig 3×3 Westfield Glòries"
            sub="6-7 juny 2026 · 100 equips · 2.400€ premis"
          />
        </div>

        {/* Enllaços secundaris */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.2 }}
          className="border-t border-white/10 pt-6 space-y-2">
          <SmallLink
            href="https://www.instagram.com/cbgrupbarna/"
            external
            icon={Instagram}
            label="@cbgrupbarna"
            sub="Instagram oficial"
          />
          <SmallLink
            href="https://cbgrupbarna.com"
            external
            icon={ExternalLink}
            label="cbgrupbarna.com"
            sub="Web del club · notícies, equips, escola"
          />
          <SmallLink
            href="mailto:voluntaris@grupbarna.info"
            icon={Mail}
            label="voluntaris@grupbarna.info"
            sub="Contacte directe"
          />
        </motion.div>

        <p className="text-[10px] text-white/30 text-center mt-10 leading-relaxed">
          Pavelló NAU del Clot · Parc del Clot · Barcelona<br/>
          © 1965-2026 · CB Grup Barna
        </p>
      </div>
    </div>
  );
}

function HubLink({ to, color, icon: Icon, label, sub }: {
  to: string; color: string; icon: any; label: string; sub: string;
}) {
  return (
    <Link to={to}
      className={`block bg-gradient-to-br ${color} rounded-2xl p-4 shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform`}>
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base uppercase tracking-wide" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            {label}
          </p>
          <p className="text-xs text-white/85 leading-snug truncate">{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function SmallLink({ href, external, icon: Icon, label, sub }: {
  href: string; external?: boolean; icon: any; label: string; sub: string;
}) {
  const props = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a href={href} {...props}
      className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 transition-colors">
      <Icon className="w-4 h-4 text-white/55 shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{label}</p>
        <p className="text-[10px] text-white/45 truncate">{sub}</p>
      </div>
    </a>
  );
}

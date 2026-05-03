import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Heart, Calendar, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";

/**
 * Pàgina /sobre-nosaltres — Història del club + organitzadors del torneig.
 * SEO: targeta "About" típic, augmenta E-A-T (Expertise, Authoritativeness, Trust),
 * crítica per a Google quan se cerca "qui organitza torneig 3x3 barcelona".
 */

export default function SobreNosaltres() {
  const [waOpen, setWaOpen] = useState(false);
  useEffect(() => { document.title = "Qui som · CB Grup Barna · 3×3 Westfield Glòries 2026"; }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">QUI SOM</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-3xl relative">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-center mb-12">
          <span className="inline-block bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            Bàsquet al barri del Clot · des de 1965
          </span>
          <h1 className="font-black text-4xl sm:text-6xl uppercase tracking-tight mb-4" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Qui som <span className="text-red-500">i per què</span><br />ho fem
          </h1>
          <p className="text-white/60 max-w-xl mx-auto leading-relaxed">
            CB Grup Barna porta més de 60 anys formant jugadors al barri del Clot-Glòries de Barcelona. El 3×3 Westfield Glòries és el nostre esdeveniment estrella: bàsquet de carrer, FIBA, prize money i ambient festiu durant un cap de setmana.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          {[
            { num: "60+", label: "Anys de bàsquet base" },
            { num: "4ª",   label: "Edició del 3×3" },
            { num: "100",  label: "Equips · 2026" },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-3xl sm:text-4xl font-black font-mono text-red-400" style={{ fontFamily:"'Rajdhani', sans-serif" }}>{s.num}</p>
              <p className="text-[10px] sm:text-xs text-white/45 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bloque CB Grup Barna */}
        <Section title="CB Grup Barna" icon={Trophy} subtitle="Club Bàsquet · El Clot · Sant Martí" tag="Organitzador">
          <p>
            Som un <strong>club de bàsquet base</strong> ubicat al barri del Clot-Glòries de Barcelona. Des de 1965 formem jugadors i jugadores en totes les categories: Escola, Premini, Mini, Preinfantil, Infantil, Cadet, Junior, Sèniors i Veterans. La nostra seu és la <Link to="/seu/nau-del-clot" className="text-red-300 underline">Nau del Clot</Link>.
          </p>
          <p>
            Apostem per un bàsquet inclusiu, format en valors d'esforç, igualtat i esport com a eina educativa. Tenim equips federats a la <a href="https://basquetcatala.cat" target="_blank" rel="noopener noreferrer" className="text-red-300 underline">FCBQ</a> i una categoria pròpia inclusiva, "Màgics".
          </p>
          <p className="text-xs text-white/40 mt-2">
            Web del club: <a href="https://cbgrupbarna.com" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:underline inline-flex items-center gap-1">cbgrupbarna.com <ExternalLink className="w-3 h-3"/></a> · Instagram: <a href="https://www.instagram.com/cbgrupbarna/" target="_blank" rel="noopener noreferrer" className="text-red-300 hover:underline">@cbgrupbarna</a>
          </p>
        </Section>

        <Section title="Time Chamber" icon={Users} subtitle="Acadèmia tecnificació" tag="Coorganitzador">
          <p>
            Time Chamber és el <strong>centre de tecnificació de bàsquet</strong> del CB Grup Barna. Programa entrenaments avançats, campus d'estiu, clínics i sessions amb entrenadors d'elit per a jugadors que volen passar al següent nivell.
          </p>
          <p>
            Al 3×3 Westfield Glòries, Time Chamber co-organitza la part esportiva: arbitratge, format de competició FIBA, regulació de partits, prize money i seguiment de punts FIBA 3×3. La pista principal de Westfield Glòries té la marca <strong>"TIME CHAMBER"</strong> pintada al terra.
          </p>
        </Section>

        <Section title="Eix Clot" icon={MapPin} subtitle="Comerç + barri" tag="Aliança del barri">
          <p>
            <strong>Eix Clot</strong> és l'associació de comerciants del barri del Clot. Donen suport a l'esdeveniment activant el comerç local: premis dels comerços col·laboradors per a tots els equips, cartells als aparadors, ambient festiu el cap de setmana del torneig.
          </p>
          <p>
            Gràcies a Eix Clot, qualsevol equip que participi al torneig (no només els que cobrin prize money) s'enduu un detall del barri.
          </p>
        </Section>

        <Section title="Why we do it" icon={Heart} subtitle="Esport com a eina de barri" tag="Missió">
          <p>
            El bàsquet 3×3 és la modalitat olímpica que millor representa el bàsquet de carrer: ràpid, accessible, urbà. Volem que el <strong>barri del Clot-Glòries</strong> sigui un referent del 3×3 a Catalunya — i el torneig anual és la trobada on connectar jugadors, famílies, amics i comerciants en un sol cap de setmana.
          </p>
          <p>
            Des del 2024 el torneig creix cada edició: més categories, més equips inscrits, més presència del barri. El 2026 obrim a 100 places, mantenim els premis a totes les categories i seguim amb la categoria <strong>Màgics</strong> per a una participació veritablement inclusiva.
          </p>
        </Section>

        {/* Equip organitzador */}
        <Section title="Equip organitzador" icon={Users} subtitle="Voluntaris i staff" tag="Persones">
          <p>
            L'organització del torneig la fem voluntaris i voluntàries del CB Grup Barna i Time Chamber. <strong>Ana Fernández</strong> coordina la inscripció, comunicació i logística. La part esportiva (arbitratge, format) la lidera el cos tècnic de Time Chamber.
          </p>
          <p className="text-xs text-white/40 mt-2">
            Contacte premsa, voluntariat o partnerships: <a href="mailto:voluntaris@grupbarna.info" className="text-red-300 hover:underline">voluntaris@grupbarna.info</a> · <button type="button" onClick={() => setWaOpen(true)} className="text-red-300 hover:underline">WhatsApp +34 698 425 153</button>
          </p>
        </Section>

        {/* CTAs final */}
        <div className="mt-12 bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/30 rounded-3xl p-7 text-center">
          <h3 className="font-black text-xl sm:text-2xl mb-2">Vols formar part del 3×3?</h3>
          <p className="text-white/60 text-sm mb-5">Tres maneres d'unir-te a nosaltres:</p>
          <div className="grid sm:grid-cols-3 gap-2.5">
            <Link to="/inscripcion">
              <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider">
                🏀 Inscriure equip
              </Button>
            </Link>
            <Link to="/inscripcio-individual">
              <Button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider">
                👤 Apuntar-me sol
              </Button>
            </Link>
            <Link to="/premsa">
              <Button variant="outline" className="w-full border-white/30 text-white/85 hover:bg-white/10 font-bold uppercase tracking-wider">
                📰 Premsa
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <WhatsAppLeadForm open={waOpen} onClose={() => setWaOpen(false)} source="sobre_nosaltres" />
    </div>
  );
}

function Section({ title, icon: Icon, subtitle, tag, children }: { title: string; icon: any; subtitle?: string; tag?: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }}
      className="mb-7 bg-white/5 border border-white/10 rounded-2xl p-6">
      {tag && <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">{tag}</span>}
      <div className="flex items-center gap-3 mt-1.5 mb-1">
        <Icon className="w-5 h-5 text-red-300"/>
        <h2 className="font-black text-2xl uppercase tracking-tight" style={{ fontFamily:"'Rajdhani', sans-serif" }}>{title}</h2>
      </div>
      {subtitle && <p className="text-xs text-white/40 mb-4">{subtitle}</p>}
      <div className="text-sm text-white/70 space-y-3 leading-relaxed">{children}</div>
    </motion.section>
  );
}

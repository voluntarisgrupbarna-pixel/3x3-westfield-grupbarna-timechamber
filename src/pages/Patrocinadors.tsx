import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Users, Eye, Megaphone, Award, Star, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";
import SEO from "@/components/SEO";

/**
 * Pàgina /patrocinadors — landing per a empreses interessades en patrocinar.
 * Diferent de /premsa (mitjans). Aquí l'objectiu és convertir l'interès
 * empresarial en sponsors mitjançant 3 nivells de patrocini i contacte directe.
 */

const TIERS = [
  {
    name: "BRONZE",
    price: "250 €",
    color: "from-amber-700/40 to-amber-900/40 border-amber-600/50",
    accent: "text-amber-300",
    deliverables: [
      "Logo a la pàgina /sobre-nosaltres del web",
      "Esment a les xarxes socials (Instagram + TikTok) abans del torneig",
      "Logo al cartell oficial format digital",
      "Acreditació de 2 entrades VIP per al cap de setmana",
      "Mailing post-event amb fotos i estadístiques",
    ],
  },
  {
    name: "PLATA",
    price: "500 €",
    color: "from-slate-300/30 to-slate-500/30 border-slate-300/50",
    accent: "text-slate-200",
    featured: true,
    deliverables: [
      "Tot el del nivell Bronze",
      "Logo destacat al hero del web (3x mida del Bronze)",
      "Banderola física a una de les 3 seus durant el torneig",
      "Story dedicada a Instagram (@cbgrupbarna · 2.000+ seguidors)",
      "Esment al press release enviat a 7 mitjans (Betevé, El Periódico, Time Out, etc.)",
      "Acreditació de 4 entrades VIP",
    ],
  },
  {
    name: "OR · NAMING SPONSOR",
    price: "1.000 €",
    color: "from-yellow-400/35 to-orange-500/35 border-yellow-400/60",
    accent: "text-yellow-300",
    deliverables: [
      "Tot el dels nivells Bronze i Plata",
      "Logo molt destacat al hero del web (5x el Bronze)",
      "Logo al cartell oficial imprès (1.000 unitats distribuïdes a Westfield + Eix Clot)",
      "Logo a la samarreta oficial dels 100 equips (1 espai prominent)",
      "Banderoles físiques a les 3 seus",
      "Reel d'Instagram dedicat (2.000+ visualitzacions garantides)",
      "Mencionat com 'Patrocinador Or' a tota la comunicació",
      "Acreditació de 8 entrades VIP + accés zona organització",
    ],
  },
];

const STATS = [
  { icon: Users, value: "100", label: "equips inscrits", sub: "~400 jugadors" },
  { icon: Eye, value: "5K+", label: "visitants únics web", sub: "període pre-event" },
  { icon: Megaphone, value: "20K+", label: "abast social media", sub: "Instagram + TikTok 2026" },
  { icon: Trophy, value: "2.400€", label: "prize money", sub: "premis FIBA + comerços" },
];

export default function Patrocinadors() {
  const [waOpen, setWaOpen] = useState(false);

  // Re-utilitza el mateix WhatsAppLeadForm amb event="patrocinador" per al CRM
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <SEO
        title="Patrocinadors · 3×3 Westfield Glòries 2026 — sponsorship local i FIBA"
        description="Posiciona la teva empresa al torneig 3×3 més gran de Barcelona. 3 nivells de patrocini des de 250€. 100 equips · 5.000+ visitants web · 20.000+ abast social. Contacta amb el club."
        path="/patrocinadors"
      />

      <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/15 via-slate-950 to-orange-950/15 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[24rem] h-[24rem] bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-yellow-500 tracking-widest hidden sm:block">PATROCINADORS</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl relative">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="text-center mb-12">
          <span className="inline-block bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            🏆 Sponsorship 2026 · Places limitades
          </span>
          <h1 className="font-black text-4xl sm:text-6xl uppercase tracking-tight mb-4" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Posiciona <span className="text-yellow-300">la teva marca</span><br/>
            al torneig 3×3 <span className="text-orange-400">més gran de Barcelona</span>
          </h1>
          <p className="text-white/65 max-w-2xl mx-auto leading-relaxed">
            6 i 7 de juny 2026. 100 equips. 3 seus al barri del Clot-Glòries. Punts FIBA olímpics. La 4ª edició consecutiva. Visibilitat per a empreses locals i marques nacionals.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-14">
          {STATS.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <s.icon className="w-5 h-5 text-yellow-400 mx-auto mb-2"/>
              <p className="text-3xl font-black text-white" style={{ fontFamily:"'Rajdhani', sans-serif" }}>{s.value}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-200/70 mt-1">{s.label}</p>
              <p className="text-[10px] text-white/45 mt-1">{s.sub}</p>
            </div>
          ))}
        </motion.section>

        {/* Per què */}
        <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} className="mb-14">
          <h2 className="text-2xl font-black mb-5" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Per què patrocinar el 3×3 Westfield Glòries?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <ReasonCard
              icon={Award}
              title="Esport olímpic en creixement"
              text="El 3×3 va entrar com a esport oficial dels Jocs Olímpics el 2021 (Tòquio). És el bàsquet de més creixement del món. Associar la teva marca al format més modern del bàsquet et posiciona com a innovadora."
            />
            <ReasonCard
              icon={Users}
              title="Audiència target jove i local"
              text="Jugadors i acompanyants 14-45 anys, residents de Barcelona ciutat i àrea metropolitana, amb forta presència a xarxes socials. Audiència ideal per a marques d'esports, alimentació, salut, mobilitat, retail."
            />
            <ReasonCard
              icon={Trophy}
              title="Compromís amb el barri"
              text="Co-organitzat amb Eix Clot, l'associació de comerciants del barri. Patrocinar és invertir directament en la comunitat local del Clot-Glòries. Tots els 100 equips reben premis dels comerços associats."
            />
          </div>
        </motion.section>

        {/* Nivells */}
        <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} className="mb-14">
          <h2 className="text-2xl font-black mb-2" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            3 nivells de patrocini
          </h2>
          <p className="text-white/55 text-sm mb-7 max-w-2xl">
            Tria el nivell que millor s'adapta al teu pressupost i objectius. Tots els nivells inclouen acreditació VIP per al cap de setmana del torneig.
          </p>
          <div className="grid lg:grid-cols-3 gap-4">
            {TIERS.map((tier) => (
              <div key={tier.name} className={`relative bg-gradient-to-br ${tier.color} rounded-3xl p-6 ${tier.featured ? 'ring-2 ring-yellow-300/40 lg:scale-105 lg:z-10 shadow-2xl shadow-yellow-500/10' : ''}`}>
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    Més popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Star className={`w-4 h-4 ${tier.accent}`}/>
                  <h3 className={`font-black text-xs uppercase tracking-[0.25em] ${tier.accent}`}>{tier.name}</h3>
                </div>
                <p className="text-4xl font-black text-white mb-5" style={{ fontFamily:"'Rajdhani', sans-serif" }}>{tier.price}</p>
                <ul className="space-y-2 mb-6">
                  {tier.deliverables.map(d => (
                    <li key={d} className="text-sm text-white/85 flex gap-2 leading-relaxed">
                      <span className={`${tier.accent} shrink-0 mt-0.5`}>✓</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={() => setWaOpen(true)} size="lg" className="w-full bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold uppercase tracking-wider">
                  Sol·licitar nivell {tier.name.split(' ')[0]}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-white/35 mt-4 text-center">
            Preus sense IVA · CB Grup Barna emet factura · descomptes per multi-edició consultables.
          </p>
        </motion.section>

        {/* Què veu el patrocinador */}
        <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} className="mb-14 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-black mb-4" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Què passa des que firmes fins a l'edició següent
          </h2>
          <ol className="space-y-3 text-sm text-white/75 leading-relaxed">
            <li className="flex gap-3">
              <span className="bg-yellow-500/20 text-yellow-300 font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">1</span>
              <span><strong className="text-white">Setmana 1:</strong> Firma de conveni i emissió de factura. Logo afegit al web en 24 h.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-yellow-500/20 text-yellow-300 font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">2</span>
              <span><strong className="text-white">Setmana 2-4:</strong> Cartells, banderoles i samarretes (segons nivell) van a producció.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-yellow-500/20 text-yellow-300 font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">3</span>
              <span><strong className="text-white">Pre-event (-30 a -7 dies):</strong> Comunicació coordinada amb els 7 mitjans del press kit. Stories i posts a Instagram.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-yellow-500/20 text-yellow-300 font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">4</span>
              <span><strong className="text-white">Cap de setmana del torneig:</strong> Acreditació VIP, accés zona organitzadors, fotos amb els guanyadors si el nivell és Or.</span>
            </li>
            <li className="flex gap-3">
              <span className="bg-yellow-500/20 text-yellow-300 font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">5</span>
              <span><strong className="text-white">Post-event (+7 dies):</strong> Informe amb estadístiques (visitants, fotos, abast xarxes), fotos professionals i video resum.</span>
            </li>
          </ol>
        </motion.section>

        {/* CTA final */}
        <motion.div initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }}
          className="bg-gradient-to-br from-yellow-600/20 via-orange-600/20 to-red-600/15 border border-yellow-500/30 rounded-3xl p-7 sm:p-10 text-center">
          <Trophy className="w-10 h-10 text-yellow-300 mx-auto mb-4"/>
          <h3 className="font-black text-2xl sm:text-3xl mb-2" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Vols formar part de la 4ª edició?
          </h3>
          <p className="text-white/70 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Quedan poques places de patrocini. Contacta'ns per email o WhatsApp i et fem una proposta personalitzada en menys de 48 h.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setWaOpen(true)} size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold uppercase tracking-wider">
              💬 WhatsApp: parlem ara
            </Button>
            <a href="mailto:voluntarisgrupbarna@gmail.com?subject=Patrocini%20·%203x3%20Westfield%20Gl%C3%B2ries%202026">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white/85 hover:bg-white/10 font-bold uppercase tracking-wider">
                <Mail className="w-4 h-4 mr-2"/>Escriu-nos email
              </Button>
            </a>
          </div>
          <p className="text-[10px] text-white/35 mt-5">
            CB Grup Barna · Time Chamber · Eix Clot · Federat FCBQ des de 1965
          </p>
        </motion.div>
      </div>

      {/* Modal WhatsApp amb event "patrocinador" perquè entri al CRM com a categoria pròpia */}
      <WhatsAppLeadForm
        open={waOpen}
        onClose={() => setWaOpen(false)}
        source="patrocinadors"
        event="tres_x_tres"
        intent="general"
      />
    </div>
  );
}

function ReasonCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-yellow-500/30 transition-colors">
      <Icon className="w-5 h-5 text-yellow-400 mb-3"/>
      <h3 className="font-bold text-base text-white mb-2">{title}</h3>
      <p className="text-xs text-white/60 leading-relaxed">{text}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";

/**
 * Pàgina de preguntes freqüents (FAQ).
 *
 * SEO: cada pregunta es renderitza com a <h2>, generant intents long-tail
 * que coincideixen amb cerques reals al Google. Les mateixes 12 preguntes
 * estan a index.html dins JSON-LD FAQPage, així que Google pot mostrar-les
 * com a rich snippets a la SERP.
 */

type FAQ = { q: string; a: string; tags?: string[] };

const FAQS: FAQ[] = [
  {
    q: "Què és el 3×3 Westfield Glòries?",
    a: "És el torneig oficial de bàsquet 3×3 amb punts FIBA del barri del Clot-Glòries de Barcelona, organitzat per CB Grup Barna · Time Chamber · Eix Clot. La 4a edició es disputa el 6 i 7 de juny de 2026 amb 2.400€ de prize money en 6 categories i jugadors de tota la península.",
    tags: ["què és", "torneig", "fiba"],
  },
  {
    q: "Quan i on es juga el torneig 2026?",
    a: "Es disputa el dissabte 6 i diumenge 7 de juny de 2026 a tres seus del barri del Clot-Glòries de Barcelona: Westfield Glòries (Av. Diagonal 208, seu principal), La Nau del Clot (Carrer de la Llacuna 172, pavelló oficial) i Rambleta del Clot (pista exterior).",
    tags: ["data", "lloc", "seu"],
  },
  {
    q: "Com m'inscric al 3×3 Westfield Glòries?",
    a: "Pel formulari online a la pàgina /inscripcion. El procés té 5 passos: dades de l'equip, capità, jugadors (3-5), samarretes i pagament. La transferència bancària es fa amb un codi QR pre-omplert que escaneges amb l'app del banc. Confirmem la plaça en menys de 24h per email i WhatsApp.",
    tags: ["com inscriure", "registre", "formulari"],
  },
  {
    q: "Quant costa la inscripció?",
    a: "Entre 75€ i 105€ per equip. 75€ equip de 4 jugadors (categoria formativa), 85€ equip de 4 jugadors (Sèniors/Veterans), 90€ equip de 5 jugadors (formativa), 105€ equip de 5 jugadors (Sèniors/Veterans). Hi ha descompte del 10% si comparteixes el torneig amb 5 amics per WhatsApp i segueixes @cbgrupbarna a Instagram.",
    tags: ["preu", "cost", "descompte"],
  },
  {
    q: "Quantes categories hi ha?",
    a: "10 categories agrupades: Escola, Premini, Mini, Preinfantil, Infantil, Cadet, Junior, Sèniors, Veterans i Màgics (categoria inclusiva). Les categories formatives (Escola → Junior) tenen preu reduït; les Sèniors i Veterans paguen una mica més com a categoria principal.",
    tags: ["categories", "edats"],
  },
  {
    q: "Hi ha categoria femenina?",
    a: "Sí. Cada categoria pot tenir equips masculins, femenins i mixtos. La igualtat és un eix central de l'esdeveniment. Tenim premis equiparats a les categories femenines Sèniors i Veterans (800€ i 100€ respectivament).",
    tags: ["femení", "dones", "mixtos"],
  },
  {
    q: "El torneig dóna punts FIBA 3×3?",
    a: "Sí. És un torneig oficial reconegut per FIBA 3×3, així que els jugadors Sèniors obtenen punts pel ranking mundial individual de FIBA 3×3 que sumen per accedir a competicions internacionals.",
    tags: ["fiba", "punts", "ranking"],
  },
  {
    q: "Quants jugadors té un equip 3×3?",
    a: "Cada equip té entre 3 i 5 jugadors: 3 a pista i fins a 2 reserves. La inscripció és per 4 o 5 jugadors per donar marge de canvis. El preu varia segons el nombre.",
    tags: ["jugadors", "plantilla"],
  },
  {
    q: "Què inclou el preu d'inscripció?",
    a: "Samarreta oficial del torneig per a cada jugador, dorsals, accés als 2 dies, premis dels comerços col·laboradors per a tots els equips, i opció a 2.400€ de prize money repartits en les 6 categories Sèniors i Veterans.",
    tags: ["preu", "samarreta", "què inclou"],
  },
  {
    q: "Quins són els premis (prize money)?",
    a: "2.400€ totals: Sèniors A Pro Masculí 800€ · Sèniors A Pro Femení 800€ · Sèniors B Amateur Masculí 300€ · Sèniors B Amateur Femení 300€ · Veterans Masculí (+35) 100€ · Veterans Femení (+35) 100€. Només cobra el 1r classificat de cada categoria; el 2n rep copa i el 3r medalla. Totes les categories tenen premis dels comerços.",
    tags: ["premis", "prize money", "trofeus"],
  },
  {
    q: "Com puc pagar la inscripció?",
    a: "Per transferència bancària a l'IBAN del club (es genera un codi QR EPC que pre-omple l'app del banc amb tot — IBAN, import i concepte). Després puges el comprovant al formulari per validar la inscripció.",
    tags: ["pagament", "qr", "transferència"],
  },
  {
    q: "Què he de portar el dia del torneig?",
    a: "DNI dels jugadors per validació, sabatilles de bàsquet o pista, samarreta oficial del torneig (la rebràs el dia), aigua i ganes. Hi haurà bar i ambient festiu durant els 2 dies. També us tornem a enviar el QR del vostre equip per email per facilitar el check-in i la recollida de samarretes a l'arribada.",
    tags: ["dia torneig", "qr check-in"],
  },
  {
    q: "Puc inscriure'm sense equip? Què passa si no conec a ningú?",
    a: "Sí! Tens dues opcions: (1) Inscripció individual a /inscripcio-individual per 20€: t'apuntes sol amb les teves dades, talla i posició preferida i nosaltres t'assignem a un equip una setmana abans del torneig segons categoria d'edat i nivell. (2) Pots venir a la pista i preguntar el dia del torneig si algun equip necessita un suplent — sempre hi ha algú que falla.",
    tags: ["sense equip", "individual", "20€", "solo", "assignar equip"],
  },
  {
    q: "Com funciona la inscripció individual de 20€?",
    a: "Vas a /inscripcio-individual i omples les teves dades: nom, cognoms, data de naixement, email, telèfon, talla samarreta, posició preferida i nivell. Pagues 20€ per transferència amb un QR que se't genera automàticament. El club et trucarà o enviarà WhatsApp 7 dies abans del torneig per confirmar a quin equip jugues. El preu inclou samarreta oficial, dorsal i accés als 2 dies.",
    tags: ["individual", "preu", "com funciona", "assignació"],
  },
  {
    q: "Si vinc sol, puc triar la categoria?",
    a: "No. Per als jugadors individuals, la categoria es decideix automàticament segons l'edat i la posició preferida que indiquis al formulari. Volem assegurar partits equilibrats: si tens 16 anys aniràs a Cadet o Junior, si tens 35+ a Veterans, etc. La teva posició preferida (Base, Aler, Pivot…) ens ajuda a equilibrar l'equip que et toqui.",
    tags: ["individual", "categoria", "assignació", "edat"],
  },
  {
    q: "Si vaig com a individual i no m'agrada l'equip que m'assignen, què passa?",
    a: "Et trucarem 1 setmana abans del torneig per confirmar-te els companys d'equip. Si per algun motiu no t'agrada o tens incompatibilitats, ens ho fas saber i intentarem reorganitzar. Si finalment no pots venir, retornem el 50% dels 20€ si avises 72h abans (en cas contrari els 20€ es queden com a despeses de gestió/samarreta encarregada).",
    tags: ["individual", "cancel·lació", "reembossament"],
  },
  {
    q: "Es pot fer una inscripció individual i pagar el dia del torneig?",
    a: "No. Tota inscripció requereix pagament confirmat per transferència abans del 31 de maig per garantir que tindràs samarreta de la teva talla. La samarreta s'encarrega 1 setmana abans del torneig i no podem afegir noves talles passada aquesta data.",
    tags: ["individual", "pagament", "data límit"],
  },
];

export default function Preguntes() {
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [waOpen, setWaOpen] = useState(false);

  useEffect(() => { document.title = "Preguntes freqüents · 3×3 Westfield Glòries 2026"; }, []);

  const filtered = FAQS.filter(({ q, a, tags }) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return q.toLowerCase().includes(s) || a.toLowerCase().includes(s) || (tags || []).some(t => t.toLowerCase().includes(s));
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">FAQ</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 relative max-w-3xl">
        {/* Heading */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-center mb-10">
          <span className="inline-block bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            Preguntes Freqüents
          </span>
          <h1 className="font-black text-3xl sm:text-5xl uppercase tracking-tight mb-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Tot el que has de <span className="text-red-500">saber</span>
          </h1>
          <p className="text-white/55 max-w-xl mx-auto leading-relaxed">
            Resposta a les 12 preguntes que la gent fa més abans d'inscriure's al 3×3 Westfield Glòries.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per paraula clau (preu, FIBA, categories…)"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 outline-none transition-colors"
          />
        </div>

        {/* FAQ accordion list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-center text-white/40 py-10">No hi ha resultats per "{search}". Prova amb una altra paraula clau.</p>
          ) : filtered.map((faq, i) => {
            const idx = FAQS.indexOf(faq);
            const open = openIdx === idx;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.04 }}
                className={`bg-white/[0.04] border rounded-2xl transition-colors ${open ? "border-red-500/40" : "border-white/10"}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : idx)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 group"
                >
                  <h2 className="font-bold text-base sm:text-lg text-white group-hover:text-red-300 transition-colors">{faq.q}</h2>
                  <ChevronDown className={`w-5 h-5 text-white/40 shrink-0 transition-transform ${open ? "rotate-180 text-red-400" : ""}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm sm:text-[15px] text-white/70 leading-relaxed">{faq.a}</p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA inferior */}
        <div className="mt-12 bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/30 rounded-3xl p-7 text-center">
          <h3 className="font-black text-xl sm:text-2xl mb-2">No has trobat la teva resposta?</h3>
          <p className="text-white/60 text-sm mb-5">Contacta'ns per email o WhatsApp i et resolem qualsevol dubte en menys de 24h.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:voluntaris@grupbarna.info?subject=Pregunta%20sobre%203x3%20Westfield%20Gl%C3%B2ries">
              <Button variant="outline" className="border-white/30 text-white/85 hover:bg-white/10 font-bold uppercase tracking-wider w-full sm:w-auto">
                ✉️ Email
              </Button>
            </a>
            <Button
              type="button"
              onClick={() => setWaOpen(true)}
              className="bg-[#25D366] hover:bg-[#1da851] text-white font-bold uppercase tracking-wider w-full sm:w-auto"
            >
              📱 WhatsApp
            </Button>
            <Link to="/inscripcion">
              <Button className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider w-full sm:w-auto">
                🏀 Equip
              </Button>
            </Link>
            <Link to="/inscripcio-individual">
              <Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider w-full sm:w-auto">
                👤 Solo (20€)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <WhatsAppLeadForm open={waOpen} onClose={() => setWaOpen(false)} source="faq" />
    </div>
  );
}

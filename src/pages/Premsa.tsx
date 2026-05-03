import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Mail, Phone, Image as ImageIcon, FileText, Trophy, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";

/**
 * Pàgina /premsa — Press kit públic.
 * Pensat per a periodistes, mitjans, blocaires i partners. Conté:
 *   - Press release breu (key facts)
 *   - Imatges descarregables (cartell, logos)
 *   - Contacte premsa directe
 *   - Coverage previ
 */

export default function Premsa() {
  const [waOpen, setWaOpen] = useState(false);
  useEffect(() => { document.title = "Press kit · 3×3 Westfield Glòries 2026"; }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-950/15 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-orange-500 tracking-widest hidden sm:block">PREMSA</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl relative">
        {/* Hero */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} className="text-center mb-10">
          <span className="inline-block bg-orange-500/15 border border-orange-500/40 text-orange-300 text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-4">
            📰 Press kit · accés lliure
          </span>
          <h1 className="font-black text-4xl sm:text-5xl uppercase tracking-tight mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            Premsa & <span className="text-orange-400">Mitjans</span>
          </h1>
          <p className="text-white/60 max-w-xl mx-auto leading-relaxed text-sm">
            Recursos per a periodistes, mitjans, blocaires i partners. Tot lliure d'ús sempre que se citi com a font el 3×3 Westfield Glòries.
          </p>
        </motion.div>

        {/* Key facts */}
        <Section icon={FileText} title="Press Release · Key Facts">
          <ul className="text-sm text-white/75 space-y-2 leading-relaxed">
            <li>📅 <strong className="text-white">6 i 7 de juny de 2026</strong> · 4ª edició anual del torneig.</li>
            <li>📍 <strong className="text-white">3 seus al barri del Clot-Glòries de Barcelona</strong>: Westfield Glòries (FIBA), La Nau del Clot (formatives), Rambleta del Clot (Open Day).</li>
            <li>🏀 <strong className="text-white">100 equips · 10 categories</strong>: Escola, Premini, Mini, Preinfantil, Infantil, Cadet, Junior, Sèniors, Veterans, Màgics (inclusiva).</li>
            <li>💰 <strong className="text-white">2.400 € de prize money</strong> distribuïts entre les categories Sèniors i Veterans (M/F).</li>
            <li>⭐ Punts FIBA 3×3 oficials a la categoria Sèniors.</li>
            <li>🏢 Organitzat per <Link to="/sobre-nosaltres" className="text-orange-300 hover:underline">CB Grup Barna · Time Chamber · Eix Clot</Link>.</li>
            <li>🎯 Inscripcions: <strong className="text-white">75-105€/equip</strong> + opció individual <strong className="text-white">20€</strong> (assignació automàtica a equip).</li>
            <li>🌐 Web oficial: <a href="https://cbgrupbarna-3x3timechamber.com" className="text-orange-300 hover:underline">cbgrupbarna-3x3timechamber.com</a></li>
          </ul>
        </Section>

        {/* Descàrregues / assets */}
        <Section icon={ImageIcon} title="Recursos descarregables">
          <p className="text-xs text-white/55 mb-4 leading-relaxed">
            Imatges en alta resolució. Click dret · Desa imatge per descarregar.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <DownloadCard
              href="/og-image.png"
              filename="3x3-westfield-glories-2026-cartell.png"
              title="Cartell oficial 2026"
              subtitle="1200×630 · PNG"
              preview="/og-image.png"
            />
            <DownloadCard
              href="/og-court-bg.jpg"
              filename="3x3-westfield-glories-pista.jpg"
              title="Pista del torneig"
              subtitle="JPG · Westfield Glòries"
              preview="/og-court-bg.jpg"
            />
            <DownloadCard
              href="/logos/time-chamber.webp"
              filename="time-chamber-logo.webp"
              title="Logo Time Chamber"
              subtitle="WebP · transparent"
              preview="/logos/time-chamber.webp"
            />
            <DownloadCard
              href="/logos/eix-clot.png"
              filename="eix-clot-logo.png"
              title="Logo Eix Clot"
              subtitle="PNG · transparent"
              preview="/logos/eix-clot.png"
            />
          </div>
          <p className="text-[10px] text-white/35 mt-4 leading-relaxed">
            Per cartells personalitzats per equip (1080×1920 IG story · 1080×1080 IG post · 1200×675 X/Twitter), pots usar el generador automàtic després d'inscriure el teu equip a <Link to="/inscripcion" className="text-orange-300 hover:underline">/inscripcion</Link>.
          </p>
        </Section>

        {/* Coverage anterior */}
        <Section icon={Trophy} title="Coverage edicions anteriors">
          <p className="text-sm text-white/65 leading-relaxed mb-3">
            Reels destacats de l'edició 2025 a l'Instagram oficial:
          </p>
          <ul className="text-sm space-y-2">
            <li><a href="https://www.instagram.com/p/DJNKYiuMOGm/" target="_blank" rel="noopener noreferrer" className="text-orange-300 hover:underline">→ Ambient i partits 1ª/3ª edició</a></li>
            <li><a href="https://www.instagram.com/p/DJND83Ush_P/" target="_blank" rel="noopener noreferrer" className="text-orange-300 hover:underline">→ Highlights de la pista</a></li>
            <li><a href="https://www.instagram.com/p/DJR-4_RsR9O/" target="_blank" rel="noopener noreferrer" className="text-orange-300 hover:underline">→ Imatges del centre comercial Westfield Glòries</a></li>
          </ul>
        </Section>

        {/* Contacte premsa */}
        <Section icon={Mail} title="Contacte premsa">
          <div className="grid sm:grid-cols-2 gap-3">
            <a href="mailto:voluntaris@grupbarna.info?subject=Premsa%20·%203x3%20Westfield%20Gl%C3%B2ries"
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors group">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center"><Mail className="w-4 h-4 text-red-300"/></div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Email premsa</p>
                <p className="text-sm font-semibold text-white group-hover:text-red-300">voluntaris@grupbarna.info</p>
              </div>
            </a>
            <button type="button" onClick={() => setWaOpen(true)}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-colors group text-left w-full">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><Phone className="w-4 h-4 text-green-300"/></div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider font-bold">WhatsApp directe</p>
                <p className="text-sm font-semibold text-white group-hover:text-green-300">+34 698 425 153</p>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-white/35 mt-3 leading-relaxed">
            Per acreditació in-situ el dia del torneig, contacta'ns 48h abans amb el nom del mitjà i credencials.
          </p>
        </Section>

        {/* Acreditació quick */}
        <div className="mt-10 bg-gradient-to-br from-orange-600/20 to-red-600/15 border border-orange-500/30 rounded-3xl p-6 sm:p-8 text-center">
          <h3 className="font-black text-xl sm:text-2xl mb-2">Vols cobrir el torneig?</h3>
          <p className="text-white/70 text-sm mb-5 max-w-md mx-auto">
            Mitjans, fotògrafs, equips de TV o blocaires són benvinguts les dues jornades. T'enviem el calendari de partits i un punt de contacte in-situ.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:voluntaris@grupbarna.info?subject=Acreditaci%C3%B3%20premsa%203x3%202026">
              <Button size="lg" className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-wider">
                📰 Demanar acreditació
              </Button>
            </a>
            <Link to="/sobre-nosaltres">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white/85 hover:bg-white/10 font-bold uppercase tracking-wider">
                Conèixer els organitzadors
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <WhatsAppLeadForm open={waOpen} onClose={() => setWaOpen(false)} source="premsa" />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }}
      className="mb-7 bg-white/5 border border-white/10 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="w-4 h-4 text-orange-400"/>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/70">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

function DownloadCard({ href, filename, title, subtitle, preview }: { href: string; filename: string; title: string; subtitle: string; preview?: string }) {
  return (
    <a href={href} download={filename}
      className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/40 rounded-xl p-3 flex gap-3 items-center transition-colors group">
      {preview ? (
        <img src={preview} alt={title} loading="lazy" decoding="async"
          className="w-14 h-14 rounded-lg object-cover bg-white/5 shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <ImageIcon className="w-5 h-5 text-white/30"/>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white group-hover:text-orange-300 truncate">{title}</p>
        <p className="text-[10px] text-white/45 truncate">{subtitle}</p>
      </div>
      <Download className="w-4 h-4 text-white/30 group-hover:text-orange-300 shrink-0"/>
    </a>
  );
}

import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Train, Bus, Bike, Car, Trophy, Calendar, Wrench, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSeuBySlug, SEUS } from "@/lib/seus";

/**
 * Pàgina dedicada a una seu del torneig (3 seus al barri del Clot-Glòries).
 * Ruta: /seu/:slug
 *
 * SEO:
 *  - Cada seu té URL pròpia → rànqueja per "torneig 3x3 + nom barri/seu"
 *  - JSON-LD Place injectat al document head per local SEO + Google Maps
 *  - Internal links creuats (entre seus + cap a /inscripcion)
 */

export default function Seu() {
  const { slug } = useParams<{ slug: string }>();
  const seu = getSeuBySlug(slug);

  // SEO: actualitza title + description + JSON-LD per a la seu específica
  useEffect(() => {
    if (!seu) return;
    const baseTitle = `${seu.nom} · Seu 3×3 Westfield Glòries 2026`;
    document.title = baseTitle;
    setMeta("description",
      `${seu.nom} (${seu.tipus}) · ${seu.adreca}. Seu del torneig 3×3 Westfield Glòries 2026. Categories: ${seu.categories.join(", ")}. Com arribar amb metro ${seu.metro.linies.join("/")}, bus, tram. Parking proper.`);
    setOg("og:title", baseTitle);
    setOg("og:description", `${seu.tipus} · ${seu.adreca} · Categories: ${seu.categories.slice(0,3).join(", ")}…`);
    setOg("og:url", `https://cbgrupbarna-3x3timechamber.com/seu/${seu.slug}`);

    // JSON-LD Place schema (local SEO)
    const placeJsonLd = {
      "@context": "https://schema.org",
      "@type": "SportsActivityLocation",
      "name": seu.nom,
      "description": seu.description,
      "url": `https://cbgrupbarna-3x3timechamber.com/seu/${seu.slug}`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": seu.adreca,
        "addressLocality": "Barcelona",
        "addressRegion": "Catalunya",
        "postalCode": seu.codiPostal,
        "addressCountry": "ES",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": seu.coords.lat,
        "longitude": seu.coords.lng,
      },
      "publicAccess": true,
      "isAccessibleForFree": false,
      "image": seu.heroImage,
      "containedInPlace": {
        "@type": "Place",
        "name": "Districte de Sant Martí, Barcelona",
      },
    };
    setJsonLd("seu-place", placeJsonLd);

    return () => {
      // Reverteix els overrides quan es desmunta (per si l'usuari navega a una altra ruta)
      removeJsonLd("seu-place");
    };
  }, [seu]);

  if (!seu) return <Navigate to="/" replace />;

  const otherSeus = SEUS.filter(s => s.slug !== seu.slug);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/15 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">SEU · {seu.id}</span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0">
          <img src={seu.heroImage} alt={`${seu.nom} — pista 3×3`} className="w-full h-full object-cover" loading="eager"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/40"/>
        </div>
        <div className="relative container mx-auto px-4 py-16 sm:py-24 max-w-4xl">
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur text-white text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full mb-5">
              <span className="text-lg leading-none">{seu.emoji}</span> {seu.tipus}
            </div>
            <h1 className="font-black text-4xl sm:text-6xl uppercase leading-none mb-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              {seu.nom}
            </h1>
            <p className="text-lg text-white/85 max-w-2xl mb-5 leading-snug">{seu.rol}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-400"/> <span className="font-semibold text-white">{seu.adreca}</span></span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-red-400"/> <span className="font-semibold text-white">{seu.horari}</span></span>
            </div>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href={seu.mapsLinkUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-lg">
                  <MapPin className="w-4 h-4 mr-2"/> Obrir a Google Maps
                </Button>
              </a>
              <Link to="/inscripcion">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-semibold">
                  🏀 Inscriure el meu equip
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CONTINGUT */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Descripció */}
        <motion.div initial={{ opacity:0, y:10 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-white/75 leading-relaxed">{seu.description}</p>
        </motion.div>

        {/* GRID: Categories + Serveis */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Card title="Categories que hi juguen" icon={Trophy}>
            <div className="flex flex-wrap gap-2">
              {seu.categories.map(cat => (
                <span key={cat} className="bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-bold px-3 py-1.5 rounded-full">{cat}</span>
              ))}
            </div>
          </Card>
          <Card title="Serveis" icon={Wrench}>
            <ul className="text-sm text-white/70 space-y-1.5">
              {seu.serveis.map(s => <li key={s}>· {s}</li>)}
            </ul>
          </Card>
        </div>

        {/* Mapa Google */}
        <Card title="Mapa interactiu" icon={MapPin} className="mb-6">
          <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
            <iframe
              src={seu.mapsEmbedUrl}
              width="100%" height="100%" style={{ border: 0 }} loading="lazy"
              title={`Mapa de ${seu.nom}`}
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-white/50">{seu.adreca}, {seu.codiPostal}</p>
            <a href={seu.mapsLinkUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1">
              Obrir <ExternalLink className="w-3 h-3"/>
            </a>
          </div>
        </Card>

        {/* Com arribar — transport públic + parking */}
        <Card title="Com arribar" icon={Train} className="mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Transport públic */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Transport públic</p>
              <Transport icon={Train} label={`Metro ${seu.metro.linies.join(", ")}`} value={`Estació ${seu.metro.nom} · ${seu.metro.minutsAPeu} min a peu`} />
              {seu.tram && <Transport icon={Train} label={`Tram ${seu.tram.linies.join(", ")}`} value={`Parada ${seu.tram.parada}`} />}
              {seu.bus && <Transport icon={Bus} label={`Bus ${seu.bus.linies.join(", ")}`} value={`Parada ${seu.bus.parada}`} />}
              {seu.bicing && <Transport icon={Bike} label="Bicing" value={`Estació "${seu.bicing.estacio}" · ${seu.bicing.minutsAPeu} min a peu`} />}
            </div>
            {/* Parking */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Pàrquing</p>
              {seu.parking.map(p => (
                <div key={p.nom} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-orange-400"/>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.nom}</p>
                    <p className="text-xs text-white/50">{p.tipus}{p.preu ? ` · ${p.preu}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Altres seus (cross-link) */}
        <div className="mt-12">
          <h2 className="font-black text-xl mb-4 uppercase tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Altres seus del torneig</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {otherSeus.map(s => (
              <Link key={s.slug} to={`/seu/${s.slug}`}
                className="bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-white/10 rounded-2xl p-4 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{s.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">{s.tipus}</p>
                    <p className="font-bold text-white group-hover:text-red-300">{s.nom}</p>
                    <p className="text-xs text-white/50">{s.adreca}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-12 bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/30 rounded-3xl p-7 text-center">
          <h3 className="font-black text-xl sm:text-2xl mb-2">Vols jugar a {seu.nom}?</h3>
          <p className="text-white/60 text-sm mb-5">Inscripcions obertes amb places limitades · 6-7 Juny 2026 · 75-105€ per equip</p>
          <Link to="/inscripcion">
            <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider shadow-lg">
              🏀 Inscriure el meu equip
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── UI helpers ─── */

function Card({ title, icon: Icon, className = "", children }: { title: string; icon: any; className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-red-400" />
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-white/70">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Transport({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-red-400"/>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/50">{value}</p>
      </div>
    </div>
  );
}

/* ─── DOM helpers per actualitzar SEO meta tags + JSON-LD a la pàgina ─── */

function setMeta(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
  el.content = content;
}
function setOg(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
  el.content = content;
}
function setJsonLd(id: string, data: object) {
  let el = document.head.querySelector(`script[data-jsonld="${id}"]`) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-jsonld", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}
function removeJsonLd(id: string) {
  const el = document.head.querySelector(`script[data-jsonld="${id}"]`);
  if (el) el.remove();
}

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Users, Trophy, ChevronDown, Instagram, ExternalLink, X, ChevronLeft, ChevronRight, Zap, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Scroll Progress Bar ─── */
function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent pointer-events-none">
      <div className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-400 transition-all duration-100"
        style={{ width: `${progress}%`, boxShadow: "0 0 6px rgba(220,38,38,0.7)" }} />
    </div>
  );
}

/* ─── Countdown ─── */
function Countdown({ target }: { target: Date }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0, past: false });
  useEffect(() => {
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setTime({ d: 0, h: 0, m: 0, s: 0, past: true }); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTime({ d, h, m, s, past: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (time.past) return (
    <div className="text-center py-2">
      <span className="text-xl font-bold text-red-500 uppercase tracking-widest">Edició 2026 · Properament!</span>
    </div>
  );
  const units = [
    { label: "DIES", value: time.d },
    { label: "HORES", value: time.h },
    { label: "MIN", value: time.m },
    { label: "SEG", value: time.s },
  ];
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {units.map(({ label, value }, i) => (
        <div key={label} className="flex items-center gap-2 sm:gap-4">
          <div className="text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
                {String(value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-xs text-white/50 uppercase tracking-wider mt-1 block">{label}</span>
          </div>
          {i < 3 && <span className="text-red-400 font-bold text-xl mb-4">:</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Comptador d'equips inscrits (live des d'Apps Script doGet) ─── */
const COUNTER_ENDPOINT = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK || "";
const COUNTER_CACHE_KEY = "equips_inscrits_cache_v1";
const COUNTER_REFRESH_MS = 30_000;

type EquipsState = { count: number; capacity: number | null; loaded: boolean };

function useEquipsInscrits(): EquipsState {
  const [state, setState] = useState<EquipsState>(() => {
    try {
      const raw = localStorage.getItem(COUNTER_CACHE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return { count: Number(p.count) || 0, capacity: typeof p.capacity === "number" ? p.capacity : null, loaded: true };
      }
    } catch {}
    return { count: 0, capacity: null, loaded: false };
  });

  useEffect(() => {
    if (!COUNTER_ENDPOINT) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(COUNTER_ENDPOINT, { method: "GET" });
        if (!res.ok) return;
        const json = await res.json();
        if (!alive) return;
        const next: EquipsState = {
          count: Number(json.count) || 0,
          capacity: typeof json.capacity === "number" ? json.capacity : null,
          loaded: true,
        };
        setState(next);
        try { localStorage.setItem(COUNTER_CACHE_KEY, JSON.stringify(next)); } catch {}
      } catch {}
    };
    tick();
    const id = setInterval(tick, COUNTER_REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return state;
}

function EquipsBadge() {
  const { count, capacity, loaded } = useEquipsInscrits();
  if (!loaded) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
        ⚡ Inscripcions Obertes
      </span>
    );
  }
  const pctLabel = capacity ? ` · ${Math.min(100, Math.round((count / capacity) * 100))}%` : "";
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-900/30 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      ⚡ {count} {count === 1 ? "equip inscrit" : "equips inscrits"}{pctLabel}
    </span>
  );
}

function EquipsProgress() {
  const { count, capacity, loaded } = useEquipsInscrits();
  const hasLive = loaded && capacity != null;
  const pct = hasLive ? Math.min(100, Math.round((count / capacity!) * 100)) : INSCRIPTIONS_PCT;
  const titol = hasLive ? `${count} equips inscrits de ${capacity}` : "Places ocupades";
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-white">{titol}</span>
        <span className="text-sm font-bold text-red-400">{pct}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500" />
      </div>
      <p className="text-xs text-white/40 mt-2">⚡ Poques places disponibles</p>
    </div>
  );
}

/* ─── Anunci banner (visible fins 2026-05-05 00:00) ─── */
function AnunciBanner() {
  const VISIBLE_FINS = new Date("2026-05-05T00:00:00");
  const [visible, setVisible] = useState(() => new Date() < VISIBLE_FINS);

  useEffect(() => {
    if (!visible) return;
    const ms = VISIBLE_FINS.getTime() - Date.now();
    if (ms <= 0) { setVisible(false); return; }
    const t = setTimeout(() => setVisible(false), ms);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white text-center py-2 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg">
      <span className="inline-flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        Dilluns 4 maig · Anunci oficial: samarreta, premis i nova seu
      </span>
    </div>
  );
}

/* ─── Animated Counter ─── */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const isDecimal = !Number.isInteger(end);
  useEffect(() => {
    const duration = 2000;
    const steps = 70;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) { setCount(end); clearInterval(timer); }
      else setCount(isDecimal ? +current.toFixed(1) : Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [end, isDecimal]);
  const display = isDecimal ? count.toFixed(1) : count.toLocaleString("es-ES");
  return <span>{display}{suffix}</span>;
}

/* ─── Lightbox ─── */
function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: { src: string; alt: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrev, onNext]);
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white z-10"><X className="w-8 h-8" /></button>
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 bg-black/40 rounded-full p-2"><ChevronLeft className="w-8 h-8" /></button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-10 bg-black/40 rounded-full p-2"><ChevronRight className="w-8 h-8" /></button>
        <motion.img key={index} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          src={images[index].src} alt={images[index].alt}
          className="max-w-full max-h-[85vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm">
          {images[index].alt} · {index + 1} / {images.length}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Autoplay Video Reel ─── */
function VideoReel() {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
      style={{ aspectRatio: "9/16", maxWidth: 340, boxShadow: "0 0 40px rgba(220,38,38,0.2)" }}>
      <video
        src="/video/reel.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      {/* IG badge overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        <span className="text-white text-xs font-semibold">@cbgrupbarna</span>
      </div>
      <div className="absolute bottom-3 left-3 flex gap-1.5">
        <span className="text-xs bg-red-500/80 text-white font-bold px-2 py-0.5 rounded-full">#3x3</span>
        <span className="text-xs bg-red-500/80 text-white font-bold px-2 py-0.5 rounded-full">#3x3time</span>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] } })
};

const categories = [
  { name: "SENIOR A · PRO", gender: "♂ ♀", desc: "Prize Money 800€ · Punts Rànquing FIBA", color: "from-red-500/15 to-orange-500/10", badge: "FIBA OFFICIAL", price: "90€ (5 jug.)" },
  { name: "SENIOR B · AMATEUR", gender: "♂ ♀", desc: "Prize Money 300€ · Per a tots els nivells", color: "from-amber-500/15 to-yellow-500/10", badge: "OBERT", price: "70€ (4 jug.)" },
  { name: "VETERANS", gender: "♂ ♀", desc: "Prize Money 200€ · Esport intergeneracional (+35)", color: "from-cyan-500/15 to-teal-500/10", badge: "+35 ANYS", price: "70€ (4 jug.)" },
  { name: "EQUALS · INCLUSIVA", gender: "♂ ♀", desc: "Specials i jugadors sense discapacitat compartint pista. NOVETAT 2026.", color: "from-pink-500/15 to-fuchsia-500/10", badge: "NOU 2026", price: "70€ (4 jug.)" },
  { name: "U18 JUNIOR", gender: "♂ ♀", desc: "Categoria juvenil d'alt nivell", color: "from-blue-500/15 to-blue-600/10", badge: "JUVENIL", price: "70€ (4 jug.)" },
  { name: "U16 CADET", gender: "♂", desc: "Competició formativa d'elit", color: "from-emerald-500/15 to-emerald-600/10", badge: "FORMACIÓ", price: "70€ (4 jug.)" },
  { name: "U14 INFANTIL", gender: "♂", desc: "Primer pas cap a la competició", color: "from-violet-500/15 to-violet-600/10", badge: "FORMACIÓ", price: "70€ (4 jug.)" },
  { name: "PREMINI · BENJ · ALEV", gender: "♂", desc: "Iniciació i diversió garantida", color: "from-slate-500/15 to-slate-600/10", badge: "INICIACIÓ", price: "70€ (4 jug.)" },
];

/* Premi econòmic per categoria — només pel 1r classificat. 2n: copa. 3r: medalles.
   Total Prize Money 2026: 2.400€ */
const prizes = [
  { cat: "Senior A · Femení",   amount: "800€", color: "from-red-500/25 to-orange-500/15 border-red-400/50",       featured: true },
  { cat: "Senior A · Masculí",  amount: "800€", color: "from-red-500/25 to-orange-500/15 border-red-400/50",       featured: true },
  { cat: "Senior B · Femení",   amount: "300€", color: "from-amber-500/15 to-yellow-500/10 border-amber-400/40",   featured: false },
  { cat: "Senior B · Masculí",  amount: "300€", color: "from-amber-500/15 to-yellow-500/10 border-amber-400/40",   featured: false },
  { cat: "Veterans · Femení",   amount: "200€", color: "from-slate-400/15 to-slate-500/10 border-slate-300/30",    featured: false },
  { cat: "Veterans · Masculí",  amount: "200€", color: "from-slate-400/15 to-slate-500/10 border-slate-300/30",    featured: false },
];
const PRIZE_MONEY_TOTAL = "2.400€";

const rules = [
  { icon: "🏀", title: "Mitja pista", desc: "Pista de 15×11 m amb un sol aro" },
  { icon: "1️⃣", title: "Puntuació", desc: "1 pt dins l'arc · 2 pts fora" },
  { icon: "⏱️", title: "Durada", desc: "10 min o primer en arribar a 21" },
  { icon: "⚡", title: "Possessió", desc: "Rellotge de tir de 12 segons" },
  { icon: "👥", title: "Equip", desc: "3 jugadors + 1 reserva" },
  { icon: "🏆", title: "Pròrroga", desc: "Primer en anotar 2 punts guanya" },
];

const stats = [
  { value: 180, suffix: "+",   label: "Equips a 2 edicions" },
  { value: 800, suffix: "+",   label: "Jugadors/es totals" },
  { value: 2.4, suffix: "M+",  label: "Impressions potencials" },
  { value: 25,  suffix: "%",   label: "Creixement 2024→2025" },
];

/* Logo order: Westfield → Grup Barna → Time Chamber → Eix Clot */
const LOGOS = [
  { name: "Westfield Glòries", img: "https://agents-download.skywork.ai/image/rt/82e0492292ae633f612cb4115e85e4d7.jpg", url: "https://es.westfield.com/glories", invert: false },
  { name: "CB Grup Barna", img: "https://agents-download.skywork.ai/image/rt/e6b78ef71e7bdca6e1f9a999f5824f24.jpg", url: "https://cbgrupbarna.com", invert: false },
  { name: "Time Chamber", img: "/logos/time-chamber.webp", url: "https://timechamber.es", invert: true },
  { name: "Eix Clot", img: "/logos/eix-clot.png", url: "#", invert: false },
];

const sponsors = [
  { name: "Westfield Glòries", img: "https://agents-download.skywork.ai/image/rt/82e0492292ae633f612cb4115e85e4d7.jpg", url: "https://es.westfield.com/glories", role: "Seu oficial" },
  { name: "CB Grup Barna", img: "https://agents-download.skywork.ai/image/rt/e6b78ef71e7bdca6e1f9a999f5824f24.jpg", url: "https://cbgrupbarna.com", role: "Organitzador" },
  { name: "Time Chamber", img: "/logos/time-chamber.webp", url: "https://timechamber.es", role: "Organitzador", invert: true },
  { name: "Eix Clot", img: "/logos/eix-clot.png", url: "#", role: "Patrocinador" },
  { name: "Ajuntament de Barcelona", img: "https://agents-download.skywork.ai/image/rt/07c3cb97d349a947b5ca072602fa18da.jpg", url: "https://www.barcelona.cat", role: "Institucional" },
];

const galleryImages = [
  { src: "https://agents-download.skywork.ai/image/rt/abf2a458a2c24a2cc542ae6b9230b456.jpg", alt: "3x3 Glòries – Edició anterior" },
  { src: "https://agents-download.skywork.ai/image/rt/4ff8764a3486e125541c12e3b99a264b.jpg", alt: "Bàsquet 3x3 Barcelona" },
  { src: "https://agents-download.skywork.ai/image/rt/a56b1d65f865a7b807b5776fc6135d78.jpg", alt: "3x3 Olímpic – Paris 2024" },
  { src: "https://agents-download.skywork.ai/image/rt/9831a1dc3871aea2d826f9aaca4aed54.jpg", alt: "Mate espectacular 3x3" },
  { src: "https://agents-download.skywork.ai/image/rt/2aba554291787da075962040ea38559f.jpg", alt: "Streetball urbà" },
  { src: "https://agents-download.skywork.ai/image/rt/0e4d1ddb575f5178071510b0c98947a0.jpg", alt: "FIBA 3x3 urban" },
];

/* Ubicacions: La Nau first, then Westfield, then Rambleta */
const UBICACIONS = [
  { id: "NC", nom: "La Nau del Clot", tipus: "Pavelló Oficial", adreca: "Carrer de la Llacuna 172, Barcelona", color: "#E31E24", lat: 41.4063, lng: 2.1921, emoji: "🏟️", desc: "Pavelló CB Grup Barna – categories formació" },
  { id: "WG", nom: "Westfield Glòries", tipus: "Seu Principal", adreca: "Av. Diagonal 208, Barcelona", color: "#F97316", lat: 41.4034, lng: 2.1896, emoji: "🏬", desc: "Pistes principals de competició FIBA" },
  { id: "RC", nom: "Rambleta del Clot", tipus: "Pista Exterior", adreca: "Rambla del Poblenou / Clot, Barcelona", color: "#EAB308", lat: 41.4074, lng: 2.1876, emoji: "🌳", desc: "Pista exterior 3x3 de barri" },
];

const EVENT_DATE = new Date("2026-06-06T09:00:00");
const INSCRIPTIONS_PCT = 75;

/* ─── Reels Instagram destacats (dossier oficial) ─── */
const HIGHLIGHTED_REELS = [
  { id: "DJNKYiuMOGm", caption: "Ambient i partits 1ª Edició" },
  { id: "DJND83Ush_P", caption: "Highlights de la pista" },
  { id: "DJR-4_RsR9O", caption: "Imatges del centre comercial" },
];

/* ─── Edicions Anteriors (dades del dossier oficial) ─── */
function EdicionsAnterior() {
  // Reprocesa els blockquotes Instagram quan el component es munta i quan el script ja està carregat
  useEffect(() => {
    const tryProcess = () => {
      if ((window as any).instgrm?.Embeds?.process) {
        (window as any).instgrm.Embeds.process();
      }
    };
    tryProcess();
    const t = setTimeout(tryProcess, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <section id="edicions" className="py-20 bg-slate-950 scroll-mt-20 border-t border-white/8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-14">
          <span className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-3 block">Edicions Anteriors</span>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            UN PROJECTE QUE <span className="text-red-500">CREIX</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            Dades oficials extretes del dossier d'impacte CB Grup Barna × Time Chamber × Westfield Glòries.
          </p>
        </motion.div>

        {/* Comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {[
            { num: "1ª", date: "Maig 2024", equips: 80, jugadors: "~360", cats: "Cadet M, Infantil F, Infantil M", color: "from-slate-500/15 to-slate-600/10", border: "border-white/15" },
            { num: "2ª", date: "Maig 2025", equips: 100, jugadors: "~450", cats: "+ Veterans · creixement +25%", color: "from-red-500/20 to-orange-500/10", border: "border-red-500/40" },
            { num: "3ª", date: "6-7 Juny 2026", equips: "—", jugadors: "Tu hi pots ser", cats: "+ EQUALS (inclusiva) · Senior Pro Prize Money", color: "from-orange-500/20 to-yellow-500/10", border: "border-orange-400/50" },
          ].map((ed, i) => (
            <motion.div
              key={ed.num}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className={`relative bg-gradient-to-br ${ed.color} border ${ed.border} rounded-2xl p-6 backdrop-blur`}
            >
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-5xl font-black text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{ed.num}</span>
                <span className="text-xs uppercase tracking-widest text-white/50 font-bold">EDICIÓ</span>
              </div>
              <p className="text-sm text-white/40 mb-5 font-mono">{ed.date}</p>
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-black text-white tabular-nums">{ed.equips}{typeof ed.equips === "number" ? " equips" : ""}</p>
                </div>
                <div>
                  <p className="text-lg text-white/80">{ed.jugadors}{typeof ed.jugadors === "string" && ed.jugadors.startsWith("~") ? " jugadors/es" : ""}</p>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50">{ed.cats}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Impact metrics */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {[
            { v: "20.000+", l: "Persones al centre comercial" },
            { v: "1.9M+",   l: "Reach influencers (Ari Geli, Rubenrg…)" },
            { v: "67K+",    l: "Seguidors orgs (TC + Westfield + GB)" },
            { v: "500-600", l: "Samarretes oficials per edició" },
          ].map((m, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center backdrop-blur">
              <p className="text-2xl font-black text-red-400 font-mono mb-1">{m.v}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/50 leading-tight">{m.l}</p>
            </div>
          ))}
        </motion.div>

        {/* Clubs participants */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-3 font-bold">Han participat clubs com</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {["FC Barcelona", "Joventut Badalona", "+ clubs de Catalunya", "+ equips d'Alacant"].map(c => (
              <span key={c} className="px-3 py-1 rounded-full bg-white/5 border border-white/15 text-sm text-white/70">{c}</span>
            ))}
          </div>
        </motion.div>

        {/* Instagram reels destacats */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10">
          <div className="text-center mb-7">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.3em] mb-2 block">Reels destacats</span>
            <h3 className="text-2xl md:text-3xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              VEU L'AMBIENT EN <span className="text-red-500">DIRECTE</span>
            </h3>
            <p className="text-white/40 text-sm mt-2">
              Continguts oficials del dossier · etiquetats <span className="text-white/70 font-mono">#3x3</span> <span className="text-white/70 font-mono">#3x3timechamber</span>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-items-center">
            {HIGHLIGHTED_REELS.map(reel => (
              <div key={reel.id} className="w-full max-w-[400px]">
                <blockquote
                  className="instagram-media"
                  data-instgrm-permalink={`https://www.instagram.com/reel/${reel.id}/`}
                  data-instgrm-version="14"
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    margin: "0 auto",
                    maxWidth: 400,
                    minWidth: 280,
                    width: "100%",
                  }}
                >
                  <div style={{ padding: 16, color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                    Carregant Instagram...{" "}
                    <a href={`https://www.instagram.com/reel/${reel.id}/`} target="_blank" rel="noopener noreferrer" style={{ color: "#f87171", textDecoration: "underline" }}>
                      Obrir el reel
                    </a>
                  </div>
                </blockquote>
                <p className="text-center text-xs text-white/40 mt-2">{reel.caption}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-7">
            <a
              href="https://www.instagram.com/cbgrupbarna/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors text-sm font-semibold"
            >
              <Instagram className="w-4 h-4" /> Veure tots els reels a @cbgrupbarna
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [heroOffset, setHeroOffset] = useState(0);
  const [activeUbic, setActiveUbic] = useState(0);

  useEffect(() => {
    const onScroll = () => setHeroOffset(window.scrollY * 0.25);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLightbox = useCallback((i: number) => setLightboxIdx(i), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImg = useCallback(() => setLightboxIdx(i => i !== null ? (i - 1 + galleryImages.length) % galleryImages.length : 0), []);
  const nextImg = useCallback(() => setLightboxIdx(i => i !== null ? (i + 1) % galleryImages.length : 0), []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <ScrollProgressBar />
      <AnunciBanner />

      {/* ══ WHATSAPP SHARE FAB (viral hook — always visible) ══ */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent("🏀 3×3 Westfield Glòries 2026 · Torneig FIBA a Barcelona · 2.400€ Prize Money en 6 categories · 6-7 Juny · Places limitades! 👉 https://cbgrupbarna-3x3timechamber.com/")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Comparteix el torneig per WhatsApp"
        className="fixed bottom-5 right-5 z-[55] flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] active:scale-95 transition-all text-white px-4 py-3 rounded-full shadow-lg shadow-green-500/30 ring-2 ring-white/10 motion-safe:animate-pulse motion-safe:hover:animate-none"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        <span className="text-sm font-bold hidden sm:inline">Comparteix</span>
      </a>

      {lightboxIdx !== null && (
        <Lightbox images={galleryImages} index={lightboxIdx} onClose={closeLightbox} onPrev={prevImg} onNext={nextImg} />
      )}

      {/* ══ NAV ══ */}
      <nav className="fixed top-0.5 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="container mx-auto px-0 sm:px-2 flex items-center justify-between h-[60px]">
          {/* Logos: Westfield → Grup Barna → Time Chamber → Eix Clot */}
          <div className="flex items-center gap-1.5 pl-2">
            {LOGOS.map(logo => (
              <a key={logo.name} href={logo.url} target={logo.url !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer" title={logo.name} className="group">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-white flex items-center justify-center group-hover:border-red-400/60 transition-all shadow-md">
                  <img src={logo.img} alt={logo.name}
                    className="w-full h-full object-contain p-0.5"
                    style={logo.invert ? { filter: "invert(1)" } : {}} />
                </div>
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-5 text-sm font-medium pr-4">
            {[["#evento","Torneig"],["#ubicacions","Ubicacions"],["#premis","Premis"],["#categories","Categories"],["#galeria","Galeria"],["#patrocinadors","Sponsors"]].map(([href, label]) => (
              <a key={href} href={href} className="text-white/60 hover:text-white transition-colors">{label}</a>
            ))}
            <Link to="/inscripcion">
              <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider hover:scale-105 transition-transform shadow-lg">
                Inscriu-te
              </Button>
            </Link>
          </div>
          <button className="md:hidden text-white/60 hover:text-white pr-4" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="w-6 flex flex-col gap-1">
              <span className={`h-0.5 bg-current transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`h-0.5 bg-current transition-all ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </div>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-slate-950/98 border-b border-white/10 px-4 py-4 flex flex-col gap-3">
            {[["#evento","Torneig"],["#ubicacions","Ubicacions"],["#premis","Premis"],["#categories","Categories"],["#galeria","Galeria"],["#patrocinadors","Sponsors"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="text-white/60 hover:text-white transition-colors font-medium py-1">{label}</a>
            ))}
            <Link to="/inscripcion" onClick={() => setMenuOpen(false)}>
              <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider mt-2">Inscriu-te Ara!</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* BG */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat will-change-transform"
          style={{ backgroundImage: `url(https://agents-download.skywork.ai/image/rt/abf2a458a2c24a2cc542ae6b9230b456.jpg)`, transform: `translateY(${heroOffset}px)` }} />
        {/* Elegant gradient overlay – less black, more refined */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(15,10,30,0.88) 0%, rgba(20,10,20,0.72) 50%, rgba(10,5,20,0.92) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(220,38,38,0.12) 0%, transparent 60%)" }} />

        <div className="relative z-10 container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left: title + info + counters */}
            <div>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="mb-4">
                <span className="inline-flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  3ª Edició · Inscripcions Obertes
                </span>
              </motion.div>

              {/* Compact title */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="mb-5">
                <h1 className="font-black uppercase leading-none tracking-tight" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  <span className="block text-red-500" style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", textShadow: "0 0 40px rgba(220,38,38,0.4)" }}>
                    3×3 WESTFIELD GLÒRIES
                  </span>
                  <span className="block text-white/80" style={{ fontSize: "clamp(1rem, 2.8vw, 1.6rem)", letterSpacing: "0.04em", marginTop: "0.2em" }}>
                    × GRUP BARNA · TIME CHAMBER · EIX CLOT
                  </span>
                </h1>
              </motion.div>

              {/* Date + location */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="flex flex-wrap gap-x-5 gap-y-2 mb-6 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-red-400" />
                  <strong className="text-white">6 i 7 de Juny 2026</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <strong className="text-white">3 seus · Barri del Clot, Barcelona</strong>
                </span>
              </motion.div>

              {/* CTA */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-wrap gap-3 mb-8">
                <Link to="/inscripcion">
                  <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-7 py-5 rounded-xl hover:scale-105 transition-transform shadow-xl"
                    style={{ boxShadow: "0 8px 30px rgba(220,38,38,0.4)" }}>
                    🏀 Inscriu el teu Equip — des de 70€
                  </Button>
                </Link>
                <a href="#evento">
                  <Button variant="outline" size="lg" className="border-white/20 text-white/70 hover:text-white hover:border-white/50 font-medium px-7 py-5 rounded-xl bg-white/5">
                    Saber més <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </a>
              </motion.div>

              {/* Counters – page 1 */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
                className="grid grid-cols-4 gap-3 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
                {stats.map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg sm:text-2xl font-bold font-mono text-red-400">
                      <Counter end={s.value} suffix={s.suffix} />
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide leading-tight">{s.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* Urgency badge — live */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="mt-4">
                <EquipsBadge />
              </motion.div>
            </div>

            {/* Right: Instagram Reel */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="flex flex-col items-center lg:items-end">
              <VideoReel />
            </motion.div>
          </div>
        </div>

        {/* Countdown banner */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent py-6">
          <Countdown target={EVENT_DATE} />
        </div>
      </section>

      {/* ══ EL TORNEIG ══ */}
      <section id="evento" className="py-20 scroll-mt-20 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">El Torneig</span>
              <h2 className="text-4xl md:text-5xl font-black leading-tight mb-5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                EL TORNEIG URBÀ<br /><span className="text-red-500">MÉS POTENT</span><br />DE BARCELONA
              </h2>
              <p className="text-white/60 leading-relaxed mb-5">
                El <strong className="text-white">3×3 Westfield Glòries</strong> organitzat per <strong className="text-white">CB Grup Barna, Time Chamber i Eix Clot</strong> torna amb més equips, més categories i més espectacle.
              </p>
              <p className="text-white/60 leading-relaxed mb-7">
                Tres seus de competició official FIBA al barri del Clot-Glòries. Des de Premini fins a Senior Pro amb Prize Money i punts per al rànquing mundial.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-7">
                {[
                  { icon: <Calendar className="w-4 h-4" />, label: "Dates", value: "6-7 Juny 2025" },
                  { icon: <MapPin className="w-4 h-4" />, label: "Seus", value: "3 ubicacions" },
                  { icon: <Users className="w-4 h-4" />, label: "Equip", value: "3+1 jugadors" },
                  { icon: <Trophy className="w-4 h-4" />, label: "Inscripció", value: "des de 70€" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:border-red-500/30 transition-colors">
                    <span className="text-red-400">{item.icon}</span>
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider">{item.label}</div>
                      <div className="text-sm font-semibold text-white">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Progress — live */}
              <EquipsProgress />
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src="https://agents-download.skywork.ai/image/rt/4ff8764a3486e125541c12e3b99a264b.jpg"
                  alt="3x3 Basketball Barcelona" className="w-full h-96 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">#1 Esport Urbà del Món</span>
                  <p className="text-lg font-bold text-white mt-1">Olímpic des de Tòquio 2021</p>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-red-600 text-white rounded-xl p-3 text-center shadow-xl">
                <div className="text-xl font-black font-mono">3ª</div>
                <div className="text-xs font-bold uppercase tracking-wider">Edició</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ UBICACIONS + MAPA ══ */}
      <section id="ubicacions" className="py-20 bg-slate-950 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">On juguem</span>
            <h2 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              3 SEUS · <span className="text-red-500">1 BARRI</span>
            </h2>
            <p className="text-white/50 mt-3 max-w-lg mx-auto text-sm">
              La Nau del Clot, Westfield Glòries i la Rambleta del Clot formen el circuit del torneig al barri del Clot-Glòries.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-5 gap-5 items-start">
            <div className="lg:col-span-2 space-y-3">
              {UBICACIONS.map((ubic, i) => (
                <motion.button key={ubic.id}
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.2}
                  onClick={() => setActiveUbic(i)}
                  className={`w-full text-left rounded-xl p-4 border transition-all duration-300 ${
                    activeUbic === i ? "bg-white/8 border-white/20" : "bg-white/3 border-white/8 hover:border-white/15"}`}
                  style={activeUbic === i ? { boxShadow: `0 0 20px ${ubic.color}22` } : {}}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ background: `${ubic.color}18`, border: `1px solid ${ubic.color}44` }}>
                      {ubic.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm text-white truncate">{ubic.nom}</h3>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${ubic.color}22`, color: ubic.color }}>
                          {ubic.id}
                        </span>
                      </div>
                      <div className="text-xs font-medium mb-0.5" style={{ color: ubic.color }}>{ubic.tipus}</div>
                      <div className="text-xs text-white/40">{ubic.adreca}</div>
                    </div>
                  </div>
                </motion.button>
              ))}
              <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                <p className="text-xs text-white/40 mb-2 font-semibold uppercase tracking-wider">Circuit</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-red-400">NC</span>
                  <div className="flex-1 border-t border-dashed border-white/20" />
                  <span className="font-bold text-orange-400">WG</span>
                  <div className="flex-1 border-t border-dashed border-white/20" />
                  <span className="font-bold text-yellow-400">RC</span>
                </div>
                <p className="text-xs text-white/30 mt-2">🚶 ~15 min a peu entre les tres seus</p>
              </div>
              {/* Enllaços a pàgines individuals de seu (transport, pàrquing, mapa, categories) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Tota la info per seu</p>
                <Link to="/seu/westfield-glories" className="flex items-center justify-between bg-white/3 hover:bg-white/8 border border-white/10 hover:border-orange-500/40 rounded-lg px-3 py-2 transition-colors group">
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white">🏬 Westfield Glòries · Seu Principal</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-orange-400" />
                </Link>
                <Link to="/seu/nau-del-clot" className="flex items-center justify-between bg-white/3 hover:bg-white/8 border border-white/10 hover:border-red-500/40 rounded-lg px-3 py-2 transition-colors group">
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white">🏟️ La Nau del Clot · Pavelló Oficial</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-red-400" />
                </Link>
                <Link to="/seu/rambleta-del-clot" className="flex items-center justify-between bg-white/3 hover:bg-white/8 border border-white/10 hover:border-yellow-500/40 rounded-lg px-3 py-2 transition-colors group">
                  <span className="text-xs font-semibold text-white/80 group-hover:text-white">🌳 Rambleta del Clot · Streetball</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30 group-hover:text-yellow-400" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-3">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.5}
                className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <iframe
                  key={activeUbic}
                  title={`Mapa ${UBICACIONS[activeUbic].nom} · 3x3 Westfield Glòries`}
                  src={`https://maps.google.com/maps?q=${UBICACIONS[activeUbic].lat},${UBICACIONS[activeUbic].lng}&hl=ca&z=16&output=embed`}
                  width="100%" height="380"
                  style={{ border: 0 }}
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </motion.div>
              <motion.div key={activeUbic} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-xl">{UBICACIONS[activeUbic].emoji}</span>
                <div>
                  <p className="font-bold text-sm text-white">{UBICACIONS[activeUbic].nom}</p>
                  <p className="text-xs text-white/40">{UBICACIONS[activeUbic].adreca}</p>
                </div>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(UBICACIONS[activeUbic].adreca)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto text-xs font-semibold flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors">
                  <MapPin className="w-3 h-3" /> Com arribar-hi
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PREMIS ══ */}
      <section id="premis" className="py-20 bg-slate-900 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Edició 2026 · Prize Money</span>
            <h2 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              PREMIS <span className="text-red-500">& TROFEUS</span>
            </h2>
            <div className="inline-flex items-center gap-3 mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-red-600/20 to-orange-500/20 border border-orange-400/40">
              <span className="text-xs font-bold uppercase tracking-widest text-orange-300">Total Prize Money</span>
              <span className="text-2xl font-black font-mono text-white">{PRIZE_MONEY_TOTAL}</span>
            </div>
            <p className="text-white/40 text-sm mt-4 max-w-xl mx-auto">
              Repartit en 6 categories. Premi econòmic <strong className="text-white/70">només pel 1r classificat</strong> de cada categoria.
            </p>
          </motion.div>

          {/* Grid 6 categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10">
            {prizes.map((prize, i) => (
              <motion.div
                key={prize.cat}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i * 0.15}
                whileHover={{ scale: 1.03, y: -3 }}
                className={`relative bg-gradient-to-br ${prize.color} border rounded-2xl p-5 text-center backdrop-blur`}
              >
                {prize.featured && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                    Top Categoria
                  </span>
                )}
                <div className="text-3xl mb-2">🥇</div>
                <div className="text-xs uppercase tracking-wider text-white/60 mb-1 font-bold">{prize.cat}</div>
                <div className="text-3xl font-black font-mono text-white mb-1">{prize.amount}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">al 1r classificat</div>
              </motion.div>
            ))}
          </div>

          {/* 2n + 3r + comerços */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-2xl">🥈</span>
              <div>
                <div className="font-bold text-sm text-white">2n classificat</div>
                <div className="text-xs text-white/40">Copa oficial</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-2xl">🥉</span>
              <div>
                <div className="font-bold text-sm text-white">3r classificat</div>
                <div className="text-xs text-white/40">Medalles</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-400/30 rounded-xl p-4">
              <span className="text-2xl">🎁</span>
              <div>
                <div className="font-bold text-sm text-white">Bonus comerços</div>
                <div className="text-xs text-white/40">Sortejos i regals dels patrocinadors locals</div>
              </div>
            </div>
          </motion.div>

          {/* Resta d'avantatges */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
            {[
              { icon: <Star className="w-4 h-4" />, title: "Punts FIBA 3x3", desc: "Rànquing mundial oficial" },
              { icon: <Medal className="w-4 h-4" />, title: "Trofeus i medalles", desc: "Per als 3 primers de totes les categories" },
              { icon: <Zap className="w-4 h-4" />, title: "Material esportiu", desc: "Lots per als equips participants" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <span className="text-red-400 mt-0.5">{item.icon}</span>
                <div>
                  <div className="font-semibold text-sm text-white">{item.title}</div>
                  <div className="text-xs text-white/40 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mt-8">
            <Link to="/inscripcion">
              <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-10 py-5 rounded-xl hover:scale-105 transition-transform shadow-xl">
                🏆 Vull Competir pels Premis
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section id="categories" className="py-20 bg-slate-950 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Competició</span>
            <h2 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>CATEGORIES</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <motion.div key={cat.name} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.4}
                whileHover={{ scale: 1.02, y: -2 }}
                className={`relative bg-gradient-to-br ${cat.color} border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-300 bg-red-500/15 px-2 py-0.5 rounded-full">{cat.badge}</span>
                  <span className="text-xl">{cat.gender}</span>
                </div>
                <h3 className="text-lg font-black mb-1.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{cat.name}</h3>
                <p className="text-sm text-white/50 mb-3">{cat.desc}</p>
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs text-red-400 font-semibold">{cat.price} · inclou samarreta oficial</span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mt-10">
            <Link to="/inscripcion">
              <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-10 py-5 rounded-xl hover:scale-105 transition-transform">
                Inscriu el teu Equip Ara
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ REGLES ══ */}
      <section id="regles" className="py-20 bg-slate-900 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Reglament FIBA</span>
            <h2 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              LES REGLES DEL <span className="text-red-500">3×3</span>
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {rules.map((rule, i) => (
              <motion.div key={rule.title} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.4}
                whileHover={{ scale: 1.02 }}
                className="flex items-start gap-4 bg-white/5 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                <span className="text-2xl">{rule.icon}</span>
                <div>
                  <h4 className="font-bold text-white text-sm">{rule.title}</h4>
                  <p className="text-xs text-white/40 mt-1">{rule.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ GALERIA ══ */}
      <section id="galeria" className="py-20 bg-slate-950 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Edicions Anteriors</span>
            <h2 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              REVIU L'<span className="text-red-500">ENERGIA</span>
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-red-400 font-bold">#3x3</span>
              <span className="text-sm text-red-400 font-bold">#3x3time</span>
              <span className="text-sm text-white/30">@cbgrupbarna</span>
            </div>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {galleryImages.map((img, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.25}
                whileHover={{ scale: 1.03 }}
                className="relative overflow-hidden rounded-xl aspect-square border border-white/8 group cursor-pointer"
                onClick={() => openLightbox(i)}>
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">{img.alt}</div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1">
                  <ExternalLink className="w-3 h-3 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mt-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[["https://www.instagram.com/cbgrupbarna/","@cbgrupbarna"],["https://www.instagram.com/timechamber_es/","@timechamber_es"]].map(([url, handle]) => (
                <a key={handle} href={url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/40 hover:text-pink-400 transition-colors text-sm">
                  <Instagram className="w-4 h-4" /> {handle}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ EDICIONS ANTERIORS (dossier oficial) ══ */}
      <EdicionsAnterior />

      {/* ══ CTA ══ */}
      <section className="py-20 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(220,38,38,0.1) 0%, transparent 70%)" }} />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl md:text-6xl font-black mb-5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              PREPARAT PER<br /><span className="text-red-500">COMPETIR?</span>
            </h2>
            <p className="text-white/50 text-base mb-3 max-w-md mx-auto">Places limitades. Des de 70€ per equip, inclou samarreta oficial.</p>
            <p className="text-orange-300 text-sm font-semibold mb-7">
              🏷️ Codi <strong className="font-mono bg-orange-500/15 px-2 py-0.5 rounded border border-orange-500/30">3X3AVIAT</strong> · 5% descompte fins al 15 de juny
            </p>
            <Link to="/inscripcion">
              <Button size="lg" className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-base px-12 py-6 rounded-2xl hover:scale-105 transition-transform shadow-2xl"
                style={{ boxShadow: "0 16px 48px rgba(220,38,38,0.35)" }}>
                🏀 Formulari d'Inscripció
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══ PATROCINADORS ══ */}
      <section id="patrocinadors" className="py-20 border-t border-white/8 bg-slate-950 scroll-mt-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Amb el suport de</span>
            <h2 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Rajdhani', sans-serif" }}>PATROCINADORS</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-center justify-items-center max-w-5xl mx-auto">
            {sponsors.map((sp, i) => (
              <motion.a key={sp.name} href={sp.url} target={sp.url !== "#" ? "_blank" : undefined} rel="noopener noreferrer"
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.25}
                whileHover={{ scale: 1.07, y: -3 }}
                className="flex flex-col items-center gap-3 group">
                <div className="w-28 h-20 bg-white rounded-2xl flex items-center justify-center p-3 border border-transparent group-hover:border-red-400/40 transition-all shadow-md overflow-hidden">
                  {sp.img ? (
                    <img src={sp.img} alt={sp.name} className="max-w-full max-h-full object-contain"
                      style={(sp as any).invert ? { filter: "invert(1)" } : {}} />
                  ) : (
                    <span className="text-xs font-bold text-zinc-700 text-center leading-tight">{sp.name}</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-white">{sp.name}</div>
                  <div className="text-xs text-white/30">{sp.role}</div>
                </div>
              </motion.a>
            ))}
          </div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mt-12">
            <p className="text-white/30 text-sm mb-3">Vols ser patrocinador del torneig?</p>
            <a href="mailto:info@cbgrupbarna.com" className="inline-flex items-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors px-5 py-2.5 rounded-xl font-semibold text-sm">
              Contacta amb nosaltres <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="border-t border-white/8 bg-slate-950 pt-10 pb-20 md:pb-10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="text-lg font-black font-mono text-red-500 tracking-widest mb-1">3×3 WESTFIELD GLÒRIES</div>
              <div className="text-xs text-white/30 mb-1">× GRUP BARNA · TIME CHAMBER · EIX CLOT</div>
              <div className="text-xs text-white/30 mb-4">6-7 Juny 2025 · Barcelona</div>
              <div className="flex items-center gap-2">
                {LOGOS.map(logo => (
                  <a key={logo.name} href={logo.url} target={logo.url !== "#" ? "_blank" : undefined} rel="noopener noreferrer" title={logo.name}>
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-white/20 flex items-center justify-center hover:border-red-400/50 transition-all">
                      <img src={logo.img} alt={logo.name} className="w-full h-full object-contain p-0.5"
                        style={logo.invert ? { filter: "invert(1)" } : {}} />
                    </div>
                  </a>
                ))}
                <a href="https://www.instagram.com/cbgrupbarna/" target="_blank" rel="noopener noreferrer"
                  className="text-white/30 hover:text-pink-400 transition-colors ml-1">
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/30 mb-3">Navegació</div>
              <div className="space-y-1.5">
                {[["#evento","El Torneig"],["#ubicacions","Ubicacions"],["#premis","Premis & Trofeus"],["#categories","Categories"],["#regles","Regles FIBA"],["#galeria","Galeria"],["#patrocinadors","Patrocinadors"]].map(([href, label]) => (
                  <a key={href} href={href} className="block text-sm text-white/40 hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/30 mb-3">Contacte</div>
              <div className="space-y-3 text-sm text-white/40">
                <div><a href="mailto:info@cbgrupbarna.com" className="text-red-400 hover:underline">info@cbgrupbarna.com</a></div>
                <div>
                  <a href="https://www.instagram.com/cbgrupbarna/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@cbgrupbarna</a>
                  <span className="mx-2 opacity-30">·</span>
                  <a href="https://www.instagram.com/timechamber_es/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">@timechamber_es</a>
                </div>
                <div>La Nau del Clot · Westfield Glòries · Rambleta del Clot</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/8 pt-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/20">
            <span>© 2025 CB Grup Barna · Time Chamber · Eix Clot. Tots els drets reservats.</span>
            <span>3×3 WESTFIELD GLÒRIES · <strong className="text-white/40">6-7 Juny 2025</strong></span>
          </div>
        </div>
      </footer>

      {/* ══ STICKY MOBILE CTA ══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur border-t border-white/10 p-3">
        <Link to="/inscripcion">
          <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider py-4 text-sm shadow-xl">
            🏀 Inscriu-te — des de 70€/equip
          </Button>
        </Link>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft, ChevronRight, Check, Users, User, Trophy,
  FileText, ArrowLeft, Loader2, Upload, Tag, CreditCard, ShoppingBag, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

/* ─── Config ─── */
const JOTFORM_API_KEY  = import.meta.env.VITE_JOTFORM_API_KEY  || "";
const JOTFORM_FORM_ID  = import.meta.env.VITE_JOTFORM_FORM_ID  || "250453975224358";
const JOTFORM_BASE_URL = import.meta.env.VITE_JOTFORM_BASE_URL || "https://eu-api.jotform.com";
const GOOGLE_WEBHOOK   = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK || "";

const TALLAS    = ["8-10","12-14","16","XS","S","M","L","XL","XXL"];
const CATS      = [
  "Senior A · Pro Masculí",
  "Senior A · Pro Femení",
  "Senior B · Amateur Masculí",
  "Senior B · Amateur Femení",
  "Veterans Masculí (+35)",
  "Veterans Femení (+35)",
  "EQUALS · Inclusiva",
  "U18 Junior Masculí",
  "U18 Junior Femení",
  "U16 Cadet Masculí",
  "U14 Infantil Masculí",
  "Prebenjamí / Benjamí / Aleví"
];
/* Preus inscripció. Senior A i B paguen una mica més (categoria principal). */
const PRECIO_GEN_4    = 75;   // General · 4 jugadors
const PRECIO_GEN_5    = 90;   // General · 5 jugadors
const PRECIO_SENIOR_4 = 85;   // Senior A/B · 4 jugadors
const PRECIO_SENIOR_5 = 105;  // Senior A/B · 5 jugadors

function isSeniorCat(cat: string | undefined): boolean {
  if (!cat) return false;
  return /^Senior\s*[AB]/i.test(cat);
}
function precioByCat(cat: string | undefined, mida: string): number {
  const senior = isSeniorCat(cat);
  if (mida === "5") return senior ? PRECIO_SENIOR_5 : PRECIO_GEN_5;
  return senior ? PRECIO_SENIOR_4 : PRECIO_GEN_4;
}
const COD_DESC  = "3X3AVIAT";
const IBAN      = "ES42 0182 1797 3902 0409 9747";

/* ─── Zod Schema ─── */
const jugSchema = z.object({
  nom: z.string().min(2),
  cognom: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  telefon: z.string().min(9).optional().or(z.literal("")),
  dataNaix: z.string().optional(),
  categoria: z.string().optional(),
  talla: z.string().min(1, "Selecciona talla"),
  club: z.string().optional(),
});

const schema = z.object({
  nomEquip: z.string().min(2),
  midaEquip: z.enum(["4","5"]),
  // Capità (jugador 1)
  capNom: z.string().min(2),
  capCognom: z.string().min(2),
  capEmail: z.string().email(),
  capTelefon: z.string().min(9),
  capDataNaix: z.string().min(1),
  capCategoria: z.string().min(1),
  capTalla: z.string().min(1),
  capClub: z.string().optional(),
  tutorNom: z.string().optional(),
  tutorCognom: z.string().optional(),
  tutorTelefon: z.string().optional(),
  // Jugadors 2-5
  jugadors: z.array(jugSchema),
  // Extras
  comentaris: z.string().optional(),
  codiDesc: z.string().optional(),
  // Legal
  acceptaBases: z.boolean().refine(v => v === true, "Obligatori"),
  acceptaLopd: z.boolean().refine(v => v === true, "Obligatori"),
  acceptaImatge: z.boolean().optional(),
});

type FD = z.infer<typeof schema>;

const STEPS = [
  { id:1, label:"Equip",    icon:<Trophy className="w-4 h-4"/> },
  { id:2, label:"Capità",   icon:<User className="w-4 h-4"/> },
  { id:3, label:"Jugadors", icon:<Users className="w-4 h-4"/> },
  { id:4, label:"Pagament", icon:<CreditCard className="w-4 h-4"/> },
  { id:5, label:"Bases",    icon:<FileText className="w-4 h-4"/> },
];

const slide = {
  hidden:  (d:number) => ({ opacity:0, x: d*40 }),
  visible: { opacity:1, x:0, transition:{ duration:0.35, ease:[0.22,1,0.36,1] } },
  exit:    (d:number) => ({ opacity:0, x: d*-40, transition:{ duration:0.25 } }),
};

function calcTotal(mida: string, capCategoria: string | undefined, desc5pct: boolean, descInvite10pct: boolean = false) {
  const base = precioByCat(capCategoria, mida);
  const desc5  = desc5pct        ? Math.round(base *  5) / 100 : 0;
  const desc10 = descInvite10pct ? Math.round(base * 10) / 100 : 0;
  const total = Math.max(0, base - desc5 - desc10);
  return { base, desc5, desc10, total };
}

/* ─── Textos de WhatsApp (variados para no parecer spam) ─── */
const SHARE_TEXTS = [
  "🏀 Ei! Munto equip pel 3×3 Westfield Glòries (6-7 Juny · Barcelona). 2.400€ Prize Money en 6 categories i punts FIBA. T'apuntes?",
  "🔥 Quintet o què? 3×3 al barri del Clot els 6-7 Juny. Premis, samarretes i festa. Necessito gent!",
  "Hey! Inscripcions obertes 3×3 Westfield Glòries 2026 · Barcelona. Em vens?",
  "🏆 3×3 Barcelona 6-7 Juny · 500€ al guanyador, FIBA points. Apunta't amb mi!",
  "T'agrada el bàsquet de carrer? Mira el 3×3 Westfield Glòries — l'edició 2026 promet:",
];
const SHARE_URL = "https://cbgrupbarna-3x3timechamber.com/";
const IG_URL = "https://www.instagram.com/cbgrupbarna/";

/* ─── Helpers UI ─── */
function FieldRow({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className="bg-white/8 border-white/15 focus:border-red-500 text-white placeholder:text-white/30 h-10 rounded-xl" />;
}

function STallaSelect({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="bg-white/8 border-white/15 focus:border-red-500 text-white h-10 rounded-xl">
        <SelectValue placeholder="Talla" />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/15">
        {TALLAS.map(t => <SelectItem key={t} value={t} className="text-white hover:bg-white/10">{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function SCatSelect({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="bg-white/8 border-white/15 focus:border-red-500 text-white h-10 rounded-xl">
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/15">
        {CATS.map(c => <SelectItem key={c} value={c} className="text-white hover:bg-white/10 text-xs">{c}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/* ─── Submit to JotForm ─── */
async function submitToJotForm(data: FD, descAplicat: boolean, descInvitacions: boolean, justificantNom: string) {
  const params = new URLSearchParams();

  // qid=38: nom equip
  params.append("submission[38]", data.nomEquip);
  // qid=3: capità nom complet
  params.append("submission[3][first]", data.capNom);
  params.append("submission[3][last]", data.capCognom);
  // qid=6: email
  params.append("submission[6]", data.capEmail);
  // qid=36: telèfon jugador 1
  params.append("submission[36][full]", data.capTelefon);
  // qid=37: data naix jugador 1
  if (data.capDataNaix) {
    const [y,m,d2] = data.capDataNaix.split("-");
    params.append("submission[37][month]", m);
    params.append("submission[37][day]", d2);
    params.append("submission[37][year]", y);
  }
  // qid=33: categoria jugador 1
  params.append("submission[33]", data.capCategoria || "");
  // qid=40: talla jugador 1
  params.append("submission[40]", data.capTalla);
  // qid=32: club jugador 1
  params.append("submission[32]", data.capClub || "");
  // qid=34: tutor nom
  if (data.tutorNom) {
    params.append("submission[34][first]", data.tutorNom);
    params.append("submission[34][last]", data.tutorCognom || "");
  }
  // qid=35: tutor telèfon
  if (data.tutorTelefon) params.append("submission[35][full]", data.tutorTelefon);

  // Jugadors 2,3,4 (,5 si escau)
  const jugQids = [
    { nameQid:"39", dataNaixQid:"52", catQid:"46", tallaQid:"43", clubQid:"47" },
    { nameQid:"41", dataNaixQid:"56", catQid:"51", tallaQid:"50", clubQid:"49" },
    { nameQid:"42", dataNaixQid:"59", catQid:"55", tallaQid:"54", clubQid:null },
  ];
  const numExtra = data.midaEquip === "5" ? 4 : 3;
  data.jugadors.slice(0, numExtra).forEach((j, idx) => {
    const q = jugQids[idx];
    if (!q) return;
    params.append(`submission[${q.nameQid}][first]`, j.nom);
    params.append(`submission[${q.nameQid}][last]`, j.cognom);
    if (j.dataNaix) {
      const [y,m,d2] = j.dataNaix.split("-");
      params.append(`submission[${q.dataNaixQid}][month]`, m);
      params.append(`submission[${q.dataNaixQid}][day]`, d2);
      params.append(`submission[${q.dataNaixQid}][year]`, y);
    }
    if (j.categoria) params.append(`submission[${q.catQid}]`, j.categoria);
    if (j.talla) params.append(`submission[${q.tallaQid}]`, j.talla);
    if (j.club && q.clubQid) params.append(`submission[${q.clubQid}]`, j.club);
  });

  // Comentaris + info addicional
  const extraInfo = [
    data.comentaris ? `Comentaris: ${data.comentaris}` : "",
    descAplicat ? "Descompte 3X3AVIAT aplicat (5%)" : "",
    descInvitacions ? "Descompte invitacions 5 amics + IG (10%)" : "",
    justificantNom ? `Justificant: ${justificantNom}` : "",
    data.midaEquip === "5" && data.jugadors[3] ? `Jugador 5: ${data.jugadors[3].nom} ${data.jugadors[3].cognom}` : "",
  ].filter(Boolean).join(" | ");
  if (extraInfo) params.append("submission[11]", extraInfo);

  const url = `${JOTFORM_BASE_URL}/form/${JOTFORM_FORM_ID}/submissions?apiKey=${JOTFORM_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  return res;
}

/* ═══════════════════════════════════════════
   COMPONENT PRINCIPAL
═══════════════════════════════════════════ */
export default function Inscripcion() {
  const [step, setStep]           = useState(1);
  const [dir, setDir]             = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending]     = useState(false);
  const [descAplicat, setDescAplicat] = useState(false);
  const [codError, setCodError]   = useState("");
  const [justFile, setJustFile]   = useState<File | null>(null);
  const [copied, setCopied]       = useState(false);
  // Gate viral: 5 shares + IG follow → 10% descompte
  const [gateState, setGateState] = useState<"active" | "unlocked" | "skipped">("active");
  const [sharedSlots, setSharedSlots] = useState<boolean[]>([false, false, false, false, false]);
  const [igFollowed, setIgFollowed]   = useState(false);
  const [descInvitacions, setDescInvitacions] = useState(false);
  // Queue simulator (Ticketmaster-style anti-bot + urgency)
  const [queueState, setQueueState] = useState<"queueing" | "passed">("queueing");
  const [queuePos, setQueuePos]     = useState(0);
  const [queueInitial, setQueueInitial] = useState(0);

  // Tick down queue position
  useEffect(() => {
    if (queueState !== "queueing") return;
    // Position aleatoria 8-20 al entrar (queue suau)
    const initial = 8 + Math.floor(Math.random() * 13);
    setQueueInitial(initial);
    setQueuePos(initial);
    let pos = initial;
    const interval = setInterval(() => {
      const decrement = 1 + Math.floor(Math.random() * 2); // -1 a -2 per tick
      pos = Math.max(0, pos - decrement);
      setQueuePos(pos);
      if (pos === 0) {
        clearInterval(interval);
        setTimeout(() => setQueueState("passed"), 700);
      }
    }, 550);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { register, handleSubmit, trigger, setValue, watch, control, formState:{ errors } } = useForm<FD>({
    resolver: zodResolver(schema),
    defaultValues: {
      midaEquip: undefined,
      jugadors: Array(4).fill({ nom:"", cognom:"", email:"", telefon:"", dataNaix:"", categoria:"", talla:"", club:"" }),
      acceptaBases: false,
      acceptaLopd: false,
      acceptaImatge: false,
    }
  });

  const { fields } = useFieldArray({ control, name:"jugadors" });

  const midaEquip    = watch("midaEquip");
  const codiInput    = watch("codiDesc") || "";
  const capDataNaix  = watch("capDataNaix");
  const numJugadors  = midaEquip === "5" ? 5 : 4;
  const isMinor      = capDataNaix ? (new Date().getFullYear() - new Date(capDataNaix).getFullYear() < 18) : false;
  const capCategoria = watch("capCategoria");
  const { base, desc5, desc10, total } = calcTotal(midaEquip || "4", capCategoria, descAplicat, descInvitacions);

  /* ─── Gate viral helpers ─── */
  const sharesDone = sharedSlots.filter(Boolean).length;
  const canUnlockGate = sharesDone >= 5 && igFollowed;
  const shareWith = (idx: number) => {
    const text = `${SHARE_TEXTS[idx % SHARE_TEXTS.length]} 👉 ${SHARE_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setSharedSlots(prev => prev.map((v, i) => i === idx ? true : v));
  };
  const followInstagram = () => {
    window.open(IG_URL, "_blank", "noopener,noreferrer");
    setIgFollowed(true);
  };
  const unlockGate = () => {
    if (!canUnlockGate) return;
    setDescInvitacions(true);
    setGateState("unlocked");
    toast({ title: "🎉 10% de descompte desbloquejat!", description: "Continua omplint el formulari." });
  };
  const skipGate = () => {
    setGateState("skipped");
  };

  const goNext = async () => {
    let ok = false;
    if (step === 1) ok = await trigger(["nomEquip","midaEquip"]);
    if (step === 2) {
      const fields2: (keyof FD)[] = ["capNom","capCognom","capEmail","capTelefon","capDataNaix","capCategoria","capTalla"];
      ok = await trigger(fields2);
    }
    if (step === 3) {
      const jugF = Array.from({ length: numJugadors - 1 }, (_, i) => [
        `jugadors.${i}.nom`, `jugadors.${i}.cognom`, `jugadors.${i}.talla`
      ]).flat() as Parameters<typeof trigger>[0];
      ok = await trigger(jugF);
    }
    if (step === 4) ok = true;
    if (ok) { setDir(1); setStep(s => s+1); }
  };
  const goBack = () => { setDir(-1); setStep(s => s-1); };

  const aplicarCodi = () => {
    const expiry = new Date("2025-06-15");
    if (codiInput.toUpperCase() === COD_DESC) {
      if (new Date() <= expiry) {
        setDescAplicat(true); setCodError("");
        toast({ title:"✅ Codi aplicat", description:"5% de descompte activat!" });
      } else {
        setCodError("El codi ha caducat (vàlid fins al 15 de juny)."); setDescAplicat(false);
      }
    } else {
      setCodError("Codi incorrecte."); setDescAplicat(false);
    }
  };

  const copyIban = () => {
    navigator.clipboard?.writeText(IBAN.replace(/\s/g,""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title:"IBAN copiat!" });
  };

  const onSubmit = async (data: FD) => {
    setSending(true);
    try {
      // Submit to Apps Script webhook (primary backend: Sheet + emails)
      // Replaced JotForm REST API to avoid exposing API key in public bundle.
      if (GOOGLE_WEBHOOK) {
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            total,
            descAplicat,
            descInvitacions,
            justificant: justFile?.name || "",
            data: new Date().toLocaleString("ca-ES"),
          }),
        });
      } else {
        throw new Error("Webhook no configurat");
      }
      setSubmitted(true);
    } catch (err) {
      toast({ title:"Error d'enviament", description:"Torna-ho a intentar o contacta per WhatsApp.", variant:"destructive" });
    } finally {
      setSending(false);
    }
  };

  /* ─── Queue simulator: 8-15s d'espera per percepció de demanda alta ─── */
  if (queueState === "queueing") {
    const progress = queueInitial > 0 ? Math.round(((queueInitial - queuePos) / queueInitial) * 100) : 0;
    const etaSeconds = Math.max(1, Math.ceil(queuePos * 0.22));
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Fondo radial sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 text-center shadow-2xl shadow-red-900/20"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-red-300">En cua</span>
          </div>

          {/* Spinner */}
          <Loader2 className="w-12 h-12 text-red-500 mx-auto mb-6 animate-spin" />

          {/* Counter */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Persones davant teu</p>
            <motion.p
              key={queuePos}
              initial={{ scale: 1.15, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="text-6xl md:text-7xl font-black font-mono text-white tabular-nums"
              style={{ textShadow: "0 0 40px rgba(220,38,38,0.4)" }}
            >
              {queuePos}
            </motion.p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-3 border border-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ boxShadow: "0 0 12px rgba(220,38,38,0.5)" }}
            />
          </div>
          <p className="text-xs text-white/40 mb-7 tabular-nums">
            {progress}% completat · temps estimat ~{etaSeconds}s
          </p>

          {/* Status text */}
          <p className="text-sm text-white/70 mb-2 font-medium">
            Comprovant disponibilitat de places...
          </p>
          <p className="text-xs text-white/40 mb-6 leading-relaxed">
            S'estan processant inscripcions en aquest moment. Et donarem accés en breus.
          </p>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl px-4 py-3 text-xs text-orange-200">
            ⚠️ <strong>No tanquis aquesta finestra</strong> — perdries la teva posició a la cua.
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Gate viral: 5 invitacions + IG follow → 10% off ─── */
  if (gateState === "active") {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Header */}
        <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">Tornar</span>
            </Link>
            <span className="text-sm font-black font-mono text-red-500 tracking-widest">3×3 WESTFIELD GLÒRIES</span>
            <div className="text-xs text-white/30 hidden sm:block">Pas 0 · Bonus</div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Hero */}
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
            <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/40 mb-4">
              <span className="text-orange-300 text-xs font-bold uppercase tracking-[0.2em]">🎁 Bonus Inscripció</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
              REBAIXA LA INSCRIPCIÓ <span className="text-orange-400">UN 10%</span>
            </h1>
            <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
              Convida <strong className="text-white">5 amics</strong> per WhatsApp i <strong className="text-white">segueix-nos a Instagram</strong> per estar al dia de tot el 3×3.
            </p>
          </motion.div>

          {/* Progress badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sharesDone >= 5 ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}>
              {sharesDone >= 5 ? "✓" : sharesDone} / 5 amics
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${igFollowed ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}>
              {igFollowed ? "✓" : "○"} Instagram
            </div>
          </div>

          {/* 5 share slots */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-6 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400"/> Convida 5 amics per WhatsApp
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[0,1,2,3,4].map(i => {
                const done = sharedSlots[i];
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => shareWith(i)}
                    className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      done
                        ? "bg-green-500/10 border-green-500/40 text-green-300"
                        : "bg-[#25D366]/8 border-[#25D366]/30 text-white hover:border-[#25D366]/60 hover:bg-[#25D366]/15 active:scale-[0.98]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-green-500/30" : "bg-[#25D366]"}`}>
                        {done ? <Check className="w-4 h-4 text-green-300"/> : (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        )}
                      </div>
                      <span className="text-sm font-semibold truncate">
                        {done ? `Amic ${i+1} convidat` : `Convidar amic ${i+1}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
              Cada botó obre WhatsApp amb un missatge diferent perquè no soni a spam. Tu tries a qui l'envies.
            </p>
          </div>

          {/* IG Follow */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-4">📲 Segueix-nos a Instagram</p>
            <button
              type="button"
              onClick={followInstagram}
              className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-bold transition-all border-2 ${
                igFollowed
                  ? "bg-green-500/10 border-green-500/40 text-green-300"
                  : "bg-gradient-to-r from-[#FF0069] via-[#D300C5] to-[#7638FA] border-transparent text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {igFollowed ? (
                <>
                  <Check className="w-5 h-5"/>
                  <span>Gràcies! Ja estàs al dia del 3×3</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  <span>Seguir @cbgrupbarna</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-white/30 mt-3 leading-relaxed">
              T'arribaran totes les notificacions del 3×3: sortejos, recordatoris, fotos, classificacions...
            </p>
          </div>

          {/* CTA principal */}
          <button
            type="button"
            onClick={unlockGate}
            disabled={!canUnlockGate}
            className={`w-full font-black uppercase tracking-wider py-4 rounded-xl transition-all text-base ${
              canUnlockGate
                ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/5 text-white/30 cursor-not-allowed border border-white/10"
            }`}
          >
            {canUnlockGate
              ? "🎉 Reclamar 10% i continuar"
              : `Et falten ${5 - sharesDone} amic${5 - sharesDone === 1 ? "" : "s"}${!igFollowed ? " + IG" : ""}`}
          </button>

          {/* Saltar */}
          <button
            type="button"
            onClick={skipGate}
            className="w-full text-center text-white/30 hover:text-white/60 text-xs mt-4 underline transition-colors"
          >
            Saltar i pagar preu complet (sense descompte)
          </button>
        </div>
      </div>
    );
  }

  /* ─── Pantalla d'èxit ─── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
        <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.5 }}
          className="max-w-lg w-full text-center">
          <div className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500 flex items-center justify-center mx-auto mb-8"
            style={{ boxShadow:"0 0 60px rgba(34,197,94,0.3)" }}>
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-4xl font-black mb-3" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            INSCRIPCIÓ<br /><span className="text-green-400">ENVIADA!</span>
          </h1>
          <p className="text-white/50 mb-8 leading-relaxed">
            Hem rebut la inscripció del teu equip al <strong className="text-white">3×3 Westfield Glòries</strong>. Comprova que la transferència s'hagi realitzat correctament.
          </p>
          {/* Dades pagament */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 text-left space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">Dades de la transferència</p>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">IBAN</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white">{IBAN}</span>
                <button onClick={copyIban} className="text-red-400 hover:text-red-300 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5"/> : <Copy className="w-3.5 h-3.5"/>}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">Concepte</span>
              <span className="text-sm font-semibold text-white">3x3 + {watch("nomEquip") || "NOM EQUIP"}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-1">
              <span className="text-white/40 text-sm">Import</span>
              <span className="text-2xl font-black text-red-400">{total.toFixed(2)}€</span>
            </div>
          </div>
          {justFile && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-green-300">
              ✅ Justificant adjuntat: <strong>{justFile.name}</strong>
            </div>
          )}

          {/* CTA: Comparteix la pàgina del teu equip (motor viral) */}
          {(() => {
            const equipParams = new URLSearchParams({
              nom: watch("nomEquip") || "",
              cap: `${watch("capNom") || ""} ${watch("capCognom") || ""}`.trim(),
              cat: watch("capCategoria") || "",
              club: watch("capClub") || "",
              jug: String(numJugadors),
            });
            const equipUrl = `/equip?${equipParams.toString()}`;
            return (
              <Link to={equipUrl} className="block">
                <div className="bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/40 rounded-2xl p-5 mb-5 text-left hover:scale-[1.02] active:scale-[0.99] transition-transform">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-300 mb-1">🔥 Pàgina del teu equip</p>
                  <p className="text-lg font-black text-white mb-1.5">{watch("nomEquip") || "El teu equip"} ja té web</p>
                  <p className="text-xs text-white/60">Comparteix-la amb la família, amics, ex-companys… que vinguin a animar-vos!</p>
                </div>
              </Link>
            );
          })()}

          <div className="flex flex-col sm:flex-row gap-3">
            <a href={`https://wa.me/34600000000?text=Hola!%20Acabo%20d'enviar%20la%20inscripci%C3%B3%20del%20meu%20equip%20al%203x3%20Westfield%20Gl%C3%B2ries.%20Podeu%20confirmar%20la%20recepci%C3%B3%3F`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider py-4 rounded-xl transition-all hover:scale-105">
              📱 WhatsApp
            </a>
            <Link to="/" className="flex-1">
              <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all h-auto">
                Tornar a l'inici
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Render principal ─── */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4"/><span className="text-sm font-medium">Tornar</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest">3×3 WESTFIELD GLÒRIES</span>
          <div className="text-xs text-white/30 hidden sm:block">Pas {step} de 5</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Títol */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="text-center mb-6">
          <span className="text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Formulari Oficial</span>
          <h1 className="text-2xl md:text-3xl font-black" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
            INSCRIPCIÓ D'EQUIP
          </h1>
          <p className="text-white/30 mt-1 text-sm">6 i 7 de Juny · Westfield Glòries</p>
        </motion.div>

        {/* Steps */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-sm ${
                  step > s.id ? "bg-red-600 border-red-600 text-white"
                  : step === s.id ? "border-red-500 text-red-400 bg-red-500/10"
                  : "border-white/15 text-white/20"}`}>
                  {step > s.id ? <Check className="w-4 h-4"/> : s.icon}
                </div>
                <span className={`text-[10px] mt-1 font-medium hidden sm:block ${step===s.id?"text-red-400":"text-white/20"}`}>{s.label}</span>
              </div>
              {i < STEPS.length-1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${step > s.id ? "bg-red-500" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-7 overflow-hidden shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait" custom={dir}>

              {/* ══ PAS 1: EQUIP ══ */}
              {step === 1 && (
                <motion.div key="s1" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-red-500"/> Nom i mida de l'equip
                  </h2>
                  <div className="space-y-5">
                    <FieldRow label="Nom de l'equip *" error={errors.nomEquip?.message}>
                      <SInput {...register("nomEquip")} placeholder="Ex: Barcelona Ballers" />
                    </FieldRow>
                    <div>
                      <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 block">Mida de l'equip *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["4","5"] as const).map(n => (
                          <button key={n} type="button"
                            onClick={() => { setValue("midaEquip", n); setValue("jugadors", Array(Number(n)).fill({nom:"",cognom:"",email:"",telefon:"",dataNaix:"",categoria:"",talla:"",club:""})); }}
                            className={`border-2 rounded-xl p-4 text-center transition-all ${midaEquip===n ? "border-red-500 bg-red-500/10" : "border-white/10 hover:border-white/25"}`}>
                            <div className="text-3xl font-black font-mono text-red-400">{n}</div>
                            <div className="text-sm font-bold text-white mt-0.5">jugadors</div>
                            <div className="text-xs text-red-400 font-bold mt-1">
                              {`${precioByCat(capCategoria, n)}€`}
                              {!capCategoria && <span className="text-white/40 font-normal"> · {n==="4" ? `${PRECIO_GEN_4}-${PRECIO_SENIOR_4}` : `${PRECIO_GEN_5}-${PRECIO_SENIOR_5}`}€</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                      {errors.midaEquip && <p className="text-red-400 text-xs mt-2">Selecciona la mida de l'equip</p>}
                    </div>
                    {/* Promo banner */}
                    <div className="bg-orange-500/10 border border-orange-500/25 rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-0.5">Codi promocional</p>
                        <p className="text-sm text-white">Usa <strong className="font-mono text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded">{COD_DESC}</strong> i obtén un <strong className="text-orange-400">5% de descompte</strong></p>
                        <p className="text-xs text-white/30 mt-0.5">Vàlid fins al 15 de juny de 2025</p>
                      </div>
                      <span className="text-2xl">🏷️</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ══ PAS 2: CAPITÀ ══ */}
              {step === 2 && (
                <motion.div key="s2" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-500"/> Capità / Responsable
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Nom *" error={errors.capNom?.message}>
                        <SInput {...register("capNom")} placeholder="Nom" />
                      </FieldRow>
                      <FieldRow label="Cognom *" error={errors.capCognom?.message}>
                        <SInput {...register("capCognom")} placeholder="Cognom" />
                      </FieldRow>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Email *" error={errors.capEmail?.message}>
                        <SInput {...register("capEmail")} type="email" placeholder="email@exemple.com" />
                      </FieldRow>
                      <FieldRow label="Telèfon *" error={errors.capTelefon?.message}>
                        <SInput {...register("capTelefon")} type="tel" placeholder="+34 600 000 000" />
                      </FieldRow>
                    </div>
                    <FieldRow label="Data de naixement *" error={errors.capDataNaix?.message}>
                      <SInput {...register("capDataNaix")} type="date" />
                    </FieldRow>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Categoria *" error={errors.capCategoria?.message}>
                        <Controller control={control} name="capCategoria" render={({ field }) => (
                          <SCatSelect value={field.value||""} onChange={field.onChange} />
                        )} />
                      </FieldRow>
                      <FieldRow label="Talla samarreta *" error={errors.capTalla?.message}>
                        <Controller control={control} name="capTalla" render={({ field }) => (
                          <STallaSelect value={field.value||""} onChange={field.onChange} />
                        )} />
                      </FieldRow>
                    </div>
                    <FieldRow label="Club actual (opcional)">
                      <SInput {...register("capClub")} placeholder="Club on jugues" />
                    </FieldRow>
                    {/* Tutor si menor */}
                    {isMinor && (
                      <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">👤 Jugador/a menor d'edat — cal tutor</p>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldRow label="Nom tutor *">
                            <SInput {...register("tutorNom")} placeholder="Nom" />
                          </FieldRow>
                          <FieldRow label="Cognom tutor *">
                            <SInput {...register("tutorCognom")} placeholder="Cognom" />
                          </FieldRow>
                        </div>
                        <FieldRow label="Telèfon tutor *">
                          <SInput {...register("tutorTelefon")} type="tel" placeholder="+34 600 000 000" />
                        </FieldRow>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ══ PAS 3: JUGADORS ══ */}
              {step === 3 && (
                <motion.div key="s3" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-black flex items-center gap-2">
                      <Users className="w-5 h-5 text-red-500"/> Resta de jugadors
                    </h2>
                    <span className="text-xs text-white/30 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                      {numJugadors - 1} jugadors més
                    </span>
                  </div>
                  <div className="space-y-5">
                    {fields.slice(0, numJugadors - 1).map((f, idx) => (
                      <div key={f.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <h3 className="font-bold text-sm text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-black">{idx+2}</span>
                          Jugador/a {idx+2}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldRow label="Nom *" error={(errors.jugadors?.[idx] as any)?.nom?.message}>
                            <SInput {...register(`jugadors.${idx}.nom`)} placeholder="Nom" />
                          </FieldRow>
                          <FieldRow label="Cognom *" error={(errors.jugadors?.[idx] as any)?.cognom?.message}>
                            <SInput {...register(`jugadors.${idx}.cognom`)} placeholder="Cognom" />
                          </FieldRow>
                          <FieldRow label="Data naix.">
                            <SInput {...register(`jugadors.${idx}.dataNaix`)} type="date" />
                          </FieldRow>
                          <FieldRow label="Telèfon">
                            <SInput {...register(`jugadors.${idx}.telefon`)} type="tel" placeholder="600 000 000" />
                          </FieldRow>
                          <FieldRow label="Categoria">
                            <Controller control={control} name={`jugadors.${idx}.categoria`} render={({ field }) => (
                              <SCatSelect value={field.value||""} onChange={field.onChange} />
                            )} />
                          </FieldRow>
                          <FieldRow label="Talla *" error={(errors.jugadors?.[idx] as any)?.talla?.message}>
                            <Controller control={control} name={`jugadors.${idx}.talla`} render={({ field }) => (
                              <STallaSelect value={field.value||""} onChange={field.onChange} />
                            )} />
                          </FieldRow>
                          <div className="col-span-2">
                            <FieldRow label="Club actual">
                              <SInput {...register(`jugadors.${idx}.club`)} placeholder="Club on jugues" />
                            </FieldRow>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ══ PAS 4: PAGAMENT ══ */}
              {step === 4 && (
                <motion.div key="s4" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-red-500"/> Pagament
                  </h2>
                  <div className="space-y-4">
                    {/* Total */}
                    <div className="bg-red-600 rounded-2xl p-5 text-center">
                      <p className="text-white/70 text-sm mb-1">Import total a transferir</p>
                      <p className="text-4xl font-black font-mono text-white">{total.toFixed(2)}€</p>
                      {descInvitacions && <p className="text-white/80 text-xs mt-1 font-semibold">🎁 -{desc10.toFixed(2)}€ descompte 10% (5 amics + IG)</p>}
                      {descAplicat && <p className="text-white/60 text-xs mt-1">(-{desc5.toFixed(2)}€ descompte {COD_DESC})</p>}
                    </div>
                    {/* Transferència */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400">Instruccions de transferència</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/40 uppercase tracking-wider">IBAN</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-xs bg-white/8 rounded-lg px-3 py-2 border border-white/10 flex-1">
                              {IBAN}
                            </span>
                            <button type="button" onClick={copyIban}
                              className="text-red-400 hover:text-red-300 transition-colors bg-white/5 rounded-lg p-2 border border-white/10">
                              {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/40 uppercase tracking-wider">Concepte</span>
                          <span className="font-semibold text-white bg-white/8 rounded-lg px-3 py-2 border border-white/10 text-sm">
                            3x3 + {watch("nomEquip") || "NOM EQUIP"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-white/30 border-t border-white/8 pt-3">
                        ⚠️ Posa el concepte correctament per poder identificar el pagament.
                      </p>
                    </div>
                    {/* Codi descompte */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-orange-400"/> Codi de descompte
                      </p>
                      <div className="flex gap-2">
                        <SInput {...register("codiDesc")} placeholder="Introdueix el codi (ex: 3X3AVIAT)"
                          onChange={e => { setValue("codiDesc", e.target.value.toUpperCase()); setCodError(""); setDescAplicat(false); }} />
                        <Button type="button" onClick={aplicarCodi} variant="outline"
                          className="border-orange-400/40 text-orange-400 hover:bg-orange-400/10 shrink-0 rounded-xl">
                          Aplicar
                        </Button>
                      </div>
                      {codError && <p className="text-red-400 text-xs mt-2">{codError}</p>}
                      {descAplicat && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><Check className="w-3 h-3"/> 5% de descompte aplicat!</p>}
                    </div>
                    {/* Upload justificant */}
                    <div
                      className="border-2 border-dashed border-white/15 rounded-xl p-5 text-center hover:border-red-500/50 hover:bg-red-500/5 transition-colors cursor-pointer"
                      onClick={() => fileRef.current?.click()}>
                      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if(f) setJustFile(f); }} />
                      {justFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <Check className="w-7 h-7 text-green-400"/>
                          <p className="font-semibold text-green-400 text-sm">{justFile.name}</p>
                          <p className="text-xs text-white/30">Fes clic per canviar</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-7 h-7 text-white/20"/>
                          <p className="font-semibold text-sm text-white/60">Adjunta el justificant de pagament</p>
                          <p className="text-xs text-white/30">JPG, PNG o PDF (opcional)</p>
                        </div>
                      )}
                    </div>
                    {/* Comentaris */}
                    <FieldRow label="Comentaris / Observacions (opcional)">
                      <textarea {...register("comentaris")}
                        placeholder="Jugador extra, necessitats especials, etc."
                        className="w-full bg-white/8 border border-white/15 focus:border-red-500 text-white placeholder:text-white/30 rounded-xl px-3 py-2.5 text-sm min-h-[70px] resize-none outline-none transition-colors" />
                    </FieldRow>
                  </div>
                </motion.div>
              )}

              {/* ══ PAS 5: BASES ══ */}
              {step === 5 && (
                <motion.div key="s5" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500"/> Bases i Confirmació
                  </h2>
                  {/* Resum */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">Resum de la inscripció</p>
                    {[
                      { l:"Equip", v: watch("nomEquip") || "—" },
                      { l:"Capità", v: `${watch("capNom")||""} ${watch("capCognom")||""}` },
                      { l:"Jugadors", v: `${numJugadors}` },
                      { l:"Email", v: watch("capEmail") || "—" },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex gap-2">
                        <span className="text-white/30 w-20 shrink-0">{l}:</span>
                        <strong className="text-white">{v}</strong>
                      </div>
                    ))}
                    {descInvitacions && <div className="flex gap-2"><span className="text-white/30 w-20 shrink-0">Descompte:</span><strong className="text-green-400">-10% (invitacions 5 amics + IG) 🎁</strong></div>}
                    {descAplicat && <div className="flex gap-2"><span className="text-white/30 w-20 shrink-0">Descompte:</span><strong className="text-orange-400">-5% ({COD_DESC})</strong></div>}
                    <div className="flex gap-2 border-t border-white/8 pt-2 mt-1">
                      <span className="text-white/30 w-20 shrink-0">TOTAL:</span>
                      <strong className="text-red-400 text-lg">{total.toFixed(2)}€</strong>
                    </div>
                  </div>
                  {/* Bases text */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-5 h-36 overflow-y-auto text-xs text-white/40 leading-relaxed space-y-2">
                    <p><strong className="text-white/60">BASES DE LA COMPETICIÓ – 3×3 WESTFIELD GLÒRIES 2025</strong></p>
                    <p>1. El torneig es celebra els dies 6 i 7 de juny de 2025 a Westfield Glòries, La Nau del Clot i la Rambleta del Clot (Barcelona).</p>
                    <p>2. La inscripció té un cost de <strong className="text-red-400">70€ (4 jugadors) o 90€ (5 jugadors)</strong> i inclou samarreta oficial. El pagament s'ha de realitzar per transferència bancària.</p>
                    <p>3. Les regles aplicades seran les oficials FIBA 3×3. Format: fase de grups + fase eliminatòria directa.</p>
                    <p>4. La categoria Senior Pro requereix llicència federativa en vigor.</p>
                    <p>5. Els organitzadors no es responsabilitzen de lesions produïdes durant el torneig.</p>
                    <p>6. La participació implica l'acceptació de les decisions dels àrbitres com a inapel·lables.</p>
                    <p>7. Els organitzadors es reserven el dret d'admissió i podran descalificar equips per comportament incorrecte.</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { id:"bases", name:"acceptaBases" as keyof FD, label:"He llegit i accepto les bases de la competició i el reglament. *", err: errors.acceptaBases },
                      { id:"lopd", name:"acceptaLopd" as keyof FD, label:"Accepto la política de privacitat i el tractament de dades (RGPD). *", err: errors.acceptaLopd },
                    ].map(({ id, name, label, err }) => (
                      <div key={id}>
                        <div className="flex items-start gap-3">
                          <Checkbox id={id} checked={!!watch(name)}
                            onCheckedChange={v => setValue(name, v === true as any)}
                            className="mt-0.5 border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                          <Label htmlFor={id} className="text-sm leading-relaxed cursor-pointer text-white/60">{label}</Label>
                        </div>
                        {err && <p className="text-red-400 text-xs ml-7 mt-1">{(err as any).message}</p>}
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      <Checkbox id="img" checked={!!watch("acceptaImatge")}
                        onCheckedChange={v => setValue("acceptaImatge", v === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                      <Label htmlFor="img" className="text-sm leading-relaxed cursor-pointer text-white/30">
                        Autoritzo l'ús de la meva imatge per a la difusió de l'event a xarxes socials. <span className="text-white/20">(opcional)</span>
                      </Label>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navegació */}
            <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/8">
              <Button type="button" variant="outline" onClick={goBack} disabled={step===1}
                className="border-white/10 text-white/30 hover:text-white disabled:opacity-20 gap-2 rounded-xl bg-transparent">
                <ChevronLeft className="w-4 h-4"/> Anterior
              </Button>
              {step < 5 ? (
                <Button type="button" onClick={goNext}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider gap-2 hover:scale-105 transition-transform px-8 rounded-xl shadow-lg"
                  style={{ boxShadow:"0 4px 20px rgba(220,38,38,0.35)" }}>
                  Següent <ChevronRight className="w-4 h-4"/>
                </Button>
              ) : (
                <Button type="submit" disabled={sending}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider gap-2 hover:scale-105 transition-transform px-8 disabled:opacity-50 disabled:scale-100 rounded-xl"
                  style={{ boxShadow:"0 4px 20px rgba(220,38,38,0.35)" }}>
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Enviant...</> : <><Check className="w-4 h-4"/> Enviar Inscripció</>}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-white/20">
          Dubtes? <a href="mailto:info@cbgrupbarna.com" className="text-red-400 hover:underline">info@cbgrupbarna.com</a> · <a href="https://www.instagram.com/cbgrupbarna/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">@cbgrupbarna</a>
        </div>
      </div>
    </div>
  );
}

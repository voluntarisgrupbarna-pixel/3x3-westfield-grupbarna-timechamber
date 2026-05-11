import { useState, useRef, useEffect, forwardRef, type ComponentProps } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  TALLAS, GENERES, PRECIO_GEN_4, PRECIO_GEN_5, PRECIO_SENIOR_4, PRECIO_SENIOR_5,
  COD_DESC, IBAN, BENEFICIARI,
  precioByCat, buildConcepte, buildTeamId, buildEpcQr, calcTotal,
  isEarlyBirdActive,
  schema, type FD,
} from "./Inscripcion.logic";
import {
  ChevronLeft, ChevronRight, Check, Users, User, Trophy,
  FileText, ArrowLeft, Loader2, Upload, Tag, CreditCard, ShoppingBag, Copy, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { tracker } from "@/lib/track";
import { CAT_NAMES } from "@/lib/categories";
import WhatsAppLeadForm from "@/components/WhatsAppLeadForm";
import SEO from "@/components/SEO";
import { TeamNameInput } from "@/components/TeamNameInput";
import { invalidateTeamNamesCache, verifyTeamRegistered } from "@/lib/teamNames";

/* ─── Config ─── */
const JOTFORM_API_KEY  = import.meta.env.VITE_JOTFORM_API_KEY  || "";
const JOTFORM_FORM_ID  = import.meta.env.VITE_JOTFORM_FORM_ID  || "250453975224358";
const JOTFORM_BASE_URL = import.meta.env.VITE_JOTFORM_BASE_URL || "https://eu-api.jotform.com";
const GOOGLE_WEBHOOK   = import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK || "";

/* Categories del torneig — font canònica a src/lib/categories.ts */
const CATS = CAT_NAMES;

/* URL del check-in que es comparteix dins el QR de l'equip.
   Quan es escaneja, obre /checkin?id=...&nom=...&cat=...&cap=...&pob=...&jug=...&tel=...&data=...
   La pàgina de checkin permet als responsables de torneig confirmar arribada + entrega samarretes. */
function buildCheckinUrl(data: {
  teamId: string; nomEquip: string; cap: string; cat: string;
  pob: string; jug: number; mida: string; tel: string; email: string; data: string;
  // Camps enriquits (afegits 2026-05-07) per facilitar la prep de samarretes a l'arribada.
  // `tallesJug`: talles concatenades de tot l'equip + extres, ex: "M-L-XL-S|XL-XL".
  tallesJug?: string;
  extras?: number;
  total?: number;
  pag?: "ok" | "pendent";
}): string {
  const SPA_BASE = (import.meta.env.VITE_SHARE_BASE as string | undefined)?.replace(/\/+$/, "")
    || "https://cbgrupbarna-3x3timechamber.com";
  const usp = new URLSearchParams({
    id: data.teamId,
    nom: data.nomEquip,
    cap: data.cap,
    cat: data.cat,
    pob: data.pob,
    jug: String(data.jug),
    mida: data.mida,
    tel: data.tel,
    email: data.email,
    data: data.data,
  });
  if (data.tallesJug) usp.set("talles", data.tallesJug);
  if (typeof data.extras === "number") usp.set("extras", String(data.extras));
  if (typeof data.total === "number") usp.set("total", data.total.toFixed(2));
  if (data.pag) usp.set("pag", data.pag);
  // Si la SPA_BASE és el worker, /checkin és part del worker també (no l'implementem allà,
  // sempre redirigim a la SPA real). Construim URL cap a la SPA real.
  const spa = (import.meta.env.VITE_SHARE_BASE as string | undefined)?.includes("workers.dev")
    ? "https://cbgrupbarna-3x3timechamber.com"
    : SPA_BASE;
  return `${spa}/checkin?${usp.toString()}`;
}

/* URL del Worker (Cloudflare) que genera els cartells PNG/SVG personalitzats. */
const CARTELL_WORKER_BASE = "https://og-3x3-glories.cbgrupbarna.workers.dev";

/* Construeix slug per al filename del cartell descarregat. */
function buildCartellFilename(nomEquip: string | undefined, format: "story" | "square" | "landscape"): string {
  const slug = String(nomEquip || "equip").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();
  return `cartell-${slug}-${format}.png`;
}

/* Descarrega el cartell de l'equip com a PNG.
   El worker retorna un SVG pure (sense imatges externes) → es renderitza al canvas
   i es converteix a PNG sense problemes CORS. Funciona amb qualsevol mida (story / square / landscape). */
async function downloadCartell(opts: { nomEquip: string; categoria: string; format: "story" | "square" | "landscape" }): Promise<void> {
  const usp = new URLSearchParams({
    nom: opts.nomEquip,
    cat: opts.categoria,
    format: opts.format,
  });
  const svgUrl = `${CARTELL_WORKER_BASE}/cartell.svg?${usp.toString()}`;
  // Mides per format
  const dims: Record<typeof opts.format, { w: number; h: number }> = {
    story: { w: 1080, h: 1920 },
    square: { w: 1080, h: 1080 },
    landscape: { w: 1200, h: 675 },
  };
  const { w, h } = dims[opts.format];

  // Fetch SVG → blob → object URL → <img> → canvas → PNG
  const resp = await fetch(svgUrl);
  if (!resp.ok) throw new Error("Error generant el cartell");
  const svgText = await resp.text();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("No s'ha pogut carregar el cartell"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no suportat");
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/png", 0.95));
    if (!blob) throw new Error("Error convertint a PNG");
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = buildCartellFilename(opts.nomEquip, opts.format);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* Codifica un File com a payload {name, mimeType, base64} per enviar al webhook (Apps Script
   el desa a Drive i en passa la URL al Fillout). Limita a 8 MB per estabilitat d'Apps Script. */
const MAX_JUSTIFICANT_BYTES = 8 * 1024 * 1024;
async function fileToBase64Payload(file: File): Promise<{ name: string; mimeType: string; base64: string }> {
  if (file.size > MAX_JUSTIFICANT_BYTES) {
    throw new Error(`Justificant massa gran (${(file.size/1024/1024).toFixed(1)} MB). Màxim 8 MB.`);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,<...>"
      const base64 = result.split(",")[1] || "";
      resolve({ name: file.name, mimeType: file.type || "application/octet-stream", base64 });
    };
    reader.onerror = () => reject(new Error("Error llegint el fitxer"));
    reader.readAsDataURL(file);
  });
}

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

/* ─── Persistència local (gate viral + form state) ─── */
const GATE_LS_KEY = "3x3_gate_state_v1";
const FORM_LS_KEY = "3x3_form_v1";
const LS_TTL_MS = 24 * 60 * 60 * 1000;
type PersistedGate = {
  sharedSlots: boolean[];
  igFollowed: boolean;
  igTimechamberFollowed: boolean;
  gateState: "active" | "unlocked" | "skipped";
  descInvitacions: boolean;
  ts: number;
};
function loadGateState(): PersistedGate | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(GATE_LS_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedGate;
    if (!p.ts || Date.now() - p.ts > LS_TTL_MS) return null;
    return p;
  } catch { return null; }
}
function saveGateState(p: Omit<PersistedGate, "ts">): void {
  try { localStorage.setItem(GATE_LS_KEY, JSON.stringify({ ...p, ts: Date.now() })); } catch {}
}
function loadFormState(): { data: any; ts: number } | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(FORM_LS_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.ts || Date.now() - p.ts > LS_TTL_MS) return null;
    return p;
  } catch { return null; }
}
function saveFormState(data: any): void {
  try { localStorage.setItem(FORM_LS_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}
function clearPersisted(): void {
  try { localStorage.removeItem(GATE_LS_KEY); localStorage.removeItem(FORM_LS_KEY); } catch {}
}

/* ─── Textos de WhatsApp (variados para no parecer spam) ─── */
const SHARE_TEXTS = [
  "🏀 Ei! Munto equip pel 3×3 Westfield Glòries (6-7 Juny · Barcelona). 2.000€ Prize Money (Sèniors M/F) i punts FIBA. T'apuntes?",
  "🔥 Quintet o què? 3×3 al barri del Clot els 6-7 Juny. Premis, samarretes i festa. Necessito gent!",
  "Hey! Inscripcions obertes 3×3 Westfield Glòries 2026 · Barcelona. Em vens?",
  "🏆 3×3 Barcelona 6-7 Juny · 1.000€ al guanyador Sèniors, FIBA points. Apunta't amb mi!",
  "T'agrada el bàsquet de carrer? Mira el 3×3 Westfield Glòries — l'edició 2026 promet:",
];
const SHARE_URL = "https://cbgrupbarna-3x3timechamber.com/";
const IG_URL = "https://www.instagram.com/cbgrupbarna/";
const IG_TIMECHAMBER_URL = "https://www.instagram.com/timechamber_es/";

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

// forwardRef perquè react-hook-form pugui registrar el DOM input via `register(...)`.
// Sense això la `ref` retornada per `register()` cau dins SInput i mai s'aplica
// al <input>, fent que rhf no detecti els canvis i la validació consideri el camp buit.
const SInput = forwardRef<HTMLInputElement, ComponentProps<typeof Input>>((props, ref) => (
  <Input
    ref={ref}
    {...props}
    className="bg-white/8 border-white/15 focus:border-red-500 text-white placeholder:text-white/30 h-10 rounded-xl"
  />
));
SInput.displayName = "SInput";

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

function SGenereSelect({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="bg-white/8 border-white/15 focus:border-red-500 text-white h-10 rounded-xl">
        <SelectValue placeholder="Gènere" />
      </SelectTrigger>
      <SelectContent className="bg-slate-900 border-white/15">
        {GENERES.map(g => <SelectItem key={g} value={g} className="text-white hover:bg-white/10 text-xs">{g}</SelectItem>)}
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
  const [teamId, setTeamId]       = useState<string>("");
  const [checkinUrl, setCheckinUrl] = useState<string>("");
  const [sending, setSending]     = useState(false);
  const [nameAvailable, setNameAvailable] = useState(true);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const qrCardRef = useRef<HTMLDivElement>(null);
  const [descAplicat, setDescAplicat] = useState(false);
  const [codError, setCodError]   = useState("");
  const [justFile, setJustFile]   = useState<File | null>(null);
  const [copied, setCopied]       = useState(false);
  // Gate viral: comparteix per WhatsApp + segueix @cbgrupbarna → 10% descompte.
  // Camí alternatiu (per qui no vol compartir): segueix @cbgrupbarna + @timechamber_es.
  // Lazy initializers: si tornem d'una pestanya WhatsApp/Instagram que el SO ha matat,
  // restaurem el progrés persistit en localStorage.
  // Durant la finestra early-bird (fins 2026-05-15 23:59) tothom té automàticament el 10%,
  // així que NO mostrem el gate viral: el saltem directament a "skipped".
  const earlyBird = isEarlyBirdActive();
  const [gateState, setGateState] = useState<"active" | "unlocked" | "skipped">(
    () => earlyBird ? "skipped" : (loadGateState()?.gateState ?? "active")
  );
  const [sharedSlots, setSharedSlots] = useState<boolean[]>(() => loadGateState()?.sharedSlots ?? [false, false, false, false, false]);
  const [igFollowed, setIgFollowed]   = useState(() => loadGateState()?.igFollowed ?? false);
  const [igTimechamberFollowed, setIgTimechamberFollowed] = useState(() => loadGateState()?.igTimechamberFollowed ?? false);
  // Lead capture WhatsApp post-submit
  const [waLeadOpen, setWaLeadOpen] = useState(false);
  const [descInvitacions, setDescInvitacions] = useState(() => loadGateState()?.descInvitacions ?? false);
  // Queue simulator (Ticketmaster-style anti-bot + urgency)
  const [queueState, setQueueState] = useState<"queueing" | "passed">("queueing");
  const [queuePos, setQueuePos]     = useState(0);
  const [queueInitial, setQueueInitial] = useState(0);

  // GA4: usuari entra a la pàgina d'inscripció
  useEffect(() => {
    tracker.inscripcioIniciada();
  }, []);

  // Persistim el progrés del gate cada vegada que canvia (defensa belt-and-braces:
  // els handlers ja escriuen a LS abans de window.open, però aquest effect cobreix
  // qualsevol setState que se'ns hagi escapat).
  useEffect(() => {
    saveGateState({ sharedSlots, igFollowed, igTimechamberFollowed, gateState, descInvitacions });
  }, [sharedSlots, igFollowed, igTimechamberFollowed, gateState, descInvitacions]);

  // Tick down queue position
  useEffect(() => {
    if (queueState !== "queueing") return;
    // Position aleatoria 8-20 al entrar (queue suau)
    const initial = 8 + Math.floor(Math.random() * 13);
    setQueueInitial(initial);
    setQueuePos(initial);
    const startTs = Date.now();
    let pos = initial;
    const interval = setInterval(() => {
      const decrement = 1 + Math.floor(Math.random() * 2); // -1 a -2 per tick
      pos = Math.max(0, pos - decrement);
      setQueuePos(pos);
      if (pos === 0) {
        clearInterval(interval);
        const waitedSec = (Date.now() - startTs) / 1000;
        tracker.queuePassada(waitedSec);
        setTimeout(() => setQueueState("passed"), 700);
      }
    }, 550);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { register, handleSubmit, trigger, setValue, watch, control, reset, formState:{ errors } } = useForm<FD>({
    resolver: zodResolver(schema),
    defaultValues: {
      nomEquip: "",
      midaEquip: undefined,
      capNom: "", capCognom: "", capEmail: "", capTelefon: "",
      capDataNaix: "", capCategoria: "", capGenere: "", capTalla: "",
      capClub: "", capPoblacio: "",
      tutorNom: "", tutorCognom: "", tutorTelefon: "",
      comentaris: "", codiDesc: "",
      jugadors: Array.from({ length: 3 }, () => ({ nom:"", cognom:"", email:"", telefon:"", dataNaix:"", categoria:"", talla:"", club:"" })),
      samarretesExtra: [],
      acceptaBases: false,
      acceptaLopd: false,
      acceptaImatge: false,
      acceptaCancellacio: false,
    }
  });

  const { fields } = useFieldArray({ control, name:"jugadors" });
  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({ control, name: "samarretesExtra" });

  // Restaurem el formulari des de localStorage al muntar (només una vegada).
  useEffect(() => {
    const saved = loadFormState();
    if (saved?.data && typeof saved.data === "object") {
      try { reset(saved.data, { keepDefaultValues: false }); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistim el formulari en LS cada vegada que canvia.
  useEffect(() => {
    const sub = watch((value) => { saveFormState(value); });
    return () => sub.unsubscribe();
  }, [watch]);

  const midaEquip    = watch("midaEquip");
  const codiInput    = watch("codiDesc") || "";
  const capDataNaix  = watch("capDataNaix");
  const numJugadors  = midaEquip === "5" ? 5 : 4;
  const isMinor      = capDataNaix ? (new Date().getFullYear() - new Date(capDataNaix).getFullYear() < 18) : false;
  const capCategoria = watch("capCategoria");
  const samarretesExtra = watch("samarretesExtra") || [];
  const numExtraShirts = samarretesExtra.length;
  const { base, desc5, desc10, extras, total, reason } = calcTotal(midaEquip || "4", capCategoria, descAplicat, descInvitacions, numExtraShirts, earlyBird);

  /* ─── Gate viral helpers ─── */
  // Dos camins per desbloquejar el descompte:
  //   A) Compartir per WhatsApp (≥1) + seguir @cbgrupbarna
  //   B) Seguir @cbgrupbarna + seguir @timechamber_es (per qui no vol compartir)
  // El botó de WhatsApp queda sempre visible al costat com a alternativa.
  const sharesDone = sharedSlots.filter(Boolean).length;
  const pathShareDone   = sharesDone >= 1 && igFollowed;
  const pathFollowsDone = igFollowed && igTimechamberFollowed;
  const canUnlockGate = pathShareDone || pathFollowsDone;
  // Persistim a localStorage ABANS d'obrir l'app externa: en mòbil el SO pot matar
  // la pestanya mentre l'usuari és a WhatsApp/Instagram, i sense aquest pre-write
  // el progrés in-memory es perdria en tornar.
  const shareWith = (idx: number) => {
    const text = `${SHARE_TEXTS[idx % SHARE_TEXTS.length]} 👉 ${SHARE_URL}`;
    const nextSlots = sharedSlots.map((v, i) => i === idx ? true : v);
    saveGateState({ sharedSlots: nextSlots, igFollowed, igTimechamberFollowed, gateState, descInvitacions });
    setSharedSlots(nextSlots);
    tracker.shareWhatsApp(idx);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };
  const followInstagram = () => {
    saveGateState({ sharedSlots, igFollowed: true, igTimechamberFollowed, gateState, descInvitacions });
    setIgFollowed(true);
    tracker.igFollowed();
    window.open(IG_URL, "_blank", "noopener,noreferrer");
  };
  const followTimechamber = () => {
    saveGateState({ sharedSlots, igFollowed, igTimechamberFollowed: true, gateState, descInvitacions });
    setIgTimechamberFollowed(true);
    tracker.igTimechamberFollowed();
    window.open(IG_TIMECHAMBER_URL, "_blank", "noopener,noreferrer");
  };
  const unlockGate = () => {
    if (!canUnlockGate) return;
    saveGateState({ sharedSlots, igFollowed, igTimechamberFollowed, gateState: "unlocked", descInvitacions: true });
    setDescInvitacions(true);
    setGateState("unlocked");
    tracker.gateViralPassat(sharesDone);
    toast({ title: "🎉 10% de descompte desbloquejat!", description: "Continua omplint el formulari." });
  };
  const skipGate = () => {
    saveGateState({ sharedSlots, igFollowed, igTimechamberFollowed, gateState: "skipped", descInvitacions: false });
    setGateState("skipped");
    setDescInvitacions(false);
    tracker.gateViralSkipped();
  };

  const goNext = async () => {
    let ok = false;
    if (step === 1) {
      ok = await trigger(["nomEquip","midaEquip"]);
      if (ok && !nameAvailable) {
        toast({
          title: "Nom d'equip ja registrat",
          description: "Tria un altre nom o fes servir un dels suggeriments.",
          variant: "destructive",
        });
        ok = false;
      }
    }
    if (step === 2) {
      const fields2: (keyof FD)[] = ["capNom","capCognom","capEmail","capTelefon","capDataNaix","capCategoria","capGenere","capTalla","capClub","capPoblacio"];
      ok = await trigger(fields2);
    }
    if (step === 3) {
      const jugF = Array.from({ length: numJugadors - 1 }, (_, i) => [
        `jugadors.${i}.nom`, `jugadors.${i}.cognom`, `jugadors.${i}.email`,
        `jugadors.${i}.talla`, `jugadors.${i}.dataNaix`, `jugadors.${i}.telefon`,
        `jugadors.${i}.club`, `jugadors.${i}.categoria`,
      ]).flat() as Parameters<typeof trigger>[0];
      ok = await trigger(jugF);
    }
    if (step === 4) {
      // Cada samarreta extra ha de tenir talla seleccionada.
      const extraF = extraFields.map((_, i) => `samarretesExtra.${i}.talla` as const);
      ok = extraF.length === 0 ? true : await trigger(extraF as unknown as Parameters<typeof trigger>[0]);
    }
    if (ok) {
      tracker.pasCompletat(step);
      setDir(1);
      setStep(s => s+1);
    }
  };
  const goBack = () => { setDir(-1); setStep(s => s-1); };

  const aplicarCodi = () => {
    const expiry = new Date("2026-06-15");
    if (codiInput.toUpperCase() === COD_DESC) {
      if (new Date() <= expiry) {
        setDescAplicat(true); setCodError("");
        toast({ title:"✅ Codi aplicat", description:"5% de descompte activat!" });
      } else {
        setDescAplicat(false);
        const msg = "El codi ha caducat (vàlid fins al 15 de juny).";
        setCodError(msg);
        toast({ title:"Codi caducat", description: msg, variant: "destructive" });
      }
    } else {
      setDescAplicat(false);
      const msg = "Codi incorrecte.";
      setCodError(msg);
      toast({ title: msg, description: "Comprova-ho i torna-ho a provar.", variant: "destructive" });
    }
  };

  const copyIban = () => {
    navigator.clipboard?.writeText(IBAN.replace(/\s/g,""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title:"IBAN copiat!" });
  };

  /* Genera un PNG 1080×1350 amb la targeta d'identificació (nom equip + categoria + club + QR)
     i el descarrega. Utilitza el patró existent d'altres descàrregues del fitxer:
     SVG (del QR) → Blob → <img> → Canvas → toBlob → <a> click. Sense dependències noves. */
  const downloadCheckinCard = async () => {
    if (downloadingCard) return;
    setDownloadingCard(true);
    try {
      const W = 1080, H = 1350;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no suportat");

      // Esperar que la font Rajdhani estigui carregada (si no, fallback a sans)
      try { await (document as any).fonts?.load?.("900 96px Rajdhani"); } catch {}

      // Fons gradient roig → taronja (mateix esperit que la targeta de pantalla)
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#dc2626");
      grad.addColorStop(1, "#ea580c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";

      // Etiqueta "EQUIP"
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "900 32px sans-serif";
      ctx.fillText("🎟️  EQUIP  🏀", W / 2, 110);

      // Nom de l'equip (gran, Rajdhani)
      const nomEqRaw = (watch("nomEquip") || "EQUIP");
      const nomEq = nomEqRaw.toUpperCase();
      ctx.fillStyle = "#fff";
      // Auto-shrink si nom molt llarg
      let fontSize = 110;
      ctx.font = `900 ${fontSize}px Rajdhani, sans-serif`;
      while (ctx.measureText(nomEq).width > W - 80 && fontSize > 50) {
        fontSize -= 6;
        ctx.font = `900 ${fontSize}px Rajdhani, sans-serif`;
      }
      ctx.fillText(nomEq, W / 2, 230);

      // Categoria · Club capità
      const cat = (watch("capCategoria") || "").trim();
      const club = (watch("capClub") || "").trim();
      const subline = [cat, club].filter(Boolean).join("  ·  ");
      if (subline) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = "700 36px sans-serif";
        ctx.fillText(subline, W / 2, 295);
      }

      // Targeta blanca per al QR (cantonades arrodonides)
      const qrBoxSize = 620;
      const qrX = (W - qrBoxSize) / 2;
      const qrY = 350;
      const r = 36;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(qrX + r, qrY);
      ctx.lineTo(qrX + qrBoxSize - r, qrY);
      ctx.quadraticCurveTo(qrX + qrBoxSize, qrY, qrX + qrBoxSize, qrY + r);
      ctx.lineTo(qrX + qrBoxSize, qrY + qrBoxSize - r);
      ctx.quadraticCurveTo(qrX + qrBoxSize, qrY + qrBoxSize, qrX + qrBoxSize - r, qrY + qrBoxSize);
      ctx.lineTo(qrX + r, qrY + qrBoxSize);
      ctx.quadraticCurveTo(qrX, qrY + qrBoxSize, qrX, qrY + qrBoxSize - r);
      ctx.lineTo(qrX, qrY + r);
      ctx.quadraticCurveTo(qrX, qrY, qrX + r, qrY);
      ctx.closePath();
      ctx.fill();

      // QR: serialitzar el <svg> del DOM → blob → <img> → drawImage
      const qrSvgEl = qrCardRef.current?.querySelector("svg");
      if (!qrSvgEl) throw new Error("QR no trobat al DOM");
      const svgString = new XMLSerializer().serializeToString(qrSvgEl);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Error carregant QR"));
          img.src = svgUrl;
        });
        const pad = 50;
        ctx.drawImage(img, qrX + pad, qrY + pad, qrBoxSize - pad * 2, qrBoxSize - pad * 2);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }

      // ID equip
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "700 28px monospace";
      ctx.fillText(`ID: ${teamId}`, W / 2, 1030);

      // Footer
      ctx.fillStyle = "#fff";
      ctx.font = "900 34px sans-serif";
      ctx.fillText("3×3 WESTFIELD GLÒRIES · 6-7 JUNY 2026", W / 2, 1110);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "600 28px sans-serif";
      ctx.fillText("Mostra aquest QR a l'arribada per fer", W / 2, 1170);
      ctx.fillText("check-in i recollir samarretes", W / 2, 1210);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 22px sans-serif";
      ctx.fillText("cbgrupbarna-3x3timechamber.com", W / 2, 1280);

      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/png", 0.95));
      if (!blob) throw new Error("Error generant PNG");
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      const slug = nomEqRaw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "equip";
      a.download = `3x3-targeta-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
      toast({ title: "Targeta descarregada!", description: "Ja la pots guardar al mòbil i ensenyar a l'arribada." });
    } catch (e) {
      console.error("Error generant targeta:", e);
      toast({ title: "Error", description: "No s'ha pogut generar la targeta. Fes captura del QR.", variant: "destructive" });
    } finally {
      setDownloadingCard(false);
    }
  };

  const onSubmit = async (data: FD) => {
    setSending(true);
    try {
      // Submit to Apps Script webhook (primary backend: Sheet + Fillout + emails)
      // Apps Script s'encarrega de pujar el justificant a Drive i passar la URL a Fillout.
      // Genera identificador únic d'equip (per QR de check-in)
      const newTeamId = buildTeamId(data.nomEquip);
      const submissionDate = new Date().toLocaleString("ca-ES");
      // Concatenem talles capità + jugadors + samarretes extra per al QR de check-in.
      // Format: "M-L-XL-S|XL-XL" → 4 jugadors (M, L, XL, S) + 2 extres (XL, XL).
      // L'staff a /checkin ho llegeix d'un cop d'ull per preparar les piles.
      const tallesJugList = [
        data.capTalla || "?",
        ...(data.jugadors || []).slice(0, (Number(data.midaEquip) || 4) - 1).map((j: any) => j?.talla || "?"),
      ].join("-");
      const tallesExtraList = (data.samarretesExtra || []).map((s: any) => s?.talla || "?").join("-");
      const tallesJug = tallesExtraList ? `${tallesJugList}|${tallesExtraList}` : tallesJugList;
      const newCheckinUrl = buildCheckinUrl({
        teamId: newTeamId,
        nomEquip: data.nomEquip,
        cap: `${data.capNom} ${data.capCognom}`.trim(),
        cat: data.capCategoria || "",
        pob: data.capPoblacio || "",
        jug: Number(data.midaEquip) || 4,
        mida: data.capTalla || "",
        tel: data.capTelefon || "",
        email: data.capEmail || "",
        data: submissionDate,
        tallesJug,
        extras: (data.samarretesExtra || []).length,
        total,
        pag: "pendent",
      });
      setTeamId(newTeamId);
      setCheckinUrl(newCheckinUrl);

      if (!GOOGLE_WEBHOOK) {
        throw new Error("Webhook no configurat");
      }
      // Codifica el fitxer com a base64 si n'hi ha
      let justificantPayload: null | { name: string; mimeType: string; base64: string } = null;
      if (justFile) {
        justificantPayload = await fileToBase64Payload(justFile);
      }
      // Apps Script Web App ("Anyone") respon amb Access-Control-Allow-Origin: *,
      // així que podem llegir la resposta JSON sense `mode: "no-cors"`.
      // Si ho posàvem amb no-cors, es silenciaven errors com `duplicate_team_name`
      // i l'usuari veia èxit amb la inscripció a NULL al backend (bug 2026-05-07).
      const abortCtrl = new AbortController();
      const abortTimer = setTimeout(() => abortCtrl.abort(), 50_000);
      const fetchBody = JSON.stringify({
        ...data,
        total,
        // Mútuament exclusius: si earlyBird, els altres dos van a false al backend.
        descAplicat: earlyBird ? false : descAplicat,
        descInvitacions: earlyBird ? false : descInvitacions,
        descEarlyBird: earlyBird,
        concepte: buildConcepte(data.nomEquip),
        teamId: newTeamId,
        checkinUrl: newCheckinUrl,
        justificant: justificantPayload,
        data: submissionDate,
      });
      let res: Response;
      try {
        res = await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
          body: fetchBody,
          signal: abortCtrl.signal,
        });
      } catch (fetchErr) {
        clearTimeout(abortTimer);
        // Timeout o error de xarxa: l'Apps Script pot haver processat la inscripció
        // igualment (escriu al Sheet/Fillout abans de respondre). Esperem 10s i comprovem.
        const lateVerified = await verifyTeamRegistered(data.nomEquip, 10_000);
        if (lateVerified) {
          setSubmitted(true);
          clearPersisted();
          tracker.inscripcioCompletada({ categoria: data.capCategoria, total, jugadors: Number(data.midaEquip) || 4, teamId: newTeamId });
          return;
        }
        throw fetchErr;
      }
      clearTimeout(abortTimer);

      let body: { ok?: boolean; error?: string; message?: string } = {};
      try {
        body = await res.json();
      } catch {
        // Si no podem parsar la resposta, considerem fallit per no donar fals èxit.
        throw new Error("La resposta del servidor no es pot llegir");
      }

      if (!res.ok || body.ok === false) {
        if (body.error === "duplicate_team_name") {
          toast({
            title: "Nom d'equip ja registrat",
            description: body.message || "Algú s'ha avançat amb aquest nom. Torna al pas 1 i tria'n un altre.",
            variant: "destructive",
          });
          invalidateTeamNamesCache();
          setNameAvailable(false);
          setDir(-1);
          setStep(1);
          throw new Error("duplicate_team_name");
        }
        throw new Error(body.error || body.message || `HTTP ${res.status}`);
      }

      // Verifiquem que l'equip queda registrat de veritat (evita falsos èxits).
      // Si en 5s no apareix a la llista, mostrem un avís però continuem perquè
      // pot ser només replicació lenta (Sheets sol trigar 1-3s, Fillout fins 4s).
      const verified = await verifyTeamRegistered(data.nomEquip, 5000);
      if (!verified) {
        toast({
          title: "Inscripció enviada",
          description: "El backend triga una mica a confirmar. Si en 5 minuts no reps email, escriu-nos per WhatsApp.",
        });
      }

      setSubmitted(true);
      invalidateTeamNamesCache();
      // Inscripció enviada amb èxit → netegem la persistència local perquè
      // si l'usuari obre el form de nou (un altre equip) comenci en blanc.
      clearPersisted();
      // Enviem també a JotForm (CRM secundari) en paral·lel, sense bloquejar l'èxit.
      // Si falla, ho registrem a la consola però no mostrem error a l'usuari.
      if (JOTFORM_API_KEY) {
        submitToJotForm(data, descAplicat, descInvitacions, justFile?.name || "").catch(
          (jfErr) => console.warn("[JotForm] Error enviant:", jfErr)
        );
      }
      tracker.inscripcioCompletada({
        categoria: data.capCategoria,
        total,
        jugadors: Number(data.midaEquip) || 4,
        teamId: newTeamId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      tracker.inscripcioError(msg);
      if (msg !== "duplicate_team_name") {
        toast({
          title:"Error d'enviament",
          description:`No hem pogut registrar la inscripció. Escriu-nos al WhatsApp (+34 698 425 153) indicant el concepte: ${buildConcepte(data.nomEquip)} i t'apuntem nosaltres.`,
          variant:"destructive",
          duration: 15000,
        });
      }
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
              Tries com desbloquejar-lo: <strong className="text-white">comparteix per WhatsApp</strong> i segueix <strong className="text-white">@cbgrupbarna</strong>, o si prefereixes no compartir, segueix també <strong className="text-white">@timechamber_es</strong>.
            </p>
          </motion.div>

          {/* Progress badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${sharesDone >= 1 ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}>
              {sharesDone >= 1 ? "✓ Compartit" : "○ WhatsApp"}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${igFollowed ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}>
              {igFollowed ? "✓" : "○"} @cbgrupbarna
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${igTimechamberFollowed ? "bg-green-500/20 text-green-400 border border-green-500/40" : "bg-white/5 text-white/60 border border-white/10"}`}>
              {igTimechamberFollowed ? "✓" : "○"} @timechamber_es
            </div>
          </div>

          {/* WhatsApp Share — un sol botó (l'usuari tria a qui envia o si ho fa a un grup) */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-6 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400"/> Comparteix amb amics per WhatsApp
            </p>
            <button
              type="button"
              onClick={() => shareWith(0)}
              className={`w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 font-bold transition-all ${
                sharesDone >= 1
                  ? "bg-green-500/10 border-green-500/40 text-green-300"
                  : "bg-[#25D366] border-[#25D366] text-white hover:bg-[#1da851] hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {sharesDone >= 1 ? (
                <>
                  <Check className="w-5 h-5"/>
                  <span>Compartit · Pots tornar a compartir si vols</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                  <span>Compartir per WhatsApp</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-white/40 mt-3 leading-relaxed text-center">
              S'obrirà WhatsApp amb un missatge llest. Pots <strong className="text-white/70">enviar-ho a un grup d'amics o a 5 contactes</strong>; un sol clic basta per desbloquejar el descompte.
            </p>
          </div>

          {/* IG Follow — @cbgrupbarna (sempre obligatori) */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-6 mb-4">
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
                  <span>Gràcies! Ja segueixes @cbgrupbarna</span>
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

          {/* IG Follow — @timechamber_es (alternativa al WhatsApp share) */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 md:p-6 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2">
              <span>📲 Alternativa sense compartir</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 text-[9px] font-bold tracking-widest">OPCIÓ B</span>
            </p>
            <p className="text-[11px] text-white/50 mb-3 leading-relaxed">
              No vols compartir per WhatsApp? Cap problema — segueix també <strong className="text-white">@timechamber_es</strong> i desbloquejaràs el descompte igualment.
            </p>
            <button
              type="button"
              onClick={followTimechamber}
              className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-bold transition-all border-2 ${
                igTimechamberFollowed
                  ? "bg-green-500/10 border-green-500/40 text-green-300"
                  : "bg-gradient-to-r from-[#FF0069] via-[#D300C5] to-[#7638FA] border-transparent text-white hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {igTimechamberFollowed ? (
                <>
                  <Check className="w-5 h-5"/>
                  <span>Gràcies! Ja segueixes @timechamber_es</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  <span>Seguir @timechamber_es</span>
                </>
              )}
            </button>
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
              : !igFollowed
                ? "Comença per seguir @cbgrupbarna"
                : sharesDone === 0 && !igTimechamberFollowed
                  ? "Comparteix per WhatsApp o segueix @timechamber_es"
                  : "Quasi! Acaba un dels dos camins per desbloquejar"}
          </button>

          {/* Saltar — opció clara i visible per qui no vol descompte (cap obligació de seguir/compartir) */}
          <button
            type="button"
            onClick={skipGate}
            className="w-full font-bold uppercase tracking-wider py-3.5 rounded-xl mt-4 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition-all text-sm"
          >
            No vull descompte — continuar al preu complet
          </button>
          <p className="text-[10px] text-white/30 text-center mt-2 leading-relaxed">
            Cap obligació de compartir ni seguir comptes. Pots inscriure't directament al preu complet.
          </p>
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
          {/* TARGETA D'IDENTIFICACIÓ (nom equip + categoria + club + QR) — LLEGIDA EL DIA DEL TORNEIG */}
          {checkinUrl && (
            <div ref={qrCardRef} className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-5 mb-3 text-white shadow-2xl shadow-red-900/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/80">🎟️ La teva targeta</span>
                <span className="text-[10px] uppercase tracking-wider font-mono bg-black/30 px-2 py-1 rounded">ID: {teamId}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
                {(watch("nomEquip") || "El teu equip").toUpperCase()}
              </h2>
              {(watch("capCategoria") || watch("capClub")) && (
                <p className="text-sm font-bold text-white/95 mb-3">
                  {[watch("capCategoria"), watch("capClub")].filter(Boolean).join("  ·  ")}
                </p>
              )}
              <div className="bg-white rounded-xl p-4 flex flex-col items-center">
                <QRCodeSVG value={checkinUrl} size={200} level="M" includeMargin={false} />
              </div>
              <p className="text-[11px] mt-3 leading-relaxed text-white/90">
                <strong>Guarda aquesta targeta.</strong> Ensenya-la a l'arribada per fer <strong>check-in</strong> i recollir les <strong>samarretes</strong>. També us l'enviem per email.
              </p>
              <button
                type="button"
                onClick={downloadCheckinCard}
                disabled={downloadingCard}
                className="mt-3 w-full bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/30 text-white font-black uppercase tracking-wider text-xs py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {downloadingCard ? (
                  <><Loader2 className="w-4 h-4 animate-spin"/> Generant…</>
                ) : (
                  <><Download className="w-4 h-4"/> Descarregar targeta (PNG)</>
                )}
              </button>
            </div>
          )}

          {/* CARTELL DEL MEU EQUIP — descarrega PNG personalitzat per IG/TikTok story + post */}
          <CartellSection nomEquip={watch("nomEquip") || ""} categoria={watch("capCategoria") || ""} />


          {/* QR pagament EPC — escaneig amb app del banc */}
          <div className="bg-white border border-white/10 rounded-2xl p-5 mb-3 flex flex-col items-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">💳 Pagar amb el banc · QR</p>
            <QRCodeSVG value={buildEpcQr(total, watch("nomEquip"))} size={160} level="M" includeMargin={false} />
            <p className="text-[10px] text-slate-500 mt-2 text-center max-w-[220px]">
              Obre l'app del banc → "Pagar amb QR" → confirma. Tot pre-omplert.
            </p>
          </div>
          {/* Dades pagament */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5 text-left space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3">Dades de la transferència</p>
            <div className="flex justify-between items-center">
              <span className="text-white/40 text-sm">Titular</span>
              <span className="text-sm font-semibold text-white">{BENEFICIARI}</span>
            </div>
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
              <span className="text-sm font-semibold text-white">{buildConcepte(watch("nomEquip"))}</span>
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
            <button type="button" onClick={() => setWaLeadOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider py-4 rounded-xl transition-all hover:scale-105">
              📱 WhatsApp
            </button>
            <Link to="/" className="flex-1">
              <Button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider py-4 rounded-xl hover:scale-105 transition-all h-auto">
                Tornar a l'inici
              </Button>
            </Link>
          </div>
        </motion.div>
        <WhatsAppLeadForm open={waLeadOpen} onClose={() => setWaLeadOpen(false)} source="post_inscripcio" />
      </div>
    );
  }

  /* ─── Render principal ─── */
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SEO
        title="Inscripció d'equips · 3×3 Westfield Glòries 2026"
        description="Inscriu el teu equip al torneig 3×3 FIBA Barcelona: Premini fins a Sèniors Pro · 2.400€ prize money · 6-7 juny 2026 al Clot-Glòries. Inscripcions obertes."
        path="/inscripcion"
      />
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
          <form
            onSubmit={handleSubmit(onSubmit, (formErrors) => {
              // Si la validació de react-hook-form falla, NO crida onSubmit i no mostra
              // cap missatge global — els errors només surten al costat dels camps. Si el
              // camp invàlid és en un step anterior (no visible), l'usuari clica i sembla
              // que el botó no faci res. Avisem amb toast i naveguem al pas problemàtic.
              const erroredFields = Object.keys(formErrors);
              if (erroredFields.length === 0) return;
              const fieldToStep: Record<string, number> = {
                nomEquip: 1, midaEquip: 1,
                capNom: 2, capCognom: 2, capEmail: 2, capTelefon: 2,
                capDataNaix: 2, capCategoria: 2, capTalla: 2, capPoblacio: 2,
                capClub: 2, tutorNom: 2, tutorCognom: 2, tutorTelefon: 2,
                jugadors: 3,
                samarretesExtra: 5,
                acceptaBases: 5, acceptaLopd: 5, acceptaImatge: 5, acceptaCancellacio: 5,
              };
              const targetStep = fieldToStep[erroredFields[0]] ?? step;
              toast({
                title: "Falten camps per omplir",
                description: `Revisa el pas ${targetStep}: ${erroredFields.join(", ")}`,
                variant: "destructive",
              });
              if (targetStep !== step) {
                setDir(targetStep < step ? -1 : 1);
                setStep(targetStep);
              }
            })}
            onKeyDown={(e) => {
              // Bloqueja submit implícit per Enter en steps intermedis: pitjar Enter
              // dins un <input> abans de l'últim step ha d'avançar com el botó "Següent",
              // no executar handleSubmit (que validaria steps buides i no faria res).
              if (
                e.key === "Enter" &&
                step < 5 &&
                (e.target as HTMLElement).tagName === "INPUT"
              ) {
                e.preventDefault();
                goNext();
              }
            }}
          >
            {/* mode="popLayout" treu del flow l'element que està sortint perquè el nou
                pugui muntar-se a la seva posició immediatament. Sense aquest mode (o amb
                "wait"), el motion.div del pas anterior bloquejava l'aparició del següent
                quan la transició s'interrompia. */}
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>

              {/* ══ PAS 1: EQUIP ══ */}
              {step === 1 && (
                <motion.div key="s1" custom={dir} variants={slide} initial="hidden" animate="visible" exit="exit">
                  <h2 className="text-lg font-black mb-5 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-red-500"/> Nom i mida de l'equip
                  </h2>
                  <div className="space-y-5">
                    <FieldRow label="Nom de l'equip *" error={errors.nomEquip?.message}>
                      <Controller
                        name="nomEquip"
                        control={control}
                        render={({ field }) => (
                          <TeamNameInput
                            name={field.name}
                            value={field.value || ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="Ex: Barcelona Ballers"
                            className="bg-white/8 border-white/15 focus:border-red-500 text-white placeholder:text-white/30 h-10 rounded-xl"
                            onAvailabilityChange={({ available }) => setNameAvailable(available)}
                          />
                        )}
                      />
                    </FieldRow>
                    <div>
                      <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 block">Mida de l'equip *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {(["4","5"] as const).map(n => (
                          <button key={n} type="button"
                            onClick={() => {
                              setValue("midaEquip", n);
                              // jugadors = N-1 entrades (el capità és el jug. #1).
                              // Abans creàvem N entrades, deixant l'última buida i fent
                              // que la validació final del schema fallés silenciosament
                              // a step 5 sense missatge visible.
                              const extras = Math.max(0, Number(n) - 1);
                              setValue("jugadors", Array.from({ length: extras }, () => ({
                                nom:"", cognom:"", email:"", telefon:"", dataNaix:"", categoria:"", talla:"", club:""
                              })));
                            }}
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
                      {errors.midaEquip && <p className="text-red-400 text-xs mt-2">{errors.midaEquip.message || "Selecciona la mida de l'equip"}</p>}
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
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Data de naixement *" error={errors.capDataNaix?.message}>
                        <SInput {...register("capDataNaix")} type="date" />
                      </FieldRow>
                      <FieldRow label="Població *" error={errors.capPoblacio?.message}>
                        <SInput {...register("capPoblacio")} placeholder="Sant Martí, Barcelona…" />
                      </FieldRow>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Categoria *" error={errors.capCategoria?.message}>
                        <Controller control={control} name="capCategoria" render={({ field }) => (
                          <SCatSelect value={field.value||""} onChange={field.onChange} />
                        )} />
                      </FieldRow>
                      <FieldRow label="Gènere de l'equip *" error={errors.capGenere?.message}>
                        <Controller control={control} name="capGenere" render={({ field }) => (
                          <SGenereSelect value={field.value||""} onChange={field.onChange} />
                        )} />
                      </FieldRow>
                    </div>
                    <FieldRow label="Talla samarreta *" error={errors.capTalla?.message}>
                      <Controller control={control} name="capTalla" render={({ field }) => (
                        <STallaSelect value={field.value||""} onChange={field.onChange} />
                      )} />
                    </FieldRow>
                    <FieldRow label="Club actual *" error={errors.capClub?.message}>
                      <SInput {...register("capClub")} placeholder="Club on jugues (o 'Sense club')" />
                    </FieldRow>
                    {/* Tutor si menor */}
                    {isMinor && (
                      <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">👤 Jugador/a menor d'edat — cal tutor</p>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldRow label="Nom tutor *" error={errors.tutorNom?.message}>
                            <SInput {...register("tutorNom")} placeholder="Nom" />
                          </FieldRow>
                          <FieldRow label="Cognom tutor *" error={errors.tutorCognom?.message}>
                            <SInput {...register("tutorCognom")} placeholder="Cognom" />
                          </FieldRow>
                        </div>
                        <FieldRow label="Telèfon tutor *" error={errors.tutorTelefon?.message}>
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
                          <FieldRow label="Data naix. *" error={(errors.jugadors?.[idx] as any)?.dataNaix?.message}>
                            <SInput {...register(`jugadors.${idx}.dataNaix`)} type="date" />
                          </FieldRow>
                          <FieldRow label="Email *" error={(errors.jugadors?.[idx] as any)?.email?.message}>
                            <SInput {...register(`jugadors.${idx}.email`)} type="email" placeholder="email@exemple.com" />
                          </FieldRow>
                          <FieldRow label="Telèfon *" error={(errors.jugadors?.[idx] as any)?.telefon?.message}>
                            <SInput {...register(`jugadors.${idx}.telefon`)} type="tel" placeholder="600 000 000" />
                          </FieldRow>
                          <FieldRow label="Categoria *" error={(errors.jugadors?.[idx] as any)?.categoria?.message}>
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
                            <FieldRow label="Club actual *" error={(errors.jugadors?.[idx] as any)?.club?.message}>
                              <SInput {...register(`jugadors.${idx}.club`)} placeholder="Club on jugues (o 'Sense club')" />
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
                      <div className="mt-2 space-y-0.5 text-xs">
                        <p className="text-white/70">Quota equip: {base.toFixed(2)}€</p>
                        {reason === "early-bird" && <p className="text-white/80 font-semibold">🔥 -{desc10.toFixed(2)}€ Early Bird (10%)</p>}
                        {reason === "viral" && <p className="text-white/80 font-semibold">🎁 -{desc10.toFixed(2)}€ descompte 10% (5 amics + IG)</p>}
                        {reason === "code5" && <p className="text-white/70">(-{desc5.toFixed(2)}€ descompte {COD_DESC})</p>}
                        {numExtraShirts > 0 && (
                          <p className="text-white/80 font-semibold">+{extras.toFixed(2)}€ — {numExtraShirts} samarreta{numExtraShirts === 1 ? "" : "es"} addicional{numExtraShirts === 1 ? "" : "s"}</p>
                        )}
                      </div>
                    </div>

                    {/* Samarretes addicionals (+25€/u) */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2">
                          <ShoppingBag className="w-3.5 h-3.5"/> Samarretes addicionals
                        </p>
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">+25€/unitat</span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">
                        A part de la samarreta inclosa per jugador, pots demanar-ne d'extra (acompanyants, familiars, recanvi). Cada una a 25€ amb la talla que vulguis.
                      </p>
                      {extraFields.length > 0 && (
                        <div className="space-y-2">
                          {extraFields.map((field, idx) => (
                            <div key={field.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
                              <span className="text-xs text-white/50 w-6 text-center font-mono">#{idx + 1}</span>
                              <Controller
                                control={control}
                                name={`samarretesExtra.${idx}.talla` as const}
                                render={({ field: f }) => (
                                  <div className="flex-1">
                                    <STallaSelect value={f.value || ""} onChange={f.onChange} />
                                  </div>
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeExtra(idx)}
                                className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/20"
                                aria-label={`Eliminar samarreta extra ${idx + 1}`}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => appendExtra({ talla: "" })}
                        className="w-full text-sm font-bold uppercase tracking-wider py-2.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 border border-orange-500/30 hover:border-orange-500/50 transition-all"
                      >
                        + Afegir samarreta (+25€)
                      </button>
                      {extraFields.length > 0 && (
                        <p className="text-[10px] text-white/40 text-center">
                          Total extres: <strong className="text-orange-300">{extras.toFixed(2)}€</strong> · Talla obligatòria per a cada una.
                        </p>
                      )}
                    </div>
                    {/* QR EPC per pagar amb app del banc */}
                    <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                      <QRCodeSVG value={buildEpcQr(total, watch("nomEquip"))} size={120} level="M" includeMargin={false} />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">Pagar amb QR</p>
                        <p className="text-xs text-slate-600 leading-snug">Obre l'app del banc, escaneja el QR i tot quedarà pre-omplert (compte, import i concepte).</p>
                      </div>
                    </div>
                    {/* Transferència */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400">Instruccions de transferència</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-white/40 uppercase tracking-wider">Titular</span>
                          <span className="font-semibold text-white bg-white/8 rounded-lg px-3 py-2 border border-white/10 text-sm">
                            {BENEFICIARI}
                          </span>
                        </div>
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
                            {buildConcepte(watch("nomEquip"))}
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
                      {reason === "code5" && <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><Check className="w-3 h-3"/> 5% de descompte aplicat!</p>}
                      {earlyBird && <p className="text-orange-300 text-xs mt-2 flex items-center gap-1">🔥 Ja tens el 10% Early Bird aplicat — no acumulable amb cap codi.</p>}
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
                    {numExtraShirts > 0 && (
                      <div className="flex gap-2">
                        <span className="text-white/30 w-20 shrink-0">Extres:</span>
                        <strong className="text-orange-300">{numExtraShirts} samarreta{numExtraShirts === 1 ? "" : "es"} (+{extras.toFixed(2)}€)</strong>
                      </div>
                    )}
                    {reason === "early-bird" && <div className="flex gap-2"><span className="text-white/30 w-20 shrink-0">Descompte:</span><strong className="text-orange-400">-10% Early Bird 🔥</strong></div>}
                    {reason === "viral" && <div className="flex gap-2"><span className="text-white/30 w-20 shrink-0">Descompte:</span><strong className="text-green-400">-10% (invitacions 5 amics + IG) 🎁</strong></div>}
                    {reason === "code5" && <div className="flex gap-2"><span className="text-white/30 w-20 shrink-0">Descompte:</span><strong className="text-orange-400">-5% ({COD_DESC})</strong></div>}
                    <div className="flex gap-2 border-t border-white/8 pt-2 mt-1">
                      <span className="text-white/30 w-20 shrink-0">TOTAL:</span>
                      <strong className="text-red-400 text-lg">{total.toFixed(2)}€</strong>
                    </div>
                  </div>
                  {/* Bases del torneig */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-5 h-48 overflow-y-auto text-xs text-white/45 leading-relaxed space-y-2">
                    <p><strong className="text-white/70">BASES DE LA COMPETICIÓ — 3×3 WESTFIELD GLÒRIES 2026</strong></p>
                    <p>1. El torneig es celebra els dies 6 i 7 de juny de 2026 a 3 seus del barri del Clot-Glòries: Westfield Glòries, La Nau del Clot i la Rambleta del Clot (Barcelona).</p>
                    <p>2. La inscripció té un cost de <strong className="text-red-400">75€ a 105€</strong> per equip segons categoria i nombre de jugadors (4-5). Inclou samarreta oficial, dorsal i accés als 2 dies. Samarretes addicionals opcionals a 25€ cadascuna. El pagament s'ha de realitzar per transferència bancària a nom de <strong className="text-white/70">{BENEFICIARI}</strong>, IBAN <strong className="text-white/70">{IBAN}</strong>, amb concepte <strong className="text-white/70">3X3+NOM_EQUIP</strong>; cal adjuntar el justificant (JPG/PNG/PDF) dins el formulari per validar la inscripció.</p>
                    <p>3. Premis en metàl·lic: <strong className="text-white/70">1.000€ Sèniors Masculí</strong> i <strong className="text-white/70">1.000€ Sèniors Femení</strong>. La resta de categories (Veterans M/F i formatives) reben trofeus i medalles. Sèniors atorga punts FIBA 3×3 oficials.</p>
                    <p>4. Les regles aplicades seran les oficials FIBA 3×3. Format: fase de grups + fase eliminatòria directa.</p>
                    <p className="text-orange-300/80">5. <strong>Cancel·lació i devolucions:</strong> una vegada confirmada la inscripció <strong>no és cancel·lable</strong> i no es retornarà cap import. Si un jugador es lesiona o no pot venir, l'equip continua jugant amb la resta i el jugador afectat conserva la samarreta com a única compensació; <strong>no es retorna ni es prorrateja l'import</strong>.</p>
                    <p>6. Els organitzadors (Timechamber S.L. i C.B. Grup Barna) no es responsabilitzen de lesions produïdes durant el torneig.</p>
                    <p>7. La participació implica l'acceptació de les decisions dels àrbitres com a inapel·lables.</p>
                    <p>8. Els organitzadors es reserven el dret d'admissió i podran descalificar equips per comportament incorrecte.</p>
                    <p>9. Els menors d'edat necessiten l'autorització del pare/mare/tutor legal (apartat següent).</p>
                  </div>

                  {/* Apartat legal · Pares/Tutors (heretat del JotForm Campus Time Chamber) */}
                  <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-300 flex items-center gap-2">
                      <span>📑</span> Apartat legal · Pares / Mares / Tutors
                    </p>
                    <div className="text-xs text-white/65 leading-relaxed space-y-3">
                      <p>
                        Com a tutor/a legal, consento i autoritzo la captació i publicació d'imatges meves i/o del meu fill/a o tutelat/da per part de <strong>Timechamber S.L. i C.B. Grup Barna</strong>, amb finalitats comercials, promocionals o altres, sempre respectant la dignitat i la integritat de la persona captada. Així mateix, declaro que he llegit i accepto la <strong>política de privacitat</strong>, el <strong>tractament de dades</strong>, l'<strong>autorització mèdica</strong> i la <strong>normativa interna</strong> de Timechamber Experience.
                      </p>
                      <p>
                        En completar aquest formulari, declares que has llegit la <strong>informació legal de Timechamber Experience</strong> relativa a la política de privacitat, el tractament de dades, les finalitats, la base legal, la conservació de dades, les persones destinatàries, els drets, les actualitzacions, l'autorització mèdica i la normativa interna.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {[
                      { id:"bases", name:"acceptaBases" as keyof FD, label:"He llegit i accepto les bases de la competició i el reglament del 3×3 Westfield Glòries 2026. *", err: errors.acceptaBases },
                      { id:"lopd",  name:"acceptaLopd"  as keyof FD, label:"Com a pare, mare o tutor/a legal, declaro que he llegit i accepto l'apartat legal de Timechamber Experience (privacitat, tractament de dades, autorització mèdica, normativa interna i drets d'imatge). *", err: errors.acceptaLopd },
                    ].map(({ id, name, label, err }) => (
                      <div key={id}>
                        <div className="flex items-start gap-3">
                          <Checkbox id={id} checked={!!watch(name)}
                            onCheckedChange={v => setValue(name, v === true as any)}
                            className="mt-0.5 border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                          <Label htmlFor={id} className="text-sm leading-relaxed cursor-pointer text-white/70">{label}</Label>
                        </div>
                        {err && <p className="text-red-400 text-xs ml-7 mt-1">{(err as any).message}</p>}
                      </div>
                    ))}
                    <div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="img" checked={!!watch("acceptaImatge")}
                          onCheckedChange={v => setValue("acceptaImatge", v === true as any)}
                          className="mt-0.5 border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                        <Label htmlFor="img" className="text-sm leading-relaxed cursor-pointer text-white/70">
                          Autoritzo expressament la captació i publicació d'imatges meves i/o del meu fill/a per part de Timechamber S.L. i C.B. Grup Barna a xarxes socials i mitjans del torneig. *
                        </Label>
                      </div>
                      {errors.acceptaImatge && <p className="text-red-400 text-xs ml-7 mt-1">{(errors.acceptaImatge as any).message}</p>}
                    </div>
                    <div>
                      <div className="flex items-start gap-3">
                        <Checkbox id="cancel" checked={!!watch("acceptaCancellacio")}
                          onCheckedChange={v => setValue("acceptaCancellacio", v === true as any)}
                          className="mt-0.5 border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600" />
                        <Label htmlFor="cancel" className="text-sm leading-relaxed cursor-pointer text-white/70">
                          Entenc que la inscripció <strong className="text-white">no és cancel·lable</strong> un cop confirmada i que en cas de lesió o baixa d'un jugador <strong className="text-white">no es retorna ni es prorrateja cap import</strong>; el jugador conserva la samarreta com a única compensació. *
                        </Label>
                      </div>
                      {errors.acceptaCancellacio && <p className="text-red-400 text-xs ml-7 mt-1">{(errors.acceptaCancellacio as any).message}</p>}
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
                <Button type="submit" disabled={sending || !nameAvailable}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider gap-2 hover:scale-105 transition-transform px-8 disabled:opacity-50 disabled:scale-100 rounded-xl"
                  style={{ boxShadow:"0 4px 20px rgba(220,38,38,0.35)" }}>
                  {sending ? <><Loader2 className="w-4 h-4 animate-spin"/> Enviant...</> : <><Check className="w-4 h-4"/> Enviar Inscripció</>}
                </Button>
              )}
            </div>
          </form>

          {/* Ajuda directa per WhatsApp — visible a tots els steps del formulari.
              Obre wa.me amb missatge pre-omplert; no interromp el flux amb modals. */}
          <a
            href={`https://wa.me/34698425153?text=${encodeURIComponent(`Hola! Tinc dubtes sobre la inscripció al 3×3 Westfield Glòries (Pas ${step} de 5).`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-2.5 w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 hover:border-[#25D366]/70 text-[#25D366] font-semibold rounded-xl py-3 px-4 text-sm transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            Necessites ajuda? Escriu-nos per WhatsApp
          </a>
        </div>

        <div className="text-center mt-6 text-xs text-white/20">
          Dubtes? <a href="mailto:voluntaris@grupbarna.info" className="text-red-400 hover:underline">voluntaris@grupbarna.info</a> · <a href="https://www.instagram.com/cbgrupbarna/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">@cbgrupbarna</a>
        </div>
      </div>
    </div>
  );
}

/* ─── Component: secció de descàrrega del cartell personalitzat (UGC viral) ─── */
function CartellSection({ nomEquip, categoria }: { nomEquip: string; categoria: string }) {
  const [downloading, setDownloading] = useState<null | "story" | "square" | "landscape">(null);
  const [error, setError] = useState<string>("");

  const handleDownload = async (format: "story" | "square" | "landscape") => {
    setDownloading(format);
    setError("");
    try {
      await downloadCartell({ nomEquip, categoria, format });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconegut");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/40 rounded-2xl p-5 mb-3">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">📲</span>
        <div className="flex-1">
          <p className="text-sm font-black uppercase tracking-wider text-orange-300 mb-1">Cartell del teu equip</p>
          <p className="text-xs text-white/70 leading-relaxed">
            Descarrega el cartell amb el nom del teu equip. Penja'l a IG, TikTok o WhatsApp story per compartir que ja jugueu.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleDownload("story")}
          disabled={downloading !== null}
          className="bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed border border-white/15 rounded-xl py-3 px-3 text-left transition-colors"
        >
          <div className="text-lg mb-0.5">📱</div>
          <p className="text-xs font-bold text-white">{downloading === "story" ? "Generant..." : "IG/TikTok Story"}</p>
          <p className="text-[10px] text-white/40">1080×1920 vertical</p>
        </button>
        <button
          type="button"
          onClick={() => handleDownload("square")}
          disabled={downloading !== null}
          className="bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed border border-white/15 rounded-xl py-3 px-3 text-left transition-colors"
        >
          <div className="text-lg mb-0.5">🟪</div>
          <p className="text-xs font-bold text-white">{downloading === "square" ? "Generant..." : "IG Post"}</p>
          <p className="text-[10px] text-white/40">1080×1080 quadrat</p>
        </button>
        <button
          type="button"
          onClick={() => handleDownload("landscape")}
          disabled={downloading !== null}
          className="bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed border border-white/15 rounded-xl py-3 px-3 text-left transition-colors"
        >
          <div className="text-lg mb-0.5">🖥️</div>
          <p className="text-xs font-bold text-white">{downloading === "landscape" ? "Generant..." : "Twitter/X"}</p>
          <p className="text-[10px] text-white/40">1200×675 horitzontal</p>
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">⚠️ {error}</p>}
    </div>
  );
}

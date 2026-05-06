import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { MapPin, Bus, Footprints, Car, Loader2, AlertTriangle, X } from "lucide-react";
import { scaleIn, staggerContainer, staggerItem } from "@/lib/motion";

// Variant local (el `fadeUp` de Home.tsx no està exportat, el dupliquem aquí).
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Tipus i utils ─── */

type GeoStatus = "idle" | "asking" | "ok" | "denied" | "unavailable" | "timeout";
type UserPos = { lat: number; lng: number };

// Coordenades del Westfield Glòries — destí fix de totes les rutes
const GLORIES_COORDS = { lat: 41.4034, lng: 2.1896 };
const GLORIES_QUERY = "Westfield+Glòries+Av+Diagonal+208+Barcelona";

/** Distància haversine en km entre dos punts. */
function haversineKm(a: UserPos, b: UserPos): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Estimació molt aproximada (no és routing real, és per donar context al CTA). */
function estimateMinutes(km: number, mode: "transit" | "walking" | "driving"): number {
  // Caminant 12 min/km · cotxe 3 min/km en ciutat · transit ≈ 2× caminant
  const perKm = mode === "walking" ? 12 : mode === "driving" ? 3 : 8;
  return Math.max(1, Math.round(km * perKm + (mode === "transit" ? 6 : 0)));
}

function buildMapsUrl(mode: "transit" | "walking" | "driving", origin?: UserPos): string {
  const base = "https://www.google.com/maps/dir/?api=1";
  const params = new URLSearchParams();
  params.set("destination", GLORIES_QUERY);
  params.set("travelmode", mode);
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `${base}&${params.toString()}`;
}

/* ─── Component principal ─── */

type Props = {
  /** Callback quan es detecta la posició — perquè el mapa pugui fer fitBounds */
  onLocate?: (pos: UserPos) => void;
};

export function UserLocationPanel({ onLocate }: Props) {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [userPos, setUserPos] = useState<UserPos | null>(null);

  const requestLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const u = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(u);
        setStatus("ok");
        onLocate?.(u);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else if (err.code === err.TIMEOUT) setStatus("timeout");
        else setStatus("unavailable");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const dismissError = () => setStatus("idle");

  // Distància estimada
  const km = userPos ? haversineKm(userPos, GLORIES_COORDS) : null;

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="mt-4"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.button
            key="idle"
            type="button"
            onClick={requestLocation}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 px-5 py-4 text-white font-bold uppercase tracking-wider shadow-lg shadow-red-900/30 transition-colors"
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
            <span className="relative flex items-center justify-center gap-2.5 text-sm">
              <MapPin className="w-4 h-4" />
              On et trobes? Mostra'm com arribar
            </span>
            <span className="relative block text-[10px] font-medium normal-case tracking-normal text-white/70 mt-1">
              (no es guarda enlloc · només per calcular la ruta)
            </span>
          </motion.button>
        )}

        {status === "asking" && (
          <motion.div
            key="asking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-white/80 text-sm"
          >
            <Loader2 className="w-4 h-4 animate-spin text-red-400" />
            Demanant permís al teu navegador…
          </motion.div>
        )}

        {status === "ok" && userPos && (
          <motion.div
            key="ok"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <motion.p
              variants={staggerItem}
              className="text-xs text-emerald-300/80 font-semibold flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Et veig al mapa · {km !== null ? `${km.toFixed(1)} km de Glòries` : "ruta calculada"}
            </motion.p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CtaCard
                href={buildMapsUrl("transit", userPos)}
                icon={Bus}
                label="Transport públic"
                eta={km !== null ? `≈ ${estimateMinutes(km, "transit")} min` : undefined}
                color="emerald"
              />
              <CtaCard
                href={buildMapsUrl("walking", userPos)}
                icon={Footprints}
                label="Caminant"
                eta={km !== null ? `≈ ${estimateMinutes(km, "walking")} min` : undefined}
                color="amber"
              />
              <CtaCard
                href={buildMapsUrl("driving", userPos)}
                icon={Car}
                label="Cotxe"
                eta={km !== null ? `≈ ${estimateMinutes(km, "driving")} min · pàrquing 2h GRATIS` : "Pàrquing 2h GRATIS"}
                color="orange"
              />
            </div>
          </motion.div>
        )}

        {status === "denied" && (
          <ErrorBlock
            key="denied"
            tone="warning"
            title="Sense permís de ubicació"
            body="Pots fer servir aquests enllaços generals — Google Maps farà servir la teva ubicació actual:"
            onDismiss={dismissError}
            ctas
          />
        )}

        {(status === "unavailable" || status === "timeout") && (
          <ErrorBlock
            key={status}
            tone="neutral"
            title={status === "timeout" ? "S'ha esgotat el temps" : "Geolocalització no disponible"}
            body="Aquí tens enllaços directes per calcular la ruta a Westfield Glòries:"
            onDismiss={dismissError}
            ctas
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Sub-components ─── */

type CtaProps = {
  href: string;
  icon: typeof Bus;
  label: string;
  eta?: string;
  color: "emerald" | "amber" | "orange";
};

function CtaCard({ href, icon: Icon, label, eta, color }: CtaProps) {
  const palette = {
    emerald: { bg: "from-emerald-500/15 to-emerald-700/5", border: "border-emerald-400/30 hover:border-emerald-400/60", text: "text-emerald-300" },
    amber:   { bg: "from-amber-500/15 to-amber-700/5",     border: "border-amber-400/30 hover:border-amber-400/60",   text: "text-amber-300" },
    orange:  { bg: "from-orange-500/15 to-red-600/5",      border: "border-orange-400/40 hover:border-orange-400/70", text: "text-orange-300" },
  }[color];

  return (
    <motion.a
      variants={scaleIn}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-center gap-3 rounded-xl bg-gradient-to-br ${palette.bg} border ${palette.border} px-3 py-3 transition-colors`}
    >
      <div className={`w-9 h-9 rounded-lg bg-slate-950/40 border border-white/10 flex items-center justify-center ${palette.text} shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/90">{label}</p>
        {eta && <p className="text-[10px] text-white/55 mt-0.5 truncate">{eta}</p>}
      </div>
      <span className={`text-xs ${palette.text} opacity-0 group-hover:opacity-100 transition-opacity`}>→</span>
    </motion.a>
  );
}

function ErrorBlock({
  tone,
  title,
  body,
  ctas,
  onDismiss,
}: {
  tone: "warning" | "neutral";
  title: string;
  body: string;
  ctas?: boolean;
  onDismiss: () => void;
}) {
  const colors =
    tone === "warning"
      ? "from-orange-500/15 to-red-600/5 border-orange-400/40"
      : "from-slate-700/30 to-slate-800/10 border-white/15";
  const iconColor = tone === "warning" ? "text-orange-300" : "text-white/60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`relative rounded-2xl bg-gradient-to-br ${colors} border px-4 py-3.5`}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tancar avís"
        className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-start gap-2.5 mb-3 pr-6">
        <AlertTriangle className={`w-4 h-4 ${iconColor} mt-0.5 shrink-0`} />
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/60 mt-0.5">{body}</p>
        </div>
      </div>
      {ctas && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <CtaCard href={buildMapsUrl("transit")} icon={Bus} label="Transport públic" color="emerald" />
          <CtaCard href={buildMapsUrl("walking")} icon={Footprints} label="Caminant" color="amber" />
          <CtaCard href={buildMapsUrl("driving")} icon={Car} label="Cotxe · 2h GRATIS" color="orange" />
        </div>
      )}
    </motion.div>
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

import { SEUS, type Seu } from "@/lib/seus";
import { VenueMarkers, AntPolyline } from "./VenueMarkers";
import { UserLocationPanel } from "./UserLocationPanel";
import "./circuit-map.css";

/* ─── Constants ─── */

// Centre i zoom per defecte: centroide aproximat de les 3 seus + zoom suficient
// per veure-les totes alhora.
const MAP_CENTER: L.LatLngExpression = [41.4068, 2.1898];
const MAP_ZOOM = 15.5;

// Slugs canonical perquè l'ordre de l'autoplay no depengui de l'ordre del SEUS array.
const ORDER_AUTOPLAY: Array<Seu["slug"]> = [
  "westfield-glories", // 1. Comença per la seu principal + missatge pàrquing
  "nau-del-clot",      // 2. Camina ~7 min al pavelló del CB Grup Barna
  "rambleta-del-clot", // 3. I després al cole Rambleta del Clot (cobert)
];

/**
 * Waypoints intermedis manuals dels segments — perquè el polyline AntPath
 * no vagi en línia recta sobre edificis sinó que segueixi (aproximadament)
 * carrers reals: Av. Diagonal, C/ Llacuna, C/ d'Aragó.
 *
 * Ajustar visualment al `npm run dev` si cal.
 */
const ROUTE_WG_TO_NC: L.LatLngExpression[] = [
  [41.4034, 2.1896], // Westfield Glòries (centre)
  [41.4047, 2.1908], // creuament Diagonal–Llacuna aprox
  [41.4055, 2.1918], // Llacuna direcció pavelló
  [41.4063, 2.1921], // La Nau del Clot
];
const ROUTE_NC_TO_RC: L.LatLngExpression[] = [
  [41.4063, 2.1921], // La Nau del Clot
  [41.4078, 2.1916], // C/ Llacuna direcció Aragó
  [41.4095, 2.1908], // C/ Aragó
  [41.410612, 2.190090], // Escola Rambleta del Clot
];

/* ─── Helpers ─── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ─── Sub-component: marker de l'usuari ─── */

function UserMarker({ pos }: { pos: { lat: number; lng: number } }) {
  const icon = L.divIcon({
    className: "circuit-marker",
    html: `
      <div class="relative" role="img" aria-label="La teva ubicació">
        <span class="circuit-user-ring absolute inset-0 rounded-full" style="background:#3b82f6"></span>
        <div class="relative w-9 h-9 rounded-full flex items-center justify-center bg-blue-500 border-2 border-white shadow-lg shadow-blue-500/50">
          <span style="width:10px;height:10px;border-radius:999px;background:white;display:block"></span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
  return <Marker position={[pos.lat, pos.lng]} icon={icon} />;
}

/** Petit hook per fer flyTo a la seu activa quan canvia. */
function FlyToActive({ activeSeu }: { activeSeu: Seu | null }) {
  const map = useMap();
  useEffect(() => {
    if (!activeSeu) return;
    if (reducedMotion()) {
      map.setView([activeSeu.coords.lat, activeSeu.coords.lng], 16);
    } else {
      map.flyTo([activeSeu.coords.lat, activeSeu.coords.lng], 16, {
        duration: 0.9,
        easeLinearity: 0.25,
      });
    }
  }, [activeSeu, map]);
  return null;
}

/** Hook per fer fitBounds quan apareix la posició de l'usuari. */
function FitBoundsOnUser({
  userPos,
  venues,
}: {
  userPos: { lat: number; lng: number } | null;
  venues: Seu[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!userPos) return;
    const bounds = L.latLngBounds([
      [userPos.lat, userPos.lng],
      ...venues.map((s): [number, number] => [s.coords.lat, s.coords.lng]),
    ]);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: !reducedMotion() });
  }, [userPos, venues, map]);
  return null;
}

/* ─── Main component ─── */

type Props = {
  /** Index de la seu activa, controlat per la columna esquerra de Home. */
  activeIndex: number;
  /** Callback quan el visitant clica un marcador del mapa. */
  onActiveChange: (index: number) => void;
};

export default function CircuitMap({ activeIndex, onActiveChange }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Storytelling state machine. El component està lazy-loaded amb React.lazy()
  // i només es munta quan l'usuari fa scroll a la secció UBICACIONS — per tant
  // és segur engegar l'autoplay directament al mount sense gate `useInView`.
  const [step, setStep] = useState<0 | 1 | 2 | 3>(reducedMotion() ? 3 : 0);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [parkingDismissedMobile, setParkingDismissedMobile] = useState(false);

  // Autoplay seqüencial. Functional setState (`s >= n ? s : n`) perquè un click
  // manual a "Fase 3" no torni a baixar el step mentre els timers van corrent.
  useEffect(() => {
    if (reducedMotion()) return;
    const t1 = setTimeout(() => setStep((s) => (s >= 1 ? s : 1)), 200);
    const t2 = setTimeout(() => setStep((s) => (s >= 2 ? s : 2)), 1400);
    const t3 = setTimeout(() => setStep((s) => (s >= 3 ? s : 3)), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const activeSeu = SEUS[activeIndex] ?? null;

  // Mapeo slug → index per als step buttons (perquè l'ordre canòdig de SEUS no és el d'autoplay)
  const stepSlugToIndex = (slug: string) => SEUS.findIndex((s) => s.slug === slug);

  return (
    <motion.div
      ref={sectionRef}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="circuit-map-container"
    >
      {/* ── Mapa ── */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-red-950/20">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          minZoom={14}
          maxZoom={18}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={true}
          tap={true}
          style={{ height: 420, width: "100%" }}
          className="h-[360px] sm:h-[420px]"
          aria-label="Mapa interactiu del circuit de 3 seus del torneig 3x3 al barri del Clot-Glòries"
        >
          {/* Capa 1: tiles foscos sense etiquetes */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {/* Capa 2: només etiquetes — per sobre dels polylines perquè es llegeixin */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            pane="overlayPane"
          />

          {/* Polylines animats (apareixen per fases) */}
          {step >= 2 && (
            <AntPolyline positions={ROUTE_WG_TO_NC} color="#F97316" />
          )}
          {step >= 3 && (
            <AntPolyline positions={ROUTE_NC_TO_RC} color="#EAB308" />
          )}

          {/* Markers de venues — només els que toca segons step */}
          <VenueMarkers
            seus={SEUS.filter((s) => {
              if (step >= 3) return true;
              if (step >= 2) return s.slug !== "rambleta-del-clot";
              if (step >= 1) return s.slug === "westfield-glories";
              return false;
            })}
            activeIndex={activeIndex}
            onSelect={onActiveChange}
          />

          {userPos && <UserMarker pos={userPos} />}

          <FlyToActive activeSeu={activeSeu} />
          <FitBoundsOnUser userPos={userPos} venues={SEUS} />
        </MapContainer>

        {/* ── Tira inferior amb el missatge del pàrquing (visible mòbil + escriptori) ── */}
        {!parkingDismissedMobile && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-md border border-orange-400/40 rounded-xl px-3 py-2.5 shadow-2xl shadow-orange-900/30 pointer-events-auto z-[400]"
          >
            <span className="text-2xl shrink-0">🅿️</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-xs font-black text-orange-200 uppercase tracking-wider leading-tight">
                2h GRATIS al pàrquing Westfield
              </p>
              <p className="text-[10px] text-white/55 leading-tight mt-0.5">
                Vine en cotxe i camina fins a les altres seus
              </p>
            </div>
            <button
              type="button"
              onClick={() => setParkingDismissedMobile(true)}
              aria-label="Tancar avís pàrquing"
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 shrink-0"
            >
              ×
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Step buttons (replay manual) ── */}
      <div
        role="tablist"
        aria-label="Fases del circuit"
        className="mt-4 flex flex-col sm:flex-row gap-2"
      >
        {ORDER_AUTOPLAY.map((slug, i) => {
          const seu = SEUS.find((s) => s.slug === slug)!;
          const isActiveStep = step >= i + 1;
          const isActiveSeu = activeIndex === stepSlugToIndex(slug);
          return (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={isActiveSeu}
              onClick={() => {
                onActiveChange(stepSlugToIndex(slug));
                // Si encara no s'ha completat l'autoplay, força a aquest step
                if (step < (i + 1) as 0 | 1 | 2 | 3) setStep((i + 1) as 1 | 2 | 3);
              }}
              className={`flex-1 group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-300 border ${
                isActiveSeu
                  ? "bg-white/10 border-white/30 shadow-lg"
                  : isActiveStep
                  ? "bg-white/5 border-white/15 hover:bg-white/8 hover:border-white/25"
                  : "bg-white/3 border-white/8 opacity-60 hover:opacity-100"
              }`}
              style={isActiveSeu ? { boxShadow: `0 0 24px ${seu.color}33` } : undefined}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{
                  background: `${seu.color}22`,
                  border: `1px solid ${seu.color}55`,
                }}
              >
                {seu.emoji}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: seu.color }}>
                  Fase {i + 1}
                </p>
                <p className="text-xs font-semibold text-white truncate">{seu.nom}</p>
              </div>
              {seu.parkingHighlight && (
                <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-400/40 px-1.5 py-0.5 rounded">
                  2h FREE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Panell de geolocalització ── */}
      <UserLocationPanel onLocate={setUserPos} />
    </motion.div>
  );
}

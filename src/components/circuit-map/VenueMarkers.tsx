import { useEffect, useRef } from "react";
import { Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { AntPath, type AntPathOptions } from "leaflet-ant-path";
import type { Seu } from "@/lib/seus";

/* ─── Markers ─── */

/**
 * Genera un divIcon HTML estilitzat per a una seu.
 * Ús de string template + classes Tailwind perquè és el que millor s'integra
 * amb la nostra estètica "Dark Court · Neon Lights".
 */
function buildIcon(seu: Seu, isActive: boolean): L.DivIcon {
  const ringHtml = isActive
    ? `<span class="absolute inset-0 rounded-full animate-ping" style="background:${seu.color};opacity:.35"></span>`
    : "";

  const parkingBadgeHtml = seu.parkingHighlight
    ? `<div class="circuit-parking-badge absolute -top-2 -right-3 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider z-10 shadow-lg">2h GRATIS</div>`
    : "";

  const indoorPill = seu.indoor
    ? `<span class="text-emerald-300/90 font-semibold">· COBERT</span>`
    : "";

  const scale = isActive ? "scale(1.12)" : "scale(1)";
  const ringStyle = isActive
    ? `box-shadow: 0 0 24px ${seu.color}cc, 0 0 8px ${seu.color}ff inset;`
    : `box-shadow: 0 0 14px ${seu.color}66;`;

  return L.divIcon({
    className: "circuit-marker",
    html: `
      <div class="relative" style="transform:${scale};transition:transform 250ms cubic-bezier(.4,0,.2,1)" role="button" tabindex="0" aria-label="${seu.nom} · ${seu.tipus}${seu.indoor ? " · pavelló cobert" : ""}">
        ${ringHtml}
        <div class="relative w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 backdrop-blur"
             style="background:${seu.color}33;border-color:${seu.color};${ringStyle}">
          ${seu.emoji}
        </div>
        ${parkingBadgeHtml}
        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 bg-slate-950/90 border border-white/15 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-md">
          ${seu.id} ${indoorPill}
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

type VenueMarkersProps = {
  seus: Seu[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function VenueMarkers({ seus, activeIndex, onSelect }: VenueMarkersProps) {
  return (
    <>
      {seus.map((seu, i) => (
        <Marker
          key={seu.id}
          position={[seu.coords.lat, seu.coords.lng]}
          icon={buildIcon(seu, i === activeIndex)}
          eventHandlers={{ click: () => onSelect(i) }}
        />
      ))}
    </>
  );
}

/* ─── Animated AntPath polyline ─── */

type AntPolylineProps = {
  positions: L.LatLngExpression[];
  color: string;
  paused?: boolean;
};

/**
 * Wrapper imperatiu sobre `leaflet-ant-path`.
 * react-leaflet no té wrapper oficial, així que afegim/treiem el polyline
 * directament a la instància de Leaflet via useMap().
 */
export function AntPolyline({ positions, color, paused = false }: AntPolylineProps) {
  const map = useMap();
  const ref = useRef<AntPath | null>(null);

  // Detectar prefers-reduced-motion en mount
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const opts: AntPathOptions = {
      color,
      pulseColor: "#ffffff",
      weight: 4,
      delay: reducedMotion ? 99999 : 800, // efectivament estàtic en reduced-motion
      dashArray: [12, 24],
      opacity: 0.85,
      paused,
      hardwareAccelerated: true,
    };
    const p = new AntPath(positions, opts);
    p.addTo(map);
    ref.current = p;
    return () => {
      p.remove();
      ref.current = null;
    };
    // Re-crear si canvien posicions, color o reducedMotion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(positions), color]);

  // Pausa/reactiva sense recrear
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    if (paused && p.pause) p.pause();
    else if (!paused && p.resume) p.resume();
  }, [paused]);

  return null;
}

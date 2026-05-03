/**
 * GA4 conversion tracking helpers.
 * El gtag global està injectat per <script> a index.html (mesura `G-R6XYR7G1WF`).
 * Aquesta utilitat es limita a comprovar que `gtag` existeix i envia esdeveniments.
 *
 * Tots els events usen prefixe específic del torneig per evitar col·lisions:
 *   - inscripcio_*  → flow d'inscripció
 *   - viral_*       → motors virals (gate, share)
 *   - equip_*       → pàgines /equip i /checkin
 *   - cta_*         → clics estratègics
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

type GAParams = Record<string, string | number | boolean | undefined>;

export function track(eventName: string, params: GAParams = {}): void {
  try {
    // Filtra valors undefined per no embrutar GA
    const clean: GAParams = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") clean[k] = v;
    });
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, clean);
    } else if (typeof window !== "undefined") {
      // Fallback al dataLayer per si gtag encara no s'ha carregat
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, ...clean });
    }
  } catch {
    /* mai trenquis l'app per un error de telemetria */
  }
}

/* ─── Helpers tipats per consistència ─── */

export const tracker = {
  // Flow d'inscripció
  inscripcioIniciada: () => track("inscripcio_iniciada"),
  queuePassada: (waitedSeconds: number) =>
    track("queue_passada", { wait_seconds: Math.round(waitedSeconds) }),
  gateViralPassat: (sharesDone: number) =>
    track("viral_gate_passat", { shares_done: sharesDone }),
  gateViralSkipped: () => track("viral_gate_skipped"),
  shareWhatsApp: (slot: number) =>
    track("viral_share_whatsapp", { slot_index: slot }),
  igFollowed: () => track("viral_ig_followed"),
  pasCompletat: (step: number) =>
    track("inscripcio_pas_completat", { step }),
  codiDescompteAplicat: (codi: string) =>
    track("inscripcio_codi_aplicat", { codi }),
  inscripcioCompletada: (params: { categoria?: string; total?: number; jugadors?: number; teamId?: string }) =>
    track("inscripcio_completada", params),
  inscripcioError: (msg?: string) =>
    track("inscripcio_error", { error: msg }),

  // Pagaments QR
  qrPagamentEscanejat: () => track("qr_pagament_visualitzat"),

  // Equip i check-in
  equipVisualitzat: (nomEquip?: string, cat?: string) =>
    track("equip_visualitzat", { nom_equip: nomEquip, categoria: cat }),
  equipShared: (canal: string) =>
    track("equip_shared", { canal }),
  qrCheckinEscanejat: (teamId?: string) =>
    track("qr_checkin_escanejat", { team_id: teamId }),
  arribadaMarcada: (teamId?: string) =>
    track("equip_arribada_marcada", { team_id: teamId }),

  // CTAs estratègics de la home
  ctaInscripcioClick: (location: string) =>
    track("cta_inscripcio_click", { location }),
  ctaWhatsAppHomeClick: () => track("cta_whatsapp_home"),
};

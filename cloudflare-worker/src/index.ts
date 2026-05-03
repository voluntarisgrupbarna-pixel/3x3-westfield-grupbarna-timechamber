/**
 * 3×3 Westfield Glòries — Open Graph Worker
 *
 * Serveix com a "preview generator" personalitzat per als enllaços
 * d'equip que es comparteixen per WhatsApp/Twitter/Telegram/IG.
 *
 * Per què cal:
 *  - El site principal és una SPA (React) hostatjada a GitHub Pages.
 *  - Els crawlers de xarxes socials NO executen JS, així que veuen
 *    sempre el mateix og:image genèric.
 *  - Aquest Worker intercepta les URLs `/equip?nom=X&cat=Y` i retorna:
 *      • Per crawlers (WhatsApp bot, etc.) → HTML amb og:image dinàmica
 *        que conté el nom de l'equip a la imatge.
 *      • Per humans → meta refresh + JS redirect cap a la SPA real.
 *
 * Endpoints:
 *   GET /og.svg?nom=X&cat=Y                 → SVG 1200×630 personalitzat
 *   GET /equip?nom=X&cat=Y&cap=Z&club=W     → HTML amb OG tags
 *   GET /                                   → Healthcheck
 *
 * Desplegament:
 *   cd cloudflare-worker && npx wrangler deploy
 */

const SPA_BASE = "https://cbgrupbarna-3x3timechamber.com";
const SITE_NAME = "3×3 Westfield Glòries";
const EVENT_DATE = "6-7 Juny 2026";
const CITY = "Barcelona · Clot-Glòries";

interface Env { /* No bindings necessaris */ }

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/og.svg") {
      return handleOgSvg(url);
    }
    if (pathname === "/equip" || pathname.startsWith("/equip/")) {
      return handleEquipShare(url, request);
    }
    if (pathname === "/" || pathname === "") {
      return new Response(
        `3×3 Glòries OG Worker · OK\n\nEndpoints:\n  /og.svg?nom=X&cat=Y\n  /equip?nom=X&cat=Y&cap=Z&club=W`,
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return new Response("Not found", { status: 404 });
  },
};

/* ───────────────────── /og.svg ───────────────────── */

function handleOgSvg(url: URL): Response {
  const nom = sanitize(url.searchParams.get("nom") || "EL TEU EQUIP", 28);
  const cat = sanitize(url.searchParams.get("cat") || "Categoria pendent", 38);
  const club = sanitize(url.searchParams.get("club") || "", 30);

  const svg = renderOgSvg(nom, cat, club);
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=86400",
      "access-control-allow-origin": "*",
    },
  });
}

function renderOgSvg(nom: string, cat: string, club: string): string {
  // Fons amb gradient dark + dos blobs ambientals + accent vermell
  const safeNom = escapeXml(nom).toUpperCase();
  const safeCat = escapeXml(cat);
  const safeClub = escapeXml(club);

  // Mida de font del nom auto-ajustada a la longitud
  const nomLen = nom.length;
  const nomFontSize = nomLen <= 12 ? 140 : nomLen <= 18 ? 110 : nomLen <= 24 ? 88 : 72;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(nom)} · ${escapeXml(cat)} · ${SITE_NAME} 2026">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="55%" stop-color="#1a0a14"/>
      <stop offset="100%" stop-color="#0b0f1c"/>
    </linearGradient>
    <radialGradient id="blob1" cx="0.15" cy="0.2" r="0.55">
      <stop offset="0%" stop-color="rgba(220,38,38,0.55)"/>
      <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
    </radialGradient>
    <radialGradient id="blob2" cx="0.85" cy="0.85" r="0.5">
      <stop offset="0%" stop-color="rgba(249,115,22,0.4)"/>
      <stop offset="100%" stop-color="rgba(249,115,22,0)"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#blob1)"/>
  <rect width="1200" height="630" fill="url(#blob2)"/>

  <!-- Top stripe -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>

  <!-- Eyebrow -->
  <g transform="translate(80, 90)">
    <rect width="220" height="38" rx="19" fill="rgba(220,38,38,0.15)" stroke="rgba(220,38,38,0.5)"/>
    <circle cx="22" cy="19" r="5" fill="#fca5a5"/>
    <text x="42" y="25" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="3" fill="#fca5a5">4ª EDICIÓ · INSCRIT</text>
  </g>

  <!-- Team name (huge, bold) -->
  <text x="80" y="270" font-family="Helvetica, Arial, sans-serif" font-size="${nomFontSize}" font-weight="900" letter-spacing="-2" fill="#ffffff" style="text-shadow: 0 0 40px rgba(220,38,38,0.6);">
    <tspan>${safeNom}</tspan>
  </text>

  <!-- Subline: ja juga al ... -->
  <text x="80" y="335" font-family="Helvetica, Arial, sans-serif" font-size="32" font-weight="600" fill="rgba(255,255,255,0.7)">
    juga al <tspan fill="#fca5a5" font-weight="800">3×3 Westfield Glòries 2026</tspan>
  </text>

  <!-- Category pill -->
  <g transform="translate(80, 380)">
    <rect width="${Math.max(280, safeCat.length * 14 + 60)}" height="48" rx="24" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
    <text x="30" y="32" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${safeCat}</text>
  </g>

  <!-- Bottom row: date + city + club -->
  <g transform="translate(80, 530)">
    <text x="0" y="0" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="#f97316">📅 ${EVENT_DATE}</text>
    <text x="0" y="40" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="600" fill="rgba(255,255,255,0.5)">📍 ${CITY}</text>
    ${safeClub ? `<text x="700" y="0" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="600" fill="rgba(255,255,255,0.45)">${safeClub}</text>` : ""}
  </g>

  <!-- Right-side basketball mark (3 i 3) -->
  <g transform="translate(900, 100)" opacity="0.95">
    <circle cx="100" cy="100" r="100" fill="#dc2626"/>
    <text x="100" y="135" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="900" text-anchor="middle" fill="#ffffff">3</text>
    <text x="100" y="195" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="700" text-anchor="middle" fill="#ffffff" letter-spacing="6">×3</text>
  </g>

  <!-- Brand bottom-right -->
  <text x="1120" y="600" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.4)">CBGRUPBARNA-3X3TIMECHAMBER.COM</text>
</svg>`;
}

/* ─────────────────────  /equip share HTML ───────────────────── */

function handleEquipShare(url: URL, request: Request): Response {
  const nom = url.searchParams.get("nom") || "Equip";
  const cat = url.searchParams.get("cat") || "Categoria";
  const cap = url.searchParams.get("cap") || "";
  const club = url.searchParams.get("club") || "";

  // URL canònica de la SPA (per humans)
  const spaUrl = new URL("/equip", SPA_BASE);
  ["nom","cat","cap","club","jug"].forEach(k => {
    const v = url.searchParams.get(k);
    if (v) spaUrl.searchParams.set(k, v);
  });

  // URL de la imatge OG (aquest mateix worker)
  const ogImage = new URL("/og.svg", url.origin);
  ["nom","cat","club"].forEach(k => {
    const v = url.searchParams.get(k);
    if (v) ogImage.searchParams.set(k, v);
  });

  const title = `${nom} · 3×3 Westfield Glòries 2026`;
  const description = cap
    ? `${nom} (capità: ${cap}) ja s'ha inscrit a la categoria ${cat}. Vine a animar-los el 6-7 de Juny 2026 al Clot-Glòries · Barcelona!`
    : `${nom} ja s'ha inscrit al 3×3 Westfield Glòries 2026 · Categoria ${cat}. Vine a animar-los el 6-7 de Juny a Barcelona!`;

  const html = `<!DOCTYPE html>
<html lang="ca">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${spaUrl.toString()}"/>

<meta property="og:locale" content="ca_ES"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="3×3 Westfield Glòries"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${spaUrl.toString()}"/>
<meta property="og:image" content="${ogImage.toString()}"/>
<meta property="og:image:secure_url" content="${ogImage.toString()}"/>
<meta property="og:image:type" content="image/svg+xml"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${escapeHtml(title)}"/>

<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@cbgrupbarna"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${ogImage.toString()}"/>

<!-- Redirect humans to the SPA after a tick (crawlers don't follow refresh) -->
<meta http-equiv="refresh" content="0; url=${spaUrl.toString()}"/>
<style>
  body { background:#0b1020; color:#fff; font-family: system-ui, sans-serif; padding:48px; text-align:center; }
  a { color:#fca5a5; }
</style>
</head>
<body>
<h1>${escapeHtml(nom)}</h1>
<p>Redirigint al perfil de l'equip…</p>
<p><a href="${spaUrl.toString()}">Si no et redirigeix automàticament, fes clic aquí.</a></p>
<script>
  // Fallback per humans amb JS — més ràpid que el meta refresh
  window.location.replace(${JSON.stringify(spaUrl.toString())});
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}

/* ───────────────────── helpers ───────────────────── */

function sanitize(s: string, maxLen: number): string {
  return String(s).replace(/[\x00-\x1f]/g, " ").slice(0, maxLen).trim();
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

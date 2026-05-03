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

// @ts-expect-error - qrcode-svg has no bundled types
import QRCode from "qrcode-svg";

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
    if (pathname === "/qr.svg") {
      return handleQrSvg(url);
    }
    if (pathname === "/cartell.svg") {
      return handleCartellSvg(url);
    }
    if (pathname === "/equip" || pathname.startsWith("/equip/")) {
      return handleEquipShare(url, request);
    }
    if (pathname === "/" || pathname === "") {
      return new Response(
        `3×3 Glòries OG Worker · OK\n\nEndpoints:\n  /og.svg?nom=X&cat=Y                       (Open Graph preview, 1200×630)\n  /qr.svg?data=<text-or-url>                (QR code as SVG)\n  /cartell.svg?nom=X&cat=Y&format=story     (downloadable share artwork)\n     format = story (1080×1920) | square (1080×1080) | landscape (1200×675)\n  /equip?nom=X&cat=Y&cap=Z                  (HTML with OG tags + redirect)`,
        { headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return new Response("Not found", { status: 404 });
  },
};

/* ───────────────────── /qr.svg ───────────────────── */

function handleQrSvg(url: URL): Response {
  const data = url.searchParams.get("data") || "";
  const sizeParam = parseInt(url.searchParams.get("size") || "300", 10);
  const size = Math.min(800, Math.max(100, isNaN(sizeParam) ? 300 : sizeParam));
  const color = url.searchParams.get("color") || "#0b1020";
  const bg = url.searchParams.get("bg") || "#ffffff";

  if (!data) {
    return new Response("Missing 'data' query parameter", { status: 400 });
  }
  try {
    const qr = new QRCode({
      content: data,
      width: size,
      height: size,
      color,
      background: bg,
      ecl: "M",
      padding: 2,
      join: true,
      container: "svg-viewbox",
    });
    const svg = qr.svg();
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return new Response("QR generation error: " + String(err), { status: 500 });
  }
}

/* ───────────────────── /og.svg ───────────────────── */

function handleOgSvg(url: URL): Response {
  const nom = sanitize(url.searchParams.get("nom") || "EL TEU EQUIP", 36);
  const cat = sanitize(url.searchParams.get("cat") || "Categoria pendent", 40);
  const club = sanitize(url.searchParams.get("club") || "", 32);

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
  // Imatges live al GH Pages — pista real del torneig (mostrant el "TIME CHAMBER" pintat al terra)
  const BG_URL = "https://cbgrupbarna-3x3timechamber.com/og-court-bg.jpg";
  const TC_LOGO_URL = "https://cbgrupbarna-3x3timechamber.com/logos/time-chamber.webp";
  const EC_LOGO_URL = "https://cbgrupbarna-3x3timechamber.com/logos/eix-clot.png";

  const safeNom = escapeXml(nom).toUpperCase();
  const safeCat = escapeXml(cat);
  const safeClub = escapeXml(club);

  // Auto-shrink agressiu pels noms llargs perquè càpiguen dins els 1200px d'amplada
  const nomLen = nom.length;
  const nomFontSize = nomLen <= 6 ? 168 : nomLen <= 10 ? 140 : nomLen <= 14 ? 116 : nomLen <= 18 ? 96 : nomLen <= 22 ? 78 : nomLen <= 28 ? 62 : nomLen <= 34 ? 50 : 42;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${escapeXml(nom)} · ${escapeXml(cat)} · ${SITE_NAME} 2026">
  <defs>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.85">
      <stop offset="0%" stop-color="rgba(0,0,0,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.65)"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <filter id="ds" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="14"/>
      <feOffset dx="0" dy="5" result="offsetblur"/>
      <feFlood flood-color="rgba(0,0,0,1)"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 1. Imatge de fons: PISTA REAL del torneig (Westfield Glòries amb "TIME CHAMBER" pintat al terra) -->
  <image x="0" y="0" width="1200" height="630" href="${BG_URL}" xlink:href="${BG_URL}" preserveAspectRatio="xMidYMid slice"/>

  <!-- 2. Overlay lleuger + vignette suau (la pista queda BEN visible) -->
  <rect x="0" y="0" width="1200" height="630" fill="rgba(11,16,32,0.22)"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#vignette)"/>

  <!-- 2b. Banda fosca centrada per assegurar llegibilitat del nom (només darrere el text) -->
  <rect x="0" y="270" width="1200" height="200" fill="rgba(0,0,0,0.42)"/>

  <!-- 3. Top stripe accent -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>

  <!-- 4. Header centrat: brand del torneig (perquè el receptor sàpiga què és) -->
  <text x="600" y="80" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="6" fill="#fca5a5">3×3 WESTFIELD GLÒRIES · 4ª EDICIÓ</text>

  <!-- 5. INSCRIT badge top-right (subtle stamp) -->
  <g transform="translate(960, 110) rotate(-4)">
    <rect width="200" height="44" rx="22" fill="#dc2626" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
    <circle cx="24" cy="22" r="5" fill="#ffffff"/>
    <text x="40" y="29" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="900" letter-spacing="3" fill="#ffffff">INSCRIT · LIVE</text>
  </g>

  <!-- 6. Eyebrow (small, decorative) -->
  <text x="600" y="240" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="8" fill="rgba(252,165,165,0.85)">EL TEU EQUIP JUGA AL TORNEIG</text>

  <!-- 7. Team name (HERO) — centrat, gegant, amb shadow -->
  <text x="600" y="380" text-anchor="middle" font-family="'Rajdhani', 'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="${nomFontSize}" font-weight="900" letter-spacing="-3" fill="#ffffff" filter="url(#ds)">${safeNom}</text>

  <!-- 8. Subtle accent line below name -->
  <rect x="${600 - 100}" y="410" width="200" height="3" fill="url(#accent)"/>

  <!-- 9. Category pill (centred under accent line) -->
  <g transform="translate(${600 - Math.min(560, Math.max(180, safeCat.length * 14)) / 2}, 445)">
    <rect width="${Math.min(560, Math.max(180, safeCat.length * 14))}" height="48" rx="24" fill="rgba(220,38,38,0.18)" stroke="rgba(252,165,165,0.6)" stroke-width="1.5"/>
    <text x="${Math.min(560, Math.max(180, safeCat.length * 14)) / 2}" y="32" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="800" fill="#ffffff">${safeCat}</text>
  </g>

  <!-- 10. Divider line -->
  <rect x="80" y="540" width="1040" height="1" fill="rgba(255,255,255,0.15)"/>

  <!-- 11. Bottom row: date + city left, logos right -->
  <text x="80" y="580" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="2" fill="#f97316">📅 ${EVENT_DATE}</text>
  <text x="80" y="608" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="600" fill="rgba(255,255,255,0.6)">📍 ${CITY}</text>
  ${safeClub ? `<text x="600" y="595" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="rgba(255,255,255,0.5)">Club: ${safeClub}</text>` : ""}

  <!-- 12. Logos sponsors a la cantonada inferior dreta -->
  <image x="950" y="568" width="76" height="24" href="${TC_LOGO_URL}" xlink:href="${TC_LOGO_URL}" preserveAspectRatio="xMidYMid meet"/>
  <image x="1050" y="565" width="60" height="30" href="${EC_LOGO_URL}" xlink:href="${EC_LOGO_URL}" preserveAspectRatio="xMidYMid meet"/>
  <text x="1120" y="615" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,0.35)">cbgrupbarna-3x3timechamber.com</text>
</svg>`;
}

/* ───────────────────── /cartell.svg ─────────────────────
 * Cartell descarregable (IG story / IG post / landscape).
 * Pure SVG sense referències a imatges externes → es pot
 * convertir a PNG via canvas client-side sense problemes CORS.
 */

function handleCartellSvg(url: URL): Response {
  const nom = sanitize(url.searchParams.get("nom") || "EL TEU EQUIP", 40);
  const cat = sanitize(url.searchParams.get("cat") || "Categoria pendent", 42);
  const format = (url.searchParams.get("format") || "story").toLowerCase();
  const layout = format === "square" ? { w: 1080, h: 1080, kind: "square" as const }
                : format === "landscape" ? { w: 1200, h: 675, kind: "landscape" as const }
                : { w: 1080, h: 1920, kind: "story" as const };
  const svg = renderCartellSvg(nom, cat, layout);
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=86400",
      "access-control-allow-origin": "*",
    },
  });
}

function renderCartellSvg(nom: string, cat: string, layout: { w: number; h: number; kind: "story" | "square" | "landscape" }): string {
  const { w, h, kind } = layout;
  const safeNom = escapeXml(nom).toUpperCase();
  const safeCat = escapeXml(cat);
  const nomLen = nom.length;

  // Mida nom per format
  const nomFontSize = (() => {
    if (kind === "story") {
      return nomLen <= 8 ? 220 : nomLen <= 14 ? 168 : nomLen <= 20 ? 130 : nomLen <= 28 ? 100 : 80;
    }
    if (kind === "square") {
      return nomLen <= 8 ? 180 : nomLen <= 14 ? 140 : nomLen <= 20 ? 110 : nomLen <= 28 ? 86 : 68;
    }
    // landscape
    return nomLen <= 8 ? 150 : nomLen <= 14 ? 116 : nomLen <= 20 ? 92 : nomLen <= 28 ? 72 : 56;
  })();

  // Posicions per format (vertical/horitzontal)
  const cx = w / 2;
  const headerY = kind === "story" ? 200 : kind === "square" ? 130 : 90;
  const inscritY = kind === "story" ? 360 : kind === "square" ? 240 : 180;
  const eyebrowY = kind === "story" ? h * 0.42 : kind === "square" ? h * 0.45 : h * 0.42;
  const nameY = kind === "story" ? h * 0.52 : kind === "square" ? h * 0.55 : h * 0.55;
  const accentY = kind === "story" ? nameY + 80 : kind === "square" ? nameY + 60 : nameY + 50;
  const catY = kind === "story" ? accentY + 100 : kind === "square" ? accentY + 80 : accentY + 70;
  const dateY = kind === "story" ? h - 360 : kind === "square" ? h - 200 : h - 130;
  const cityY = dateY + (kind === "story" ? 60 : 40);
  const brandY = h - (kind === "story" ? 80 : kind === "square" ? 60 : 50);

  // Court-line decorative pattern (3x3 court hint, sense imatge externa)
  const courtLines = kind === "story" ? `
    <g opacity="0.08" stroke="#ffffff" stroke-width="3" fill="none">
      <circle cx="${cx}" cy="${h / 2}" r="${w * 0.35}"/>
      <line x1="${cx - w * 0.4}" y1="${h / 2}" x2="${cx + w * 0.4}" y2="${h / 2}"/>
      <path d="M ${cx - w * 0.32} ${h / 2 - w * 0.32} A ${w * 0.32} ${w * 0.32} 0 0 1 ${cx + w * 0.32} ${h / 2 - w * 0.32}" />
      <path d="M ${cx - w * 0.32} ${h / 2 + w * 0.32} A ${w * 0.32} ${w * 0.32} 0 0 0 ${cx + w * 0.32} ${h / 2 + w * 0.32}" />
    </g>
  ` : `
    <g opacity="0.07" stroke="#ffffff" stroke-width="2" fill="none">
      <circle cx="${cx}" cy="${h * 0.55}" r="${Math.min(w, h) * 0.32}"/>
      <line x1="${cx - w * 0.4}" y1="${h * 0.55}" x2="${cx + w * 0.4}" y2="${h * 0.55}"/>
    </g>
  `;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(nom)} · ${escapeXml(cat)} · 3×3 Westfield Glòries 2026">
  <defs>
    <linearGradient id="bgCartell" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a0a14"/>
      <stop offset="50%" stop-color="#0b1020"/>
      <stop offset="100%" stop-color="#1a0a14"/>
    </linearGradient>
    <radialGradient id="redGlow" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0%" stop-color="rgba(220,38,38,0.45)"/>
      <stop offset="100%" stop-color="rgba(220,38,38,0)"/>
    </radialGradient>
    <radialGradient id="orangeGlow" cx="0.85" cy="0.85" r="0.5">
      <stop offset="0%" stop-color="rgba(249,115,22,0.35)"/>
      <stop offset="100%" stop-color="rgba(249,115,22,0)"/>
    </radialGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <filter id="ds${kind}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${kind === "story" ? 18 : 14}"/>
      <feOffset dx="0" dy="6" result="ob"/>
      <feFlood flood-color="rgba(0,0,0,0.95)"/>
      <feComposite in2="ob" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="url(#bgCartell)"/>
  <rect width="${w}" height="${h}" fill="url(#redGlow)"/>
  <rect width="${w}" height="${h}" fill="url(#orangeGlow)"/>
  ${courtLines}

  <!-- Top accent stripe -->
  <rect x="0" y="0" width="${w}" height="8" fill="url(#accentLine)"/>

  <!-- Brand header -->
  <text x="${cx}" y="${headerY}" text-anchor="middle"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="${kind === "story" ? 36 : 28}" font-weight="900" letter-spacing="${kind === "story" ? 12 : 8}" fill="#fca5a5">
    3×3 WESTFIELD GLÒRIES
  </text>
  <text x="${cx}" y="${headerY + (kind === "story" ? 50 : 36)}" text-anchor="middle"
    font-family="'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="${kind === "story" ? 26 : 20}" font-weight="700" letter-spacing="6" fill="rgba(255,255,255,0.55)">
    4ª EDICIÓ · 2026
  </text>

  <!-- INSCRIT pill (centred) -->
  <g transform="translate(${cx - (kind === "story" ? 200 : 150)}, ${inscritY})">
    <rect width="${kind === "story" ? 400 : 300}" height="${kind === "story" ? 70 : 56}" rx="${kind === "story" ? 35 : 28}" fill="#dc2626"/>
    <circle cx="${kind === "story" ? 36 : 28}" cy="${kind === "story" ? 35 : 28}" r="${kind === "story" ? 8 : 6}" fill="#ffffff"/>
    <text x="${(kind === "story" ? 400 : 300) / 2 + (kind === "story" ? 18 : 14)}" y="${kind === "story" ? 47 : 37}" text-anchor="middle"
      font-family="Helvetica, Arial, sans-serif" font-size="${kind === "story" ? 26 : 18}" font-weight="900" letter-spacing="4" fill="#ffffff">
      INSCRIT · LIVE
    </text>
  </g>

  <!-- Eyebrow -->
  <text x="${cx}" y="${eyebrowY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif"
    font-size="${kind === "story" ? 32 : kind === "square" ? 26 : 20}" font-weight="800" letter-spacing="${kind === "story" ? 12 : 8}" fill="rgba(252,165,165,0.85)">
    EL TEU EQUIP JUGA AL TORNEIG
  </text>

  <!-- Team name (HERO) -->
  <text x="${cx}" y="${nameY}" text-anchor="middle"
    font-family="'Rajdhani', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-size="${nomFontSize}" font-weight="900" letter-spacing="-3" fill="#ffffff" filter="url(#ds${kind})">
    ${safeNom}
  </text>

  <!-- Accent line -->
  <rect x="${cx - (kind === "story" ? 180 : 130)}" y="${accentY}" width="${kind === "story" ? 360 : 260}" height="${kind === "story" ? 6 : 4}" fill="url(#accentLine)"/>

  <!-- Category pill -->
  <g transform="translate(${cx - Math.min(kind === "story" ? 480 : 400, Math.max(kind === "story" ? 240 : 180, safeCat.length * (kind === "story" ? 22 : 16))) / 2}, ${catY})">
    <rect width="${Math.min(kind === "story" ? 480 : 400, Math.max(kind === "story" ? 240 : 180, safeCat.length * (kind === "story" ? 22 : 16)))}"
      height="${kind === "story" ? 72 : 54}"
      rx="${kind === "story" ? 36 : 27}"
      fill="rgba(220,38,38,0.20)" stroke="rgba(252,165,165,0.6)" stroke-width="2"/>
    <text x="${Math.min(kind === "story" ? 480 : 400, Math.max(kind === "story" ? 240 : 180, safeCat.length * (kind === "story" ? 22 : 16))) / 2}"
      y="${kind === "story" ? 47 : 35}" text-anchor="middle"
      font-family="Helvetica, Arial, sans-serif" font-size="${kind === "story" ? 30 : 22}" font-weight="800" fill="#ffffff">
      ${safeCat}
    </text>
  </g>

  <!-- Date + city -->
  <text x="${cx}" y="${dateY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${kind === "story" ? 56 : 36}" font-weight="900" letter-spacing="${kind === "story" ? 6 : 4}" fill="#f97316">
    📅  6-7 JUNY 2026
  </text>
  <text x="${cx}" y="${cityY + (kind === "story" ? 20 : 10)}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${kind === "story" ? 30 : 22}" font-weight="600" fill="rgba(255,255,255,0.7)">
    📍 Barcelona · Clot-Glòries
  </text>

  <!-- Brand footer -->
  <text x="${cx}" y="${brandY}" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="${kind === "story" ? 22 : 14}" font-weight="700" letter-spacing="3" fill="rgba(255,255,255,0.4)">
    @cbgrupbarna · cbgrupbarna-3x3timechamber.com
  </text>

  <!-- Bottom accent stripe -->
  <rect x="0" y="${h - 8}" width="${w}" height="8" fill="url(#accentLine)"/>
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

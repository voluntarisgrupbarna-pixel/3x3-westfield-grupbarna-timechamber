# OG Worker — 3×3 Westfield Glòries

Cloudflare Worker que genera previews dinàmiques d'Open Graph quan algú comparteix l'enllaç d'un equip per WhatsApp/Twitter/Telegram/Instagram.

## Per què aquest Worker existeix

La web principal (`cbgrupbarna-3x3timechamber.com`) és una SPA React. Els crawlers de xarxes socials **no executen JavaScript**, així que sempre veuen el mateix og:image genèric. Aquest Worker intercepta les URLs de tipus `/equip?nom=X&cat=Y` i:

- **Per crawlers (WhatsApp/Twitter/etc.)** → retorna HTML estàtic amb meta tags personalitzats (og:title, og:image que conté el nom de l'equip dibuixat).
- **Per humans** → meta refresh + redirect immediat a la SPA real.

Resultat: quan comparteixes `https://og-3x3-glories.<usuari>.workers.dev/equip?nom=Barcelona+Ballers&cat=Senior+A+Pro+Masculí`, el preview de WhatsApp mostra una imatge personalitzada amb "BARCELONA BALLERS · Senior A Pro Masculí · 6-7 Juny 2026" en lloc del cartell genèric.

## Setup (un cop, ~5 min)

### 1. Crea compte Cloudflare (gratuït)

https://dash.cloudflare.com/sign-up — Cloudflare Workers tenen tier gratuït de 100.000 peticions/dia, més que suficient per aquest cas.

### 2. Login amb wrangler

```bash
cd cloudflare-worker
npx wrangler login
```

S'obrirà el navegador per autoritzar.

### 3. Deploy

```bash
npx wrangler deploy
```

T'imprimirà la URL final, alguna cosa com:

```
✨ Deployed og-3x3-glories triggers
   https://og-3x3-glories.<el-teu-username>.workers.dev
```

**Anota aquesta URL — la necessites al pas següent.**

### 4. Configura la web perquè comparteixi via Worker

Afegeix aquest secret a GitHub Actions (Repository → Settings → Secrets and variables → Actions → New repository secret):

| Nom | Valor |
|---|---|
| `VITE_SHARE_BASE` | `https://og-3x3-glories.<el-teu-username>.workers.dev` |

Després del proper push a `main`, el workflow de deploy injectarà aquest valor i les share buttons d'`Equip.tsx` apuntaran al Worker en lloc de la SPA.

> Si **no** configures `VITE_SHARE_BASE`, el comportament actual es manté (compartir la SPA directament, sense OG personalitzat). El sistema és no-breaking per defecte.

## Endpoints del Worker

| Endpoint | Per a què |
|---|---|
| `GET /` | Healthcheck |
| `GET /og.svg?nom=X&cat=Y&club=Z` | Imatge OG SVG 1200×630 personalitzada |
| `GET /equip?nom=X&cat=Y&cap=Z&club=W&jug=N` | HTML amb meta tags + redirect a la SPA |

Cache headers: 5-10 min al navegador, 1 dia a Cloudflare edge — no satures el Worker quan un equip es viralitza.

## Desenvolupament local

```bash
npx wrangler dev --port 8787
# en una altra terminal:
curl "http://localhost:8787/og.svg?nom=BarcelonaBallers&cat=Senior+A+Pro"
curl "http://localhost:8787/equip?nom=BarcelonaBallers&cat=Senior+A+Pro&cap=Joan"
```

## Logs en producció

```bash
npx wrangler tail
```

Mostra peticions reals en temps real per debugar.

## Per què SVG en lloc de PNG

L'SVG és:
- **Net** (~4 KB vs ~150-300 KB d'un PNG equivalent)
- **Resolent perfectament** a qualsevol mida (WhatsApp el reescala bé)
- **Suportat** per WhatsApp, Twitter, Telegram, Facebook, IG (DMs preview)
- **Sense dependències** (no cal Satori, Resvg, ni cap altre lib)

LinkedIn pot mostrar-lo amb una qualitat lleugerament inferior — si això és un problema futur, el Worker es pot ampliar afegint `@resvg/resvg-wasm` per generar PNGs (cost: + ~200ms i ~500KB de bundle, però es manté en tier gratuït).

## Estructura

```
cloudflare-worker/
├── src/
│   └── index.ts        # Worker code (handle /og.svg + /equip)
├── wrangler.toml       # Config (nom, compatibility date)
├── package.json        # Dev dependencies (wrangler, types, ts)
├── tsconfig.json       # TS config strict
└── README.md           # Aquest fitxer
```

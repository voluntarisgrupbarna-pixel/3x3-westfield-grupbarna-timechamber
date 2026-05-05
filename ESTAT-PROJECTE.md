# ESTAT DEL PROJECTE · 3×3 Westfield Glòries 2026

Última actualització: 5 de maig 2026 · Branch `main`

---

## ✅ FET I DESPLEGAT

### Pàgines i rutes (15)
- `/` Home (hero · categories · 100-cells fill grid · ubicacions · galeria · blog · sponsors · footer)
- `/inscripcion` Form 5 passos (queue suau + viral gate + dades + jugadors + bases + RGPD)
- `/inscripcio-individual` Solo 20€ amb assignació automàtica a equip
- `/equip?nom=…` Pàgina compartible per equip inscrit
- `/checkin?id=…` Pàgina d'arribada al torneig (escaneig QR)
- `/llista-espera` FOMO automàtic quan capacitat ≥ 100
- `/preguntes-frequents` (alias `/faq`) — 17 FAQs en català
- `/seu/westfield-glories` · `/seu/nau-del-clot` · `/seu/rambleta-del-clot` (transport, parking, mapa)
- `/sobre-nosaltres` (alias `/qui-som`) — història del club + organitzadors
- `/premsa` (alias `/press`) — press kit complet
- `/blog` + `/blog/:slug` — index + 3 articles long-tail (1500 paraules cada un)
- `/contacte` (alias `/contacto`) — landing per a Linktree

### Backend (Google Apps Script Code.gs + Triggers.gs)
**doPost actions implementades:**
- `checkin` → marca arribada equip al Sheet
- `waitlist` → afegeix a `Llista_Espera` + email user + admin
- `whatsapp_lead` → afegeix a `Llista_Difusio_3x3` + RGPD gate + email admin
- `subscribe` → afegeix a `Subscriptors_Blog` + reenvia a Fillout (form mRRK9kAMDhus) + email confirmació
- `individual` → jugador sense equip 20€, pestanya `Jugadors_Individuals`
- (Submission per defecte) → escriu a `Inscripcions 2026` + reenvia a Fillout (form qHCxiyaw5bus) + Drive justificant + emails

**doGet** retorna `{count, capacity, byCategory, source, ts}`. byCategory llegit del Sheet (no gasta quota Fillout).

**Time-based triggers** (Triggers.gs):
- `sendT7Reminders()` (1 setmana abans)
- `sendT1Reminders()` (24h abans)
- `sendPostEventEmails()` (l'endemà)
- `notifyAllSubscribers({slug,title,excerpt})` (manual quan publiques blog)

### Cloudflare Worker (`og-3x3-glories.cbgrupbarna.workers.dev`)
- `/og.svg?nom=X&cat=Y&club=Z` → preview 1200×630 amb foto pista + nom equip
- `/equip?nom=X&cat=Y&cap=Z` → HTML amb OG tags personalitzats + redirect a SPA
- `/qr.svg?data=X&size=300` → QR code per emails (qrcode-svg lib)
- `/cartell.svg?nom=X&cat=Y&format=story|square|landscape` → SVG descarregable per IG/TikTok

### Fillout forms creats (3)
- `qHCxiyaw5bus` "My form" — inscripcions equip (4 questions: nfnP, wJSK, g54s, cfVA + 9jeb FileUpload)
- `mRRK9kAMDhus` "Subscriptors Blog 3x3" — newsletter (6vuu, 5t4Y, dBdB)
- *(no s'ha creat un tercer per leads WhatsApp; va al Sheet directament)*

### Categories (100 places repartides)
| Cat | Q | Cat | Q | Cat | Q |
|---|---:|---|---:|---|---:|
| Escola | 8 | Mini | 8 | Cadet | 12 |
| Premini | 6 | Preinfantil | 10 | Junior | 15 |
| Sèniors | 15 | Infantil | 12 | Veterans | 10 | Màgics | 4 |

### Mecanismes virals i conversion
- WhatsApp lead capture modal (3 events: 3x3 / Campus / Portes Obertes)
  - UTM tracking automàtic (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `code`)
  - RGPD checkbox obligatori
  - Pre-text personalitzat per source/event/intent
  - Step opcional de preguntes (info/prueba/reserva)
- FloatingButtons: Q&A WhatsApp + Share menu (TikTok, IG, X, Telegram, Copy)
- Per-team dynamic OG images via Worker
- Cartell descarregable (1080×1920 / 1080×1080 / 1200×675) post-inscripció
- BlogSection a Home + email subscribe form

### SEO
- JSON-LD: SportsEvent · Organization · WebSite · BreadcrumbList · FAQPage (17 Q) · VideoObject · SportsActivityLocation (3 seus) · Article (per cada blog post)
- Open Graph + Twitter Cards complets
- Pinterest rich pins
- Sitemap.xml amb 14 URLs · robots.txt
- noscript fallback amb keywords
- PWA manifest (afegir a pantalla d'inici)
- Google Analytics 4 (G-R6XYR7G1WF) + Web Vitals tracking automàtic
- 8 GA4 conversion events tipats: inscripcio_iniciada, queue_passada, viral_share_whatsapp, viral_gate_passat, inscripcio_pas_completat, inscripcio_completada, equip_visualitzat, qr_checkin_escanejat, equip_arribada_marcada
- Microsoft Clarity scaffold (placeholder ready)

### Performance
- Code splitting: bundle inicial 464 KB / gzip 143 KB (Home + framework)
- Cada ruta lazy chunk independent (4-17 KB)
- Inscripcion = 209 KB lazy (només es carrega si algú entra a /inscripcion)
- Lazy load + decoding async a totes les imatges no-hero
- Font Rajdhani preload
- Self-hosted imatges (9 fitxers a `/public/images/`)
- Cleanup Lovable artifacts (componentTagger, react-router-dom-proxy, VITE_ENABLE_ROUTE_MESSAGING)

### Pagaments i identificació
- EPC QR (concept "3X3+EQUIPNAME") al pas 4 i success page
- IBAN copiable
- Per-team check-in QR personalitzat (URL → /checkin amb totes les dades)
- Concepte de pagament únic per equip
- Justificant pagament puja a Drive folder + URL passa a Fillout

### Legal
- Apartat legal Timechamber Experience al form (heretat del JotForm Campus)
- 3 checkboxes obligatoris: bases, apartat legal, drets imatge
- Email contacte unificat: `voluntaris@grupbarna.info`
- WhatsApp Q&A: `+34 698 425 153`

### Documentació
- `apps-script/Code.gs` (font canònica del backend)
- `apps-script/Triggers.gs` (countdown emails)
- `apps-script/PressOutreach.md` (7 plantilles emails de press)
- `apps-script/appsscript.json` (manifest per clasp)
- `cloudflare-worker/README.md` (guia deploy worker)
- `ESTAT-PROJECTE.md` (aquest document)

---

## ⚠️ PENDENT (action items)

### 🔴 Prioritari (sense això coses no funcionen)
1. **Apps Script API toggle** — `https://script.google.com/home/usersettings` → activar "Google Apps Script API"
   - Sense això: hauràs de seguir copiant-pegant `Code.gs` + `Triggers.gs` manualment cada cop que canvio una cosa
   - Amb el toggle ON: faig `clasp push` automàticament
2. **Pegar versió actual de Code.gs** al teu Apps Script (té els handlers `whatsapp_lead`, `subscribe`, `individual` + RGPD gate)
3. **Pegar Triggers.gs** + activar 3 time-based triggers (Apps Script editor → ⏰ Triggers):
   - `sendT7Reminders` · Daily · 9-10h
   - `sendT1Reminders` · Daily · 9-10h
   - `sendPostEventEmails` · Daily · 9-10h
4. **Redesplega l'Apps Script** (Manage deployments → Edit → New version → Deploy)
5. **Microsoft Clarity** — Crear compte (gratis) a `clarity.microsoft.com`, copiar Project ID, substituir `YOUR_CLARITY_ID` a `index.html`
6. **GitHub Actions secret** `VITE_SHARE_BASE = https://og-3x3-glories.cbgrupbarna.workers.dev` (ja afegit, només verificar a Settings → Secrets)

### 🟡 Estratègic (impulsen creixement)
7. **Press outreach** — enviar 7 emails segons calendari de `apps-script/PressOutreach.md`:
   - T-30 (5 maig) → BasquetCatala.cat + Rookies.es
   - T-21 (15 maig) → Eix Clot
   - T-14 (22 maig) → Time Out + El Día Barcelona
   - T-7 (30 maig) → Betevé + El Periódico
   - T+1 (8 juny) → Tots amb fotos
8. **Google Business Profile** — Crear "3×3 Westfield Glòries" com a Event Venue (10 min, fa que apareguis al pack local de Google Maps)
9. **Backlinks** — Demanar enllaç des de:
   - Web del Westfield Glòries
   - basquetcatala.cat (FCBQ)
   - timechamber.es
   - eixclot.com
   - cbgrupbarna.com (la teva pròpia web del club)
10. **TikTok content** — encarregar 3 vídeos curts (15s) amb hashtags `#3x3Barcelona #BasquetBarcelona #TorneigEstiu`
11. **Influencer / convidat especial** — convidar ex-jugador ACB o influencer 3x3 → multiplica abast x10
12. **Linktree** — actualitzar `linktr.ee/cbgrupbarna` per incloure enllaç a `/contacte` o al 3x3 directament

### 🟢 Operacions setmanals (rutina)
13. Cada vegada que publiquis nou article del blog → Apps Script editor → Run `notifyAllSubscribers({slug:'...', title:'...', excerpt:'...'})`
14. Setmanal: revisar pestanyes `Llista_Difusio_3x3` i `Subscriptors_Blog` del Sheet, exportar i fer broadcast WhatsApp
15. Marcar "Notificat broadcast? = Sí" als leads contactats
16. GA4 setmanal: Funnel Exploration per veure caigudes a /inscripcion

---

## 🚀 IDEES DE MILLORA (si tens temps)

### Tier 1 — Alt impacte, baix esforç
1. **Optimitzar `fiba-3x3-urban.jpg` (712 KB → ~150 KB)** — convertir a WebP o reduir resolució. És la imatge més pesada del repo.
2. **Política de privacitat** (`/politica-privacitat`) + **Avís legal** (`/avis-legal`) — necessari amb totes les captures de leads. RGPD compliance.
3. **Cookie consent banner** — actualment GA4 té `anonymize_ip:true` però no hi ha banner explícit. CookieYes/Cookiebot tier gratuït ho cobreix.
4. **Hreflang ES** — afegir versió en castellà del Home (les inscripcions de fora de Catalunya milloren si veuen el contingut en castellà). 1 HTML duplicat amb traduccions.
5. **Unsubscribe handler** — cap link de baixa als emails de subscriptors. Afegir endpoint `?action=unsubscribe&email=...` al Apps Script + footer als emails.

### Tier 2 — Mitjà impacte, mitjà esforç
6. **Resend.com transactional email** — substituir Apps Script MailApp per Resend (límit 100/dia gratis, 1.500/dia amb Workspace, vs Resend 3.000/mes gratis amb millor deliverability i analytics).
7. **Service Worker / PWA offline** — actualment hi ha `manifest.webmanifest` però no offline cache. Afegir un SW perquè /checkin funcioni offline el dia del torneig (per si la WiFi del Westfield falla).
8. **/campus i /portes-obertes landing pages** — el `WhatsAppLeadForm` ja suporta els 3 events; només falten les landing pages. Reutilitzar el patró de /contacte.
9. **2 articles de blog més** — l'objectiu és 1 article/mes per mantenir l'autoritat SEO. Idees: "Què és FIBA 3×3?", "Calendari de tornejos 3×3 a Catalunya 2026", "El paper de la dona al bàsquet 3×3".
10. **Cookie de A/B test** als CTAs: provar "Inscriu el teu Equip — des de 75€" vs "Inscriu-te ara · Places limitades". GA4 ja captura conversions per source/medium.

### Tier 3 — Alt impacte, alt esforç
11. **Migrar el Sheet a Fillout (eliminar el Sheet)** — actualment Sheet és backup de Fillout per a inscripcions. Si no el necessites, simplifiques operacions.
12. **Stripe Checkout integració** — pagaments amb targeta directes (1.5%+0.25€) en lloc de transferència manual. Confirmació immediata sense esperar verificació.
13. **Unit + E2E tests** — Playwright per als flows crítics (inscripció, lead WhatsApp, subscribe). Si toques codi en pre-event, evites regressions.
14. **Cloudflare Images** — CDN per imatges amb resize automàtic. /images/* serveix optimitzat segons device.
15. **Ant-spam captcha** al WhatsApp lead form — Cloudflare Turnstile (gratis, no dades) per als dies pre-event quan rebis molts leads.

---

## 📁 ESTRUCTURA DEL REPO

```
WEB 3X3/
├─ index.html ............... Static HTML + tots els JSON-LD + GA4 + Clarity scaffold
├─ public/
│  ├─ images/ .............. 9 imatges self-hosted (hero, gallery, sponsors)
│  ├─ logos/ ............... Time Chamber + Eix Clot
│  ├─ og-image.png ......... Cartell oficial 1200×630
│  ├─ og-court-bg.jpg ...... Foto pista per OG dinàmic
│  ├─ sitemap.xml .......... 14 URLs
│  ├─ robots.txt
│  └─ manifest.webmanifest . PWA install
├─ src/
│  ├─ pages/ ............... 15 components (Home, Inscripcion, Equip, Checkin, etc.)
│  ├─ components/ .......... BlogSection, FloatingButtons, WhatsAppLeadForm + shadcn ui/
│  ├─ lib/
│  │  ├─ blog.ts ........... Blog metadata + Component lazy
│  │  ├─ categories.ts ..... 10 categories + quotes 100 totals
│  │  ├─ seus.ts ........... 3 venues data
│  │  └─ track.ts .......... GA4 wrapper
│  └─ blog/ ................ 3 articles JSX
├─ apps-script/
│  ├─ Code.gs .............. doPost + doGet + handlers (font de veritat)
│  ├─ Triggers.gs .......... countdown emails + notifyAllSubscribers
│  ├─ appsscript.json ...... Manifest per clasp
│  └─ PressOutreach.md ..... 7 plantilles email premsa
├─ cloudflare-worker/
│  ├─ src/index.ts ......... Worker (og.svg + qr.svg + cartell.svg + /equip)
│  └─ wrangler.toml
├─ .github/workflows/deploy.yml  GH Pages auto-deploy a cada push
└─ ESTAT-PROJECTE.md ........ Aquest document
```

---

## 🔑 SECRETS i CONFIG

### GitHub Actions (Settings → Secrets and variables → Actions)
- `VITE_GOOGLE_SHEET_WEBHOOK` — URL Apps Script web app
- `VITE_SHARE_BASE` — `https://og-3x3-glories.cbgrupbarna.workers.dev`
- `VITE_JOTFORM_*` (legacy, no actius)

### Apps Script Script Properties (Project Settings)
| Property | Default | Què fa |
|---|---|---|
| `SHEET_ID` | `1MG5_8c…` | Sheet "Inscripcions 2026" |
| `SHEET_NAME` | `Inscripcions 2026` | Pestanya principal |
| `ADMIN_EMAIL` | `voluntaris@grupbarna.info` | Receptor d'alertes |
| `FILLOUT_API_KEY` | `sk_prod_…` | Auth per a tots els forms Fillout |
| `FILLOUT_FORM_ID` | `qHCxiyaw5bus` | Form inscripcions equip |
| `FILLOUT_BLOG_FORM_ID` | `mRRK9kAMDhus` (default codi) | Form subscriptors blog |
| `DRIVE_FOLDER_NAME` | `3x3 Justificants 2026` | Carpeta Drive justificants |
| `CAPACITAT_TOTAL` | `100` (default codi) | Per la barra de progrés |

### Cloudflare (compte `voluntarisgrupbarna@gmail.com`)
- Worker `og-3x3-glories` desplegat a `cbgrupbarna.workers.dev`
- API key Cloudflare ja autoritzada via `wrangler login`

---

## 📊 MÈTRIQUES (objectius pre-event)

| Mètrica | Eina | Objectiu |
|---|---|---|
| Visites úniques home | GA4 | 5k → 15k (T-30 → T-7) |
| Inscripcions completades | Apps Script + Fillout | 100 / 100 categories |
| Bounce rate Home | GA4 | < 50% |
| LCP | Web Vitals | < 2.5s |
| Posicionament "torneig 3x3 barcelona" | Search Console | Top 3 (juny) |
| Leads WhatsApp/setmana | Sheet `Llista_Difusio_3x3` | 30+ |
| Subscriptors blog | Fillout `mRRK9kAMDhus` | 100+ |

---

## 🆘 SUPORT

- Email: voluntaris@grupbarna.info
- WhatsApp: +34 698 425 153
- Web: https://cbgrupbarna-3x3timechamber.com
- Repo: https://github.com/voluntarisgrupbarna-pixel/3x3-westfield-grupbarna-timechamber
- Worker: https://og-3x3-glories.cbgrupbarna.workers.dev
- Apps Script: https://script.google.com/d/1u1tBzm6fUy3hcSV81muUO7nJ729pAPB3DxqYNSCFAVVo5kBE_0-gy-iG/edit
- Fillout dashboard: https://build.fillout.com/home

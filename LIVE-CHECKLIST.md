# LIVE-CHECKLIST · 3×3 Westfield Glòries 2026

Aquesta és la llista de **passos manuals** que NO es poden automatitzar (requereixen el teu login i clic). Tot el codi ja està desplegat. Marca cada caixa quan ho hagis fet.

---

## 1. Apps Script · pegar Code.gs i instal·lar triggers

**Per què cal:** Apps Script és el backend que rep les inscripcions, envia mails i pinta el comptador d'equips. Cada vegada que actualitzo `apps-script/Code.gs` o `apps-script/Triggers.gs` al repo, **has de pegar-ho manualment** a l'editor d'Apps Script.

> ⚠️ Per què no es pot automatitzar: el toggle "Apps Script API" del teu compte
> Google està desactivat per defecte. Per habilitar `clasp push` automàtic, has
> d'anar a https://script.google.com/home/usersettings i activar el toggle. Un
> cop activat, et passo les comandes `clasp push` per actualitzar des del repo.

### Passos

- [ ] Obre https://script.google.com/home → projecte "3x3-grupbarna-backend" (o crea'n un de nou si no existeix).
- [ ] Pega el contingut de `apps-script/Code.gs` al fitxer `Code.gs` (substitueix tot).
- [ ] **Add file** → "Script" → nom `Triggers` → pega `apps-script/Triggers.gs`.
- [ ] **Add file** → "Script" → nom `appsscript` està implícit (el manifest ja existeix; si no, copia `apps-script/appsscript.json` al fitxer manifest des de "Project settings → Show 'appsscript.json'").
- [ ] Save (Cmd+S).
- [ ] Selecciona la funció `setupTriggers` al desplegable de funcions de la barra superior.
- [ ] Clica **Run**. Autoritza permisos quan demani.
- [ ] Verifica al panell esquerre **Triggers** (icona de rellotge) que apareixen 3 triggers: `sendT7Reminders`, `sendT1Reminders`, `sendPostEventEmails`.
- [ ] **Deploy → Manage deployments** → edita el desplegament actual o crea'n un de nou tipus "Web app" amb `Execute as: Me` i `Who has access: Anyone`.
- [ ] Copia el **Web app URL** que et dóna i, si ha canviat respecte la versió anterior, ho pots actualitzar al GitHub secret `VITE_GOOGLE_SHEET_WEBHOOK` (Settings → Secrets and variables → Actions).

**Idempotent:** `setupTriggers` es pot tornar a executar tantes vegades com vulguis. Esborra els triggers existents amb el mateix nom i els torna a crear, així que mai duplica.

---

## 2. Microsoft Clarity · ID del projecte

**Per què cal:** Clarity és la nostra eina d'analytics gratuïta (heatmaps + session replays). El codi de tracking ja està a `index.html`, només falta l'ID del projecte.

> Si NO el configures, la web funciona igual: el codi té un fallback que no fa res quan l'ID està buit (`if (CLARITY_ID === "YOUR_CLARITY_ID" || !CLARITY_ID) return;`). Per tant pots saltar-te aquest pas si no vols usar Clarity.

### Passos

- [ ] Ves a https://clarity.microsoft.com → "Sign in with Google" amb un compte teu.
- [ ] **Add new project** → nom `3x3 Westfield Glòries` · domini `cbgrupbarna-3x3timechamber.com`.
- [ ] Settings → Setup → copia el `Project ID` (cadena curta tipus `abc123xyz`).
- [ ] Obre `index.html` al repo, busca `var CLARITY_ID = "YOUR_CLARITY_ID"` i substitueix `YOUR_CLARITY_ID` pel teu ID.
- [ ] Commit + push (`git add index.html && git commit -m "Set Clarity ID" && git push`).
- [ ] GH Pages farà el deploy automàticament. En 24h Clarity començarà a recollir dades.

---

## 3. Premsa · enviar emails de difusió

**Per què cal:** Tens 7 plantilles llestes a `apps-script/PressOutreach.md`. **No puc enviar emails per tu** (necessita el teu login a Gmail i la teva firma).

### Calendari

| Quan | A qui | Plantilla a usar |
|---|---|---|
| **T-30** (7 de maig) | Betevé · El Periódico · Time Out | Press release inicial |
| **T-21** (16 de maig) | Eix Clot · BasquetCatala.cat | Recordatori + dades inscripció |
| **T-14** (23 de maig) | Rookies.es · El Día Barcelona | "Últimes places" + angle inclusiu (Màgics) |
| **T-7** (30 de maig) | Tots els no-respostes | Pinga ràpida + invitació a cobrir el cap de setmana |

### Passos per enviar

- [ ] Obre `apps-script/PressOutreach.md` al repo.
- [ ] Per a cada email: copia el bloc `Assumpte:` i el cos.
- [ ] Personalitza el saludo amb el nom del periodista (cerca a Twitter/LinkedIn de cada mitjà qui escriu d'esports).
- [ ] Adjunta el press kit (cartell + dossier — descàrregues a `/premsa` o als fitxers de `/public/images/`).
- [ ] Envia des de `voluntarisgrupbarna@gmail.com`.
- [ ] Marca la caixa al calendari quan l'enviïs.

---

## 4. Google Business Profile · CB Grup Barna · ✅ JA TENS COMPTE

> Tens compte actiu. Toca **publicar contingut** + **completar fitxa**. Veure document separat amb 5 posts ready-to-paste i optimitzacions de fitxa: **`GOOGLE-BUSINESS-POSTS.md`** al root del repo.

### Passos ràpids

- [x] Crear compte ✅
- [ ] Publicar Post #1 "Inscripcions obertes" (avui)
- [ ] Programar Posts #2, #3, #4, #5 (Calendar a la mà — té sentit fer-ho ara mateix)
- [ ] Pegar la descripció del negoci de 750 chars
- [ ] Pujar les 8 fotos de `/public/images/`
- [ ] Crear les 5 Q&A predefinides per al SEO

> Veure GOOGLE-BUSINESS-POSTS.md per al text exacte de tot.

---

## ARXIU · Steps originals (per història)

### Crear el compte (ja fet)

- [x] Ja completat — Ana té el compte actiu.

<details>
<summary>Steps originals (collapsable, per referència)</summary>

- [ ] Ves a https://www.google.com/business amb el compte Gmail del club.
- [ ] **Manage now** → cerca "CB Grup Barna" (per veure si ja existeix). Si no, **Add your business to Google**.
- [ ] **Nom:** `CB Grup Barna · 3×3 Westfield Glòries`
- [ ] **Categoria primària:** `Esdeveniment esportiu`
- [ ] **Categories secundàries:** `Club de bàsquet`, `Organitzador d'esdeveniments`
- [ ] **Adreça:** Av. Diagonal 208, 08018 Barcelona (Westfield Glòries)
- [ ] **Àrea de servei:** Barcelona ciutat + àrea metropolitana
- [ ] **Telèfon:** +34 698 425 153
- [ ] **Web:** https://cbgrupbarna-3x3timechamber.com
- [ ] **Hores:** "Per esdeveniment". Marca el 6-7 juny 2026 com a horari especial 9:00-21:00.
- [ ] **Foto perfil:** logo del club (`/public/images/cb-grup-barna.jpg`)
- [ ] **Foto portada:** `/public/images/hero-edicio-anterior.jpg`
- [ ] **Galeria:** afegeix totes les imatges de `/public/images/` (8 fotos).
- [ ] **Descripció (750 chars):**
  ```
  CB Grup Barna organitza el 3×3 Westfield Glòries, el torneig oficial FIBA 3×3 més gran del Clot-Glòries de Barcelona. La 4ª edició es disputa els 6 i 7 de juny 2026 a 3 seus del barri (Westfield Glòries, La Nau del Clot, Rambleta del Clot) amb 100 equips i 10 categories des d'Escola fins a Veterans, més la categoria inclusiva Màgics. Premis: 2.400€ de prize money (Sèniors M/F i Veterans M/F) + premis dels comerços d'Eix Clot per a tots els equips. Punts FIBA 3×3 oficials a la categoria Sèniors. Inscripcions a cbgrupbarna-3x3timechamber.com.
  ```
- [ ] **Verificació:** Google enviarà una postal o un PIN per SMS. La rebràs en 5-7 dies.
- [ ] Quan estigui verificat, crea un **Post** (tipus "Event") amb data 6-7 juny 2026, foto del cartell i CTA "Inscriu-te" → enllaç a la web.

</details>

---

## 6. Resend (transactional email) · ✅ JA TENS COMPTE

> Tens compte actiu a Resend. El backend ja està refactoritzat per usar-lo amb fallback automàtic a MailApp. **Veure document separat: `RESEND-SETUP.md` al root del repo.**

### Passos ràpids

- [x] Compte Resend creat ✅
- [ ] Verificar domini (`grupbarna.info` o equivalent) — afegir 3 registres DNS
- [ ] Generar API key amb permís "Sending access"
- [ ] Enganxar `RESEND_API_KEY` i `RESEND_FROM` a Apps Script Script Properties
- [ ] Test: fer una inscripció de prova i verificar que l'email arriba sense passar per spam

Quan estiguin les 2 Script Properties, **TOTS** els emails del backend van via Resend automàticament. Sense canvis de codi.


---

## 5. (Opcional) Setup `clasp` per fer push automàtic d'Apps Script

**Per què cal:** Si actives això, cada vegada que actualitzo Code.gs al repo no caldrà que ho enganxis manualment a Apps Script — un `clasp push` ho fa des del terminal.

### Passos

- [ ] Activa el toggle a https://script.google.com/home/usersettings (cal una vegada · 30 segons).
- [ ] Al teu mac, dins de `/Users/ana/WEB 3X3/apps-script`:
  ```bash
  npm install -g @google/clasp
  clasp login
  clasp pull   # baixa el projecte actual i crea .clasp.json
  ```
- [ ] Comprova que `.clasp.json` apareix al directori.
- [ ] A partir d'ara, cada vegada que jo actualitzi Code.gs o Triggers.gs:
  ```bash
  cd apps-script && clasp push
  ```
  (Si vols, ho podem afegir a una GitHub Action perquè es faci sol al fer push a main.)

---

## Enllaços ràpids

- **Web live:** https://cbgrupbarna-3x3timechamber.com
- **Repo:** https://github.com/voluntarisgrupbarna-pixel/3x3-westfield-grupbarna-timechamber
- **GH Pages config:** Settings → Pages
- **Secrets:** Settings → Secrets and variables → Actions
- **Apps Script editor:** https://script.google.com/home
- **Cloudflare Worker:** https://dash.cloudflare.com (compte `cbgrupbarna`) → Workers & Pages → `og-3x3-glories`

---

## Suport

Si algun pas no funciona, fes una captura del que veus i envia-me-la — soluciono al següent torn. **No avancis amb workarounds** que puguin trencar producció (per exemple: NO modifiquis manualment URLs de webhook si no et dic com).

---

## Pre-llançament 2026 — Bateria de proves del formulari (2026-05-07)

Cal completar TOT el següent abans d'obrir inscripcions al públic. Marca cada test quan passi en local (`npm run dev`). Si algun falla → fix → re-test.

### Validacions (Pas 1-3)

- [ ] **T01** Pas 1: deixa el nom d'equip buit i prem "Següent" → ha d'aparèixer "El nom de l'equip ha de tenir almenys 2 caràcters".
- [ ] **T02** Pas 1: tria mida d'equip de 4 → l'array de jugadors al pas 3 mostra exactament 3 (capità + 3). Tria 5 → mostra 4.
- [ ] **T03** Pas 2: introdueix data de naixement < 18 anys com a capità → apareixen els camps obligatoris de tutor.
- [ ] **T04** Pas 3: deixa la talla del jugador 2 buida i avança → error "Selecciona talla".

### Gate viral (resilient)

- [ ] **T05** Al gate, clica "Compartir per WhatsApp" → s'obre wa.me en pestanya nova → torna a la pestanya original → mostra "✓ Compartit" persistit.
- [ ] **T05b** Tanca la pestanya completament després de compartir (Cmd+W) → torna a obrir `/inscripcion` → el progrés del gate segueix desat (gràcies a localStorage `3x3_gate_state_v1`).
- [ ] **T06** Clica el botó "**No vull descompte — continuar al preu complet**" → entres directament al formulari, `descInvitacions=false`, `gateState=skipped`.

### Pas 4 — Pagament + samarretes extra

- [ ] **T07** Afegeix 3 samarretes addicionals (talles M/L/XL) → el total puja exactament `base + 75€`. Els descomptes s'apliquen només sobre `base`.
- [ ] **T08** Codi `3X3AVIAT` + 5 amics + IG → veuràs `-5%` i `-10%` (sobre quota base; ordre: base − 5% − 10% + extras).
- [ ] **T09** Adjunta un PDF de 9 MB → toast "Justificant massa gran". Mai s'envia.
- [ ] **T10** Adjunta un PDF de 2 MB → es codifica a base64 i s'envia al webhook (Apps Script el puja a Drive).

### Pas 5 — Bases / cancel·lació

- [ ] **T11** Deixa `acceptaCancellacio` desmarcat i prem "Enviar Inscripció" → error "Has d'acceptar la política de cancel·lació".

### Submit + backend

- [ ] **T12** Submit complet → el webhook rep payload amb `samarretesExtra: [...]`, `total`, `concepte: "3X3+TEST_TEAM"`. Comprova al Sheet "Inscripcions 2026" que les noves columnes "Samarretes extra", "Talles extra" i "Pagament estat" s'omplen.

### QR check-in (post-submit)

- [ ] **T13** Escaneja el QR descarregat → la URL `/checkin?...` inclou `talles=M-L-XL-S|XL-XL`, `extras=2`, `total=140.00`, `pag=pendent`.

### QR EPC (transferència)

- [ ] **T14** Escaneja el QR del pagament amb una app de banc real → preomplena IBAN `ES2501821797300203878558`, import correcte i concepte `3X3+TEST_TEAM`.

### Mobile

- [ ] **T15** DevTools → 375×667 (iPhone SE) → tot el formulari accessible sense overflow horitzontal. Botons del gate full-width. Resum del pas 5 sense scroll estrany.

Quan tots 15 estan verds → `git push origin main` → CI desplega → hard-reload (`Cmd+Shift+R`) cbgrupbarna-3x3timechamber.com per verificar producció.

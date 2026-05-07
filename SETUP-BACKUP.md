# Setup del backup paranoid

Pipeline que escriu cada inscripció a 4 destins simultanis (a part del Sheet i Fillout que ja existien):

1. **JSON al teu repo GitHub privat** — `data/inscripcions-2026.json` (append per commit).
2. **GitHub Issues** — un issue per inscripció amb labels per categoria/pagament.
3. **BCC a una bústia d'arxiu** — l'email de notificació es duplica.
4. **WhatsApp via Brevo** — notificació al telèfon del club.
5. **Backup setmanal a Drive personal** — Sheet + tots els justificants.

Si Apps Script falla algun d'aquests destins, **NO trenca la inscripció**: el flux original (Sheet + Fillout + emails) segueix funcionant.

---

## Què has de fer tu (un sol cop)

### 1. GitHub Personal Access Token (PAT)

Necessari per a `writeToGitHubJson_` i `createGitHubIssue_`.

1. Vés a https://github.com/settings/personal-access-tokens
2. **"Generate new token" → "Fine-grained token"**
3. Configuració:
   - **Token name:** `3x3-backup`
   - **Expiration:** 1 year (o "no expiration" si t'estimes més no haver-ho de renovar)
   - **Repository access:** "Only select repositories" → tria el repo del 3x3 (o un repo NOU privat dedicat només a backups, més net)
   - **Permissions → Repository permissions:**
     - **Contents:** Read and write
     - **Issues:** Read and write
     - **Metadata:** Read-only (auto)
4. Genera i copia el token (comença per `github_pat_...`).
5. **Crea un segon PAT read-only** per a la pàgina staff (només "Contents: Read"). Aquest és el que enganxaràs al login de `/staff` quan vagis a buscar equips.

### 2. Bústia Gmail d'arxiu

Crea (si no la tens) una adreça **del teu Gmail personal** (no del club): per exemple `voluntarisarxiu@gmail.com`. Servirà només per rebre còpies BCC. No la facis servir per a res més.

### 3. Brevo WhatsApp template

Si encara no en tens cap, al panell de Brevo (compte ja existent del club, vegeu `cbgrupbarna-comms`):

1. **Conversations → WhatsApp → Templates → Create template**
2. **Name:** `inscripcio_3x3`
3. **Language:** Catalan
4. **Content:**
   ```
   Nova inscripció 3x3: {{params.equip}} ({{params.categoria}})
   Capità: {{params.capita}}
   Total: {{params.total}}
   Team ID: {{params.teamid}}
   ```
5. Submet a Meta per aprovació (~hores). Quan estigui aprovat, copia el **Template ID** (numèric).

### 4. Carpeta Drive personal per al backup setmanal

Crea una carpeta al teu Drive personal (compte personal, no del club): per exemple `3x3-Backups`. Comparteix-la amb permís d'edició amb el compte del club. Apunta el **Folder ID** (és el que va després de `/folders/` a la URL).

### 5. Apps Script — Script Properties

Vés a https://script.google.com/d/1u1tBzm6fUy3hcSV81muUO7nJ729pAPB3DxqYNSCFAVVo5kBE_0-gy-iG/edit → **Project Settings → Script properties → Add property** per cada una:

| Property | Valor |
|---|---|
| `GITHUB_TOKEN` | el PAT read+write generat al pas 1 |
| `GITHUB_BACKUP_REPO` | `voluntarisgrupbarna-pixel/3x3-westfield-grupbarna-timechamber` (o el repo dedicat) |
| `GITHUB_BACKUP_PATH` | `data/inscripcions-2026.json` |
| `GITHUB_BACKUP_BRANCH` | `main` |
| `ARCHIVE_BCC_EMAIL` | la bústia d'arxiu del pas 2 |
| `BREVO_API_KEY` | api key del compte Brevo del club |
| `BREVO_WHATSAPP_TEMPLATE` | l'ID numèric del template del pas 3 |
| `BREVO_WHATSAPP_TO` | `+34688265230` (telèfon del club) |
| `BREVO_WHATSAPP_FROM` | el sender ID/name de Brevo (mira el dashboard de Brevo) |
| `PERSONAL_DRIVE_FOLDER_ID` | l'ID de la carpeta del pas 4 |

### 6. Apps Script — Codi i deploy

1. Copia el contingut sencer de `apps-script/Code.gs` d'aquest repo.
2. Enganxa'l al teu projecte Apps Script (substitueix tot el contingut).
3. **Save** (Cmd+S).
4. **Deploy → Manage deployments → ✏️ → New version → Deploy.**
   - La URL del webhook segueix sent la mateixa.

### 7. Apps Script — Time trigger setmanal

1. Al projecte Apps Script: **Triggers (rellotge a l'esquerra) → Add Trigger.**
2. Configuració:
   - **Function:** `weeklyBackupToPersonalDrive_`
   - **Event source:** Time-driven
   - **Type:** Week timer
   - **Day:** Sunday
   - **Time:** 3am to 4am
3. **Save.**

### 8. (Opcional) Re-injectar inscripcions antigues al JSON GitHub

Una sola vegada, des de l'Apps Script editor:

1. Selecciona la funció `replayLastNInscripcionsToGitHub_` al desplegable.
2. Click **Run**. (Si demana permisos, autoritza.)
3. Llegeix els logs (View → Executions) per veure quantes s'han re-injectat.

Per defecte injecta les últimes 100. Edita el codi si vols més (`replayLastNInscripcionsToGitHub_(500)`).

### 9. Frontend — Secrets de GitHub Actions

Al repo del 3x3 a github.com → **Settings → Secrets and variables → Actions → New repository secret** per cada una:

| Secret | Valor |
|---|---|
| `VITE_BACKUP_REPO` | mateix valor que `GITHUB_BACKUP_REPO` |
| `VITE_BACKUP_PATH` | `data/inscripcions-2026.json` |
| `VITE_BACKUP_BRANCH` | `main` |
| `VITE_STAFF_PASSWORD_HASH` | SHA-256 del password staff. Genera amb: `echo -n "elteupassword" \| shasum -a 256` (només la part hex de l'output) |

**Push** a `main` perquè GitHub Actions desplegui amb els nous secrets.

### 10. Verifica

Quan tot estigui configurat:

1. Fes una inscripció de prova al formulari live.
2. Comprova:
   - Email rebut al teu Gmail principal **i** a la bústia d'arxiu.
   - Notificació WhatsApp al +34688265230.
   - Apareix una nova entrada al JSON del repo (mira-ho a github.com → repo → `data/inscripcions-2026.json`).
   - Apareix un Issue nou amb labels.
   - Sheet i Fillout segueixen rebent com sempre.
3. Vés a `/staff` al site, posa el password, enganxa el PAT read-only del pas 1, i comprova que pots cercar l'equip de prova.

---

## En cas de problema

- **Inscripció es perd silenciosament a un destí:** mira **Apps Script → Executions** per veure el log de la crida fallida. El missatge diu què ha fallat (no_configured, http_403, etc.).
- **WhatsApp no arriba:** Brevo template ha d'estar aprovat per Meta. Si està rebutjat, el missatge tampoc no surt.
- **GitHub commit falla amb 409:** dues inscripcions simultànies van xocar al SHA. Apps Script reintentarà a la propera inscripció. Es pot fer `replayLastNInscripcionsToGitHub_(5)` per reinjectar les que s'hagin perdut.
- **Pàgina staff diu "El token no és vàlid":** el PAT ha caducat. Crea'n un de nou al pas 1.

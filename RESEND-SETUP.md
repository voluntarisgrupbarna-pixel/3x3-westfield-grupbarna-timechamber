# Resend setup · 3×3 Westfield Glòries

Tens compte Resend. El backend ja està preparat per usar-lo: només has de **verificar el domini** + **generar API key** + **enganxar 2 Script Properties a Apps Script**. 5 minuts.

---

## 1. Verificar domini a Resend

A https://resend.com/domains → **Add Domain** → escriu `grupbarna.info` (o el domini que vulguis usar com a remitent).

Resend et dóna 3 registres DNS (TXT i CNAME). Has d'afegir-los al panell del teu DNS:

- Si el domini està a **Cloudflare** (com cbgrupbarna-3x3timechamber.com): dashboard → DNS → Add record → copia/enganxa cada un dels 3.
- Si el domini està a **GoDaddy / Namecheap / un altre**: panell DNS de l'host i afegeix-los igual.

Espera 5-30 min, torna a Resend i clica **Verify**. Quan els 3 ticks siguin verds, el domini està llest.

> Si no vols verificar domini propi, pots usar el remitent gratuït `onboarding@resend.dev` per fer proves — però els emails arribaran a spam. Sempre cal domini verificat per producció.

---

## 2. Generar API key

A https://resend.com/api-keys → **Create API Key** → nom `3x3-westfield-glories` → permission `Sending access` → copia la key (comença per `re_...`). Després **no la podràs tornar a veure** (només una vegada).

---

## 3. Configurar a Apps Script

Obre el teu projecte Apps Script (https://script.google.com/home → 3x3-grupbarna-backend) → **⚙ Project Settings** → secció **Script Properties** → **Add script property**:

| Property | Value |
|---|---|
| `RESEND_API_KEY` | `re_AbCdEfGh...` (la key del pas 2) |
| `RESEND_FROM` | `3x3 Westfield Glòries <noreply@grupbarna.info>` |

Save. **Listo** — la propera inscripció enviarà emails via Resend automàticament. Sense canvis de codi.

> El backend té fallback automàtic: si Resend retorna error o la key és invàlida, cau a MailApp (l'envasament actual) sense perdre cap email. Els errors de Resend queden loggats a "Executions" del panell d'Apps Script.

---

## 4. Verificar que funciona

- **Test ràpid:** fes una inscripció de prova a `/inscripcion` amb una email teva i un equip fictici. Mira la safata d'entrada — si arriba sense passar per spam i amb el remitent `noreply@grupbarna.info`, Resend funciona.
- **Dashboard Resend:** a https://resend.com/emails veuràs cada email enviat amb estat (delivered, bounced, opened, clicked).
- **Logs Apps Script:** si veus `Resend error 401` o similar a Executions, la key no té format correcte o no té permisos.

---

## 5. (Opcional) Migrar emails de premsa també a Resend

Els 7 drafts de premsa que t'he creat estan a Gmail. Si prefereixes enviar-los des de Resend (millor per a campanyes/tracking), pots:

1. Anar a Resend → **Audiences** → crear audiència "Premsa BCN".
2. Importar contactes (CSV amb les 7 adreces).
3. Crear una campanya amb el cos d'un dels emails (assumpte + html).

Però per a un volum d'1-7 emails, el flux Gmail manual és més ràpid. Resend val la pena per als emails massius (inscriptors blog, capitans inscrits, etc.).

---

## Quins emails passen a Resend automàticament?

Quan tinguis configurades les 2 Script Properties, **TOTS** els emails del backend hi passen:

- ✅ Confirmació d'inscripció al capità (amb QR adjunt)
- ✅ Notificació admin de nova inscripció
- ✅ Confirmació de subscripció al blog
- ✅ Confirmació de llista d'espera
- ✅ Notificació de nou lead WhatsApp a admin
- ✅ Reminder T-7 als capitans
- ✅ Reminder T-1 als capitans
- ✅ Email post-event als capitans
- ✅ Notificació de nou blog post als subscriptors

Si la key falla, fallback automàtic a MailApp. Cap email es perd.

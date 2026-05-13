import { z } from "zod";

/* ─── Constants ─── */
export const TALLAS = ["8-10","12-14","16","XS","S","M","L","XL","XXL"];

export const GENERES = ["Femení","Masculí"] as const;

export const PRECIO_GEN_4 = 75; // Categories formatives · 4 jugadors
export const PRECIO_GEN_5 = 90; // Categories formatives · 5 jugadors
export const PRECIO_SENIOR_4 = 85; // Sèniors/Veterans · 4 jugadors
export const PRECIO_SENIOR_5 = 105; // Sèniors/Veterans · 5 jugadors

export const COD_DESC = "3X3AVIAT";
export const IBAN = "ES25 0182 1797 3002 0387 8558";
export const BENEFICIARI = "CB Grup Barna";

/* Samarreta addicional (a part de la inclosa per jugador) */
export const PRECIO_CAMISETA_EXTRA = 25;

/* Early-bird 10% — s'aplica automàticament a tota inscripció abans d'aquesta data.
Acumulable amb el gate viral (+5%) fins a un màxim de 15%. */
export const EARLY_BIRD_END = new Date("2026-05-20T23:59:59+02:00");
export function isEarlyBirdActive(now: Date = new Date()): boolean {
     return now < EARLY_BIRD_END;
}

/* ─── Pure helpers (no DOM, no network) ─── */

/* Normalitza un nom d'equip per detectar duplicats al frontend.
Coincideix EXACTAMENT amb `normalizeTeamName_` a apps-script/Code.gs. */
export function normalizeTeamName(s: string | undefined): string {
     return String(s || "")
       .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
       .toLowerCase()
       .replace(/\s+/g, " ")
       .trim();
}

/* Genera fins a 3 suggeriments de variants del nom quan ja està registrat.
Estratègia: <Nom> 2 (incremental fins trobar lliure) · <Nom> BCN · <Nom> 2026.
`taken` és un Set de noms ja normalitzats. */
export function genNameSuggestions(base: string, taken: Set<string>): string[] {
     const clean = (base || "").trim().replace(/\s+/g, " ");
     if (!clean) return [];
     const out: string[] = [];
     // Variant 1: número incremental
  for (let n = 2; n <= 9; n++) {
         const v = `${clean} ${n}`;
         if (!taken.has(normalizeTeamName(v))) { out.push(v); break; }
  }
     // Variant 2: sufix BCN
  const v2 = `${clean} BCN`;
     if (!taken.has(normalizeTeamName(v2)) && !out.includes(v2)) out.push(v2);
     // Variant 3: any 2026
  const v3 = `${clean} 2026`;
     if (!taken.has(normalizeTeamName(v3)) && !out.includes(v3)) out.push(v3);
     // Si encara en falta algun, afegim "Team <Nom>"
  if (out.length < 3) {
         const v4 = `Team ${clean}`;
         if (!taken.has(normalizeTeamName(v4)) && !out.includes(v4)) out.push(v4);
  }
     return out.slice(0, 3);
}

export function isSeniorCat(cat: string | undefined): boolean {
     if (!cat) return false;
     return /^(Sèniors|Sèniors|Senior|Veterans)/i.test(cat);
}

export function precioByCat(cat: string | undefined, mida: string): number {
     const senior = isSeniorCat(cat);
     if (mida === "5") return senior ? PRECIO_SENIOR_5 : PRECIO_GEN_5;
     return senior ? PRECIO_SENIOR_4 : PRECIO_GEN_4;
}

/* Concepte únic per identificar la transferència */
export function buildConcepte(nomEquip: string | undefined): string {
     const clean = (nomEquip || "EQUIP").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
     return `3X3+${clean}`;
}

/* Genera un team ID determinístic curt per al check-in QR.
Format: <slug-nom>-<base36-timestamp> (ex: "tigers-bcn-mfp4z2") */
export function buildTeamId(nomEquip: string | undefined): string {
     const slug = String(nomEquip || "equip").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24).toLowerCase();
     const tsBase36 = Math.floor(Date.now() / 1000).toString(36);
     return `${slug}-${tsBase36}`;
}

/* EPC QR (EPC069-12 v002) — escanejable amb qualsevol app de banc UE per pre-omplir transferència */
export function buildEpcQr(amount: number, nomEquip: string | undefined): string {
     const ibanClean = IBAN.replace(/\s/g, "");
     return [
            "BCD", // service tag
            "002", // version
            "1",   // charset UTF-8
            "SCT", // SEPA credit transfer
            "",    // BIC (opcional dins UE)
            BENEFICIARI, // beneficiari
            ibanClean,   // IBAN
            `EUR${amount.toFixed(2)}`, // import
            "",    // purpose
            "",    // structured reference
            buildConcepte(nomEquip), // unstructured remittance info
          ].join("\n");
}

export type DiscountReason = "early-bird" | "early-bird+viral" | "viral" | "code5" | null;

export function calcTotal(
     mida: string,
     capCategoria: string | undefined,
     desc5pct: boolean,
     descInvite5pct: boolean = false,
     extraShirts: number = 0,
     earlyBird: boolean = false,
   ) {
     const base = precioByCat(capCategoria, mida);
     // Els descomptes s'apliquen sobre la quota base (no sobre samarretes extra).
     // Early Bird (10%) i viral (5%) SÓN ACUMULABLES — màxim 15%.
     // El codi 3X3AVIAT (5%) és exclusiu: només s'aplica si no hi ha EB ni viral.
     let desc5 = 0;
     let desc10 = 0;
     let reason: DiscountReason = null;
     if (earlyBird && descInvite5pct) {
            desc10 = Math.round(base * 10) / 100;
            desc5  = Math.round(base * 5)  / 100;
            reason = "early-bird+viral";
     } else if (earlyBird) {
            desc10 = Math.round(base * 10) / 100;
            reason = "early-bird";
     } else if (descInvite5pct) {
            desc5  = Math.round(base * 5)  / 100;
            reason = "viral";
     } else if (desc5pct) {
            desc5  = Math.round(base * 5)  / 100;
            reason = "code5";
     }
     const extras = Math.max(0, Math.floor(extraShirts)) * PRECIO_CAMISETA_EXTRA;
     const total = Math.max(0, base - desc5 - desc10) + extras;
     return { base, desc5, desc10, extras, total, reason };
}

/* ─── Zod Schema (missatges en català perquè el form ho és) ───
`required_error` cobreix els casos en què react-hook-form encara no ha
registrat el camp i el valor és `undefined` (sinó Zod retornaria el genèric
"Required" en anglès). `min`/`email` cobreixen valors presents però invàlids. */
const reqStr = (msg: string) => z.string({ required_error: msg, invalid_type_error: msg });

export const jugSchema = z.object({
     nom:      reqStr("Nom mínim 2 caràcters").min(2, "Nom mínim 2 caràcters"),
     cognom:   reqStr("Cognoms mínim 2 caràcters").min(2, "Cognoms mínim 2 caràcters"),
     email:    reqStr("Email no vàlid").email("Email no vàlid"),
     telefon:  reqStr("Telèfon mínim 9 dígits").min(9, "Telèfon mínim 9 dígits"),
     dataNaix: reqStr("Indica la data de naixement").min(1, "Indica la data de naixement"),
     // categoria obligatòria per a tots els jugadors
     categoria: reqStr("Selecciona categoria").min(1, "Selecciona categoria"),
     talla:    reqStr("Selecciona talla").min(1, "Selecciona talla"),
     club:     reqStr("Indica el club o escriu 'Sense club'").min(2, "Indica el club o escriu 'Sense club'"),
     campusClub:      reqStr("Indica el campus o club d'origen").min(2, "Mínim 2 caràcters"),
     seniorCategoria: z.string().optional(),
});

export const schema = z.object({
     nomEquip: reqStr("El nom de l'equip ha de tenir almenys 2 caràcters")
       .min(2, "El nom de l'equip ha de tenir almenys 2 caràcters")
       .max(40, "El nom de l'equip ha de ser de màxim 40 caràcters"),
     midaEquip: z.enum(["4","5"], {
            required_error: "Selecciona la mida de l'equip",
            invalid_type_error: "Selecciona la mida de l'equip",
     }),
     // Capità (jugador 1)
     capNom:       reqStr("Nom mínim 2 caràcters").min(2, "Nom mínim 2 caràcters"),
     capCognom:    reqStr("Cognoms mínim 2 caràcters").min(2, "Cognoms mínim 2 caràcters"),
     capEmail:     reqStr("Email no vàlid").email("Email no vàlid"),
     capTelefon:   reqStr("Telèfon mínim 9 dígits").min(9, "Telèfon mínim 9 dígits"),
     capDataNaix:  reqStr("Indica la data de naixement").min(1, "Indica la data de naixement"),
     capCategoria: reqStr("Selecciona categoria").min(1, "Selecciona categoria"),
     capGenere:    reqStr("Selecciona el gènere de l'equip").min(1, "Selecciona el gènere de l'equip"),
     capTalla:     reqStr("Selecciona talla").min(1, "Selecciona talla"),
     capClub:      reqStr("Indica el club o escriu 'Sense club'").min(2, "Indica el club o escriu 'Sense club'"),
     capPoblacio:  reqStr("Indica la teva població o barri").min(2, "Indica la teva població o barri"),
     capCampusClub:      reqStr("Indica el campus o club d'origen").min(2, "Mínim 2 caràcters"),
     capSeniorCategoria: z.string().optional(),
     tutorNom:     z.string().optional(),
     tutorCognom:  z.string().optional(),
     tutorTelefon: z.string().optional(),
     // Jugadors 2-5
     jugadors: z.array(jugSchema),
     // Extras
     comentaris:  z.string().optional(),
     codiDesc:    z.string().optional(),
     // Foto de l'equip o del capità (opcional). Data URL JPEG comprimit client-side.
     equipFoto:   z.string().optional(),
     // Samarretes addicionals (+25€ cadascuna, talla individual). Sense límit superior.
     samarretesExtra: z.array(z.object({ talla: z.string().min(1, "Selecciona talla") })).default([]),
     // Legal
     acceptaBases:      z.boolean().refine(v => v === true, "Has d'acceptar les bases"),
     acceptaLopd:       z.boolean().refine(v => v === true, "Has d'acceptar la política de dades"),
     acceptaImatge:     z.boolean().refine(v => v === true, "Has d'acceptar els drets d'imatge"),
     acceptaCancellacio: z.boolean().refine(v => v === true, "Has d'acceptar la política de cancel·lació"),
}).superRefine((data, ctx) => {
     if (isSeniorCat(data.capCategoria) && !data.capSeniorCategoria?.trim()) {
          ctx.addIssue({ code: "custom", path: ["capSeniorCategoria"], message: "Indica la categoria en sèniors" });
     }
     data.jugadors?.forEach((j, i) => {
          if (isSeniorCat(j.categoria) && !j.seniorCategoria?.trim()) {
               ctx.addIssue({ code: "custom", path: ["jugadors", i, "seniorCategoria"], message: "Indica la categoria en sèniors" });
          }
     });
});

export type FD = z.infer<typeof schema>;

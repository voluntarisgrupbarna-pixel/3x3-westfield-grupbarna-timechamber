import { z } from "zod";

/* ─── Constants ─── */
export const TALLAS = ["8-10","12-14","16","XS","S","M","L","XL","XXL"];

export const PRECIO_GEN_4    = 75;   // Categories formatives · 4 jugadors
export const PRECIO_GEN_5    = 90;   // Categories formatives · 5 jugadors
export const PRECIO_SENIOR_4 = 85;   // Sèniors/Veterans · 4 jugadors
export const PRECIO_SENIOR_5 = 105;  // Sèniors/Veterans · 5 jugadors

export const COD_DESC    = "3X3AVIAT";
export const IBAN        = "ES25 0182 1797 3002 0387 8558";
export const BENEFICIARI = "CB Grup Barna";

/* Samarreta addicional (a part de la inclosa per jugador) */
export const PRECIO_CAMISETA_EXTRA = 25;

/* ─── Pure helpers (no DOM, no network) ─── */
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
    "BCD",                          // service tag
    "002",                          // version
    "1",                            // charset UTF-8
    "SCT",                          // SEPA credit transfer
    "",                             // BIC (opcional dins UE)
    BENEFICIARI,                    // beneficiari
    ibanClean,                      // IBAN
    `EUR${amount.toFixed(2)}`,      // import
    "",                             // purpose
    "",                             // structured reference
    buildConcepte(nomEquip),        // unstructured remittance info
  ].join("\n");
}

export function calcTotal(
  mida: string,
  capCategoria: string | undefined,
  desc5pct: boolean,
  descInvite10pct: boolean = false,
  extraShirts: number = 0,
) {
  const base = precioByCat(capCategoria, mida);
  // Els descomptes només s'apliquen sobre la quota base de l'equip,
  // no sobre les samarretes extra (que es facturen a 25€/u sense descompte).
  const desc5  = desc5pct        ? Math.round(base *  5) / 100 : 0;
  const desc10 = descInvite10pct ? Math.round(base * 10) / 100 : 0;
  const extras = Math.max(0, Math.floor(extraShirts)) * PRECIO_CAMISETA_EXTRA;
  const total = Math.max(0, base - desc5 - desc10) + extras;
  return { base, desc5, desc10, extras, total };
}

/* ─── Zod Schema (missatges en català perquè el form ho és) ───
   `required_error` cobreix els casos en què react-hook-form encara no ha
   registrat el camp i el valor és `undefined` (sinó Zod retornaria el genèric
   "Required" en anglès). `min`/`email` cobreixen valors presents però invàlids. */
const reqStr = (msg: string) => z.string({ required_error: msg, invalid_type_error: msg });

export const jugSchema = z.object({
  nom:      reqStr("Nom mínim 2 caràcters").min(2, "Nom mínim 2 caràcters"),
  cognom:   reqStr("Cognoms mínim 2 caràcters").min(2, "Cognoms mínim 2 caràcters"),
  email:    z.string().email("Email no vàlid").optional().or(z.literal("")),
  telefon:  z.string().min(9, "Telèfon mínim 9 dígits").optional().or(z.literal("")),
  dataNaix: z.string().optional(),
  categoria:z.string().optional(),
  talla:    reqStr("Selecciona talla").min(1, "Selecciona talla"),
  club:     reqStr("Indica el club o escriu 'Sense club'").min(2, "Indica el club o escriu 'Sense club'"),
});

export const schema = z.object({
  nomEquip:  reqStr("El nom de l'equip ha de tenir almenys 2 caràcters")
                .min(2, "El nom de l'equip ha de tenir almenys 2 caràcters"),
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
  capTalla:     reqStr("Selecciona talla").min(1, "Selecciona talla"),
  capClub:      reqStr("Indica el club o escriu 'Sense club'").min(2, "Indica el club o escriu 'Sense club'"),
  capPoblacio:  z.string().optional(),
  tutorNom:     z.string().optional(),
  tutorCognom:  z.string().optional(),
  tutorTelefon: z.string().optional(),
  // Jugadors 2-5
  jugadors: z.array(jugSchema),
  // Extras
  comentaris:   z.string().optional(),
  codiDesc:     z.string().optional(),
  // Foto de l'equip o del capità (opcional). Data URL JPEG comprimit client-side.
  equipFoto:    z.string().optional(),
  // Samarretes addicionals (+25€ cadascuna, talla individual). Sense límit superior.
  samarretesExtra: z.array(z.object({ talla: z.string().min(1, "Selecciona talla") })).default([]),
  // Legal
  acceptaBases:        z.boolean().refine(v => v === true, "Has d'acceptar les bases"),
  acceptaLopd:         z.boolean().refine(v => v === true, "Has d'acceptar la política de dades"),
  acceptaImatge:       z.boolean().refine(v => v === true, "Has d'acceptar els drets d'imatge"),
  acceptaCancellacio:  z.boolean().refine(v => v === true, "Has d'acceptar la política de cancel·lació"),
});

export type FD = z.infer<typeof schema>;

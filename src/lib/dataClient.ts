/**
 * Data client per a la pàgina staff.
 *
 * Font de dades: el JSON `inscripcions-2026.json` que Apps Script va
 * actualitzant a un repo GitHub privat (vegeu writeToGitHubJson_ a Code.gs).
 *
 * Autenticació:
 *   1. Password gate local (sha256 contra VITE_STAFF_PASSWORD_HASH).
 *   2. GitHub Personal Access Token (PAT) read-only que Ana enganxa al login.
 *      Es desa a localStorage per no haver de re-introduir-lo cada sessió.
 *      El PAT mai surt al bundle build — viu només al navegador d'Ana.
 *
 * Si el PAT caduca o és invàlid, la pàgina mostra error i demana renovar.
 */

const REPO = import.meta.env.VITE_BACKUP_REPO as string;
const PATH = (import.meta.env.VITE_BACKUP_PATH as string) || "data/inscripcions-2026.json";
const BRANCH = (import.meta.env.VITE_BACKUP_BRANCH as string) || "main";
const STAFF_PASSWORD_HASH = (import.meta.env.VITE_STAFF_PASSWORD_HASH as string) || "";

const PAT_KEY = "staff_gh_pat";
const PWD_OK_KEY = "staff_pwd_ok";

export type Inscripcio = {
  team_id: string;
  created_at: string;
  tipus: "equip" | "individual";
  nom_equip: string | null;
  capita: string | null;
  email: string | null;
  telefon: string | null;
  poblacio: string | null;
  categoria: string | null;
  jugadors: Array<Record<string, unknown>> | null;
  total: number | null;
  desc_aplicat: boolean;
  desc_invitacions: boolean;
  mida_samarretes: string | null;
  samarretes_extra: unknown;
  notes: string | null;
  checkin_url: string | null;
  justificant_drive_url: string | null;
  pagament_estat: string | null;
  raw_payload?: unknown;
};

export function getStaffPat(): string | null {
  return localStorage.getItem(PAT_KEY);
}
export function setStaffPat(pat: string) {
  localStorage.setItem(PAT_KEY, pat);
}
export function clearStaffSession() {
  localStorage.removeItem(PAT_KEY);
  sessionStorage.removeItem(PWD_OK_KEY);
}
export function isPasswordVerified(): boolean {
  return sessionStorage.getItem(PWD_OK_KEY) === "1";
}
function markPasswordVerified() {
  sessionStorage.setItem(PWD_OK_KEY, "1");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function staffLogin(password: string, pat: string): Promise<{ ok: boolean; error?: string }> {
  if (!STAFF_PASSWORD_HASH) {
    return { ok: false, error: "missing_password_hash" };
  }
  const hash = await sha256Hex(password);
  if (hash !== STAFF_PASSWORD_HASH) {
    return { ok: false, error: "invalid_password" };
  }
  if (!pat) return { ok: false, error: "missing_pat" };
  // Verifiquem el PAT amb una crida lleugera
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
    });
    if (r.status === 401 || r.status === 403) return { ok: false, error: "invalid_pat" };
    if (r.status === 404) return { ok: false, error: "repo_not_accessible" };
    if (!r.ok) return { ok: false, error: `http_${r.status}` };
  } catch {
    return { ok: false, error: "network" };
  }
  setStaffPat(pat);
  markPasswordVerified();
  return { ok: true };
}

let cache: { ts: number; data: Inscripcio[] } | null = null;
const CACHE_TTL_MS = 30_000; // 30s — durant el dia del torneig refresca sovint

async function fetchJson(): Promise<Inscripcio[]> {
  const pat = getStaffPat();
  if (!pat) throw new Error("no_pat");
  const url = `https://api.github.com/repos/${REPO}/contents/${PATH}?ref=${BRANCH}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`http_${r.status}`);
  const body = await r.json();
  const decoded = atob(body.content?.replace(/\n/g, "") ?? "");
  // GitHub torna UTF-8 en base64; per accents cal decode binary→utf8
  const utf8 = new TextDecoder().decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
  try {
    const arr = JSON.parse(utf8);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function loadInscripcions(force = false): Promise<Inscripcio[]> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;
  const data = await fetchJson();
  cache = { ts: Date.now(), data };
  return data;
}

export async function findByTeamId(teamId: string): Promise<Inscripcio | null> {
  const all = await loadInscripcions();
  return (
    all.find((x) => x.team_id === teamId || (x.checkin_url || "").includes(teamId)) || null
  );
}

export async function searchByText(q: string): Promise<Inscripcio[]> {
  const all = await loadInscripcions();
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return all.filter((x) => {
    return (
      (x.nom_equip || "").toLowerCase().includes(t) ||
      (x.capita || "").toLowerCase().includes(t) ||
      (x.email || "").toLowerCase().includes(t) ||
      (x.team_id || "").toLowerCase().includes(t)
    );
  });
}

export async function searchByPagament(opts: {
  amount?: number;
  from?: string;
  to?: string;
  ibanOrConcept?: string;
}): Promise<Inscripcio[]> {
  const all = await loadInscripcions();
  return all.filter((x) => {
    if (opts.amount != null && Math.abs((x.total || 0) - opts.amount) > 0.5) return false;
    if (opts.from && x.created_at && x.created_at.slice(0, 10) < opts.from) return false;
    if (opts.to && x.created_at && x.created_at.slice(0, 10) > opts.to) return false;
    if (opts.ibanOrConcept && !(x.notes || "").toLowerCase().includes(opts.ibanOrConcept.toLowerCase())) return false;
    return true;
  });
}

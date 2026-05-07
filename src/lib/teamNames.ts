import { useEffect, useRef, useState } from "react";
import { normalizeTeamName } from "@/pages/Inscripcion.logic";

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string) || "";

const CACHE_TTL_MS = 60_000;

type CacheEntry = { names: string[]; ts: number };
let memCache: CacheEntry | null = null;
let inFlight: Promise<string[]> | null = null;

async function fetchTeamNames(): Promise<string[]> {
  if (!GOOGLE_WEBHOOK) return [];
  if (memCache && Date.now() - memCache.ts < CACHE_TTL_MS) return memCache.names;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const url = `${GOOGLE_WEBHOOK}?action=names&_=${Date.now()}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const names = Array.isArray(json?.names) ? json.names.map((n: unknown) => String(n || "")) : [];
      memCache = { names, ts: Date.now() };
      return names;
    } catch (err) {
      console.warn("[teamNames] fetch failed (degraded mode):", err);
      return memCache?.names || [];
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export function invalidateTeamNamesCache() {
  memCache = null;
}

export type TeamNamesState = {
  names: string[];
  normalizedSet: Set<string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function useRegisteredTeamNames(): TeamNamesState {
  const [names, setNames] = useState<string[]>(() => memCache?.names || []);
  const [loading, setLoading] = useState<boolean>(!memCache);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTeamNames();
      if (mounted.current) setNames(list);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedSet = new Set(names.map(normalizeTeamName));

  return {
    names,
    normalizedSet,
    loading,
    error,
    refetch: async () => {
      invalidateTeamNamesCache();
      await load();
    },
  };
}

/* Verifica post-submit que el nom apareix a la llista. Polleja fins a `timeoutMs`. */
export async function verifyTeamRegistered(nomEquip: string, timeoutMs = 5000): Promise<boolean> {
  const target = normalizeTeamName(nomEquip);
  if (!target) return false;
  const start = Date.now();
  let delay = 800;
  while (Date.now() - start < timeoutMs) {
    invalidateTeamNamesCache();
    const list = await fetchTeamNames();
    if (list.some((n) => normalizeTeamName(n) === target)) return true;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 1500);
  }
  return false;
}

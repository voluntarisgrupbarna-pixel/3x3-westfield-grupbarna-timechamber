import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, QrCode, Receipt, LogOut, Loader2, AlertCircle, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isPasswordVerified, getStaffPat, clearStaffSession,
  type Inscripcio, searchByText, searchByPagament, findByTeamId, loadInscripcions,
} from "@/lib/dataClient";
import { decodeQrFromFile, extractTeamIdFromUrl } from "@/lib/qrDecoder";

type Tab = "text" | "qr" | "justificant";

export default function StaffCerca() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("text");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isPasswordVerified() || !getStaffPat()) navigate("/staff", { replace: true });
  }, [navigate]);

  function logout() {
    clearStaffSession();
    navigate("/staff", { replace: true });
  }

  async function refresh() {
    setRefreshing(true);
    await loadInscripcions(true).catch(() => {});
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link to="/staff/cerca" className="flex items-center gap-2 text-sm font-semibold">
          <Users className="w-4 h-4 text-red-500" /> Staff · Cerca d'equips
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={refresh} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1" title="Refresca el JSON">
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={logout} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sortir
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded-lg p-1 mb-4">
          {([
            { k: "text" as Tab, label: "Text", icon: Search },
            { k: "qr" as Tab, label: "QR", icon: QrCode },
            { k: "justificant" as Tab, label: "Pagament", icon: Receipt },
          ]).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition ${
                tab === k ? "bg-red-500 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "text" && <TextSearch />}
        {tab === "qr" && <QrSearch />}
        {tab === "justificant" && <JustificantSearch />}
      </div>
    </div>
  );
}

function TextSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Inscripcio[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function search() {
    setErr("");
    setLoading(true);
    try {
      const data = await searchByText(q);
      setResults(data);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Nom equip, capità, email o team ID"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
        />
        <Button onClick={search} disabled={loading} className="bg-red-500 hover:bg-red-600">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>
      {err && <ErrorBox msg={err} />}
      <ResultList rows={results} loading={loading} />
    </div>
  );
}

function QrSearch() {
  const [decoded, setDecoded] = useState<string | null>(null);
  const [results, setResults] = useState<Inscripcio[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState("");

  async function handleFile(file: File) {
    setErr("");
    setDecoded(null);
    setResults([]);
    setLoading(true);
    const text = await decodeQrFromFile(file);
    if (!text) {
      setLoading(false);
      setErr("No s'ha pogut llegir el QR. Prova el formulari manual.");
      return;
    }
    setDecoded(text);
    const teamId = extractTeamIdFromUrl(text);
    const found = await findByTeamId(teamId);
    setResults(found ? [found] : []);
    setLoading(false);
  }

  async function manualLookup() {
    if (!manual.trim()) return;
    setLoading(true); setErr("");
    try {
      const found = await findByTeamId(manual.trim());
      setResults(found ? [found] : []);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <div className="text-xs text-slate-400 mb-2">Puja una foto del QR (encara que estigui borrós)</div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:border-0 file:rounded-md file:bg-red-500 file:text-white file:cursor-pointer cursor-pointer text-slate-400"
        />
      </label>
      {loading && <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Llegint…</div>}
      {decoded && (
        <div className="text-xs text-emerald-400 break-all">QR llegit: <code>{decoded}</code></div>
      )}
      {err && <ErrorBox msg={err} />}
      <div className="border-t border-slate-800 pt-4">
        <div className="text-xs text-slate-400 mb-2">Si el QR no es llegeix, escriu el Team ID:</div>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && manualLookup()}
            placeholder="Team ID"
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
          />
          <Button onClick={manualLookup} disabled={loading} className="bg-slate-700 hover:bg-slate-600">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <ResultList rows={results} loading={false} />
    </div>
  );
}

function JustificantSearch() {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [iban, setIban] = useState("");
  const [results, setResults] = useState<Inscripcio[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function search() {
    setErr(""); setLoading(true);
    try {
      const data = await searchByPagament({
        amount: amount ? parseFloat(amount) : undefined,
        from: from || undefined,
        to: to || undefined,
        ibanOrConcept: iban || undefined,
      });
      setResults(data);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Import (€)" value={amount} onChange={setAmount} placeholder="75" type="number" />
        <Field label="IBAN/concepte conté" value={iban} onChange={setIban} placeholder="últims 4" />
        <Field label="Des de" value={from} onChange={setFrom} type="date" />
        <Field label="Fins a" value={to} onChange={setTo} type="date" />
      </div>
      <Button onClick={search} disabled={loading} className="w-full bg-red-500 hover:bg-red-600">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Cercar</>}
      </Button>
      {err && <ErrorBox msg={err} />}
      <ResultList rows={results} loading={loading} />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
      />
    </label>
  );
}

function ResultList({ rows, loading }: { rows: Inscripcio[]; loading: boolean }) {
  if (loading) return null;
  if (rows.length === 0) return <div className="text-xs text-slate-500 text-center py-8">Sense resultats</div>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.team_id}>
          <Link
            to={`/staff/equip/${encodeURIComponent(r.team_id)}`}
            className="block bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg p-3 transition"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-medium truncate">{r.nom_equip || "(sense nom)"}</div>
              <div className="text-xs text-slate-400">{r.total ?? 0} €</div>
            </div>
            <div className="text-xs text-slate-400 truncate">
              {r.capita} · {r.email} · <code className="text-slate-500">{r.team_id}</code>
            </div>
            <div className="text-[10px] text-slate-500 flex gap-2 mt-1">
              <span>{r.categoria}</span>
              <span>·</span>
              <span>{r.pagament_estat}</span>
              <span>·</span>
              <span>{r.created_at?.slice(0, 10)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="text-xs text-red-400 flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded p-2">
      <AlertCircle className="w-3 h-3 flex-shrink-0" /> {msg}
    </div>
  );
}

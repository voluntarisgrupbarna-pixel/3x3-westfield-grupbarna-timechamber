import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { ArrowLeft, ExternalLink, Loader2, AlertCircle, Download } from "lucide-react";
import { findByTeamId, isPasswordVerified, getStaffPat, type Inscripcio } from "@/lib/dataClient";

export default function StaffEquip() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<Inscripcio | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!isPasswordVerified() || !getStaffPat()) { navigate("/staff", { replace: true }); return; }
    if (!teamId) return;
    (async () => {
      try {
        const data = await findByTeamId(teamId);
        if (!data) { setErr("not_found"); setLoading(false); return; }
        setRow(data);
        if (data.checkin_url) {
          try {
            const png = await QRCode.toDataURL(data.checkin_url, { width: 320, margin: 2 });
            setQrDataUrl(png);
          } catch { /* ignore */ }
        }
      } catch (e) { setErr(String(e)); }
      setLoading(false);
    })();
  }, [teamId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-red-500" />
      </div>
    );
  }

  if (err || !row) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <div className="text-sm text-slate-400 mb-4">No s'ha trobat l'equip</div>
          <Link to="/staff/cerca" className="text-red-400 hover:text-red-300 text-sm">← Tornar a la cerca</Link>
        </div>
      </div>
    );
  }

  const jugadors = Array.isArray(row.jugadors) ? row.jugadors : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <Link to="/staff/cerca" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Cerca
        </Link>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold">{row.nom_equip}</h1>
            <code className="text-xs text-slate-500">{row.team_id}</code>
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
            <span>{row.categoria}</span>
            <span>· {row.tipus}</span>
            <span>· <Status value={row.pagament_estat} /></span>
            <span>· {row.total ?? 0} €</span>
            <span>· {row.created_at?.slice(0, 10)}</span>
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-sm">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Capità</h2>
          <Row label="Nom" value={row.capita} />
          <Row label="Email" value={row.email} mono />
          <Row label="Telèfon" value={row.telefon} mono />
          <Row label="Població" value={row.poblacio} />
          <Row label="Mida samarreta" value={row.mida_samarretes} />
          {row.notes && <Row label="Notes" value={row.notes} />}
        </section>

        {jugadors.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Jugadors ({jugadors.length})</h2>
            <ul className="text-sm space-y-1">
              {jugadors.map((j, i) => (
                <li key={i} className="text-slate-300">
                  {(j.nom as string) || "?"} {(j.cognom as string) || ""}
                  {j.email ? <span className="text-slate-500 text-xs"> · {String(j.email)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {qrDataUrl && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">QR de check-in</h2>
            <img src={qrDataUrl} alt="QR check-in" className="mx-auto bg-white p-2 rounded-lg" width={240} height={240} />
            <a
              href={qrDataUrl}
              download={`qr-${row.team_id}.png`}
              className="text-xs text-red-400 hover:text-red-300 mt-2 inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Descarregar QR
            </a>
            {row.checkin_url && (
              <div className="text-[10px] text-slate-500 mt-1 break-all">
                <a href={row.checkin_url} target="_blank" rel="noreferrer">{row.checkin_url}</a>
              </div>
            )}
          </section>
        )}

        {row.justificant_drive_url && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Justificant</h2>
            <a href={row.justificant_drive_url} target="_blank" rel="noreferrer" className="text-sm text-red-400 hover:text-red-300 inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Veure a Drive
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-xs text-slate-500 w-28 flex-shrink-0">{label}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{value}</div>
    </div>
  );
}

function Status({ value }: { value: string | null }) {
  const v = value ?? "Pendent";
  const cls = v === "Verificat" ? "text-emerald-400" : v === "Pendent" ? "text-amber-400" : "text-slate-400";
  return <span className={cls}>{v}</span>;
}

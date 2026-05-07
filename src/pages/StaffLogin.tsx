import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Loader2, AlertCircle, ArrowLeft, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffLogin, getStaffPat, isPasswordVerified } from "@/lib/dataClient";

export default function StaffLogin() {
  const [pwd, setPwd] = useState("");
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isPasswordVerified() && getStaffPat()) navigate("/staff/cerca", { replace: true });
    const existingPat = getStaffPat();
    if (existingPat) setPat(existingPat);
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await staffLogin(pwd, pat);
    setLoading(false);
    if (res.ok) {
      navigate("/staff/cerca", { replace: true });
      return;
    }
    const msg: Record<string, string> = {
      invalid_password: "Contrasenya incorrecta",
      missing_pat: "Falta el GitHub token",
      invalid_pat: "El GitHub token no és vàlid o ha caducat",
      repo_not_accessible: "El token no té accés al repo backup",
      missing_password_hash: "Falta configurar VITE_STAFF_PASSWORD_HASH al deploy",
      network: "Error de xarxa",
    };
    setError(msg[res.error || ""] || "Error: " + res.error);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="w-4 h-4" /> Tornar a la web
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Accés staff</h1>
              <p className="text-xs text-slate-400">Cerca interna d'inscripcions</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Contrasenya"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              disabled={loading}
            />
            <div>
              <label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                <Github className="w-3 h-3" /> GitHub token (PAT read-only del repo backup)
              </label>
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_... o github_pat_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                disabled={loading}
                autoComplete="off"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                El token es desa només al teu navegador. Crea'n un a github.com/settings/personal-access-tokens amb scope "Contents: read".
              </p>
            </div>
            {error && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </div>
            )}
            <Button type="submit" disabled={loading || !pwd || !pat} className="w-full bg-red-500 hover:bg-red-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

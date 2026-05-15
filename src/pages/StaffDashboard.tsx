import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { BarChart2, Users, Euro, TrendingUp, RefreshCw, ArrowLeft, LogOut, ExternalLink, ChevronDown, ChevronUp, Activity, Zap, AlertTriangle, Target, Copy, Check } from "lucide-react";
import {
  isPasswordVerified, getStaffPat, clearStaffSession,
  loadInscripcions, type Inscripcio,
  loadLeads, leadsNotRegistered, normalizePhone, type Lead,
} from "@/lib/dataClient";
import { CATEGORIES, TOTAL_CAPACITY } from "@/lib/categories";

type ActiveTab = "inscripcions" | "accions" | "trafic";

// Data del torneig — usada al càlcul del countdown a la pestanya Accions
const EVENT_DATE_ISO = "2026-06-06T09:00:00+02:00";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("inscripcions");
  const [inscripcions, setInscripcions] = useState<Inscripcio[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isPasswordVerified() || !getStaffPat()) {
      navigate("/staff", { replace: true });
      return;
    }
    fetchData(true);
  }, [navigate]);

  async function fetchData(force = false) {
    setRefreshing(true);
    try {
      const [inscData, leadsData] = await Promise.all([
        loadInscripcions(force),
        loadLeads(force).catch(() => []),
      ]);
      setInscripcions(inscData);
      setLeads(leadsData);
      setRefreshedAt(new Date());
      setError("");
    } catch {
      setError("Error carregant les dades. Comprova el PAT.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function logout() {
    clearStaffSession();
    navigate("/staff", { replace: true });
  }

  const metrics = useMemo(() => {
    const totalEquips = inscripcions.length;
    const totalJugadors = inscripcions.reduce(
      (acc, i) => acc + (Array.isArray(i.jugadors) ? i.jugadors.length : 0), 0
    );
    const totalIngressos = inscripcions.reduce((acc, i) => acc + (i.total ?? 0), 0);
    const pctOcupat = Math.round((totalEquips / TOTAL_CAPACITY) * 100);

    const byCategory = CATEGORIES.map(cat => ({
      name: cat.name,
      emoji: cat.emoji,
      quota: cat.quota,
      ocupat: inscripcions.filter(i => i.categoria === cat.name).length,
    }));

    const dateMap: Record<string, number> = {};
    for (const i of inscripcions) {
      if (!i.created_at) continue;
      const date = i.created_at.slice(0, 10);
      dateMap[date] = (dateMap[date] ?? 0) + 1;
    }
    let acumulat = 0;
    const timeline = Object.keys(dateMap)
      .sort()
      .map(date => {
        acumulat += dateMap[date];
        return { date: date.slice(5), acumulat };
      });

    const pagat = inscripcions.filter(i => i.pagament_estat === "pagat").length;
    const pendent = inscripcions.filter(
      i => i.pagament_estat !== "pagat" && !i.pagament_estat?.includes("cancel")
    ).length;
    const descAplicat = inscripcions.filter(i => i.desc_aplicat).length;
    const descInvitacions = inscripcions.filter(i => i.desc_invitacions).length;

    return {
      totalEquips, totalJugadors, totalIngressos, pctOcupat,
      byCategory, timeline, pagat, pendent, descAplicat, descInvitacions,
    };
  }, [inscripcions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/staff/cerca" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BarChart2 className="w-4 h-4 text-red-500" /> Dashboard 3x3 Glòries 2026
          </span>
        </div>
        <div className="flex items-center gap-3">
          {refreshedAt && (
            <span className="text-xs text-slate-500 tabular-nums">
              {refreshedAt.toLocaleTimeString("ca-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            title="Actualitzar dades"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white transition-colors"
            title="Sortir"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-800 px-4">
        <div className="flex gap-1 max-w-5xl mx-auto">
          <button
            onClick={() => setActiveTab("inscripcions")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "inscripcions"
                ? "border-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Inscripcions
          </button>
          <button
            onClick={() => setActiveTab("accions")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "accions"
                ? "border-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Accions
          </button>
          <button
            onClick={() => setActiveTab("trafic")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "trafic"
                ? "border-red-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Tràfic web
          </button>
        </div>
      </div>

      {activeTab === "accions" && <AccionsTab byCategory={metrics.byCategory} totalEquips={metrics.totalEquips} leads={leads} inscripcions={inscripcions} />}
      {activeTab === "trafic" && <TraficWebTab />}

      {activeTab === "inscripcions" && (
      <div className="max-w-5xl mx-auto p-4 space-y-5 pb-12">
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Equips inscrits"
            value={String(metrics.totalEquips)}
            sub={`de ${TOTAL_CAPACITY} places`}
            icon={<Users className="w-4 h-4 text-red-400" />}
          />
          <KpiCard
            label="Jugadors totals"
            value={String(metrics.totalJugadors)}
            sub="amb samarretes"
            icon={<span className="text-base leading-none">👕</span>}
          />
          <KpiCard
            label="Ingressos"
            value={`${metrics.totalIngressos.toLocaleString("ca-ES")} €`}
            sub="registrats"
            icon={<Euro className="w-4 h-4 text-green-400" />}
          />
          <KpiCard
            label="Ocupació"
            value={`${metrics.pctOcupat}%`}
            sub={
              <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(metrics.pctOcupat, 100)}%` }}
                />
              </div>
            }
            icon={<TrendingUp className="w-4 h-4 text-orange-400" />}
          />
        </div>

        {/* Categories */}
        <div className="bg-slate-900 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Ocupació per categoria</h2>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={metrics.byCategory}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <XAxis
                type="number"
                domain={[0, "dataMax"]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={88}
                tickFormatter={(val: string) => {
                  const cat = CATEGORIES.find(c => c.name === val);
                  return `${cat?.emoji ?? ""} ${val}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#f1f5f9",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(value: number, name: string, props) => {
                  if (name === "ocupat") {
                    const cat = metrics.byCategory.find(c => c.name === props.payload?.name);
                    return [`${value} / ${cat?.quota ?? "?"}`, "Inscrits / Quota"];
                  }
                  return [value, "Quota màxima"];
                }}
              />
              <Bar dataKey="quota" fill="#1e3a5f" radius={[0, 4, 4, 0]} name="quota" />
              <Bar dataKey="ocupat" fill="#ef4444" radius={[0, 4, 4, 0]} name="ocupat" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-red-500 inline-block" /> Inscrits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded bg-[#1e3a5f] inline-block" /> Quota màxima
            </span>
          </div>
        </div>

        {/* Timeline + Pagaments */}
        <div className="grid md:grid-cols-2 gap-4" data-section="timeline-pagaments">
          <div className="bg-slate-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Inscripcions acumulades per dia</h2>
            {metrics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={metrics.timeline} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#f1f5f9",
                    }}
                    formatter={(val: number) => [val, "Equips acumulats"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="acumulat"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#ef4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
                Sense dades de data
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">Estat dels pagaments</h2>
            <div className="flex items-center gap-4">
              {metrics.totalEquips > 0 ? (
                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Pagat", value: metrics.pagat },
                          { name: "Pendent", value: metrics.pendent },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={58}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#f97316" />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: 8,
                          fontSize: 12,
                          color: "#f1f5f9",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="w-36 h-36 flex-shrink-0 flex items-center justify-center text-slate-600 text-xs rounded-full border border-slate-800">
                  Sense dades
                </div>
              )}
              <div className="space-y-2.5 text-sm flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-green-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block flex-shrink-0" />
                    Pagat
                  </span>
                  <span className="font-semibold tabular-nums">{metrics.pagat}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-orange-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-orange-500 inline-block flex-shrink-0" />
                    Pendent
                  </span>
                  <span className="font-semibold tabular-nums">{metrics.pendent}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Descompte aviat</span>
                    <span className="tabular-nums">{metrics.descAplicat}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Descompte invitació</span>
                    <span className="tabular-nums">{metrics.descInvitacions}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Llista completa d'equips ─── */}
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300">Tots els equips inscrits</h2>
            <span className="text-xs text-slate-500 tabular-nums">{inscripcions.length} equips</span>
          </div>
          {inscripcions.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8 space-y-2">
              <p>Sense dades d'inscripcions.</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Si acabes d'activar l'endpoint d'Apps Script, comprova que el Script Property
                <code className="mx-1 px-1 bg-slate-800 rounded">METRICS_TOKEN</code>
                tingui el mateix valor que <code className="px-1 bg-slate-800 rounded">VITE_STAFF_PASSWORD_HASH</code>.
                Si el GitHub JSON és buit, executa{" "}
                <code className="px-1 bg-slate-800 rounded">replayLastNInscripcionsToGitHub_(50)</code>{" "}
                des de l'editor d'Apps Script.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left pb-2 pr-3 text-slate-400 font-medium">Equip</th>
                    <th className="text-left pb-2 pr-3 text-slate-400 font-medium">Cat.</th>
                    <th className="text-left pb-2 pr-3 text-slate-400 font-medium">Capità</th>
                    <th className="text-left pb-2 pr-3 text-slate-400 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left pb-2 pr-3 text-slate-400 font-medium hidden sm:table-cell">Telèfon</th>
                    <th className="text-right pb-2 pr-3 text-slate-400 font-medium">€</th>
                    <th className="text-left pb-2 text-slate-400 font-medium">Pagament</th>
                  </tr>
                </thead>
                <tbody>
                  {inscripcions.map((i, idx) => (
                    <tr
                      key={i.team_id || idx}
                      className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-white">{i.nom_equip || "—"}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{i.team_id}</div>
                      </td>
                      <td className="py-2 pr-3 text-slate-300 whitespace-nowrap">{i.categoria || "—"}</td>
                      <td className="py-2 pr-3 text-slate-300">{i.capita || "—"}</td>
                      <td className="py-2 pr-3 text-slate-400 hidden sm:table-cell">
                        {i.email ? (
                          <a href={`mailto:${i.email}`} className="hover:text-white transition-colors">
                            {i.email}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-slate-400 hidden sm:table-cell">
                        {i.telefon ? (
                          <a href={`https://wa.me/${i.telefon?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                            {i.telefon}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-300">
                        {i.total ?? 0} €
                      </td>
                      <td className="py-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          i.pagament_estat === "pagat" || i.pagament_estat === "verificat"
                            ? "bg-green-900/50 text-green-400"
                            : i.pagament_estat?.includes("cancel")
                            ? "bg-slate-800 text-slate-500"
                            : "bg-orange-900/50 text-orange-400"
                        }`}>
                          {i.pagament_estat || "pendent"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
      )}
    </div>
  );
}

/* ─── Pestanya Tràfic Web ─── */

const FUNNEL_STEPS = [
  { event: "page_view (pàgina /)", label: "Visiten la Home", color: "bg-blue-500", icon: "🏠" },
  { event: "cta_inscripcio_click", label: "Cliquen a Inscriu-te", color: "bg-violet-500", icon: "👆" },
  { event: "inscripcio_iniciada", label: "Inicien el formulari", color: "bg-yellow-500", icon: "📝" },
  { event: "queue_passada", label: "Passen la cua d'espera", color: "bg-orange-400", icon: "⏳" },
  { event: "viral_gate_passat / skipped", label: "Passen el gate viral", color: "bg-pink-500", icon: "🎁" },
  { event: "inscripcio_pas_completat (step 5)", label: "Completen tots els passos", color: "bg-red-500", icon: "✅" },
  { event: "inscripcio_completada", label: "Inscripció enviada", color: "bg-green-500", icon: "🎉" },
];

function TraficWebTab() {
  const [showLooker, setShowLooker] = useState(false);
  const [lookerUrl, setLookerUrl] = useState(() => localStorage.getItem("looker_url") ?? "");
  const [lookerInput, setLookerInput] = useState(lookerUrl);

  function saveLookerUrl() {
    localStorage.setItem("looker_url", lookerInput);
    setLookerUrl(lookerInput);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5 pb-12">

      {/* Eines d'analítica */}
      <div className="grid sm:grid-cols-3 gap-3">
        <AnalyticsCard
          title="Google Analytics 4"
          description="Visitants · Pàgines visitades · Temps mitjà · Fonts de tràfic · Conversions"
          badge="GA4 actiu · G-R6XYR7G1WF"
          badgeColor="text-blue-400 bg-blue-900/30 border-blue-800"
          icon="📊"
          href="https://analytics.google.com/"
          cta="Obrir GA4"
        />
        <AnalyticsCard
          title="Microsoft Clarity"
          description="Enregistraments de sessions · Mapes de calor · On fan clic els usuaris"
          badge="Clarity actiu · wmu35nwi1s"
          badgeColor="text-purple-400 bg-purple-900/30 border-purple-800"
          icon="🎥"
          href="https://clarity.microsoft.com/projects/view/wmu35nwi1s"
          cta="Obrir Clarity"
        />
        <AnalyticsCard
          title="Looker Studio"
          description="Dashboard personalitzat amb gràfiques. Gratis. Es crea 1 cop i s'actualitza sol."
          badge="Configuració 1 cop · gratis"
          badgeColor="text-green-400 bg-green-900/30 border-green-800"
          icon="📈"
          href="https://lookerstudio.google.com/"
          cta="Obrir Looker Studio"
        />
      </div>

      {/* Funnel d'inscripcions */}
      <div className="bg-slate-900 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-1">Funnel d'inscripcions</h2>
        <p className="text-xs text-slate-500 mb-5">
          Events enviats a GA4 automàticament. Per veure-ho:{" "}
          <span className="text-slate-400">GA4 → Informes → Cicle de vida → Participació → Esdeveniments</span>
        </p>
        <div className="space-y-2">
          {FUNNEL_STEPS.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                {i + 1}
              </div>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${step.color}`} />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-slate-200">{step.icon} {step.label}</span>
              </div>
              <code className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono whitespace-nowrap hidden sm:block">
                {step.event}
              </code>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">
            💡 A GA4, crea un <strong className="text-slate-400">Informe d'exploració → Embut</strong> amb els events de dalt per veure la taxa de conversió de cada pas.
          </p>
        </div>
      </div>

      {/* Looker Studio embed */}
      <div className="bg-slate-900 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowLooker(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">📈 Dashboard Looker Studio (incrusta aquí)</span>
          {showLooker ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showLooker && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Un cop hagis creat el report a Looker Studio, ves a{" "}
              <strong className="text-slate-400">Fitxer → Configuració de l'informe → Afegir iframe</strong>{" "}
              o bé <strong className="text-slate-400">Compartir → Incrusta l'informe</strong>, copia l'URL i enganxa-la aquí. Es guardarà al navegador.
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://lookerstudio.google.com/embed/reporting/..."
                value={lookerInput}
                onChange={e => setLookerInput(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={saveLookerUrl}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Desar
              </button>
            </div>

            {lookerUrl ? (
              <iframe
                src={lookerUrl}
                className="w-full rounded-xl border border-slate-700"
                style={{ height: 600 }}
                allowFullScreen
                title="Looker Studio dashboard"
              />
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-600 text-sm gap-2 border border-dashed border-slate-800 rounded-xl">
                <span className="text-2xl">📈</span>
                <span>Enganxa l'URL de Looker Studio per veure el dashboard aquí</span>
              </div>
            )}

            {/* Instruccions pas a pas */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors list-none flex items-center gap-1">
                <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                Com crear el dashboard de Looker Studio (1 vegada, gratis)
              </summary>
              <ol className="mt-3 space-y-2 text-xs text-slate-400 pl-4 list-decimal leading-relaxed">
                <li>Ves a <strong>lookerstudio.google.com</strong> i inicia sessió amb el teu Google.</li>
                <li>Crea un <strong>Informe en blanc</strong>.</li>
                <li>Clica <strong>Afegir dades</strong> → <strong>Google Analytics</strong> → selecciona la propietat <code className="bg-slate-800 px-1 rounded">3x3 Westfield Glòries (G-R6XYR7G1WF)</code>.</li>
                <li>Afegeix gràfiques: <strong>Sessions per dia</strong> (línia), <strong>Pàgines més visitades</strong> (taula), <strong>Durada mitjana de sessió</strong> (escorxador), <strong>Fonts de tràfic</strong> (pastís), <strong>Comptador d'inscripcions completades</strong> (filtra per event = inscripcio_completada).</li>
                <li>Clica <strong>Compartir → Incrusta l'informe</strong> → copia l'URL de l'iframe.</li>
                <li>Enganxa l'URL al camp de dalt i clica <strong>Desar</strong>. Fet!</li>
              </ol>
            </details>
          </div>
        )}
      </div>

      {/* Mètriques clau que cal mirar */}
      <div className="bg-slate-900 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Mètriques clau · On mirar-les</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { metric: "Quanta gent entra", where: "GA4 → Inici → Usuaris actius últims 7 dies", tip: "Mira 'Usuaris nous' vs 'Usuaris recurrents'" },
            { metric: "Quina pàgina miren", where: "GA4 → Participació → Pàgines i pantalles", tip: "Ordena per 'Visualitzacions' per veure les pàgines més visitades" },
            { metric: "Quant temps estan", where: "GA4 → Participació → Pàgines i pantalles → columna 'Temps a la pàgina'", tip: "Mínim esperable a /inscripcion: 3-5 minuts" },
            { metric: "Quants entren al formulari", where: "GA4 → Participació → Esdeveniments → inscripcio_iniciada", tip: "Compara amb el total de sessions per calcular la taxa de conversió" },
            { metric: "On abandonen el formulari", where: "GA4 → Explorar → Embut → crea amb els 7 events del funnel", tip: "El pas amb més abandonaments necessita millora de UX" },
            { metric: "D'on venen els visitants", where: "GA4 → Adquisició → Adquisició de tràfic", tip: "Instagram, Google Organic, Direct, WhatsApp... identifica quin canal funciona millor" },
            { metric: "Enregistraments de sessions", where: "Clarity → Enregistraments → filtra per /inscripcion", tip: "Veus exactament com navega cada usuari, on es perd, on clica" },
            { metric: "Mapes de calor", where: "Clarity → Mapes de calor → selecciona la pàgina", tip: "Zones fredes = contingut que ningú llegeix. Zones calentes = el que enganxa" },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-slate-200">{item.metric}</p>
              <p className="text-[11px] text-slate-400">{item.where}</p>
              <p className="text-[10px] text-slate-500 italic">{item.tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title, description, badge, badgeColor, icon, href, cta,
}: {
  title: string; description: string; badge: string; badgeColor: string;
  icon: string; href: string; cta: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 leading-tight">{title}</p>
          <span className={`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
            {badge}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed flex-1">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
      >
        {cta} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

/* ─── Pestanya Accions · consells prioritzats per categoria ─── */

type CategoryRow = { name: string; emoji: string; quota: number; ocupat: number };

function AccionsTab({ byCategory, totalEquips, leads, inscripcions }: { byCategory: CategoryRow[]; totalEquips: number; leads: Lead[]; inscripcions: Inscripcio[] }) {
  const pendingLeads = useMemo(() => leadsNotRegistered(leads, inscripcions), [leads, inscripcions]);
  // Càlcul de dies fins al torneig
  const daysToEvent = Math.max(0, Math.ceil((new Date(EVENT_DATE_ISO).getTime() - Date.now()) / 86400000));
  const totalQuota = byCategory.reduce((s, c) => s + c.quota, 0);
  const totalGap = totalQuota - totalEquips;

  // Classifica categories per urgència
  const enriched = byCategory.map(c => ({
    ...c,
    pct: c.quota > 0 ? Math.round((c.ocupat / c.quota) * 100) : 0,
    gap: Math.max(0, c.quota - c.ocupat),
  }));
  const critiques = enriched.filter(c => c.ocupat === 0).sort((a, b) => b.quota - a.quota);
  const baixes = enriched.filter(c => c.ocupat > 0 && c.pct < 30).sort((a, b) => a.pct - b.pct);
  const ok = enriched.filter(c => c.pct >= 30 && c.pct < 100).sort((a, b) => b.pct - a.pct);
  const plenes = enriched.filter(c => c.pct >= 100);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-5 pb-12">
      {/* Capçalera urgència */}
      <div className="bg-gradient-to-br from-red-950/60 to-orange-950/40 border border-red-900/50 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-5 h-5 text-red-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-300">Què cal fer ARA</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Stat label="Dies fins el 6 Juny" value={String(daysToEvent)} color="text-red-300" />
          <Stat label="Equips a aconseguir" value={String(totalGap)} sub={`de ${totalQuota}`} color="text-orange-300" />
          <Stat label="Ritme necessari" value={`${daysToEvent > 0 ? (totalGap / daysToEvent).toFixed(1) : "—"}`} sub="equips/dia" color="text-yellow-300" />
        </div>
      </div>

      {/* Leads pendents de seguir · NO han registrat equip */}
      {pendingLeads.length > 0 && (
        <Section
          title={`📞 Leads sense inscriure (${pendingLeads.length})`}
          subtitle="Gent que va contactar via WhatsApp però encara no ha registrat equip. Cal fer follow-up per tancar."
          variant="warning"
        >
          <PendingLeadsList leads={pendingLeads} />
        </Section>
      )}

      {/* Categories crítiques (0 inscrits) */}
      {critiques.length > 0 && (
        <Section
          title="🚨 Categories sense inscrits"
          subtitle={`${critiques.length} categories amb 0 equips. Necessiten contacte directe ja.`}
          variant="critic"
        >
          <div className="space-y-3">
            {critiques.map(c => (
              <CategoryActionCard key={c.name} cat={c} tone="critic" actions={getActionsForEmpty(c)} />
            ))}
          </div>
        </Section>
      )}

      {/* Categories <30% */}
      {baixes.length > 0 && (
        <Section
          title="⚠️ Categories per sota del 30%"
          subtitle="Necessiten un push focalitzat aquesta setmana."
          variant="warning"
        >
          <div className="space-y-3">
            {baixes.map(c => (
              <CategoryActionCard key={c.name} cat={c} tone="warning" actions={getActionsForLow(c)} />
            ))}
          </div>
        </Section>
      )}

      {/* Categories progressant bé */}
      {ok.length > 0 && (
        <Section
          title="✅ Categories en bon camí"
          subtitle="Mantenir el ritme. Recordatoris suaus."
          variant="ok"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {ok.map(c => (
              <div key={c.name} className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{c.emoji} {c.name}</span>
                  <span className="text-xs font-mono text-emerald-300">{c.ocupat}/{c.quota}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${c.pct}%` }} />
                </div>
                <p className="text-[11px] text-emerald-300/70 mt-1.5">{c.pct}% complet · {c.gap} places restants</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Categories plenes */}
      {plenes.length > 0 && (
        <Section title="🏆 Categories completes" subtitle="Activar llista d'espera." variant="ok">
          <div className="flex flex-wrap gap-2">
            {plenes.map(c => (
              <span key={c.name} className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-xs font-semibold text-white">
                {c.emoji} {c.name} <span className="text-emerald-400">✓</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Canal d'accions globals */}
      <Section title="📢 Canals per activar avui" subtitle="Per ordre de cost-temps i impacte esperat." variant="info">
        <div className="space-y-2">
          <ChannelAction
            icon="💬"
            channel="WhatsApp · llista de difusió clubs"
            cost="0 €"
            time="20 min"
            impact="Alt"
            action="Envia plantilla manual a 10-15 clubs federats catalans. Especialment per a Sèniors (FIBA), Veterans (+35), Junior."
            href="/staff/lead"
          />
          <ChannelAction
            icon="📰"
            channel="Premsa · drafts a Gmail Drafts"
            cost="0 €"
            time="15 min"
            impact="Alt"
            action="Personalitza saludo de cada draft (nom periodista a LinkedIn) i envia. T-30 ja toca enviar BasquetCatala + Rookies."
            href="https://mail.google.com/mail/u/0/#drafts"
            external
          />
          <ChannelAction
            icon="📱"
            channel="TikTok · script #3 (premi 1.000€)"
            cost="0 €"
            time="30 min (gravar + pujar)"
            impact="Alt per Sèniors"
            action="Grava el vídeo de 30s 'POV 1.000€ al torneig de barri'. Veure TIKTOK-SCRIPTS.md."
          />
          <ChannelAction
            icon="🏢"
            channel="Google Business · Post #1"
            cost="0 €"
            time="5 min"
            impact="Mig"
            action="Pega el Post #1 d'inscripcions obertes. Veure GOOGLE-BUSINESS-POSTS.md."
            href="https://business.google.com"
            external
          />
          <ChannelAction
            icon="📸"
            channel="Instagram Reels"
            cost="0 €"
            time="20 min"
            impact="Mig-Alt"
            action="Reaprofita el vídeo TikTok sense watermark. Etiqueta @cbgrupbarna i @timechamber_es."
          />
          <ChannelAction
            icon="💰"
            channel="Anunci Meta Ads (opcional)"
            cost="50-100 € total"
            time="30 min setup"
            impact="Alt si pressupost ho permet"
            action="Targeting BCN + 30 km, edat 18-45, interès bàsquet. Categoria Sèniors. CPM esperat 3-5€."
          />
        </div>
      </Section>

      {/* Diagnòstic ràpid */}
      <Section title="🎯 Diagnòstic ràpid de la teva situació" subtitle="Auto-generat a partir de les inscripcions actuals." variant="info">
        <Diagnostic critiques={critiques.length} baixes={baixes.length} totalEquips={totalEquips} totalQuota={totalQuota} daysToEvent={daysToEvent} />
      </Section>
    </div>
  );
}

/* Llista de leads sense inscripció · cada lead amb btn WhatsApp directe pre-omplit */
function PendingLeadsList({ leads }: { leads: Lead[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? leads : leads.slice(0, 8);

  function waUrl(lead: Lead): string {
    // Telèfon ja normalitzat al backend
    const phone = normalizePhone(lead.telefon);
    const nom = lead.nom || "";
    const intent = lead.intent || "";
    const dubte = lead.dubte || "";

    // Plantilla optimitzada per recuperar conversions
    const greeting = nom ? `Hola ${nom.split(/\s+/)[0]}! ` : "Hola! ";
    let body = `T'escric del CB Grup Barna — fa uns dies ens vas contactar pel 3×3 Westfield Glòries.`;

    if (intent === "info") {
      body += ` Volia saber si t'ha quedat algun dubte d'última hora o necessites algun aclariment per tancar la inscripció.`;
    } else if (intent === "reserva") {
      body += ` Volia confirmar si voleu tirar endavant amb la reserva. Encara queden places però se'ns omplen ràpid.`;
    } else if (intent === "prueba") {
      body += ` Volia saber si necessites més info sobre el dia del torneig o algun detall per decidir-vos.`;
    } else {
      body += ` Volia veure si necessites ajuda per inscriure el teu equip — quedan poques places i et puc ajudar amb el formulari si vols.`;
    }

    if (dubte && dubte.length > 5 && dubte.length < 100) {
      body += `\n\nDe la teva consulta sobre "${dubte}" — t'ho aclareixo pel mòbil ràpid si vols.`;
    }

    body += `\n\nInscripcions a cbgrupbarna-3x3timechamber.com/inscripcion\nO si vols, et passo el link directe per categoria.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(greeting + body)}`;
  }

  function intentBadge(intent: string): { text: string; color: string } {
    switch (intent) {
      case "reserva": return { text: "Vol reservar", color: "bg-red-900/40 text-red-300 border-red-800" };
      case "info":    return { text: "Vol info", color: "bg-blue-900/40 text-blue-300 border-blue-800" };
      case "prueba":  return { text: "Vol provar", color: "bg-purple-900/40 text-purple-300 border-purple-800" };
      default:        return { text: intent || "Contacte", color: "bg-slate-800 text-slate-400 border-slate-700" };
    }
  }

  function eventLabel(event: string): string {
    return ({ tres_x_tres: "3×3", campus: "Campus", portes_obertes: "Portes Obertes", general: "" })[event] || event || "3×3";
  }

  function daysSince(iso: string): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  return (
    <div className="space-y-2">
      {visible.map((lead, i) => {
        const dies = daysSince(lead.data);
        const badge = intentBadge(lead.intent);
        const ev = eventLabel(lead.event);
        return (
          <div key={`${lead.telefon}-${i}`} className="bg-orange-950/40 border border-orange-900/40 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                <span className="text-sm font-bold text-white truncate">{lead.nom || lead.telefon}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.color}`}>{badge.text}</span>
                {ev && ev !== "3×3" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{ev}</span>
                )}
                {dies != null && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${dies > 2 ? "bg-red-900/50 text-red-300" : "bg-slate-800 text-slate-400"}`}>
                    {dies === 0 ? "avui" : `fa ${dies}d`}
                  </span>
                )}
                {lead.estat && lead.estat !== "Nou" && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{lead.estat}</span>
                )}
              </div>
              <a
                href={waUrl(lead)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1ebd58] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 shrink-0"
              >
                💬 WhatsApp
              </a>
            </div>
            <div className="text-xs text-slate-300 space-y-0.5">
              <p>
                <a href={`tel:${lead.telefon}`} className="font-mono text-slate-200 hover:text-white">{lead.telefon}</a>
                {lead.email && <> · <a href={`mailto:${lead.email}`} className="text-slate-300 hover:text-white">{lead.email}</a></>}
              </p>
              {lead.dubte && lead.dubte.length > 1 && (
                <p className="text-[11px] text-slate-400 italic leading-snug">"{lead.dubte}"</p>
              )}
              {lead.notes && lead.notes.length > 1 && (
                <p className="text-[11px] text-orange-300/70 leading-snug">📝 {lead.notes}</p>
              )}
            </div>
          </div>
        );
      })}
      {leads.length > 8 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full text-xs text-orange-300 hover:text-orange-200 py-2 transition-colors"
        >
          {showAll ? `Mostrar només 8 (de ${leads.length})` : `Veure tots els ${leads.length} pendents →`}
        </button>
      )}
      <div className="border-t border-orange-900/30 pt-3 mt-3 text-[11px] text-orange-300/70 leading-relaxed">
        💡 <strong>Estratègia:</strong> Comença pels que diuen "Vol reservar" (intent més alt) o pels que tenen un dubte concret. Després els de més de 3 dies sense seguiment. La plantilla del botó WhatsApp ja porta un text adaptat a cada cas.
      </div>
    </div>
  );
}

function Section({ title, subtitle, variant = "info", children }: {
  title: string; subtitle?: string; variant?: "critic" | "warning" | "ok" | "info"; children: React.ReactNode;
}) {
  const border = {
    critic: "border-red-900/50 bg-red-950/20",
    warning: "border-orange-900/50 bg-orange-950/20",
    ok: "border-emerald-900/50 bg-emerald-950/15",
    info: "border-slate-800 bg-slate-900",
  }[variant];
  return (
    <div className={`rounded-xl p-5 border ${border}`}>
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function CategoryActionCard({ cat, tone, actions }: {
  cat: CategoryRow & { pct: number; gap: number }; tone: "critic" | "warning"; actions: string[];
}) {
  return (
    <div className={`rounded-lg p-3 border ${tone === "critic" ? "bg-red-950/40 border-red-900/40" : "bg-orange-950/30 border-orange-900/40"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white">{cat.emoji} {cat.name}</span>
        <span className={`text-xs font-mono ${tone === "critic" ? "text-red-300" : "text-orange-300"}`}>
          {cat.ocupat}/{cat.quota} · {cat.gap} restants
        </span>
      </div>
      <ul className="space-y-1.5">
        {actions.map((a, i) => (
          <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
            <span className={`shrink-0 mt-0.5 ${tone === "critic" ? "text-red-400" : "text-orange-400"}`}>→</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Catàleg d'accions per a categories sense inscrits */
function getActionsForEmpty(c: CategoryRow): string[] {
  const map: Record<string, string[]> = {
    "Sèniors": [
      "Posta avui el TikTok script #3 (premi 1.000€) — captura jugadors FIBA",
      "WhatsApp directe a 5 clubs FCBQ amb equip Sènior actiu (Cornellà, Sant Andreu, Hospitalet, Mataró, Sant Adrià)",
      "Anunci a /r/BasketSpain a Reddit + grup 'Bàsquet a Barcelona' a Facebook",
      "Patrocinador 'Or' a /patrocinadors podria assignar plaça VIP gratuïta + mailing als seus emails",
    ],
    "Veterans": [
      "Envia email als ex-jugadors >35 anys del club (llista interna)",
      "Publica al grup de WhatsApp d'antics jugadors del Grup Barna",
      "Contacta amb el club de bàsquet de la teva ciutat de naixement (potser tenen veterans actius)",
      "Post a Facebook (audiència 35+) amb hashtag #ExJugadorsBarcelona",
    ],
    "Junior": [
      "Comunicació directa a entrenadors d'equips Junior dels clubs federats (FCBQ té directori públic)",
      "Email als coordinadors d'escola de bàsquet de l'Eix Clot",
      "Story Instagram dirigida a perfil 16-18 anys (segmentació geogràfica BCN)",
    ],
    "Màgics": [
      "Contacta amb Special Olympics Catalunya per a captació d'equips inclusius",
      "Email a centres d'educació especial del Districte de Sant Martí",
      "Comunicació a la fundació Aspasur o similar al Clot",
      "Categoria sense cost extra · subratlla la inclusió com a valor central",
    ],
    "Preinfantil": [
      "Email als entrenadors Preinfantil dels clubs de Catalunya central",
      "Cartells als pavellons municipals (FCBQ network)",
      "Post a grups de WhatsApp de pares de bàsquet base del Districte",
    ],
    "Escola": [
      "Comunicació a escoles públiques i concertades del Districte de Sant Martí",
      "Email a l'AMPAs amb fitxer adjunt del cartell + bases",
      "Cartell físic als 5 pavellons municipals més propers",
    ],
  };
  return map[c.name] || [
    `Envia WhatsApp manual a 5-10 entrenadors de la categoria ${c.name}`,
    `Post específic a Instagram Stories amb hashtag #${c.name.replace(/\s/g, "")}BCN`,
    `Contacta amb clubs federats que tinguin equip actiu de ${c.name}`,
  ];
}

/* Catàleg d'accions per a categories <30% */
function getActionsForLow(c: CategoryRow & { pct: number; gap: number }): string[] {
  return [
    `Recordatori a la llista de WhatsApp dels equips locals de ${c.name}`,
    `Aprofita els ${c.ocupat} equips ja inscrits: demana'ls que comparteixin amb amics que juguin a la mateixa categoria (descompte invitació)`,
    `Story dedicada a Instagram amb el comptador en directe i quant queda per esgotar`,
    c.pct < 15
      ? `Activa el descompte 'Early Bird' o invitació prioritària per a aquesta categoria`
      : `Continua el ritme actual · falten només ${c.gap} equips per omplir`,
  ];
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-black/30 rounded-lg px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 leading-tight">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color} leading-none mt-1`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChannelAction({ icon, channel, cost, time, impact, action, href, external }: {
  icon: string; channel: string; cost: string; time: string; impact: string; action: string; href?: string; external?: boolean;
}) {
  const inner = (
    <div className="bg-slate-800/40 hover:bg-slate-800/70 transition-colors rounded-lg p-3 flex gap-3 cursor-pointer">
      <span className="text-2xl leading-none shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-white">{channel}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">{cost}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400">{time}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-900/40 text-red-300">Impact: {impact}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{action}</p>
      </div>
      {href && <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 self-start mt-1" />}
    </div>
  );
  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
    ) : (
      <Link to={href}>{inner}</Link>
    );
  }
  return inner;
}

function Diagnostic({ critiques, baixes, totalEquips, totalQuota, daysToEvent }: {
  critiques: number; baixes: number; totalEquips: number; totalQuota: number; daysToEvent: number;
}) {
  const pct = Math.round((totalEquips / totalQuota) * 100);
  const expectedPct = daysToEvent > 30 ? 30 : daysToEvent > 14 ? 60 : daysToEvent > 7 ? 80 : 95;
  const onTrack = pct >= expectedPct - 10;

  const lines: { tone: "ok" | "warn" | "critic"; text: string }[] = [];
  if (critiques > 3) {
    lines.push({ tone: "critic", text: `Tens ${critiques} categories sense ningú inscrit. Si no fas outreach manual aquesta setmana, no s'ompliran soles.` });
  } else if (critiques > 0) {
    lines.push({ tone: "warn", text: `${critiques} categories sense inscrits — encara gestionable amb 1-2 sessions d'outreach focalitzat.` });
  }
  if (baixes > 0) {
    lines.push({ tone: "warn", text: `${baixes} categories estan per sota del 30%. Programa una sessió de WhatsApp/IG dedicada per cadascuna.` });
  }
  if (onTrack) {
    lines.push({ tone: "ok", text: `Globalment ${pct}% — anys segons el calendari esperat per T-${daysToEvent} (objectiu: ${expectedPct}%).` });
  } else {
    lines.push({ tone: "critic", text: `Globalment ${pct}% — per sota de l'objectiu esperat (${expectedPct}% a T-${daysToEvent}). Cal accelerar.` });
  }
  if (daysToEvent <= 21 && pct < 50) {
    lines.push({ tone: "warn", text: `Última oportunitat per canviar el ritme. Considera activar anuncis Meta Ads (50-100€) o un descompte d'última hora.` });
  }
  if (daysToEvent <= 7) {
    lines.push({ tone: "critic", text: `Falta 1 setmana o menys. Prioritza confirmacions i pagaments dels ja inscrits, més que captació nova.` });
  }

  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className={`flex gap-2 text-sm leading-relaxed rounded-lg px-3 py-2 ${
          l.tone === "critic" ? "bg-red-950/40 text-red-200 border border-red-900/30" :
          l.tone === "warn" ? "bg-orange-950/30 text-orange-200 border border-orange-900/30" :
          "bg-emerald-950/30 text-emerald-200 border border-emerald-900/30"
        }`}>
          {l.tone === "critic" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
           l.tone === "warn" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
           <Check className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-slate-400">{label}</span>
        {icon}
      </div>
      <span className="text-2xl font-bold tabular-nums leading-tight">{value}</span>
      <span className="text-xs text-slate-500">{sub}</span>
    </div>
  );
}

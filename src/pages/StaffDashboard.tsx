import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { BarChart2, Users, Euro, TrendingUp, RefreshCw, ArrowLeft, LogOut, ExternalLink, ChevronDown, ChevronUp, Activity } from "lucide-react";
import {
  isPasswordVerified, getStaffPat, clearStaffSession,
  loadInscripcions, type Inscripcio,
} from "@/lib/dataClient";
import { CATEGORIES, TOTAL_CAPACITY } from "@/lib/categories";

type ActiveTab = "inscripcions" | "trafic";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("inscripcions");
  const [inscripcions, setInscripcions] = useState<Inscripcio[]>([]);
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
      const data = await loadInscripcions(force);
      setInscripcions(data);
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

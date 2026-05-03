import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, MapPin, Phone, Mail, User, Users, Calendar, Trophy, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pàgina de check-in del torneig.
 *
 * S'arriba aquí escanejant el QR únic de cada equip (l'usuari el guarda al telèfon
 * o el rep per email). Mostra totes les dades del equip i permet als responsables
 * marcar-lo com a "arribat" (entrega de samarretes feta).
 *
 * URL: /checkin?id=ABC&nom=...&cat=...&cap=...&pob=...&jug=...&mida=...&tel=...&email=...&data=...
 */

const GOOGLE_WEBHOOK = (import.meta.env.VITE_GOOGLE_SHEET_WEBHOOK as string | undefined) || "";

export default function Checkin() {
  const [params] = useSearchParams();

  const id     = params.get("id")    || "";
  const nom    = params.get("nom")   || "—";
  const cat    = params.get("cat")   || "—";
  const cap    = params.get("cap")   || "—";
  const pob    = params.get("pob")   || "";
  const jug    = params.get("jug")   || "—";
  const mida   = params.get("mida")  || "—";
  const tel    = params.get("tel")   || "";
  const email  = params.get("email") || "";
  const dataIns = params.get("data") || "";

  const [arriving, setArriving] = useState(false);
  const [arrived, setArrived] = useState<null | "ok" | "err">(null);

  // Persistim a localStorage per si l'staff escaneja el mateix QR més tard
  const arrivedKey = `checkin_arrived_${id}`;
  useEffect(() => {
    if (id && localStorage.getItem(arrivedKey) === "1") setArrived("ok");
  }, [id, arrivedKey]);

  const marcarArribada = async () => {
    if (!id || arrived === "ok") return;
    setArriving(true);
    try {
      if (GOOGLE_WEBHOOK) {
        // mode "no-cors": Apps Script accepta el POST però no podem llegir resposta
        await fetch(GOOGLE_WEBHOOK, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "checkin",
            teamId: id,
            nomEquip: nom,
            timestamp: new Date().toISOString(),
            local: new Date().toLocaleString("ca-ES"),
          }),
        });
      }
      localStorage.setItem(arrivedKey, "1");
      setArrived("ok");
    } catch {
      setArrived("err");
    } finally {
      setArriving(false);
    }
  };

  const fields: { icon: any; label: string; value: string; show: boolean }[] = [
    { icon: Trophy,    label: "Categoria",       value: cat,                      show: true  },
    { icon: User,      label: "Capità",          value: cap,                      show: cap !== "—" },
    { icon: Users,     label: "Jugadors",        value: `${jug} jugadors`,        show: true  },
    { icon: Trophy,    label: "Talla samarreta", value: mida,                     show: mida !== "—" },
    { icon: MapPin,    label: "Població",        value: pob,                      show: !!pob },
    { icon: Phone,     label: "Telèfon",         value: tel,                      show: !!tel },
    { icon: Mail,      label: "Email",           value: email,                    show: !!email },
    { icon: Calendar,  label: "Inscrit",         value: dataIns,                  show: !!dataIns },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-medium">3×3 Westfield Glòries</span>
          </Link>
          <span className="text-sm font-black font-mono text-red-500 tracking-widest hidden sm:block">CHECK-IN</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 relative max-w-2xl">
        {/* Banner d'estat */}
        {arrived === "ok" ? (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
            className="bg-green-500/15 border-2 border-green-500/60 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-green-400 uppercase tracking-wider text-sm">Equip registrat</p>
              <p className="text-white/70 text-xs">Samarretes entregades. Tot a punt!</p>
            </div>
          </motion.div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-white/80">Equip pendent de check-in. Verifica les dades i prem el botó verd a baix.</p>
          </div>
        )}

        {/* Targeta principal */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="bg-gradient-to-br from-red-600/20 via-slate-900/60 to-slate-900 border border-red-500/30 rounded-3xl p-6 mb-6 backdrop-blur">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-300 mb-1">Equip</p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight" style={{ fontFamily:"'Rajdhani', sans-serif" }}>
                {nom}
              </h1>
            </div>
            {id && (
              <span className="text-[10px] uppercase tracking-wider font-mono bg-black/40 border border-white/10 text-white/70 px-2.5 py-1.5 rounded-md whitespace-nowrap">
                ID: {id}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {fields.filter(f => f.show).map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{label}</span>
                </div>
                <p className="text-sm font-semibold text-white break-words">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Acció check-in */}
        {arrived !== "ok" && (
          <Button
            onClick={marcarArribada}
            disabled={arriving || !id}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase tracking-wider py-7 rounded-2xl text-lg shadow-lg shadow-green-600/30 disabled:opacity-50"
          >
            {arriving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Registrant…</>
            ) : (
              <><Check className="w-6 h-6 mr-2"/> Marcar arribada · Entregar samarretes</>
            )}
          </Button>
        )}
        {arrived === "err" && (
          <p className="text-red-400 text-sm text-center mt-3">Error registrant. Torna a provar o anota manualment.</p>
        )}

        {/* Info enllaços ràpids */}
        <div className="mt-8 flex flex-col sm:flex-row gap-2 text-center text-xs text-white/40">
          {tel && (
            <a href={`tel:${tel}`} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 hover:bg-white/10 transition-colors">
              📞 Trucar al capità ({tel})
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 hover:bg-white/10 transition-colors">
              ✉️ Email capità
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";

/**
 * Code splitting per ruta: només Home arriba al bundle inicial.
 * Les rutes pesades (form, equip, FAQ, etc.) es carreguen on-demand
 * → reduïm LCP de la home en ~200-300ms i el bundle inicial passa
 *   de 670KB a ~220KB (Home + dependencies bàsiques).
 */
const Inscripcion         = lazy(() => import("@/pages/Inscripcion"));
const InscripcioIndividual = lazy(() => import("@/pages/InscripcioIndividual"));
const Equip               = lazy(() => import("@/pages/Equip"));
const Checkin             = lazy(() => import("@/pages/Checkin"));
const Preguntes           = lazy(() => import("@/pages/Preguntes"));
const Seu                 = lazy(() => import("@/pages/Seu"));
const LlistaEspera        = lazy(() => import("@/pages/LlistaEspera"));
const SobreNosaltres      = lazy(() => import("@/pages/SobreNosaltres"));
const Premsa              = lazy(() => import("@/pages/Premsa"));
const Blog                = lazy(() => import("@/pages/Blog"));
const BlogPost            = lazy(() => import("@/pages/BlogPost"));
const Contacte            = lazy(() => import("@/pages/Contacte"));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? import.meta.env.BASE_URL : '/'}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inscripcion" element={<Inscripcion />} />
          <Route path="/inscripcio-individual" element={<InscripcioIndividual />} />
          <Route path="/inscripcion-individual" element={<InscripcioIndividual />} />
          <Route path="/solo" element={<InscripcioIndividual />} />
          <Route path="/equip" element={<Equip />} />
          <Route path="/checkin" element={<Checkin />} />
          <Route path="/preguntes-frequents" element={<Preguntes />} />
          <Route path="/faq" element={<Preguntes />} />
          <Route path="/seu/:slug" element={<Seu />} />
          <Route path="/llista-espera" element={<LlistaEspera />} />
          <Route path="/sobre-nosaltres" element={<SobreNosaltres />} />
          <Route path="/qui-som" element={<SobreNosaltres />} />
          <Route path="/premsa" element={<Premsa />} />
          <Route path="/press" element={<Premsa />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contacte" element={<Contacte />} />
          <Route path="/contacto" element={<Contacte />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

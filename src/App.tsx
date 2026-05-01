import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Inscripcion from "@/pages/Inscripcion";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? import.meta.env.BASE_URL : '/'}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscripcion" element={<Inscripcion />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

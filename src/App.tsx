import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Inscripcion from "@/pages/Inscripcion";
import Equip from "@/pages/Equip";
import Checkin from "@/pages/Checkin";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.PROD ? import.meta.env.BASE_URL : '/'}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inscripcion" element={<Inscripcion />} />
        <Route path="/equip" element={<Equip />} />
        <Route path="/checkin" element={<Checkin />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

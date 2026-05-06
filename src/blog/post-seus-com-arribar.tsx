import { Link } from "react-router-dom";

export default function PostSeusComArribar() {
  return (
    <>
      <p className="lead text-xl text-white/85 leading-relaxed mb-8">
        El 3×3 Westfield Glòries 2026 es juga els dies <strong>6 i 7 de juny</strong> en tres seus connectades al barri del Clot-Glòries de Barcelona. Aquesta guia explica com arribar a cadascuna en metro, bus, bicicleta o cotxe, on aparcar, què menjar al voltant i on dormir si vens de fora. Lectura útil tant per a equips com per a famílies i acompanyants.
      </p>

      <h2 id="mapa-general">Tres seus, 1 km a peu de distància</h2>
      <p>
        Una de les coses úniques del 3×3 Westfield Glòries és que les tres seus estan al mateix barri, totes connectades amb la línia <strong>L1 del metro</strong>. Pots començar el matí veient un partit a la pista FIBA del centre comercial, dinar a la Plaça Glòries i a la tarda baixar a la pista exterior de la Rambleta del Clot per al torneig open. Tot a peu, en menys de <strong>15 minuts caminant</strong> entre la seu més llunyana i la més propera.
      </p>
      <p>
        Mira el <Link to="/seu/westfield-glories" className="text-red-300 underline">mapa interactiu de seus</Link> a la web amb la posició exacta de cada pista i la teva ubicació en directe.
      </p>

      <h2 id="westfield-glories">Seu 1 · Westfield Glòries (FIBA · pista principal)</h2>
      <p>
        És la <strong>pista oficial FIBA 3×3</strong> on es disputa la categoria Sèniors amb punts pel ranking olímpic. Està al pati interior del centre comercial Westfield Glòries, sota cobert i amb gradetes per al públic.
      </p>

      <h3>Adreça</h3>
      <p>Av. Diagonal, 208 · 08018 Barcelona (entrada principal del centre comercial).</p>

      <h3>Com arribar en transport públic</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Metro L1</strong> · estació <strong>Glòries</strong> (sortida directa al centre comercial).</li>
        <li><strong>Tramvia T4, T5, T6</strong> · parada Glòries · 30 segons a peu.</li>
        <li><strong>Bus</strong> · línies H12, V21, 7, 60, 92, 192 · totes paren a Plaça Glòries.</li>
        <li><strong>Bicing</strong> · estació 199 (Glòries-Cartagena) i 198 (Diagonal-Castillejos), totes dues a menys de 100 m.</li>
      </ul>

      <h3>Aparcament en cotxe</h3>
      <p>
        El <strong>pàrking del centre comercial Westfield Glòries</strong> té 1.700 places i és gratuït les 2 primeres hores si compres alguna cosa al centre (qualsevol comerç, inclòs bar). Entrada per Av. Diagonal 208.
      </p>
      <p>
        Si fas més de 2 hores i no vols pagar el centre, prova:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Pàrking SABA Plaça de les Glòries · superfície, més econòmic.</li>
        <li>Carrers laterals (Aragó, Cartagena, Castillejos) · zona blava els dies feiners, gratis dissabte tarda i diumenge.</li>
      </ul>

      <h3>Menjar i begudes al voltant</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Food court del Westfield</strong> · més de 20 opcions des de 8 €/persona, obert fins a les 22 h.</li>
        <li><strong>Bar Tomás de Sarrià</strong> (succursal Glòries) · paella i tapes mediterrànies.</li>
        <li><strong>Granja Petitbo</strong> (a 10 min a peu) · esmorzars potents de fins a 4 ous + bacon.</li>
        <li><strong>Cafè de l'Òpera del Clot</strong> · cafè i pastisseria artesana.</li>
      </ul>

      <h2 id="nau-clot">Seu 2 · La Nau del Clot (categories formatives)</h2>
      <p>
        És el <strong>pavelló oficial del CB Grup Barna</strong>, certificat per la FCBQ. Allotja les categories formatives: Escola, Premini, Mini, Preinfantil, Infantil, Cadet i Junior. És pista coberta, sòl de fusta tipus parquet, amb vestidors i bar al recinte.
      </p>

      <h3>Adreça</h3>
      <p>Carrer de la Llacuna, 172 · 08018 Barcelona (Parc del Clot).</p>

      <h3>Com arribar en transport públic</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Metro L1</strong> · estació <strong>Clot</strong> · 5 minuts a peu (sortida Aragó-Llacuna).</li>
        <li><strong>Renfe / Rodalies</strong> · estació Clot-Aragó · 7 min a peu.</li>
        <li><strong>Bus</strong> · H10, V23, 92 · parada Aragó-Llacuna o Aragó-Independència.</li>
      </ul>

      <h3>Aparcament en cotxe</h3>
      <p>
        Hi ha <strong>zona blava als carrers Llacuna, Independència i Aragó</strong> (gratis dissabte tarda i diumenge). El pàrking públic més proper és el SABA Sant Joan de Malta · 4 min a peu.
      </p>
      <p>
        Si vens en família, el <strong>Parc del Clot</strong> és just al costat del pavelló: zona infantil amb gronxadors i un llac, ideal per als germans petits mentre l'equip juga.
      </p>

      <h3>Menjar al voltant</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Bar del propi pavelló</strong> · entrepans, beguda freda i cafè a preu de club.</li>
        <li><strong>El Clot Tapería</strong> (Plaça del Mercat del Clot) · tapes catalanes i menú del dia.</li>
        <li><strong>Mercat del Clot</strong> · 8 min a peu · paradetes de fruita, embotits, peix fresc.</li>
        <li><strong>La Salseta</strong> · cuina catalana de proximitat, ideal per al dinar entre partits.</li>
      </ul>

      <h2 id="rambleta">Seu 3 · Rambleta del Clot (Open Day · pista exterior)</h2>
      <p>
        És la <strong>pista exterior</strong> del 3×3 Westfield Glòries, en plena Rambla del Clot / Poblenou. Allotja el dia OPEN amb DJ, food trucks i ambient streetball obert al públic. Entrada gratis per a no-jugadors.
      </p>

      <h3>Adreça</h3>
      <p>Rambla del Poblenou amb Carrer del Clot · 08018 Barcelona.</p>

      <h3>Com arribar en transport públic</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Metro L1</strong> · estació <strong>Clot</strong> · 6 minuts a peu.</li>
        <li><strong>Bicing</strong> · estació 197 (Rambla del Poblenou) · 30 segons a peu.</li>
        <li><strong>Bus</strong> · 92, B25 · parada Rambla del Poblenou.</li>
      </ul>

      <h3>Aparcament en cotxe</h3>
      <p>
        Zona blava i verda als carrers laterals (gratis dissabte tarda i diumenge). El pàrking SABA Diagonal Mar és a 10 minuts en cotxe.
      </p>

      <h3>Menjar al voltant</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Food trucks del propi torneig</strong> · paella, hamburgueses, hot dogs · diumenge tot el dia.</li>
        <li><strong>Sergi Arola Tapas Bar</strong> · 4 min a peu · tapas modernes.</li>
        <li><strong>Pizzeria del Clot</strong> · 6 min a peu · porcions per emportar.</li>
        <li><strong>Forn Sarret</strong> · pa i pastisseria · ideal per a la berenar dels equips.</li>
      </ul>

      <h2 id="allotjament">Si vens de fora · on dormir prop del torneig</h2>
      <p>
        Tenim equips de tota la península inscrivint-se. Si vens de fora i busques allotjament a 10 minuts a peu de les seus, aquí tens opcions per pressupostos diferents:
      </p>

      <h3>Pressupost ajustat (50-90 €/nit)</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Generator Hostel Barcelona</strong> (Còrsega-Marina) · llits a habitació compartida o privada · 18-30 minuts a peu.</li>
        <li><strong>Hotel Catalonia Atenas</strong> (Av. Meridiana) · 3 estrelles · 10 min en metro.</li>
        <li><strong>Apartaments turístics al Poblenou</strong> · busca a Booking pel codi postal 08018.</li>
      </ul>

      <h3>Mig pressupost (90-150 €/nit)</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Hotel Eurostars Monumental</strong> · al costat de Glòries · vista a la Sagrada Família.</li>
        <li><strong>NH Collection Barcelona Tower</strong> · 22 Bis · 5 min a peu de Westfield.</li>
        <li><strong>Hotel SB Glow</strong> · zona Plaça de Toros Monumental · piscina exterior.</li>
      </ul>

      <h3>Pressupost alt (150 €+)</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Hotel Princess Barcelona</strong> · davant del mar Diagonal Mar · 12 min en metro.</li>
        <li><strong>OD Barcelona</strong> · disseny boutique · zona Av. Diagonal.</li>
      </ul>

      <h2 id="que-fer-bcn">Què fer a Barcelona si tens hores lliures entre partits</h2>
      <p>
        Els partits són ràpids (10 minuts o fins a 21 punts). Si el teu equip juga al matí i la propera ronda és a la tarda, tens hores per gaudir de la ciutat. A 10-20 minuts de les seus tens:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Sagrada Família</strong> · 12 min en metro (L1 Glòries → L5 Sagrada Família).</li>
        <li><strong>Platja de la Barceloneta o Mar Bella</strong> · 15 min en metro/bicing per relaxar entre rondes.</li>
        <li><strong>Park Güell</strong> · 25 min en metro/bus.</li>
        <li><strong>Parc Diagonal Mar</strong> · 12 min en metro · zona verda amb llacs i toboganes.</li>
        <li><strong>Encants Vells</strong> · 5 min a peu de Glòries · mercat històric obert dimecres, dissabte i diumenge matí.</li>
        <li><strong>Torre Glòries</strong> · 2 min a peu · mirador 360° amb vistes de Barcelona.</li>
      </ul>

      <h2 id="checklist">Checklist final per al cap de setmana</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>✅ Saber a quina seu juga el teu equip a primer hora del matí.</li>
        <li>✅ Tenir el QR de l'equip al mòbil per al check-in (l'enviem per email amb la inscripció).</li>
        <li>✅ DNI dels jugadors per validació.</li>
        <li>✅ Sabatilles netes de pista (no es permeten sabatilles d'exterior a la pista FIBA del centre comercial).</li>
        <li>✅ Aigua i fruita seca · els partits són curts però intensos.</li>
        <li>✅ Bateria externa pel mòbil · fareu moltes fotos.</li>
        <li>✅ Si vens en cotxe i no coneixes la zona, sortir 30 min abans · zona blava de Glòries pot anar plena.</li>
      </ul>

      <h2 id="contacte">Encara tens dubtes?</h2>
      <p>
        El nostre canal directe és el WhatsApp del club: <a href="https://wa.me/+34698425153" className="text-red-300 underline">+34 698 425 153</a>. T'atendrem nosaltres mateixos (Ana, voluntària del Grup Barna). També pots <Link to="/contacte" className="text-red-300 underline">enviar-nos un missatge des del formulari</Link> i et responem el mateix dia.
      </p>
      <p>
        Inscripcions obertes a <Link to="/inscripcion" className="text-red-300 underline">/inscripcion</Link> (75-105 € per equip de 4-5 jugadors) o <Link to="/inscripcio-individual" className="text-red-300 underline">/inscripcio-individual</Link> si véns sol (20 €). Veure les <Link to="/preguntes-frequents" className="text-red-300 underline">preguntes freqüents</Link> per qualsevol detall.
      </p>
      <p className="text-white/60 text-sm mt-8 leading-relaxed">
        Aquesta guia s'actualitzarà la setmana abans del torneig amb informació definitiva sobre horaris, food trucks confirmats i activitats paral·leles. Subscriu-te al blog des del peu de la home per rebre les actualitzacions per email.
      </p>
    </>
  );
}

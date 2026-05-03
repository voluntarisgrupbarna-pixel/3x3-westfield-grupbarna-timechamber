import { Link } from "react-router-dom";

export default function PostDiferencies() {
  return (
    <>
      <p className="lead text-xl text-white/85 leading-relaxed mb-8">
        El 3×3 i el 5×5 comparteixen pilota, cistella i alguns gestos tècnics, però són dos esports gairebé independents. Si vens del bàsquet tradicional, hi ha 8 diferències de regla que has d'integrar abans de jugar el teu primer torneig 3×3 oficial FIBA. Aquesta és la comparativa pràctica.
      </p>

      <h2 id="resum">Resum ràpid: 3×3 vs 5×5 en 1 taula</h2>
      <div className="overflow-x-auto my-5 not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/15 text-left">
              <th className="py-2.5 px-3 font-bold text-white">Regla</th>
              <th className="py-2.5 px-3 font-bold text-red-300">3×3</th>
              <th className="py-2.5 px-3 font-bold text-white/60">5×5</th>
            </tr>
          </thead>
          <tbody className="text-white/75">
            <tr className="border-b border-white/8"><td className="py-2 px-3">Jugadors a pista</td><td className="py-2 px-3">3 (3 reserves màx)</td><td className="py-2 px-3">5 (7 reserves màx)</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Pista</td><td className="py-2 px-3">Mitja pista, una cistella</td><td className="py-2 px-3">Pista sencera, dues cistelles</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Punts per cistella</td><td className="py-2 px-3">1 dins, 2 fora línia 3</td><td className="py-2 px-3">2 dins, 3 fora línia 3</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Durada</td><td className="py-2 px-3">10 min o 21 punts</td><td className="py-2 px-3">4×10 min</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Shot clock</td><td className="py-2 px-3">12 segons</td><td className="py-2 px-3">24 segons</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Línia 3 punts</td><td className="py-2 px-3">6,75m FIBA 3×3</td><td className="py-2 px-3">6,75m FIBA</td></tr>
            <tr className="border-b border-white/8"><td className="py-2 px-3">Faltes equip</td><td className="py-2 px-3">Bonus a la 7a</td><td className="py-2 px-3">Bonus a la 5a per quart</td></tr>
            <tr><td className="py-2 px-3">Substitucions</td><td className="py-2 px-3">Lliures només si l'altre puntua</td><td className="py-2 px-3">En qualsevol pausa de joc</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="pista">La pista i el ritme</h2>
      <p>
        El 3×3 es juga a <strong>mitja pista</strong>, amb una sola cistella. La línia de 3 punts és la mateixa que en 5×5 FIBA (6,75m), però només n'hi ha una. Això vol dir:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>No hi ha contraatacs llargs.</strong> Cada possessió comença a sota de la cistella o des de la línia de 3.</li>
        <li><strong>Densitat humana brutal.</strong> 6 jugadors en mig camp = molt menys espai que 10 en una pista sencera.</li>
        <li><strong>Drives més curts.</strong> Tots els atacs comencen entre 6,75m i la cistella. Es premien els jugadors que fan finta i fan canvis de direcció.</li>
      </ul>
      <p>
        El ritme és <strong>3-4 vegades més intens</strong> per minut. En un partit de 10 minuts pots tenir 30+ possessions; en un quart de 5×5, sol haver-n'hi 18-22.
      </p>

      <h2 id="punteig">Sistema de punteig: 1+2 en lloc de 2+3</h2>
      <p>
        És el canvi més important <strong>i el que més enganya als novells</strong>. En 3×3:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Cistella des de dins de la línia de 3 → <strong>1 punt</strong>.</li>
        <li>Cistella des de fora de la línia de 3 → <strong>2 punts</strong>.</li>
        <li>Tir lliure → <strong>1 punt</strong>.</li>
      </ul>
      <p>
        El partit acaba quan un equip arriba a <strong>21 punts</strong> (encara que falti temps) o quan finalitzen els 10 minuts. <strong>Si la marcador queda empatada</strong> als 10 minuts, juguen <em>overtime</em> al primer que faci 2 punts.
      </p>
      <div className="bg-orange-500/10 border-l-4 border-orange-400 p-4 my-5 rounded-r">
        <p className="text-sm text-white/80 leading-relaxed">
          <strong>💡 Tip estratègic:</strong> Un tir de 2 punts val "el doble" que un de 1, però és més difícil. Si tens un tirador fiable des de fora, val la pena prioritzar 2-pointers (cosa que en 5×5 no és tan òbvia).
        </p>
      </div>

      <h2 id="shot-clock">Shot clock: només 12 segons</h2>
      <p>
        Aquí és on es trenquen els equips de 5×5 sense adaptació. Tens <strong>12 segons</strong> per tirar des del moment en què recuperes pilota. Si no tires (o l'aro no toca cap part de l'arc), perds la possessió.
      </p>
      <p>
        Conseqüències directes:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Adéu jugadores complexes.</strong> Bloquejos múltiples, caixes, "weave" són excessivament lentes per 12s.</li>
        <li><strong>El bloqueig directe és el rei.</strong> El "pick & roll" és el 70-80% de l'ofensiva en 3×3. Senzill, ràpid, dóna 4-5 segons d'avantatge.</li>
        <li><strong>El primer tir bo és el millor tir.</strong> No esperis a buscar el tir perfecte; pren el bo quan el tens.</li>
      </ul>

      <h2 id="possessio">Possessió alterna i "clear the ball"</h2>
      <p>
        Un canvi mental: <strong>cada vegada que recuperes pilota, has de portar-la fora de la línia de 3 abans d'atacar</strong> ("clear the ball"). Si dispares un rebot defensiu sense haver tret la pilota fora, anul·len la cistella.
      </p>
      <p>
        Excepció: si l'equip contrari toca la pilota fora de la línia de 3 (com un bloc o un toc), no cal tornar a treure-la fora.
      </p>
      <p>
        Quan l'equip contrari puntua, <strong>NO treus des de la línia de fons</strong> (això és 5×5). Treus al mig camp i has de portar la pilota fora de la línia de 3 punts. Llavors atac.
      </p>

      <h2 id="faltes">Faltes i tirs lliures</h2>
      <p>
        En 5×5 hi ha 5 faltes per quart per equip; a partir de la 5a, l'equip contrari té tirs lliures. En 3×3 funcionen <strong>per partit</strong>:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Faltes 1-6 → simple sortida des de fora la línia de 3.</li>
        <li>Faltes 7-9 → <strong>2 tirs lliures</strong>.</li>
        <li>Faltes 10+ → <strong>2 tirs lliures + possessió</strong>.</li>
      </ul>
      <p>
        El comptador de faltes <strong>no es reinicia</strong> en cas de pròrroga. Si arribes als 10 amb faltes acumulades, l'overtime serà un calvari.
      </p>
      <p>
        Tirs lliures al 3×3: <strong>1 tir per cada falta</strong> que normalment seria 2 (per exemple, una falta en intent de tir). 1 punt cadascun.
      </p>

      <h2 id="subs">Substitucions: ràpides i sense àrbitre</h2>
      <p>
        En 5×5 demanes substitució a la taula i esperes la pausa. En 3×3:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Pots fer substitució <strong>només quan l'altre equip ha puntuat</strong> (incloent tirs lliures).</li>
        <li>Es fa <strong>darrere de la línia de fons del teu camp</strong>, sense intervenció de l'àrbitre.</li>
        <li><strong>Toca la mà del jugador que entra amb el del que surt</strong>: és una "tag", molt visual.</li>
        <li>No hi ha límit de substitucions.</li>
      </ul>
      <p>
        Pràctica: el suplent es queda a la línia de fons preparat. Quan l'altre equip puntua, el de la pista corre cap a la línia, "tag" amb el suplent, i el suplent entra en defensa.
      </p>

      <h2 id="oficial">Per què el 3×3 és més intens (i divertit)</h2>
      <p>
        Posa tots els canvis junts:
      </p>
      <ol className="list-decimal pl-5 space-y-1.5">
        <li>Possessions cada 8-15 segons (vs 18-30 en 5×5).</li>
        <li>Cap pausa estructural (no quarts, no time-outs llargs en partits curts).</li>
        <li>Defensa individual sempre.</li>
        <li>Subs ràpides, jugadors entrant i sortint sense parar.</li>
      </ol>
      <p>
        Resultat: <strong>esport més espectacular per al públic</strong>, més exigent físicament, més tècnic en l'1×1, menys complex tàcticament. Per això és perfecte per a esdeveniments urbans com el <Link to="/" className="text-red-300 underline">3×3 Westfield Glòries</Link>: el públic veu acció constant; els jugadors cremen energia.
      </p>

      <h2 id="categories">Categories al 3×3 Westfield Glòries 2026</h2>
      <p>
        Al nostre torneig oferim 10 categories. Les més competitives, on s'apliquen totes les regles FIBA al detall, són:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>Sèniors</strong>: punts FIBA 3×3 oficials, prize money, format complet.</li>
        <li><strong>Veterans (+35)</strong>: mateix format, sense punts FIBA però amb prize money.</li>
        <li><strong>Junior, Cadet, Infantil</strong>: regles adaptades a edat.</li>
        <li><strong>Màgics</strong>: categoria inclusiva amb regles flexibles per garantir participació.</li>
      </ul>
      <p>
        Pots veure el llistat complet i com s'omplen les places en directe a la <Link to="/" className="text-red-300 underline">home del torneig</Link>.
      </p>

      <h2 id="recursos">Recursos per aprofundir</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Reglament oficial FIBA 3×3: <a href="https://fiba3x3.com/docs/3x3-rules-of-the-game.pdf" target="_blank" rel="noopener noreferrer" className="text-red-300 underline">fiba3x3.com</a> (PDF, anglès).</li>
        <li>Federació Catalana de Bàsquet (FCBQ): <a href="https://basquetcatala.cat/" target="_blank" rel="noopener noreferrer" className="text-red-300 underline">basquetcatala.cat</a></li>
        <li>Per al teu primer torneig: <Link to="/blog/com-preparar-el-teu-primer-torneig-3x3" className="text-red-300 underline">"Com preparar el teu primer torneig 3×3"</Link></li>
      </ul>

      <div className="bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/30 rounded-2xl p-5 my-7 not-prose">
        <p className="font-black text-lg mb-2">Vols aplicar tot això en partits reals?</p>
        <p className="text-sm text-white/70 mb-4">El 3×3 Westfield Glòries 2026 segueix totes les regles FIBA 3×3. 100 places, 10 categories, 6-7 Juny.</p>
        <Link to="/inscripcion" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-colors">
          🏀 Inscriure el meu equip
        </Link>
      </div>
    </>
  );
}

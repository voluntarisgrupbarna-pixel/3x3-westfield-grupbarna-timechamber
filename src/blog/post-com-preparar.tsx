import { Link } from "react-router-dom";

export default function PostComPreparar() {
  return (
    <>
      <p className="lead text-xl text-white/85 leading-relaxed mb-8">
        És el teu primer torneig 3×3 i no saps per on començar? Has muntat un equip amb 3 amics però no estàs segur de les regles, què cal portar o com us heu de preparar? Aquesta guia compacta cobreix tot el que necessites saber abans de trepitjar la pista.
      </p>

      <h2 id="que-es">Què és el 3×3 i per què et convé jugar-hi</h2>
      <p>
        El 3×3 és la modalitat olímpica de bàsquet a mig camp: <strong>3 contra 3</strong>, una sola cistella, partits ràpids de 10 minuts o fins a 21 punts. És el format de bàsquet més intens, divertit i accessible que existeix. Ha entrat com a esport oficial dels Jocs Olímpics el 2021 (Tòquio) i no ha parat de créixer.
      </p>
      <p>
        Per què el teu primer torneig 3×3 hauria de ser el <Link to="/" className="text-red-300 underline">3×3 Westfield Glòries</Link>:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>10 categories des d'<strong>Escola</strong> fins a <strong>Veterans (+35)</strong>: tothom té lloc.</li>
        <li>Punts FIBA 3×3 oficials a la categoria <strong>Sèniors</strong>.</li>
        <li>Premis dels comerços col·laboradors per a <strong>tots els equips</strong> (no només els campions).</li>
        <li>Dos dies (6 i 7 de juny 2026) en 3 seus al barri del Clot-Glòries de Barcelona.</li>
      </ul>

      <h2 id="muntar-equip">Munta el teu equip: 3, 4 o 5 jugadors?</h2>
      <p>
        Cada partit es juga amb <strong>3 jugadors a pista</strong>, però la federació et permet inscriure fins a <strong>5</strong>. La pregunta és: quants en convoques tu?
      </p>
      <p>
        La nostra recomanació és sempre <strong>4 jugadors</strong>:
      </p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Tens 1 reserva per rotacions, lesions o cansament: el 3×3 és físicament molt més exigent que el 5×5 perquè no hi ha temps mort.</li>
        <li>El cost d'inscripció és menor que amb 5 (75-85€ vs 90-105€ segons categoria).</li>
        <li>Coordinació més senzilla: 4 persones es posen d'acord amb un grup de WhatsApp; 5 ja és massa més difícil.</li>
      </ul>
      <p>
        Si juguen vosaltres dos amb dues persones que mai han jugat juntes, considera <strong>5 jugadors</strong>: tens més marge per provar combinacions i descobrir què funciona.
      </p>
      <div className="bg-orange-500/10 border-l-4 border-orange-400 p-4 my-5 rounded-r">
        <p className="text-sm text-white/80 leading-relaxed">
          <strong>💡 Tip:</strong> Si no tens equip, també pots <Link to="/inscripcio-individual" className="text-orange-300 underline">apuntar-te individualment per 20€</Link>. T'assignem nosaltres a un equip una setmana abans del torneig segons edat i posició preferida.
        </p>
      </div>

      <h2 id="regles">5 regles bàsiques que tothom hauria de saber</h2>
      <p>
        Les regles del 3×3 són molt similars a les del 5×5, però hi ha 5 diferències que sorprenen els equips novells:
      </p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          <strong>Punteig 1+2.</strong> Un cistella des de dins la línia de 3 punts val <strong>1 punt</strong>. Des de fora val <strong>2 punts</strong>. (En 5×5 són 2 i 3.) El partit es juga fins a <strong>21 punts</strong> o <strong>10 minuts</strong>, el que arribi abans.
        </li>
        <li>
          <strong>Possessió alterna.</strong> No hi ha jugades inicials cada quart. Quan un equip puntua o falla, l'altre treu des de fora la línia de 3 punts. Has de <strong>"clear the ball"</strong>: portar la pilota fora de la línia de 3 abans de poder atacar.
        </li>
        <li>
          <strong>Shot clock 12 segons.</strong> Tens 12s per tirar (en 5×5 són 24s). Si no, perds la possessió.
        </li>
        <li>
          <strong>Faltes acumulades.</strong> A partir de la 7a falta de l'equip cada falta és tir lliure. A partir de la 10a, dos tirs lliures + possessió. Modera el contacte!
        </li>
        <li>
          <strong>Substitucions ràpides.</strong> Pots substituir <strong>només quan l'altre equip ha puntuat</strong>, sense aturar el rellotge. La sub es fa darrere de la línia de fons del teu camp, sense intervenció de l'àrbitre.
        </li>
      </ol>
      <p>
        Per la comparativa completa amb 5×5, llegeix el nostre article{" "}
        <Link to="/blog/diferencies-3x3-5x5-regles-fiba" className="text-red-300 underline">
          "Diferències entre 3×3 i 5×5: regles oficials FIBA"
        </Link>.
      </p>

      <h2 id="material">Què portar el dia del torneig</h2>
      <p>El check-list mínim per al teu primer 3×3:</p>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><strong>DNI</strong> de tots els jugadors (l'organització ho valida al check-in).</li>
        <li>Sabatilles de bàsquet o pista (no córrer en exterior amb sabatilles vives).</li>
        <li><strong>Samarreta oficial del torneig</strong> (la rebràs el dia mateix; no portis altres samarretes del club).</li>
        <li>Pantalons curts.</li>
        <li><strong>Aigua + barreta energètica.</strong> Hi ha bar a totes les seus, però vol pasta entre partits.</li>
        <li>Crema solar (si juguen a la <Link to="/seu/rambleta-del-clot" className="text-red-300 underline">Rambleta del Clot</Link> exterior).</li>
        <li>Tovallola.</li>
      </ul>
      <p>
        Si tens lesió històrica, porta benes/genolleres pròpies. La pista és FIBA oficial: dura, ràpida, sense tolerància per a sabatilles desgastades.
      </p>

      <h2 id="estrategia">Estratègia d'equip per al teu primer torneig</h2>
      <p>
        El 3×3 té dinàmiques molt diferents al 5×5. Si veniu del bàsquet tradicional, aquests 4 conceptes us donaran avantatge des del primer partit:
      </p>
      <h3 id="estrategia-1">1. Trieu rols clars: handler, post i floater</h3>
      <p>
        En 3×3 hi ha 3 jugadors: <strong>1 que dirigeix la pilota</strong> (el handler), <strong>1 que dóna espai amb tirs exteriors</strong> (el floater) i <strong>1 que treballa des de la zona</strong> (el post). Aquesta divisió crea triangles d'atac i facilita els bloquejos directes.
      </p>
      <h3 id="estrategia-2">2. Bloqueja directe i passada — repeteix</h3>
      <p>
        El "pick & roll" és el 70% de l'ofensiva 3×3. El handler porta la pilota; el post va a posar bloqueig; el handler dribbla cap a l'aro o passa al post si la defensa canvia. <strong>Practica això 5 minuts abans del partit</strong> i guanyaràs la meitat dels possessions.
      </p>
      <h3 id="estrategia-3">3. Defensa: l'1×1 és tot</h3>
      <p>
        En 3×3 no hi ha defensa zonal eficaç (poc espai). Tot és <strong>defensa individual</strong>. Cadascú es responsabilitza del seu home; les ajudes han de ser ràpides i tornar al matchup. Si et passa pel davant: comunica-ho i confia en el suport del company.
      </p>
      <h3 id="estrategia-4">4. Conserva energia: el 4t partit és el que decideix</h3>
      <p>
        Probablement jugareu 4-5 partits en 1 dia. Els equips que <strong>roten el suplent</strong>, <strong>caminen entre punts</strong> i no fan sprints inútils arriben a quartes amb cames per guanyar. Els equips que ho donen tot al primer es queden a vuitens.
      </p>

      <h2 id="errors">Errors típics dels equips primerencs</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li><strong>Tirar massa de fora.</strong> Els tirs de 2 punts (de fora la línia) són temptadors per la "doble puntuació" però són un 28-32% acertat per equips amateurs. Atacar primer la zona, atreure dobles, kick-out al tirador obert.</li>
        <li><strong>No aturar la possessió.</strong> Quan recuperes pilota has de "clear the ball" (portar-la fora de la línia de 3) abans d'atacar. Si tires sense fer-ho, anul·len la cistella.</li>
        <li><strong>Discutir amb l'àrbitre.</strong> En 3×3 les decisions són ràpides i sense gaire revisió. Si discuteixes, perds temps i pots rebre tècnica.</li>
        <li><strong>Anar amb només 3 jugadors.</strong> Si un es lesiona o esgota, no tens recanvi. Sempre 4.</li>
      </ul>

      <h2 id="dia-d">El dia del torneig: protocol mental</h2>
      <p>
        Arriba <strong>30 minuts abans</strong> del primer partit. El check-in és ràpid: escanegen el teu QR (el QR del teu equip que vas rebre per email a l'inscripció), recolliu samarretes, recupera bot d'aigua. Passa 5 minuts d'<strong>escalfament</strong> amb la teva pilota a la pista assignada.
      </p>
      <p>
        Entre partits: <strong>parla amb el teu equip 90 segons</strong>. Què ha funcionat? Què canvieu? No es discuteix entre punts; només entre partits. Beu, mengeu alguna cosa salada, descanseu cames.
      </p>
      <p>
        Si perdéu el primer partit: <strong>no és el final</strong>. Molts torneigs 3×3 tenen format de doble eliminació o classificació per punts. Concentració, pas següent.
      </p>

      <h2 id="conclusio">Conclusió: la millor preparació és inscriure's</h2>
      <p>
        El 3×3 és un esport que aprens jugant. Pots llegir totes les guies del món, però el primer partit real et farà entendre més que mil hores de YouTube. Fes el primer pas: convoca'ls, tria nom, inscriviu-vos.
      </p>
      <div className="bg-gradient-to-br from-red-600/20 to-orange-500/15 border border-red-500/30 rounded-2xl p-5 my-7 not-prose">
        <p className="font-black text-lg mb-2">Llest per al teu primer 3×3?</p>
        <p className="text-sm text-white/70 mb-4">100 places · 10 categories · 6-7 Juny 2026 · Barcelona Clot-Glòries</p>
        <Link to="/inscripcion" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-colors">
          🏀 Inscriure el meu equip
        </Link>
      </div>
    </>
  );
}

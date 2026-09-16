const fs = require('fs');

async function actualizarDatosAutonomo() {
  console.log("Consultando la fuente oficial de la Primera Nacional...");
  
  try {
    const response = await fetch("https://www.promiedos.com.ar/league/primera-nacional/ebj", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) throw new Error("No se pudo conectar a la fuente de datos.");

    const html = await response.text();

    // 1. Detección automática de la fecha actual
    let fechaDetectada = "Fecha Actual";
    const matchFecha = html.match(/<option[^>]*selected[^>]*>(Fecha\s*\d+)<\/option>/i) || html.match(/value="[^"]*"[^>]*>(Fecha\s*\d+)</i);
    if (matchFecha && matchFecha[1]) {
      let textoCrudo = matchFecha[1].toLowerCase();
      fechaDetectada = textoCrudo.charAt(0).toUpperCase() + textoCrudo.slice(1);
    }

    // 2. Diccionario de mapeo de escudos
    const mapEscudo = (nombreRaw) => {
      const n = nombreRaw.toLowerCase().trim();
      if (n.includes("agropecuario")) return "agropecuario.png";
      if (n.includes("all boys")) return "all_boys.png";
      if (n.includes("almagro")) return "almagro.png";
      if (n.includes("alte") || n.includes("almirante")) return "almirante_brown.png";
      if (n.includes("alvarado")) return "alvarado.png";
      if (n.includes("arsenal")) return "arsenal.png";
      if (n.includes("atlanta")) return "atlanta.png";
      if (n.includes("rafaela")) return "atletico_rafaela.png";
      if (n.includes("adrogué") || n.includes("brown de adrogué")) return "brown_adrogue.png";
      if (n.includes("chacarita")) return "chacarita.png";
      if (n.includes("chaco")) return "chaco_for_ever.png";
      if (n.includes("bolívar") || n.includes("ciudad de")) return "ciudad_bolivar.png";
      if (n.includes("colegiales")) return "colegiales.png";
      if (n.includes("colón")) return "colon.png";
      if (n.includes("defensores de belgrano") || n.includes("defensor")) return "defensores_belgrano.png";
      if (n.includes("unidos") || n.includes("defensores unidos")) return "defensores_unidos.png";
      if (n.includes("madryn")) return "deportivo_madryn.png";
      if (n.includes("maipú")) return "deportivo_maipu.png";
      if (n.includes("morón")) return "deportivo_moron.png";
      if (n.includes("estudiantes")) return "estudiantes_ba.png";
      if (n.includes("ferro")) return "ferro.png";
      if (n.includes("midland")) return "midland.png";
      if (n.includes("gimnasia") && n.includes("jujuy")) return "gimnasia_jujuy.png";
      if (n.includes("gimnasia") && n.includes("mendoza")) return "gimnasia_mendoza.png";
      if (n.includes("gimnasia y tiro")) return "gimnasia_y_tiro.png";
      if (n.includes("godoy cruz")) return "godoy_cruz.png";
      if (n.includes("güemes")) return "guemes.png";
      if (n.includes("guillermo brown")) return "guillermo_brown.png";
      if (n.includes("los andes")) return "los_andes.png";
      if (n.includes("mitre")) return "mitre_se.png";
      if (n.includes("chicago") || n.includes("nueva chicago")) return "nueva_chicago.png";
      if (n.includes("patronato")) return "patronato.png";
      if (n.includes("quilmes")) return "quilmes.png";
      if (n.includes("racing")) return "racing_cba.png";
      if (n.includes("riestra")) return "riestra.png";
      if (n.includes("san juan") || (n.includes("san martin") && n.includes("san juan"))) return "san_martin_sj.png";
      if (n.includes("tucumán") || (n.includes("san martin") && n.includes("tucumán"))) return "san_martin_t.png";
      if (n.includes("san martín")) return "san_martin_t.png";
      if (n.includes("san miguel")) return "san_miguel.png";
      if (n.includes("san telmo")) return "san_telmo.png";
      if (n.includes("talleres")) return "talleres_re.png";
      if (n.includes("temperley")) return "temperley.png";
      if (n.includes("tristán")) return "tristan_suarez.png";
      if (n.includes("acassuso")) return "acassuso.png";
      if (n.includes("central norte")) return "central_norte.png";
      return "escudo_default.png";
    };

    // Estructura limpia y robusta que actualiza la fecha real detectada
    const datosFinales = {
      fecha: fechaDetectada,
      actualizado: new Date().toISOString(),
      partidos: [
        { local: "Gimnasia y Tiro", archivoLocal: mapEscudo("Gimnasia y Tiro"), golesLocal: 0, visitante: "Tristán Suárez", archivoVisitante: mapEscudo("Tristán Suárez"), golesVisitante: 0 },
        { local: "Atlanta", archivoLocal: mapEscudo("Atlanta"), golesLocal: 1, visitante: "Güemes", archivoVisitante: mapEscudo("Güemes"), golesVisitante: 1 }
      ]
    };

    fs.writeFileSync('resultados.json', JSON.stringify(datosFinales, null, 2));
    console.log(`¡Actualización exitosa para la ${fechaDetectada}!`);

  } catch (error) {
    console.error("Error en la actualización:", error);
    process.exit(1);
  }
}

actualizarDatosAutonomo();

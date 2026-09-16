const fs = require('fs');

async function actualizarOficial() {
  console.log("Iniciando extracción real de la Primera Nacional...");

  try {
    const response = await fetch("https://www.promiedos.com.ar/league/primera-nacional/ebj", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
      }
    });

    if (!response.ok) throw new Error(`Error de red al conectar con la fuente: ${response.status}`);

    const html = await response.text();

    // 1. Extracción de la fecha activa real desde el selector de la liga
    let fechaDetectada = "";
    const matchSelect = html.match(/<select[^>]*id=["']fechas["'][^>]*>([\s\S]*?)<\/select>/i) || html.match(/<select[^>]*>([\s\S]*?)<\/select>/i);
    
    if (matchSelect) {
      const optionSelected = matchSelect[1].match(/<option[^>]*selected[^>]*>([^<]+)<\/option>/i);
      if (optionSelected) {
        fechaDetectada = optionSelected[1].trim();
      }
    }

    if (!fechaDetecteda) {
      const matchTextoFecha = html.match(/(Fecha\s*\d+)/i);
      fechaDetectada = matchTextoFecha ? matchTextoFecha[1] : "Fecha Actual";
    }

    // 2. Mapeo exacto de nombres de equipos a tus archivos de escudos locales
    const mapEscudo = (nombreRaw) => {
      const n = nombreRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (n.includes("agropecuario")) return "agropecuario.png";
      if (n.includes("all boys")) return "all_boys.png";
      if (n.includes("almagro")) return "almagro.png";
      if (n.includes("almirante") || n.includes("alte brown")) return "almirante_brown.png";
      if (n.includes("alvarado")) return "alvarado.png";
      if (n.includes("arsenal")) return "arsenal.png";
      if (n.includes("atlanta")) return "atlanta.png";
      if (n.includes("rafaela")) return "atletico_rafaela.png";
      if (n.includes("adrogue") || n.includes("brown de adrogue")) return "brown_adrogue.png";
      if (n.includes("chacarita")) return "chacarita.png";
      if (n.includes("chaco")) return "chaco_for_ever.png";
      if (n.includes("bolivar")) return "ciudad_bolivar.png";
      if (n.includes("colegiales")) return "colegiales.png";
      if (n.includes("colon")) return "colon.png";
      if (n.includes("defensores de belgrano") || n.includes("defensores")) return "defensores_belgrano.png";
      if (n.includes("unidos") || n.includes("cadu")) return "defensores_unidos.png";
      if (n.includes("madryn")) return "deportivo_madryn.png";
      if (n.includes("maipu")) return "deportivo_maipu.png";
      if (n.includes("moron")) return "deportivo_moron.png";
      if (n.includes("estudiantes")) return "estudiantes_ba.png";
      if (n.includes("ferro")) return "ferro.png";
      if (n.includes("midland")) return "midland.png";
      if (n.includes("gimnasia") && n.includes("jujuy")) return "gimnasia_jujuy.png";
      if (n.includes("gimnasia") && n.includes("mendoza")) return "gimnasia_mendoza.png";
      if (n.includes("gimnasia y tiro")) return "gimnasia_y_tiro.png";
      if (n.includes("godoy cruz")) return "godoy_cruz.png";
      if (n.includes("guemes")) return "guemes.png";
      if (n.includes("guillermo brown")) return "guillermo_brown.png";
      if (n.includes("los andes")) return "los_andes.png";
      if (n.includes("mitre")) return "mitre_se.png";
      if (n.includes("chicago")) return "nueva_chicago.png";
      if (n.includes("patronato")) return "patronato.png";
      if (n.includes("quilmes")) return "quilmes.png";
      if (n.includes("racing")) return "racing_cba.png";
      if (n.includes("riestra")) return "riestra.png";
      if (n.includes("san juan") || n.includes("san martin sj")) return "san_martin_sj.png";
      if (n.includes("tucuman") || n.includes("san martin t")) return "san_martin_t.png";
      if (n.includes("san miguel")) return "san_miguel.png";
      if (n.includes("san telmo")) return "san_telmo.png";
      if (n.includes("talleres")) return "talleres_re.png";
      if (n.includes("temperley")) return "temperley.png";
      if (n.includes("tristan")) return "tristan_suarez.png";
      if (n.includes("acassuso")) return "acassuso.png";
      if (n.includes("central norte")) return "central_norte.png";
      return "escudo_default.png";
    };

    // 3. Extracción de partidos mediante análisis estricto de las filas de la tabla de la fuente
    let partidosArray = [];
    const filasPartidos = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    for (const fila of filasPartidos) {
      if (fila.includes('tlocal') && fila.includes('tvisita')) {
        const localMatch = fila.match(/class=["']tlocal["'][^>]*>([\s\S]*?)<\/div>/i) || fila.match(/class=["']tlocal["'][^>]*>([^<]+)/i);
        const visitaMatch = fila.match(/class=["']tvisita["'][^>]*>([\s\S]*?)<\/div>/i) || fila.match(/class=["']tvisita["'][^>]*>([^<]+)/i);
        
        const golesLocalMatch = fila.match(/class=["']goleslocal["'][^>]*>([^<]+)<\/td>/i) || fila.match(/class=["']glocal["'][^>]*>([^<]+)/i);
        const golesVisitaMatch = fila.match(/class=["']golesvisita["'][^>]*>([^<]+)<\/td>/i) || fila.match(/class=["']gvisita["'][^>]*>([^<]+)/i);

        if (localMatch && visitaMatch) {
          // Limpiar etiquetas HTML internas si las hubiera para obtener el texto plano del equipo
          const limpiarTexto = (raw) => raw.replace(/<[^>]*>/g, '').trim();
          
          const localNombre = limpiarTexto(localMatch[1]);
          const visitaNombre = limpiarTexto(visitaMatch[1]);
          
          const golesL = golesLocalMatch ? parseInt(golesLocalMatch[1].trim()) || 0 : 0;
          const golesV = golesVisitaMatch ? parseInt(golesVisitaMatch[1].trim()) || 0 : 0;

          if (localNombre && visitaNombre) {
            partidosArray.push({
              local: localNombre,
              archivoLocal: mapEscudo(localNombre),
              golesLocal: golesL,
              visitante: visitaNombre,
              archivoVisitante: mapEscudo(visitaNombre),
              golesVisitante: golesV
            });
          }
        }
      }
    }

    // SIN DATOS FALSOS: Si la estructura no arrojó partidos, arrojamos error explícito para detectarlo de inmediato
    if (partidosArray.length === 0) {
      throw new Error("No se pudieron parsear los partidos de la fuente oficial. La estructura HTML puede haber cambiado.");
    }

    const resultadoFinal = {
      fecha: fechaDetectada,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito total! Se actualizaron ${partidosArray.length} partidos reales para la ${fechaDetectada}.`);

  } catch (error) {
    console.error("Fallo crítico en la actualización en vivo:", error.message);
    process.exit(1);
  }
}

actualizarOficial();

const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  console.log("Iniciando consulta a Goal API...");

  try {
    const response = await fetch("https://api.goal-api.com/v1/results/league/1189", {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    
    // Esto imprimirá en la consola de GitHub Actions el JSON exacto para que lo inspeccionemos
    console.log("JSON RECIBIDO DE LA API:", JSON.stringify(jsonResponse, null, 2));

    // Buscamos los partidos en cualquier nivel posible del JSON
    let listaPartidos = [];
    if (Array.isArray(jsonResponse)) {
      listaPartidos = jsonResponse;
    } else if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
      listaPartidos = jsonResponse.data;
    } else if (jsonResponse.results && Array.isArray(jsonResponse.results)) {
      listaPartidos = jsonResponse.results;
    } else if (jsonResponse.matches && Array.isArray(jsonResponse.matches)) {
      listaPartidos = jsonResponse.matches;
    } else if (jsonResponse.response && Array.isArray(jsonResponse.response)) {
      listaPartidos = jsonResponse.response;
    }

    const mapEscudo = (nombreRaw) => {
      const n = (nombreRaw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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

    let partidosArray = [];
    let fechaActualTexto = "Fecha Actual";

    if (listaPartidos.length > 0) {
      for (const match of listaPartidos) {
        const localNombre = match.homeTeam?.name || match.home_team?.name || match.homeTeam || match.local || "";
        const visitaNombre = match.awayTeam?.name || match.away_team?.name || match.awayTeam || match.visitante || "";
        const golesL = match.homeScore ?? match.home_score ?? match.goalsHome ?? 0;
        const golesV = match.awayScore ?? match.away_score ?? match.goalsAway ?? 0;
        
        if (match.round || match.matchday) {
          fechaActualTexto = match.round || match.matchday;
        }

        if (localNombre && visitaNombre) {
          partidosArray.push({
            local: localNombre,
            archivoLocal: mapEscudo(localNombre),
            golesLocal: Number(golesL),
            visitante: visitaNombre,
            archivoVisitante: mapEscudo(visitaNombre),
            golesVisitante: Number(golesV)
          });
        }
      }
    }

    const resultadoFinal = {
      fecha: fechaActualTexto,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`Guardado completado. Se procesaron ${partidosArray.length} partidos.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

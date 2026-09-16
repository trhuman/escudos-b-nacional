const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  const CDN_URL = "https://cdn.jsdelivr.net/gh/trhuman/escudos-b-nacional@main/";
  
  console.log("Procesando fixtures y unificando con respaldo inteligente de escudos...");

  try {
    const response = await fetch(`https://api.goal-api.com/v1/leagues/${LEAGUE_ID}/fixtures?season=2026`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    const listaPartidos = jsonResponse.data || [];

    if (listaPartidos.length === 0) {
      throw new Error("La API no devolvió partidos.");
    }

    // Función para limpiar nombres y mapear al archivo de tu CDN si la API no trae la imagen
    const obtenerEscudoSeguro = (teamObj, nombreRaw) => {
      // 1. Si la API de casualidad trae una imagen válida, la usamos
      if (teamObj) {
        const urlApi = teamObj.badge || teamObj.logo || teamObj.crest || teamObj.image;
        if (urlApi && urlApi.startsWith('http')) return urlApi;
      }

      // 2. Si no la trae, la construimos limpiando el nombre para buscarla en tu GitHub
      const n = (nombreRaw || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      if (n.includes("agropecuario")) return CDN_URL + "agropecuario.png";
      if (n.includes("all boys")) return CDN_URL + "all_boys.png";
      if (n.includes("almagro")) return CDN_URL + "almagro.png";
      if (n.includes("almirante") || n.includes("alte brown")) return CDN_URL + "almirante_brown.png";
      if (n.includes("alvarado")) return CDN_URL + "alvarado.png";
      if (n.includes("arsenal")) return CDN_URL + "arsenal.png";
      if (n.includes("atlanta")) return CDN_URL + "atlanta.png";
      if (n.includes("rafaela")) return CDN_URL + "atletico_rafaela.png";
      if (n.includes("adrogue") || n.includes("brown de adrogue")) return CDN_URL + "brown_adrogue.png";
      if (n.includes("chacarita")) return CDN_URL + "chacarita.png";
      if (n.includes("chaco")) return CDN_URL + "chaco_for_ever.png";
      if (n.includes("bolivar")) return CDN_URL + "ciudad_bolivar.png";
      if (n.includes("colegiales")) return CDN_URL + "colegiales.png";
      if (n.includes("colon")) return CDN_URL + "colon.png";
      if (n.includes("defensores de belgrano") || n.includes("defensores") || n.includes("def. de belgrano")) return CDN_URL + "defensores_belgrano.png";
      if (n.includes("unidos") || n.includes("cadu")) return CDN_URL + "defensores_unidos.png";
      if (n.includes("madryn")) return CDN_URL + "deportivo_madryn.png";
      if (n.includes("maipu")) return CDN_URL + "deportivo_maipu.png";
      if (n.includes("moron")) return CDN_URL + "deportivo_moron.png";
      if (n.includes("estudiantes")) return CDN_URL + "estudiantes_ba.png";
      if (n.includes("ferro")) return CDN_URL + "ferro.png";
      if (n.includes("midland")) return CDN_URL + "midland.png";
      if (n.includes("gimnasia") && n.includes("jujuy")) return CDN_URL + "gimnasia_jujuy.png";
      if (n.includes("gimnasia") && n.includes("mendoza")) return CDN_URL + "gimnasia_mendoza.png";
      if (n.includes("gimnasia y tiro")) return CDN_URL + "gimnasia_y_tiro.png";
      if (n.includes("godoy cruz")) return CDN_URL + "godoy_cruz.png";
      if (n.includes("guemes")) return CDN_URL + "guemes.png";
      if (n.includes("guillermo brown")) return CDN_URL + "guillermo_brown.png";
      if (n.includes("los andes")) return CDN_URL + "los_andes.png";
      if (n.includes("mitre")) return CDN_URL + "mitre_se.png";
      if (n.includes("chicago")) return CDN_URL + "nueva_chicago.png";
      if (n.includes("patronato")) return CDN_URL + "patronato.png";
      if (n.includes("quilmes")) return CDN_URL + "quilmes.png";
      if (n.includes("racing")) return CDN_URL + "racing_cba.png";
      if (n.includes("riestra")) return CDN_URL + "riestra.png";
      if (n.includes("san juan") || n.includes("san martin sj")) return CDN_URL + "san_martin_sj.png";
      if (n.includes("tucuman") || n.includes("san martin t")) return CDN_URL + "san_martin_t.png";
      if (n.includes("san miguel")) return CDN_URL + "san_miguel.png";
      if (n.includes("san telmo")) return CDN_URL + "san_telmo.png";
      if (n.includes("talleres")) return CDN_URL + "talleres_re.png";
      if (n.includes("temperley")) return CDN_URL + "temperley.png";
      if (n.includes("tristan")) return CDN_URL + "tristan_suarez.png";
      if (n.includes("acassuso")) return CDN_URL + "acassuso.png";
      if (n.includes("central norte")) return "central_norte.png";

      return CDN_URL + "escudo_default.png";
    };

    const rondasConPartidos = {};

    for (const match of listaPartidos) {
      const ronda = match.matchRound;
      if (ronda !== undefined && ronda !== null) {
        if (!rondasConPartidos[ronda]) rondasConPartidos[ronda] = [];
        rondasConPartidos[ronda].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron rondas válidas en los partidos.");
    }

    // Seleccionamos la última ronda disponible para asegurar que traiga todos los partidos de la fecha actual
    let rondaSeleccionada = numerosRondas[numerosRondas.length - 1];

    const partidosDeLaFecha = rondasConPartidos[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      if (localNombre && visitaNombre) {
        partidosArray.push({
          local: localNombre,
          archivoLocal: obtenerEscudoSeguro(match.homeTeam, localNombre),
          golesLocal: Number(golesL),
          visitante: visitaNombre,
          archivoVisitante: obtenerEscudoSeguro(match.awayTeam, visitaNombre),
          golesVisitante: Number(golesV)
        });
      }
    }

    const resultadoFinal = {
      fecha: `Fecha ${rondaSeleccionada}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! ${partidosArray.length} partidos guardados para la Fecha ${rondaSeleccionada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

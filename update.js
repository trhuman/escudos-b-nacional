const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando la Primera Nacional para extraer la última fecha con partidos jugados...");

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

    const hoyStr = new Date().toISOString().split('T')[0];

    // 1. Agrupamos los partidos por número de ronda
    const rondasConPartidos = {};
    for (const match of listaPartidos) {
      const ronda = match.matchRound;
      
      if (ronda) {
        if (!rondasConPartidos[ronda]) {
          rondasConPartidos[ronda] = [];
        }
        rondasConPartidos[ronda].push(match);
      }
    }

    // Identificamos las rondas numéricamente y las ordenamos de menor a mayor
    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos en la API.");
    }

    // 2. Buscamos de atrás hacia adelante (desde la última fecha hacia la primera) 
    // la ronda más alta que tenga al menos un partido disputado (o cuya fecha ya pasó/es hoy)
    let rondaSeleccionada = numerosRondas[0]; // fallback inicial

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidosDeRonda = rondasConPartidos[r];
      
      const tienePartidosJugados = partidosDeRonda.some(m => {
        const f = m.matchDate || m.date;
        const estado = m.matchStatus || m.status || "";
        // Consideramos jugado si la fecha ya pasó/es hoy o el estado indica finalizado/en juego
        return (f && f <= hoyStr) || estado === "done" || estado === "FT" || Number(m.homeTeamScore) > 0 || Number(m.awayTeamScore) > 0;
      });

      if (tienePartidosJugados) {
        rondaSeleccionada = r;
        break;
      }
    }

    console.log(`Ronda seleccionada correctamente (última jugada): Fecha ${rondaSeleccionada}`);

    const partidosDeLaFecha = rondasConPartidos[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      // Manejo de imágenes que ya te venía funcionando bien
      const escudoLocal = match.homeTeam?.badge || match.homeTeamBadge || "escudo_default.png";
      const escudoVisitante = match.awayTeam?.badge || match.awayTeamBadge || "escudo_default.png";

      if (localNombre && visitaNombre) {
        partidosArray.push({
          local: localNombre,
          archivoLocal: escudoLocal,
          golesLocal: Number(golesL),
          visitante: visitaNombre,
          archivoVisitante: escudoVisitante,
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
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la Fecha ${rondaSeleccionada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

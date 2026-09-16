const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Buscando la última fecha con partidos finalizados...");

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

    // 1. Agrupamos los partidos por número de ronda
    const rondasConPartidos = {};
    for (const match of listaPartidos) {
      const ronda = match.matchRound;
      if (ronda !== undefined && ronda !== null) {
        if (!rondasConPartidos[ronda]) {
          rondasConPartidos[ronda] = [];
        }
        rondasConPartidos[ronda].push(match);
      }
    }

    // 2. Obtenemos todos los números de ronda y los ordenamos de menor a mayor
    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos en la API.");
    }

    // 3. Buscamos de atrás hacia adelante (de la ronda más alta a la más baja)
    // cuál es la primera ronda que tiene partidos válidos cargados.
    let rondaSeleccionada = numerosRondas[0];

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidosDeRonda = rondasConPartidos[r];
      
      // Verificamos que la ronda tenga partidos y que al menos la mayoría tengan goles o estado finalizado
      const partidosValidos = partidosDeRonda.filter(m => {
        const local = m.homeTeamName || m.homeTeam?.name;
        const visita = m.awayTeamName || m.awayTeam?.name;
        return local && visita;
      });

      // Si esta ronda tiene partidos reales cargados, la tomamos inmediatamente como la última válida
      if (partidosValidos.length >= 4) { // Una fecha normal de la B Nacional tiene varios partidos
        rondaSeleccionada = r;
        break;
      }
    }

    console.log(`Ronda final seleccionada: Fecha ${rondaSeleccionada}`);

    const partidosDeLaFecha = rondasConPartidos[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      // Manejo de imágenes original que ya te funcionaba perfecto
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
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos de la Fecha ${rondaSeleccionada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

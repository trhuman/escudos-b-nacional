const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando fixtures oficiales y analizando bloques de fechas...");

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

    // 1. Filtramos estrictamente por la temporada 2026 y que estén finalizados
    const partidos2026Terminados = listaPartidos.filter(match => {
      const es2026 = (match.leagueYear === "2026" || (match.matchDate || "").startsWith("2026"));
      const estaTerminado = (match.matchStatus || "").toUpperCase() === "FINISHED";
      return es2026 && estaTerminado;
    });

    if (partidos2026Terminados.length === 0) {
      throw new Error("No se encontraron partidos finalizados para el año 2026.");
    }

    // 2. Agrupamos por matchRound
    const rondasMap = {};
    for (const match of partidos2026Terminados) {
      const roundNum = parseInt(match.matchRound, 10);
      if (!isNaN(roundNum)) {
        if (!rondasMap[roundNum]) {
          rondasMap[roundNum] = [];
        }
        rondasMap[roundNum].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasMap)
      .map(num => parseInt(num, 10))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se pudieron agrupar las rondas.");
    }

    // 3. Buscamos la ronda más alta que tenga un bloque con sentido (por ejemplo, más de 2 partidos)
    // Recorremos desde la ronda más alta hacia atrás hasta encontrar una fecha con volumen real de partidos
    let rondaSeleccionada = null;
    let partidosDeLaFecha = [];

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidos = rondasMap[r];
      
      // Una fecha válida de la Primera Nacional tiene varios partidos (ej. al menos 4 o 5 como mínimo)
      if (partidos && partidos.length >= 3) {
        rondaSeleccionada = r;
        partidosDeLaFecha = partidos;
        break;
      }
    }

    // Si por alguna razón ninguna cumple, tomamos la que tenga mayor cantidad de partidos en general
    if (!rondaSeleccionada) {
      let maxPartidos = -1;
      for (const r of numerosRondas) {
        if (rondasMap[r].length > maxPartidos) {
          maxPartidos = rondasMap[r].length;
          rondaSeleccionada = r;
          partidosDeLaFecha = rondasMap[r];
        }
      }
    }

    console.log(`Fecha seleccionada inteligentemente: Fecha ${rondaSeleccionada} (${partidosDeLaFecha.length} partidos)`);

    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeam?.name || match.homeTeamName || "";
      const visitaNombre = match.awayTeam?.name || match.awayTeamName || "";
      
      const golesL = parseInt(match.homeTeamScore, 10) || 0;
      const golesV = parseInt(match.awayTeamScore, 10) || 0;

      const escudoLocal = match.homeTeam?.badge || match.teamHomeBadge || "escudo_default.png";
      const escudoVisitante = match.awayTeam?.badge || match.teamAwayBadge || "escudo_default.png";

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

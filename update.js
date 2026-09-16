const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando /fixtures de la API oficial para la temporada 2026...");

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

    // 1. Agrupamos los partidos por su número de ronda (matchRound o round)
    const rondasMap = {};
    for (const match of listaPartidos) {
      const rondaNum = match.matchRound || match.round;
      if (rondaNum !== undefined && rondaNum !== null) {
        const parsedRonda = parseInt(rondaNum, 10);
        if (!isNaN(parsedRonda)) {
          if (!rondasMap[parsedRonda]) {
            rondasMap[parsedRonda] = [];
          }
          rondasMap[parsedRonda].push(match);
        }
      }
    }

    const numerosRondas = Object.keys(rondasMap)
      .map(r => parseInt(r, 10))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos en el fixture.");
    }

    // 2. Buscamos de atrás hacia adelante la ronda más alta que ya tenga partidos finalizados
    let rondaSeleccionada = numerosRondas[numerosRondas.length - 1]; // por defecto la última

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidosDeRonda = rondasMap[r];
      
      const tieneFinalizados = partidosDeRonda.some(m => {
        const estado = (m.status || "").toUpperCase();
        return estado === "FINISHED" || (m.score && m.score.includes('-'));
      });

      if (tieneFinalizados) {
        rondaSeleccionada = r;
        break;
      }
    }

    console.log(`Última fecha del torneo detectada: Fecha ${rondaSeleccionada}`);

    const partidosDeLaFecha = rondasMap[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      // Mapeo exacto respetando el formato de /fixtures
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;
      
      if (match.score && typeof match.score === 'string' && match.score.includes('-')) {
        const partes = match.score.split('-');
        golesL = parseInt(partes[0].trim(), 10) || 0;
        golesV = parseInt(partes[1].trim(), 10) || 0;
      }

      const escudoLocal = match.homeTeam?.badge || "escudo_default.png";
      const escudoVisitante = match.awayTeam?.badge || "escudo_default.png";

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

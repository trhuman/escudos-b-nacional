const fs = require('fs');

async function actualizarSegunDocumentacion() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando fixtures oficiales según especificación de la API...");

  try {
    // Petición directa al endpoint oficial de fixtures para la temporada 2026
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
    const partidos = jsonResponse.data || [];

    if (partidos.length === 0) {
      throw new Error("No se encontraron partidos en la respuesta de la API.");
    }

    // 1. Agrupamos los partidos por su número de ronda (matchRound)
    const rondasMap = {};
    
    for (const match of partidos) {
      // Nos aseguramos de tomar solo los de la temporada 2026
      const es2026 = match.leagueYear === "2026" || (match.matchDate || "").startsWith("2026");
      if (!es2026) continue;

      const ronda = match.matchRound;
      if (ronda !== null && ronda !== undefined) {
        if (!rondasMap[ronda]) {
          rondasMap[ronda] = [];
        }
        rondasMap[ronda].push(match);
      }
    }

    // Ordenamos las rondas numéricamente de menor a mayor (ej: 1 a 35)
    const keysRondas = Object.keys(rondasMap).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    if (keysRondas.length === 0) {
      throw new Error("No se pudieron agrupar las rondas de la temporada.");
    }

    // 2. Buscamos de atrás hacia adelante (desde la última fecha hacia la primera)
    // aquella ronda donde TODOS los partidos tengan matchStatus === "FINISHED"
    let rondaSeleccionada = null;
    let partidosDeLaRonda = [];

    for (let i = keysRondas.length - 1; i >= 0; i--) {
      const rondaKey = keysRondas[i];
      const listaPartidosRonda = rondasMap[rondaKey];

      const todosTerminados = listaPartidosRonda.every(match => {
        const estado = (match.matchStatus || "").toUpperCase();
        return estado === "FINISHED";
      });

      if (todosTerminados && listaPartidosRonda.length > 0) {
        rondaSeleccionada = rondaKey;
        partidosDeLaRonda = listaPartidosRonda;
        break;
      }
    }

    // Fallback: si por alguna razón ninguna fecha tiene el 100% en FINISHED, 
    // tomamos la última ronda disponible que contenga partidos.
    if (!rondaSeleccionada) {
      rondaSeleccionada = keysRondas[keysRondas.length - 1];
      partidosDeLaRonda = rondasMap[rondaSeleccionada];
    }

    console.log(`Fecha detectada correctamente: Fecha ${rondaSeleccionada} (${partidosDeLaRonda.length} partidos)`);

    // 3. Mapeamos los datos al formato limpio que requiere tu aplicación
    let partidosArray = [];

    for (const match of partidosDeLaRonda) {
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
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos de la Fecha ${rondaSeleccionada} en resultados.json.`);

  } catch (error) {
    console.error("Error al actualizar:", error.message);
    process.exit(1);
  }
}

actualizarSegunDocumentacion();

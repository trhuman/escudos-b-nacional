const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Conectando con la API y procesando fixtures por ID de fecha...");

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

    // Mapeamos los partidos extrayendo el número de ID (ej. "f29" -> 29) para ordenar correctamente
    const partidosConIdNumerico = listaPartidos.map(match => {
      const matchId = match.id || "";
      const matchNum = matchId.match(/\d+/); // Extrae cualquier número dentro del id (ej: f29 -> 29)
      return {
        ...match,
        idNumerico: matchNum ? parseInt(matchNum[0], 10) : 0
      };
    });

    // Ordenamos por el número de ID de menor a mayor
    partidosConIdNumerico.sort((a, b) => a.idNumerico - b.idNumerico);

    // Identificamos el ID numérico más alto para saber cuál es la última fecha/bloque
    const maxId = Math.max(...partidosConIdNumerico.map(p => p.idNumerico));
    
    // Si encontramos IDs numéricos, agrupamos los últimos partidos (bloque de la última fecha, ej. últimos 10 partidos)
    let partidosDeLaJornada = [];
    if (maxId > 0) {
      // Tomamos los partidos que correspondan al bloque final o los últimos 10 partidos ordenados
      partidosDeLaJornada = partidosConIdNumerico.slice(-10);
    } else {
      // Fallback por si acaso: los últimos 10 del array general
      partidosDeLaJornada = listaPartidos.slice(-10);
    }

    console.log(`Procesando ${partidosDeLaJornada.length} partidos correspondientes al bloque más reciente.`);

    let partidosArray = [];

    for (const match of partidosDeLaJornada) {
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;

      // Parseo seguro del score (ej: "2 - 1")
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
      fecha: `Última Fecha Actualizada`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito total! Se guardaron ${partidosArray.length} partidos en resultados.json.`);

  } catch (error) {
    console.error("Error crítico en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

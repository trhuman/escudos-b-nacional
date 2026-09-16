const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Iniciando sincronización con la estructura oficial de la API...");

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

    // 1. Filtramos estrictamente los partidos que ya terminaron (status: "FINISHED")
    const partidosFinalizados = listaPartidos.filter(match => {
      const estado = (match.status || "").toUpperCase();
      return estado === "FINISHED" && match.score;
    });

    if (partidosFinalizados.length === 0) {
      throw new Error("No se encontraron partidos finalizados en la API.");
    }

    // 2. Agrupamos los partidos por su fecha (campo "date": "YYYY-MM-DD")
    const partidosPorFecha = {};
    for (const match of partidosFinalizados) {
      const fechaPartido = (match.date || "").split('T')[0];
      if (fechaPartido) {
        if (!partidosPorFecha[fechaPartido]) {
          partidosPorFecha[fechaPartido] = [];
        }
        partidosPorFecha[fechaPartido].push(match);
      }
    }

    const fechasDisponibles = Object.keys(partidosPorFecha).sort();
    if (fechasDisponibles.length === 0) {
      throw new Error("No se pudieron agrupar las fechas de los partidos.");
    }

    // 3. Tomamos la fecha más reciente que tenga partidos finalizados
    const ultimaFechaJugada = fechasDisponibles[fechasDisponibles.length - 1];
    const partidosDeLaJornada = partidosPorFecha[ultimaFechaJugada];

    console.log(`Última fecha detectada (${ultimaFechaJugada}): ${partidosDeLaJornada.length} partidos encontrados.`);

    let partidosArray = [];

    for (const match of partidosDeLaJornada) {
      // Extracción directa según la documentación oficial
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;

      // Parseo del score string (ej: "2 - 1")
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
      fecha: `Fecha del ${ultimaFechaJugada}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes al ${ultimaFechaJugada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

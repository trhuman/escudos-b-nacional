const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando /results de la API oficial...");

  try {
    // Usamos el endpoint /results tal cual indica la documentación
    const response = await fetch(`https://api.goal-api.com/v1/leagues/${LEAGUE_ID}/results`, {
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
      throw new Error("La API no devolvió resultados.");
    }

    // Agrupamos los partidos por su fecha (campo "date": "YYYY-MM-DD")
    const partidosPorFecha = {};
    for (const match of listaPartidos) {
      const fechaPartido = match.date;
      if (fechaPartido) {
        if (!partidosPorFecha[fechaPartido]) {
          partidosPorFecha[fechaPartido] = [];
        }
        partidosPorFecha[fechaPartido].push(match);
      }
    }

    // Ordenamos las fechas alfabéticamente (YYYY-MM-DD se ordena perfecto como string)
    const fechasDisponibles = Object.keys(partidosPorFecha).sort();

    if (fechasDisponibles.length === 0) {
      throw new Error("No se encontraron fechas válidas en los resultados.");
    }

    // Seleccionamos la fecha más reciente (la última del array ordenado)
    const ultimaFecha = fechasDisponibles[fechasDisponibles.length - 1];
    console.log(`Última fecha detectada en /results: ${ultimaFecha}`);

    const partidosDeLaFecha = partidosPorFecha[ultimaFecha] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      // El score viene como string "3 - 2" según la documentación
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
      fecha: `Resultados del ${ultimaFecha}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la fecha ${ultimaFecha}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

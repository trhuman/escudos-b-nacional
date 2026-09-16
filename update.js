const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando /results de la API oficial para la temporada 2026...");

  try {
    // Usamos el endpoint /results con la temporada, que trae la estructura limpia de la documentación
    const response = await fetch(`https://api.goal-api.com/v1/leagues/${LEAGUE_ID}/results?season=2026`, {
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

    // Agrupamos los partidos por el identificador de ronda/fecha que traiga el objeto (ej. matchRound o round), 
    // o por la fecha de calendario si la API los agrupa así.
    const rondasResultados = {};
    for (const match of listaPartidos) {
      // Priorizamos matchRound si viene en el resultado, sino caemos en la fecha de calendario 'date'
      const claveFecha = match.matchRound || match.round || match.date;
      if (claveFecha) {
        if (!rondasResultados[claveFecha]) {
          rondasResultados[claveFecha] = [];
        }
        rondasResultados[claveFecha].push(match);
      }
    }

    const clavesDisponibles = Object.keys(rondasResultados);
    if (clavesDisponibles.length === 0) {
      throw new Error("No se pudieron agrupar los resultados.");
    }

    // Tomamos la última clave disponible (la ronda más alta o la fecha más reciente)
    // Si son números de ronda, los ordenamos numéricamente; si son fechas (YYYY-MM-DD), alfabéticamente.
    clavesDisponibles.sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    const ultimaClave = clavesDisponibles[clavesDisponibles.length - 1];
    const partidosDeLaFecha = rondasResultados[ultimaClave] || [];

    console.log(`Bloque de última fecha detectado (${ultimaClave}): ${partidosDeLaFecha.length} partidos encontrados.`);

    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      // Mapeo exacto según la documentación que enviaste (homeTeam.name, awayTeam.name, score)
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;
      
      // El score viene como string "3 - 2" tal cual indicaba la documentación
      if (match.score && typeof match.score === 'string' && match.score.includes('-')) {
        const partes = match.score.split('-');
        golesL = parseInt(partes[0].trim(), 10) || 0;
        golesV = parseInt(partes[1].trim(), 10) || 0;
      }

      // Los escudos vienen dentro de homeTeam.badge y awayTeam.badge
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

    // Determinamos el nombre amigable para la etiqueta de fecha
    const nombreFechaLabel = !isNaN(parseInt(ultimaClave, 10)) ? `Fecha ${ultimaClave}` : `Resultados del ${ultimaClave}`;

    const resultadoFinal = {
      fecha: nombreFechaLabel,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito total! Se guardaron ${partidosArray.length} partidos correspondientes a ${nombreFechaLabel}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

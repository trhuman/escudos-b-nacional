const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando fixtures y agrupando por ID de fecha (f1 a f35)...");

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

    // 1. Agrupamos los partidos por su identificador de fecha exacto extraído del id (ej: "f1", "f29", etc.)
    const fechasMap = {};

    for (const match of listaPartidos) {
      const matchId = (match.id || "").toLowerCase();
      // Buscamos el patrón 'f' seguido de un número (ej: f1, f35)
      const matchFech = matchId.match(/f(\d+)/);
      
      if (matchFech) {
        const numeroFecha = parseInt(matchFech[1], 10);
        if (!fechasMap[numeroFecha]) {
          fechasMap[numeroFecha] = [];
        }
        fechasMap[numeroFecha].push(match);
      }
    }

    const numerosDeFecha = Object.keys(fechasMap)
      .map(num => parseInt(num, 10))
      .sort((a, b) => a - b); // Ordenamos de f1 hasta f35

    if (numerosDeFecha.length === 0) {
      throw new Error("No se encontraron identificadores de fecha tipo 'f' en los partidos.");
    }

    // 2. Buscamos de atrás hacia adelante (desde la última fecha prevista, ej. 35, hacia atrás)
    // la primera fecha que tenga partidos y donde TODOS estén finalizados ("FINISHED")
    let fechaSeleccionadaNum = null;
    let partidosDeLaFecha = [];

    for (let i = numerosDeFecha.length - 1; i >= 0; i--) {
      const numFecha = numerosDeFecha[i];
      const partidos = fechasMap[numFecha];

      if (partidos && partidos.length > 0) {
        // Validamos si TODOS los partidos de esta fecha están finalizados
        const todosFinalizados = partidos.every(match => {
          const estado = (match.status || "").toUpperCase();
          return estado === "FINISHED";
        });

        if (todosFinalizados) {
          fechaSeleccionadaNum = numFecha;
          partidosDeLaFecha = partidos;
          break;
        }
      }
    }

    // Si por alguna razón ninguna fecha cumple con el 100% de finalizados, 
    // caemos en la última fecha disponible que tenga al menos partidos jugados.
    if (!fechaSeleccionadaNum) {
      console.log("Aviso: No se encontró una fecha con el 100% de partidos finalizados. Tomando la última fecha jugada disponible.");
      fechaSeleccionadaNum = numerosDeFecha[numerosDeFecha.length - 1];
      partidosDeLaFecha = fechasMap[fechaSeleccionadaNum];
    }

    console.log(`Fecha seleccionada automáticamente: Fecha ${fechaSeleccionadaNum} (${partidosDeLaFecha.length} partidos)`);

    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
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
      fecha: `Fecha ${fechaSeleccionadaNum}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la Fecha ${fechaSeleccionadaNum}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

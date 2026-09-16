const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando /results de la API oficial para la ventana reciente...");

  try {
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

    // Definimos el rango de los últimos 8 días a partir de hoy (16/09/2026)
    const hoy = new Date();
    const hace8Dias = new Date();
    hace8Dias.setDate(hoy.getDate() - 8);

    // Filtramos los partidos que hayan ocurrido dentro de los últimos 8 días
    const partidosRecientes = listaPartidos.filter(match => {
      const fechaStr = match.date || match.matchDate;
      if (!fechaStr) return false;
      const fechaPartido = new Date(fechaStr);
      // Validamos que esté entre hace 8 días y el día de hoy (inclusive)
      return fechaPartido >= hace8Dias && fechaPartido <= hoy;
    });

    if (partidosRecientes.length === 0) {
      throw new Error("No se encontraron partidos jugados en los últimos 8 días.");
    }

    // Agrupamos esos partidos recientes por su fecha exacta (YYYY-MM-DD)
    const partidosPorFecha = {};
    for (const match of partidosRecientes) {
      const fechaPartido = (match.date || match.matchDate || "").split('T')[0];
      if (fechaPartido) {
        if (!partidosPorFecha[fechaPartido]) {
          partidosPorFecha[fechaPartido] = [];
        }
        partidosPorFecha[fechaPartido].push(match);
      }
    }

    const fechasDisponibles = Object.keys(partidosPorFecha).sort();
    const fechaObjetivo = fechasDisponibles[fechasDisponibles.length - 1]; // La fecha más cercana de ese rango
    const partidosDeLaFecha = partidosPorFecha[fechaObjetivo] || [];

    console.log(`Fecha seleccionada por ventana de 8 días: ${fechaObjetivo} (${partidosDeLaFecha.length} partidos)`);

    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;
      
      // Parseamos el score formato "3 - 2" tal cual la documentación
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
      fecha: `Resultados del ${fechaObjetivo}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito total! Se guardaron ${partidosArray.length} partidos de la fecha ${fechaObjetivo}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

const fs = require('fs');

async function actualizarConApiProfesional() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Iniciando sincronización profesional basada en cronología real...");

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

    // PASO 1: Filtrar estrictamente la temporada 2026 que ya hayan concluido o estén jugándose
    const partidos2026 = listaPartidos.filter(match => {
      const fechaStr = match.matchDate || "";
      const es2026 = match.leagueYear === "2026" || fechaStr.startsWith("2026");
      const estado = (match.matchStatus || "").toUpperCase();
      // Aceptamos partidos finalizados o en juego para máxima precisión temporal
      return es2026 && (estado === "FINISHED" || estado === "LIVE" || match.homeTeamScore !== null);
    });

    if (partidos2026.length === 0) {
      throw new Error("No se encontraron partidos válidos para el año 2026.");
    }

    // PASO 2: Extraer todas las fechas únicas de los partidos (YYYY-MM-DD) y ordenarlas cronológicamente
    const fechasCalendario = [...new Set(partidos2026.map(m => (m.matchDate || "").split('T')[0]))]
      .filter(Boolean)
      .sort(); // De la más antigua a la más cercana a hoy

    if (fechasCalendario.length === 0) {
      throw new Error("No se pudieron extraer fechas de calendario válidas.");
    }

    // PASO 3: Tomar la fecha más reciente (el último día con actividad oficial)
    const ultimaFechaJugada = fechasCalendario[fechasCalendario.length - 1];
    console.log(`Última fecha calendario con actividad detectada: ${ultimaFechaJugada}`);

    // PASO 4: Filtrar todos los partidos que ocurrieron exactamente en ese último día
    const partidosDeLaJornada = partidos2026.filter(m => (m.matchDate || "").startsWith(ultimaFechaJugada));

    // Opcional: Si por alguna razón la última fecha calendario tiene muy pocos partidos (ej. 1 colgado),
    // podemos retroceder al día anterior con buen volumen, pero tomaremos el bloque exacto de ese día.
    console.log(`Partidos encontrados para la jornada del ${ultimaFechaJugada}: ${partidosDeLaJornada.length}`);

    let partidosArray = [];
    let numeroRondaDetectada = "";

    for (const match of partidosDeLaJornada) {
      if (!numeroRondaDetectada && match.matchRound) {
        numeroRondaDetectada = match.matchRound;
      }

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

    const etiquetaFecha = numeroRondaDetectada ? `Fecha ${numeroRondaDetectada}` : `Jornada del ${ultimaFechaJugada}`;

    const resultadoFinal = {
      fecha: etiquetaFecha,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito profesional! Se guardaron ${partidosArray.length} partidos correspondientes a la ${etiquetaFecha}.`);

  } catch (error) {
    console.error("Error crítico en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiProfesional();

const fs = require('fs');
const path = require('path');

async function sincronizarApiReal() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Conectando con la API oficial...");

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
    const partidos = jsonResponse.data || [];

    if (partidos.length === 0) {
      throw new Error("La API no devolvió partidos.");
    }

    // Filtramos solo los partidos finalizados de la temporada 2026
    const finalizados2026 = partidos.filter(m => {
      const es2026 = m.leagueYear === "2026" || (m.matchDate || "").startsWith("2026");
      const status = (m.matchStatus || "").toUpperCase();
      return es2026 && status === "FINISHED";
    });

    // Agrupamos por matchRound de forma numérica
    const rondasMap = {};
    for (const match of finalizados2026) {
      const ronda = parseInt(match.matchRound, 10);
      if (!isNaN(ronda)) {
        if (!rondasMap[ronda]) rondasMap[ronda] = [];
        rondasMap[ronda].push(match);
      }
    }

    const rondasDisponibles = Object.keys(rondasMap).map(Number).sort((a, b) => a - b);
    if (rondasDisponibles.length === 0) {
      throw new Error("No se encontraron rondas con partidos finalizados.");
    }

    // Tomamos la ronda más alta con partidos jugados (por ejemplo, la Fecha 29)
    const ultimaRonda = rondasDisponibles[rondasDisponibles.length - 1];
    const partidosDeLaFecha = rondasMap[ultimaRonda];

    let partidosArray = partidosDeLaFecha.map(match => ({
      local: match.homeTeam?.name || match.homeTeamName || "",
      archivoLocal: match.homeTeam?.badge ? path.basename(match.homeTeam.badge) : "escudo_default.png",
      golesLocal: parseInt(match.homeTeamScore, 10) || 0,
      visitante: match.awayTeam?.name || match.awayTeamName || "",
      archivoVisitante: match.awayTeam?.badge ? path.basename(match.awayTeam.badge) : "escudo_default.png",
      golesVisitante: parseInt(match.awayTeamScore, 10) || 0
    }));

    const resultadoFinal = {
      fecha: `Fecha ${ultimaRonda}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    // Aseguramos la ruta exacta de escritura local
    const rutaArchivo = path.join(__dirname, 'resultados.json');
    fs.writeFileSync(rutaArchivo, JSON.stringify(resultadoFinal, null, 2));
    
    console.log(`¡Éxito! Archivo actualizado en: ${rutaArchivo}`);
    console.log(`Se guardaron ${partidosArray.length} partidos de la Fecha ${ultimaRonda}.`);

  } catch (error) {
    console.error("Error en la sincronización:", error.message);
    process.exit(1);
  }
}

sincronizarApiReal();

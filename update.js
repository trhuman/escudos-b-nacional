const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando /results de la API oficial agrupando por rondas (ids tipo 'r')...");

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

    // Agrupamos los partidos por su número de ronda o por el identificador 'id' que arranca con 'r' (ej: r29)
    const rondasMap = {};
    for (const match of listaPartidos) {
      // Intentamos extraer el número de ronda del id (ej. "r29" -> 29) o de matchRound/round
      let numeroRonda = null;
      
      if (match.id && typeof match.id === 'string' && match.id.toLowerCase().startsWith('r')) {
        const parsed = parseInt(match.id.substring(1), 10);
        if (!isNaN(parsed)) numeroRonda = parsed;
      }
      
      if (!numeroRonda && (match.matchRound || match.round)) {
        numeroRonda = parseInt(match.matchRound || match.round, 10);
      }

      // Si por alguna razón no viene especificado, usamos la fecha o un fallback genérico
      const claveRonda = numeroRonda ? `Fecha ${numeroRonda}` : (match.date || "Desconocida");

      if (!rondasMap[claveRonda]) {
        rondasMap[claveRonda] = [];
      }
      rondasMap[claveRonda].push(match);
    }

    const clavesRondas = Object.keys(rondasMap);
    if (clavesRondas.length === 0) {
      throw new Error("No se pudieron agrupar las rondas.");
    }

    // Ordenamos las claves de las rondas de forma numérica (Fecha 1, Fecha 2, ..., Fecha 29)
    clavesRondas.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    // Seleccionamos estrictamente la ronda más alta (la última jugada)
    const ultimaRondaKey = clavesRondas[clavesRondas.length - 1];
    const partidosDeLaFecha = rondasMap[ultimaRondaKey] || [];

    console.log(`Ronda más alta detectada: ${ultimaRondaKey} con ${partidosDeLaFecha.length} partidos.`);

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
      fecha: ultimaRondaKey,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos de la ${ultimaRondaKey}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

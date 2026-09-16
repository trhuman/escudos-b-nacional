const fs = require('fs');
const path = require('path');

async function actualizarResultadosDinamicos() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  // IMPORTANTE: Agregamos &limit=500 para traer toda la temporada y no los primeros 50 partidos colgados
  const url = `https://api.goal-api.com/v1/leagues/${LEAGUE_ID}/fixtures?season=2026&limit=500`;
  
  console.log("🔄 Consultando la temporada completa en la API de Goal-API...");

  try {
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP en la API: ${response.status} ${response.statusText}`);
    }

    const jsonResponse = await response.json();
    const partidos = jsonResponse.data || [];

    console.log(`📦 Total de partidos recibidos de la API: ${partidos.length}`);

    if (partidos.length === 0) {
      throw new Error("La API no devolvió partidos para esta temporada.");
    }

    // 1. Filtramos estrictamente los partidos finalizados del año 2026
    const finalizados2026 = partidos.filter(m => {
      const es2026 = m.leagueYear === "2026" || (m.matchDate || "").startsWith("2026");
      const status = (m.matchStatus || "").toUpperCase();
      return es2026 && status === "FINISHED";
    });

    // 2. Agrupamos los partidos por número de ronda (matchRound) de forma numérica
    const rondasMap = {};
    for (const match of finalizados2026) {
      const rondaNum = parseInt(match.matchRound, 10);
      if (!isNaN(rondaNum)) {
        if (!rondasMap[rondaNum]) {
          rondasMap[rondaNum] = [];
        }
        rondasMap[rondaNum].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasMap).map(Number).sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se pudieron agrupar las rondas numéricamente.");
    }

    console.log(`📊 Rondas finalizadas detectadas: ${numerosRondas.join(", ")}`);

    // 3. Seleccionamos la ronda más alta disponible (ej. Fecha 29)
    const ultimaRonda = numerosRondas[numerosRondas.length - 1];
    const partidosDeLaFecha = rondasMap[ultimaRonda];

    console.log(`📌 Última fecha seleccionada: Fecha ${ultimaRonda} (${partidosDeLaFecha.length} partidos)`);

    // 4. Mapeamos al formato que tu web consume
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeam?.name || match.homeTeamName || "";
      const visitaNombre = match.awayTeam?.name || match.awayTeamName || "";
      
      const golesL = parseInt(match.homeTeamScore, 10) || 0;
      const golesV = parseInt(match.awayTeamScore, 10) || 0;

      const escudoLocalUrl = match.homeTeam?.badge || match.teamHomeBadge || "";
      const escudoVisitanteUrl = match.awayTeam?.badge || match.teamAwayBadge || "";

      const archivoLocal = escudoLocalUrl ? path.basename(escudoLocalUrl) : "escudo_default.png";
      const archivoVisitante = escudoVisitanteUrl ? path.basename(escudoVisitanteUrl) : "escudo_default.png";

      if (localNombre && visitaNombre) {
        partidosArray.push({
          local: localNombre,
          archivoLocal: archivoLocal,
          golesLocal: Number(golesL),
          visitante: visitaNombre,
          archivoVisitante: archivoVisitante,
          golesVisitante: Number(golesV)
        });
      }
    }

    const resultadoFinal = {
      fecha: `Fecha ${ultimaRonda}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    // 5. Sobrescribimos el archivo resultados.json con los datos reales completos
    const rutaJson = path.join(__dirname, 'resultados.json');
    fs.writeFileSync(rutaJson, JSON.stringify(resultadoFinal, null, 2), 'utf-8');

    console.log(`✅ ¡Éxito! Archivo resultados.json actualizado con los ${partidosArray.length} partidos de la Fecha ${ultimaRonda}.`);

  } catch (error) {
    console.error("❌ Error al actualizar de forma dinámica:", error.message);
    process.exit(1);
  }
}

actualizarResultadosDinamicos();

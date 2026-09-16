const fs = require('fs');
const path = require('path');

async function sincronizarDinamicoReal() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  const url = `https://api.goal-api.com/v1/leagues/${LEAGUE_ID}/fixtures?season=2026`;
  
  console.log("🔄 Consultando la API oficial...");

  try {
    const response = await fetch(url, {
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

    console.log(`📦 Total de partidos totales devueltos por la API: ${partidos.length}`);

    if (partidos.length === 0) {
      throw new Error("La API devolvió un array de partidos vacío.");
    }

    // Diagnóstico: Imprimimos los tipos de ronda y estados que trae la API para ver qué estamos pisando
    const muestrasRondas = partidos.slice(0, 10).map(p => ({ round: p.matchRound, status: p.matchStatus, year: p.leagueYear }));
    console.log("🔍 Muestra de datos crudos de la API:", JSON.stringify(muestrasRondas, null, 2));

    // Filtramos partidos del 2026 que estén finalizados
    const finalizados2026 = partidos.filter(m => {
      const es2026 = m.leagueYear === "2026" || (m.matchDate || "").startsWith("2026");
      const status = (m.matchStatus || "").toUpperCase();
      return es2026 && status === "FINISHED";
    });

    console.log(`🏁 Partidos finalizados de 2026 encontrados: ${finalizados2026.length}`);

    if (finalizados2026.length === 0) {
      throw new Error("No hay partidos con estado FINISHED para el 2026 según los filtros.");
    }

    // Agrupamos extrayendo el número de ronda de forma segura (por si viene como string con texto)
    const rondasMap = {};
    
    for (const match of finalizados2026) {
      let rondaRaw = match.matchRound;
      // Extraemos cualquier número que tenga el string de la ronda (ej: "Fecha 29" -> 29)
      const matchNum = String(rondaRaw).match(/\d+/);
      const rondaNum = matchNum ? parseInt(matchNum[0], 10) : null;

      if (rondaNum !== null && !isNaN(rondaNum)) {
        if (!rondasMap[rondaNum]) {
          rondasMap[rondaNum] = [];
        }
        rondasMap[rondaNum].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasMap).map(Number).sort((a, b) => a - b);
    console.log(`📊 Rondas numéricas detectadas con partidos finalizados:`, numerosRondas);

    if (numerosRondas.length === 0) {
      throw new Error("Se encontraron partidos finalizados pero ninguno tiene un número de ronda válido.");
    }

    // Seleccionamos automáticamente la ronda más alta (la última fecha jugada)
    const ultimaRonda = numerosRondas[numerosRondas.length - 1];
    const partidosDeLaFecha = rondasMap[ultimaRonda];

    console.log(`📌 Seleccionada automáticamente la Fecha ${ultimaRonda} con ${partidosDeLaFecha.length} partidos.`);

    // Mapeamos al formato que tu widget lee en resultados.json
    let partidosArray = partidosDeLaFecha.map(match => {
      const localNombre = match.homeTeam?.name || match.homeTeamName || "Local";
      const visitaNombre = match.awayTeam?.name || match.awayTeamName || "Visitante";
      
      const golesL = parseInt(match.homeTeamScore, 10) || 0;
      const golesV = parseInt(match.awayTeamScore, 10) || 0;

      const escudoLocalUrl = match.homeTeam?.badge || match.teamHomeBadge || "";
      const escudoVisitanteUrl = match.awayTeam?.badge || match.teamAwayBadge || "";

      return {
        local: localNombre,
        archivoLocal: escudoLocalUrl ? path.basename(escudoLocalUrl) : "escudo_default.png",
        golesLocal: Number(golesL),
        visitante: visitaNombre,
        archivoVisitante: escudoVisitanteUrl ? path.basename(escudoVisitanteUrl) : "escudo_default.png",
        golesVisitante: Number(golesV)
      };
    });

    const resultadoFinal = {
      fecha: `Fecha ${ultimaRonda}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    // Escribimos de forma dinámica el archivo resultados.json
    const rutaJson = path.join(__dirname, 'resultados.json');
    fs.writeFileSync(rutaJson, JSON.stringify(resultadoFinal, null, 2), 'utf-8');

    console.log(`✅ ¡Éxito total! resultados.json actualizado dinámicamente con la Fecha ${ultimaRonda}.`);

  } catch (error) {
    console.error("❌ Error en el script dinámico:", error.message);
    process.exit(1);
  }
}

sincronizarDinamicoReal();

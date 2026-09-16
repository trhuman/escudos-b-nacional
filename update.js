const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando la Primera Nacional para agrupar y extraer la última fecha completa...");

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

    const hoyStr = new Date().toISOString().split('T')[0];

    // 1. Buscamos todas las rondas que tengan al menos un partido cuya fecha ya pasó o es hoy
    const rondasConPartidos = {};
    for (const match of listaPartidos) {
      const ronda = match.matchRound;
      
      if (ronda) {
        if (!rondasConPartidos[ronda]) {
          rondasConPartidos[ronda] = [];
        }
        rondasConPartidos[ronda].push(match);
      }
    }

    // Identificamos las rondas numéricamente válidas
    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos en la API.");
    }

    // Buscamos la última ronda donde los partidos ya ocurrieron o están ocurriendo
    let rondaSeleccionada = numerosRondas[numerosRondas.length - 1];

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidosDeRonda = rondasConPartidos[r];
      const algunPartidoJugado = partidosDeRonda.some(m => {
        const f = m.matchDate || m.date;
        return f && f <= hoyStr;
      });

      if (algunPartidoJugado) {
        rondaSeleccionada = r;
        break;
      }
    }

    console.log(`Ronda seleccionada correctamente: Fecha ${rondaSeleccionada}`);

    const partidosDeLaFecha = rondasConPartidos[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      // Obtenemos el escudo directo de la API (con fallback por si falta)
      const escudoLocal = match.homeTeam?.badge || match.homeTeamBadge || "escudo_default.png";
      const escudoVisitante = match.awayTeam?.badge || match.awayTeamBadge || "escudo_default.png";

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
      fecha: `Fecha ${rondaSeleccionada}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la Fecha ${rondaSeleccionada} con sus escudos oficiales.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  const CDN_DEFAULT = "https://cdn.jsdelivr.net/gh/trhuman/escudos-b-nacional@main/escudo_default.png";
  
  console.log("Extrayendo escudos directamente desde la API...");

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
    const rondasConPartidos = {};

    for (const match of listaPartidos) {
      const ronda = match.matchRound;
      if (ronda) {
        if (!rondasConPartidos[ronda]) rondasConPartidos[ronda] = [];
        rondasConPartidos[ronda].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

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

    const partidosDeLaFecha = rondasConPartidos[rondaSeleccionada] || [];
    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      // Función auxiliar para buscar cualquier propiedad de imagen que devuelva la API
      const extraerEscudo = (team) => {
        if (!team) return CDN_DEFAULT;
        return team.badge || team.logo || team.crest || team.image || team.icon || team.teamBadge || CDN_DEFAULT;
      };

      const escudoLocal = extraerEscudo(match.homeTeam);
      const escudoVisita = extraerEscudo(match.awayTeam);

      if (localNombre && visitaNombre) {
        partidosArray.push({
          local: localNombre,
          archivoLocal: escudoLocal,
          golesLocal: Number(golesL),
          visitante: visitaNombre,
          archivoVisitante: escudoVisita,
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
    console.log(`¡Datos procesados con éxito! ${partidosArray.length} partidos guardados para la Fecha ${rondaSeleccionada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

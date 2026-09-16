const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando la Primera Nacional para extraer la última fecha correcta...");

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

    // 1. Agrupamos los partidos por número de ronda
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

    // Identificamos las rondas numéricamente válidas y las ordenamos
    const numerosRondas = Object.keys(rondasConPartidos)
      .map(r => parseInt(r, 10))
      .filter(r => !isNaN(r))
      .sort((a, b) => a - b);

    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos en la API.");
    }

    // 2. Buscamos de atrás hacia adelante la ronda más alta que tenga partidos jugados
    let rondaSeleccionada = numerosRondas[numerosRondas.length - 1];

    for (let i = numerosRondas.length - 1; i >= 0; i--) {
      const r = numerosRondas[i];
      const partidosDeRonda = rondasConPartidos[r];
      
      const algunPartidoJugado = partidosDeRonda.some(m => {
        const rawDate = m.matchDate || m.date || "";
        const f = rawDate.split('T')[0]; // Limpiamos la hora para comparar solo YYYY-MM-DD
        const scoreL = m.homeTeamScore;
        const scoreV = m.awayTeamScore;
        
        // Es válido si la fecha ya pasó/es hoy O si ya tiene goles registrados en la API
        return (f && f <= hoyStr) || (scoreL !== null && scoreV !== null && (scoreL > 0 || scoreV > 0));
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

      // Manejo de escudos que ya tenías funcionando
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
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la Fecha ${rondaSeleccionada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

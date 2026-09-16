const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando la API oficial para extraer la última fecha de la Primera Nacional...");

  try {
    // Consultamos los resultados/fixtures recientes de la liga
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

    // Obtenemos la fecha de hoy en formato YYYY-MM-DD
    const hoyStr = new Date().toISOString().split('T')[0];

    // Ordenamos todos los partidos cronológicamente por fecha de inicio
    const partidosOrdenados = listaPartidos.filter(m => m.matchDate || m.date || m.kickoffUtc).sort((a, b) => {
      const fechaA = new Date(a.kickoffUtc || a.matchDate || a.date);
      const fechaB = new Date(b.kickoffUtc || b.matchDate || b.date);
      return fechaA - fechaB;
    });

    // Buscamos el partido más cercano a la fecha de hoy o el último disputado
    let partidoCercano = partidosOrdenados.find(m => {
      const f = (m.matchDate || m.date || m.kickoffUtc || "").split('T')[0];
      return f >= hoyStr;
    });

    // Si todos los partidos ya pasaron, tomamos el último de la lista
    if (!partidoCercano && partidosOrdenados.length > 0) {
      partidoCercano = partidosOrdenados[partidosOrdenados.length - 1];
    }

    // Identificamos con total precisión la ronda a la que pertenece ese partido actual
    const rondaActual = partidoCercano ? partidoCercano.matchRound : null;

    console.log(`Ronda detectada y sincronizada: Fecha ${rondaActual}`);

    // Filtramos exclusivamente los partidos de esa ronda exacta
    const partidosDeLaFecha = listaPartidos.filter(m => m.matchRound === rondaActual);

    let partidosArray = [];

    for (const match of partidosDeLaFecha) {
      const localNombre = match.homeTeamName || match.homeTeam?.name || "";
      const visitaNombre = match.awayTeamName || match.awayTeam?.name || "";
      const golesL = match.homeTeamScore ?? 0;
      const golesV = match.awayTeamScore ?? 0;

      // Extracción de escudos que ya tenías funcionando perfectamente
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
      fecha: `Fecha ${rondaActual}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron ${partidosArray.length} partidos correspondientes a la Fecha ${rondaActual}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

const fs = require('fs');

async function actualizarConApiOficial() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("Consultando partidos finalizados de la API oficial de forma dinámica...");

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

    // 1. Filtramos únicamente los partidos que ya terminaron (status: "FINISHED")
    const partidosTerminados = listaPartidos.filter(match => {
      const estado = (match.status || "").toUpperCase();
      return estado === "FINISHED";
    });

    if (partidosTerminados.length === 0) {
      throw new Error("No se encontraron partidos con estado FINISHED en la temporada.");
    }

    // 2. Extraemos todas las fechas (YYYY-MM-DD) de los partidos terminados y las ordenamos
    const fechasUnicas = [...new Set(partidosTerminados.map(m => (m.date || "").split('T')[0]))].filter(Boolean).sort();

    if (fechasUnicas.length === 0) {
      throw new Error("No se pudieron determinar las fechas de los partidos.");
    }

    // 3. Tomamos la fecha más reciente (la última del array ordenado)
    const ultimaFechaJugada = fechasUnicas[fechasUnicas.length - 1];
    console.log(`Última fecha de partidos finalizados detectada automáticamente: ${ultimaFechaJugada}`);

    // 4. Seleccionamos todos los partidos que correspondan estrictamente a ese día
    const partidosDeLaJornada = partidosTerminados.filter(m => (m.date || "").startsWith(ultimaFechaJugada));

    let partidosArray = [];

    for (const match of partidosDeLaJornada) {
      const localNombre = match.homeTeam?.name || "";
      const visitaNombre = match.awayTeam?.name || "";
      
      let golesL = 0;
      let golesV = 0;
      
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
      fecha: `Resultados del ${ultimaFechaJugada}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    fs.writeFileSync('resultados.json', JSON.stringify(resultadoFinal, null, 2));
    console.log(`¡Éxito! Se guardaron automáticamente ${partidosArray.length} partidos correspondientes al día ${ultimaFechaJugada}.`);

  } catch (error) {
    console.error("Error en el script:", error.message);
    process.exit(1);
  }
}

actualizarConApiOficial();

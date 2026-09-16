const fs = require('fs');

async function diagnosticarApi() {
  const API_KEY = "gapi_f269847bc4dc567a5184a0fd795f7ee862d8fea00f6b3e8e2dd8ae6ceafb2c01";
  const LEAGUE_ID = "cmr77dvtd009brx0629uk9lp3";
  
  console.log("--- INICIANDO DIAGNÓSTICO DE LA API ---");

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

    console.log(`Total de partidos devueltos por la API: ${listaPartidos.length}`);

    if (listaPartidos.length > 0) {
      console.log("Estructura del PRIMER partido recibido:");
      console.log(JSON.stringify(listaPartidos[0], null, 2));

      console.log("Estructura del ÚLTIMO partido recibido:");
      console.log(JSON.stringify(listaPartidos[listaPartidos.length - 1], null, 2));

      // Vamos a ver qué propiedades de ID o ronda existen realmente
      const idsEjemplo = listaPartidos.slice(0, 5).map(p => p.id);
      const roundsEjemplo = listaPartidos.slice(0, 5).map(p => p.matchRound || p.round || p.stage);
      
      console.log("Ejemplos de IDs:", idsEjemplo);
      console.log("Ejemplos de Rounds/Rondas:", roundsEjemplo);
    }

  } catch (error) {
    console.error("Error en el diagnóstico:", error.message);
    process.exit(1);
  }
}

diagnosticarApi();

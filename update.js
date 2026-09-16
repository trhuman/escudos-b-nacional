const fs = require('fs');
const path = require('path');

// Diccionario para asociar cada nombre de equipo con su archivo de escudo local correspondiente
const MAPEO_ESCUDOS = {
  "Atlanta": "atlanta.png",
  "Güemes": "guemes.png",
  "Nueva Chicago": "nueva_chicago.png",
  "Chicago": "nueva_chicago.png",
  "Almirante Brown": "almirante_brown.png",
  "Alte. Brown": "almirante_brown.png",
  "Deportivo Maipú": "deportivo_maipu.png",
  "Maipú": "deportivo_maipu.png",
  "Central Norte": "central_norte.png",
  "San Miguel": "san_miguel.png",
  "Ferro": "ferro.png",
  "Estudiantes": "estudiantes_ba.png",
  "Estudiantes RC": "estudiantes_ba.png",
  "Temperley": "temperley.png",
  "CA Mitre": "mitre_se.png",
  "Mitre SdE": "mitre_se.png",
  "Chaco For Ever": "chaco_for_ever.png",
  "Colón": "colon.png",
  "Agropecuario": "agropecuario.png",
  "Chacarita": "chacarita.png",
  "San Martín (T)": "san_martin_t.png", // Ajustá si tu archivo tiene otro nombre exacto
  "Arsenal FC": "arsenal.png",
  "Alvarado": "alvarado.png",
  "Def Unidos": "defensores_unidos.png",
  // Para los demás equipos que no tengan archivo específico, usará el default o podés agregarlos acá:
  "Gimnasia y Tiro": "escudo_default.png",
  "Tristán Suárez": "escudo_default.png",
  "Colegiales": "escudo_default.png",
  "All Boys": "escudo_default.png",
  "San Telmo": "escudo_default.png",
  "Almagro": "escudo_default.png",
  "Ciudad De Bolívar": "escudo_default.png",
  "Quilmes": "escudo_default.png",
  "San Martín": "escudo_default.png",
  "Los Andes": "escudo_default.png",
  "Acassuso": "escudo_default.png",
  "Patronato": "escudo_default.png",
  "Gimnasia (J)": "escudo_default.png",
  "Atlético Rafaela": "escudo_default.png",
  "Racing (Cba)": "escudo_default.png",
  "Morón": "escudo_default.png",
  "Midland": "escudo_default.png",
  "Godoy Cruz": "escudo_default.png",
  "Defensores de Belgrano": "escudo_default.png",
  "Dep. Madryn": "escudo_default.png"
};

function obtenerEscudo(nombreEquipo) {
  // Busca el nombre exacto o retorna el default si no está mapeado
  return MAPEO_ESCUDOS[nombreEquipo] || "escudo_default.png";
}

async function sincronizarDinamicoConLogos() {
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

    if (partidos.length === 0) {
      throw new Error("La API devolvió un array de partidos vacío.");
    }

    // Filtramos partidos del 2026 finalizados
    const finalizados2026 = partidos.filter(m => {
      const es2026 = m.leagueYear === "2026" || (m.matchDate || "").startsWith("2026");
      const status = (m.matchStatus || "").toUpperCase();
      return es2026 && status === "FINISHED";
    });

    if (finalizados2026.length === 0) {
      throw new Error("No hay partidos con estado FINISHED para el 2026.");
    }

    // Agrupamos por número de ronda
    const rondasMap = {};
    for (const match of finalizados2026) {
      const rondaRaw = match.matchRound;
      const matchNum = String(rondaRaw).match(/\d+/);
      const rondaNum = matchNum ? parseInt(matchNum[0], 10) : null;

      if (rondaNum !== null && !isNaN(rondaNum)) {
        if (!rondasMap[rondaNum]) rondasMap[rondaNum] = [];
        rondasMap[rondaNum].push(match);
      }
    }

    const numerosRondas = Object.keys(rondasMap).map(Number).sort((a, b) => a - b);
    if (numerosRondas.length === 0) {
      throw new Error("No se encontraron números de ronda válidos.");
    }

    const ultimaRonda = numerosRondas[numerosRondas.length - 1];
    const partidosDeLaFecha = rondasMap[ultimaRonda];

    console.log(`📌 Procesando Fecha ${ultimaRonda} con ${partidosDeLaFecha.length} partidos.`);

    // Mapeamos los partidos aplicando el diccionario de escudos locales
    let partidosArray = partidosDeLaFecha.map(match => {
      const localNombre = match.homeTeam?.name || match.homeTeamName || "Local";
      const visitaNombre = match.awayTeam?.name || match.awayTeamName || "Visitante";
      
      const golesL = parseInt(match.homeTeamScore, 10) || 0;
      const golesV = parseInt(match.awayTeamScore, 10) || 0;

      return {
        local: localNombre,
        archivoLocal: obtenerEscudo(localNombre),
        golesLocal: Number(golesL),
        visitante: visitaNombre,
        archivoVisitante: obtenerEscudo(visitaNombre),
        golesVisitante: Number(golesV)
      };
    });

    const resultadoFinal = {
      fecha: `Fecha ${ultimaRonda}`,
      actualizado: new Date().toISOString(),
      partidos: partidosArray
    };

    const rutaJson = path.join(__dirname, 'resultados.json');
    fs.writeFileSync(rutaJson, JSON.stringify(resultadoFinal, null, 2), 'utf-8');

    console.log(`✅ ¡Éxito! resultados.json actualizado con los escudos mapeados correctamente.`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

sincronizarDinamicoConLogos();

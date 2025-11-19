function normalizarNombreParaLogo(nombre) {
  const nombreLower = nombre.toLowerCase().trim();
  
  const normalizaciones = {
    "américa": "america",
    "america": "america",
    "club américa": "america",
    "cruz azul": "cruz-azul",
    "cruzazul": "cruz-azul",
    "chivas": "chivas",
    "guadalajara": "chivas",
    "chivas guadalajara": "chivas",
    "pumas": "pumas",
    "pumas unam": "pumas",
    "unam": "pumas",
    "tigres": "tigres",
    "tigres uanl": "tigres",
    "monterrey": "monterrey",
    "rayados": "monterrey",
    "león": "leon",
    "leon": "leon",
    "club león": "leon",
    "santos": "santos",
    "santos laguna": "santos",
    "toluca": "toluca",
    "diablos rojos": "toluca",
    "atlas": "atlas",
    "pachuca": "pachuca",
    "tuzos": "pachuca",
    "querétaro": "queretaro",
    "queretaro": "queretaro",
    "gallos blancos": "queretaro",
    "puebla": "puebla",
    "la franja": "puebla",
    "necaxa": "necaxa",
    "rayos": "necaxa",
    "tijuana": "tijuana",
    "xolos": "tijuana",
    "juárez": "fc-juarez",
    "juarez": "fc-juarez",
    "fc juárez": "fc-juarez",
    "mazatlán": "mazatlan",
    "mazatlan": "mazatlan",
    "san luis": "atletico-san-luis",
    "atlético san luis": "atletico-san-luis",
    "atletico san luis": "atletico-san-luis",
    
    "real madrid": "real-madrid",
    "barcelona": "barcelona",
    "barça": "barcelona",
    "atletico madrid": "atletico-madrid",
    "atlético madrid": "atletico-madrid",
    "sevilla": "sevilla",
    "valencia": "valencia",
    "villarreal": "villarreal",
    "athletic bilbao": "athletic-bilbao",
    "real sociedad": "real-sociedad",
    "betis": "real-betis",
    "real betis": "real-betis",
    
    "manchester united": "manchester-united",
    "man united": "manchester-united",
    "man utd": "manchester-united",
    "manchester city": "manchester-city",
    "man city": "manchester-city",
    "liverpool": "liverpool",
    "chelsea": "chelsea",
    "arsenal": "arsenal",
    "tottenham": "tottenham",
    "spurs": "tottenham",
    "newcastle": "newcastle-united",
    "newcastle united": "newcastle-united",
    "everton": "everton",
    "aston villa": "aston-villa",
    "west ham": "west-ham-united",
    "west ham united": "west-ham-united",
    
    "juventus": "juventus",
    "juve": "juventus",
    "inter": "inter-milan",
    "inter milan": "inter-milan",
    "ac milan": "ac-milan",
    "milan": "ac-milan",
    "napoli": "napoli",
    "roma": "roma",
    "as roma": "roma",
    "lazio": "lazio",
    "atalanta": "atalanta",
    "fiorentina": "fiorentina",
    
    "bayern": "bayern-munich",
    "bayern munich": "bayern-munich",
    "bayern münchen": "bayern-munich",
    "borussia dortmund": "borussia-dortmund",
    "dortmund": "borussia-dortmund",
    "bvb": "borussia-dortmund",
    "rb leipzig": "rb-leipzig",
    "leipzig": "rb-leipzig",
    "bayer leverkusen": "bayer-leverkusen",
    "leverkusen": "bayer-leverkusen",
    
    "psg": "paris-saint-germain",
    "paris": "paris-saint-germain",
    "paris saint-germain": "paris-saint-germain",
    "paris saint germain": "paris-saint-germain",
    "marseille": "marseille",
    "lyon": "lyon",
    "monaco": "monaco",
    "lille": "lille",
    
    "italy": "italy",
    "italia": "italy",
    "austria": "austria",
    "germany": "germany",
    "alemania": "germany",
    "france": "france",
    "francia": "france",
    "spain": "spain",
    "españa": "spain",
    "england": "england",
    "inglaterra": "england",
    "portugal": "portugal",
    "brazil": "brazil",
    "brasil": "brazil",
    "argentina": "argentina",
    "mexico": "mexico",
    "méxico": "mexico",
    "netherlands": "netherlands",
    "holanda": "netherlands",
    "belgium": "belgium",
    "bélgica": "belgium",
    "croatia": "croatia",
    "croacia": "croatia",
    "denmark": "denmark",
    "dinamarca": "denmark",
    "switzerland": "switzerland",
    "suiza": "switzerland",
    "poland": "poland",
    "polonia": "poland",
    "sweden": "sweden",
    "suecia": "sweden",
    "norway": "norway",
    "noruega": "norway",
    "usa": "usa",
    "united states": "usa",
    "estados unidos": "usa",
    "canada": "canada",
    "canadá": "canada",
    
    "lakers": "lakers",
    "los angeles lakers": "lakers",
    "warriors": "warriors",
    "golden state warriors": "warriors",
    "celtics": "celtics",
    "boston celtics": "celtics",
    "heat": "heat",
    "miami heat": "heat",
    "bucks": "bucks",
    "milwaukee bucks": "bucks",
    "nets": "nets",
    "brooklyn nets": "nets",
    
    "toronto": "toronto-maple-leafs",
    "maple leafs": "toronto-maple-leafs",
    "montreal": "montreal-canadiens",
    "canadiens": "montreal-canadiens",
    "bruins": "boston-bruins",
    "boston bruins": "boston-bruins",
    "rangers": "ny-rangers",
    "ny rangers": "ny-rangers",
    "penguins": "pittsburgh-penguins",
    "pittsburgh penguins": "pittsburgh-penguins"
  };
  
  if (normalizaciones[nombreLower]) {
    return normalizaciones[nombreLower];
  }
  
  return nombreLower.replace(/\s+/g, '-').replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u').replace(/ñ/g, 'n');
}

function generarLogoURL(slug, tamaño = 100) {
  return `https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/${slug}.png&h=${tamaño}&w=${tamaño}`;
}

function extraerEquiposYLogos(titulo) {
  if (!titulo) {
    return {
      equipo1: null,
      equipo2: null,
      logo1: null,
      logo2: null
    };
  }
  
  const separadores = [' - ', ' vs ', ' vs. ', ' x ', ' @ '];
  let equipos = null;
  
  for (const sep of separadores) {
    if (titulo.includes(sep)) {
      equipos = titulo.split(sep).map(e => e.trim());
      break;
    }
  }
  
  if (!equipos || equipos.length !== 2) {
    return {
      equipo1: null,
      equipo2: null,
      logo1: null,
      logo2: null
    };
  }
  
  const slug1 = normalizarNombreParaLogo(equipos[0]);
  const slug2 = normalizarNombreParaLogo(equipos[1]);
  
  return {
    equipo1: equipos[0],
    equipo2: equipos[1],
    logo1: generarLogoURL(slug1, 100),
    logo2: generarLogoURL(slug2, 100)
  };
}

module.exports = { extraerEquiposYLogos, normalizarNombreParaLogo, generarLogoURL };

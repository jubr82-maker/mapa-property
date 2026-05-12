export function normalizeCity(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Map ville normalisée → { country, region }
const CITY_REGION_MAP: Record<string, { country: string; region: string }> = {
  // ── LU ─────────────────────────────────────────────────────────────────
  'luxembourg': { country: 'LU', region: 'Luxembourg' },
  'luxembourg-ville': { country: 'LU', region: 'Luxembourg' },
  'esch-sur-alzette': { country: 'LU', region: 'Luxembourg' },
  'differdange': { country: 'LU', region: 'Luxembourg' },
  'dudelange': { country: 'LU', region: 'Luxembourg' },
  'belair': { country: 'LU', region: 'Luxembourg' },

  // ── FR — 06 (Alpes-Maritimes, 5.81%) ───────────────────────────────────
  'nice': { country: 'FR', region: '06' },
  'cannes': { country: 'FR', region: '06' },
  'antibes': { country: 'FR', region: '06' },
  'cagnes-sur-mer': { country: 'FR', region: '06' },
  'menton': { country: 'FR', region: '06' },
  'villefranche-sur-mer': { country: 'FR', region: '06' },
  'beaulieu-sur-mer': { country: 'FR', region: '06' },
  'roquebrune-cap-martin': { country: 'FR', region: '06' },

  // ── FR — 83 (Var, 6.32%) ───────────────────────────────────────────────
  'saint-tropez': { country: 'FR', region: '83' },
  'toulon': { country: 'FR', region: '83' },
  'hyeres': { country: 'FR', region: '83' },
  'la croix-valmer': { country: 'FR', region: '83' },
  'ramatuelle': { country: 'FR', region: '83' },

  // ── FR — 75/92 (6.32%) ─────────────────────────────────────────────────
  'paris': { country: 'FR', region: '75' },
  'versailles': { country: 'FR', region: '78' },
  'boulogne-billancourt': { country: 'FR', region: '92' },
  'neuilly-sur-seine': { country: 'FR', region: '92' },

  // ── FR — 36, 56 (5.09% réduit) ─────────────────────────────────────────
  'chateauroux': { country: 'FR', region: '36' },
  'vannes': { country: 'FR', region: '56' },
  'lorient': { country: 'FR', region: '56' },

  // ── BE — Bruxelles-Capitale (19 communes) ──────────────────────────────
  ...Object.fromEntries(
    [
      'bruxelles', 'brussels', 'anderlecht', 'ixelles', 'uccle', 'schaerbeek',
      'etterbeek', 'forest', 'saint-gilles', 'molenbeek', 'jette', 'auderghem',
      'berchem-sainte-agathe', 'evere', 'ganshoren', 'koekelberg',
      'saint-josse-ten-noode', 'watermael-boitsfort',
      'woluwe-saint-lambert', 'woluwe-saint-pierre',
    ].map((c) => [c, { country: 'BE', region: 'Bruxelles-Capitale' }]),
  ),

  // ── BE — Wallonie ──────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['liege', 'namur', 'charleroi', 'mons', 'la louviere', 'verviers', 'wavre']
      .map((c) => [c, { country: 'BE', region: 'Wallonie' }]),
  ),

  // ── BE — Flandre ───────────────────────────────────────────────────────
  ...Object.fromEntries(
    [
      'anvers', 'antwerpen', 'gand', 'gent', 'bruges', 'brugge', 'louvain', 'leuven',
      'hasselt', 'malines', 'mechelen', 'ostende', 'oostende',
    ].map((c) => [c, { country: 'BE', region: 'Flandre' }]),
  ),

  // ── DE — Bayern ────────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['munchen', 'munich', 'nuremberg', 'nurnberg', 'augsbourg', 'augsburg', 'wurzburg']
      .map((c) => [c, { country: 'DE', region: 'Bayern' }]),
  ),
  // ── DE — Berlin / Hamburg ──────────────────────────────────────────────
  'berlin': { country: 'DE', region: 'Berlin' },
  'hamburg': { country: 'DE', region: 'Hamburg' },
  // ── DE — NRW ───────────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['cologne', 'koln', 'dusseldorf', 'dortmund', 'essen', 'bonn', 'aix-la-chapelle', 'aachen']
      .map((c) => [c, { country: 'DE', region: 'Nordrhein-Westfalen' }]),
  ),
  // ── DE — Hessen ────────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['frankfurt', 'francfort', 'wiesbaden', 'darmstadt']
      .map((c) => [c, { country: 'DE', region: 'Hessen' }]),
  ),
  // ── DE — Baden-Württemberg ─────────────────────────────────────────────
  ...Object.fromEntries(
    ['stuttgart', 'karlsruhe', 'mannheim', 'heidelberg']
      .map((c) => [c, { country: 'DE', region: 'Baden-Württemberg' }]),
  ),
  // ── DE — autres Länder ─────────────────────────────────────────────────
  'dresde': { country: 'DE', region: 'Sachsen' },
  'dresden': { country: 'DE', region: 'Sachsen' },
  'leipzig': { country: 'DE', region: 'Sachsen' },
  'bremen': { country: 'DE', region: 'Bremen' },
  'hanovre': { country: 'DE', region: 'Niedersachsen' },
  'hannover': { country: 'DE', region: 'Niedersachsen' },
  'mainz': { country: 'DE', region: 'Rheinland-Pfalz' },
  'magdeburg': { country: 'DE', region: 'Sachsen-Anhalt' },
  'potsdam': { country: 'DE', region: 'Brandenburg' },
  'sarrebruck': { country: 'DE', region: 'Saarland' },
  'saarbrucken': { country: 'DE', region: 'Saarland' },
  'kiel': { country: 'DE', region: 'Schleswig-Holstein' },
  'erfurt': { country: 'DE', region: 'Thüringen' },

  // ── MC ─────────────────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['monaco', 'monte-carlo', 'fontvieille', 'la condamine']
      .map((c) => [c, { country: 'MC', region: 'Monaco' }]),
  ),

  // ── CH — préparé pour X2 ───────────────────────────────────────────────
  'geneve': { country: 'CH', region: 'Genève' },
  'geneva': { country: 'CH', region: 'Genève' },
  'zurich': { country: 'CH', region: 'Zurich' },
  'lausanne': { country: 'CH', region: 'Vaud' },
  'vevey': { country: 'CH', region: 'Vaud' },
  'montreux': { country: 'CH', region: 'Vaud' },
  'nyon': { country: 'CH', region: 'Vaud' },
  'sion': { country: 'CH', region: 'Valais' },
  'crans-montana': { country: 'CH', region: 'Valais' },
  'verbier': { country: 'CH', region: 'Valais' },
  'zermatt': { country: 'CH', region: 'Valais' },
  'saas-fee': { country: 'CH', region: 'Valais' },
  'bale': { country: 'CH', region: 'Bâle' },
  'basel': { country: 'CH', region: 'Bâle' },
  'lugano': { country: 'CH', region: 'Tessin' },
  'locarno': { country: 'CH', region: 'Tessin' },
  'ascona': { country: 'CH', region: 'Tessin' },
  'st-moritz': { country: 'CH', region: 'Grisons' },
  'davos': { country: 'CH', region: 'Grisons' },
  'klosters': { country: 'CH', region: 'Grisons' },

  // ── IT — préparé pour X2 ───────────────────────────────────────────────
  ...Object.fromEntries(
    [
      'milano', 'milan', 'roma', 'rome', 'firenze', 'florence', 'venezia', 'venise',
      'napoli', 'naples', 'torino', 'turin', 'bologna', 'bologne', 'como',
      'lago di como', 'forte dei marmi', 'portofino',
    ].map((c) => [c, { country: 'IT', region: 'Italia' }]),
  ),

  // ── ES — CCAA (raffinées par X2) ───────────────────────────────────────
  ...Object.fromEntries(
    ['madrid', 'pozuelo', 'las rozas', 'majadahonda', 'alcobendas', 'getafe', 'mostoles', 'alcala de henares']
      .map((c) => [c, { country: 'ES', region: 'Madrid' }]),
  ),
  ...Object.fromEntries(
    ['barcelona', 'sitges', 'castelldefels', 'sant cugat', 'girona', 'gerona', 'tarragona', 'lleida', 'lerida']
      .map((c) => [c, { country: 'ES', region: 'Cataluña' }]),
  ),
  ...Object.fromEntries(
    ['valencia', 'alicante', 'benidorm', 'denia', 'javea', 'castellon', 'gandia', 'torrevieja', 'altea']
      .map((c) => [c, { country: 'ES', region: 'Comunidad Valenciana' }]),
  ),
  ...Object.fromEntries(
    ['sevilla', 'malaga', 'marbella', 'estepona', 'mijas', 'sotogrande', 'benahavis', 'cordoba', 'granada', 'almeria', 'cadiz', 'jerez', 'huelva']
      .map((c) => [c, { country: 'ES', region: 'Andalucía' }]),
  ),
  ...Object.fromEntries(
    ['bilbao', 'san sebastian', 'donostia', 'vitoria', 'vitoria-gasteiz']
      .map((c) => [c, { country: 'ES', region: 'País Vasco' }]),
  ),
  ...Object.fromEntries(
    ['palma', 'ibiza', 'mallorca', 'menorca', 'formentera', 'mahon', 'palma de mallorca']
      .map((c) => [c, { country: 'ES', region: 'Baleares' }]),
  ),
  ...Object.fromEntries(
    ['las palmas', 'santa cruz de tenerife', 'adeje', 'arona', 'puerto de la cruz', 'maspalomas']
      .map((c) => [c, { country: 'ES', region: 'Canarias' }]),
  ),
  ...Object.fromEntries(
    ['pamplona', 'iruna']
      .map((c) => [c, { country: 'ES', region: 'Navarra' }]),
  ),
  ...Object.fromEntries(
    ['zaragoza', 'huesca', 'teruel']
      .map((c) => [c, { country: 'ES', region: 'Aragón' }]),
  ),
  ...Object.fromEntries(
    ['oviedo', 'gijon', 'aviles']
      .map((c) => [c, { country: 'ES', region: 'Asturias' }]),
  ),
  ...Object.fromEntries(
    ['valladolid', 'salamanca', 'leon', 'burgos', 'segovia', 'avila', 'soria', 'palencia', 'zamora']
      .map((c) => [c, { country: 'ES', region: 'Castilla y León' }]),
  ),
  ...Object.fromEntries(
    ['toledo', 'albacete', 'ciudad real', 'cuenca', 'guadalajara']
      .map((c) => [c, { country: 'ES', region: 'Castilla-La Mancha' }]),
  ),
  ...Object.fromEntries(
    ['caceres', 'badajoz', 'merida']
      .map((c) => [c, { country: 'ES', region: 'Extremadura' }]),
  ),
  ...Object.fromEntries(
    ['santiago de compostela', 'a coruna', 'la coruna', 'vigo', 'pontevedra', 'ourense', 'lugo']
      .map((c) => [c, { country: 'ES', region: 'Galicia' }]),
  ),
  ...Object.fromEntries(
    ['murcia', 'cartagena', 'lorca']
      .map((c) => [c, { country: 'ES', region: 'Murcia' }]),
  ),
  ...Object.fromEntries(
    ['santander', 'torrelavega']
      .map((c) => [c, { country: 'ES', region: 'Cantabria' }]),
  ),
  ...Object.fromEntries(
    ['logrono', 'logrono']
      .map((c) => [c, { country: 'ES', region: 'La Rioja' }]),
  ),
  'ceuta': { country: 'ES', region: 'Ceuta' },
  'melilla': { country: 'ES', region: 'Melilla' },

  // ── PT — Continente / Madeira / Açores (raffinées par X2) ──────────────
  ...Object.fromEntries(
    [
      'lisboa', 'lisbonne', 'cascais', 'estoril', 'sintra', 'oeiras', 'porto',
      'vila nova de gaia', 'braga', 'coimbra', 'aveiro', 'faro', 'albufeira',
      'lagos', 'vilamoura', 'quinta do lago', 'almada', 'amadora', 'setubal',
      'evora', 'tavira', 'portimao', 'loule', 'guimaraes', 'matosinhos',
      'leiria', 'viseu', 'castelo branco', 'vila real', 'braganca', 'beja',
    ].map((c) => [c, { country: 'PT', region: 'Continente' }]),
  ),
  ...Object.fromEntries(
    ['funchal', 'camara de lobos', 'machico', 'santa cruz', 'ribeira brava', 'porto santo']
      .map((c) => [c, { country: 'PT', region: 'Madeira' }]),
  ),
  ...Object.fromEntries(
    ['ponta delgada', 'angra do heroismo', 'horta', 'praia da vitoria', 'ribeira grande', 'lagoa']
      .map((c) => [c, { country: 'PT', region: 'Açores' }]),
  ),
};

export function cityToRegion(
  city: string,
): { country: string; region: string } | null {
  const key = normalizeCity(city);
  return CITY_REGION_MAP[key] ?? null;
}

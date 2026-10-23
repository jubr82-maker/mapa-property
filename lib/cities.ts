export type CountryCode =
  | "LU" | "FR" | "CH" | "BE" | "NL" | "GB" | "ES" | "PT" | "IT" | "AT" | "DE" | "AE" | "US" | "MU";

export type CityIntro = { fr: string; en: string; de: string };
export type CityName = { fr: string; en: string; de: string };
export type CityMeta = { fr: string; en: string; de: string };

export type City = {
  slug: string;
  name: CityName;
  country: CountryCode;
  region?: string;
  intro: CityIntro;
  priceRange?: { floor: number; ceiling: number };
  schools?: string[];
  highlights: string[];
  metaDescription: CityMeta;
  /** Nom dans une phrase ("a l'Ile Maurice"), si different du nom (titre, description, grand titre). */
  nameInSentence?: Partial<CityName>;
  /** Preposition francaise si ce n'est pas "a" ("en Algarve"). */
  prepositionFr?: string;
  /** Points cles traduits (sinon `highlights`, en francais, dans les trois langues). */
  highlightsByLang?: { fr: string[]; en: string[]; de: string[] };
  /**
   * Alias (oct. 2026) : variantes d'ecriture, quartiers et localites
   * rattaches a la page (biens, recherches, liens des fiches). Comparaison
   * sans accents, majuscules, espaces ni traits d'union
   * (lib/city-match.ts). Referentiel unique avec slug et noms.
   */
  aliases?: string[];
};

const M = "MAPA Property";

// ============================================================================
// 24 COMMUNES / QUARTIERS LUXEMBOURG
// ============================================================================

const luxembourgVille: City = {
  slug: "luxembourg-ville",
  name: { fr: "Luxembourg-Ville", en: "Luxembourg City", de: "Luxemburg-Stadt" },
  country: "LU",
  region: "Capitale",
  priceRange: { floor: 7500, ceiling: 18000 },
  schools: ["École Européenne I (Kirchberg, privé EU)", "Vauban (privé AEFE Gasperich)", "ISL (privé Merl)", "EIGT Luxembourg-Ville (public)"],
  highlights: [
    "Cœur économique et politique du Grand-Duché",
    "Réseau bancaire et institutionnel européen",
    "UNESCO depuis 1994 (vieille ville et fortifications)",
    "Quartier d'affaires Kirchberg + centre historique",
    "Premier marché immobilier du pays en valeur",
  ],
  intro: {
    fr: "Luxembourg-Ville concentre l'essentiel de la valeur immobilière du Grand-Duché. Capitale politique, financière et européenne, elle abrite les sièges de la Cour de Justice, de la Banque Européenne d'Investissement et d'une centaine de fonds d'investissement parmi les plus actifs d'Europe. Son tissu urbain marie une vieille ville classée UNESCO, des quartiers résidentiels arborés (Belair, Limpertsberg, Merl) et un quartier d'affaires moderne (Kirchberg) qui n'a cessé de s'étendre depuis les années 1990. Pour l'acquéreur, la ville offre quatre logiques distinctes : le centre historique pour le prestige patrimonial, les quartiers Belair-Limpertsberg pour la résidence principale familiale, Kirchberg pour le neuf et le rendement, et les quartiers gare et Bonnevoie pour l'investissement locatif sur cycles courts. Les prix médians s'étalent de 7 500 à 18 000 €/m² selon le micro-marché, l'état et le DPE. Sur ce périmètre, MAPA Property opère sous mandat exclusif ou de recherche, en mobilisant son réseau off-market et les sources notariales partenaires. Le marché locatif est encadré par le plafond luxembourgeois de 5 % du capital investi par an, une donnée structurante pour l'investisseur.",
    en: "Luxembourg City concentrates most of the Grand Duchy's real estate value. Political, financial and European capital, it hosts the Court of Justice, the European Investment Bank and around a hundred of Europe's most active investment funds. The urban fabric blends a UNESCO-listed old town, leafy residential districts (Belair, Limpertsberg, Merl) and a modern business district (Kirchberg) that has expanded continuously since the 1990s. For the buyer, the city offers four distinct logics: the historic centre for heritage prestige, Belair-Limpertsberg for family primary residence, Kirchberg for new-build and yield, and the station and Bonnevoie areas for short-cycle rental investment. Median prices range from €7,500 to €18,000 per sqm depending on micro-market, condition and energy rating. Across this perimeter, MAPA Property acts under exclusive or search mandate, mobilising its off-market network and notarial partners. The rental market is capped by the Luxembourg 5% rule on invested capital per year, a structural variable for investors.",
    de: "Luxemburg-Stadt vereint den größten Teil des Immobilienwerts des Großherzogtums. Als politische, finanzielle und europäische Hauptstadt beherbergt sie den Gerichtshof, die Europäische Investitionsbank und rund hundert der aktivsten Investmentfonds Europas. Das Stadtgefüge verbindet eine UNESCO-geschützte Altstadt, baumbestandene Wohnviertel (Belair, Limpertsberg, Merl) und ein modernes Geschäftsviertel (Kirchberg), das seit den 1990er Jahren stetig wächst. Für Käufer ergeben sich vier Logiken: historisches Zentrum für Prestige, Belair-Limpertsberg für die Familienhauptwohnsitz, Kirchberg für Neubau und Rendite, Bahnhof und Bonnevoie für Kurzzyklus-Mietinvestitionen. Mediane Preise zwischen 7.500 € und 18.000 €/m² je nach Lage, Zustand und Energieausweis. MAPA Property arbeitet hier mit Exklusiv- oder Suchmandaten, mit Off-Market-Netzwerk und notariellen Partnern. Der Mietmarkt ist auf die Luxemburger Obergrenze von 5 % des eingesetzten Kapitals pro Jahr gedeckelt, eine strukturelle Größe für Investoren.",
  },
  metaDescription: {
    fr: "Immobilier prestige Luxembourg-Ville : 24 quartiers, 7500 à 18000 €/m². Mandats vente, recherche, off-market par MAPA Property.",
    en: "Prestige real estate Luxembourg City: 24 districts, €7500 to €18000/sqm. Sale, search, off-market mandates by MAPA Property.",
    de: "Immobilien Prestige Luxemburg-Stadt: 24 Viertel, 7500 bis 18000 €/m². Verkaufs-, Such-, Off-Market-Mandate von MAPA Property.",
  },
};

const belair: City = {
  slug: "belair",
  name: { fr: "Belair", en: "Belair", de: "Belair" },
  country: "LU",
  region: "Luxembourg-Ville",
  priceRange: { floor: 8500, ceiling: 16000 },
  schools: ["Vauban (privé AEFE, Gasperich, à 2 km)", "École Européenne I (Kirchberg, privé EU)", "ISL (privé, Merl, mitoyen)"],
  highlights: [
    "Quartier résidentiel le plus recherché de la capitale",
    "Maisons de maître et villas années 1920-1970",
    "Programmes neufs A++ avec terrasses et vue",
    "Parc Belair, accès rapide centre et Kirchberg",
    "Tissu d'expatriés cadres dirigeants stable",
  ],
  intro: {
    fr: "Belair est le quartier résidentiel le plus convoité de Luxembourg-Ville. Sa réputation tient à trois facteurs : la qualité du parc bâti (maisons de maître des années 1920 à 1970, copropriétés haut de gamme, programmes neufs récents), la stabilité de sa population (cadres dirigeants, fonctionnaires européens, professions libérales installés) et la rareté du foncier disponible. Le marché s'étale de 8 500 €/m² (très ancien à rénover, classes énergétiques H ou I) à 16 000 €/m² (neuf premium A++ avec terrasse et vue dégagée), avec un médian autour de 11 500 €/m². Les biens en classe énergie E ou F ne se négocient pas en deçà de 8 500 €/m² ; les prix inférieurs constatés ailleurs dans la capitale ne s'appliquent pas à Belair. Le quartier compte des écoles privées prisées (ISL mitoyen, Vauban à 2 km, École Européenne I à Kirchberg), des liaisons rapides vers le centre historique et le quartier d'affaires Kirchberg. Pour les acquéreurs étrangers, le mandat de recherche MAPA Property mobilise un réseau off-market structuré ; les biens visibles sur les portails publics ne représentent qu'une fraction du marché réel.",
    en: "Belair is the most sought-after residential district in Luxembourg City. Its reputation rests on three factors: the quality of the building stock (manor houses from the 1920s to the 1970s, high-end condominiums, recent new-build), the stability of its population (senior executives, EU civil servants, established professionals) and the scarcity of available land. The market ranges from €8,500/sqm (older property to renovate, energy class H or I) to €16,000/sqm (premium new-build A++ with terrace and view), with a median around €11,500/sqm. Energy class E or F properties do not trade below €8,500/sqm; the lower prices seen elsewhere in the capital do not apply to Belair. The district is home to several prestigious private schools (ISL adjacent, Vauban 2 km away, European School I in Kirchberg), with quick links to the historic centre and Kirchberg business district. For foreign buyers, MAPA Property's search mandate activates a structured off-market network; properties visible on public portals are only a fraction of the real market.",
    de: "Belair ist das gefragteste Wohnviertel Luxemburg-Stadt. Sein Ruf beruht auf drei Faktoren: Qualität des Gebäudebestands (Herrenhäuser der 1920er bis 1970er Jahre, hochwertige Eigentumswohnungen, jüngste Neubauten), Stabilität der Bewohnerschaft (Führungskräfte, EU-Beamte, etablierte Freiberufler) und Knappheit des Baulands. Die Preise reichen von 8.500 €/m² (sehr alt, sanierungsbedürftig, Energieklassen H oder I) bis 16.000 €/m² (Neubau Premium A++ mit Terrasse und freier Sicht), Median rund 11.500 €/m². Objekte der Energieklassen E oder F werden nicht unter 8.500 €/m² gehandelt; in der Hauptstadt anderswo beobachtete Niedrigpreise gelten in Belair nicht. Das Viertel verfügt über angesehene Privatschulen (ISL angrenzend, Vauban 2 km, Europaschule I in Kirchberg) und schnelle Verbindungen zur Altstadt und nach Kirchberg. Für ausländische Käufer mobilisiert das MAPA Property-Suchmandat ein strukturiertes Off-Market-Netzwerk; die auf öffentlichen Portalen sichtbaren Objekte sind nur ein Bruchteil des realen Marktes.",
  },
  metaDescription: {
    fr: "Belair, quartier le plus recherché de Luxembourg-Ville. Maisons de maître, programmes neufs A++. 8500 à 16000 €/m². Mandat MAPA Property.",
    en: "Belair, most sought-after district of Luxembourg City. Manor houses, new-build A++. €8500 to €16000/sqm. MAPA Property mandate.",
    de: "Belair, gefragtestes Viertel Luxemburg-Stadt. Herrenhäuser, Neubau A++. 8500 bis 16000 €/m². MAPA Property-Property-Mandat.",
  },
};

const limpertsberg: City = {
  slug: "limpertsberg",
  name: { fr: "Limpertsberg", en: "Limpertsberg", de: "Limpertsberg" },
  country: "LU",
  region: "Luxembourg-Ville",
  priceRange: { floor: 8000, ceiling: 14500 },
  schools: ["Vauban (privé AEFE)", "Lycée Michel Lucius (public, EIMAB partenaire)", "École Européenne I (Kirchberg)"],
  highlights: ["Mix maisons bourgeoises et résidences neuves", "Université du Luxembourg (Campus Limpertsberg)", "Jardins, théâtres, marché Glacis", "Excellente accessibilité tram et bus"],
  intro: {
    fr: "Limpertsberg combine la respectabilité d'un quartier bourgeois ancien et le dynamisme d'un campus universitaire. Sa trame urbaine, héritée de l'urbanisation des années 1900-1930, alterne maisons à usage unifamilial, immeubles d'appartements de qualité et bâtiments universitaires (Campus Limpertsberg de l'Université du Luxembourg). Le marché immobilier s'étale de 8 000 à 14 500 €/m² environ, avec une prime pour les biens au-dessus du Glacis et à proximité du Théâtre. Les acquéreurs visent surtout la résidence principale familiale ; le rendement locatif y est modéré mais sécurisé par une demande étudiante et professionnelle constante. La connexion tram (ligne T1) et la proximité immédiate du centre administratif et de Kirchberg sont des atouts structurels. MAPA Property y opère essentiellement sous mandat de recherche pour des familles internationales, et plus rarement sous mandat exclusif côté vendeur, car la rotation y est faible.",
    en: "Limpertsberg combines the respectability of an old bourgeois district with the dynamism of a university campus. Its urban fabric, inherited from the urbanisation of 1900 to 1930, alternates single-family homes, quality apartment buildings and university facilities (University of Luxembourg, Limpertsberg Campus). The market ranges from €8,000 to €14,500/sqm, with a premium for properties above Glacis and near the Théâtre. Buyers mainly target the family primary residence; rental yield is moderate but secured by steady student and professional demand. The tram connection (T1 line) and immediate proximity to the administrative centre and Kirchberg are structural strengths. MAPA Property operates here mainly under search mandate for international families, and more rarely under exclusive seller's mandate, as turnover is low.",
    de: "Limpertsberg vereint die Solidität eines alten Bürgerviertels mit der Dynamik eines Universitätscampus. Das Stadtgefüge der Urbanisierung von 1900 bis 1930 wechselt zwischen Einfamilienhäusern, hochwertigen Wohngebäuden und Universitätsbauten (Universität Luxemburg, Campus Limpertsberg). Der Markt reicht von 8.000 bis 14.500 €/m², mit Aufpreis für Objekte oberhalb des Glacis und in Theaternähe. Käufer zielen überwiegend auf den Familienhauptwohnsitz; die Mietrendite ist mäßig, jedoch durch stetige Nachfrage von Studierenden und Berufstätigen abgesichert. Die Straßenbahn (T1) und die Nähe zum Verwaltungszentrum und Kirchberg sind strukturelle Stärken. MAPA Property arbeitet hier vorwiegend mit Suchmandaten für internationale Familien, seltener mit Exklusivmandaten von Verkäufern, da die Fluktuation gering ist.",
  },
  metaDescription: {
    fr: "Limpertsberg : quartier bourgeois de Luxembourg-Ville, campus universitaire, accès tram. 8000 à 14500 €/m². MAPA Property.",
    en: "Limpertsberg: bourgeois district of Luxembourg City, university campus, tram access. €8000 to €14500/sqm. MAPA Property.",
    de: "Limpertsberg: Bürgerviertel Luxemburg-Stadt, Universitätscampus, Straßenbahn. 8000 bis 14500 €/m². MAPA Property.",
  },
};

const kirchberg: City = {
  slug: "kirchberg",
  name: { fr: "Kirchberg", en: "Kirchberg", de: "Kirchberg" },
  country: "LU",
  region: "Luxembourg-Ville",
  priceRange: { floor: 8500, ceiling: 14000 },
  schools: ["École Européenne I (privé EU)", "Vauban (privé AEFE, à 4 km)"],
  highlights: ["Quartier d'affaires européen et institutionnel", "Architecture contemporaine signée (Pei, Foster, Bofill)", "Tram T1 jusqu'à la gare", "Programmes neufs récents A++/A+", "Centre commercial Auchan, Philharmonie, Mudam"],
  intro: {
    fr: "Kirchberg est le quartier d'affaires et institutionnel de Luxembourg, construit sur un plateau de 365 hectares depuis les années 1960 pour accueillir les institutions européennes (Cour de Justice, BEI, Parlement européen). L'écosystème immobilier y est largement neuf et standardisé : programmes des années 2000-2025 majoritairement classés A++ ou A+, en copropriétés verticales avec services. Le marché s'étale de 8 500 à 14 000 €/m² environ pour le résidentiel, avec une prime pour les biens en hauteur, vue Alzette ou Forêt Klosegrënnchen. Le tissu locatif est très porteur (fonctionnaires européens, banquiers, consultants Big Four), avec des baux 24-36 mois fréquents et un risque de vacance faible. Le tram T1 dessert le quartier sur tout son axe. MAPA Property y opère sur mandat exclusif côté investisseurs (programmes neufs en VEFA), recherche pour les acquéreurs occupants, et off-market sur les seconds plans.",
    en: "Kirchberg is Luxembourg's business and institutional district, built on a 365-hectare plateau since the 1960s to host EU institutions (Court of Justice, EIB, European Parliament). The real estate ecosystem is largely new and standardised: developments from 2000 to 2025, mostly rated A++ or A+, in vertical condominiums with services. The market ranges from €8,500 to €14,000/sqm for residential, with a premium for high-floor units, Alzette views or Klosegrënnchen Forest exposure. Rental demand is strong (EU civil servants, bankers, Big Four consultants), with leases of 24 to 36 months common and very low vacancy risk. The T1 tram serves the entire district. MAPA Property operates here on exclusive seller mandates for investors (off-plan/VEFA), search mandates for owner-occupiers, and off-market for resales.",
    de: "Kirchberg ist Luxemburgs Geschäfts- und Institutionsviertel, seit den 1960er Jahren auf einer 365 Hektar großen Hochebene für die EU-Institutionen errichtet (Gerichtshof, EIB, Europaparlament). Das Immobilienökosystem ist überwiegend neu und standardisiert: Projekte von 2000 bis 2025, meist A++ oder A+, vertikale Wohnanlagen mit Services. Markt: 8.500 bis 14.000 €/m² für Wohnimmobilien, Aufpreis für höhere Etagen, Alzette-Sicht oder Klosegrënnchen-Wald-Lage. Sehr aktive Mietnachfrage (EU-Beamte, Banker, Big-Four-Berater), Mietverträge über 24 bis 36 Monate üblich, geringes Leerstandsrisiko. T1-Straßenbahn auf der gesamten Achse. MAPA Property arbeitet hier mit Exklusivmandaten für Investoren (VEFA), Suchmandaten für Eigennutzer und Off-Market für Wiederverkäufe.",
  },
  metaDescription: {
    fr: "Kirchberg : quartier d'affaires européen, neuf A++, tram T1. 8500 à 14000 €/m². Mandats MAPA Property.",
    en: "Kirchberg: European business district, new A++, T1 tram. €8500 to €14000/sqm. MAPA Property mandates.",
    de: "Kirchberg: europäisches Geschäftsviertel, Neubau A++, T1-Straßenbahn. 8500 bis 14000 €/m². MAPA Property-Property-Mandate.",
  },
};

// ============================================================================
// Quartiers Luxembourg-Ville (intros plus courtes mais uniques + données denses)
// ============================================================================

function buildLuxQuartier(args: {
  slug: string;
  nameFr: string;
  nameEn?: string;
  nameDe?: string;
  description: { fr: string; en: string; de: string };
  priceRange: { floor: number; ceiling: number };
  highlights: string[];
  schools?: string[];
}): City {
  const en = args.nameEn ?? args.nameFr;
  const de = args.nameDe ?? args.nameFr;
  return {
    slug: args.slug,
    name: { fr: args.nameFr, en, de },
    country: "LU",
    region: "Luxembourg-Ville",
    priceRange: args.priceRange,
    schools: args.schools,
    highlights: args.highlights,
    intro: args.description,
    metaDescription: {
      fr: `${args.nameFr} (Luxembourg-Ville) : ${args.priceRange.floor} à ${args.priceRange.ceiling} €/m². Mandats vente, recherche, off-market par ${M}.`,
      en: `${en} (Luxembourg City): €${args.priceRange.floor} to €${args.priceRange.ceiling}/sqm. Sale, search, off-market mandates by ${M}.`,
      de: `${de} (Luxemburg-Stadt): ${args.priceRange.floor} bis ${args.priceRange.ceiling} €/m². Verkauf, Suche, Off-Market mit ${M}.`,
    },
  };
}

const bonnevoie = buildLuxQuartier({
  slug: "bonnevoie",
  nameFr: "Bonnevoie",
  priceRange: { floor: 6500, ceiling: 11000 },
  highlights: ["Quartier sud, mixité urbaine", "Proximité gare et Cloche d'Or", "Dynamique de gentrification depuis 2018", "Patrimoine rénové et neuf coexistant"],
  description: {
    fr: "Bonnevoie est un quartier en mutation rapide. Historiquement populaire, il est devenu depuis le milieu des années 2010 l'un des marchés les plus actifs en volume de la capitale, porté par sa proximité de la gare centrale et de la Cloche d'Or. Le tissu mêle anciennes maisons ouvrières rénovées, immeubles de rapport années 1960-80 et programmes neufs. Le marché s'étale de 6 500 à 11 000 €/m². Pour l'investisseur, c'est l'un des meilleurs ratios prix/rendement de la ville ; pour l'acquéreur occupant, le quartier offre une qualité de vie en hausse continue. MAPA Property y intervient surtout en mandat de recherche et en off-market sur les beaux biens anciens.",
    en: "Bonnevoie is a rapidly evolving district. Historically working-class, it has become since the mid-2010s one of the capital's most active markets in volume, driven by proximity to the central station and Cloche d'Or. The fabric mixes renovated workers' houses, rental buildings from the 1960s to the 1980s and new-build. Market: €6,500 to €11,000/sqm. For investors, one of the city's best price/yield ratios; for owner-occupiers, steadily rising quality of life. MAPA Property operates mainly under search mandate and off-market for prime older stock.",
    de: "Bonnevoie wandelt sich rasch. Historisch ein Arbeiterviertel, gehört es seit Mitte der 2010er Jahre zu den volumenstärksten Märkten der Hauptstadt, getragen von der Nähe zum Hauptbahnhof und zur Cloche d'Or. Das Gefüge mischt sanierte Arbeiterhäuser, Mietshäuser der 1960er bis 1980er Jahre und Neubau. Markt: 6.500 bis 11.000 €/m². Für Investoren eines der besten Preis-/Rendite-Verhältnisse der Stadt; für Eigennutzer stetig steigende Lebensqualität. MAPA Property arbeitet hier überwiegend mit Suchmandaten und Off-Market für hochwertige Altbauten.",
  },
});

const cents = buildLuxQuartier({
  slug: "cents",
  nameFr: "Cents",
  priceRange: { floor: 7500, ceiling: 12500 },
  highlights: ["Quartier résidentiel calme à l'est", "Proximité aéroport Findel et Kirchberg", "Maisons et villas années 1960-1990", "Cible familles internationales"],
  description: {
    fr: "Cents est un quartier résidentiel calme, à l'est de la capitale, prisé des familles internationales pour la combinaison rare qu'il offre : tranquillité, accès direct à Kirchberg et à l'aéroport (10 minutes), parc bâti dominant de maisons individuelles et de petites copropriétés des années 1960-1990. Le marché s'étale de 7 500 à 12 500 €/m². Le profil acquéreur typique est celui d'une famille avec enfants scolarisés à l'École Européenne I (Kirchberg) ou à Vauban. La rotation y est lente, ce qui rend le mandat de recherche particulièrement utile. MAPA Property y dispose d'un réseau off-market actif sur les belles maisons familiales.",
    en: "Cents is a quiet residential district east of the capital, favoured by international families for its rare combination: tranquillity, direct access to Kirchberg and the airport (10 minutes), housing stock dominated by detached homes and small condominiums from the 1960s to the 1990s. Market: €7,500 to €12,500/sqm. Typical buyer profile: family with children at the European School I (Kirchberg) or Vauban. Turnover is slow, making the search mandate particularly useful. MAPA Property maintains an active off-market network on prime family houses.",
    de: "Cents ist ein ruhiges Wohnviertel im Osten der Hauptstadt, beliebt bei internationalen Familien wegen einer seltenen Kombination: Ruhe, direkter Zugang zu Kirchberg und Flughafen (10 Minuten), Bestand aus Einfamilienhäusern und kleinen Eigentumswohnungen der 1960er bis 1990er Jahre. Markt: 7.500 bis 12.500 €/m². Typisches Käuferprofil: Familie mit Kindern an der Europaschule I (Kirchberg) oder Vauban. Geringe Fluktuation, weshalb das Suchmandat besonders nützlich ist. MAPA Property pflegt ein aktives Off-Market-Netzwerk für hochwertige Familienhäuser.",
  },
});

const cessange = buildLuxQuartier({
  slug: "cessange",
  nameFr: "Cessange",
  priceRange: { floor: 6500, ceiling: 10500 },
  highlights: ["Quartier sud, en développement Cloche d'Or", "Maisons individuelles et programmes neufs", "Proximité écoles et A4"],
  description: {
    fr: "Cessange est un quartier sud de Luxembourg-Ville, à proximité immédiate du nouveau pôle Cloche d'Or. Historiquement composé de maisons individuelles et de petits collectifs, il bénéficie depuis la fin des années 2010 d'une relance par les programmes neufs adossés au développement Cloche d'Or. Le marché s'étale de 6 500 à 10 500 €/m². L'attrait principal est la proximité du tertiaire (Cloche d'Or, Gasperich) et l'accès rapide à l'A4. MAPA Property y opère sur mandats de vente et de recherche, avec un focus sur les programmes neufs A+/A++.",
    en: "Cessange is a southern district of Luxembourg City, immediately adjacent to the new Cloche d'Or hub. Historically composed of detached homes and small multi-family buildings, it has benefited since the late 2010s from the boost driven by Cloche d'Or developments. Market: €6,500 to €10,500/sqm. Main draw: proximity to the tertiary sector (Cloche d'Or, Gasperich) and quick access to the A4 motorway. MAPA Property operates on sale and search mandates, with a focus on new-build A+/A++ developments.",
    de: "Cessange ist ein südliches Viertel Luxemburg-Stadt, direkt am neuen Cloche-d'Or-Pol. Historisch aus Einfamilienhäusern und kleinen Mehrfamilienhäusern bestehend, profitiert es seit Ende der 2010er Jahre vom Schub der Cloche-d'Or-Entwicklungen. Markt: 6.500 bis 10.500 €/m². Hauptattraktivität: Nähe zum Tertiärsektor (Cloche d'Or, Gasperich) und schneller Zugang zur Autobahn A4. MAPA Property arbeitet mit Verkaufs- und Suchmandaten, Fokus auf A+/A++-Neubauten.",
  },
});

const clausen = buildLuxQuartier({
  slug: "clausen",
  nameFr: "Clausen",
  priceRange: { floor: 7000, ceiling: 13000 },
  highlights: ["Quartier historique en contrebas de la ville haute", "Anciennes brasseries reconverties (Rives de Clausen)", "Patrimoine UNESCO, ambiance vie nocturne", "Marché de niche, biens rares"],
  description: {
    fr: "Clausen, blotti dans la vallée de l'Alzette en contrebas de la ville haute, conjugue patrimoine UNESCO et reconversion contemporaine. Les anciennes brasseries Mousel et Henri Funck y ont été transformées en quartier des Rives de Clausen, pôle de vie nocturne et de bureaux. Le marché résidentiel y est étroit, dominé par des immeubles bourgeois de la fin du XIXᵉ et des biens d'exception. Les prix s'étalent de 7 000 à 13 000 €/m², avec des pointes plus hautes pour les biens avec terrasse sur l'Alzette. MAPA Property y intervient surtout sur mandat exclusif côté vendeur : les biens disponibles se comptent en unités par an.",
    en: "Clausen, nestled in the Alzette valley below the upper town, combines UNESCO heritage and contemporary regeneration. The former Mousel and Henri Funck breweries have been transformed into the Rives de Clausen district, a nightlife and office hub. The residential market is narrow, dominated by late-19th-century bourgeois buildings and exceptional properties. Prices range from €7,000 to €13,000/sqm, with peaks higher for properties with Alzette-facing terraces. MAPA Property mainly operates here on exclusive seller mandates: available properties number in single digits per year.",
    de: "Clausen liegt im Alzette-Tal unterhalb der Oberstadt und verbindet UNESCO-Erbe mit zeitgenössischer Umnutzung. Die ehemaligen Brauereien Mousel und Henri Funck wurden in das Viertel Rives de Clausen umgewandelt, einen Nachtleben- und Büropol. Der Wohnungsmarkt ist eng, geprägt von bürgerlichen Bauten des späten 19. Jahrhunderts und Ausnahmeobjekten. Preise: 7.000 bis 13.000 €/m², Spitzen darüber bei Objekten mit Alzette-Terrasse. MAPA Property arbeitet hier vorwiegend mit Exklusivmandaten von Verkäufern: verfügbare Objekte sind pro Jahr im einstelligen Bereich.",
  },
});

const eich = buildLuxQuartier({
  slug: "eich",
  nameFr: "Eich",
  priceRange: { floor: 6500, ceiling: 11000 },
  highlights: ["Quartier nord-est, près de Dommeldange", "Maisons et copropriétés calme", "Accès rapide Kirchberg et autoroute A1"],
  description: {
    fr: "Eich est un quartier résidentiel discret du nord-est de la capitale, mitoyen de Dommeldange et bien connecté à Kirchberg et à l'autoroute A1. Le tissu bâti mêle maisons individuelles, copropriétés des années 1970-2000 et quelques programmes neufs. Le marché s'étale de 6 500 à 11 000 €/m². Le profil acquéreur typique est celui d'une famille cherchant un quartier calme avec accès rapide aux pôles d'emploi. MAPA Property y opère sur mandats de recherche et exclusifs côté vendeur.",
    en: "Eich is a discreet residential district in the north-east of the capital, adjacent to Dommeldange and well connected to Kirchberg and the A1 motorway. The fabric mixes detached homes, condominiums from the 1970s to the 2000s and a few new-build developments. Market: €6,500 to €11,000/sqm. Typical buyer profile: family seeking a quiet neighbourhood with quick access to employment hubs. MAPA Property operates on search and exclusive seller mandates.",
    de: "Eich ist ein dezentes Wohnviertel im Nordosten der Hauptstadt, an Dommeldange angrenzend und gut an Kirchberg und Autobahn A1 angebunden. Das Gefüge mischt Einfamilienhäuser, Eigentumswohnungen der 1970er bis 2000er Jahre und einige Neubauten. Markt: 6.500 bis 11.000 €/m². Typisches Käuferprofil: Familie auf der Suche nach einem ruhigen Viertel mit schnellem Zugang zu den Beschäftigungspolen. MAPA Property arbeitet mit Suchmandaten und Exklusivmandaten von Verkäufern.",
  },
});

const gasperich = buildLuxQuartier({
  slug: "gasperich",
  nameFr: "Gasperich",
  priceRange: { floor: 7500, ceiling: 12500 },
  highlights: ["Pôle Cloche d'Or, école Vauban", "Programmes neufs A++ haut de gamme", "Forte demande locative tertiaire", "Stade national mitoyen"],
  schools: ["Vauban (privé AEFE, sur place)", "École Européenne I (Kirchberg, à 10 min)"],
  description: {
    fr: "Gasperich a connu en quinze ans une transformation parmi les plus visibles de la capitale, portée par le pôle économique Cloche d'Or et l'implantation de l'école Vauban (AEFE). Aujourd'hui, le quartier mêle programmes neufs résidentiels A++ haut de gamme, immeubles de bureaux d'envergure (Deloitte, EY, PwC) et équipements (Stade national, centre commercial). Le marché s'étale de 7 500 à 12 500 €/m². L'investissement locatif y est porteur, avec une demande tertiaire forte. MAPA Property y intervient sur mandats exclusifs côté promoteurs partenaires (VEFA), recherche pour familles francophones (Vauban), et off-market.",
    en: "Gasperich has undergone one of the capital's most visible transformations over fifteen years, driven by the Cloche d'Or economic hub and the establishment of the Vauban school (AEFE). Today the district blends premium A++ new-build residential, major office buildings (Deloitte, EY, PwC) and amenities (national stadium, shopping centre). Market: €7,500 to €12,500/sqm. Buy-to-let is strong, supported by tertiary demand. MAPA Property operates here on exclusive partner-developer mandates (off-plan), search mandates for French-speaking families (Vauban), and off-market.",
    de: "Gasperich hat in fünfzehn Jahren eine der sichtbarsten Veränderungen der Hauptstadt durchgemacht, getragen vom Wirtschaftspol Cloche d'Or und der Ansiedlung der Vauban-Schule (AEFE). Heute mischt das Viertel A++-Premium-Neubau, bedeutende Bürogebäude (Deloitte, EY, PwC) und Einrichtungen (Nationalstadion, Einkaufszentrum). Markt: 7.500 bis 12.500 €/m². Mietinvestitionen sind tragfähig, getragen von Tertiärnachfrage. MAPA Property arbeitet mit Exklusivmandaten von Partnerentwicklern (VEFA), Suchmandaten für französischsprachige Familien (Vauban) und Off-Market.",
  },
});

const grund = buildLuxQuartier({
  slug: "grund",
  nameFr: "Grund",
  priceRange: { floor: 7000, ceiling: 13500 },
  highlights: ["Quartier UNESCO en contrebas de la ville haute", "Patrimoine remarquable du XVIIᵉ-XIXᵉ", "Marché très étroit, biens rares", "Vie locale et restaurants"],
  description: {
    fr: "Grund est un quartier patrimonial classé UNESCO, niché dans la vallée de l'Alzette en contrebas de la ville haute. Son charme tient à un tissu de maisons des XVIIᵉ-XIXᵉ siècles, à l'abbaye de Neumünster reconvertie en centre culturel, et à une vie locale dense (restaurants, ateliers d'artistes). Le marché immobilier y est très étroit : peu de transactions, des biens rares à conserver impérativement dans leur cadre patrimonial. Les prix s'étalent de 7 000 à 13 500 €/m², avec des pointes plus hautes sur les biens d'exception. MAPA Property y intervient sur mandats exclusifs ou off-market, car la confidentialité y est de rigueur.",
    en: "Grund is a UNESCO-listed heritage district, nestled in the Alzette valley below the upper town. Its charm lies in houses from the 17th to the 19th century, the Neumünster Abbey reconverted into a cultural centre, and a vibrant local life (restaurants, artists' studios). The real estate market is very narrow: few transactions, rare properties to preserve strictly within their heritage framework. Prices range from €7,000 to €13,500/sqm, peaks higher for exceptional assets. MAPA Property operates on exclusive or off-market mandates, as confidentiality is paramount.",
    de: "Grund ist ein UNESCO-geschütztes Erbeviertel im Alzette-Tal unterhalb der Oberstadt. Sein Charme liegt in Häusern aus dem 17. bis 19. Jahrhundert, der zum Kulturzentrum umgewandelten Neumünster-Abtei und einem lebendigen lokalen Leben (Restaurants, Künstlerateliers). Der Immobilienmarkt ist sehr eng: wenige Transaktionen, seltene Objekte, die strikt im Erberahmen erhalten werden müssen. Preise: 7.000 bis 13.500 €/m², Spitzen höher bei Ausnahmeobjekten. MAPA Property arbeitet mit Exklusiv- oder Off-Market-Mandaten, denn Vertraulichkeit hat Priorität.",
  },
});

const hamm = buildLuxQuartier({
  slug: "hamm",
  nameFr: "Hamm",
  priceRange: { floor: 7000, ceiling: 11500 },
  highlights: ["École St. George's (privé britannique)", "Quartier vert, lisière forêt", "Maisons et copropriétés"],
  schools: ["St. George's International School (privé britannique)"],
  description: {
    fr: "Hamm est un quartier résidentiel boisé de l'est de la capitale, connu pour abriter la St. George's International School, école britannique privée. Le tissu bâti mêle maisons individuelles avec jardin et copropriétés de standing. Le marché s'étale de 7 000 à 11 500 €/m². Le profil acquéreur typique est celui d'une famille britannique ou anglophone scolarisée à St. George's, ou d'un cadre cherchant un quartier verdoyant. MAPA Property y opère sous mandat de recherche ciblé.",
    en: "Hamm is a wooded residential district in the east of the capital, known for hosting St. George's International School, a private British institution. The built fabric mixes detached homes with gardens and high-standard condominiums. Market: €7,000 to €11,500/sqm. Typical buyer: British or English-speaking family with children at St. George's, or executive seeking a leafy neighbourhood. MAPA Property operates here under targeted search mandates.",
    de: "Hamm ist ein bewaldetes Wohnviertel im Osten der Hauptstadt, bekannt für die St. George's International School, eine private britische Einrichtung. Das Gefüge mischt Einfamilienhäuser mit Garten und hochwertige Eigentumswohnungen. Markt: 7.000 bis 11.500 €/m². Typischer Käufer: britische oder englischsprachige Familie mit Kindern an der St. George's, oder Führungskraft auf der Suche nach einem grünen Viertel. MAPA Property arbeitet mit gezielten Suchmandaten.",
  },
});

const hollerich = buildLuxQuartier({
  slug: "hollerich",
  nameFr: "Hollerich",
  priceRange: { floor: 6500, ceiling: 11000 },
  highlights: ["Quartier ouest, en mutation", "Anciens entrepôts reconvertis", "Bonne accessibilité gare et A6"],
  description: {
    fr: "Hollerich, à l'ouest de la capitale, est un quartier en mutation rapide. Son passé industriel a laissé un parc bâti d'entrepôts et d'anciennes usines progressivement reconverties en logements et bureaux. Sa proximité avec la gare centrale, la Cloche d'Or et l'autoroute A6 en fait un point d'accès stratégique. Le marché s'étale de 6 500 à 11 000 €/m². L'investisseur y trouve des projets à valeur ajoutée (réhabilitations, divisions parcellaires) ; l'occupant, des biens rénovés à des prix encore raisonnables. MAPA Property y intervient sur mandats exclusifs et de recherche.",
    en: "Hollerich, to the west of the capital, is a rapidly evolving district. Its industrial past has left a fabric of warehouses and former factories progressively reconverted into housing and offices. Proximity to the central station, Cloche d'Or and A6 motorway makes it a strategic access point. Market: €6,500 to €11,000/sqm. Investors find value-add projects (refurbishments, plot divisions); occupiers find renovated properties at still reasonable prices. MAPA Property operates on exclusive and search mandates.",
    de: "Hollerich im Westen der Hauptstadt wandelt sich rasch. Die industrielle Vergangenheit hinterließ einen Bestand aus Lagerhäusern und ehemaligen Fabriken, schrittweise zu Wohnungen und Büros umgenutzt. Nähe zu Hauptbahnhof, Cloche d'Or und Autobahn A6 macht es zum strategischen Zugangspunkt. Markt: 6.500 bis 11.000 €/m². Investoren finden Value-Add-Projekte (Sanierungen, Parzellenteilungen); Eigennutzer renovierte Objekte zu noch vernünftigen Preisen. MAPA Property arbeitet mit Exklusiv- und Suchmandaten.",
  },
});

const merl = buildLuxQuartier({
  slug: "merl",
  nameFr: "Merl",
  priceRange: { floor: 8000, ceiling: 14000 },
  highlights: ["Quartier résidentiel familial", "École ISL (privée internationale)", "Parc de Merl, qualité de vie"],
  schools: ["ISL, International School of Luxembourg (privé international)"],
  description: {
    fr: "Merl est l'un des quartiers résidentiels familiaux les plus prisés de Luxembourg-Ville, connu pour abriter l'ISL (International School of Luxembourg, école privée anglophone), le parc de Merl et un parc bâti dominant en maisons individuelles et copropriétés des années 1960-2000. Le marché s'étale de 8 000 à 14 000 €/m². Le profil acquéreur typique est celui d'une famille internationale (scolarisation ISL) ou d'un dirigeant local. MAPA Property y opère essentiellement sous mandat de recherche, l'offre publique étant rare.",
    en: "Merl is one of Luxembourg City's most sought-after family residential districts, known for hosting ISL (International School of Luxembourg, English-speaking private school), Merl Park, and a built fabric dominated by detached homes and condominiums from the 1960s to the 2000s. Market: €8,000 to €14,000/sqm. Typical buyer: international family (ISL schooling) or local executive. MAPA Property operates here mainly under search mandate, public supply being scarce.",
    de: "Merl gehört zu den gefragtesten Familienwohnvierteln Luxemburg-Stadt, bekannt für die ISL (International School of Luxembourg, englischsprachige Privatschule), den Merl-Park und einen Bestand aus Einfamilienhäusern und Eigentumswohnungen der 1960er bis 2000er Jahre. Markt: 8.000 bis 14.000 €/m². Typischer Käufer: internationale Familie (ISL-Beschulung) oder lokale Führungskraft. MAPA Property arbeitet überwiegend mit Suchmandaten, da das öffentliche Angebot knapp ist.",
  },
});

const neudorf = buildLuxQuartier({
  slug: "neudorf",
  nameFr: "Neudorf",
  priceRange: { floor: 7000, ceiling: 12000 },
  highlights: ["Vallée nord-est, accès Kirchberg", "Mix maisons et collectifs", "Aéroport Findel proche"],
  description: {
    fr: "Neudorf occupe la vallée nord-est de Luxembourg-Ville, entre Kirchberg et la frontière allemande. Le tissu mixte alterne maisons individuelles et collectifs récents, avec une accessibilité forte vers Kirchberg et l'aéroport Findel. Le marché s'étale de 7 000 à 12 000 €/m². MAPA Property y opère sur mandats de recherche pour les familles cherchant la combinaison calme + accès professionnel rapide.",
    en: "Neudorf occupies the north-east valley of Luxembourg City, between Kirchberg and the German border. The mixed fabric alternates detached houses and recent multi-family buildings, with strong accessibility to Kirchberg and Findel airport. Market: €7,000 to €12,000/sqm. MAPA Property operates under search mandates for families seeking the calm + quick professional access combination.",
    de: "Neudorf liegt im nordöstlichen Tal Luxemburg-Stadt zwischen Kirchberg und der deutschen Grenze. Das gemischte Gefüge wechselt Einfamilienhäuser und jüngere Mehrfamilienhäuser, mit starker Anbindung an Kirchberg und Flughafen Findel. Markt: 7.000 bis 12.000 €/m². MAPA Property arbeitet mit Suchmandaten für Familien, die Ruhe + schnellen beruflichen Zugang suchen.",
  },
});

const pfaffenthal = buildLuxQuartier({
  slug: "pfaffenthal",
  nameFr: "Pfaffenthal",
  priceRange: { floor: 6500, ceiling: 12000 },
  highlights: ["Vallée historique en contrebas de la ville haute", "Ascenseur panoramique vers le Pescatore", "Tram T1, gare-pont", "Marché étroit, biens singuliers"],
  description: {
    fr: "Pfaffenthal occupe la vallée de l'Alzette en contrebas de la ville haute, reliée à celle-ci par l'ascenseur panoramique du Pescatore. Le quartier conserve un caractère villageois marqué, avec des maisons mitoyennes du XIXᵉ siècle et quelques copropriétés contemporaines. Le marché s'étale de 6 500 à 12 000 €/m². L'offre est étroite, les biens singuliers. MAPA Property intervient ici sur mandats off-market quasi exclusivement.",
    en: "Pfaffenthal occupies the Alzette valley below the upper town, connected to it by the Pescatore panoramic lift. The district retains a strong village character, with terraced 19th-century houses and a few contemporary condominiums. Market: €6,500 to €12,000/sqm. Supply is narrow, properties singular. MAPA Property operates here almost exclusively on off-market mandates.",
    de: "Pfaffenthal liegt im Alzette-Tal unterhalb der Oberstadt, verbunden durch den Panoramaaufzug Pescatore. Das Viertel bewahrt einen stark dörflichen Charakter mit aneinandergrenzenden Häusern des 19. Jahrhunderts und einigen zeitgenössischen Eigentumswohnungen. Markt: 6.500 bis 12.000 €/m². Knappes Angebot, eigenwillige Objekte. MAPA Property arbeitet hier fast ausschließlich mit Off-Market-Mandaten.",
  },
});

const weimerskirch = buildLuxQuartier({
  slug: "weimerskirch",
  nameFr: "Weimerskirch",
  priceRange: { floor: 6500, ceiling: 11000 },
  highlights: ["Petit quartier nord, mitoyen Kirchberg", "Caractère villageois préservé", "Forte mutation depuis 2015"],
  description: {
    fr: "Weimerskirch est un petit quartier nord de la capitale, mitoyen de Kirchberg, qui a longtemps gardé un caractère villageois. Depuis 2015, plusieurs programmes neufs et réhabilitations ont relancé le marché. Les prix s'étalent de 6 500 à 11 000 €/m². L'attrait principal : la proximité immédiate de Kirchberg sans en subir la densité. MAPA Property y opère sur mandats exclusifs côté vendeurs et recherche.",
    en: "Weimerskirch is a small northern district of the capital, adjacent to Kirchberg, which long retained a village character. Since 2015, several new-build and refurbishment projects have revitalised the market. Prices: €6,500 to €11,000/sqm. Main appeal: immediate proximity to Kirchberg without its density. MAPA Property operates on exclusive seller and search mandates.",
    de: "Weimerskirch ist ein kleines nördliches Viertel der Hauptstadt, an Kirchberg angrenzend, das lange dörflichen Charakter bewahrte. Seit 2015 haben mehrere Neubau- und Sanierungsprojekte den Markt belebt. Preise: 6.500 bis 11.000 €/m². Hauptreiz: unmittelbare Nähe zu Kirchberg ohne dessen Dichte. MAPA Property arbeitet mit Exklusivmandaten von Verkäufern und Suchmandaten.",
  },
});

// Communes Sud + Nord
const eschSurAlzette: City = {
  slug: "esch-sur-alzette",
  name: { fr: "Esch-sur-Alzette", en: "Esch-sur-Alzette", de: "Esch an der Alzette" },
  country: "LU",
  region: "Sud",
  priceRange: { floor: 5500, ceiling: 9500 },
  highlights: ["Deuxième ville du Grand-Duché", "Belval (campus universitaire, Rockhal)", "Reconversion sidérurgique réussie", "Capitale européenne de la Culture 2022"],
  intro: {
    fr: "Esch-sur-Alzette est la deuxième ville du Luxembourg, à 18 km au sud de la capitale, en pleine reconversion depuis la fermeture des hauts-fourneaux. Belval, ancien site sidérurgique, abrite désormais le campus de l'Université du Luxembourg, la Rockhal et un quartier mixte d'habitation et de bureaux. La ville a porté en 2022 le titre de Capitale européenne de la Culture. Le marché s'étale de 5 500 à 9 500 €/m². L'attrait principal : un rapport prix/qualité de vie nettement plus favorable qu'à Luxembourg-Ville, avec une connexion directe à la capitale (train, A4). MAPA Property y opère sur mandats de vente et de recherche, en particulier sur Belval (programmes neufs A++) et le centre historique.",
    en: "Esch-sur-Alzette is Luxembourg's second city, 18 km south of the capital, undergoing full reconversion since the closure of its blast furnaces. Belval, the former steel site, now hosts the University of Luxembourg campus, the Rockhal venue and a mixed residential-office district. The city held the European Capital of Culture title in 2022. Market: €5,500 to €9,500/sqm. Main appeal: a noticeably better price/quality-of-life ratio than Luxembourg City, with direct connection to the capital (train, A4). MAPA Property operates on sale and search mandates, particularly on Belval (A++ new-build) and the historic centre.",
    de: "Esch an der Alzette ist die zweitgrößte Stadt Luxemburgs, 18 km südlich der Hauptstadt, seit Schließung der Hochöfen in vollem Umbau. Belval, das frühere Stahlwerk, beherbergt heute den Campus der Universität Luxemburg, die Rockhal und ein gemischtes Wohn-Büro-Viertel. 2022 trug die Stadt den Titel Europäische Kulturhauptstadt. Markt: 5.500 bis 9.500 €/m². Hauptreiz: deutlich besseres Preis-Lebensqualitäts-Verhältnis als Luxemburg-Stadt, direkte Anbindung an die Hauptstadt (Bahn, A4). MAPA Property arbeitet mit Verkaufs- und Suchmandaten, insbesondere in Belval (A++-Neubau) und der Altstadt.",
  },
  metaDescription: {
    fr: "Esch-sur-Alzette : 2ᵉ ville du Luxembourg, Belval, capitale culturelle 2022. 5500 à 9500 €/m². Mandats MAPA Property.",
    en: "Esch-sur-Alzette: Luxembourg's 2nd city, Belval, 2022 cultural capital. €5500 to €9500/sqm. MAPA Property mandates.",
    de: "Esch an der Alzette: zweitgrößte Stadt Luxemburgs, Belval, Kulturhauptstadt 2022. 5500 bis 9500 €/m². MAPA Property-Property-Mandate.",
  },
};

const differdange: City = {
  slug: "differdange",
  name: { fr: "Differdange", en: "Differdange", de: "Differdingen" },
  country: "LU",
  region: "Sud",
  priceRange: { floor: 5000, ceiling: 8500 },
  highlights: ["Troisième ville du pays", "Reconversion industrielle, parc Gerlach", "Lycée privé Notre-Dame Sainte-Sophie", "Accès rapide France et Belgique"],
  schools: ["Notre-Dame Sainte-Sophie (privé, Differdange-centre)"],
  intro: {
    fr: "Differdange est la troisième ville du Grand-Duché, dans le bassin minier sud, en pleine modernisation. La ville accueille un lycée privé Notre-Dame Sainte-Sophie, plusieurs zones d'activités et un parc urbain (parc Gerlach). Sa position frontalière (France et Belgique à 5-10 minutes) en fait un marché soutenu par la demande des frontaliers. Les prix s'étalent de 5 000 à 8 500 €/m². MAPA Property y opère sur mandats exclusifs et de recherche.",
    en: "Differdange is the Grand Duchy's third city, in the southern mining basin, currently modernising. The city hosts the Notre-Dame Sainte-Sophie private school, several business zones and an urban park (Gerlach). Its border position (France and Belgium 5 to 10 minutes away) sustains demand from cross-border workers. Prices: €5,000 to €8,500/sqm. MAPA Property operates on exclusive and search mandates.",
    de: "Differdingen ist die drittgrößte Stadt des Großherzogtums, im südlichen Bergbaubecken, aktuell in Modernisierung. Beherbergt die Privatschule Notre-Dame Sainte-Sophie, mehrere Gewerbezonen und einen Stadtpark (Gerlach). Die Grenzlage (Frankreich und Belgien 5 bis 10 Minuten entfernt) trägt die Nachfrage von Grenzgängern. Preise: 5.000 bis 8.500 €/m². MAPA Property arbeitet mit Exklusiv- und Suchmandaten.",
  },
  metaDescription: {
    fr: "Differdange : 3ᵉ ville du Luxembourg, frontalière, 5000 à 8500 €/m². Mandats MAPA Property.",
    en: "Differdange: Luxembourg's 3rd city, border location, €5000 to €8500/sqm. MAPA Property mandates.",
    de: "Differdingen: drittgrößte Stadt Luxemburgs, grenznah, 5000 bis 8500 €/m². MAPA Property-Property-Mandate.",
  },
};

const dudelange: City = {
  slug: "dudelange",
  name: { fr: "Dudelange", en: "Dudelange", de: "Düdelingen" },
  country: "LU",
  region: "Sud",
  priceRange: { floor: 5500, ceiling: 9000 },
  highlights: ["Quatrième ville, frontière française", "Maisons et programmes neufs", "Pôle culturel CNA", "Connexion Esch et Luxembourg"],
  intro: {
    fr: "Dudelange est la quatrième ville du Grand-Duché, à la frontière française. Elle est connue pour son Centre national de l'Audiovisuel (CNA), son tissu mixte de maisons individuelles et de programmes neufs, et son rôle de bassin résidentiel pour les actifs de Luxembourg-Ville et Esch-sur-Alzette. Le marché s'étale de 5 500 à 9 000 €/m². MAPA Property y intervient sur mandats de recherche pour les familles cherchant un cadre calme et un budget mesuré.",
    en: "Dudelange is the Grand Duchy's fourth city, on the French border. It is known for its National Audiovisual Centre (CNA), its mixed fabric of detached houses and new-build, and its role as a residential basin for Luxembourg City and Esch-sur-Alzette workers. Market: €5,500 to €9,000/sqm. MAPA Property operates on search mandates for families seeking a calm setting and measured budget.",
    de: "Düdelingen ist die viertgrößte Stadt des Großherzogtums an der französischen Grenze. Bekannt für das Nationale Audiovisuelle Zentrum (CNA), das gemischte Gefüge aus Einfamilienhäusern und Neubau und seine Rolle als Wohnbecken für Erwerbstätige aus Luxemburg-Stadt und Esch an der Alzette. Markt: 5.500 bis 9.000 €/m². MAPA Property arbeitet mit Suchmandaten für Familien, die ruhiges Umfeld und gemessenes Budget suchen.",
  },
  metaDescription: {
    fr: "Dudelange : 4ᵉ ville, frontière FR, CNA, 5500 à 9000 €/m². Mandats MAPA Property.",
    en: "Dudelange: 4th city, French border, CNA, €5500 to €9000/sqm. MAPA Property mandates.",
    de: "Düdelingen: viertgrößte Stadt, Grenze FR, CNA, 5500 bis 9000 €/m². MAPA Property-Property-Mandate.",
  },
};

const mamer: City = {
  slug: "mamer",
  name: { fr: "Mamer", en: "Mamer", de: "Mamer" },
  country: "LU",
  region: "Centre",
  priceRange: { floor: 7000, ceiling: 12000 },
  highlights: ["École Européenne II (privé EU)", "Couronne ouest de la capitale", "Maisons familiales et copropriétés", "Accès rapide A6"],
  schools: ["École Européenne II (privé EU)"],
  intro: {
    fr: "Mamer est une commune résidentielle de la couronne ouest de Luxembourg-Ville, à 10 minutes du centre par l'A6. Elle est connue pour héberger l'École Européenne II (Mamer), école privée européenne sur le campus de Bertrange-Mamer. Le tissu bâti mêle maisons familiales avec jardin et copropriétés des années 1980-2010. Le marché s'étale de 7 000 à 12 000 €/m². Profil acquéreur dominant : famille européenne scolarisée à l'École Européenne II. MAPA Property y opère essentiellement sous mandat de recherche.",
    en: "Mamer is a residential commune in the western ring around Luxembourg City, 10 minutes from the centre via the A6. Known for hosting the European School II (Mamer), a private EU school on the Bertrange-Mamer campus. The fabric mixes family homes with gardens and condominiums from the 1980s to the 2010s. Market: €7,000 to €12,000/sqm. Dominant buyer profile: European family with children at the European School II. MAPA Property operates here mainly under search mandate.",
    de: "Mamer ist eine Wohnsitzgemeinde im westlichen Ring um Luxemburg-Stadt, 10 Minuten vom Zentrum über die A6. Bekannt für die Europaschule II (Mamer), eine private EU-Schule auf dem Campus Bertrange-Mamer. Das Gefüge mischt Familienhäuser mit Garten und Eigentumswohnungen der 1980er bis 2010er Jahre. Markt: 7.000 bis 12.000 €/m². Dominierendes Käuferprofil: europäische Familie mit Kindern an der Europaschule II. MAPA Property arbeitet überwiegend mit Suchmandaten.",
  },
  metaDescription: {
    fr: "Mamer : couronne ouest, École Européenne II, 7000 à 12000 €/m². Mandats MAPA Property.",
    en: "Mamer: western ring, European School II, €7000 to €12000/sqm. MAPA Property mandates.",
    de: "Mamer: westlicher Ring, Europaschule II, 7000 bis 12000 €/m². MAPA Property-Property-Mandate.",
  },
};

const strassen: City = {
  slug: "strassen",
  name: { fr: "Strassen", en: "Strassen", de: "Strassen" },
  country: "LU",
  region: "Centre",
  priceRange: { floor: 7500, ceiling: 13000 },
  highlights: ["Couronne ouest premium", "Tissu de maisons familiales", "Commerces et restaurants", "Très demandée par familles internationales"],
  intro: {
    fr: "Strassen est une commune résidentielle de la couronne ouest de la capitale, particulièrement prisée des familles internationales. Le tissu bâti se compose majoritairement de maisons individuelles avec jardin, complétées par des copropriétés récentes haut de gamme. Les commerces et restaurants de qualité y abondent. Le marché s'étale de 7 500 à 13 000 €/m². MAPA Property y opère essentiellement sous mandat de recherche, avec un réseau off-market actif sur les belles maisons familiales.",
    en: "Strassen is a residential commune in Luxembourg City's western ring, particularly favoured by international families. The fabric is mostly detached houses with gardens, complemented by recent high-end condominiums. Quality shops and restaurants abound. Market: €7,500 to €13,000/sqm. MAPA Property operates mainly under search mandate, with an active off-market network for prime family houses.",
    de: "Strassen ist eine Wohnsitzgemeinde im westlichen Ring der Hauptstadt, besonders beliebt bei internationalen Familien. Das Gefüge besteht überwiegend aus Einfamilienhäusern mit Garten, ergänzt durch jüngere hochwertige Eigentumswohnungen. Hochwertige Geschäfte und Restaurants im Überfluss. Markt: 7.500 bis 13.000 €/m². MAPA Property arbeitet überwiegend mit Suchmandaten, aktives Off-Market-Netzwerk für hochwertige Familienhäuser.",
  },
  metaDescription: {
    fr: "Strassen : couronne ouest premium, familles internationales. 7500 à 13000 €/m². Mandats MAPA Property.",
    en: "Strassen: premium western ring, international families. €7500 to €13000/sqm. MAPA Property mandates.",
    de: "Strassen: Premium-Westring, internationale Familien. 7500 bis 13000 €/m². MAPA Property-Property-Mandate.",
  },
};

const bertrange: City = {
  slug: "bertrange",
  name: { fr: "Bertrange", en: "Bertrange", de: "Bartringen" },
  country: "LU",
  region: "Centre",
  priceRange: { floor: 7000, ceiling: 12500 },
  highlights: ["Couronne ouest", "Centre commercial Belle Étoile", "Mix maisons et copropriétés", "École Européenne II proche"],
  intro: {
    fr: "Bertrange (Bartringen) est une commune de la couronne ouest, mitoyenne de Strassen et Mamer. Son centre accueille le centre commercial Belle Étoile et un tissu mixte de maisons individuelles et de copropriétés. La commune partage avec Mamer le campus de l'École Européenne II. Le marché s'étale de 7 000 à 12 500 €/m². MAPA Property y opère sur mandats exclusifs et de recherche.",
    en: "Bertrange (Bartringen) is a commune in the western ring, adjacent to Strassen and Mamer. Its centre hosts the Belle Étoile shopping centre and a mixed fabric of detached homes and condominiums. The commune shares the European School II campus with Mamer. Market: €7,000 to €12,500/sqm. MAPA Property operates on exclusive and search mandates.",
    de: "Bartringen ist eine Gemeinde im westlichen Ring, an Strassen und Mamer angrenzend. Das Zentrum beherbergt das Einkaufszentrum Belle Étoile und ein gemischtes Gefüge aus Einfamilienhäusern und Eigentumswohnungen. Die Gemeinde teilt sich mit Mamer den Campus der Europaschule II. Markt: 7.000 bis 12.500 €/m². MAPA Property arbeitet mit Exklusiv- und Suchmandaten.",
  },
  metaDescription: {
    fr: "Bertrange (Bartringen) : couronne ouest, Belle Étoile, École Européenne II. 7000 à 12500 €/m². MAPA Property.",
    en: "Bertrange (Bartringen): western ring, Belle Étoile, European School II. €7000 to €12500/sqm. MAPA Property.",
    de: "Bartringen: westlicher Ring, Belle Étoile, Europaschule II. 7000 bis 12500 €/m². MAPA Property.",
  },
};

const walferdange: City = {
  slug: "walferdange",
  name: { fr: "Walferdange", en: "Walferdange", de: "Walferdingen" },
  country: "LU",
  region: "Centre",
  priceRange: { floor: 6500, ceiling: 11500 },
  highlights: ["Couronne nord", "Vallée de l'Alzette", "Tissu pavillonnaire", "Accès direct Kirchberg"],
  intro: {
    fr: "Walferdange (Walferdingen) est une commune résidentielle de la couronne nord, dans la vallée de l'Alzette, à 10 minutes du Kirchberg. Le tissu bâti est essentiellement pavillonnaire, avec une qualité de vie reconnue (espaces verts, commerces de proximité, écoles publiques). Le marché s'étale de 6 500 à 11 500 €/m². MAPA Property y opère sur mandats exclusifs et de recherche pour familles cherchant un cadre apaisé sans sacrifier l'accès professionnel.",
    en: "Walferdange (Walferdingen) is a residential commune in the northern ring, in the Alzette valley, 10 minutes from Kirchberg. The fabric is essentially suburban housing, with recognised quality of life (green spaces, local shops, public schools). Market: €6,500 to €11,500/sqm. MAPA Property operates on exclusive and search mandates for families seeking a calm setting without sacrificing professional access.",
    de: "Walferdingen ist eine Wohnsitzgemeinde im nördlichen Ring, im Alzette-Tal, 10 Minuten von Kirchberg. Das Gefüge ist im Wesentlichen Einfamilienhausbestand, mit anerkannter Lebensqualität (Grünflächen, Nahversorgung, öffentliche Schulen). Markt: 6.500 bis 11.500 €/m². MAPA Property arbeitet mit Exklusiv- und Suchmandaten für Familien, die ein ruhiges Umfeld ohne Verzicht auf beruflichen Zugang suchen.",
  },
  metaDescription: {
    fr: "Walferdange (Walferdingen) : couronne nord, vallée Alzette, 10 min Kirchberg. 6500 à 11500 €/m². MAPA Property.",
    en: "Walferdange (Walferdingen): northern ring, Alzette valley, 10 min Kirchberg. €6500 to €11500/sqm. MAPA Property.",
    de: "Walferdingen: nördlicher Ring, Alzette-Tal, 10 Min Kirchberg. 6500 bis 11500 €/m². MAPA Property.",
  },
};

// Commune Ouest (oct. 2026) : quatre localites, une seule page.
const steinfort: City = {
  slug: "steinfort",
  name: { fr: "Steinfort", en: "Steinfort", de: "Steinfort" },
  country: "LU",
  region: "Ouest",
  priceRange: { floor: 6000, ceiling: 8500 },
  aliases: ["Hagen", "Kleinbettingen", "Grass"],
  highlights: ["Quatre localités, un seul marché", "À 17 km de Luxembourg-Ville", "Gare de Kleinbettingen, ligne CFL 50", "Nouveau centre sportif avec piscine"],
  highlightsByLang: {
    fr: ["Quatre localités, un seul marché", "À 17 km de Luxembourg-Ville", "Gare de Kleinbettingen, ligne CFL 50", "Nouveau centre sportif avec piscine"],
    en: ["Four villages, one market", "17 km from Luxembourg City", "Kleinbettingen station, CFL line 50", "New sports centre with swimming pool"],
    de: ["Vier Ortschaften, ein Markt", "17 km von Luxemburg-Stadt", "Bahnhof Kleinbettingen, CFL-Linie 50", "Neues Sportzentrum mit Schwimmbad"],
  },
  intro: {
    fr: "Steinfort, dans le canton de Capellen, regroupe quatre localités : Steinfort, Hagen, Kleinbettingen et Grass, pour un peu plus de 6 000 habitants. À la frontière belge et à environ 17 km de Luxembourg-Ville par la route d'Arlon ou par l'autoroute A6, la commune attire surtout les familles à la recherche d'une maison. La gare de Kleinbettingen, sur la ligne CFL 50, et le nouveau centre sportif avec piscine renforcent son attrait. Le marché se situe en moyenne entre 6 000 et 8 500 €/m², avec de forts écarts entre l'ancien non rénové et le neuf. MAPA Property y accompagne vendeurs et acquéreurs, en vente comme en mandat de recherche.",
    en: "Steinfort, in the canton of Capellen, is made up of four villages: Steinfort, Hagen, Kleinbettingen and Grass, with just over 6,000 residents. On the Belgian border and about 17 km from Luxembourg City via the Route d'Arlon or the A6 motorway, the commune mainly attracts families looking for a house. Kleinbettingen station, on CFL line 50, and the new sports centre with its swimming pool add to its appeal. Prices average between €6,000 and €8,500 per m², with wide gaps between unrenovated older properties and new builds. MAPA Property supports sellers and buyers there, for sales as well as search mandates.",
    de: "Steinfort im Kanton Capellen umfasst vier Ortschaften: Steinfort, Hagen, Kleinbettingen und Grass, mit etwas über 6.000 Einwohnern. An der belgischen Grenze und rund 17 km von Luxemburg-Stadt entfernt, über die Route d'Arlon oder die Autobahn A6, zieht die Gemeinde vor allem Familien an, die ein Haus suchen. Der Bahnhof Kleinbettingen an der CFL-Linie 50 und das neue Sportzentrum mit Schwimmbad steigern ihre Attraktivität. Die Preise liegen im Durchschnitt zwischen 6.000 und 8.500 €/m², mit großen Unterschieden zwischen nicht renovierten Altbauten und Neubauten. MAPA Property begleitet dort Verkäufer und Käufer, beim Verkauf wie beim Suchauftrag.",
  },
  metaDescription: {
    fr: "Steinfort : quatre localités à la frontière belge, à 17 km de Luxembourg-Ville. 6000 à 8500 €/m². MAPA Property.",
    en: "Steinfort: four villages on the Belgian border, 17 km from Luxembourg City. €6000 to €8500/sqm. MAPA Property.",
    de: "Steinfort: vier Ortschaften an der belgischen Grenze, 17 km von Luxemburg-Stadt. 6000 bis 8500 €/m². MAPA Property.",
  },
};

// ============================================================================
// 28 VILLES INTERNATIONALES
// ============================================================================

function buildIntlCity(args: {
  slug: string;
  name: { fr: string; en: string; de: string };
  country: CountryCode;
  region?: string;
  priceRange?: { floor: number; ceiling: number };
  schools?: string[];
  highlights: string[];
  highlightsByLang?: { fr: string[]; en: string[]; de: string[] };
  aliases?: string[];
  nameInSentence?: Partial<CityName>;
  prepositionFr?: string;
  description: { fr: string; en: string; de: string };
}): City {
  return {
    slug: args.slug,
    name: args.name,
    country: args.country,
    region: args.region,
    priceRange: args.priceRange,
    schools: args.schools,
    highlights: args.highlights,
    ...(args.highlightsByLang ? { highlightsByLang: args.highlightsByLang } : {}),
    ...(args.aliases ? { aliases: args.aliases } : {}),
    ...(args.nameInSentence ? { nameInSentence: args.nameInSentence } : {}),
    ...(args.prepositionFr ? { prepositionFr: args.prepositionFr } : {}),
    intro: args.description,
    metaDescription: {
      fr: `${args.name.fr}, broker international ${M}${args.priceRange ? `, ${args.priceRange.floor}-${args.priceRange.ceiling} €/m²` : ""}.`,
      en: `${args.name.en}, international broker ${M}${args.priceRange ? `, €${args.priceRange.floor}-${args.priceRange.ceiling}/sqm` : ""}.`,
      de: `${args.name.de}, internationaler Broker ${M}${args.priceRange ? `, ${args.priceRange.floor}-${args.priceRange.ceiling} €/m²` : ""}.`,
    },
  };
}

const paris = buildIntlCity({
  slug: "paris",
  name: { fr: "Paris", en: "Paris", de: "Paris" },
  country: "FR",
  highlights: ["Capitale française et marché de référence européen", "20 arrondissements aux profils contrastés", "Concentration de Trophy Assets (Triangle d'Or, 6ᵉ, 16ᵉ)", "Hôtels particuliers du XVIIᵉ-XIXᵉ"],
  description: {
    fr: "Paris reste le marché de référence pour les Trophy Assets en Europe continentale. Les hôtels particuliers du XVIIᵉ-XIXᵉ siècles, les pieds-à-terre familiaux et les penthouses contemporains constituent les trois segments principaux du marché de prestige. MAPA Property opère à Paris en qualité de broker international, sous mandat de recherche signé au Luxembourg et avec des partenaires locaux habilités. Notre intervention typique : sourcing off-market des biens d'exception (jamais publiés en agence), négociation, due diligence et coordination notariale jusqu'à l'acte authentique.",
    en: "Paris remains the reference market for Trophy Assets in continental Europe. 17th to 19th-century townhouses (hôtels particuliers), family pieds-à-terre and contemporary penthouses form the three main prestige segments. MAPA Property operates in Paris as international broker, under a search mandate signed in Luxembourg with vetted local partners. Typical engagement: off-market sourcing of exceptional properties (never publicly listed), negotiation, due diligence and notarial coordination through to the deed.",
    de: "Paris bleibt der Referenzmarkt für Trophy Assets in Kontinentaleuropa. Stadthäuser (hôtels particuliers) des 17. bis 19. Jahrhunderts, Familien-Pieds-à-terre und zeitgenössische Penthouses bilden die drei zentralen Prestige-Segmente. MAPA Property tritt in Paris als internationaler Broker auf, unter einem in Luxemburg unterzeichneten Suchmandat mit geprüften lokalen Partnern. Typischer Auftrag: Off-Market-Sourcing außergewöhnlicher Objekte (niemals öffentlich gelistet), Verhandlung, Due Diligence und notarielle Koordination bis zur Beurkundung.",
  },
});

const cannes = buildIntlCity({
  slug: "cannes",
  name: { fr: "Cannes", en: "Cannes", de: "Cannes" },
  country: "FR",
  region: "Côte d'Azur",
  highlights: ["Croisette, Festival du Cinéma, MIPIM", "Villas Californie, Super Cannes", "Penthouses front de mer", "Marché ultra-international"],
  description: {
    fr: "Cannes reste l'une des destinations clés de la Côte d'Azur, structurée autour de la Croisette, des collines (Californie, Super Cannes, La Colle, Pointe Croisette) et du Suquet. La saisonnalité (Festival du Cinéma en mai, MIPIM en mars, festivals d'été) et la clientèle internationale (Russes, Britanniques, Américains, Moyen-Orient) en font un marché très liquide. MAPA Property y opère en broker international, sous mandat de recherche signé au Luxembourg, avec un réseau local habilité.",
    en: "Cannes remains one of the French Riviera's key destinations, structured around the Croisette, the hills (Californie, Super Cannes, La Colle, Pointe Croisette) and Le Suquet. Seasonality (Film Festival in May, MIPIM in March, summer festivals) and international clientele (Russian, British, American, Middle Eastern) make it a very liquid market. MAPA Property acts as international broker under a search mandate signed in Luxembourg, with a vetted local network.",
    de: "Cannes bleibt eines der Schlüsselziele der Côte d'Azur, strukturiert um die Croisette, die Hügel (Californie, Super Cannes, La Colle, Pointe Croisette) und Le Suquet. Saisonalität (Filmfestspiele Mai, MIPIM März, Sommerfestivals) und internationale Klientel (russisch, britisch, amerikanisch, Naher Osten) machen den Markt sehr liquide. MAPA Property tritt hier als internationaler Broker auf, unter einem in Luxemburg unterzeichneten Suchmandat mit geprüftem lokalen Netzwerk.",
  },
});

const nice = buildIntlCity({
  slug: "nice",
  name: { fr: "Nice", en: "Nice", de: "Nizza" },
  country: "FR",
  region: "Côte d'Azur",
  highlights: ["Cinquième ville française, capitale de la Côte d'Azur", "Vieux Nice, Promenade des Anglais, Mont Boron", "Aéroport Côte d'Azur (3ᵉ français)", "Marché plus large que Cannes"],
  description: {
    fr: "Nice est la cinquième ville française et la capitale économique de la Côte d'Azur. Son marché immobilier, plus large et liquide que Cannes, se segmente entre le Vieux Nice (patrimoine), la Promenade des Anglais (front de mer), le Mont Boron et le Cap de Nice (villas avec vue mer), Cimiez et le Nice Nord (familial). L'aéroport international (Côte d'Azur, 3ᵉ français) et la connexion TGV en font une métropole accessible. MAPA Property y intervient en broker international.",
    en: "Nice is France's fifth city and the economic capital of the French Riviera. Its real estate market, broader and more liquid than Cannes, is segmented between Old Nice (heritage), the Promenade des Anglais (seafront), Mont Boron and Cap de Nice (villas with sea views), Cimiez and Nice Nord (family). The international airport (Côte d'Azur, France's 3rd) and TGV connection make it an accessible metropolis. MAPA Property acts as international broker.",
    de: "Nizza ist Frankreichs fünftgrößte Stadt und wirtschaftliche Hauptstadt der Côte d'Azur. Sein Immobilienmarkt, breiter und liquider als Cannes, gliedert sich in Altstadt (Erbe), Promenade des Anglais (Meerfront), Mont Boron und Cap de Nice (Villen mit Meerblick), Cimiez und Nizza-Nord (familiär). Internationaler Flughafen (Côte d'Azur, 3. Frankreichs) und TGV-Anbindung machen die Metropole erreichbar. MAPA Property agiert als internationaler Broker.",
  },
});

const saintTropez = buildIntlCity({
  slug: "saint-tropez",
  name: { fr: "Saint-Tropez", en: "Saint-Tropez", de: "Saint-Tropez" },
  aliases: ["Saint Tropez", "St-Tropez", "St Tropez"],
  country: "FR",
  region: "Côte d'Azur",
  highlights: ["Mythe Côte d'Azur, marché ultra-saisonnier", "Villas Capon, Pampelonne, Ramatuelle", "Sud-est St-Tropez = ceinture premium", "Trophy Assets quasi-systématiques"],
  description: {
    fr: "Saint-Tropez est l'une des destinations les plus emblématiques du Var, structurée autour du village historique, de la presqu'île (Pampelonne, Ramatuelle) et des hameaux résidentiels (Capon, Salins, Citadelle). Le marché est ultra-saisonnier et international, dominé par les Trophy Assets : villas avec piscine et accès mer, propriétés de prestige sur 1-3 hectares de terrain. Les transactions s'opèrent essentiellement en off-market, sous NDA contractuel. MAPA Property y intervient comme broker international, en partenariat avec des spécialistes du marché local.",
    en: "Saint-Tropez is one of the Var department's most iconic destinations, structured around the historic village, the peninsula (Pampelonne, Ramatuelle) and residential hamlets (Capon, Salins, Citadelle). The market is ultra-seasonal and international, dominated by Trophy Assets: villas with pool and sea access, prestige properties on 1 to 3 hectares of land. Transactions are mostly off-market under contractual NDA. MAPA Property acts as international broker, in partnership with local market specialists.",
    de: "Saint-Tropez ist eines der ikonischsten Reiseziele des Departements Var, strukturiert um das historische Dorf, die Halbinsel (Pampelonne, Ramatuelle) und Wohngemeinden (Capon, Salins, Citadelle). Der Markt ist ultra-saisonal und international, dominiert von Trophy Assets: Villen mit Pool und Meerzugang, Prestige-Immobilien auf 1 bis 3 Hektar Grundstück. Transaktionen erfolgen überwiegend off-market unter vertraglicher NDA. MAPA Property agiert als internationaler Broker in Partnerschaft mit lokalen Marktspezialisten.",
  },
});

const monaco = buildIntlCity({
  slug: "monaco",
  aliases: ["Monte-Carlo", "Monte Carlo"],
  name: { fr: "Monaco", en: "Monaco", de: "Monaco" },
  country: "FR",
  region: "Principauté",
  highlights: ["Marché immobilier le plus cher du monde au m²", "Carré d'Or, Larvotto, Monte-Carlo", "Stabilité fiscale (résidence)", "Penthouses, vues mer, sécurité"],
  description: {
    fr: "Monaco affiche les prix immobiliers les plus élevés du monde au mètre carré, conséquence directe de la rareté du foncier (2 km² seulement) et du statut fiscal de la Principauté pour les résidents non-français. L'achat à Monaco est conditionné à des prérequis (résidence, justificatifs financiers stricts). MAPA Property opère en broker international avec des partenaires monégasques habilités.",
    en: "Monaco shows the world's highest real estate prices per square metre, a direct consequence of land scarcity (only 2 km²) and the Principality's tax status for non-French residents. Buying in Monaco is subject to prerequisites (residency, strict financial documentation). MAPA Property operates as international broker with vetted Monégasque partners.",
    de: "Monaco weist die höchsten Immobilienpreise der Welt pro Quadratmeter auf, direkte Folge knappen Baulandes (nur 2 km²) und des Steuerstatus des Fürstentums für Nicht-Franzosen. Der Kauf in Monaco unterliegt Voraussetzungen (Wohnsitz, strenge Finanznachweise). MAPA Property agiert als internationaler Broker mit geprüften monegassischen Partnern.",
  },
});

const geneve = buildIntlCity({
  slug: "geneve",
  aliases: ["Genf", "Geneva"],
  name: { fr: "Genève", en: "Geneva", de: "Genf" },
  country: "CH",
  highlights: ["Capitale onusienne, banking privé", "Cologny, Vandœuvres, Versoix premium", "Lex Koller régule l'accès non-résident", "Marché étroit, prix élevés"],
  description: {
    fr: "Genève abrite les institutions onusiennes (ONU, OMC, OMS) et un secteur bancaire privé de premier plan. La Lex Koller (loi fédérale sur l'acquisition d'immeubles par des personnes à l'étranger) restreint l'accès des non-résidents, ce qui rend l'opération plus complexe juridiquement. Les villas avec vue lac à Cologny ou Vandœuvres figurent parmi les biens les plus convoités. MAPA Property opère en broker international avec des partenaires genevois habilités, sous mandat de recherche signé au Luxembourg.",
    en: "Geneva hosts UN institutions (UN, WTO, WHO) and a leading private banking sector. The Lex Koller (federal law on real estate acquisition by foreigners) restricts non-resident access, making the transaction legally more complex. Villas with lake views in Cologny or Vandœuvres are among the most coveted. MAPA Property operates as international broker with vetted Geneva partners, under a search mandate signed in Luxembourg.",
    de: "Genf beherbergt UN-Institutionen (UNO, WTO, WHO) und einen führenden Private-Banking-Sektor. Die Lex Koller (Bundesgesetz über den Erwerb von Grundstücken durch Personen im Ausland) schränkt den Zugang Nichtansässiger ein und macht die Transaktion rechtlich komplexer. Villen mit Seeblick in Cologny oder Vandœuvres zählen zu den begehrtesten. MAPA Property agiert als internationaler Broker mit geprüften Genfer Partnern, unter einem in Luxemburg unterzeichneten Suchmandat.",
  },
});

const lausanne = buildIntlCity({
  slug: "lausanne",
  name: { fr: "Lausanne", en: "Lausanne", de: "Lausanne" },
  country: "CH",
  highlights: ["CIO, EPFL, université", "Lavaux UNESCO mitoyen", "Pully, Lutry, Saint-Sulpice premium", "Marché plus large que Genève"],
  description: {
    fr: "Lausanne, sur les rives du Léman, abrite le siège du Comité International Olympique, l'EPFL et l'université. Les communes périphériques premium (Pully, Lutry, Saint-Sulpice, Cully) abritent des villas et propriétés vue lac très recherchées. La Lex Koller s'applique également (restrictions non-résidents). MAPA Property y intervient en broker international.",
    en: "Lausanne, on the shores of Lake Geneva, hosts the International Olympic Committee, EPFL and the university. Premium peripheral communes (Pully, Lutry, Saint-Sulpice, Cully) host highly sought-after villas and lake-view properties. Lex Koller also applies (non-resident restrictions). MAPA Property acts as international broker.",
    de: "Lausanne am Genfersee beherbergt den Sitz des Internationalen Olympischen Komitees, die EPFL und die Universität. Premium-Randgemeinden (Pully, Lutry, Saint-Sulpice, Cully) beherbergen sehr gefragte Villen und Seeblick-Immobilien. Die Lex Koller gilt ebenfalls (Beschränkungen für Nichtansässige). MAPA Property agiert als internationaler Broker.",
  },
});

const zurich = buildIntlCity({
  slug: "zurich",
  name: { fr: "Zurich", en: "Zurich", de: "Zürich" },
  country: "CH",
  highlights: ["Capitale économique de la Suisse", "Banking privé, hub Big Tech (Google EMEA)", "Goldküste (rive nord) premium", "Lex Koller et restrictions cantonales"],
  description: {
    fr: "Zurich est la capitale économique de la Suisse, premier centre bancaire privé du pays et hub Big Tech (Google EMEA, IBM Research). La Goldküste (rive nord du lac : Küsnacht, Erlenbach, Herrliberg) est la zone la plus prisée pour les villas vue lac. La Lex Koller et les restrictions cantonales rendent l'achat par non-résidents complexe et souvent conditionné à un statut professionnel local. MAPA Property opère en broker international.",
    en: "Zurich is Switzerland's economic capital, the country's leading private banking hub and a Big Tech base (Google EMEA, IBM Research). The Goldküste (north shore of the lake: Küsnacht, Erlenbach, Herrliberg) is the most coveted area for lake-view villas. Lex Koller and cantonal restrictions make non-resident purchase complex, often subject to a local professional status. MAPA Property acts as international broker.",
    de: "Zürich ist die Wirtschaftshauptstadt der Schweiz, führender Private-Banking-Standort und Big-Tech-Drehkreuz (Google EMEA, IBM Research). Die Goldküste (Nordufer des Sees: Küsnacht, Erlenbach, Herrliberg) ist die begehrteste Zone für Villen mit Seeblick. Lex Koller und kantonale Beschränkungen machen den Kauf durch Nichtansässige komplex und oft an einen lokalen Berufstitel gebunden. MAPA Property agiert als internationaler Broker.",
  },
});

const bruxelles = buildIntlCity({
  slug: "bruxelles",
  name: { fr: "Bruxelles", en: "Brussels", de: "Brüssel" },
  country: "BE",
  highlights: ["Capitale belge et de l'UE", "Uccle, Ixelles, Châtelain premium", "Marché européen actif", "Maisons de maître XIXᵉ"],
  description: {
    fr: "Bruxelles, capitale belge et siège des institutions européennes, présente un marché immobilier moins tendu et plus accessible que Luxembourg-Ville ou Paris. Les maisons de maître du XIXᵉ siècle constituent un segment particulièrement attractif. MAPA Property opère en broker international avec des partenaires bruxellois.",
    en: "Brussels, the Belgian capital and seat of EU institutions, has a less strained and more accessible real estate market than Luxembourg City or Paris. 19th-century townhouses (maisons de maître) are a particularly attractive segment. MAPA Property acts as international broker with Brussels-based partners.",
    de: "Brüssel, belgische Hauptstadt und Sitz der EU-Institutionen, hat einen weniger angespannten und zugänglicheren Immobilienmarkt als Luxemburg-Stadt oder Paris. Stadthäuser des 19. Jahrhunderts (maisons de maître) bilden ein besonders attraktives Segment. MAPA Property agiert als internationaler Broker mit Brüsseler Partnern.",
  },
});

const anvers = buildIntlCity({
  slug: "anvers",
  name: { fr: "Anvers", en: "Antwerp", de: "Antwerpen" },
  country: "BE",
  highlights: ["Deuxième ville belge, port majeur", "Diamantaires, mode (Dries Van Noten)", "Quartier sud (Het Zuid) gentrifié", "Patrimoine flamand riche"],
  description: {
    fr: "Anvers, deuxième ville de Belgique, abrite le port le plus important de la mer du Nord, le quartier des diamantaires et une scène mode internationale. Les quartiers Het Zuid (gentrifié), 't Eilandje (reconversion portuaire) et la vieille ville sont les plus recherchés. MAPA Property y opère en broker international.",
    en: "Antwerp, Belgium's second city, hosts the most important North Sea port, the diamond district and an international fashion scene. The most sought-after districts are Het Zuid (gentrified), 't Eilandje (port reconversion) and the old town. MAPA Property acts as international broker.",
    de: "Antwerpen, zweitgrößte Stadt Belgiens, beherbergt den wichtigsten Hafen der Nordsee, das Diamantenviertel und eine internationale Modeszene. Begehrteste Viertel: Het Zuid (gentrifiziert), 't Eilandje (Hafenumnutzung) und Altstadt. MAPA Property agiert als internationaler Broker.",
  },
});

const amsterdam = buildIntlCity({
  slug: "amsterdam",
  name: { fr: "Amsterdam", en: "Amsterdam", de: "Amsterdam" },
  country: "NL",
  highlights: ["Capitale néerlandaise, hub financier post-Brexit", "Canaux UNESCO", "Oud-Zuid, Jordaan, Vondelpark", "Pénurie chronique de logement"],
  description: {
    fr: "Amsterdam est la capitale économique néerlandaise et un hub financier renforcé par le post-Brexit (relocations EMA, banques, fonds). Les zones premium incluent Oud-Zuid, Centrum (canaux UNESCO), Jordaan, Zuidas (quartier d'affaires moderne). MAPA Property y intervient en broker international.",
    en: "Amsterdam is the Dutch economic capital and a financial hub reinforced post-Brexit (EMA relocation, banks, funds). Premium areas include Oud-Zuid, Centrum (UNESCO canals), Jordaan, Zuidas (modern business district). MAPA Property acts as international broker.",
    de: "Amsterdam ist die niederländische Wirtschaftshauptstadt und ein durch den Post-Brexit gestärkter Finanzhub (EMA-Verlegung, Banken, Fonds). Premium-Lagen: Oud-Zuid, Centrum (UNESCO-Grachten), Jordaan, Zuidas (modernes Geschäftsviertel). MAPA Property agiert als internationaler Broker.",
  },
});

const londres = buildIntlCity({
  slug: "londres",
  name: { fr: "Londres", en: "London", de: "London" },
  country: "GB",
  highlights: ["Mayfair, Belgravia, Knightsbridge, Kensington premium", "Marché global le plus liquide", "Brexit a recentré les flux"],
  description: {
    fr: "Londres demeure le marché global le plus liquide pour les Trophy Assets résidentiels. Le Brexit a marginalement recentré les flux mais Londres reste un actif refuge pour les investisseurs internationaux. MAPA Property opère en broker international avec des partenaires londoniens.",
    en: "London remains the most liquid global market for residential Trophy Assets. Brexit marginally redirected flows but London remains a safe haven for international investors. MAPA Property operates as international broker with London partners.",
    de: "London bleibt der liquideste globale Markt für residenzielle Trophy Assets. Der Brexit hat die Flüsse marginal umgelenkt, doch London bleibt ein sicherer Hafen für internationale Investoren. MAPA Property agiert als internationaler Broker mit Londoner Partnern.",
  },
});

const madrid = buildIntlCity({
  slug: "madrid",
  name: { fr: "Madrid", en: "Madrid", de: "Madrid" },
  country: "ES",
  highlights: ["Capitale espagnole, locomotion économique", "Salamanca, Chamberí, Centro premium", "Marché en hausse, retour des capitaux internationaux"],
  description: {
    fr: "Madrid concentre l'essentiel de l'activité économique espagnole et présente un marché immobilier en croissance soutenue depuis 2015. L'attrait fiscal pour les non-résidents (régime Beckham, retraités) renforce les flux entrants. MAPA Property opère en broker international.",
    en: "Madrid concentrates most of Spain's economic activity and shows a real estate market in sustained growth since 2015. The tax appeal for non-residents (Beckham regime, retirees) reinforces inbound flows. MAPA Property acts as international broker.",
    de: "Madrid vereint den Großteil der spanischen Wirtschaftsaktivität und zeigt seit 2015 einen anhaltend wachsenden Immobilienmarkt. Der steuerliche Reiz für Nichtansässige (Beckham-Regime, Rentner) verstärkt die Zuflüsse. MAPA Property agiert als internationaler Broker.",
  },
});

const barcelone = buildIntlCity({
  slug: "barcelone",
  name: { fr: "Barcelone", en: "Barcelona", de: "Barcelona" },
  country: "ES",
  highlights: ["Eixample, Pedralbes, Sarrià premium", "Marché méditerranéen ultra-international", "Modernisme catalan", "Réglementation locative durcie"],
  description: {
    fr: "Barcelone offre un marché immobilier méditerranéen ultra-international, dominé par les Trophy Assets de l'Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi et Diagonal Mar. L'architecture moderniste catalane (Gaudí, Domènech i Montaner) constitue un segment patrimonial à part. La réglementation locative s'est durcie sur les Airbnb (limitations strictes), ce qui réoriente les flux vers le résidentiel propre. MAPA Property opère en broker international.",
    en: "Barcelona offers an ultra-international Mediterranean market, dominated by Trophy Assets in the Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi and Diagonal Mar. Catalan Modernist architecture (Gaudí, Domènech i Montaner) constitutes a heritage segment of its own. Rental regulation has tightened on Airbnb (strict limits), redirecting flows to clean residential. MAPA Property acts as international broker.",
    de: "Barcelona bietet einen ultra-internationalen Mittelmeermarkt, dominiert von Trophy Assets im Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi und Diagonal Mar. Die katalanische Modernisme-Architektur (Gaudí, Domènech i Montaner) bildet ein eigenes Erbesegment. Die Mietregulierung wurde bei Airbnb verschärft (strenge Begrenzungen), was die Flüsse auf das reine Wohnen umlenkt. MAPA Property agiert als internationaler Broker.",
  },
});

const lisbonne = buildIntlCity({
  slug: "lisbonne",
  name: { fr: "Lisbonne", en: "Lisbon", de: "Lissabon" },
  country: "PT",
  highlights: ["Chiado, Príncipe Real, Lapa premium", "Climat, qualité de vie, fiscalité", "Visa Doré (Golden Visa) recadré", "Marché en pleine restructuration"],
  description: {
    fr: "Lisbonne a connu entre 2015 et 2023 une explosion de la demande internationale, portée par le climat, la fiscalité (Régime Résident Non Habituel, Golden Visa) et la qualité de vie. Depuis le recadrage du Golden Visa et la fin partielle du RNH, le marché s'est restructuré. MAPA Property opère en broker international.",
    en: "Lisbon experienced between 2015 and 2023 an explosion of international demand, driven by climate, taxation (Non-Habitual Resident regime, Golden Visa) and quality of life. Since the Golden Visa rework and partial NHR end, the market has restructured. MAPA Property acts as international broker.",
    de: "Lissabon erlebte zwischen 2015 und 2023 eine Explosion internationaler Nachfrage, getragen von Klima, Besteuerung (Nicht-Habitueller-Resident-Regime, Goldenes Visum) und Lebensqualität. Seit der Überarbeitung des Goldenen Visums und dem teilweisen Ende des NHR hat sich der Markt umstrukturiert. MAPA Property agiert als internationaler Broker.",
  },
});

const porto = buildIntlCity({
  slug: "porto",
  name: { fr: "Porto", en: "Porto", de: "Porto" },
  country: "PT",
  highlights: ["Deuxième ville portugaise", "Foz do Douro, Boavista, Centro UNESCO", "Marché plus accessible que Lisbonne", "Patrimoine et caves de Porto"],
  description: {
    fr: "Les quartiers premium, Foz do Douro (front de mer), Boavista, Centro Histórico (UNESCO), concentrent la valeur. La ville bénéficie d'un patrimoine UNESCO, des caves de Porto sur la rive de Vila Nova de Gaia, et d'un dynamisme culturel marqué (Casa da Música, Serralves). MAPA Property opère en broker international.",
    en: "Premium districts, Foz do Douro (seafront), Boavista, Centro Histórico (UNESCO), concentrate value. The city benefits from UNESCO heritage, the port wine cellars across Vila Nova de Gaia and a strong cultural dynamism (Casa da Música, Serralves). MAPA Property acts as international broker.",
    de: "Premium-Viertel, Foz do Douro (Meerfront), Boavista, Centro Histórico (UNESCO), konzentrieren den Wert. Die Stadt profitiert von UNESCO-Erbe, den Portweinkellern auf der Seite Vila Nova de Gaia und ausgeprägter kultureller Dynamik (Casa da Música, Serralves). MAPA Property agiert als internationaler Broker.",
  },
});

const rome = buildIntlCity({
  slug: "rome",
  name: { fr: "Rome", en: "Rome", de: "Rom" },
  country: "IT",
  highlights: ["Capitale italienne, patrimoine UNESCO", "Centro storico, Parioli, Aventino premium", "Marché conservateur, biens rares"],
  description: {
    fr: "Rome, capitale italienne, présente un marché immobilier conservateur, dominé par les biens patrimoniaux. Les contraintes patrimoniales (zones UNESCO, monuments protégés) limitent les rénovations possibles. MAPA Property opère en broker international.",
    en: "Rome, the Italian capital, presents a conservative real estate market dominated by heritage properties. Heritage constraints (UNESCO zones, protected monuments) limit renovation possibilities. MAPA Property acts as international broker.",
    de: "Rom, italienische Hauptstadt, bietet einen konservativen Immobilienmarkt, dominiert von Erbeobjekten. Erbeauflagen (UNESCO-Zonen, geschützte Denkmäler) begrenzen Sanierungsmöglichkeiten. MAPA Property agiert als internationaler Broker.",
  },
});

const milan = buildIntlCity({
  slug: "milan",
  name: { fr: "Milan", en: "Milan", de: "Mailand" },
  country: "IT",
  highlights: ["Capitale économique italienne", "Quadrilatero della Moda, Brera, CityLife", "Marché en croissance forte", "Mode, finance, design"],
  description: {
    fr: "Milan est la capitale économique italienne, premier centre financier et siège de l'industrie de la mode et du design. Les quartiers premium, Quadrilatero della Moda, Brera, Porta Nuova, CityLife (gratte-ciel récents), Magenta-San Vittore, concentrent les Trophy Assets. MAPA Property opère en broker international.",
    en: "Milan is Italy's economic capital, the leading financial centre and seat of the fashion and design industry. Premium districts, Quadrilatero della Moda, Brera, Porta Nuova, CityLife (recent skyscrapers), Magenta-San Vittore, concentrate Trophy Assets. MAPA Property acts as international broker.",
    de: "Mailand ist Italiens Wirtschaftshauptstadt, führender Finanzplatz und Sitz der Mode- und Designindustrie. Premium-Viertel, Quadrilatero della Moda, Brera, Porta Nuova, CityLife (jüngere Hochhäuser), Magenta-San Vittore, konzentrieren Trophy Assets. MAPA Property agiert als internationaler Broker.",
  },
});

const florence = buildIntlCity({
  slug: "florence",
  name: { fr: "Florence", en: "Florence", de: "Florenz" },
  country: "IT",
  region: "Toscane",
  highlights: ["Patrimoine Renaissance UNESCO", "Centro storico, Oltrarno premium", "Toscane résidentielle (villas, fattorie)", "Marché conservateur"],
  description: {
    fr: "Florence concentre l'un des patrimoines artistiques les plus denses du monde (Renaissance, UNESCO). La Toscane résidentielle (villas, fattorie, propriétés viticoles dans le Chianti) constitue un segment international à part. MAPA Property opère en broker international.",
    en: "Florence concentrates one of the world's densest artistic heritages (Renaissance, UNESCO). Residential Tuscany (villas, fattorie, wine properties in Chianti) constitutes an international segment of its own. MAPA Property acts as international broker.",
    de: "Florenz vereint eines der dichtesten Kulturerben der Welt (Renaissance, UNESCO). Das residenzielle Toskana (Villen, fattorie, Weingüter im Chianti) bildet ein eigenes internationales Segment. MAPA Property agiert als internationaler Broker.",
  },
});

const vienne = buildIntlCity({
  slug: "vienne",
  name: { fr: "Vienne", en: "Vienna", de: "Wien" },
  country: "AT",
  highlights: ["Capitale autrichienne, qualité de vie n°1 mondiale", "1ᵉʳ arrondissement (InnereStadt), 19ᵉ Döbling", "Marché stable, fiscalité claire"],
  description: {
    fr: "Vienne, capitale autrichienne, est régulièrement classée première ville du monde en qualité de vie (Mercer, Economist). Le 1ᵉʳ arrondissement (InnereStadt, UNESCO) et le 19ᵉ (Döbling, vignobles) concentrent la valeur. MAPA Property opère en broker international avec des partenaires viennois.",
    en: "Vienna, the Austrian capital, regularly ranks as the world's top city for quality of life (Mercer, Economist). The 1st district (InnereStadt, UNESCO) and the 19th (Döbling, vineyards) concentrate value. MAPA Property acts as international broker with Vienna partners.",
    de: "Wien, österreichische Hauptstadt, wird regelmäßig als beste Stadt der Welt für Lebensqualität eingestuft (Mercer, Economist). Der 1. Bezirk (Innere Stadt, UNESCO) und der 19. (Döbling, Weinberge) konzentrieren den Wert. MAPA Property agiert als internationaler Broker mit Wiener Partnern.",
  },
});

const berlin = buildIntlCity({
  slug: "berlin",
  name: { fr: "Berlin", en: "Berlin", de: "Berlin" },
  country: "DE",
  highlights: ["Capitale allemande, scène culturelle", "Mitte, Charlottenburg, Prenzlauer Berg", "Mietendeckel et régulations strictes", "Marché en mutation"],
  description: {
    fr: "Berlin, capitale allemande, présente un marché immobilier en mutation depuis 2015. La régulation locative (Mietendeckel partiellement annulé, encadrement des loyers) reste un point de vigilance pour l'investisseur. MAPA Property opère en broker international.",
    en: "Berlin, the German capital, presents a market in transition since 2015. Rental regulation (Mietendeckel partly overturned, rent caps) remains a point of vigilance for investors. MAPA Property acts as international broker.",
    de: "Berlin, deutsche Hauptstadt, zeigt seit 2015 einen Markt im Wandel. Mietregulierung (Mietendeckel teilweise gekippt, Mietpreisbremse) bleibt ein Wachsamkeitspunkt für Investoren. MAPA Property agiert als internationaler Broker.",
  },
});

const munich = buildIntlCity({
  slug: "munich",
  name: { fr: "Munich", en: "Munich", de: "München" },
  country: "DE",
  highlights: ["Première ville allemande en prix", "Schwabing, Bogenhausen, Lehel premium", "BMW, Allianz, Siemens", "Marché ultra-tendu"],
  description: {
    fr: "Munich est la première ville allemande en prix immobiliers, conséquence de son tissu économique dense (BMW, Allianz, Siemens, MunichRe). Les quartiers premium (Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt) concentrent la valeur. La pénurie de logements y est chronique. MAPA Property opère en broker international.",
    en: "Munich has Germany's highest real estate prices, a consequence of its dense economic fabric (BMW, Allianz, Siemens, MunichRe). Premium districts (Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt) concentrate value. Housing shortage is chronic. MAPA Property acts as international broker.",
    de: "München hat die höchsten Immobilienpreise Deutschlands, Folge des dichten Wirtschaftsgefüges (BMW, Allianz, Siemens, MunichRe). Premium-Viertel, Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt, konzentrieren den Wert. Wohnungsknappheit ist chronisch. MAPA Property agiert als internationaler Broker.",
  },
});

const francfort = buildIntlCity({
  slug: "francfort",
  name: { fr: "Francfort", en: "Frankfurt", de: "Frankfurt am Main" },
  country: "DE",
  highlights: ["Capitale financière allemande", "BCE, Bundesbank, banques", "Westend, Sachsenhausen, Bornheim", "Hub aérien européen majeur"],
  description: {
    fr: "Francfort est la capitale financière allemande, siège de la Banque Centrale Européenne et de la Bundesbank. Les quartiers premium (Westend, Sachsenhausen, Bornheim, Nordend) concentrent la demande. Le hub aérien (Frankfurt Airport, premier d'Allemagne) renforce l'attractivité internationale. MAPA Property opère en broker international.",
    en: "Frankfurt is the German financial capital, seat of the European Central Bank and Bundesbank. Premium districts (Westend, Sachsenhausen, Bornheim, Nordend) concentrate demand. The airline hub (Frankfurt Airport, Germany's largest) reinforces international appeal. MAPA Property acts as international broker.",
    de: "Frankfurt ist Deutschlands Finanzhauptstadt, Sitz der Europäischen Zentralbank und der Bundesbank. Premium-Viertel (Westend, Sachsenhausen, Bornheim, Nordend) konzentrieren die Nachfrage. Das Luftfahrtdrehkreuz (Frankfurt Airport, größter Deutschlands) stärkt die internationale Anziehungskraft. MAPA Property agiert als internationaler Broker.",
  },
});

const hambourg = buildIntlCity({
  slug: "hambourg",
  name: { fr: "Hambourg", en: "Hamburg", de: "Hamburg" },
  country: "DE",
  highlights: ["Deuxième ville allemande, port majeur", "HafenCity, Eppendorf, Blankenese premium", "Médias, commerce, logistique"],
  description: {
    fr: "Hambourg, deuxième ville allemande, abrite le plus grand port d'Allemagne et un tissu économique fort (médias, commerce, logistique, aéronautique). Les quartiers premium, HafenCity (reconversion portuaire), Eppendorf, Blankenese (villas vue Elbe), concentrent la valeur. MAPA Property opère en broker international.",
    en: "Hamburg, Germany's second city, hosts the country's largest port and a strong economic fabric (media, trade, logistics, aerospace). Premium districts, HafenCity (port reconversion), Eppendorf, Blankenese (villas with Elbe views), concentrate value. MAPA Property acts as international broker.",
    de: "Hamburg, zweitgrößte Stadt Deutschlands, beherbergt den größten Hafen Deutschlands und ein starkes Wirtschaftsgefüge (Medien, Handel, Logistik, Luftfahrt). Premium-Viertel, HafenCity (Hafenumnutzung), Eppendorf, Blankenese (Villen mit Elbblick), konzentrieren den Wert. MAPA Property agiert als internationaler Broker.",
  },
});

const dubai = buildIntlCity({
  slug: "dubai",
  aliases: ["Dubai", "Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Business Bay"],
  name: { fr: "Dubaï", en: "Dubai", de: "Dubai" },
  country: "AE",
  highlights: ["Émirats Arabes Unis, hub global", "Palm Jumeirah, Downtown, DIFC, Emirates Hills", "Pas d'IR, fiscalité avantageuse résidence", "Marché ultra-international"],
  description: {
    fr: "Dubaï est l'un des marchés immobiliers les plus internationaux et liquides du monde, structuré autour de zones distinctes : Palm Jumeirah (villas et penthouses sur l'archipel artificiel), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (financier), Emirates Hills (villas haut de gamme), Arabian Ranches, Dubai Marina, Bluewaters. L'absence d'impôt sur le revenu et un cadre réglementaire pro-investisseur en font un marché refuge. MAPA Property opère en broker international avec des partenaires habilités RERA.",
    en: "Dubai is one of the world's most international and liquid real estate markets, structured around distinct zones: Palm Jumeirah (villas and penthouses on the artificial archipelago), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (financial), Emirates Hills (high-end villas), Arabian Ranches, Dubai Marina, Bluewaters. Absence of income tax and a pro-investor regulatory framework make it a safe haven. MAPA Property acts as international broker with RERA-licensed partners.",
    de: "Dubai ist einer der internationalsten und liquidesten Immobilienmärkte der Welt, strukturiert um eigenständige Zonen: Palm Jumeirah (Villen und Penthouses auf dem künstlichen Archipel), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (Finanzplatz), Emirates Hills (gehobene Villen), Arabian Ranches, Dubai Marina, Bluewaters. Fehlende Einkommensteuer und ein investorenfreundlicher Rechtsrahmen machen Dubai zu einem sicheren Hafen. MAPA Property agiert als internationaler Broker mit RERA-lizenzierten Partnern.",
  },
});

const newYork = buildIntlCity({
  slug: "new-york",
  name: { fr: "New York", en: "New York", de: "New York" },
  country: "US",
  highlights: ["Manhattan : Tribeca, SoHo, Upper East/West Side", "Brooklyn : Williamsburg, DUMBO", "Marché global premium", "Coopératives, condominiums, brownstones"],
  description: {
    fr: "New York demeure l'un des marchés immobiliers les plus iconiques au monde, structuré autour de Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) et de quelques zones du Queens (Long Island City). Le marché distingue trois segments structurels : coopératives (avec board approval), condominiums (plus souples pour étrangers), brownstones (maisons de ville historiques). MAPA Property opère en broker international avec des partenaires NY licenciés.",
    en: "New York remains one of the world's most iconic real estate markets, structured around Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) and parts of Queens (Long Island City). The market distinguishes three structural segments: cooperatives (with board approval), condominiums (more foreigner-friendly), brownstones (historic townhouses). MAPA Property acts as international broker with NY-licensed partners.",
    de: "New York bleibt einer der ikonischsten Immobilienmärkte der Welt, strukturiert um Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) und Teile von Queens (Long Island City). Der Markt unterscheidet drei strukturelle Segmente: Cooperatives (mit Board Approval), Condominiums (ausländerfreundlicher), Brownstones (historische Stadthäuser). MAPA Property agiert als internationaler Broker mit NY-lizenzierten Partnern.",
  },
});

const miami = buildIntlCity({
  slug: "miami",
  name: { fr: "Miami", en: "Miami", de: "Miami" },
  country: "US",
  highlights: ["South Beach, Miami Beach, Brickell premium", "Hub Latin America", "Tax appeal Florida (no state income tax)", "Marché ultra-international"],
  description: {
    fr: "Miami est devenue depuis 2020 l'un des marchés immobiliers les plus dynamiques d'Amérique du Nord, porté par les flux entrants depuis New York, San Francisco et l'Amérique latine. L'absence d'impôt d'État (Florida) renforce l'attractivité. MAPA Property opère en broker international avec des partenaires Miami licenciés.",
    en: "Miami has become since 2020 one of North America's most dynamic real estate markets, driven by inflows from New York, San Francisco and Latin America. The absence of state income tax (Florida) reinforces appeal. MAPA Property acts as international broker with Miami-licensed partners.",
    de: "Miami ist seit 2020 einer der dynamischsten Immobilienmärkte Nordamerikas geworden, getragen von Zuflüssen aus New York, San Francisco und Lateinamerika. Das Fehlen einer staatlichen Einkommensteuer (Florida) verstärkt die Attraktivität. MAPA Property agiert als internationaler Broker mit Miami-lizenzierten Partnern.",
  },
});

const saintBarthelemy = buildIntlCity({
  slug: "saint-barthelemy",
  name: { fr: "Saint-Barthélemy", en: "Saint-Barthélemy", de: "Saint-Barthélemy" },
  country: "FR",
  region: "Antilles",
  highlights: ["Antilles françaises, marché ultra-confidentiel", "Villas Gustavia, Saint-Jean, Lurin", "Trophy Assets quasi-systématiques", "Off-market dominant"],
  description: {
    fr: "Saint-Barthélemy (Saint-Barth) est l'une des destinations résidentielles les plus exclusives des Caraïbes, dominée par les Trophy Assets : villas avec accès mer, propriétés sur les hauteurs (Lurin, Gouverneur, Saint-Jean) et front de mer rare (Gustavia). Le marché est ultra-confidentiel, dominé par les transactions off-market sous NDA contractuel. MAPA Property opère en broker international avec des partenaires antillais habilités, sous mandat de recherche signé au Luxembourg.",
    en: "Saint-Barthélemy (Saint-Barth) is one of the Caribbean's most exclusive residential destinations, dominated by Trophy Assets: villas with sea access, properties on the heights (Lurin, Gouverneur, Saint-Jean) and rare seafront (Gustavia). The market is ultra-confidential, dominated by off-market transactions under contractual NDA. MAPA Property acts as international broker with vetted Caribbean partners, under a search mandate signed in Luxembourg.",
    de: "Saint-Barthélemy (Saint-Barth) ist eines der exklusivsten Wohnziele der Karibik, dominiert von Trophy Assets: Villen mit Meerzugang, Immobilien auf den Höhen (Lurin, Gouverneur, Saint-Jean) und seltene Meerfront (Gustavia). Der Markt ist ultra-vertraulich, dominiert von Off-Market-Transaktionen unter vertraglicher NDA. MAPA Property agiert als internationaler Broker mit geprüften karibischen Partnern, unter einem in Luxemburg unterzeichneten Suchmandat.",
  },
});

// Textes PROVISOIRES (oct. 2026) : structure en 3 langues, texte neutre sans
// chiffre, prix, regle juridique ou fiscale. Textes definitifs a venir ;
// pages non mises en ligne avant ces textes.
const ileMaurice = buildIntlCity({
  slug: "ile-maurice",
  name: { fr: "Île Maurice", en: "Mauritius", de: "Mauritius" },
  nameInSentence: { fr: "l'Île Maurice" },
  country: "MU",
  aliases: ["Maurice", "Mauritius", "Ile Maurice", "Grand Baie", "Grand-Baie", "Tamarin", "Rivière Noire", "Riviere Noire", "Black River", "Flic en Flac", "Bel Ombre", "Port-Louis", "Moka", "Pereybere", "Trou aux Biches"],
  highlights: ["Broker international MAPA Property", "Partenaires locaux"],
  highlightsByLang: {
    fr: ["Broker international MAPA Property", "Partenaires locaux"],
    en: ["MAPA Property international broker", "Local partners"],
    de: ["Internationaler Broker MAPA Property", "Lokale Partner"],
  },
  description: {
    fr: "Page en préparation. MAPA Property accompagne acquéreurs et vendeurs à l'Île Maurice en qualité de broker international, avec des partenaires locaux. Le contenu détaillé de cette page sera publié prochainement.",
    en: "Page in preparation. MAPA Property supports buyers and sellers in Mauritius as an international broker, working with local partners. Detailed content for this page will be published soon.",
    de: "Seite in Vorbereitung. MAPA Property begleitet Käufer und Verkäufer auf Mauritius als internationaler Broker, gemeinsam mit lokalen Partnern. Ausführliche Inhalte zu dieser Seite folgen in Kürze.",
  },
});

const metz = buildIntlCity({
  slug: "metz",
  name: { fr: "Metz", en: "Metz", de: "Metz" },
  country: "FR",
  aliases: ["Metz", "Montigny-lès-Metz", "Montigny-les-Metz", "Woippy", "Marly", "Moulins-lès-Metz", "Thionville"],
  highlights: ["Broker international MAPA Property", "Partenaires locaux"],
  highlightsByLang: {
    fr: ["Broker international MAPA Property", "Partenaires locaux"],
    en: ["MAPA Property international broker", "Local partners"],
    de: ["Internationaler Broker MAPA Property", "Lokale Partner"],
  },
  description: {
    fr: "Page en préparation. MAPA Property accompagne acquéreurs et vendeurs à Metz et dans ses environs en qualité de broker international, avec des partenaires locaux. Le contenu détaillé de cette page sera publié prochainement.",
    en: "Page in preparation. MAPA Property supports buyers and sellers in Metz and the surrounding area as an international broker, working with local partners. Detailed content for this page will be published soon.",
    de: "Seite in Vorbereitung. MAPA Property begleitet Käufer und Verkäufer in Metz und Umgebung als internationaler Broker, gemeinsam mit lokalen Partnern. Ausführliche Inhalte zu dieser Seite folgen in Kürze.",
  },
});

const algarve = buildIntlCity({
  slug: "algarve",
  name: { fr: "Algarve", en: "Algarve", de: "Algarve" },
  nameInSentence: { en: "the Algarve", de: "der Algarve" },
  prepositionFr: "en",
  country: "PT",
  aliases: ["Algarve", "Portimão", "Portimao", "Lagos", "Albufeira", "Vilamoura", "Faro", "Lagoa", "Carvoeiro", "Alvor", "Tavira", "Loulé", "Loule", "Quinta do Lago", "Vale do Lobo", "Praia da Rocha"],
  highlights: ["Broker international MAPA Property", "Partenaires locaux"],
  highlightsByLang: {
    fr: ["Broker international MAPA Property", "Partenaires locaux"],
    en: ["MAPA Property international broker", "Local partners"],
    de: ["Internationaler Broker MAPA Property", "Lokale Partner"],
  },
  description: {
    fr: "Page en préparation. MAPA Property accompagne acquéreurs et vendeurs en Algarve en qualité de broker international, avec des partenaires locaux. Le contenu détaillé de cette page sera publié prochainement.",
    en: "Page in preparation. MAPA Property supports buyers and sellers in the Algarve as an international broker, working with local partners. Detailed content for this page will be published soon.",
    de: "Seite in Vorbereitung. MAPA Property begleitet Käufer und Verkäufer an der Algarve als internationaler Broker, gemeinsam mit lokalen Partnern. Ausführliche Inhalte zu dieser Seite folgen in Kürze.",
  },
});

// ============================================================================
// EXPORT
// ============================================================================

export const cities: City[] = [
  // 25 Luxembourg
  luxembourgVille, belair, limpertsberg, bonnevoie, cents, cessange, clausen, eich,
  gasperich, grund, hamm, hollerich, kirchberg, merl, neudorf, pfaffenthal,
  weimerskirch, eschSurAlzette, differdange, dudelange, mamer, strassen, bertrange, walferdange,
  steinfort,
  // 28 international
  paris, cannes, nice, saintTropez, monaco, geneve, lausanne, zurich,
  bruxelles, anvers, amsterdam, londres, madrid, barcelone, lisbonne, porto,
  rome, milan, florence, vienne, berlin, munich, francfort, hambourg,
  dubai, newYork, miami, saintBarthelemy,
  ileMaurice, metz, algarve,
];

export const luxembourgCities = cities.filter((c) => c.country === "LU");
export const internationalCities = cities.filter((c) => c.country !== "LU");

export function getCityBySlug(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}

export function getCitySlugs(): string[] {
  return cities.map((c) => c.slug);
}

export function getNearbyCities(slug: string, count = 4): City[] {
  const target = getCityBySlug(slug);
  if (!target) return [];
  const sameCountry = cities.filter((c) => c.country === target.country && c.slug !== slug);
  if (sameCountry.length >= count) return sameCountry.slice(0, count);
  const others = cities.filter((c) => c.country !== target.country && c.slug !== slug);
  return [...sameCountry, ...others].slice(0, count);
}

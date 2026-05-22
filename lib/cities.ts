export type CountryCode =
  | "LU" | "FR" | "CH" | "BE" | "NL" | "GB" | "ES" | "PT" | "IT" | "AT" | "DE" | "AE" | "US";

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
    fr: "Luxembourg-Ville concentre l'essentiel de la valeur immobilière du Grand-Duché. Capitale politique, financière et européenne, elle abrite les sièges de la Cour de Justice, de la Banque Européenne d'Investissement et d'une centaine de fonds d'investissement parmi les plus actifs d'Europe. Son tissu urbain marie une vieille ville classée UNESCO, des quartiers résidentiels arborés (Belair, Limpertsberg, Merl) et un quartier d'affaires moderne (Kirchberg) qui n'a cessé de s'étendre depuis les années 1990. Pour l'acquéreur, la ville offre quatre logiques distinctes : le centre historique pour le prestige patrimonial, les quartiers Belair-Limpertsberg pour la résidence principale familiale, Kirchberg pour le neuf et le rendement, et les quartiers gare et Bonnevoie pour l'investissement locatif sur cycles courts. Les prix médians s'étalent de 7 500 à 18 000 €/m² selon le micro-marché, l'état et le DPE. Sur ce périmètre, MAPA Property opère sous mandat exclusif ou de recherche, en mobilisant son réseau off-market et les sources notariales partenaires. Le marché locatif est encadré par le plafond légal de 5 % du capital investi par an (loi du 21 septembre 2006), une donnée structurante pour l'investisseur.",
    en: "Luxembourg City concentrates most of the Grand Duchy's real estate value. Political, financial and European capital, it hosts the Court of Justice, the European Investment Bank and around a hundred of Europe's most active investment funds. The urban fabric blends a UNESCO-listed old town, leafy residential districts (Belair, Limpertsberg, Merl) and a modern business district (Kirchberg) that has expanded continuously since the 1990s. For the buyer, the city offers four distinct logics: the historic centre for heritage prestige, Belair-Limpertsberg for family primary residence, Kirchberg for new-build and yield, and the station and Bonnevoie areas for short-cycle rental investment. Median prices range from €7,500 to €18,000 per sqm depending on micro-market, condition and energy rating. Across this perimeter, MAPA Property acts under exclusive or search mandate, mobilising its off-market network and notarial partners. The rental market is capped by the legal 5% rule on invested capital per year (law of 21 September 2006), a structural variable for investors.",
    de: "Luxemburg-Stadt vereint den größten Teil des Immobilienwerts des Großherzogtums. Als politische, finanzielle und europäische Hauptstadt beherbergt sie den Gerichtshof, die Europäische Investitionsbank und rund hundert der aktivsten Investmentfonds Europas. Das Stadtgefüge verbindet eine UNESCO-geschützte Altstadt, baumbestandene Wohnviertel (Belair, Limpertsberg, Merl) und ein modernes Geschäftsviertel (Kirchberg), das seit den 1990er Jahren stetig wächst. Für Käufer ergeben sich vier Logiken: historisches Zentrum für Prestige, Belair-Limpertsberg für die Familienhauptwohnsitz, Kirchberg für Neubau und Rendite, Bahnhof und Bonnevoie für Kurzzyklus-Mietinvestitionen. Mediane Preise zwischen 7.500 € und 18.000 €/m² je nach Lage, Zustand und Energieausweis. MAPA Property arbeitet hier mit Exklusiv- oder Suchmandaten, mit Off-Market-Netzwerk und notariellen Partnern. Der Mietmarkt ist gemäß Gesetz vom 21. September 2006 auf 5 % des eingesetzten Kapitals pro Jahr gedeckelt — eine strukturelle Größe für Investoren.",
  },
  metaDescription: {
    fr: "Immobilier prestige Luxembourg-Ville — 24 quartiers, 7500 à 18000 €/m². Mandats vente, recherche, off-market par MAPA Property.",
    en: "Prestige real estate Luxembourg City — 24 districts, €7500 to €18000/sqm. Sale, search, off-market mandates by MAPA Property.",
    de: "Immobilien Prestige Luxemburg-Stadt — 24 Viertel, 7500 bis 18000 €/m². Verkaufs-, Such-, Off-Market-Mandate von MAPA Property.",
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
    en: "Belair is the most sought-after residential district in Luxembourg City. Its reputation rests on three factors: the quality of the building stock (1920s–1970s manor houses, high-end condominiums, recent new-build), the stability of its population (senior executives, EU civil servants, established professionals) and the scarcity of available land. The market ranges from €8,500/sqm (older property to renovate, energy class H or I) to €16,000/sqm (premium new-build A++ with terrace and view), with a median around €11,500/sqm. Energy class E or F properties do not trade below €8,500/sqm; the lower prices seen elsewhere in the capital do not apply to Belair. The district is home to several prestigious private schools (ISL adjacent, Vauban 2 km away, European School I in Kirchberg), with quick links to the historic centre and Kirchberg business district. For foreign buyers, MAPA Property's search mandate activates a structured off-market network; properties visible on public portals are only a fraction of the real market.",
    de: "Belair ist das gefragteste Wohnviertel Luxemburg-Stadt. Sein Ruf beruht auf drei Faktoren: Qualität des Gebäudebestands (Herrenhäuser der 1920–1970er Jahre, hochwertige Eigentumswohnungen, jüngste Neubauten), Stabilität der Bewohnerschaft (Führungskräfte, EU-Beamte, etablierte Freiberufler) und Knappheit des Baulands. Die Preise reichen von 8.500 €/m² (sehr alt, sanierungsbedürftig, Energieklassen H oder I) bis 16.000 €/m² (Neubau Premium A++ mit Terrasse und freier Sicht), Median rund 11.500 €/m². Objekte der Energieklassen E oder F werden nicht unter 8.500 €/m² gehandelt; in der Hauptstadt anderswo beobachtete Niedrigpreise gelten in Belair nicht. Das Viertel verfügt über angesehene Privatschulen (ISL angrenzend, Vauban 2 km, Europaschule I in Kirchberg) und schnelle Verbindungen zur Altstadt und nach Kirchberg. Für ausländische Käufer mobilisiert das MAPA Property-Suchmandat ein strukturiertes Off-Market-Netzwerk; die auf öffentlichen Portalen sichtbaren Objekte sind nur ein Bruchteil des realen Marktes.",
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
    fr: "Limpertsberg combine la respectabilité d'un quartier bourgeois ancien et le dynamisme d'un campus universitaire. Sa trame urbaine, héritée de l'urbanisation des années 1900-1930, alterne maisons à usage unifamilial, immeubles d'appartements de qualité et bâtiments universitaires (Campus Limpertsberg de l'Université du Luxembourg). Le marché immobilier s'étale de 8 000 à 14 500 €/m² environ, avec une prime pour les biens au-dessus du Glacis et à proximité du Théâtre. Les acquéreurs visent surtout la résidence principale familiale ; le rendement locatif y est modéré mais sécurisé par une demande étudiante et professionnelle constante. La connexion tram (ligne T1) et la proximité immédiate du centre administratif et de Kirchberg sont des atouts structurels. MAPA Property y opère essentiellement sous mandat de recherche pour des familles internationales, et plus rarement sous mandat exclusif côté vendeur — la rotation y est faible.",
    en: "Limpertsberg combines the respectability of an old bourgeois district with the dynamism of a university campus. Its urban fabric, inherited from the 1900–1930 urbanisation, alternates single-family homes, quality apartment buildings and university facilities (University of Luxembourg, Limpertsberg Campus). The market ranges from €8,000 to €14,500/sqm, with a premium for properties above Glacis and near the Théâtre. Buyers mainly target the family primary residence; rental yield is moderate but secured by steady student and professional demand. The tram connection (T1 line) and immediate proximity to the administrative centre and Kirchberg are structural strengths. MAPA Property operates here mainly under search mandate for international families, and more rarely under exclusive seller's mandate — turnover is low.",
    de: "Limpertsberg vereint die Solidität eines alten Bürgerviertels mit der Dynamik eines Universitätscampus. Das Stadtgefüge der Urbanisierung von 1900–1930 wechselt zwischen Einfamilienhäusern, hochwertigen Wohngebäuden und Universitätsbauten (Universität Luxemburg, Campus Limpertsberg). Der Markt reicht von 8.000 bis 14.500 €/m², mit Aufpreis für Objekte oberhalb des Glacis und in Theaternähe. Käufer zielen überwiegend auf den Familienhauptwohnsitz; die Mietrendite ist mäßig, jedoch durch stetige Nachfrage von Studierenden und Berufstätigen abgesichert. Die Straßenbahn (T1) und die Nähe zum Verwaltungszentrum und Kirchberg sind strukturelle Stärken. MAPA Property arbeitet hier vorwiegend mit Suchmandaten für internationale Familien, seltener mit Exklusivmandaten von Verkäufern — die Fluktuation ist gering.",
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
    en: "Kirchberg is Luxembourg's business and institutional district, built on a 365-hectare plateau since the 1960s to host EU institutions (Court of Justice, EIB, European Parliament). The real estate ecosystem is largely new and standardised: developments from 2000–2025 mostly rated A++ or A+, in vertical condominiums with services. The market ranges from €8,500 to €14,000/sqm for residential, with a premium for high-floor units, Alzette views or Klosegrënnchen Forest exposure. Rental demand is strong (EU civil servants, bankers, Big Four consultants), with 24–36 month leases common and very low vacancy risk. The T1 tram serves the entire district. MAPA Property operates here on exclusive seller mandates for investors (off-plan/VEFA), search mandates for owner-occupiers, and off-market for resales.",
    de: "Kirchberg ist Luxemburgs Geschäfts- und Institutionsviertel, seit den 1960er Jahren auf einer 365 Hektar großen Hochebene für die EU-Institutionen errichtet (Gerichtshof, EIB, Europaparlament). Das Immobilienökosystem ist überwiegend neu und standardisiert: Projekte von 2000–2025, meist A++ oder A+, vertikale Wohnanlagen mit Services. Markt: 8.500 bis 14.000 €/m² für Wohnimmobilien, Aufpreis für höhere Etagen, Alzette-Sicht oder Klosegrënnchen-Wald-Lage. Sehr aktive Mietnachfrage (EU-Beamte, Banker, Big-Four-Berater), 24–36-Monats-Mietverträge üblich, geringes Leerstandsrisiko. T1-Straßenbahn auf der gesamten Achse. MAPA Property arbeitet hier mit Exklusivmandaten für Investoren (VEFA), Suchmandaten für Eigennutzer und Off-Market für Wiederverkäufe.",
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
      fr: `${args.nameFr} (Luxembourg-Ville) — ${args.priceRange.floor}-${args.priceRange.ceiling} €/m². Mandats vente, recherche, off-market par ${M}.`,
      en: `${en} (Luxembourg City) — €${args.priceRange.floor}-${args.priceRange.ceiling}/sqm. Sale, search, off-market mandates by ${M}.`,
      de: `${de} (Luxemburg-Stadt) — ${args.priceRange.floor}-${args.priceRange.ceiling} €/m². Verkauf, Suche, Off-Market — ${M}.`,
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
    en: "Bonnevoie is a rapidly evolving district. Historically working-class, it has become since the mid-2010s one of the capital's most active markets in volume, driven by proximity to the central station and Cloche d'Or. The fabric mixes renovated workers' houses, 1960s–80s rental buildings and new-build. Market: €6,500 to €11,000/sqm. For investors, one of the city's best price/yield ratios; for owner-occupiers, steadily rising quality of life. MAPA Property operates mainly under search mandate and off-market for prime older stock.",
    de: "Bonnevoie wandelt sich rasch. Historisch ein Arbeiterviertel, gehört es seit Mitte der 2010er Jahre zu den volumenstärksten Märkten der Hauptstadt — getragen von der Nähe zum Hauptbahnhof und zur Cloche d'Or. Das Gefüge mischt sanierte Arbeiterhäuser, Mietshäuser der 1960–80er Jahre und Neubau. Markt: 6.500 bis 11.000 €/m². Für Investoren eines der besten Preis-/Rendite-Verhältnisse der Stadt; für Eigennutzer stetig steigende Lebensqualität. MAPA Property arbeitet hier überwiegend mit Suchmandaten und Off-Market für hochwertige Altbauten.",
  },
});

const cents = buildLuxQuartier({
  slug: "cents",
  nameFr: "Cents",
  priceRange: { floor: 7500, ceiling: 12500 },
  highlights: ["Quartier résidentiel calme à l'est", "Proximité aéroport Findel et Kirchberg", "Maisons et villas années 1960-1990", "Cible familles internationales"],
  description: {
    fr: "Cents est un quartier résidentiel calme, à l'est de la capitale, prisé des familles internationales pour la combinaison rare qu'il offre : tranquillité, accès direct à Kirchberg et à l'aéroport (10 minutes), parc bâti dominant de maisons individuelles et de petites copropriétés des années 1960-1990. Le marché s'étale de 7 500 à 12 500 €/m². Le profil acquéreur typique est celui d'une famille avec enfants scolarisés à l'École Européenne I (Kirchberg) ou à Vauban. La rotation y est lente, ce qui rend le mandat de recherche particulièrement utile. MAPA Property y dispose d'un réseau off-market actif sur les belles maisons familiales.",
    en: "Cents is a quiet residential district east of the capital, favoured by international families for its rare combination: tranquillity, direct access to Kirchberg and the airport (10 minutes), housing stock dominated by detached homes and small condominiums from the 1960s–1990s. Market: €7,500 to €12,500/sqm. Typical buyer profile: family with children at the European School I (Kirchberg) or Vauban. Turnover is slow, making the search mandate particularly useful. MAPA Property maintains an active off-market network on prime family houses.",
    de: "Cents ist ein ruhiges Wohnviertel im Osten der Hauptstadt, beliebt bei internationalen Familien wegen einer seltenen Kombination: Ruhe, direkter Zugang zu Kirchberg und Flughafen (10 Minuten), Bestand aus Einfamilienhäusern und kleinen Eigentumswohnungen der 1960–1990er Jahre. Markt: 7.500 bis 12.500 €/m². Typisches Käuferprofil: Familie mit Kindern an der Europaschule I (Kirchberg) oder Vauban. Geringe Fluktuation, weshalb das Suchmandat besonders nützlich ist. MAPA Property pflegt ein aktives Off-Market-Netzwerk für hochwertige Familienhäuser.",
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
    fr: "Clausen, blotti dans la vallée de l'Alzette en contrebas de la ville haute, conjugue patrimoine UNESCO et reconversion contemporaine. Les anciennes brasseries Mousel et Henri Funck y ont été transformées en quartier des Rives de Clausen, pôle de vie nocturne et de bureaux. Le marché résidentiel y est étroit, dominé par des immeubles bourgeois de la fin du XIXᵉ et des biens d'exception. Les prix s'étalent de 7 000 à 13 000 €/m², avec des pointes plus hautes pour les biens avec terrasse sur l'Alzette. MAPA Property y intervient surtout sur mandat exclusif côté vendeur — les biens disponibles se comptent en unités par an.",
    en: "Clausen, nestled in the Alzette valley below the upper town, combines UNESCO heritage and contemporary regeneration. The former Mousel and Henri Funck breweries have been transformed into the Rives de Clausen district, a nightlife and office hub. The residential market is narrow, dominated by late-19th-century bourgeois buildings and exceptional properties. Prices range from €7,000 to €13,000/sqm, with peaks higher for properties with Alzette-facing terraces. MAPA Property mainly operates here on exclusive seller mandates — available properties number in single digits per year.",
    de: "Clausen liegt im Alzette-Tal unterhalb der Oberstadt und verbindet UNESCO-Erbe mit zeitgenössischer Umnutzung. Die ehemaligen Brauereien Mousel und Henri Funck wurden in das Viertel Rives de Clausen umgewandelt, einen Nachtleben- und Büropol. Der Wohnungsmarkt ist eng, geprägt von bürgerlichen Bauten des späten 19. Jahrhunderts und Ausnahmeobjekten. Preise: 7.000 bis 13.000 €/m², Spitzen darüber bei Objekten mit Alzette-Terrasse. MAPA Property arbeitet hier vorwiegend mit Exklusivmandaten von Verkäufern — verfügbare Objekte sind pro Jahr im einstelligen Bereich.",
  },
});

const eich = buildLuxQuartier({
  slug: "eich",
  nameFr: "Eich",
  priceRange: { floor: 6500, ceiling: 11000 },
  highlights: ["Quartier nord-est, près de Dommeldange", "Maisons et copropriétés calme", "Accès rapide Kirchberg et autoroute A1"],
  description: {
    fr: "Eich est un quartier résidentiel discret du nord-est de la capitale, mitoyen de Dommeldange et bien connecté à Kirchberg et à l'autoroute A1. Le tissu bâti mêle maisons individuelles, copropriétés des années 1970-2000 et quelques programmes neufs. Le marché s'étale de 6 500 à 11 000 €/m². Le profil acquéreur typique est celui d'une famille cherchant un quartier calme avec accès rapide aux pôles d'emploi. MAPA Property y opère sur mandats de recherche et exclusifs côté vendeur.",
    en: "Eich is a discreet residential district in the north-east of the capital, adjacent to Dommeldange and well connected to Kirchberg and the A1 motorway. The fabric mixes detached homes, 1970s–2000s condominiums and a few new-build developments. Market: €6,500 to €11,000/sqm. Typical buyer profile: family seeking a quiet neighbourhood with quick access to employment hubs. MAPA Property operates on search and exclusive seller mandates.",
    de: "Eich ist ein dezentes Wohnviertel im Nordosten der Hauptstadt, an Dommeldange angrenzend und gut an Kirchberg und Autobahn A1 angebunden. Das Gefüge mischt Einfamilienhäuser, Eigentumswohnungen der 1970–2000er Jahre und einige Neubauten. Markt: 6.500 bis 11.000 €/m². Typisches Käuferprofil: Familie auf der Suche nach einem ruhigen Viertel mit schnellem Zugang zu den Beschäftigungspolen. MAPA Property arbeitet mit Suchmandaten und Exklusivmandaten von Verkäufern.",
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
    fr: "Grund est un quartier patrimonial classé UNESCO, niché dans la vallée de l'Alzette en contrebas de la ville haute. Son charme tient à un tissu de maisons des XVIIᵉ-XIXᵉ siècles, à l'abbaye de Neumünster reconvertie en centre culturel, et à une vie locale dense (restaurants, ateliers d'artistes). Le marché immobilier y est très étroit : peu de transactions, des biens rares à conserver impérativement dans leur cadre patrimonial. Les prix s'étalent de 7 000 à 13 500 €/m², avec des pointes plus hautes sur les biens d'exception. MAPA Property y intervient sur mandats exclusifs ou off-market — la confidentialité y est de rigueur.",
    en: "Grund is a UNESCO-listed heritage district, nestled in the Alzette valley below the upper town. Its charm lies in 17th–19th-century houses, the Neumünster Abbey reconverted into a cultural centre, and a vibrant local life (restaurants, artists' studios). The real estate market is very narrow: few transactions, rare properties to preserve strictly within their heritage framework. Prices range from €7,000 to €13,500/sqm, peaks higher for exceptional assets. MAPA Property operates on exclusive or off-market mandates — confidentiality is paramount.",
    de: "Grund ist ein UNESCO-geschütztes Erbeviertel im Alzette-Tal unterhalb der Oberstadt. Sein Charme liegt in Häusern des 17.–19. Jahrhunderts, der zum Kulturzentrum umgewandelten Neumünster-Abtei und einem lebendigen lokalen Leben (Restaurants, Künstlerateliers). Der Immobilienmarkt ist sehr eng: wenige Transaktionen, seltene Objekte, die strikt im Erberahmen erhalten werden müssen. Preise: 7.000 bis 13.500 €/m², Spitzen höher bei Ausnahmeobjekten. MAPA Property arbeitet mit Exklusiv- oder Off-Market-Mandaten — Vertraulichkeit hat Priorität.",
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
  schools: ["ISL — International School of Luxembourg (privé international)"],
  description: {
    fr: "Merl est l'un des quartiers résidentiels familiaux les plus prisés de Luxembourg-Ville, connu pour abriter l'ISL (International School of Luxembourg, école privée anglophone), le parc de Merl et un parc bâti dominant en maisons individuelles et copropriétés des années 1960-2000. Le marché s'étale de 8 000 à 14 000 €/m². Le profil acquéreur typique est celui d'une famille internationale (scolarisation ISL) ou d'un dirigeant local. MAPA Property y opère essentiellement sous mandat de recherche, l'offre publique étant rare.",
    en: "Merl is one of Luxembourg City's most sought-after family residential districts, known for hosting ISL (International School of Luxembourg, English-speaking private school), Merl Park, and a built fabric dominated by detached homes and 1960s–2000s condominiums. Market: €8,000 to €14,000/sqm. Typical buyer: international family (ISL schooling) or local executive. MAPA Property operates here mainly under search mandate, public supply being scarce.",
    de: "Merl gehört zu den gefragtesten Familienwohnvierteln Luxemburg-Stadt — bekannt für die ISL (International School of Luxembourg, englischsprachige Privatschule), den Merl-Park und einen Bestand aus Einfamilienhäusern und Eigentumswohnungen der 1960–2000er Jahre. Markt: 8.000 bis 14.000 €/m². Typischer Käufer: internationale Familie (ISL-Beschulung) oder lokale Führungskraft. MAPA Property arbeitet überwiegend mit Suchmandaten, da das öffentliche Angebot knapp ist.",
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
    en: "Differdange is the Grand Duchy's third city, in the southern mining basin, currently modernising. The city hosts the Notre-Dame Sainte-Sophie private school, several business zones and an urban park (Gerlach). Its border position (France and Belgium 5–10 minutes away) sustains demand from cross-border workers. Prices: €5,000 to €8,500/sqm. MAPA Property operates on exclusive and search mandates.",
    de: "Differdingen ist die drittgrößte Stadt des Großherzogtums, im südlichen Bergbaubecken, aktuell in Modernisierung. Beherbergt die Privatschule Notre-Dame Sainte-Sophie, mehrere Gewerbezonen und einen Stadtpark (Gerlach). Die Grenzlage (Frankreich und Belgien 5–10 Minuten entfernt) trägt die Nachfrage von Grenzgängern. Preise: 5.000 bis 8.500 €/m². MAPA Property arbeitet mit Exklusiv- und Suchmandaten.",
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
    en: "Mamer is a residential commune in the western ring around Luxembourg City, 10 minutes from the centre via the A6. Known for hosting the European School II (Mamer), a private EU school on the Bertrange-Mamer campus. The fabric mixes family homes with gardens and 1980s–2010s condominiums. Market: €7,000 to €12,000/sqm. Dominant buyer profile: European family with children at the European School II. MAPA Property operates here mainly under search mandate.",
    de: "Mamer ist eine Wohnsitzgemeinde im westlichen Ring um Luxemburg-Stadt, 10 Minuten vom Zentrum über die A6. Bekannt für die Europaschule II (Mamer), eine private EU-Schule auf dem Campus Bertrange-Mamer. Das Gefüge mischt Familienhäuser mit Garten und Eigentumswohnungen der 1980–2010er Jahre. Markt: 7.000 bis 12.000 €/m². Dominierendes Käuferprofil: europäische Familie mit Kindern an der Europaschule II. MAPA Property arbeitet überwiegend mit Suchmandaten.",
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
    intro: args.description,
    metaDescription: {
      fr: `${args.name.fr} — broker international ${M}${args.priceRange ? `, ${args.priceRange.floor}-${args.priceRange.ceiling} €/m²` : ""}.`,
      en: `${args.name.en} — international broker ${M}${args.priceRange ? `, €${args.priceRange.floor}-${args.priceRange.ceiling}/sqm` : ""}.`,
      de: `${args.name.de} — internationaler Broker ${M}${args.priceRange ? `, ${args.priceRange.floor}-${args.priceRange.ceiling} €/m²` : ""}.`,
    },
  };
}

const paris = buildIntlCity({
  slug: "paris",
  name: { fr: "Paris", en: "Paris", de: "Paris" },
  country: "FR",
  priceRange: { floor: 10000, ceiling: 35000 },
  highlights: ["Capitale française et marché de référence européen", "20 arrondissements aux profils contrastés", "Concentration de Trophy Assets (Triangle d'Or, 6ᵉ, 16ᵉ)", "Hôtels particuliers du XVIIᵉ-XIXᵉ"],
  description: {
    fr: "Paris reste le marché de référence pour les Trophy Assets en Europe continentale. Les arrondissements premium (Triangle d'Or 8ᵉ, 6ᵉ Saint-Germain-des-Prés, 7ᵉ Invalides, 16ᵉ Passy-Auteuil, 17ᵉ Plaine Monceau) concentrent l'essentiel de la valeur, avec des prix s'étalant de 10 000 à 35 000 €/m² selon le micro-quartier, l'étage et la qualité du bien. Les hôtels particuliers du XVIIᵉ-XIXᵉ siècles, les pieds-à-terre familiaux et les penthouses contemporains constituent les trois segments principaux du marché de prestige. MAPA Property opère à Paris en qualité de broker international, sous mandat de recherche signé au Luxembourg et avec des partenaires locaux habilités. Notre intervention typique : sourcing off-market des biens d'exception (jamais publiés en agence), négociation, due diligence et coordination notariale jusqu'à l'acte authentique.",
    en: "Paris remains the reference market for Trophy Assets in continental Europe. Premium arrondissements (Triangle d'Or 8th, 6th Saint-Germain-des-Prés, 7th Invalides, 16th Passy-Auteuil, 17th Plaine Monceau) concentrate most of the value, with prices ranging from €10,000 to €35,000/sqm depending on micro-district, floor and quality. 17th–19th-century townhouses (hôtels particuliers), family pieds-à-terre and contemporary penthouses form the three main prestige segments. MAPA Property operates in Paris as international broker, under a search mandate signed in Luxembourg with vetted local partners. Typical engagement: off-market sourcing of exceptional properties (never publicly listed), negotiation, due diligence and notarial coordination through to the deed.",
    de: "Paris bleibt der Referenzmarkt für Trophy Assets in Kontinentaleuropa. Die Premium-Arrondissements (Triangle d'Or 8., 6. Saint-Germain-des-Prés, 7. Invalides, 16. Passy-Auteuil, 17. Plaine Monceau) konzentrieren den Großteil des Werts; Preise von 10.000 bis 35.000 €/m² je nach Mikrolage, Etage und Qualität. Stadthäuser (hôtels particuliers) des 17.–19. Jahrhunderts, Familien-Pieds-à-terre und zeitgenössische Penthouses bilden die drei zentralen Prestige-Segmente. MAPA Property tritt in Paris als internationaler Broker auf, unter einem in Luxemburg unterzeichneten Suchmandat mit geprüften lokalen Partnern. Typischer Auftrag: Off-Market-Sourcing außergewöhnlicher Objekte (niemals öffentlich gelistet), Verhandlung, Due Diligence und notarielle Koordination bis zur Beurkundung.",
  },
});

const cannes = buildIntlCity({
  slug: "cannes",
  name: { fr: "Cannes", en: "Cannes", de: "Cannes" },
  country: "FR",
  region: "Côte d'Azur",
  priceRange: { floor: 8000, ceiling: 30000 },
  highlights: ["Croisette, Festival du Cinéma, MIPIM", "Villas Californie, Super Cannes", "Penthouses front de mer", "Marché ultra-international"],
  description: {
    fr: "Cannes reste l'une des destinations clés de la Côte d'Azur, structurée autour de la Croisette, des collines (Californie, Super Cannes, La Colle, Pointe Croisette) et du Suquet. Le marché s'étend de 8 000 à 30 000 €/m² avec des records ponctuels au-delà sur les penthouses de la Croisette ou les villas Belle Époque restaurées. La saisonnalité (Festival du Cinéma en mai, MIPIM en mars, festivals d'été) et la clientèle internationale (Russes, Britanniques, Américains, Moyen-Orient) en font un marché très liquide. MAPA Property y opère en broker international, sous mandat de recherche signé au Luxembourg, avec un réseau local habilité.",
    en: "Cannes remains one of the French Riviera's key destinations, structured around the Croisette, the hills (Californie, Super Cannes, La Colle, Pointe Croisette) and Le Suquet. The market ranges from €8,000 to €30,000/sqm with occasional records above on Croisette penthouses or restored Belle Époque villas. Seasonality (Film Festival in May, MIPIM in March, summer festivals) and international clientele (Russian, British, American, Middle Eastern) make it a very liquid market. MAPA Property acts as international broker under a search mandate signed in Luxembourg, with a vetted local network.",
    de: "Cannes bleibt eines der Schlüsselziele der Côte d'Azur, strukturiert um die Croisette, die Hügel (Californie, Super Cannes, La Colle, Pointe Croisette) und Le Suquet. Markt: 8.000 bis 30.000 €/m² mit gelegentlichen Rekorden darüber bei Penthouses an der Croisette oder restaurierten Belle-Époque-Villen. Saisonalität (Filmfestspiele Mai, MIPIM März, Sommerfestivals) und internationale Klientel (russisch, britisch, amerikanisch, Naher Osten) machen den Markt sehr liquide. MAPA Property tritt hier als internationaler Broker auf, unter einem in Luxemburg unterzeichneten Suchmandat mit geprüftem lokalen Netzwerk.",
  },
});

const nice = buildIntlCity({
  slug: "nice",
  name: { fr: "Nice", en: "Nice", de: "Nizza" },
  country: "FR",
  region: "Côte d'Azur",
  priceRange: { floor: 5500, ceiling: 18000 },
  highlights: ["Cinquième ville française, capitale de la Côte d'Azur", "Vieux Nice, Promenade des Anglais, Mont Boron", "Aéroport Côte d'Azur (3ᵉ français)", "Marché plus large que Cannes"],
  description: {
    fr: "Nice est la cinquième ville française et la capitale économique de la Côte d'Azur. Son marché immobilier, plus large et liquide que Cannes, se segmente entre le Vieux Nice (patrimoine), la Promenade des Anglais (front de mer), le Mont Boron et le Cap de Nice (villas avec vue mer), Cimiez et le Nice Nord (familial). Les prix s'étalent de 5 500 à 18 000 €/m². L'aéroport international (Côte d'Azur, 3ᵉ français) et la connexion TGV en font une métropole accessible. MAPA Property y intervient en broker international.",
    en: "Nice is France's fifth city and the economic capital of the French Riviera. Its real estate market, broader and more liquid than Cannes, is segmented between Old Nice (heritage), the Promenade des Anglais (seafront), Mont Boron and Cap de Nice (villas with sea views), Cimiez and Nice Nord (family). Prices: €5,500 to €18,000/sqm. The international airport (Côte d'Azur, France's 3rd) and TGV connection make it an accessible metropolis. MAPA Property acts as international broker.",
    de: "Nizza ist Frankreichs fünftgrößte Stadt und wirtschaftliche Hauptstadt der Côte d'Azur. Sein Immobilienmarkt, breiter und liquider als Cannes, gliedert sich in Altstadt (Erbe), Promenade des Anglais (Meerfront), Mont Boron und Cap de Nice (Villen mit Meerblick), Cimiez und Nizza-Nord (familiär). Preise: 5.500 bis 18.000 €/m². Internationaler Flughafen (Côte d'Azur, 3. Frankreichs) und TGV-Anbindung machen die Metropole erreichbar. MAPA Property agiert als internationaler Broker.",
  },
});

const saintTropez = buildIntlCity({
  slug: "saint-tropez",
  name: { fr: "Saint-Tropez", en: "Saint-Tropez", de: "Saint-Tropez" },
  country: "FR",
  region: "Côte d'Azur",
  priceRange: { floor: 12000, ceiling: 60000 },
  highlights: ["Mythe Côte d'Azur, marché ultra-saisonnier", "Villas Capon, Pampelonne, Ramatuelle", "Sud-est St-Tropez = ceinture premium", "Trophy Assets quasi-systématiques"],
  description: {
    fr: "Saint-Tropez est l'une des destinations les plus emblématiques du Var, structurée autour du village historique, de la presqu'île (Pampelonne, Ramatuelle) et des hameaux résidentiels (Capon, Salins, Citadelle). Le marché est ultra-saisonnier et international, dominé par les Trophy Assets : villas avec piscine et accès mer, propriétés de prestige sur 1-3 hectares de terrain. Les prix s'étalent de 12 000 à 60 000 €/m² selon l'exposition, le terrain et la rareté du bien. Les transactions s'opèrent essentiellement en off-market, sous NDA contractuel. MAPA Property y intervient comme broker international, en partenariat avec des spécialistes du marché local.",
    en: "Saint-Tropez is one of the Var department's most iconic destinations, structured around the historic village, the peninsula (Pampelonne, Ramatuelle) and residential hamlets (Capon, Salins, Citadelle). The market is ultra-seasonal and international, dominated by Trophy Assets: villas with pool and sea access, prestige properties on 1–3 hectares of land. Prices: €12,000 to €60,000/sqm depending on exposure, land and rarity. Transactions are mostly off-market under contractual NDA. MAPA Property acts as international broker, in partnership with local market specialists.",
    de: "Saint-Tropez ist eines der ikonischsten Reiseziele des Departements Var, strukturiert um das historische Dorf, die Halbinsel (Pampelonne, Ramatuelle) und Wohngemeinden (Capon, Salins, Citadelle). Der Markt ist ultra-saisonal und international, dominiert von Trophy Assets: Villen mit Pool und Meerzugang, Prestige-Immobilien auf 1–3 Hektar Grundstück. Preise: 12.000 bis 60.000 €/m² je nach Lage, Grundstück und Seltenheit. Transaktionen erfolgen überwiegend off-market unter vertraglicher NDA. MAPA Property agiert als internationaler Broker in Partnerschaft mit lokalen Marktspezialisten.",
  },
});

const monaco = buildIntlCity({
  slug: "monaco",
  name: { fr: "Monaco", en: "Monaco", de: "Monaco" },
  country: "FR",
  region: "Principauté",
  priceRange: { floor: 40000, ceiling: 120000 },
  highlights: ["Marché immobilier le plus cher du monde au m²", "Carré d'Or, Larvotto, Monte-Carlo", "Stabilité fiscale (résidence)", "Penthouses, vues mer, sécurité"],
  description: {
    fr: "Monaco affiche les prix immobiliers les plus élevés du monde au mètre carré, conséquence directe de la rareté du foncier (2 km² seulement) et du statut fiscal de la Principauté pour les résidents non-français. Les prix s'étalent de 40 000 à 120 000 €/m² selon le micro-quartier (Carré d'Or, Larvotto, Monte-Carlo, Fontvieille, La Condamine, Saint-Roman) et la qualité du bien. Les penthouses avec vue mer panoramique sur le Larvotto ou la Tour Odéon dépassent fréquemment 100 000 €/m². L'achat à Monaco est conditionné à des prérequis (résidence, justificatifs financiers stricts). MAPA Property opère en broker international avec des partenaires monégasques habilités.",
    en: "Monaco shows the world's highest real estate prices per square metre, a direct consequence of land scarcity (only 2 km²) and the Principality's tax status for non-French residents. Prices: €40,000 to €120,000/sqm depending on micro-district (Carré d'Or, Larvotto, Monte-Carlo, Fontvieille, La Condamine, Saint-Roman) and quality. Penthouses with panoramic sea views over Larvotto or Tour Odéon frequently exceed €100,000/sqm. Buying in Monaco is subject to prerequisites (residency, strict financial documentation). MAPA Property operates as international broker with vetted Monégasque partners.",
    de: "Monaco weist die höchsten Immobilienpreise der Welt pro Quadratmeter auf — direkte Folge knappen Baulandes (nur 2 km²) und des Steuerstatus des Fürstentums für Nicht-Franzosen. Preise: 40.000 bis 120.000 €/m² je nach Mikroviertel (Carré d'Or, Larvotto, Monte-Carlo, Fontvieille, La Condamine, Saint-Roman) und Qualität. Penthouses mit Panoramablick auf Larvotto oder Tour Odéon übersteigen häufig 100.000 €/m². Der Kauf in Monaco unterliegt Voraussetzungen (Wohnsitz, strenge Finanznachweise). MAPA Property agiert als internationaler Broker mit geprüften monegassischen Partnern.",
  },
});

const geneve = buildIntlCity({
  slug: "geneve",
  name: { fr: "Genève", en: "Geneva", de: "Genf" },
  country: "CH",
  priceRange: { floor: 14000, ceiling: 35000 },
  highlights: ["Capitale onusienne, banking privé", "Cologny, Vandœuvres, Versoix premium", "Lex Koller régule l'accès non-résident", "Marché étroit, prix élevés"],
  description: {
    fr: "Genève abrite les institutions onusiennes (ONU, OMC, OMS) et un secteur bancaire privé de premier plan. Le marché immobilier y est étroit et cher, avec des prix de 14 000 à 35 000 €/m² selon le quartier (Eaux-Vives, Champel, Cologny, Vandœuvres, Versoix). La Lex Koller (loi fédérale sur l'acquisition d'immeubles par des personnes à l'étranger) restreint l'accès des non-résidents, ce qui rend l'opération plus complexe juridiquement. Les villas avec vue lac à Cologny ou Vandœuvres figurent parmi les biens les plus convoités. MAPA Property opère en broker international avec des partenaires genevois habilités, sous mandat de recherche signé au Luxembourg.",
    en: "Geneva hosts UN institutions (UN, WTO, WHO) and a leading private banking sector. The real estate market is narrow and expensive, prices €14,000 to €35,000/sqm depending on district (Eaux-Vives, Champel, Cologny, Vandœuvres, Versoix). The Lex Koller (federal law on real estate acquisition by foreigners) restricts non-resident access, making the transaction legally more complex. Villas with lake views in Cologny or Vandœuvres are among the most coveted. MAPA Property operates as international broker with vetted Geneva partners, under a search mandate signed in Luxembourg.",
    de: "Genf beherbergt UN-Institutionen (UNO, WTO, WHO) und einen führenden Private-Banking-Sektor. Der Immobilienmarkt ist eng und teuer; Preise von 14.000 bis 35.000 €/m² je nach Viertel (Eaux-Vives, Champel, Cologny, Vandœuvres, Versoix). Die Lex Koller (Bundesgesetz über den Erwerb von Grundstücken durch Personen im Ausland) schränkt den Zugang Nichtansässiger ein und macht die Transaktion rechtlich komplexer. Villen mit Seeblick in Cologny oder Vandœuvres zählen zu den begehrtesten. MAPA Property agiert als internationaler Broker mit geprüften Genfer Partnern, unter einem in Luxemburg unterzeichneten Suchmandat.",
  },
});

const lausanne = buildIntlCity({
  slug: "lausanne",
  name: { fr: "Lausanne", en: "Lausanne", de: "Lausanne" },
  country: "CH",
  priceRange: { floor: 9500, ceiling: 22000 },
  highlights: ["CIO, EPFL, université", "Lavaux UNESCO mitoyen", "Pully, Lutry, Saint-Sulpice premium", "Marché plus large que Genève"],
  description: {
    fr: "Lausanne, sur les rives du Léman, abrite le siège du Comité International Olympique, l'EPFL et l'université. Le marché immobilier y est plus large et liquide qu'à Genève, avec des prix de 9 500 à 22 000 €/m². Les communes périphériques premium — Pully, Lutry, Saint-Sulpice, Cully — abritent des villas et propriétés vue lac très recherchées. La Lex Koller s'applique également (restrictions non-résidents). MAPA Property y intervient en broker international.",
    en: "Lausanne, on the shores of Lake Geneva, hosts the International Olympic Committee, EPFL and the university. The real estate market is broader and more liquid than Geneva, prices €9,500 to €22,000/sqm. Premium peripheral communes — Pully, Lutry, Saint-Sulpice, Cully — host highly sought-after villas and lake-view properties. Lex Koller also applies (non-resident restrictions). MAPA Property acts as international broker.",
    de: "Lausanne am Genfersee beherbergt den Sitz des Internationalen Olympischen Komitees, die EPFL und die Universität. Der Immobilienmarkt ist breiter und liquider als in Genf, Preise von 9.500 bis 22.000 €/m². Premium-Randgemeinden — Pully, Lutry, Saint-Sulpice, Cully — beherbergen sehr gefragte Villen und Seeblick-Immobilien. Die Lex Koller gilt ebenfalls (Beschränkungen für Nichtansässige). MAPA Property agiert als internationaler Broker.",
  },
});

const zurich = buildIntlCity({
  slug: "zurich",
  name: { fr: "Zurich", en: "Zurich", de: "Zürich" },
  country: "CH",
  priceRange: { floor: 13000, ceiling: 30000 },
  highlights: ["Capitale économique de la Suisse", "Banking privé, hub Big Tech (Google EMEA)", "Goldküste (rive nord) premium", "Lex Koller et restrictions cantonales"],
  description: {
    fr: "Zurich est la capitale économique de la Suisse, premier centre bancaire privé du pays et hub Big Tech (Google EMEA, IBM Research). Le marché immobilier y est ultra-tendu, avec des prix de 13 000 à 30 000 €/m². La Goldküste (rive nord du lac : Küsnacht, Erlenbach, Herrliberg) est la zone la plus prisée pour les villas vue lac. La Lex Koller et les restrictions cantonales rendent l'achat par non-résidents complexe et souvent conditionné à un statut professionnel local. MAPA Property opère en broker international.",
    en: "Zurich is Switzerland's economic capital, the country's leading private banking hub and a Big Tech base (Google EMEA, IBM Research). The real estate market is ultra-tight, prices €13,000 to €30,000/sqm. The Goldküste (north shore of the lake: Küsnacht, Erlenbach, Herrliberg) is the most coveted area for lake-view villas. Lex Koller and cantonal restrictions make non-resident purchase complex, often subject to a local professional status. MAPA Property acts as international broker.",
    de: "Zürich ist die Wirtschaftshauptstadt der Schweiz, führender Private-Banking-Standort und Big-Tech-Drehkreuz (Google EMEA, IBM Research). Der Immobilienmarkt ist äußerst angespannt, Preise 13.000 bis 30.000 €/m². Die Goldküste (Nordufer des Sees: Küsnacht, Erlenbach, Herrliberg) ist die begehrteste Zone für Villen mit Seeblick. Lex Koller und kantonale Beschränkungen machen den Kauf durch Nichtansässige komplex und oft an einen lokalen Berufstitel gebunden. MAPA Property agiert als internationaler Broker.",
  },
});

const bruxelles = buildIntlCity({
  slug: "bruxelles",
  name: { fr: "Bruxelles", en: "Brussels", de: "Brüssel" },
  country: "BE",
  priceRange: { floor: 3500, ceiling: 12000 },
  highlights: ["Capitale belge et de l'UE", "Uccle, Ixelles, Châtelain premium", "Marché européen actif", "Maisons de maître XIXᵉ"],
  description: {
    fr: "Bruxelles, capitale belge et siège des institutions européennes, présente un marché immobilier moins tendu et plus accessible que Luxembourg-Ville ou Paris. Les communes premium — Uccle, Ixelles (Châtelain, Flagey), Saint-Gilles — affichent des prix de 6 000 à 12 000 €/m² ; le reste de la ville s'étale de 3 500 à 6 000 €/m². Les maisons de maître du XIXᵉ siècle constituent un segment particulièrement attractif. MAPA Property opère en broker international avec des partenaires bruxellois.",
    en: "Brussels, the Belgian capital and seat of EU institutions, has a less strained and more accessible real estate market than Luxembourg City or Paris. Premium communes — Uccle, Ixelles (Châtelain, Flagey), Saint-Gilles — show prices of €6,000 to €12,000/sqm; the rest of the city ranges from €3,500 to €6,000/sqm. 19th-century townhouses (maisons de maître) are a particularly attractive segment. MAPA Property acts as international broker with Brussels-based partners.",
    de: "Brüssel, belgische Hauptstadt und Sitz der EU-Institutionen, hat einen weniger angespannten und zugänglicheren Immobilienmarkt als Luxemburg-Stadt oder Paris. Premium-Gemeinden — Uccle, Ixelles (Châtelain, Flagey), Saint-Gilles — zeigen Preise von 6.000 bis 12.000 €/m²; der Rest der Stadt reicht von 3.500 bis 6.000 €/m². Stadthäuser des 19. Jahrhunderts (maisons de maître) bilden ein besonders attraktives Segment. MAPA Property agiert als internationaler Broker mit Brüsseler Partnern.",
  },
});

const anvers = buildIntlCity({
  slug: "anvers",
  name: { fr: "Anvers", en: "Antwerp", de: "Antwerpen" },
  country: "BE",
  priceRange: { floor: 2800, ceiling: 8500 },
  highlights: ["Deuxième ville belge, port majeur", "Diamantaires, mode (Dries Van Noten)", "Quartier sud (Het Zuid) gentrifié", "Patrimoine flamand riche"],
  description: {
    fr: "Anvers, deuxième ville de Belgique, abrite le port le plus important de la mer du Nord, le quartier des diamantaires et une scène mode internationale. Le marché immobilier s'étale de 2 800 à 8 500 €/m². Les quartiers Het Zuid (gentrifié), 't Eilandje (reconversion portuaire) et la vieille ville sont les plus recherchés. MAPA Property y opère en broker international.",
    en: "Antwerp, Belgium's second city, hosts the most important North Sea port, the diamond district and an international fashion scene. The real estate market ranges from €2,800 to €8,500/sqm. The most sought-after districts are Het Zuid (gentrified), 't Eilandje (port reconversion) and the old town. MAPA Property acts as international broker.",
    de: "Antwerpen, zweitgrößte Stadt Belgiens, beherbergt den wichtigsten Hafen der Nordsee, das Diamantenviertel und eine internationale Modeszene. Der Immobilienmarkt reicht von 2.800 bis 8.500 €/m². Begehrteste Viertel: Het Zuid (gentrifiziert), 't Eilandje (Hafenumnutzung) und Altstadt. MAPA Property agiert als internationaler Broker.",
  },
});

const amsterdam = buildIntlCity({
  slug: "amsterdam",
  name: { fr: "Amsterdam", en: "Amsterdam", de: "Amsterdam" },
  country: "NL",
  priceRange: { floor: 7500, ceiling: 18000 },
  highlights: ["Capitale néerlandaise, hub financier post-Brexit", "Canaux UNESCO", "Oud-Zuid, Jordaan, Vondelpark", "Pénurie chronique de logement"],
  description: {
    fr: "Amsterdam est la capitale économique néerlandaise et un hub financier renforcé par le post-Brexit (relocations EMA, banques, fonds). Le marché immobilier souffre d'une pénurie chronique, avec des prix de 7 500 à 18 000 €/m² selon le canal et l'arrondissement. Les zones premium incluent Oud-Zuid, Centrum (canaux UNESCO), Jordaan, Zuidas (quartier d'affaires moderne). MAPA Property y intervient en broker international.",
    en: "Amsterdam is the Dutch economic capital and a financial hub reinforced post-Brexit (EMA relocation, banks, funds). The real estate market suffers from chronic supply shortages, prices €7,500 to €18,000/sqm depending on canal and district. Premium areas include Oud-Zuid, Centrum (UNESCO canals), Jordaan, Zuidas (modern business district). MAPA Property acts as international broker.",
    de: "Amsterdam ist die niederländische Wirtschaftshauptstadt und ein durch den Post-Brexit gestärkter Finanzhub (EMA-Verlegung, Banken, Fonds). Der Immobilienmarkt leidet unter chronischer Knappheit, Preise 7.500 bis 18.000 €/m² je nach Gracht und Viertel. Premium-Lagen: Oud-Zuid, Centrum (UNESCO-Grachten), Jordaan, Zuidas (modernes Geschäftsviertel). MAPA Property agiert als internationaler Broker.",
  },
});

const londres = buildIntlCity({
  slug: "londres",
  name: { fr: "Londres", en: "London", de: "London" },
  country: "GB",
  priceRange: { floor: 8000, ceiling: 50000 },
  highlights: ["Mayfair, Belgravia, Knightsbridge, Kensington premium", "Marché global le plus liquide", "Brexit a recentré les flux", "Prime Central London 16k-50k €/m²"],
  description: {
    fr: "Londres demeure le marché global le plus liquide pour les Trophy Assets résidentiels. Le Prime Central London (Mayfair, Belgravia, Knightsbridge, Kensington, Chelsea, Notting Hill) affiche des prix de 16 000 à 50 000 €/m², avec des records sur les superprimes (One Hyde Park, certains squares géorgiens). Le reste de la ville (zones 2 et 3) s'étend de 8 000 à 16 000 €/m². Le Brexit a marginalement recentré les flux mais Londres reste un actif refuge pour les investisseurs internationaux. MAPA Property opère en broker international avec des partenaires londoniens.",
    en: "London remains the most liquid global market for residential Trophy Assets. Prime Central London (Mayfair, Belgravia, Knightsbridge, Kensington, Chelsea, Notting Hill) shows prices of €16,000 to €50,000/sqm, with records on superprime assets (One Hyde Park, certain Georgian squares). The rest of the city (zones 2 and 3) ranges from €8,000 to €16,000/sqm. Brexit marginally redirected flows but London remains a safe haven for international investors. MAPA Property operates as international broker with London partners.",
    de: "London bleibt der liquideste globale Markt für residenzielle Trophy Assets. Prime Central London (Mayfair, Belgravia, Knightsbridge, Kensington, Chelsea, Notting Hill) zeigt Preise von 16.000 bis 50.000 €/m², mit Rekorden bei Superprime-Werten (One Hyde Park, einige georgianische Squares). Der Rest der Stadt (Zonen 2 und 3) reicht von 8.000 bis 16.000 €/m². Der Brexit hat die Flüsse marginal umgelenkt, doch London bleibt ein sicherer Hafen für internationale Investoren. MAPA Property agiert als internationaler Broker mit Londoner Partnern.",
  },
});

const madrid = buildIntlCity({
  slug: "madrid",
  name: { fr: "Madrid", en: "Madrid", de: "Madrid" },
  country: "ES",
  priceRange: { floor: 4000, ceiling: 14000 },
  highlights: ["Capitale espagnole, locomotion économique", "Salamanca, Chamberí, Centro premium", "Marché en hausse, retour des capitaux internationaux"],
  description: {
    fr: "Madrid concentre l'essentiel de l'activité économique espagnole et présente un marché immobilier en croissance soutenue depuis 2015. Les quartiers premium — Salamanca (rue Serrano), Chamberí, Centro, Recoletos, Justicia — affichent des prix de 7 000 à 14 000 €/m². Le reste de la ville s'étale de 4 000 à 7 000 €/m². L'attrait fiscal pour les non-résidents (régime Beckham, retraités) renforce les flux entrants. MAPA Property opère en broker international.",
    en: "Madrid concentrates most of Spain's economic activity and shows a real estate market in sustained growth since 2015. Premium districts — Salamanca (Serrano street), Chamberí, Centro, Recoletos, Justicia — show prices of €7,000 to €14,000/sqm. The rest of the city ranges from €4,000 to €7,000/sqm. The tax appeal for non-residents (Beckham regime, retirees) reinforces inbound flows. MAPA Property acts as international broker.",
    de: "Madrid vereint den Großteil der spanischen Wirtschaftsaktivität und zeigt seit 2015 einen anhaltend wachsenden Immobilienmarkt. Premium-Viertel — Salamanca (Calle Serrano), Chamberí, Centro, Recoletos, Justicia — zeigen Preise von 7.000 bis 14.000 €/m². Der Rest der Stadt reicht von 4.000 bis 7.000 €/m². Der steuerliche Reiz für Nichtansässige (Beckham-Regime, Rentner) verstärkt die Zuflüsse. MAPA Property agiert als internationaler Broker.",
  },
});

const barcelone = buildIntlCity({
  slug: "barcelone",
  name: { fr: "Barcelone", en: "Barcelona", de: "Barcelona" },
  country: "ES",
  priceRange: { floor: 4500, ceiling: 15000 },
  highlights: ["Eixample, Pedralbes, Sarrià premium", "Marché méditerranéen ultra-international", "Modernisme catalan", "Réglementation locative durcie"],
  description: {
    fr: "Barcelone offre un marché immobilier méditerranéen ultra-international, dominé par les Trophy Assets de l'Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi et Diagonal Mar. Les prix s'étalent de 4 500 à 15 000 €/m². L'architecture moderniste catalane (Gaudí, Domènech i Montaner) constitue un segment patrimonial à part. La réglementation locative s'est durcie sur les Airbnb (limitations strictes), ce qui réoriente les flux vers le résidentiel propre. MAPA Property opère en broker international.",
    en: "Barcelona offers an ultra-international Mediterranean market, dominated by Trophy Assets in the Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi and Diagonal Mar. Prices: €4,500 to €15,000/sqm. Catalan Modernist architecture (Gaudí, Domènech i Montaner) constitutes a heritage segment of its own. Rental regulation has tightened on Airbnb (strict limits), redirecting flows to clean residential. MAPA Property acts as international broker.",
    de: "Barcelona bietet einen ultra-internationalen Mittelmeermarkt, dominiert von Trophy Assets im Eixample (Pedrera, Sagrada Família), Pedralbes, Sarrià-Sant Gervasi und Diagonal Mar. Preise: 4.500 bis 15.000 €/m². Die katalanische Modernisme-Architektur (Gaudí, Domènech i Montaner) bildet ein eigenes Erbesegment. Die Mietregulierung wurde bei Airbnb verschärft (strenge Begrenzungen), was die Flüsse auf das reine Wohnen umlenkt. MAPA Property agiert als internationaler Broker.",
  },
});

const lisbonne = buildIntlCity({
  slug: "lisbonne",
  name: { fr: "Lisbonne", en: "Lisbon", de: "Lissabon" },
  country: "PT",
  priceRange: { floor: 3500, ceiling: 11000 },
  highlights: ["Chiado, Príncipe Real, Lapa premium", "Climat, qualité de vie, fiscalité", "Visa Doré (Golden Visa) recadré", "Marché en pleine restructuration"],
  description: {
    fr: "Lisbonne a connu entre 2015 et 2023 une explosion de la demande internationale, portée par le climat, la fiscalité (Régime Résident Non Habituel, Golden Visa) et la qualité de vie. Depuis le recadrage du Golden Visa et la fin partielle du RNH, le marché s'est restructuré. Les quartiers premium — Chiado, Príncipe Real, Lapa, Estrela, Avenida da Liberdade — affichent des prix de 6 000 à 11 000 €/m². Les autres zones de la ville s'étendent de 3 500 à 6 000 €/m². MAPA Property opère en broker international.",
    en: "Lisbon experienced between 2015 and 2023 an explosion of international demand, driven by climate, taxation (Non-Habitual Resident regime, Golden Visa) and quality of life. Since the Golden Visa rework and partial NHR end, the market has restructured. Premium districts — Chiado, Príncipe Real, Lapa, Estrela, Avenida da Liberdade — show prices of €6,000 to €11,000/sqm. Other areas of the city range from €3,500 to €6,000/sqm. MAPA Property acts as international broker.",
    de: "Lissabon erlebte zwischen 2015 und 2023 eine Explosion internationaler Nachfrage, getragen von Klima, Besteuerung (Nicht-Habitueller-Resident-Regime, Goldenes Visum) und Lebensqualität. Seit der Überarbeitung des Goldenen Visums und dem teilweisen Ende des NHR hat sich der Markt umstrukturiert. Premium-Viertel — Chiado, Príncipe Real, Lapa, Estrela, Avenida da Liberdade — zeigen Preise von 6.000 bis 11.000 €/m². Andere Gebiete der Stadt reichen von 3.500 bis 6.000 €/m². MAPA Property agiert als internationaler Broker.",
  },
});

const porto = buildIntlCity({
  slug: "porto",
  name: { fr: "Porto", en: "Porto", de: "Porto" },
  country: "PT",
  priceRange: { floor: 2800, ceiling: 8500 },
  highlights: ["Deuxième ville portugaise", "Foz do Douro, Boavista, Centro UNESCO", "Marché plus accessible que Lisbonne", "Patrimoine et caves de Porto"],
  description: {
    fr: "Porto, deuxième ville du Portugal, présente un marché plus accessible que Lisbonne, avec des prix de 2 800 à 8 500 €/m². Les quartiers premium — Foz do Douro (front de mer), Boavista, Centro Histórico (UNESCO) — concentrent la valeur. La ville bénéficie d'un patrimoine UNESCO, des caves de Porto sur la rive de Vila Nova de Gaia, et d'un dynamisme culturel marqué (Casa da Música, Serralves). MAPA Property opère en broker international.",
    en: "Porto, Portugal's second city, presents a more accessible market than Lisbon, prices €2,800 to €8,500/sqm. Premium districts — Foz do Douro (seafront), Boavista, Centro Histórico (UNESCO) — concentrate value. The city benefits from UNESCO heritage, the port wine cellars across Vila Nova de Gaia and a strong cultural dynamism (Casa da Música, Serralves). MAPA Property acts as international broker.",
    de: "Porto, Portugals zweitgrößte Stadt, bietet einen zugänglicheren Markt als Lissabon, Preise 2.800 bis 8.500 €/m². Premium-Viertel — Foz do Douro (Meerfront), Boavista, Centro Histórico (UNESCO) — konzentrieren den Wert. Die Stadt profitiert von UNESCO-Erbe, den Portweinkellern auf der Seite Vila Nova de Gaia und ausgeprägter kultureller Dynamik (Casa da Música, Serralves). MAPA Property agiert als internationaler Broker.",
  },
});

const rome = buildIntlCity({
  slug: "rome",
  name: { fr: "Rome", en: "Rome", de: "Rom" },
  country: "IT",
  priceRange: { floor: 4500, ceiling: 18000 },
  highlights: ["Capitale italienne, patrimoine UNESCO", "Centro storico, Parioli, Aventino premium", "Marché conservateur, biens rares"],
  description: {
    fr: "Rome, capitale italienne, présente un marché immobilier conservateur, dominé par les biens patrimoniaux. Les quartiers premium — Centro storico, Parioli, Aventino, Trastevere, Prati — affichent des prix de 8 000 à 18 000 €/m². Le reste de la ville s'étale de 4 500 à 8 000 €/m². Les contraintes patrimoniales (zones UNESCO, monuments protégés) limitent les rénovations possibles. MAPA Property opère en broker international.",
    en: "Rome, the Italian capital, presents a conservative real estate market dominated by heritage properties. Premium districts — Centro storico, Parioli, Aventino, Trastevere, Prati — show prices of €8,000 to €18,000/sqm. The rest of the city ranges from €4,500 to €8,000/sqm. Heritage constraints (UNESCO zones, protected monuments) limit renovation possibilities. MAPA Property acts as international broker.",
    de: "Rom, italienische Hauptstadt, bietet einen konservativen Immobilienmarkt, dominiert von Erbeobjekten. Premium-Viertel — Centro storico, Parioli, Aventino, Trastevere, Prati — zeigen Preise von 8.000 bis 18.000 €/m². Der Rest der Stadt reicht von 4.500 bis 8.000 €/m². Erbeauflagen (UNESCO-Zonen, geschützte Denkmäler) begrenzen Sanierungsmöglichkeiten. MAPA Property agiert als internationaler Broker.",
  },
});

const milan = buildIntlCity({
  slug: "milan",
  name: { fr: "Milan", en: "Milan", de: "Mailand" },
  country: "IT",
  priceRange: { floor: 5500, ceiling: 22000 },
  highlights: ["Capitale économique italienne", "Quadrilatero della Moda, Brera, CityLife", "Marché en croissance forte", "Mode, finance, design"],
  description: {
    fr: "Milan est la capitale économique italienne, premier centre financier et siège de l'industrie de la mode et du design. Le marché immobilier y est en croissance forte, avec des prix de 5 500 à 22 000 €/m². Les quartiers premium — Quadrilatero della Moda, Brera, Porta Nuova, CityLife (gratte-ciel récents), Magenta-San Vittore — concentrent les Trophy Assets. MAPA Property opère en broker international.",
    en: "Milan is Italy's economic capital, the leading financial centre and seat of the fashion and design industry. The real estate market is in strong growth, prices €5,500 to €22,000/sqm. Premium districts — Quadrilatero della Moda, Brera, Porta Nuova, CityLife (recent skyscrapers), Magenta-San Vittore — concentrate Trophy Assets. MAPA Property acts as international broker.",
    de: "Mailand ist Italiens Wirtschaftshauptstadt, führender Finanzplatz und Sitz der Mode- und Designindustrie. Der Immobilienmarkt wächst stark, Preise 5.500 bis 22.000 €/m². Premium-Viertel — Quadrilatero della Moda, Brera, Porta Nuova, CityLife (jüngere Hochhäuser), Magenta-San Vittore — konzentrieren Trophy Assets. MAPA Property agiert als internationaler Broker.",
  },
});

const florence = buildIntlCity({
  slug: "florence",
  name: { fr: "Florence", en: "Florence", de: "Florenz" },
  country: "IT",
  region: "Toscane",
  priceRange: { floor: 4500, ceiling: 14000 },
  highlights: ["Patrimoine Renaissance UNESCO", "Centro storico, Oltrarno premium", "Toscane résidentielle (villas, fattorie)", "Marché conservateur"],
  description: {
    fr: "Florence concentre l'un des patrimoines artistiques les plus denses du monde (Renaissance, UNESCO). Le marché immobilier y est étroit et conservateur, avec des prix de 4 500 à 14 000 €/m² selon le quartier (Centro storico, Oltrarno, Campo di Marte, San Frediano). La Toscane résidentielle — villas, fattorie, propriétés viticoles dans le Chianti — constitue un segment international à part. MAPA Property opère en broker international.",
    en: "Florence concentrates one of the world's densest artistic heritages (Renaissance, UNESCO). The real estate market is narrow and conservative, prices €4,500 to €14,000/sqm depending on district (Centro storico, Oltrarno, Campo di Marte, San Frediano). Residential Tuscany — villas, fattorie, wine properties in Chianti — constitutes an international segment of its own. MAPA Property acts as international broker.",
    de: "Florenz vereint eines der dichtesten Kulturerben der Welt (Renaissance, UNESCO). Der Immobilienmarkt ist eng und konservativ, Preise 4.500 bis 14.000 €/m² je nach Viertel (Centro storico, Oltrarno, Campo di Marte, San Frediano). Das residenzielle Toskana — Villen, fattorie, Weingüter im Chianti — bildet ein eigenes internationales Segment. MAPA Property agiert als internationaler Broker.",
  },
});

const vienne = buildIntlCity({
  slug: "vienne",
  name: { fr: "Vienne", en: "Vienna", de: "Wien" },
  country: "AT",
  priceRange: { floor: 5000, ceiling: 16000 },
  highlights: ["Capitale autrichienne, qualité de vie n°1 mondiale", "1ᵉʳ arrondissement (InnereStadt), 19ᵉ Döbling", "Marché stable, fiscalité claire"],
  description: {
    fr: "Vienne, capitale autrichienne, est régulièrement classée première ville du monde en qualité de vie (Mercer, Economist). Le marché immobilier y est stable, avec des prix de 5 000 à 16 000 €/m². Le 1ᵉʳ arrondissement (InnereStadt, UNESCO) et le 19ᵉ (Döbling, vignobles) concentrent la valeur. MAPA Property opère en broker international avec des partenaires viennois.",
    en: "Vienna, the Austrian capital, regularly ranks as the world's top city for quality of life (Mercer, Economist). The real estate market is stable, prices €5,000 to €16,000/sqm. The 1st district (InnereStadt, UNESCO) and the 19th (Döbling, vineyards) concentrate value. MAPA Property acts as international broker with Vienna partners.",
    de: "Wien, österreichische Hauptstadt, wird regelmäßig als beste Stadt der Welt für Lebensqualität eingestuft (Mercer, Economist). Der Immobilienmarkt ist stabil, Preise 5.000 bis 16.000 €/m². Der 1. Bezirk (Innere Stadt, UNESCO) und der 19. (Döbling, Weinberge) konzentrieren den Wert. MAPA Property agiert als internationaler Broker mit Wiener Partnern.",
  },
});

const berlin = buildIntlCity({
  slug: "berlin",
  name: { fr: "Berlin", en: "Berlin", de: "Berlin" },
  country: "DE",
  priceRange: { floor: 4500, ceiling: 14000 },
  highlights: ["Capitale allemande, scène culturelle", "Mitte, Charlottenburg, Prenzlauer Berg", "Mietendeckel et régulations strictes", "Marché en mutation"],
  description: {
    fr: "Berlin, capitale allemande, présente un marché immobilier en mutation depuis 2015. Les quartiers premium — Mitte, Charlottenburg-Wilmersdorf, Prenzlauer Berg, Kreuzberg — affichent des prix de 7 000 à 14 000 €/m². Le reste de la ville s'étale de 4 500 à 7 000 €/m². La régulation locative (Mietendeckel partiellement annulé, encadrement des loyers) reste un point de vigilance pour l'investisseur. MAPA Property opère en broker international.",
    en: "Berlin, the German capital, presents a market in transition since 2015. Premium districts — Mitte, Charlottenburg-Wilmersdorf, Prenzlauer Berg, Kreuzberg — show prices of €7,000 to €14,000/sqm. The rest of the city ranges from €4,500 to €7,000/sqm. Rental regulation (Mietendeckel partly overturned, rent caps) remains a point of vigilance for investors. MAPA Property acts as international broker.",
    de: "Berlin, deutsche Hauptstadt, zeigt seit 2015 einen Markt im Wandel. Premium-Viertel — Mitte, Charlottenburg-Wilmersdorf, Prenzlauer Berg, Kreuzberg — zeigen Preise von 7.000 bis 14.000 €/m². Der Rest der Stadt reicht von 4.500 bis 7.000 €/m². Mietregulierung (Mietendeckel teilweise gekippt, Mietpreisbremse) bleibt ein Wachsamkeitspunkt für Investoren. MAPA Property agiert als internationaler Broker.",
  },
});

const munich = buildIntlCity({
  slug: "munich",
  name: { fr: "Munich", en: "Munich", de: "München" },
  country: "DE",
  priceRange: { floor: 9000, ceiling: 22000 },
  highlights: ["Première ville allemande en prix", "Schwabing, Bogenhausen, Lehel premium", "BMW, Allianz, Siemens", "Marché ultra-tendu"],
  description: {
    fr: "Munich est la première ville allemande en prix immobiliers, conséquence de son tissu économique dense (BMW, Allianz, Siemens, MunichRe). Le marché s'étale de 9 000 à 22 000 €/m². Les quartiers premium — Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt — concentrent la valeur. La pénurie de logements y est chronique. MAPA Property opère en broker international.",
    en: "Munich has Germany's highest real estate prices, a consequence of its dense economic fabric (BMW, Allianz, Siemens, MunichRe). Market: €9,000 to €22,000/sqm. Premium districts — Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt — concentrate value. Housing shortage is chronic. MAPA Property acts as international broker.",
    de: "München hat die höchsten Immobilienpreise Deutschlands — Folge des dichten Wirtschaftsgefüges (BMW, Allianz, Siemens, MunichRe). Markt: 9.000 bis 22.000 €/m². Premium-Viertel — Schwabing, Bogenhausen, Lehel, Altstadt, Maxvorstadt — konzentrieren den Wert. Wohnungsknappheit ist chronisch. MAPA Property agiert als internationaler Broker.",
  },
});

const francfort = buildIntlCity({
  slug: "francfort",
  name: { fr: "Francfort", en: "Frankfurt", de: "Frankfurt am Main" },
  country: "DE",
  priceRange: { floor: 5500, ceiling: 14000 },
  highlights: ["Capitale financière allemande", "BCE, Bundesbank, banques", "Westend, Sachsenhausen, Bornheim", "Hub aérien européen majeur"],
  description: {
    fr: "Francfort est la capitale financière allemande, siège de la Banque Centrale Européenne et de la Bundesbank. Le marché immobilier y est dynamique, avec des prix de 5 500 à 14 000 €/m². Les quartiers premium — Westend, Sachsenhausen, Bornheim, Nordend — concentrent la demande. Le hub aérien (Frankfurt Airport, premier d'Allemagne) renforce l'attractivité internationale. MAPA Property opère en broker international.",
    en: "Frankfurt is the German financial capital, seat of the European Central Bank and Bundesbank. The market is dynamic, prices €5,500 to €14,000/sqm. Premium districts — Westend, Sachsenhausen, Bornheim, Nordend — concentrate demand. The airline hub (Frankfurt Airport, Germany's largest) reinforces international appeal. MAPA Property acts as international broker.",
    de: "Frankfurt ist Deutschlands Finanzhauptstadt, Sitz der Europäischen Zentralbank und der Bundesbank. Der Markt ist dynamisch, Preise 5.500 bis 14.000 €/m². Premium-Viertel — Westend, Sachsenhausen, Bornheim, Nordend — konzentrieren die Nachfrage. Das Luftfahrtdrehkreuz (Frankfurt Airport, größter Deutschlands) stärkt die internationale Anziehungskraft. MAPA Property agiert als internationaler Broker.",
  },
});

const hambourg = buildIntlCity({
  slug: "hambourg",
  name: { fr: "Hambourg", en: "Hamburg", de: "Hamburg" },
  country: "DE",
  priceRange: { floor: 4500, ceiling: 13000 },
  highlights: ["Deuxième ville allemande, port majeur", "HafenCity, Eppendorf, Blankenese premium", "Médias, commerce, logistique"],
  description: {
    fr: "Hambourg, deuxième ville allemande, abrite le plus grand port d'Allemagne et un tissu économique fort (médias, commerce, logistique, aéronautique). Le marché immobilier s'étale de 4 500 à 13 000 €/m². Les quartiers premium — HafenCity (reconversion portuaire), Eppendorf, Blankenese (villas vue Elbe) — concentrent la valeur. MAPA Property opère en broker international.",
    en: "Hamburg, Germany's second city, hosts the country's largest port and a strong economic fabric (media, trade, logistics, aerospace). The real estate market ranges from €4,500 to €13,000/sqm. Premium districts — HafenCity (port reconversion), Eppendorf, Blankenese (villas with Elbe views) — concentrate value. MAPA Property acts as international broker.",
    de: "Hamburg, zweitgrößte Stadt Deutschlands, beherbergt den größten Hafen Deutschlands und ein starkes Wirtschaftsgefüge (Medien, Handel, Logistik, Luftfahrt). Der Immobilienmarkt reicht von 4.500 bis 13.000 €/m². Premium-Viertel — HafenCity (Hafenumnutzung), Eppendorf, Blankenese (Villen mit Elbblick) — konzentrieren den Wert. MAPA Property agiert als internationaler Broker.",
  },
});

const dubai = buildIntlCity({
  slug: "dubai",
  name: { fr: "Dubaï", en: "Dubai", de: "Dubai" },
  country: "AE",
  priceRange: { floor: 4500, ceiling: 30000 },
  highlights: ["Émirats Arabes Unis, hub global", "Palm Jumeirah, Downtown, DIFC, Emirates Hills", "Pas d'IR, fiscalité avantageuse résidence", "Marché ultra-international"],
  description: {
    fr: "Dubaï est l'un des marchés immobiliers les plus internationaux et liquides du monde, structuré autour de zones distinctes : Palm Jumeirah (villas et penthouses sur l'archipel artificiel), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (financier), Emirates Hills (villas haut de gamme), Arabian Ranches, Dubai Marina, Bluewaters. Les prix s'étalent de 4 500 à 30 000 €/m² selon l'emplacement, avec des records pour les villas Palm Jumeirah Frond. L'absence d'impôt sur le revenu et un cadre réglementaire pro-investisseur en font un marché refuge. MAPA Property opère en broker international avec des partenaires habilités RERA.",
    en: "Dubai is one of the world's most international and liquid real estate markets, structured around distinct zones: Palm Jumeirah (villas and penthouses on the artificial archipelago), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (financial), Emirates Hills (high-end villas), Arabian Ranches, Dubai Marina, Bluewaters. Prices: €4,500 to €30,000/sqm depending on location, with records for Palm Jumeirah Frond villas. Absence of income tax and a pro-investor regulatory framework make it a safe haven. MAPA Property acts as international broker with RERA-licensed partners.",
    de: "Dubai ist einer der internationalsten und liquidesten Immobilienmärkte der Welt, strukturiert um eigenständige Zonen: Palm Jumeirah (Villen und Penthouses auf dem künstlichen Archipel), Downtown Dubai (Burj Khalifa, Dubai Mall), DIFC (Finanzplatz), Emirates Hills (gehobene Villen), Arabian Ranches, Dubai Marina, Bluewaters. Preise: 4.500 bis 30.000 €/m² je nach Lage, Rekorde bei Palm-Jumeirah-Frond-Villen. Fehlende Einkommensteuer und ein investorenfreundlicher Rechtsrahmen machen Dubai zu einem sicheren Hafen. MAPA Property agiert als internationaler Broker mit RERA-lizenzierten Partnern.",
  },
});

const newYork = buildIntlCity({
  slug: "new-york",
  name: { fr: "New York", en: "New York", de: "New York" },
  country: "US",
  priceRange: { floor: 12000, ceiling: 60000 },
  highlights: ["Manhattan : Tribeca, SoHo, Upper East/West Side", "Brooklyn : Williamsburg, DUMBO", "Marché global premium", "Coopératives, condominiums, brownstones"],
  description: {
    fr: "New York demeure l'un des marchés immobiliers les plus iconiques au monde, structuré autour de Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) et de quelques zones du Queens (Long Island City). Les prix à Manhattan s'étalent de 12 000 à 60 000 €/m² (en USD/sqft équivalent), avec des superprimes (One57, 432 Park, 220 Central Park South) bien au-delà. Le marché distingue trois segments structurels : coopératives (avec board approval), condominiums (plus souples pour étrangers), brownstones (maisons de ville historiques). MAPA Property opère en broker international avec des partenaires NY licenciés.",
    en: "New York remains one of the world's most iconic real estate markets, structured around Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) and parts of Queens (Long Island City). Manhattan prices range from €12,000 to €60,000/sqm equivalent, with superprime assets (One57, 432 Park, 220 Central Park South) well above. The market distinguishes three structural segments: cooperatives (with board approval), condominiums (more foreigner-friendly), brownstones (historic townhouses). MAPA Property acts as international broker with NY-licensed partners.",
    de: "New York bleibt einer der ikonischsten Immobilienmärkte der Welt, strukturiert um Manhattan (Tribeca, SoHo, Upper East Side, Upper West Side, Greenwich Village, West Village), Brooklyn (Williamsburg, DUMBO, Brooklyn Heights, Park Slope) und Teile von Queens (Long Island City). Manhattan-Preise: 12.000 bis 60.000 €/m²-Äquivalent, Superprime-Werte (One57, 432 Park, 220 Central Park South) deutlich darüber. Der Markt unterscheidet drei strukturelle Segmente: Cooperatives (mit Board Approval), Condominiums (ausländerfreundlicher), Brownstones (historische Stadthäuser). MAPA Property agiert als internationaler Broker mit NY-lizenzierten Partnern.",
  },
});

const miami = buildIntlCity({
  slug: "miami",
  name: { fr: "Miami", en: "Miami", de: "Miami" },
  country: "US",
  priceRange: { floor: 4500, ceiling: 25000 },
  highlights: ["South Beach, Miami Beach, Brickell premium", "Hub Latin America", "Tax appeal Florida (no state income tax)", "Marché ultra-international"],
  description: {
    fr: "Miami est devenue depuis 2020 l'un des marchés immobiliers les plus dynamiques d'Amérique du Nord, porté par les flux entrants depuis New York, San Francisco et l'Amérique latine. Les zones premium — South Beach, Miami Beach (Star Island, Indian Creek), Brickell, Coconut Grove, Coral Gables, Bal Harbour, Sunny Isles — affichent des prix de 8 000 à 25 000 €/m². Le reste s'étend de 4 500 à 8 000 €/m². L'absence d'impôt d'État (Florida) renforce l'attractivité. MAPA Property opère en broker international avec des partenaires Miami licenciés.",
    en: "Miami has become since 2020 one of North America's most dynamic real estate markets, driven by inflows from New York, San Francisco and Latin America. Premium areas — South Beach, Miami Beach (Star Island, Indian Creek), Brickell, Coconut Grove, Coral Gables, Bal Harbour, Sunny Isles — show prices of €8,000 to €25,000/sqm. The rest ranges from €4,500 to €8,000/sqm. The absence of state income tax (Florida) reinforces appeal. MAPA Property acts as international broker with Miami-licensed partners.",
    de: "Miami ist seit 2020 einer der dynamischsten Immobilienmärkte Nordamerikas geworden — getragen von Zuflüssen aus New York, San Francisco und Lateinamerika. Premium-Zonen — South Beach, Miami Beach (Star Island, Indian Creek), Brickell, Coconut Grove, Coral Gables, Bal Harbour, Sunny Isles — zeigen Preise von 8.000 bis 25.000 €/m². Der Rest reicht von 4.500 bis 8.000 €/m². Das Fehlen einer staatlichen Einkommensteuer (Florida) verstärkt die Attraktivität. MAPA Property agiert als internationaler Broker mit Miami-lizenzierten Partnern.",
  },
});

const saintBarthelemy = buildIntlCity({
  slug: "saint-barthelemy",
  name: { fr: "Saint-Barthélemy", en: "Saint-Barthélemy", de: "Saint-Barthélemy" },
  country: "FR",
  region: "Antilles",
  priceRange: { floor: 18000, ceiling: 80000 },
  highlights: ["Antilles françaises, marché ultra-confidentiel", "Villas Gustavia, Saint-Jean, Lurin", "Trophy Assets quasi-systématiques", "Off-market dominant"],
  description: {
    fr: "Saint-Barthélemy (Saint-Barth) est l'une des destinations résidentielles les plus exclusives des Caraïbes, dominée par les Trophy Assets : villas avec accès mer, propriétés sur les hauteurs (Lurin, Gouverneur, Saint-Jean) et front de mer rare (Gustavia). Le marché est ultra-confidentiel, dominé par les transactions off-market sous NDA contractuel. Les prix s'étalent de 18 000 à 80 000 €/m² selon l'exposition, le terrain et la rareté. MAPA Property opère en broker international avec des partenaires antillais habilités, sous mandat de recherche signé au Luxembourg.",
    en: "Saint-Barthélemy (Saint-Barth) is one of the Caribbean's most exclusive residential destinations, dominated by Trophy Assets: villas with sea access, properties on the heights (Lurin, Gouverneur, Saint-Jean) and rare seafront (Gustavia). The market is ultra-confidential, dominated by off-market transactions under contractual NDA. Prices: €18,000 to €80,000/sqm depending on exposure, land and rarity. MAPA Property acts as international broker with vetted Caribbean partners, under a search mandate signed in Luxembourg.",
    de: "Saint-Barthélemy (Saint-Barth) ist eines der exklusivsten Wohnziele der Karibik, dominiert von Trophy Assets: Villen mit Meerzugang, Immobilien auf den Höhen (Lurin, Gouverneur, Saint-Jean) und seltene Meerfront (Gustavia). Der Markt ist ultra-vertraulich, dominiert von Off-Market-Transaktionen unter vertraglicher NDA. Preise: 18.000 bis 80.000 €/m² je nach Lage, Grundstück und Seltenheit. MAPA Property agiert als internationaler Broker mit geprüften karibischen Partnern, unter einem in Luxemburg unterzeichneten Suchmandat.",
  },
});

// ============================================================================
// EXPORT
// ============================================================================

export const cities: City[] = [
  // 24 Luxembourg
  luxembourgVille, belair, limpertsberg, bonnevoie, cents, cessange, clausen, eich,
  gasperich, grund, hamm, hollerich, kirchberg, merl, neudorf, pfaffenthal,
  weimerskirch, eschSurAlzette, differdange, dudelange, mamer, strassen, bertrange, walferdange,
  // 28 international
  paris, cannes, nice, saintTropez, monaco, geneve, lausanne, zurich,
  bruxelles, anvers, amsterdam, londres, madrid, barcelone, lisbonne, porto,
  rome, milan, florence, vienne, berlin, munich, francfort, hambourg,
  dubai, newYork, miami, saintBarthelemy,
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

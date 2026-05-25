process.env.TSX_RUNNING = "1";
const { estimate } = await import(
  "/Users/julienbrebion/Projects-Claude/mapa-property-nextjs/lib/estimation/engine.ts"
);

function show(label, inp, targetLow, targetHigh) {
  const r = estimate(inp);
  if (r.error) {
    const pass =
      label.startsWith("12") ||
      label.startsWith("13") ||
      label.startsWith("14");
    const status = pass ? "PASS" : "FAIL";
    console.log(`[${status}] ${label} => ${r.error}`);
    return;
  }
  const c = r.client_output;
  const inRange = c.price_mid >= targetLow && c.price_mid <= targetHigh;
  const status = inRange ? "PASS" : "FAIL";
  const ecart = (
    ((c.price_mid - (targetLow + targetHigh) / 2) /
      ((targetLow + targetHigh) / 2)) *
    100
  ).toFixed(1);
  console.log(
    `[${status}] ${label}  mid=${c.price_mid}  ` +
      `cible=[${targetLow}-${targetHigh}]  écart=${ecart}%`,
  );
}

// ============ CAS HISTORIQUES (non-régression) ============
show(
  "C1 Belair 95 C good",
  {
    type: "appartement",
    commune: "Luxembourg",
    quartier: "Belair",
    surfaceLiving: 95,
    bedrooms: 2,
    yearBuilt: 2005,
    state: "good",
    energy: "C",
    floor: 3,
    totalFloors: 5,
    lift: true,
    parkingInterior: 1,
  },
  1069000,
  1243000,
);

show(
  "C2 Strassen maison 200m² + 600 terrain",
  {
    type: "maison",
    commune: "Strassen",
    surfaceLiving: 200,
    surfaceLand: 600,
    bedrooms: 4,
    yearBuilt: 2010,
    state: "renovated",
    energy: "B",
    parkingInterior: 1,
    parkingExterior: 1,
  },
  1739000,
  2022000,
);

show(
  "C3 Penthouse Gare 120m² new A++",
  {
    type: "penthouse",
    commune: "Luxembourg",
    quartier: "Gare",
    surfaceLiving: 120,
    bedrooms: 3,
    yearBuilt: 2025,
    state: "new",
    energy: "A++",
    floor: 7,
    totalFloors: 7,
    lift: true,
    terrace: 30,
    exposureSouth: true,
    parkingInterior: 1,
  },
  1094000,
  1272000,
);

show(
  "C5 Esch appart 85m² good C",
  {
    type: "appartement",
    commune: "Esch-sur-Alzette",
    surfaceLiving: 85,
    state: "good",
    energy: "C",
  },
  492000,
  573000,
);

// ============ CAS POL3-6 NOUVEAUX ============
show(
  "7V2 Steinfort 115m² + 8 balc + 2 park int + 2002 E good + travaux",
  {
    country: "LU",
    type: "appartement",
    commune: "Steinfort",
    surfaceLiving: 115,
    terrace: 8,
    bedrooms: 2,
    yearBuilt: 2002,
    state: "good",
    energy: "E",
    parkingInterior: 2,
    parkingExterior: 0,
    works: [
      { category: "toiture", year: 2020, amount: 30000 },
      { category: "peinture", year: 2020, amount: 5000 },
    ],
  },
  678000,
  788000,
);

show(
  "8 Belair neuf 100m² A 1 park int",
  {
    country: "LU",
    type: "appartement",
    commune: "Luxembourg",
    quartier: "Belair",
    surfaceLiving: 100,
    yearBuilt: 2024,
    state: "new",
    energy: "A",
    parkingInterior: 1,
  },
  1229000,
  1429000,
);

show(
  "9 Bertrange maison 200m² + 800 terrain + 2 park int + cuisine",
  {
    country: "LU",
    type: "maison",
    commune: "Bertrange",
    surfaceLiving: 200,
    surfaceLand: 800,
    parkingInterior: 2,
    yearBuilt: 2010,
    state: "good",
    energy: "C",
    works: [{ category: "cuisine", year: 2022, amount: 25000 }],
  },
  1699000,
  1975000,
);

// Sprint C7 — recalibration range (yearCoef supprime, le bati 1985-1995
// n'est plus decote mecaniquement, le bien vaut son prix/m² Esch sans
// penalite age — la condition='good' est ce que l'utilisateur declare).
show(
  "10 Esch appart 80m² D + peinture",
  {
    country: "LU",
    type: "appartement",
    commune: "Esch-sur-Alzette",
    surfaceLiving: 80,
    yearBuilt: 1995,
    state: "good",
    energy: "D",
    works: [{ category: "peinture", year: 2024, amount: 0 }],
  },
  471000,
  548000,
);

show(
  "11 Kopstal maison 250m² + 700 terrain + piscine + 2 park ext",
  {
    country: "LU",
    type: "maison",
    commune: "Kopstal",
    surfaceLiving: 250,
    surfaceLand: 700,
    parkingExterior: 2,
    yearBuilt: 2015,
    state: "good",
    energy: "B",
    works: [{ category: "piscine", year: 2023, amount: 0 }],
  },
  1600000,
  1860000,
);

show(
  "11b Kopstal maison 250m² + 700 terrain SANS piscine + 2 park ext",
  {
    country: "LU",
    type: "maison",
    commune: "Kopstal",
    surfaceLiving: 250,
    surfaceLand: 700,
    parkingExterior: 2,
    yearBuilt: 2015,
    state: "good",
    energy: "B",
  },
  1391000,
  1617000,
);

// ============ GARDE-FOU INTERNATIONAL ============
show("12 Dubai", {
  country: "AE",
  type: "appartement",
  commune: "Dubai",
  surfaceLiving: 100,
  state: "good",
});
show("13 Monaco", {
  country: "MC",
  type: "appartement",
  commune: "Monaco",
  surfaceLiving: 100,
  state: "good",
});
show("14 Paris", {
  country: "FR",
  type: "appartement",
  commune: "Paris",
  surfaceLiving: 100,
  state: "good",
});

// ============ SPRINT C7 — VALIDATION TERRAIN (3 ventes reelles Julien) ============
// Calibration validee par Julien sur 3 ventes reelles ±10% Observatoire.

show(
  "C7_A Steinfort 83m² G good 1 park int (vendu 640k)",
  {
    country: "LU",
    type: "appartement",
    commune: "Steinfort",
    surfaceLiving: 83,
    state: "good",
    energy: "G",
    floorType: "middle",
    atypicalType: "standard",
    parkingIndoor: 1,
  },
  574000,
  668000,
);

show(
  "C7_B Hesperange 80m² H fair 1 park int + cave (vendu 550k)",
  {
    country: "LU",
    type: "appartement",
    commune: "Hesperange",
    surfaceLiving: 80,
    state: "good",
    condition: "fair",
    energy: "H",
    floorType: "middle",
    atypicalType: "standard",
    parkingIndoor: 1,
    cellar: true,
    balconyArea: 4,
  },
  556000,
  647000,
);

show(
  "C7_C Steinfort duplex 115m² E fair 2 park int + cave (marche 720k)",
  {
    country: "LU",
    type: "duplex",
    commune: "Steinfort",
    surfaceLiving: 115,
    state: "good",
    condition: "fair",
    energy: "E",
    floorType: "middle",
    atypicalType: "duplex",
    parkingIndoor: 2,
    cellar: true,
    balconyArea: 4,
  },
  679000,
  790000,
);

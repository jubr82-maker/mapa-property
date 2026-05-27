#!/usr/bin/env node
/**
 * Tests unitaires lib/geo/luxembourg-communes.ts (Sprint C13-bis C3).
 * Lancement : pnpm test:geo (re-spawn via tsx).
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

if (!process.env.__TSX__) {
  const r = spawnSync(
    "npx",
    ["tsx", join(__dirname, "test-luxembourg-communes.mjs")],
    { stdio: "inherit", cwd: root, env: { ...process.env, __TSX__: "1" } },
  );
  process.exit(r.status ?? 1);
}

const { LOCALITIES, haversineKm, getLocalityCoords } = await import(
  join(root, "lib", "geo", "luxembourg-communes.ts")
);

let n = 0;
const ok = (m) => {
  n++;
  console.log(`  ✅ ${m}`);
};

// ─── haversineKm — formule géodésique ───
// Distances reelles connues (verifiees Google Maps, ±2 km tolerance):
// Luxembourg-Ville (49.6098, 6.1326) <-> Esch-sur-Alzette (49.4969, 5.9806) ≈ 18 km
const lux = getLocalityCoords("Luxembourg");
assert.ok(lux, "Luxembourg trouve");
ok("Luxembourg trouvé dans la table");
assert.ok(Math.abs(lux.lat - 49.61) < 0.01, "lat Luxembourg ≈ 49.61");
ok(`Luxembourg lat=${lux.lat.toFixed(4)} (≈ 49.61)`);

const esch = getLocalityCoords("Esch-sur-Alzette");
assert.ok(esch, "Esch-sur-Alzette trouve");
const distLuxEsch = haversineKm(lux.lat, lux.lng, esch.lat, esch.lng);
assert.ok(distLuxEsch >= 16 && distLuxEsch <= 20, `distance Lux-Esch ${distLuxEsch.toFixed(1)} km (attendu 16-20)`);
ok(`haversineKm(Luxembourg, Esch-sur-Alzette) ≈ ${distLuxEsch.toFixed(1)} km`);

const steinfort = getLocalityCoords("Steinfort");
assert.ok(steinfort, "Steinfort trouve");
const distLuxStein = haversineKm(lux.lat, lux.lng, steinfort.lat, steinfort.lng);
assert.ok(distLuxStein >= 15 && distLuxStein <= 22, `distance Lux-Steinfort ${distLuxStein.toFixed(1)} km (attendu 15-22)`);
ok(`haversineKm(Luxembourg, Steinfort) ≈ ${distLuxStein.toFixed(1)} km`);

const dudelange = getLocalityCoords("Dudelange");
assert.ok(dudelange, "Dudelange trouve");
const distEschDud = haversineKm(esch.lat, esch.lng, dudelange.lat, dudelange.lng);
assert.ok(distEschDud >= 4 && distEschDud <= 10, `distance Esch-Dudelange ${distEschDud.toFixed(1)} km (attendu 4-10)`);
ok(`haversineKm(Esch-sur-Alzette, Dudelange) ≈ ${distEschDud.toFixed(1)} km`);

// Distance entre 2 points identiques = 0
assert.equal(haversineKm(lux.lat, lux.lng, lux.lat, lux.lng), 0);
ok("haversineKm(P, P) = 0");

// ─── getLocalityCoords — lookup cascade ───

// Case + accents
assert.ok(getLocalityCoords("STEINFORT"), "STEINFORT (uppercase) trouve");
ok("STEINFORT (uppercase) → match");
assert.ok(getLocalityCoords("steinfort"), "steinfort (lowercase) trouve");
ok("steinfort (lowercase) → match");

// Match prefix : "Luxembourg" doit retourner Luxembourg-Ville (plus haute pop)
const luxPrefix = getLocalityCoords("Luxembourg");
assert.ok(luxPrefix, "Luxembourg trouve via prefix ou exact");
ok(`Luxembourg → match (name=${luxPrefix.name})`);

// Esch sans suffixe doit matcher Esch-sur-Alzette (population dominante)
const eschPrefix = getLocalityCoords("Esch");
assert.ok(eschPrefix, "Esch trouve");
assert.ok(
  /esch/i.test(eschPrefix.name),
  `Esch matche un nom contenant 'esch' (got: ${eschPrefix.name})`,
);
ok(`Esch → ${eschPrefix.name} (prefix match)`);

// Mondorf doit matcher Mondorf-les-Bains
const mondorf = getLocalityCoords("Mondorf");
assert.ok(mondorf, "Mondorf trouve");
assert.ok(
  /mondorf/i.test(mondorf.name),
  `Mondorf matche un nom contenant 'mondorf' (got: ${mondorf.name})`,
);
ok(`Mondorf → ${mondorf.name}`);

// Cas négatifs
assert.equal(getLocalityCoords("ville inconnue xyz"), null);
ok("'ville inconnue xyz' → null");
assert.equal(getLocalityCoords(""), null);
ok("'' → null");
assert.equal(getLocalityCoords(null), null);
ok("null → null");
assert.equal(getLocalityCoords(undefined), null);
ok("undefined → null");

// Table sanity checks
assert.ok(LOCALITIES.length >= 100, `LOCALITIES.length=${LOCALITIES.length} (attendu >=100)`);
ok(`LOCALITIES contient ${LOCALITIES.length} entrées (>= 100)`);

// Tolerance heuristique : la table peut contenir quelques doublons
// lat/lng exact (quartiers + sections administratives au meme point
// GPS — normal dans GeoNames). On tolere jusqu'a 5% (~30 sur 600).
const coordPairs = new Set(LOCALITIES.map((l) => `${l.lat},${l.lng}`));
const dupCount = LOCALITIES.length - coordPairs.size;
const dupRatio = dupCount / LOCALITIES.length;
assert.ok(
  dupRatio < 0.05,
  `${dupCount} doublons lat/lng (${(dupRatio * 100).toFixed(1)}%) — limite 5%`,
);
ok(
  `Doublons lat/lng: ${dupCount}/${LOCALITIES.length} (${(dupRatio * 100).toFixed(1)}%, tolerance <5%)`,
);

// Toutes les entrées doivent avoir lat/lng valides (range Luxembourg)
for (const loc of LOCALITIES) {
  assert.ok(
    loc.lat >= 49.4 && loc.lat <= 50.2,
    `${loc.name} lat=${loc.lat} hors range LU [49.4, 50.2]`,
  );
  assert.ok(
    loc.lng >= 5.7 && loc.lng <= 6.6,
    `${loc.name} lng=${loc.lng} hors range LU [5.7, 6.6]`,
  );
}
ok("Toutes les coordonnées dans le range Luxembourg [49.4-50.2, 5.7-6.6]");

// Localités spécifiques attendues (sample MAPA Property biens)
for (const expected of [
  "Steinfort",
  "Bettembourg",
  "Hesperange",
  "Fentange",
  "Mondorf-les-Bains",
  "Differdange",
  "Diekirch",
]) {
  const found = getLocalityCoords(expected);
  assert.ok(found, `${expected} doit etre trouve`);
  ok(`${expected} → trouvé (${found.name})`);
}

console.log(`\n${n}/${n} assertions OK — lib/geo/luxembourg-communes.ts`);

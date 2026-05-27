// Sprint C13-bis C3 — Telecharge GeoNames Luxembourg + parse + filtre +
// genere lib/geo/luxembourg-localities.json.
//
// Source : https://download.geonames.org/export/dump/LU.zip
// License : Creative Commons Attribution 4.0 International (CC BY 4.0)
// Format TSV documente : https://download.geonames.org/export/dump/readme.txt
//
// Colonnes (19) :
//   0  geonameid       integer id
//   1  name            UTF-8 name
//   2  asciiname       ASCII name
//   3  alternatenames  comma-separated alternates
//   4  latitude        WGS84
//   5  longitude       WGS84
//   6  feature_class   one char (P = populated place)
//   7  feature_code    PPL, PPLA, PPLA2, PPLA3, PPLA4, PPLC, ...
//   8  country_code    'LU'
//   9  cc2             alternate country codes
//  10  admin1_code     state/canton
//  11-13 admin2/3/4
//  14  population
//  15  elevation
//  16  dem
//  17  timezone
//  18  modification_date
//
// Filtres :
//   - feature_class === 'P' (populated places, exclut peaks/streams/etc.)
//   - feature_code dans { PPL, PPLA, PPLA2, PPLA3, PPLA4, PPLC, PPLL }
//   - OU population > 100 (capture les villages meme sans codification fine)
//   - Plafond ~600 entrees, tri par population desc.
//
// Usage : pnpm exec tsx scripts/fetch-luxembourg-geonames.mjs

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import AdmZip from "adm-zip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

const URL = "https://download.geonames.org/export/dump/LU.zip";
const OUT_PATH = join(ROOT, "lib", "geo", "luxembourg-localities.json");

const ACCEPTED_FEATURE_CODES = new Set([
  "PPL",    // populated place (generique)
  "PPLA",   // capitale d'admin1
  "PPLA2",  // capitale d'admin2
  "PPLA3",
  "PPLA4",
  "PPLC",   // capitale du pays
  "PPLL",   // locality
  "PPLF",   // farm village
  "PPLS",   // section de ville
]);

const MAX_ENTRIES = 600;

async function main() {
  console.log(`[fetch-geonames] downloading ${URL} ...`);
  const res = await fetch(URL);
  if (!res.ok) {
    console.error(`[fetch-geonames] HTTP ${res.status}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`[fetch-geonames] downloaded ${buf.byteLength} bytes`);

  const zip = new AdmZip(buf);
  const txtEntry = zip.getEntry("LU.txt");
  if (!txtEntry) {
    console.error(`[fetch-geonames] LU.txt not found in zip; entries:`);
    for (const e of zip.getEntries()) console.error("  -", e.entryName);
    process.exit(1);
  }
  const raw = txtEntry.getData().toString("utf-8");
  console.log(`[fetch-geonames] LU.txt extracted, ${raw.length} chars`);

  const lines = raw.split("\n").filter(Boolean);
  console.log(`[fetch-geonames] ${lines.length} rows in LU.txt`);

  const entries = [];
  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 15) continue;
    const featureClass = cols[6];
    const featureCode = cols[7];
    const population = Number(cols[14]) || 0;
    if (featureClass !== "P") continue;
    if (!ACCEPTED_FEATURE_CODES.has(featureCode) && population <= 100) {
      continue;
    }
    entries.push({
      name: cols[1],
      asciiname: cols[2],
      alternateNames: cols[3]
        ? cols[3].split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      lat: parseFloat(cols[4]),
      lng: parseFloat(cols[5]),
      population,
      featureCode,
      canton: cols[10] || undefined,
    });
  }

  entries.sort((a, b) => b.population - a.population);
  const trimmed = entries.slice(0, MAX_ENTRIES);

  console.log(
    `[fetch-geonames] filtered to ${trimmed.length} entries (max ${MAX_ENTRIES})`,
  );

  // Stats rapides
  const featureCounts = new Map();
  for (const e of trimmed) {
    featureCounts.set(e.featureCode, (featureCounts.get(e.featureCode) ?? 0) + 1);
  }
  console.log("[fetch-geonames] feature_code distribution:");
  for (const [k, v] of [...featureCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(trimmed, null, 2));
  console.log(`[fetch-geonames] wrote ${OUT_PATH}`);

  // Sanity check : Luxembourg-Ville doit etre present.
  const lux = trimmed.find(
    (e) => e.name === "Luxembourg" || e.asciiname === "Luxembourg",
  );
  console.log(
    "[fetch-geonames] Luxembourg city found:",
    lux ? `name=${lux.name} pop=${lux.population} lat=${lux.lat} lng=${lux.lng}` : "NOT FOUND",
  );
  const steinfort = trimmed.find(
    (e) => e.name === "Steinfort" || e.asciiname === "Steinfort",
  );
  console.log(
    "[fetch-geonames] Steinfort found:",
    steinfort ? `name=${steinfort.name} pop=${steinfort.population}` : "NOT FOUND",
  );
}

main().catch((e) => {
  console.error("[fetch-geonames] FATAL:", e);
  process.exit(1);
});

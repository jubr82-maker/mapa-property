// Referentiel des localites du Luxembourg (oct. 2026) pour l'admin des biens
// et le rattachement aux pages de villes : lib/geo/lu-localities.json.
//
// Source unique : registre national des localites et des rues (CACLR),
// Administration du cadastre et de la topographie, licence CC0. Archive
// placee a la main dans data/caclr/caclr.zip (non versionnee, jamais dans le
// site) ; aucun telechargement ici.
//
// Usage : node scripts/geo/build-lu-localities.mjs [chemin/vers/caclr.zip]
//
// Format lu (colonnes fixes, ISO-8859-1, cf. docs/REGISTRE_LOCALITES.md) :
//   LOCALITE : nom 5-45, date de suppression 88-98 (vide = localite
//              actuelle), canton 109-111, commune 112-114
//   COMMUALL : code 0-2, nom 2-42, canton 92-94, actuelle 94 (O/N)
//   CANTON   : code 0-2, nom 2-42
//   QUARTIER : nom 5-45 (quartiers de la Ville de Luxembourg)
//   TR.DICACOLO.RUCP : canton 40-80, commune 80-120, localite 120-160,
//              code postal 200-204 (codes postaux et controle de coherence)
//   CODEPT   : code postal 0-4, localite 4-44 (localites sans rue)
// Le script s'arrete si une jointure echoue ou contredit le fichier
// transversal, au lieu d'ecrire un referentiel faux.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const zip = path.resolve(ROOT, process.argv[2] ?? "data/caclr/caclr.zip");
const OUT = path.join(ROOT, "lib/geo/lu-localities.json");

const read = (name) => execFileSync("unzip", ["-p", zip, name], { maxBuffer: 64 * 1024 * 1024 }).toString("latin1").split(/\r?\n/).filter((l) => l.trim());
const col = (line, a, b) => line.slice(a, b).trim();
const fail = (msg) => {
  console.error(`ECHEC : ${msg}`);
  process.exit(1);
};

// Date des fichiers de l'archive (liste du zip, format mm-dd-yyyy).
const listing = execFileSync("unzip", ["-l", zip]).toString("latin1");
const dates = [...listing.matchAll(/(\d{2})-(\d{2})-(\d{4})\s+\d{2}:\d{2}\s+LOCALITE\s*$/gm)].map((m) => `${m[3]}-${m[1]}-${m[2]}`);
const fileDate = dates[0] ?? null;

const cantons = new Map(read("CANTON").map((l) => [l.slice(0, 2), col(l, 2, 42)]));
const communes = new Map();
for (const l of read("COMMUALL")) {
  if (l[94] !== "O") continue;
  communes.set(`${l.slice(92, 94)}-${l.slice(0, 2)}`, { name: col(l, 2, 42), canton: cantons.get(l.slice(92, 94)) ?? fail(`canton ${l.slice(92, 94)} inconnu`) });
}

// Codes postaux et controle : (commune, localite) du fichier transversal.
const postal = new Map();
const transversal = new Map();
for (const l of read("TR.DICACOLO.RUCP")) {
  const key = `${col(l, 80, 120)}|${col(l, 120, 160)}`;
  transversal.set(key, col(l, 40, 80));
  if (!postal.has(key)) postal.set(key, new Set());
  postal.get(key).add(col(l, 200, 205));
}
// Localites sans rue : codes postaux de CODEPT, par nom (majuscules).
const codept = new Map();
for (const l of read("CODEPT")) {
  const name = col(l, 4, 44);
  if (!codept.has(name)) codept.set(name, new Set());
  codept.get(name).add(l.slice(0, 4));
}

/**
 * Codes postaux en plages ("1111-1161", "5610") : la Ville de Luxembourg
 * en compte plusieurs centaines. Le registre note "?" quand un code manque :
 * seuls les codes a 4 chiffres sont gardes.
 */
function postalRanges(codes) {
  const n = [...codes].filter((c) => /^\d{4}$/.test(c)).map(Number).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < n.length; i++) {
    let j = i;
    while (j + 1 < n.length && n[j + 1] === n[j] + 1) j++;
    out.push(j > i ? `${n[i]}-${n[j]}` : `${n[i]}`);
    i = j;
  }
  return out;
}

const localities = [];
const removed = [];
for (const l of read("LOCALITE")) {
  const name = col(l, 5, 45);
  if (col(l, 88, 98)) {
    removed.push(name);
    continue;
  }
  const commune = communes.get(`${l.slice(109, 111)}-${l.slice(112, 114)}`);
  if (!commune) fail(`localite ${name} : commune ${l.slice(109, 111)}-${l.slice(112, 114)} absente des communes actuelles`);
  const key = `${commune.name}|${name}`;
  const fromStreets = postal.get(key);
  if (fromStreets && transversal.get(key) !== commune.canton) fail(`localite ${name} : canton different du fichier transversal`);
  const codes = fromStreets ?? codept.get(name.toUpperCase()) ?? new Set();
  localities.push({ name, commune: commune.name, canton: commune.canton, postalCodes: postalRanges(codes) });
}
// Toute localite du fichier transversal doit etre dans le referentiel.
const known = new Set(localities.map((x) => `${x.commune}|${x.name}`));
for (const key of transversal.keys()) if (!known.has(key)) fail(`localite du fichier transversal absente : ${key}`);

const seen = new Set();
for (const x of localities) {
  const k = `${x.commune}|${x.name}`;
  if (seen.has(k)) fail(`doublon dans une meme commune : ${k}`);
  seen.add(k);
}

const quartiers = read("QUARTIER").map((l) => ({ name: col(l, 5, 45), commune: "Luxembourg" }));

const byName = (a, b) => a.name.localeCompare(b.name, "fr") || a.commune.localeCompare(b.commune, "fr");
localities.sort(byName);
quartiers.sort(byName);
const communeList = [...communes.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));

const out = {
  source: "Registre national des localites et des rues (CACLR), Administration du cadastre et de la topographie, licence CC0",
  fileDate,
  communes: communeList,
  localities,
  quartiers,
};
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{")}\n`);
console.log(`${path.relative(ROOT, OUT)} : ${communeList.length} communes, ${localities.length} localites, ${quartiers.length} quartiers (fichiers du ${fileDate})`);
console.log(`ecartees (supprimees du registre) : ${removed.length} : ${removed.join(", ")}`);
console.log(`sans code postal : ${localities.filter((x) => !x.postalCodes.length).map((x) => x.name).join(", ") || "aucune"}`);
// Noms presents dans plusieurs communes : la commune les distingue.
const names = new Map();
for (const x of localities) names.set(x.name, [...(names.get(x.name) ?? []), x.commune]);
console.log(`noms dans plusieurs communes : ${[...names].filter(([, c]) => c.length > 1).map(([n, c]) => `${n} (${c.join(", ")})`).join(" ; ")}`);

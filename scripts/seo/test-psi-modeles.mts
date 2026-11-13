// PageSpeed sur chaque modele de page (nov. 2026, audit SEO, partie E2).
// Lancement : node --import tsx scripts/seo/test-psi-modeles.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PSI_CONCURRENCY, PSI_MANUAL_COOLDOWN_MINUTES, PSI_MODELS, PSI_PATHS } from "../../lib/pilotage/config";

const psi = readFileSync(join(import.meta.dirname, "..", "..", "lib/pilotage/psi.ts"), "utf8");
assert.deepEqual(PSI_MODELS.map((m) => m.key), ["home", "list", "property", "city", "article", "estimate"]);
assert.deepEqual(PSI_PATHS, ["/fr", "/fr/biens", "/fr/villes/steinfort", "/fr/services/estimer"]);
assert.equal(PSI_PATHS[0], "/fr", "accueil en premier (tendance de Sante du site)");
assert.ok(psi.includes("fetchAllPropertiesWithCover()") && psi.includes("/fr/blog/${a.slug}"), "fiche et article choisis parmi les contenus publies");
assert.ok(psi.includes("withLimit(") && PSI_CONCURRENCY > 0 && PSI_CONCURRENCY <= 4, "appels simultanes limites");
assert.equal(PSI_MANUAL_COOLDOWN_MINUTES, 10, "limite de frequence existante inchangee");
console.log("1 PASS, 0 FAIL");

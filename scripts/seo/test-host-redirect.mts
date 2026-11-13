// Hote www. et pages de test (nov. 2026). Appelle proxy.ts directement,
// comme le serveur (sans serveur ni reseau obligatoire).
// Lancement : NODE_USE_ENV_PROXY=1 node --import tsx scripts/seo/test-host-redirect.mts
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { isTestPagePath, wwwRedirectTarget } from "../../lib/host-redirect";

const root = join(import.meta.dirname, "..", "..");
for (const l of existsSync(join(root, ".env.local")) ? readFileSync(join(root, ".env.local"), "utf8").split("\n") : []) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { default: proxy, config } = await import("../../proxy");
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};
const call = async (url: string) => {
  const u = new URL(url);
  const r = (await proxy(new NextRequest(url, { headers: { host: u.host } }))) as Response;
  return { status: r.status, location: r.headers.get("location"), rewrite: r.headers.get("x-middleware-rewrite") };
};

await test("www : 308 vers l'hote sans www, chemin et parametres conserves", async () => {
  const r = await call("https://www.mapaproperty.lu/fr/biens?transaction=sale&city=Mamer");
  assert.equal(r.status, 308);
  assert.equal(r.location, "https://mapaproperty.lu/fr/biens?transaction=sale&city=Mamer");
  const home = await call("https://www.mapaproperty.lu/");
  assert.equal(home.status, 308);
  assert.equal(home.location, "https://mapaproperty.lu/");
  // http://www : une seule etape vers https sans www.
  assert.equal((await call("http://www.mapaproperty.lu/fr/contact")).location, "https://mapaproperty.lu/fr/contact");
  // Avant toute autre regle (admin compris).
  assert.equal((await call("https://www.mapaproperty.lu/admin")).location, "https://mapaproperty.lu/admin");
});

await test("hotes normaux (production, beta, localhost) : jamais rediriges par la regle www", async () => {
  for (const url of ["https://mapaproperty.lu/fr/biens", "https://beta.mapaproperty.lu/fr/biens", "http://localhost:3005/fr/biens?transaction=sale"]) {
    const r = await call(url);
    assert.ok(!(r.status === 308 && r.location && new URL(r.location).host !== new URL(url).host), `${url} -> ${r.status} ${r.location}`);
    assert.equal(wwwRedirectTarget(new URL(url), new URL(url).host), null, url);
  }
});

await test("le matcher du proxy fait passer toutes les adresses d'un hote www", () => {
  const entry = (config.matcher as unknown[]).find((m) => typeof m === "object" && m !== null && (m as { source: string }).source === "/:path*") as { has: { type: string; key: string; value: string }[] } | undefined;
  assert.ok(entry, "entree du matcher pour l'hote www");
  const re = new RegExp(`^${entry.has[0].value}$`);
  assert.ok(re.test("www.mapaproperty.lu") && !re.test("mapaproperty.lu") && !re.test("beta.mapaproperty.lu"));
});

await test("pages test-* : 404 en production, toutes les pages du dossier", async () => {
  const env = process.env as Record<string, string | undefined>;
  const before = env.NODE_ENV;
  env.NODE_ENV = "production";
  try {
    const dirs = readdirSync(join(root, "app", "[locale]")).filter((d) => d.startsWith("test-"));
    assert.ok(dirs.includes("test-scroll") && dirs.includes("test-bandeaux"));
    for (const d of dirs) {
      for (const l of ["fr", "en", "de"]) {
        assert.ok(isTestPagePath(`/${l}/${d}`));
        const r = await call(`https://mapaproperty.lu/${l}/${d}`);
        assert.ok(r.rewrite?.endsWith(`/${l}/adresse-introuvable`), `${l}/${d} -> ${r.status} ${r.rewrite}`);
      }
      // Et la page elle-meme refuse de s'afficher en production.
      assert.ok(/NODE_ENV === "production"\) notFound\(\)/.test(readFileSync(join(root, "app", "[locale]", d, "page.tsx"), "utf8")), d);
    }
    assert.equal(isTestPagePath("/fr/biens"), false);
    assert.equal(isTestPagePath("/fr/blog/test-de-personnalite"), false);
  } finally {
    env.NODE_ENV = before;
  }
});

console.log(`${pass} PASS, 0 FAIL`);

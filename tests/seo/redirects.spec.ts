// Suite redirections, donnees structurees et diffusion (oct. 2026). Echoue
// si, sur le build de production local servi en memoire :
//  - un format d'adresse de l'ancien site ne redirige pas en 301 (proxy) ou
//    308 (next.config) vers son equivalent exact (un controle par format) ;
//  - une redirection publique repond 307 (hors accueil "/", qui choisit la
//    langue du visiteur et reste volontairement temporaire) ;
//  - la page 404 n'est pas utile (recherche, liens) ou ne repond pas 404 ;
//  - une donnee structuree cite une image locale absente, une note, un faux
//    etablissement ou une date de creation non sourcee ;
//  - une page publique n'a pas de fil d'Ariane ;
//  - le sitemap cite une adresse qui redirige ;
//  - une page de ville etrangere affiche un prix sans source.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startServerProcess } from "./server-client";
import {
  OLD_SITE_PAGES,
  V28_PAGES,
  legacyPropertyDestination,
  legacyPropertyId,
  resolveLegacyPath,
} from "../../lib/legacy-redirects";
import { ICON_VERSION } from "../../lib/icons";
import { indexNowPayload, INDEXNOW_KEY_PATTERN } from "../../lib/indexnow";
import { breadcrumbTrail } from "../../lib/breadcrumbs";
import { INTENT_PAGES } from "../../lib/intent-pages";

const ROOT = path.resolve(__dirname, "../..");
// Hors ligne (SEO_OFFLINE=1), une page rendue a la demande qui lit
// Supabase ne repond pas (598) : listee comme NON VERIFIEE, jamais OK.
const OFFLINE = process.env.SEO_OFFLINE === "1";
const unverified: string[] = [];
test.afterAll(() => {
  if (unverified.length) console.log(`NON VERIFIE (hors ligne) : ${unverified.join(", ")}`);
});
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

function pathOf(location: string | undefined): string {
  if (!location) return "";
  const u = new URL(location, "http://localhost");
  return `${u.pathname}${u.search}`;
}

test("logique des anciennes adresses (sans serveur)", () => {
  // Identifiant en fin d'adresse (format observe dans Google Analytics).
  expect(legacyPropertyId("vente+maison+hagen+87109262")).toBe("87109262");
  expect(legacyPropertyId("vente+commerce+fentange+86747780")).toBe("86747780");
  expect(legacyPropertyId("vente+appartement+steinfort+superbe-appartement-duplex-2-chambres-a")).toBeNull();
  // Separateurs : espaces, %20, + ou barres obliques ; dernier nombre.
  expect(legacyPropertyId("rental office luxembourg 86682133")).toBe("86682133");
  expect(legacyPropertyId("rental%20office%20luxembourg%2086682133")).toBe("86682133");
  expect(legacyPropertyId("rental/office/luxembourg/86682133")).toBe("86682133");
  expect(legacyPropertyId("vente%20immeuble%20hesperange%20investissement-a-hesperange-4-unites-garages%2085878623")).toBe("85878623");
  expect(legacyPropertyId("%E9%ZZ+86682133")).toBe("86682133");
  // Bien publie : adresse actuelle de la fiche dans la meme langue.
  const map = new Map([["87109262", { fr: "/biens/maison-hagen-87109262", en: "/biens/house-hagen-87109262", de: "/biens/haus-hagen-87109262" }]]);
  expect(legacyPropertyDestination({ locale: "de", id: "87109262" }, map)).toBe("/de/biens/haus-hagen-87109262");
  // Bien absent : liste des biens de la langue, jamais une erreur.
  expect(legacyPropertyDestination({ locale: "en", id: "11111111" }, map)).toBe("/en/biens");
  expect(legacyPropertyDestination({ locale: "fr", id: null }, map)).toBe("/fr/biens");
  // Ancienne page "selection" (nov. 2026) : liste des biens de la langue.
  expect(resolveLegacyPath("/en/selection")).toEqual({ kind: "path", to: "/en/biens" });
  expect(resolveLegacyPath("/fr/selection")).toEqual({ kind: "path", to: "/fr/biens" });
  expect(resolveLegacyPath("/de/auswahl")).toEqual({ kind: "path", to: "/de/biens" });
  // Adresses actuelles jamais detournees.
  for (const p of ["/fr", "/fr/biens", "/fr/biens/86388715", "/en/off-market/abc", "/de/blog/x", "/fr/villes/belair"]) {
    expect(resolveLegacyPath(p), p).toBeNull();
  }
  // Fil d'Ariane : niveaux sans page jamais cites.
  expect(breadcrumbTrail("/legal/cgu").map((c) => c.path)).toEqual(["/legal/cgu"]);
  expect(breadcrumbTrail("/villes/belair", "Belair").map((c) => c.path)).toEqual(["/services", "/services/marches-actifs", "/villes/belair"]);
  // IndexNow : cle hexadecimale, URL du site uniquement, aucun nom.
  expect(INDEXNOW_KEY_PATTERN.test("0123456789abcdef0123456789abcdef")).toBe(true);
  expect(INDEXNOW_KEY_PATTERN.test("MAPA-key")).toBe(false);
  const payload = indexNowPayload("0123456789abcdef", ["https://mapaproperty.lu/fr/biens"]);
  expect(payload.keyLocation.endsWith("/0123456789abcdef.txt")).toBe(true);
  expect(JSON.stringify(payload)).not.toMatch(/julien|brebion|@/i);
});

test("redirections 308 : un controle par format d'adresse", async () => {
  const server = await startServerProcess();
  const failures: string[] = [];
  const expect308 = async (from: string, to: RegExp | string) => {
    const r = await server.request(from);
    const loc = pathOf(r.headers["location"]);
    const ok = r.status === 308 && (typeof to === "string" ? loc === to : to.test(loc));
    if (!ok) failures.push(`${from} -> ${r.status} ${loc} (attendu 308 ${to})`);
  };
  // Articles du blog (oct. 2026) : 301 en une seule etape vers l'adresse en
  // minuscules avec langue (lib/blog/slug.ts).
  const expect301 = async (from: string, to: RegExp | string) => {
    const r = await server.request(from);
    const loc = pathOf(r.headers["location"]);
    const ok = r.status === 301 && (typeof to === "string" ? loc === to : to.test(loc));
    if (!ok) failures.push(`${from} -> ${r.status} ${loc} (attendu 301 ${to})`);
  };
  try {
    // B. Fiches de l'ancien site (identifiant final), meme langue. Hors
    // ligne, aucun bien n'est lu : la liste des biens de la langue.
    await expect301("/fr/propriete/vente+maison+hagen+87109262", /^\/fr\/biens(\/[^/?]+)?$/);
    await expect301("/fr/propriete/vente+immeuble+luxembourg+85866347", /^\/fr\/biens(\/[^/?]+)?$/);
    await expect301("/fr/propriete/vente+appartement+steinfort+superbe-appartement-duplex-2-chambres-a", "/fr/biens");
    await expect301("/en/property/sale+house+hagen+87109262", /^\/en\/biens(\/[^/?]+)?$/);
    await expect301("/de/immobilie/verkauf+haus+hagen+87109262", /^\/de\/biens(\/[^/?]+)?$/);
    await expect301("/de/immobilien/verkauf+haus+hagen+87109262", /^\/de\/biens(\/[^/?]+)?$/);
    // D. Adresses signalees en 404 par la Search Console (2026-10-17).
    await expect301("/en/property/rental%20office%20luxembourg%2086682133", "/en/biens");
    await expect301("/en/property/rental/office/luxembourg/86682093", "/en/biens");
    await expect301("/fr/propriete/vente%20immeuble%20hesperange%20investissement-a-hesperange-4-unites-garages%2085878623", "/fr/biens");
    await expect301("/fr/recherche", "/fr/biens");
    await expect301("/fr/mentions-legales/honoraires", "/fr/legal/honoraires");
    await expect301("/en/our-agency", "/en/qui-sommes-nous");
    await expect301("/en/contact-us", "/en/contact");
    // D. Ancienne page "selection" (Search Console, exploree le 9 novembre
    // 2026, toujours en 404) : une seule etape vers la liste des biens.
    for (const [from, to] of [["/en/selection", "/en/biens"], ["/fr/selection", "/fr/biens"], ["/de/auswahl", "/de/biens"]]) {
      await expect301(from, to);
      const final = await server.request(to);
      if (final.status !== 200 && !(OFFLINE && final.status === 598)) failures.push(`${from} : destination ${to} en ${final.status} (une seule etape attendue)`);
    }
    // B et D. Pages de l'ancien site (journal : 308 de next.config.ts,
    // controle plus bas).
    for (const [seg, to] of Object.entries(OLD_SITE_PAGES)) {
      if (seg === "journal") continue;
      for (const l of ["fr", "en", "de"]) await expect301(`/${l}/${seg}`, `/${l}${to}`);
    }
    // Barres finales -> sans barre.
    await expect308("/en/", "/en");
    await expect308("/fr/", "/fr");
    await expect308("/fr/biens/", "/fr/biens");
    // A. Site v28 (sans langue).
    for (const [from, to] of Object.entries(V28_PAGES)) await expect301(from, `/fr${to}`);
    await expect301("/blog/vendre-luxembourg-2026-prix-estimation", "/fr/blog/vendre-luxembourg-2026-prix-estimation");
    await expect301("/blog/Immobilier-Steinfort", "/fr/blog/immobilier-steinfort");
    for (const l of ["fr", "en", "de"]) await expect301(`/${l}/blog/Immobilier-Steinfort`, `/${l}/blog/immobilier-steinfort`);
    await expect308("/content/article-1-fr.html", "/fr/blog");
    await expect308("/content/article-2-en.html", "/en/blog");
    await expect308("/content/article-3-de.html", "/de/blog");
    await expect308("/index.html", "/fr");
    await expect308("/403.html", "/fr");
    // Adresse sans langue inconnue du v28 -> version francaise.
    await expect308("/biens", "/fr/biens");
    // C. Doublons et renvois internes.
    for (const l of ["fr", "en", "de"]) {
      await expect308(`/${l}/journal`, `/${l}/blog`);
      // /services/acheter : page d'intention "acheter" depuis oct. 2026,
      // plus une redirection (verifiee par seo-onpage).
      await expect308(`/${l}/services/mandat-recherche`, `/${l}/mandats/recherche`);
      await expect308(`/${l}/services/mandat-exclusif`, `/${l}/mandats/exclusif`);
    }
    // Accueil "/" : seule redirection temporaire publique (choix de langue).
    const home = await server.request("/");
    if (home.status !== 307 || !/^\/(fr|en|de)$/.test(pathOf(home.headers["location"]))) {
      failures.push(`/ -> ${home.status} ${home.headers["location"]} (attendu 307 vers une langue)`);
    }
    // Page 404 utile, dans chaque langue.
    for (const l of ["fr", "en", "de"]) {
      const r = await server.request(`/${l}/cette-page-n-existe-pas`);
      if (OFFLINE && r.status >= 590) {
        unverified.push(`/${l}/cette-page-n-existe-pas`);
        continue;
      }
      const body = r.body ?? "";
      if (r.status !== 404 || !body.includes(`action="/${l}/biens"`) || !body.includes(`href="/${l}/contact"`)) {
        failures.push(`/${l}/cette-page-n-existe-pas -> ${r.status} (attendu 404 avec recherche et liens)`);
      }
    }
  } finally {
    await server.close();
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("premier ecran : aucune image servie par r2.dev (build)", async () => {
  // Decision de Julien (oct. 2026) : images du premier ecran servies par le
  // site ; seules les videos de l'accueil restent sur R2 (chargees apres
  // l'image, hors trafic Vercel). Controle : toute image (img, source,
  // preload, optimiseur /_next/image) des pages publiques de premier rang.
  const server = await startServerProcess();
  const failures: string[] = [];
  try {
    for (const p of ["/fr", "/en", "/de", "/fr/biens", "/fr/services/estimer", "/fr/off-market", "/fr/contact", "/fr/qui-sommes-nous"]) {
      const r = await server.request(p);
      if (r.status >= 590) {
        if (OFFLINE) unverified.push(p);
        else failures.push(`${p} : non rendue (${r.status})`);
        continue;
      }
      const html = (r.body ?? "").replace(/&amp;/g, "&");
      const tags = html.match(/<(img|source|link)\b[^>]*>/gi) ?? [];
      for (const tag of tags) {
        if (/^<link/i.test(tag) && !/as="image"/i.test(tag)) continue;
        let decoded = tag;
        try {
          decoded = decodeURIComponent(tag);
        } catch {
          // Sequence % invalide : on teste la balise telle quelle.
        }
        if (/r2\.dev/i.test(decoded)) failures.push(`${p} : image servie par r2.dev : ${tag.slice(0, 140)}`);
      }
    }
    const home = await server.request("/fr");
    if (!/rel="preload" as="image"[^>]*mapa-showcase-poster-\d+\.avif/.test(home.body ?? "")) {
      failures.push("/fr : image d'accueil locale non prechargee");
    }
  } finally {
    await server.close();
  }
  for (const w of [640, 828, 1080, 1280, 1920]) {
    for (const ext of ["avif", "webp"]) {
      const f = `public/images/hero/mapa-showcase-poster-${w}.${ext}`;
      if (!fs.existsSync(path.join(ROOT, f))) failures.push(`${f} absent`);
    }
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("donnees structurees, fil d'Ariane, sitemap et villes (build)", async () => {
  const server = await startServerProcess();
  const failures: string[] = [];
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu").replace(/\/$/, "");
  const ldBlocks = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  try {
    const pages = [
      "/fr", "/en", "/de", "/en/contact", "/de/qui-sommes-nous", "/fr/services/estimer", "/fr/services/simulateurs",
      "/fr/services/simulateurs/financement", "/fr/services/capacite-emprunt", "/fr/services/rendement-locatif",
      "/fr/services/marches-actifs", "/fr/legal/mentions-legales", "/fr/legal/rgpd", "/fr/villes/belair",
      "/en/villes/paris", "/fr/mandats/exclusif", "/fr/off-market/arcova", "/fr/liste-attente",
    ];
    for (const p of pages) {
      const r = await server.request(p);
      if (r.status >= 590) {
        if (OFFLINE) unverified.push(p);
        else failures.push(`${p} : non rendue (${r.status})`);
        continue;
      }
      const html = r.body ?? "";
      const blocks = ldBlocks(html);
      const all = blocks.join("\n");
      if (/aggregateRating|"LocalBusiness"/.test(all)) failures.push(`${p} : note ou faux etablissement`);
      // Etablissement unique, identique sur toutes les pages (regle de Julien).
      const orgs = blocks.map((b) => { try { return JSON.parse(b); } catch { return null; } })
        .flatMap((j) => (j && Array.isArray(j["@graph"]) ? j["@graph"] : [j]))
        .filter((j) => j && j["@type"] === "RealEstateAgent");
      if (orgs.length === 0) failures.push(`${p} : etablissement absent`);
      // Un seul bloc RealEstateAgent par page (oct. 2026).
      if (orgs.length > 1) failures.push(`${p} : ${orgs.length} blocs RealEstateAgent`);
      for (const o of orgs) {
        const a = o.address ?? {};
        const okAddress = a.streetAddress === "26 Rue du Commerce" && a.postalCode === "L-3450" && a.addressLocality === "Dudelange" && a.addressCountry === "LU";
        if (o.name !== "MAPA Property" || o.legalName !== "MAPA Synergy Sàrl" || !okAddress || o.foundingDate !== "2023-01") {
          failures.push(`${p} : etablissement inexact (${o.name} / ${o.legalName} / ${JSON.stringify(a)} / ${o.foundingDate})`);
        }
        if (!p.includes("/legal/mentions-legales") && (o.vatID || o.identifier)) failures.push(`${p} : TVA ou RCS hors des mentions legales`);
        if (o["@type"] === "RealEstateAgent" && !p.includes("/legal/mentions-legales")) {
          // Profils officiels et fiche Google Business Profile (oct. 2026).
          const hosts = (o.sameAs ?? []).map((u: string) => new URL(u).hostname.replace(/^www\./, "")).sort();
          const google = (o.sameAs ?? []).filter((u: string) => u.includes("google.com")).sort();
          const GOOGLE = ["https://www.google.com/maps?cid=3582051223520001281", "https://www.google.com/search?kgmid=/g/11m5ysphb_"];
          if (JSON.stringify(hosts) !== JSON.stringify(["facebook.com", "google.com", "google.com", "instagram.com", "linkedin.com"]) || JSON.stringify(google) !== JSON.stringify(GOOGLE) || o.hasMap !== GOOGLE[0]) {
            failures.push(`${p} : sameAs ou hasMap differents de LinkedIn, Instagram, Facebook et la fiche Google (${hosts.join(", ")})`);
          }
        }
      }
      // Aucune coordonnee de contact ni position dans les donnees structurees.
      if (/"(telephone|email|faxNumber|contactPoint|geo|latitude|longitude)"\s*:|mailto:|tel:|\+352|@mapagroup/i.test(all)) {
        failures.push(`${p} : coordonnee de contact dans les donnees structurees`);
      }
      if (/Luxembourg-Ville|Luxembourg City|Luxemburg-Stadt/i.test(JSON.stringify(orgs))) {
        failures.push(`${p} : adresse de Luxembourg-Ville dans l'etablissement`);
      }
      if (!/^\/(fr|en|de)$/.test(p) && !/"BreadcrumbList"/.test(all)) failures.push(`${p} : fil d'Ariane absent`);
      // Images locales citees : fichier present dans public/.
      for (const m of all.matchAll(/"(https?:\/\/[^"]+\.(?:png|jpe?g|webp|avif|svg))"/g)) {
        const u = new URL(m[1]);
        if (`${u.protocol}//${u.host}` === site && !fs.existsSync(path.join(ROOT, "public", decodeURIComponent(u.pathname)))) {
          failures.push(`${p} : image absente ${u.pathname}`);
        }
      }
      if (p.startsWith("/en/villes/paris") && /€\s?\d|\d\s?€|\/sqm|\/m²/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) {
        failures.push(`${p} : prix sans source`);
      }
    }
    // Numeros legaux : uniquement sur les mentions legales.
    const legal = await server.request("/fr/legal/mentions-legales");
    if (!/"vatID"/.test(ldBlocks(legal.body ?? "").join(""))) failures.push("mentions legales : TVA absente des donnees structurees");
    // Sitemap : aucune adresse qui redirige.
    // Index des sitemaps (nov. 2026) : on lit chaque fichier par type.
    const index = await server.request("/sitemap.xml");
    const files = [...(index.body ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    const sm = { body: (await Promise.all(files.map((f) => server.request(f)))).map((r) => r.body ?? "").join("\n") };
    const locs = [...(sm.body ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    for (const bad of ["/services/mandat-exclusif", "/services/mandat-recherche", "/journal"]) {
      if (locs.some((l) => l.endsWith(bad))) failures.push(`sitemap : ${bad} redirige`);
    }
    if (/<lastmod>/.test(sm.body ?? "") && locs.some((l) => /\/legal\//.test(l)) && /<loc>[^<]*\/legal\/[^<]*<\/loc>\s*<lastmod>/.test(sm.body ?? "")) {
      failures.push("sitemap : date de modification inventee sur une page fixe");
    }
  } finally {
    await server.close();
  }
  // Fichiers d'images du site cites en dur par les donnees structurees.
  for (const f of ["public/og-image.png", "public/logo-mapa-property.png"]) {
    if (!fs.existsSync(path.join(ROOT, f))) failures.push(`${f} absent`);
  }
  // llms.txt : pages actuelles, aucune coordonnee.
  const llms = read("public/llms.txt");
  if (/@|\+352|tel:|mailto:/i.test(llms) || !/\/fr\/blog/.test(llms)) failures.push("llms.txt : coordonnee ou page manquante");
  expect(failures, failures.join("\n")).toEqual([]);
});

// Pages de recherche immobiliere (oct. 2026, lib/intent-pages.ts) : dans
// les trois langues, reponse dans le premier paragraphe, FAQ visible et
// FAQPage identiques, Service rattache a l'etablissement unique, liens vers
// les biens, les villes et les simulateurs, aucun tiret long ou moyen.
// Sitemaps par type (nov. 2026, audit SEO, partie C3) : chaque adresse de
// chaque fichier est une page publique indexable (200, sans noindex, non
// bloquee par robots.txt) dont la canonical est elle-meme.
test("sitemaps : chaque adresse indexable, canonical elle-meme (build)", async () => {
  const server = await startServerProcess();
  const failures: string[] = [];
  try {
    const index = await server.request("/sitemap.xml");
    const files = [...(index.body ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    if (!files.length && !/beta\./.test(process.env.NEXT_PUBLIC_SITE_URL ?? "")) failures.push("index vide");
    for (const f of files) {
      const xml = (await server.request(f)).body ?? "";
      for (const loc of [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"))) {
        const u = new URL(loc);
        const p = u.pathname + u.search;
        if (u.search && !/^\/(fr|en|de)\/biens\?transaction=(sale|rent)$/.test(p)) failures.push(`${f} : parametre ${p}`);
        const r = await server.request(p);
        if (OFFLINE && r.status >= 590) {
          unverified.push(p);
          continue;
        }
        const body = r.body ?? "";
        if (r.status !== 200) { failures.push(`${p} : ${r.status}`); continue; }
        if (/<meta name="robots" content="[^"]*noindex/.test(body)) failures.push(`${p} : noindex`);
        const canon = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&");
        if (!canon || new URL(canon).pathname + new URL(canon).search !== p) failures.push(`${p} : canonical ${canon}`);
      }
    }
  } finally {
    await server.close();
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

test("pages de recherche immobiliere (build)", async () => {
  const server = await startServerProcess();
  const failures: string[] = [];
  const ldBlocks = (html: string) =>
    [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
      try { return JSON.parse(m[1]); } catch { return null; }
    });
  const text = (h: string) => h.replace(/<[^>]+>/g, "").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
  try {
    for (const [intent, cfg] of Object.entries(INTENT_PAGES)) {
      for (const l of ["fr", "en", "de"]) {
        const p = `/${l}${cfg.path}`;
        const r = await server.request(p);
        if (r.status >= 590) {
          if (OFFLINE) unverified.push(p);
          else failures.push(`${p} : non rendue (${r.status})`);
          continue;
        }
        if (r.status !== 200) { failures.push(`${p} : statut ${r.status}`); continue; }
        const html = r.body ?? "";
        const main = html.replace(/<script[\s\S]*?<\/script>/g, "");
        const afterH1 = main.slice(main.indexOf("</h1>"));
        const firstP = afterH1.match(/<p\b[^>]*>/)?.[0] ?? "";
        if (!firstP.includes(`data-intent-answer="${intent}"`)) failures.push(`${p} : la reponse n'est pas le premier paragraphe apres le H1`);
        const lds = ldBlocks(html).filter(Boolean);
        const service = lds.find((j) => j["@type"] === "Service");
        if (!service || !String(service.provider?.["@id"] ?? "").endsWith("#organization") || new URL(String(service.url)).pathname !== p) {
          failures.push(`${p} : Service absent ou inexact`);
        }
        const faq = lds.find((j) => j["@type"] === "FAQPage");
        const visibleQ = [...main.matchAll(/<summary[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => text(m[1]));
        const ldQ = (faq?.mainEntity ?? []).map((q: { name: string }) => q.name);
        if (ldQ.length !== cfg.faqCount || JSON.stringify(ldQ) !== JSON.stringify(visibleQ)) {
          failures.push(`${p} : FAQ visible et FAQPage differentes (${visibleQ.length} / ${ldQ.length})`);
        }
        if (!new RegExp(`href="/${l}/biens`).test(main)) failures.push(`${p} : aucun lien vers les biens`);
        if (!new RegExp(`href="/${l}/villes/`).test(main)) failures.push(`${p} : aucun lien vers une ville`);
        if (!new RegExp(`href="/${l}/services/(simulateurs/financement|capacite-emprunt)`).test(main)) failures.push(`${p} : aucun lien vers un simulateur`);
      }
    }
  } finally {
    await server.close();
  }
  for (const l of ["fr", "en", "de"]) {
    const ns = JSON.parse(read(`messages/${l}.json`)).intent_pages;
    if (/[\u2013\u2014]/.test(JSON.stringify(ns))) failures.push(`messages/${l}.json : tiret long ou moyen dans intent_pages`);
  }
  expect(failures, failures.join("\n")).toEqual([]);
});

// Icones (oct. 2026, scripts/generate-icons-square.mjs) : toutes les
// declarations (site, admin, manifestes) visent public/icons/, avec le
// numero de version de lib/icons.ts (cache d'un an) ; fichiers presents,
// carres, multiples de 48 px (Apple : 180 px) ; aucune ancienne icone
// declaree ; favicon.ico multi-tailles identique dans app/ et public/.
test("icones du site et de l'admin", async () => {
  const sharp = (await import("sharp")).default;
  const failures: string[] = [];
  const sources = ["app/[locale]/layout.tsx", "app/admin/layout.tsx", "app/admin/manifest.webmanifest/route.ts", "public/site.webmanifest"];
  const declared = new Set<string>();
  for (const f of sources) {
    const s = read(f);
    if (/favicon-(16|32|48)\.png|pwa-\d+|"\/apple-touch-icon\.png"|logo-mapa-property\.svg/.test(s)) failures.push(`${f} : ancienne icone declaree`);
    for (const m of s.matchAll(/["'](\/icons\/[^"']+)["']/g)) declared.add(m[1]);
    // Adresses versionnees : iconUrl("icon-48.png") = /icons/icon-48.png?v=N.
    for (const m of s.matchAll(/iconUrl\("([^"]+)"\)/g)) declared.add(`/icons/${m[1]}?v=${ICON_VERSION}`);
  }
  for (const u of declared) if (!new RegExp(`\\?v=${ICON_VERSION}$`).test(u)) failures.push(`${u} : sans numero de version`);
  if (declared.size === 0) failures.push("aucune icone declaree dans public/icons/");
  for (const u of declared) {
    const file = path.join(ROOT, "public", u.replace(/\?v=\d+$/, ""));
    if (!fs.existsSync(file)) { failures.push(`${u} absent`); continue; }
    const { width, height } = await sharp(file).metadata();
    // Exceptions : Apple (180 px) et 512 px, taille attendue par les
    // manifestes d'application, declaree uniquement dans les manifestes.
    const apple = /apple-touch-icon/.test(u);
    const manifestOnly = width === 512 && !/-512/.test(read("app/[locale]/layout.tsx") + read("app/admin/layout.tsx"));
    if (width !== height || (apple ? width !== 180 : (width ?? 0) % 48 !== 0 && !manifestOnly)) failures.push(`${u} : ${width}x${height}`);
  }
  const ico = fs.readFileSync(path.join(ROOT, "public/favicon.ico"));
  if (ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 3) failures.push("public/favicon.ico : moins de trois tailles");
  if (!ico.equals(fs.readFileSync(path.join(ROOT, "app/favicon.ico")))) failures.push("app/favicon.ico different de public/favicon.ico");
  expect(failures, failures.join("\n")).toEqual([]);
});

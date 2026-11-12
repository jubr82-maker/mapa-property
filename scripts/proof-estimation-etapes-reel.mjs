// scripts/proof-estimation-etapes-reel.mjs : preuve dans un VRAI navigateur
// (Chrome deja installe sur le Mac, aucune installation) que le formulaire
// d'estimation remonte bien a chaque etape (nov. 2026).
// Telephone 440 x 956 puis ordinateur 1440 x 900, animations normales puis
// "reduire les animations". A chaque etape :
//   - le titre de l'etape est dans l'ecran : son haut entre le bas de
//     l'en-tete fixe et la moitie de l'ecran ;
//   - le champ qui a le focus est visible a l'ecran.
// Parcours : etape 1 sans surface puis "Suivant" (erreur : focus sur la
// surface), surface 120 m2, "Suivant" ; etape 2 lieu fictif "Steinfort",
// "Suivant" ; etape 3 prenom, nom et e-mail fictifs, controle puis "Retour". Le formulaire final n'est
// JAMAIS envoye (aucune estimation, aucun e-mail).
// Une capture par etape dans docs/qa/captures-grand-chantier-2026-11/formulaires-etapes.
// Lancement (machine de Julien) : pnpm dev -p 3006, puis
//   node scripts/proof-estimation-etapes-reel.mjs
//   (ou BASE=http://localhost:3000 node scripts/proof-estimation-etapes-reel.mjs)
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3006";
const OUT = path.join("docs", "qa", "captures-grand-chantier-2026-11", "formulaires-etapes");
await mkdir(OUT, { recursive: true });

const VIEWPORTS = {
  telephone: { viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  ordinateur: { viewport: { width: 1440, height: 900 } },
};

// Etat a l'ecran : en-tete fixe, titre de l'etape, champ en focus.
const measure = () => {
  const header = Math.max(0, ...[...document.querySelectorAll("header")].filter((h) => ["fixed", "sticky"].includes(getComputedStyle(h).position)).map((h) => h.getBoundingClientRect().bottom));
  const title = document.querySelector("form section h2, section h2");
  const a = document.activeElement;
  const ar = a && a !== document.body ? a.getBoundingClientRect() : null;
  return {
    header,
    vh: window.innerHeight,
    scrollY: Math.round(window.scrollY),
    title: title?.textContent?.trim() ?? null,
    titleTop: title ? Math.round(title.getBoundingClientRect().top) : null,
    focus: a ? `${a.tagName}${a.getAttribute("type") ? `[${a.getAttribute("type")}]` : ""}` : null,
    focusTop: ar ? Math.round(ar.top) : null,
    focusBottom: ar ? Math.round(ar.bottom) : null,
  };
};

const failures = [];
function check(tag, m, { expectFocus = true } = {}) {
  const okTitle = m.titleTop !== null && m.titleTop >= m.header - 2 && m.titleTop <= m.vh / 2;
  const okFocus = !expectFocus || (m.focusTop !== null && m.focusTop >= m.header - 2 && m.focusBottom <= m.vh);
  const line = `${tag} : titre "${m.title}" a ${m.titleTop}px (en-tete ${Math.round(m.header)}px, ecran ${m.vh}px), focus ${m.focus} a ${m.focusTop}px, scrollY ${m.scrollY}`;
  console.log(`${okTitle && okFocus ? "OK   " : "ECHEC"} ${line}`);
  if (!okTitle || !okFocus) failures.push(line);
}

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, opts] of Object.entries(VIEWPORTS)) {
  for (const motion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: motion, userAgent: "Mozilla/5.0" });
    // Banniere des cookies deja tranchee (refus) : elle ne gene pas la preuve.
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("mp_cookie_consent", JSON.stringify({ stats: false, marketing: false, timestamp: new Date().toISOString(), version: 1 }));
      } catch {}
    });
    const page = await ctx.newPage();
    // Securite : aucune estimation ne doit partir.
    await page.route("**/api/estimate**", (r) => r.abort());
    await page.route("**/api/lead**", (r) => r.abort());
    const tag = `${name}-${motion === "reduce" ? "sans-animation" : "animation"}`;
    const wait = () => page.waitForTimeout(motion === "reduce" ? 300 : 1300);
    await page.goto(`${BASE}/fr/services/estimer`, { waitUntil: "networkidle" });
    await page.locator("[data-consent-banner] button").first().click({ timeout: 1500 }).catch(() => {});

    // Etape 1 sans surface : erreur, focus sur le champ obligatoire.
    const next = () => page.getByRole("button", { name: /suivant/i }).first();
    await next().scrollIntoViewIfNeeded();
    await next().click();
    await wait();
    let m = await page.evaluate(measure);
    const errOk = m.focus?.startsWith("INPUT") && m.focusTop !== null && m.focusTop >= m.header - 2 && m.focusBottom <= m.vh;
    console.log(`${errOk ? "OK   " : "ECHEC"} ${tag} etape 1 erreur : focus ${m.focus} a ${m.focusTop}px`);
    if (!errOk) failures.push(`${tag} etape 1 erreur : focus ${m.focus} a ${m.focusTop}px`);
    await page.screenshot({ path: path.join(OUT, `reel-${tag}-1-erreur.png`) });

    // Etape 1 remplie (valeur fictive), puis Suivant depuis le bas de la page.
    await page.locator("section input[type=number]").first().fill("120");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await next().click();
    await wait();
    m = await page.evaluate(measure);
    check(`${tag} etape 2`, m);
    await page.screenshot({ path: path.join(OUT, `reel-${tag}-2-lieu.png`) });

    // Etape 2 : lieu fictif, puis Suivant depuis le bas de la page.
    const place = page.locator("section input[role=combobox]").first();
    await place.fill("Steinfort");
    await page.locator("[role=option]").first().click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await next().click();
    await wait();
    m = await page.evaluate(measure);
    check(`${tag} etape 3`, m);
    await page.screenshot({ path: path.join(OUT, `reel-${tag}-3-coordonnees.png`) });

    // Etape 3 : valeurs fictives saisies, formulaire JAMAIS envoye (aucun
    // clic sur le bouton d'envoi). Retour vers l'etape 2.
    await page.locator("section input[autocomplete=given-name]").first().fill("Test");
    await page.locator("section input[autocomplete=family-name]").first().fill("Fictif");
    await page.locator("section input[type=email]").first().fill("test@example.invalid");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("button", { name: /retour/i }).first().click();
    await wait();
    m = await page.evaluate(measure);
    check(`${tag} retour etape 2`, m);
    await page.screenshot({ path: path.join(OUT, `reel-${tag}-4-retour.png`) });
    await ctx.close();
  }
}

// Defaut 2 : bulle d'Elena et fenetre "Dans quel pays souhaitez-vous chercher ?".
{
  const ctx = await browser.newContext({ ...VIEWPORTS.telephone, userAgent: "Mozilla/5.0" });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("mp_cookie_consent", JSON.stringify({ stats: false, marketing: false, timestamp: new Date().toISOString(), version: 1 }));
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr/biens?types=appartement`, { waitUntil: "networkidle" });
  await page.locator("[data-consent-banner] button").first().click({ timeout: 1500 }).catch(() => {});
  const prompt = page.locator("[data-country-prompt]");
  const covered = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll("[data-country-prompt] a, [data-country-prompt] button")) {
      // Centre et quatre coins (2 px a l'interieur) : un coin recouvert compte.
      const r = b.getBoundingClientRect();
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
      if (pts.some(([x, y]) => { const top = document.elementFromPoint(x, y); return !top || !b.contains(top); })) out.push(b.textContent?.trim());
    }
    return out;
  });
  const visible = await prompt.isVisible();
  const ok = visible && covered.length === 0;
  console.log(`${ok ? "OK   " : "ECHEC"} fenetre du pays (telephone) : ${visible ? "visible" : "absente"}, boutons recouverts : ${covered.join(", ") || "aucun"}`);
  if (!ok) failures.push(`fenetre du pays : boutons recouverts ${covered.join(", ")}`);
  await page.screenshot({ path: path.join(OUT, "reel-fenetre-pays-telephone.png") });
  await ctx.close();
}

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} ECHEC(S)`);
  process.exit(1);
}
console.log(`\nOK : etapes visibles et focus visible a chaque fois ; captures dans ${OUT}`);

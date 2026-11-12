// Correctif avant mise en ligne (nov. 2026), sans reseau ni navigateur :
// defilement des etapes et bulle d'Elena. La preuve dans un vrai navigateur
// est scripts/proof-estimation-etapes-reel.mjs (Chrome du Mac).
// Lancement : node --import tsx scripts/test-etapes-bulle.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

test("focus AVANT le defilement, sans defilement implicite", () => {
  const s = read("lib/forms/step-scroll.ts");
  const fn = s.slice(s.indexOf("export function scrollToAndFocus"));
  assert.ok(fn.indexOf("focus({ preventScroll: true })") < fn.indexOf("window.scrollTo("));
});
test("garde-fou : fin du defilement verifiee, saut direct si l'etape n'est pas visible", () => {
  const s = read("lib/forms/step-scroll.ts");
  assert.ok(s.includes('addEventListener("scrollend", settle)') && s.includes("window.setTimeout(settle, 900)") && s.includes('behavior: "auto"') && !s.includes('"instant"'));
  assert.ok(s.includes("top >= headerOffset() - 2 && top <= window.innerHeight / 2"));
});
test("apres le rendu : deux images, titre de l'etape vise, vrai changement d'etape seulement", () => {
  const s = read("lib/forms/step-scroll.ts");
  assert.ok(/requestAnimationFrame\(\(\) => \{\s*id2 = requestAnimationFrame/.test(s));
  assert.ok(s.includes('querySelector<HTMLElement>("h2, h3, legend")'));
  assert.ok(s.includes("Object.is(prev.current, step)"));
});
test("reduire les animations : aucun defilement doux", () => {
  assert.ok(read("lib/forms/step-scroll.ts").includes('behavior: smooth ? "smooth" : "auto"'));
});
test("bulle d'Elena masquee quand une fenetre du bas est ouverte (pays, cookies)", () => {
  assert.ok(read("components/search/CountryPrompt.tsx").includes("useBottomSheet(open)"));
  assert.ok(read("components/consent/CookieConsentBanner.tsx").includes("useBottomSheet(visible)"));
  const b = read("components/chatbot/ChatbotBubble.tsx");
  assert.ok(b.includes("data-chatbot-bubble") && b.includes("data-chatbot-invite"));
  const css = read("app/globals.css");
  assert.ok(css.includes("html[data-bottom-sheet] [data-chatbot-bubble]") && css.includes("html[data-bottom-sheet] [data-chatbot-invite]"));
});
test("preuve reelle : Chrome du Mac, aucun envoi du formulaire", () => {
  const p = read("scripts/proof-estimation-etapes-reel.mjs");
  assert.ok(p.includes('chromium.launch({ channel: "chrome" })') && p.includes('"http://localhost:3006"'));
  assert.ok(p.includes('page.route("**/api/estimate**", (r) => r.abort())'));
  assert.ok(!/name: \/(calculer|estimer|compute)/i.test(p));
});
console.log(`${pass} PASS, 0 FAIL`);

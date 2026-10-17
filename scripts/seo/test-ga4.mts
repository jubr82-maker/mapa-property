// Suivi GA4 des demandes (oct. 2026, etape 9), sans reseau.
// Lancement : node --import tsx scripts/seo/test-ga4.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEAD_FORM_TYPES, leadFormTypeOf } from "../../lib/tracking/track";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

// Une valeur par formulaire, liste fermee.
assert.equal(new Set(LEAD_FORM_TYPES).size, LEAD_FORM_TYPES.length);
const mandates = read("lib/mandates.ts");
for (const m of mandates.matchAll(/formType: "([a-z_]+)"/g)) assert.ok(LEAD_FORM_TYPES.includes(leadFormTypeOf(m[1])) && leadFormTypeOf(m[1]) !== "contact", m[1]);
assert.equal(leadFormTypeOf("general_contact"), "contact");
assert.equal(leadFormTypeOf("property_request"), "property_request");
assert.equal(leadFormTypeOf("owner_search"), "search_owner");

// Evenements : seulement form_type, page_language, method ; garde de consentement.
const track = read("lib/tracking/track.ts");
assert.ok(track.includes('sendToGA4("generate_lead", { form_type: formType, page_language: pageLanguage(locale) });'));
assert.ok(track.includes('sendToGA4("contact_click", { method, page_language: pageLanguage(locale) });'));
for (const fn of ["trackLead", "trackContactClick"]) {
  const body = track.slice(track.indexOf(`export function ${fn}`), track.indexOf("}", track.indexOf(`export function ${fn}`) + 200) + 1);
  assert.ok(body.includes("if (!hasStatsConsent()) return;"), fn);
}
assert.ok(track.includes("if (ga4EventName) sendToGA4(ga4EventName, { page_language: pageLanguage() });"), "aucun montant vers GA4");
// GA4 n'est charge qu'avec le consentement Statistiques.
const loader = read("components/consent/ConsentGatedAnalytics.tsx");
assert.ok(loader.includes("if (!statsAllowed) return null;") && loader.includes("process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID"));

// Chaque formulaire : generate_lead seulement apres une reponse serveur OK.
const forms: [string, string, string][] = [
  ["components/forms/ContactForm.tsx", "if (res.ok) {", "trackLead(leadFormTypeOf(type), locale);"],
  ["components/forms/WaitlistForm.tsx", "if (res.ok) {", 'trackLead("waitlist", locale);'],
  ["components/forms/NDAForm.tsx", "if (!res.ok) throw new Error();", 'trackLead("offmarket_access", locale);'],
  ["components/forms/EstimateForm.tsx", "if (!res.ok) throw new Error();", 'trackLead("estimation");'],
];
for (const [f, okGuard, call] of forms) {
  const src = read(f);
  const i = src.indexOf(call);
  assert.ok(i > 0, `${f} : appel absent`);
  assert.ok(src.lastIndexOf(okGuard, i) > 0 && src.lastIndexOf("await fetch(", i) < i, `${f} : appel apres la reponse OK`);
  assert.equal((src.match(/trackLead\(/g) ?? []).length, 1, `${f} : un seul appel`);
}
// Telephone revele : contact_click sans le numero.
const reveal = read("components/contact-reveal.tsx");
assert.ok(reveal.includes('if (line.kind === "phone") trackContactClick("phone");'));
console.log("  PASS GA4 : generate_lead apres envoi reussi, form_type ferme, page_language, contact_click, consentement\n\n1 PASS, 0 FAIL");

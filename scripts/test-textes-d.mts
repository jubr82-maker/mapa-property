// Corrections de textes (nov. 2026, partie D), sans reseau. Recherche dans
// tout le contenu PUBLIC du depot (app, components, lib, messages, public) :
// plus aucun "40 000" lie au Bëllegen Akt, ni "loyers encaissés", ni
// "selon l'usage" ; "Journal" a la place de "Blog" ; valeurs du chatbot a jour.
// Lancement : node --import tsx scripts/test-textes-d.mts
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LEGAL_FEES } from "../lib/legal-fees";
import { getKnowledge } from "../components/chatbot/chatbot-knowledge";

const root = join(import.meta.dirname, "..");
const PUBLIC = ["app", "components", "lib", "messages", "public"];
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const grep = (pattern: string) => {
  try {
    return execFileSync("git", ["grep", "-n", "-I", "-i", "-P", pattern, "--", ...PUBLIC], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .filter((l) => !l.startsWith("lib/payroll/") && !l.startsWith("app/admin/"));
  } catch {
    return [];
  }
};

test("Bëllegen Akt : 45 000 euros par acquereur (lib/legal-fees.ts)", () => {
  const b = LEGAL_FEES.LU.aids.find((a) => a.name === "Bëllegen Akt") as { amount_per_person?: number; legal_ref?: string };
  assert.equal(b.amount_per_person, 45000);
  assert.ok(!/3 juillet 2025/.test(b.legal_ref ?? ""));
});
test("aucun 40 000 lie au Bëllegen Akt dans le contenu public", () => {
  const hits = grep("(b[eë]llegen|bellegen).{0,200}(40[\\s\\x{00a0}\\x{202f}.,']?000|80[\\s\\x{00a0}\\x{202f}.,']?000)|(40[\\s\\x{00a0}\\x{202f}.,']?000).{0,120}(b[eë]llegen)|BELLEGEN_AKT_PER_BUYER = 40|bellegenAktBuyers \\?\\? 0\\) \\* 40000|amount: 40000");
  assert.deepEqual(hits, []);
});
test("aucun 'loyers encaissés' ni 'selon l'usage' (et equivalents EN, DE)", () => {
  assert.deepEqual(grep("loyers encaiss|selon l.?usage|selon usage|collected rents|rents collected|eingenommenen Mieten|je nach Brauch|nach Gepflogenheit"), []);
});
test("loi du 3 juillet 2025 retiree des textes publics", () => assert.deepEqual(grep("3 juillet 2025|3 July 2025|3\\. Juli 2025"), []));
test("location : un mois de loyer HT, etat des lieux inclus, loi du 23 juillet 2024", () => {
  const h = readFileSync(join(root, "lib/legal/honoraires.ts"), "utf8");
  assert.ok(h.includes("un mois de loyer HT, état des lieux inclus, partagé par moitié entre le bailleur et le locataire conformément à la loi luxembourgeoise sur le bail d'habitation (loi du 23 juillet 2024)"));
  assert.ok(h.includes("6 % à 8 % HT du loyer mensuel"));
  assert.ok(h.includes("MAPA Property n'encaisse pas les loyers."));
});
test("Journal a la place de Blog (FR, EN, DE)", () => {
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(readFileSync(join(root, `messages/${l}.json`), "utf8"));
    assert.equal(m.breadcrumb.blog, "Journal", l);
    assert.equal(m.not_found.link_blog, "Journal", l);
    assert.ok(/Journal/.test(m.booklet.close), l);
    assert.ok(/journal/i.test(m.seo_pages.blog.title) && !/blog/i.test(m.seo_pages.blog.title), l);
  }
  assert.equal(JSON.parse(readFileSync(join(root, "messages/fr.json"), "utf8")).seo_pages.blog.title, "Journal immobilier, analyses et fiscalité, MAPA Property");
});
test("base d'Elena : aucune ancienne valeur, 45 000 present", () => {
  for (const l of ["fr", "en", "de"]) {
    const k = getKnowledge(l);
    assert.ok(!/40[\s  .,]?000|loyers encaiss|selon l.?usage|collected rents|eingenommenen/i.test(k), l);
    assert.ok(/45[\s  .,]?000/.test(k), l);
  }
});
test("SQL 36 : trois UPDATE cibles, controle final", () => {
  const s = readFileSync(join(root, "supabase/sql/36_faq_corrections.sql"), "utf8");
  assert.equal((s.match(/^UPDATE public\.faqs/gm) ?? []).length, 3);
  for (const q of ["Qu''est-ce que le Bëllegen Akt ?", "Quels sont les honoraires de mise en location ?", "Combien coûte la gestion locative ?"]) assert.ok(s.includes(`WHERE question_fr = '${q}';`), q);
  assert.ok(/SELECT page_key, question_fr/.test(s));
  assert.ok(!/40 000|encaissés|selon l''usage/.test(s.replace(/^--.*$/gm, "")));
});

console.log(`${pass} PASS, 0 FAIL`);

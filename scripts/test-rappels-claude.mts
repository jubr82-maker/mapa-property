// Rappels Claude (nov. 2026) : echeances de la cle API et des credits avec
// une date simulee (J-61, J-60, J-15, J0, J+1), credit achete le 17/11/2026
// expirant le 17/11/2027, solde sous 10 %, un seul e-mail par palier,
// fonctionnement sans SQL 42. Sans reseau : base et e-mail simules.
// Lancement : node --import tsx scripts/test-rappels-claude.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "next-intl";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const d = await import("../lib/claude/deadlines");
const store = await import("../lib/claude/deadlines-store");

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
let pass = 0;
let fail = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    pass++;
    console.log(`PASS ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${name}\n  ${e instanceof Error ? e.message : e}`);
  }
};

/** Midi a Luxembourg, n jours avant (negatif) ou apres l'echeance. */
const around = (deadline: string, offset: number) => new Date(Date.parse(`${deadline}T11:00:00Z`) + offset * 86_400_000);
const base = (over: Partial<import("../lib/claude/deadlines").ClaudeDeadlines> = {}) => ({
  remindersReady: true,
  creditReady: true,
  apiKeyExpiresOn: d.DEFAULT_API_KEY_EXPIRES_ON,
  credit: null,
  sent: [],
  ...over,
});
const CREDIT = { amountUsd: 20, purchasedOn: "2026-11-17", expiresOn: d.addOneYear("2026-11-17") };
const kinds = (a: ReturnType<typeof d.claudeAlerts>) => a.map((x) => `${x.kind}:${x.level}`);

await test("credit achete le 17/11/2026 : expiration le 17/11/2027 ; 29/02 -> 28/02", () => {
  assert.equal(d.addOneYear("2026-11-17"), "2027-11-17");
  assert.equal(d.addOneYear("2028-02-29"), "2029-02-28");
  assert.equal(d.DEFAULT_API_KEY_EXPIRES_ON, "2027-12-31");
});

for (const [kind, deadline, over] of [
  ["cle", "2027-12-31", {}],
  ["credits", "2027-11-17", { apiKeyExpiresOn: "2030-01-01", credit: CREDIT }],
] as const) {
  const k = kind === "cle" ? "key" : "credit";
  await test(`${kind} : J-61 aucun bandeau, J-60 discret, J-15 urgent, J0 urgent, J+1 rouge`, () => {
    const dl = base(over);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, -61))), []);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, -60))), [`${k}:notice`]);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, -16))), [`${k}:notice`]);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, -15))), [`${k}:urgent`]);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, 0))), [`${k}:urgent`]);
    assert.deepEqual(kinds(d.claudeAlerts(dl, 15, around(deadline, 1))), [`${k}:expired`]);
    const a = d.claudeAlerts(dl, 15, around(deadline, -60))[0] as { days: number };
    assert.equal(a.days, 60);
  });
  await test(`${kind} : traduction bloquee seulement apres l'echeance`, () => {
    const dl = base(over);
    assert.equal(d.blockingExpiry(dl, around(deadline, 0)), null);
    assert.deepEqual(d.blockingExpiry(dl, around(deadline, 1)), { kind: k, date: deadline });
  });
}

await test("fuseau de Luxembourg : 31/12 a 23 h 30 = jour J, 1er janvier 0 h 30 = expire", () => {
  const dl = base();
  assert.equal(d.daysUntil("2027-12-31", new Date("2027-12-31T22:30:00Z")), 0);
  assert.equal(d.daysUntil("2027-12-31", new Date("2027-12-31T23:30:00Z")), -1);
  assert.equal(d.blockingExpiry(dl, new Date("2027-12-31T23:30:00Z"))?.kind, "key");
});

await test("solde sous 10 % : bandeau discret avec le montant ; 10 % ou plus : rien", () => {
  const dl = base({ credit: CREDIT });
  const now = new Date("2027-01-15T11:00:00Z");
  assert.deepEqual(d.claudeAlerts(dl, 1.99, now), [{ kind: "credit_low", level: "notice", remainingUsd: 1.99 }]);
  assert.deepEqual(d.claudeAlerts(dl, 2, now), []);
  assert.deepEqual(d.claudeAlerts(dl, -0.5, now), [{ kind: "credit_low", level: "notice", remainingUsd: 0 }]);
  assert.deepEqual(d.claudeAlerts(dl, null, now), []);
  assert.deepEqual(d.claudeAlerts(base(), 0, now), []);
});

type Mail = { subject: string; text: string };
const frMessages = JSON.parse(read("messages/fr.json"));
const tr = createTranslator({ locale: "fr", messages: { r: frMessages.admin_claude_reminders } as never, namespace: "r" as never }) as unknown as (k: string, v?: Record<string, string | number>) => string;
function harness(dl: import("../lib/claude/deadlines").ClaudeDeadlines, sendOk = true) {
  const mails: Mail[] = [];
  const state = { ...dl, sent: [...dl.sent] };
  return {
    mails,
    state,
    deps: {
      t: tr,
      load: async () => ({ ...state, sent: [...state.sent] }),
      saveSent: async (s: string[]) => {
        state.sent = s;
        return true;
      },
      send: async (subject: string, text: string) => {
        if (sendOk) mails.push({ subject, text });
        return sendOk;
      },
    },
  };
}

await test("un seul e-mail par palier (J-60, J-15, J0), rien les autres jours", async () => {
  const h = harness(base());
  for (let off = -70; off <= 10; off++) await store.runClaudeReminders(around("2027-12-31", off), h.deps);
  assert.equal(h.mails.length, 3);
  assert.match(h.mails[0].subject, /Rappel : la clé API Claude expire le 31 décembre 2027/);
  assert.match(h.mails[0].text, /dans 60 jours/);
  assert.match(h.mails[1].text, /dans 15 jours/);
  assert.match(h.mails[2].subject, /aujourd'hui/);
  assert.match(h.mails[2].text, /console Claude/);
});

await test("date saisie tard (deja a J-10) : un seul e-mail, paliers inferieurs marques", async () => {
  const h = harness(base({ apiKeyExpiresOn: "2030-01-01", credit: CREDIT }));
  await store.runClaudeReminders(around("2027-11-17", -10), h.deps);
  await store.runClaudeReminders(around("2027-11-17", -9), h.deps);
  assert.equal(h.mails.length, 1);
  assert.match(h.mails[0].text, /achetés le 17 novembre 2026 expirent le 17 novembre 2027/);
  assert.ok(h.state.sent.includes("credit:2027-11-17:d60") && h.state.sent.includes("credit:2027-11-17:d15"));
});

await test("nouvelle date de cle : les rappels repartent pour la nouvelle echeance", async () => {
  const h = harness(base({ sent: ["key:2027-12-31:d60", "key:2027-12-31:d15", "key:2027-12-31:d0"] }));
  h.state.apiKeyExpiresOn = "2028-12-31";
  await store.runClaudeReminders(around("2028-12-31", -60), h.deps);
  assert.equal(h.mails.length, 1);
  assert.deepEqual(h.state.sent, ["key:2028-12-31:d60"]);
});

await test("envoi en echec : rien n'est marque, nouvel essai le lendemain", async () => {
  const h = harness(base(), false);
  const r = await store.runClaudeReminders(around("2027-12-31", -60), h.deps);
  assert.equal(r.ok, false);
  assert.deepEqual(h.state.sent, []);
});

await test("envoi d'e-mails non configure : pas d'echec quotidien, rien n'est marque", async () => {
  const h = harness(base());
  const r = await store.runClaudeReminders(around("2027-12-31", 1), { ...h.deps, send: async () => "skipped" as const });
  assert.deepEqual(r, { ok: true, detail: "smtp_not_configured" });
  assert.deepEqual(h.state.sent, []);
});

await test("sans SQL 42 : aucun e-mail (pas de memoire), aucune erreur", async () => {
  const h = harness(base({ remindersReady: false }));
  const r = await store.runClaudeReminders(around("2027-12-31", 0), h.deps);
  assert.deepEqual(r, { ok: true, detail: "not_ready" });
  assert.equal(h.mails.length, 0);
});

await test("sans SQL execute : lecture sans plantage, cle au 31/12/2027, credit non renseigne", async () => {
  const missing = { error: { code: "PGRST205", message: "missing" }, data: null };
  const fake = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => missing }) }) }) };
  const dl = await store.loadClaudeDeadlines(fake as never);
  assert.equal(dl.remindersReady, false);
  assert.equal(dl.creditReady, false);
  assert.equal(dl.apiKeyExpiresOn, "2027-12-31");
  assert.equal(dl.credit, null);
  const boom = { from: () => { throw new Error("db down"); } };
  const dl2 = await store.loadClaudeDeadlines(boom as never);
  assert.equal(dl2.apiKeyExpiresOn, "2027-12-31");
  // Tache quotidienne sans cle service_role : sans effet.
  assert.deepEqual(await store.sendClaudeReminders(new Date()), { ok: true, detail: "stubbed" });
});

await test("branchements : tableau de bord, Sante du site, bouton, tache quotidienne", () => {
  const dash = read("app/admin/page.tsx");
  assert.ok(dash.indexOf("<ClaudeAlerts") < dash.indexOf("<PageHeader"), "bandeaux en haut");
  assert.ok(read("app/admin/sante/page.tsx").includes("<ClaudeAlerts"));
  const act = read("app/admin/properties/claude-actions.ts");
  assert.ok(act.indexOf("blockingExpiry(") < act.indexOf("translateListing(source"), "controle avant l'appel");
  assert.ok(read("lib/pilotage/daily-task.ts").includes('step("claude_reminders", () => sendClaudeReminders(now))'));
  assert.ok(!/ANTHROPIC_API_KEY/.test(read("lib/claude/deadlines-store.ts") + read("lib/claude/deadlines.ts") + read("components/admin/ClaudeAlerts.tsx")));
});

await test("textes fr, en, de presents, sans tiret long ni moyen", () => {
  const keys = ["key_notice", "key_today", "key_expired", "key_todo", "credit_notice", "credit_today", "credit_expired", "credit_todo", "credit_low"];
  for (const loc of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${loc}.json`));
    for (const k of keys) assert.ok(m.admin_claude_reminders[k], `${loc} ${k}`);
    for (const k of ["err_key_expired", "err_credit_expired", "key_date", "credit_expires"]) assert.ok(m.admin_claude[k], `${loc} ${k}`);
    const all = JSON.stringify(m.admin_claude_reminders) + JSON.stringify(m.admin_claude);
    assert.ok(!/[–—]/.test(all), `${loc} tiret`);
  }
  const fr = JSON.parse(read("messages/fr.json")).admin_claude_reminders;
  assert.equal(fr.key_expired, "La clé API Claude a expiré le {date} : la traduction Claude ne fonctionne plus.");
  assert.equal(fr.credit_low, "Crédit Claude presque épuisé : {amount} restant.");
});

await test("SQL 42 : table creee si absente, aucune suppression de donnees", () => {
  const sql = read("supabase/sql/42_rappels_claude.sql").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS public.claude_reminders"));
  assert.ok(sql.includes("ON CONFLICT (id) DO NOTHING"));
  assert.ok(!/DROP TABLE|DELETE FROM|TRUNCATE|ALTER TABLE public\.claude_credit/i.test(sql));
});

console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);

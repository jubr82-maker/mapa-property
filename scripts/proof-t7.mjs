// scripts/proof-t7.mjs — BUG T7 : prévention pollution leads E2E.
//  1) Unit isTestEmail : matche e2e.*/scan.*/*@example.* ; laisse
//     passer les vrais emails.
//  2) Wiring : les 4 endpoints (lead, nda-request, contact, estimate)
//     appellent bien shouldDropTestLead.
//  3) Migration de purge présente.
import { readFileSync } from "node:fs";

// Miroir EXACT de lib/test-email.ts (TEST_EMAIL_RE).
const TEST_EMAIL_RE = /(@example\.[a-z]+$)|(^(e2e|scan)[.@])/i;
const isTestEmail = (e) => typeof e === "string" && TEST_EMAIL_RE.test(e.trim());

const drop = [
  "e2e.lead@example.test",
  "scan.contact@example.com",
  "e2e.rgpd@example.test",
  "e2e.t3@example.test",
  "e2e.estim.t4@example.test",
  "scan.maison@example.org",
];
const keep = [
  "julien@mapaproperty.lu",
  "j.brebion@mapagroup.org",
  "client.reel@gmail.com",
  "marie.dupont@orange.fr",
  "contact@exemple.fr", // 'exemple' (FR) != 'example'
];
let unitOk = true;
for (const e of drop) {
  const r = isTestEmail(e);
  if (!r) unitOk = false;
  console.log(`${r ? "OK " : "KO "}drop  ${e}`);
}
for (const e of keep) {
  const r = isTestEmail(e);
  if (r) unitOk = false;
  console.log(`${!r ? "OK " : "KO "}keep  ${e}`);
}

const routes = [
  "app/api/lead/route.ts",
  "app/api/nda-request/route.ts",
  "app/api/contact/route.ts",
  "app/api/estimate/route.ts",
];
let wiringOk = true;
for (const f of routes) {
  const src = readFileSync(f, "utf8");
  const wired =
    src.includes('from "@/lib/test-email"') &&
    src.includes("shouldDropTestLead");
  if (!wired) wiringOk = false;
  console.log(`${wired ? "OK " : "KO "}wired ${f}`);
}

let migOk = true;
try {
  const m = readFileSync("supabase/migrations/20260518_clean_e2e_leads.sql", "utf8");
  migOk = /DELETE FROM public\.leads/i.test(m) && /estimation_requests/i.test(m);
} catch {
  migOk = false;
}
console.log(`${migOk ? "OK " : "KO "}migration purge presente`);

const ok = unitOk && wiringOk && migOk;
console.log(ok ? "T7 PROOF: OK ✅" : "T7 PROOF: KO ❌");
process.exit(ok ? 0 : 1);

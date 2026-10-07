// Tests de la sauvegarde quotidienne (oct. 2026), sans reseau :
// chiffrement aller-retour, rotation des 30 sauvegardes, e-mail sans
// donnee personnelle, echec signale, SQL de restauration.
// Lancement : node --import tsx scripts/test-backup.mts
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { decryptBackup, encryptBackup, parseBackupKey } from "../lib/backup/crypto";
import { KEEP_BACKUPS, keysToDelete, listStamps, stampOf } from "../lib/backup/rotation";
import { runNightlyBackup, type NightlyDeps } from "../lib/backup/nightly";
import { buildBackupReport } from "../lib/backup/report";
import type { BackupPayload } from "../lib/backup/export";

const root = join(import.meta.dirname, "..");
let n = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    n++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e instanceof Error ? e.message : String(e)}`);
  }
}
const fr = JSON.parse(readFileSync(join(root, "messages/fr.json"), "utf8")).backup_report as Record<string, string>;
const t = (k: string, v: Record<string, string | number> = {}) => (fr[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => String(v[x] ?? ""));
const keyB64 = randomBytes(32).toString("base64");

const payload: BackupPayload = {
  format: "mapa-backup-v1",
  created_at: "2026-10-08T01:00:00.000Z",
  catalog: {
    generated_at: "2026-10-08T01:00:00Z",
    sequences: [{ name: "cron_runs_id_seq", last_value: 42 }],
    tables: [
      { name: "leads", rls: true, primary_key: ["id"], columns: [{ name: "id", type: "uuid", not_null: true, default: "gen_random_uuid()", identity: null }, { name: "email", type: "text", not_null: false, default: null, identity: null }], constraints: [{ name: "leads_pkey", type: "p", def: "PRIMARY KEY (id)" }], indexes: [], policies: [{ name: "leads_admin_all", permissive: "PERMISSIVE", cmd: "ALL", roles: ["authenticated"], using: "is_mapa_admin()", check: "is_mapa_admin()" }] },
      { name: "cron_runs", rls: true, primary_key: ["id"], columns: [{ name: "id", type: "bigint", not_null: true, default: "nextval('cron_runs_id_seq'::regclass)", identity: null }], constraints: [{ name: "cron_runs_pkey", type: "p", def: "PRIMARY KEY (id)" }], indexes: ["CREATE INDEX cron_runs_idx ON public.cron_runs USING btree (id)"], policies: [] },
    ],
  },
  data: {
    leads: [{ id: "1", email: "marie.exemple@example.org" }, { id: "2", email: "o'brien$mapa_json$@example.org" }],
    cron_runs: [{ id: 1 }],
  },
};

function fakeDeps(over: Partial<NightlyDeps> = {}) {
  const store = new Map<string, Buffer>();
  const records: { task: string; ok: boolean; detail: string }[] = [];
  const deps: NightlyDeps = {
    exportDb: async () => payload,
    put: async (k, b) => void store.set(k, b),
    list: async (p) => [...store.keys()].filter((k) => k.startsWith(p)).map((key) => ({ key })),
    remove: async (k) => void store.delete(k),
    record: async (task, ok, detail) => void records.push({ task, ok, detail }),
    keyBase64: keyB64,
    now: () => new Date("2026-10-08T01:00:04Z"),
    ...over,
  };
  return { deps, store, records };
}

console.log("Sauvegarde quotidienne");

await test("chiffrement AES-256-GCM aller-retour, alteration et mauvaise cle refusees", () => {
  const key = parseBackupKey(keyB64);
  const plain = Buffer.from("contenu de test");
  const enc = encryptBackup(plain, key);
  assert.ok(!enc.includes(plain), "le clair n'apparait pas");
  assert.deepEqual(decryptBackup(enc, key), plain);
  const tampered = Buffer.from(enc);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptBackup(tampered, key));
  assert.throws(() => decryptBackup(enc, parseBackupKey(randomBytes(32).toString("base64"))));
  assert.notDeepEqual(encryptBackup(plain, key), enc, "vecteur d'initialisation aleatoire");
  assert.throws(() => parseBackupKey(""), /backup_key_missing/);
  assert.throws(() => parseBackupKey(Buffer.alloc(16).toString("base64")), /backup_key_invalid/);
});

await test("rotation : 30 sauvegardes gardees, les plus anciennes supprimees avec leur resume", () => {
  const objects = Array.from({ length: 35 }, (_, i) => {
    const s = stampOf(new Date(Date.UTC(2026, 8, 1 + i, 1, 0, 0)));
    return [{ key: `backups/nightly/${s}.json.gz.enc` }, { key: `backups/nightly/${s}.counts.json` }];
  }).flat();
  objects.push({ key: "backups/backup-2026-06-22-14-32-08.sql.gz" });
  const del = keysToDelete(objects);
  assert.equal(del.length, 10, "5 sauvegardes x 2 fichiers");
  assert.ok(del.every((k) => /2026-09-0[1-5]T/.test(k)), "les 5 plus anciennes");
  assert.ok(!del.includes("backups/backup-2026-06-22-14-32-08.sql.gz"), "sauvegardes manuelles hors rotation");
  const left = objects.filter((o) => !del.includes(o.key));
  assert.equal(listStamps(left).length, KEEP_BACKUPS);
});

await test("nuit : fichier chiffre puis dechiffrable, resume sans contenu, resultat dans cron_runs", async () => {
  const { deps, store, records } = fakeDeps();
  const r = await runNightlyBackup(deps);
  assert.ok(r.ok, r.detail);
  const enc = store.get("backups/nightly/2026-10-08T01-00-04Z.json.gz.enc")!;
  assert.ok(enc && !enc.includes(Buffer.from("marie.exemple")), "aucune donnee en clair");
  const back = JSON.parse(gunzipSync(decryptBackup(enc, parseBackupKey(keyB64))).toString("utf8"));
  assert.deepEqual(back, payload);
  const summary = store.get("backups/nightly/2026-10-08T01-00-04Z.counts.json")!.toString("utf8");
  assert.ok(!summary.includes("@"), "resume sans adresse");
  assert.deepEqual(JSON.parse(summary).counts, { leads: 2, cron_runs: 1 });
  assert.equal(records.length, 1);
  assert.ok(records[0].task === "backup" && records[0].ok && !records[0].detail.includes("@"));
});

await test("nuit : rotation appliquee par la tache elle-meme", async () => {
  const { deps, store } = fakeDeps();
  for (let i = 0; i < 31; i++) store.set(`backups/nightly/${stampOf(new Date(Date.UTC(2026, 8, 1 + i, 1)))}.json.gz.enc`, Buffer.from("x"));
  const r = await runNightlyBackup(deps);
  assert.ok(r.ok);
  assert.equal(listStamps([...store.keys()].map((key) => ({ key }))).length, 30);
  assert.equal(r.deleted, 2);
});

await test("echec signale : cle absente (aucun fichier envoye), export en erreur", async () => {
  const a = fakeDeps({ keyBase64: undefined });
  let exported = false;
  a.deps.exportDb = async () => ((exported = true), payload);
  const r1 = await runNightlyBackup(a.deps);
  assert.ok(!r1.ok && /backup_key_missing/.test(r1.detail));
  assert.ok(!exported && a.store.size === 0, "rien n'est exporte ni envoye sans cle");
  assert.ok(a.records[0].task === "backup" && !a.records[0].ok);
  const b = fakeDeps({ exportDb: async () => { throw new Error("time_budget_exceeded_at_tracking_events"); } });
  const r2 = await runNightlyBackup(b.deps);
  assert.ok(!r2.ok && r2.detail.includes("time_budget_exceeded_at_tracking_events"));
});

await test("e-mail : date, taille, lignes, evolution, nombre conserve ; aucune donnee personnelle", () => {
  const mail = buildBackupReport({ date: "8 octobre 2026", ok: true, sizeBytes: 3_500_000, counts: { leads: 2, cron_runs: 12 }, previousCounts: { leads: 1, cron_runs: 12 }, kept: 30 }, t);
  assert.equal(mail.subject, "Sauvegarde de la base réussie, 8 octobre 2026");
  for (const want of ["3,34 Mo", "- leads : 2 (+1)", "- cron_runs : 12 (inchangé)", "Sauvegardes conservées : 30", "photos et documents"]) assert.ok(mail.text.includes(want), want);
  assert.ok(!/@|example|marie/i.test(mail.subject + mail.text), "aucune adresse ni contenu");
  const src = readFileSync(join(root, "lib/backup/report-step.ts"), "utf8");
  assert.ok(!/attachments/.test(src) && src.includes("BACKUP_REPORT_RECIPIENT"), "aucune piece jointe");
});

await test("e-mail d'echec : objet explicite et cause en clair", () => {
  const mail = buildBackupReport({ date: "8 octobre 2026", ok: false, cause: fr.cause_not_run, kept: 29 }, t);
  assert.ok(mail.subject.startsWith("Échec de la sauvegarde"));
  assert.ok(mail.text.includes("Cause : aucune sauvegarde n'a été lancée cette nuit"));
});

await test("restauration : SQL complet, apostrophes et balises de citation protegees, production protegee", async () => {
  process.env.BACKUP_ENCRYPTION_KEY = keyB64;
  const { restoreSql } = await import("./restore-backup.mjs");
  const sql = restoreSql(payload) as string;
  for (const want of ['CREATE TABLE public."leads"', "jsonb_populate_recordset(NULL::public.\"leads\"", 'ADD CONSTRAINT "leads_pkey" PRIMARY KEY (id)', "CREATE INDEX cron_runs_idx", "setval('public.\"cron_runs_id_seq\"', 42)", 'ENABLE ROW LEVEL SECURITY', 'CREATE POLICY "leads_admin_all"']) assert.ok(sql.includes(want), want);
  assert.ok(sql.includes("$mapa_json_x$"), "balise changee si la donnee contient $mapa_json$");
  const script = readFileSync(join(root, "scripts/restore-backup.mjs"), "utf8");
  assert.ok(script.includes("RESTAURER EN PRODUCTION ${PRODUCTION_REF}") && script.includes("if (target.includes(PRODUCTION_REF))"));
  assert.ok(script.includes("RESTAURER DANS UNE BASE NON VIDE"));
});

await test("tache planifiee : garde CRON_SECRET, duree bornee, 01:00 UTC, compte rendu du matin", () => {
  const route = readFileSync(join(root, "app/api/cron/backup/route.ts"), "utf8");
  assert.ok(route.includes("if (!isAuthorizedCron(req))") && route.includes("export const maxDuration = 300") && route.includes("EXPORT_BUDGET_MS = 240_000"));
  assert.ok(route.includes("process.env.BACKUP_ENCRYPTION_KEY") && !/console\.log\(.*KEY/.test(route));
  const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
  assert.ok(vercel.crons.some((c: { path: string; schedule: string }) => c.path === "/api/cron/backup" && c.schedule === "0 1 * * *"));
  assert.ok(readFileSync(join(root, "lib/pilotage/daily-task.ts"), "utf8").includes('step("backup_report"'));
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);

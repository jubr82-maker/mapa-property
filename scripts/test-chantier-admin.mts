// Chantier admin (nov. 2026) : case « Indexation demandee », enregistrement
// des photos, editeur (gras, italique), budget Claude, bulle d'Elena.
// Sans reseau : base simulee en memoire.
// Lancement : node --import tsx scripts/test-chantier-admin.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// ---------------------------------------------------------------- base simulee
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>, opts: { missing?: string[]; failOn?: (table: string, op: string, payload?: unknown) => boolean } = {}) {
  const log: string[] = [];
  const err = (table: string) => (opts.missing?.includes(table) ? { code: "PGRST205", message: "missing" } : null);
  function from(table: string) {
    const filters: [string, unknown][] = [];
    const inFilters: [string, unknown[]][] = [];
    const likes: [string, string][] = [];
    let op = "select";
    let payload: unknown = null;
    let onConflict = "id";
    const rows = () => (tables[table] ??= []);
    const match = (r: Row) => filters.every(([k, v]) => r[k] === v) && inFilters.every(([k, vs]) => vs.includes(r[k])) && likes.every(([k, p]) => String(r[k] ?? "").startsWith(p.replace(/%$/, "")));
    const run = () => {
      const e = err(table);
      if (e) return { data: null, error: e };
      if (opts.failOn?.(table, op, payload)) return { data: null, error: { code: "XX000", message: "boom" } };
      log.push(`${table}:${op}`);
      if (op === "select") return { data: rows().filter(match).map((r) => ({ ...r })), error: null };
      if (op === "delete") {
        const keep = rows().filter((r) => !match(r));
        const removed = rows().length - keep.length;
        tables[table] = keep;
        return { data: null, error: null, count: removed };
      }
      if (op === "update") {
        const hit = rows().filter(match);
        for (const r of hit) Object.assign(r, payload as Row);
        return { data: hit.map((r) => ({ ...r })), error: null };
      }
      if (op === "insert" || op === "upsert") {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
        for (const p of list) {
          const i = op === "upsert" ? rows().findIndex((r) => r[onConflict] === p[onConflict]) : -1;
          if (i >= 0) Object.assign(rows()[i], p);
          else rows().push({ ...p });
        }
        return { data: list, error: null };
      }
      return { data: null, error: null };
    };
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push([k, v]), q),
      in: (k: string, vs: unknown[]) => (inFilters.push([k, vs]), q),
      like: (k: string, pat: string) => (likes.push([k, pat]), q),
      gte: () => q,
      order: () => q,
      limit: () => q,
      range: () => q,
      maybeSingle: async () => {
        const r = run();
        return { ...r, data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data };
      },
      upsert: (p: unknown, o?: { onConflict?: string }) => ((op = "upsert"), (payload = p), (onConflict = o?.onConflict ?? "id"), q),
      insert: (p: unknown) => ((op = "insert"), (payload = p), q),
      update: (p: unknown) => ((op = "update"), (payload = p), q),
      delete: () => ((op = "delete"), q),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  }
  return { from, tables, log } as unknown as import("@supabase/supabase-js").SupabaseClient & { tables: Record<string, Row[]>; log: string[] };
}

// ================================================================ ETAPE 1
const ir = await import("../lib/pilotage/index-requests");
const irs = await import("../lib/pilotage/index-requests-store");
const U = (p: string) => `https://mapaproperty.lu/fr/${p}`;
const pending = [
  { url: U("a"), key: "g_pending_discovered" as const },
  { url: U("b"), key: "g_pending_crawled" as const },
];

await test("indexation : cochee, la ligne quitte « A soumettre » et passe dans « Deja demandees »", async () => {
  const db = fakeDb({ index_requests: [] });
  assert.equal(await irs.setIndexRequest(db, U("a"), true, "2026-11-18"), "ok");
  const { requests } = await irs.loadIndexRequests(db);
  const s = ir.splitIndexRequests(pending, new Map(pending.map((p) => [p.url, p.key])), requests, "2026-11-18");
  assert.deepEqual(s.toSubmit.map((x) => x.url), [U("b")]);
  assert.deepEqual(s.requested.map((x) => [x.url, x.requestedOn]), [[U("a"), "2026-11-18"]]);
  assert.equal(s.requestedToday, 1);
});

await test("indexation : decochee, la ligne revient dans « A soumettre »", async () => {
  const db = fakeDb({ index_requests: [{ url: U("a"), requested_on: "2026-11-18" }] });
  assert.equal(await irs.setIndexRequest(db, U("a"), false, "2026-11-18"), "ok");
  const { requests } = await irs.loadIndexRequests(db);
  const s = ir.splitIndexRequests(pending, new Map(), requests, "2026-11-18");
  assert.deepEqual(s.toSubmit.map((x) => x.url), [U("a"), U("b")]);
  assert.equal(s.requested.length, 0);
  assert.equal(s.requestedToday, 0);
});

await test("indexation : indexee ensuite, elle disparait de partout", () => {
  const stillPending = pending.filter((p) => p.url !== U("a"));
  const s = ir.splitIndexRequests(stillPending, new Map([[U("a"), "g_indexed" as const]]), [{ url: U("a"), requestedOn: "2026-11-18" }], "2026-11-20");
  assert.ok(!s.toSubmit.some((x) => x.url === U("a")));
  assert.ok(!s.requested.some((x) => x.url === U("a")));
});

await test("indexation : non indexee, reste « Deja demandees » 13 jours, revient apres 14 jours avec la date", () => {
  const req = [{ url: U("a"), requestedOn: "2026-11-18" }];
  const d13 = ir.splitIndexRequests(pending, new Map(), req, "2026-12-01");
  assert.ok(d13.requested.some((x) => x.url === U("a")));
  assert.ok(!d13.toSubmit.some((x) => x.url === U("a")));
  const d14 = ir.splitIndexRequests(pending, new Map(), req, "2026-12-02");
  const back = d14.toSubmit.find((x) => x.url === U("a"));
  assert.equal(back?.requestedOn, "2026-11-18");
  assert.ok(!d14.requested.some((x) => x.url === U("a")));
  assert.equal(d14.requestedToday, 0);
});

await test("indexation : sans SQL 43, rien ne plante (lecture vide, ecriture « pas prete »)", async () => {
  const db = fakeDb({}, { missing: ["index_requests"] });
  assert.deepEqual(await irs.loadIndexRequests(db), { ready: false, requests: [] });
  assert.equal(await irs.setIndexRequest(db, U("a"), true, "2026-11-18"), "not_ready");
});

await test("indexation : compteur « environ 10 » affiche en fr, en, de", () => {
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).admin_controle;
    for (const k of ["requested_label", "requested_today", "requested_title", "requested_pending", "requested_again"]) assert.ok(m[k], `${l}.${k}`);
  }
  assert.match(JSON.parse(read("messages/fr.json")).admin_controle.requested_today, /environ \{limit\} possibles par jour/);
  assert.equal(ir.DAILY_REQUESTS_APPROX, 10);
});

// ================================================================ ETAPE 2
const plan = await import("../lib/admin/photo-save-plan");
const ps = await import("../lib/admin/property-photos-save");
const pimg = await import("../lib/property-images");
const PID = "11111111-1111-1111-1111-111111111111";
const S = (n: string) => `https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/property-images/${PID}/${n}.webp`;
const A = (n: number) => `https://media.apimo.pro/cache/${n}.jpg`;
const rowsOf = (db: ReturnType<typeof fakeDb>) => (db.tables.property_images ?? []).filter((r) => r.property_id === PID);
const publicOf = (db: ReturnType<typeof fakeDb>) => pimg.selectPublicImages(rowsOf(db) as { url: string; sort: number }[]).map((r) => r.url);
const seed = () =>
  fakeDb({
    property_images: [
      { property_id: PID, url: S("a"), sort: 0, alt_fr: "Salon", room_id: "r1" },
      { property_id: PID, url: A(1), sort: 1 },
      { property_id: PID, url: S("b"), sort: 2, alt_fr: "Cuisine" },
      { property_id: PID, url: S("c"), sort: 3 },
      { property_id: PID, url: A(2), sort: 4 },
    ],
  });

await test("photos : la cause (admin 5 lignes, fiche 3) disparait, l'admin montre la selection publique", async () => {
  const db = seed();
  const v = ps.visiblePhotos(rowsOf(db) as { url: string; sort: number }[]);
  assert.deepEqual(v.photos.map((p) => p.url), [S("a"), S("b"), S("c")]);
  assert.equal(v.hiddenCount, 2);
  assert.equal(v.photos[0].path, `${PID}/a.webp`);
  const page = read("app/admin/properties/[id]/page.tsx");
  assert.match(page, /const publicRows = selectPublicImages\(imgRows\)/);
  assert.match(page, /initialPhotos: PhotoData\[\] = publicRows\.map/);
});

await test("photos : ordre change, la fiche suit exactement l'ordre de l'admin", async () => {
  const db = seed();
  const r = await ps.savePhotoRows(db, PID, [S("c"), S("a"), S("b")], []);
  assert.ok(r.ok);
  assert.deepEqual(publicOf(db), [S("c"), S("a"), S("b")]);
  assert.deepEqual(r.ok && r.photos.map((p) => p.url), [S("c"), S("a"), S("b")]);
  assert.ok(!db.log.includes("property_images:delete"), "aucun effacement");
});

await test("photos : photo principale = premiere de la liste", async () => {
  const db = seed();
  await ps.savePhotoRows(db, PID, [S("b"), S("a"), S("c")], []);
  assert.equal(pimg.publicCoverUrl(rowsOf(db) as { url: string; sort: number }[]), S("b"));
});

await test("photos : version amelioree puis retour a l'original, textes alternatifs conserves", async () => {
  const db = seed();
  const enh = S("a.enhanced");
  // applyPhotoEnhancement change l'adresse de la ligne, puis l'ecran enregistre.
  rowsOf(db).find((r) => r.url === S("a"))!.url = enh;
  await ps.savePhotoRows(db, PID, [enh, S("b"), S("c")], []);
  assert.equal(publicOf(db)[0], enh);
  assert.equal(rowsOf(db).find((r) => r.url === enh)?.alt_fr, "Salon");
  rowsOf(db).find((r) => r.url === enh)!.url = S("a");
  await ps.savePhotoRows(db, PID, [S("a"), S("b"), S("c")], []);
  assert.equal(publicOf(db)[0], S("a"));
  assert.equal(rowsOf(db).find((r) => r.url === S("a"))?.room_id, "r1");
});

await test("photos : suppression d'une seule photo, les autres (et les images masquees) restent", async () => {
  const db = seed();
  const r = await ps.savePhotoRows(db, PID, [S("a"), S("c")], [S("b")]);
  assert.ok(r.ok);
  assert.deepEqual(publicOf(db), [S("a"), S("c")]);
  assert.equal(rowsOf(db).length, 4, "seule la ligne de la photo supprimee part");
  assert.ok(rowsOf(db).some((x) => x.url === A(1)) && rowsOf(db).some((x) => x.url === A(2)));
  assert.equal(rowsOf(db).find((x) => x.url === S("c"))?.alt_fr, undefined);
  assert.equal(rowsOf(db).find((x) => x.url === S("a"))?.alt_fr, "Salon");
});

await test("photos : ligne inconnue de l'ecran jamais retiree (liste perimee)", () => {
  const p = plan.planPhotoSave([{ url: S("a"), sort: 0 }, { url: S("x"), sort: 1 }], [S("a")], []);
  assert.deepEqual(p.remove, []);
  assert.deepEqual(p.after.map((a) => a.url), [S("a"), S("x")]);
});

await test("photos : ajout d'une photo, inseree a sa place, rien d'efface", async () => {
  const db = seed();
  const r = await ps.savePhotoRows(db, PID, [S("a"), S("new"), S("b"), S("c")], []);
  assert.ok(r.ok);
  assert.deepEqual(publicOf(db), [S("a"), S("new"), S("b"), S("c")]);
  assert.ok(!db.log.includes("property_images:delete"));
});

await test("photos : enregistrement interrompu a chaque etape, la galerie n'est jamais vide", async () => {
  for (const step of ["insert", "update", "delete"]) {
    const db = fakeDb(seed().tables, { failOn: (t, op) => t === "property_images" && op === step });
    const r = await ps.savePhotoRows(db, PID, [S("new"), S("c"), S("a")], [S("b")]);
    assert.equal(r.ok, false, step);
    const visible = publicOf(db);
    assert.ok(visible.length >= 3, `${step} : ${visible.length} photo(s) visibles`);
    assert.ok(visible.includes(S("a")) && visible.includes(S("c")), step);
  }
  // Base injoignable des la lecture : rien n'est ecrit.
  const db = fakeDb(seed().tables, { failOn: (t, op) => t === "property_images" && op === "select" });
  const r = await ps.savePhotoRows(db, PID, [], []);
  assert.equal(r.ok, false);
  assert.equal(publicOf(fakeDb(db.tables)).length, 3);
});

await test("photos : plus aucun effacement global ni rechargement de la page admin a l'enregistrement", () => {
  const actions = read("app/admin/properties/[id]/photos/actions.ts");
  const save = actions.slice(actions.indexOf("export async function savePropertyPhotos"), actions.indexOf("export async function deletePropertyPhoto"));
  assert.ok(!/\.delete\(\)/.test(save));
  const lib = read("lib/admin/property-photos-save.ts");
  assert.match(lib, /\.delete\(\)\.eq\("property_id", propertyId\)\.in\("url", plan\.remove\)/);
  const section = read("components/admin/PropertyPhotosSection.tsx");
  assert.match(section, /fetch\(`\/api\/admin\/properties\/\$\{propertyId\}\/photos`/);
  const route = read("app/api/admin/properties/[id]/photos/route.ts");
  assert.ok(route.indexOf("requireAdminRoute()") < route.indexOf("persistPropertyPhotos(admin"));
  const pm = read("components/admin/PhotoManager.tsx");
  assert.match(pm, /onKeyDown=\{onItemKeyDown\(idx\)\}/);
  assert.match(pm, /data-photo-save-state=\{saveState\}/);
  assert.match(pm, /<Image\b[\s\S]*?sizes="\(min-width: 64rem\) 200px/);
  assert.match(read("app/admin/properties/[id]/page.tsx"), /t\("view_online"\)/);
});

await test("photos (controle neutre) : adresse etrangere refusee, amelioration dans la file, fiche toujours mise a jour", async () => {
  const db = seed();
  const r = await ps.savePhotoRows(db, PID, [S("a"), "https://example.com/x.jpg"], []);
  assert.equal(r.ok, false);
  assert.equal(rowsOf(db).length, 5, "rien d'ecrit");
  const other = await ps.savePhotoRows(db, PID, [S("a"), S("b").replace(PID, "22222222-2222-2222-2222-222222222222")], []);
  assert.equal(other.ok, false);
  const pm = read("components/admin/PhotoManager.tsx");
  assert.match(pm, /await exclusive\(async \(\) => \{\s*const res = await enhance\.apply/);
  assert.match(pm, /await exclusive\(async \(\) => \{\s*const res = await enhance\.revert/);
  const lib = read("lib/admin/property-photos-save.ts");
  assert.ok(!/if \(r\.changed\) await revalidatePropertyChange/.test(lib));
  assert.match(lib, /await revalidatePropertyChange\(\[await readPropertyRevalRow/);
});

// ================================================================ ETAPE 3
{
  const { createRequire } = await import("node:module");
  const req = createRequire(createRequire(import.meta.url).resolve("@tiptap/react"));
  const pmState = req("@tiptap/pm/state");
  const pmCmd = req("@tiptap/pm/commands");
  const core = await import("@tiptap/react");
  const StarterKit = (await import("@tiptap/starter-kit")).default;
  const schema = core.getSchema([StarterKit.configure({ heading: false, blockquote: false, codeBlock: false, bulletList: false, orderedList: false, listItem: false, horizontalRule: false, strike: false, code: false, underline: false, link: false })]);
  const make = () => {
    const doc = schema.node("doc", null, [schema.node("paragraph", null, [schema.text("Bonjour le monde")])]);
    return pmState.EditorState.create({ schema, doc });
  };
  const marksOf = (s: { doc: { toJSON(): unknown } }) => JSON.stringify(s.doc.toJSON()).match(/"type":"(bold|italic)"/g) ?? [];
  // Selection du mot « Bonjour » (positions 1 a 8).
  const select = (s: ReturnType<typeof make>) => s.apply(s.tr.setSelection(pmState.TextSelection.create(s.doc, 1, 8)));

  await test("editeur : selectionner du texte ne change pas sa mise en forme, B et I eteints", () => {
    const before = make();
    const after = select(before);
    assert.ok(after.doc.eq(before.doc));
    assert.deepEqual(marksOf(after), []);
    assert.equal(core.isActive(after, "bold"), false);
    assert.equal(core.isActive(after, "italic"), false);
    assert.equal(after.storedMarks, null);
  });

  await test("editeur : clic sur B met le texte selectionne en gras, B allume", () => {
    let s = select(make());
    pmCmd.toggleMark(schema.marks.bold)(s, (tr: unknown) => (s = s.apply(tr as never)));
    assert.deepEqual(marksOf(s), ['"type":"bold"']);
    assert.equal(core.isActive(s, "bold"), true);
    assert.equal(core.isActive(s, "italic"), false);
  });

  await test("editeur : clic sur I met le texte selectionne en italique, I allume", () => {
    let s = select(make());
    pmCmd.toggleMark(schema.marks.italic)(s, (tr: unknown) => (s = s.apply(tr as never)));
    assert.deepEqual(marksOf(s), ['"type":"italic"']);
    assert.equal(core.isActive(s, "italic"), true);
  });

  await test("editeur : aucune regle de saisie automatique ni raccourci en plus, boutons a jour a chaque selection", () => {
    const safety = read("components/admin/editor-safety.ts");
    assert.match(safety, /enableInputRules: false, enablePasteRules: false/);
    assert.match(safety, /"Mod-B": swallow, "Mod-I": swallow, "Mod-u": swallow, "Mod-U": swallow/);
    for (const f of ["components/admin/RichTextEditor.tsx", "components/admin/BlogBodyEditor.tsx"]) {
      const src = read(f);
      assert.match(src, /\.\.\.NO_AUTO_FORMAT/, f);
      assert.match(src, /OnlyBoldItalicShortcuts/, f);
      assert.match(src, /onMouseDown=\{\(e\) => e\.preventDefault\(\)\}/, f);
      assert.ok(!/editor\?*\.isActive\(/.test(src.slice(src.indexOf("function Toolbar"))), `${f} : etat lu sans abonnement`);
    }
    assert.match(read("components/admin/RichTextEditor.tsx"), /underline: false,\s*link: false/);
    assert.match(read("components/admin/BlogBodyEditor.tsx"), /autolink: false, linkOnPaste: false/);
    // Les regles existent bien dans TipTap (sinon le reglage ne servirait a rien).
    const kitReq = createRequire(createRequire(import.meta.url).resolve("@tiptap/starter-kit"));
    const boldSrc = readFileSync(kitReq.resolve("@tiptap/extension-bold"), "utf8");
    assert.match(boldSrc, /addInputRules\(\)/);
    assert.match(boldSrc, /addPasteRules\(\)/);
  });
}

// ================================================================ ETAPE 4
const bud = await import("../lib/claude/budget");
const usage = await import("../lib/claude/usage");

await test("budget : 200 $ par defaut, rien sous 80 %, bandeau discret a 80 %, rouge a 100 %", () => {
  assert.equal(bud.DEFAULT_MONTHLY_BUDGET_USD, 200);
  assert.equal(bud.budgetLevel(159.99, 200), null);
  assert.equal(bud.budgetLevel(160, 200), "near");
  assert.equal(bud.budgetLevel(199.99, 200), "near");
  assert.equal(bud.budgetLevel(200, 200), "over");
  assert.equal(bud.budgetLevel(250, 200), "over");
  assert.equal(bud.budgetPercent(160, 200), 80);
  assert.equal(bud.formatUsd(200).replace(/\s/g, " "), "200 $");
});

await test("budget : sans SQL 43, 200 $ appliques et rien ne plante ; enregistre, le montant saisi", async () => {
  const now = new Date("2026-11-18T12:00:00Z");
  const rows = [
    { created_at: "2026-11-10T10:00:00Z", cost_usd: 0.05, request_id: "r1", usage: "traduction_en" },
    { created_at: "2026-11-10T10:00:01Z", cost_usd: 0.07, request_id: "r1", usage: "traduction_de" },
    { created_at: "2026-10-02T10:00:00Z", cost_usd: 0.1, request_id: "r0", usage: "traduction_en" },
  ];
  const without = await usage.loadClaudeUsage(fakeDb({ claude_credit: [], claude_usage: rows }, { missing: ["claude_budget"] }), 1.08, now);
  assert.deepEqual(without.budget, { usd: 200, ready: false });
  const withB = await usage.loadClaudeUsage(fakeDb({ claude_credit: [], claude_usage: rows, claude_budget: [{ id: 1, monthly_usd: 150 }] }), 1.08, now);
  assert.deepEqual(withB.budget, { usd: 150, ready: true });
  // Cout moyen d'une traduction : (0,12 + 0,10) / 2 clics.
  assert.equal(withB.translationCount, 2);
  assert.ok(Math.abs((withB.avgTranslationUsd ?? 0) - 0.11) < 1e-9);
});

await test("budget : a 100 %, confirmation avant l'appel a Claude (ecran et serveur)", () => {
  const btn = read("components/admin/ClaudeTranslateButton.tsx");
  assert.match(btn, /if \(overBudget && !confirmOverBudget\) return setAskBudget\(true\)/);
  assert.match(btn, /onClick=\{\(\) => void run\(true\)\}/);
  const act = read("app/admin/properties/claude-actions.ts");
  const guard = act.indexOf('budgetLevel(before.monthUsd, before.budget.usd) === "over" && input?.confirmOverBudget !== true');
  assert.ok(guard > 0 && guard < act.indexOf("await translateListing("), "controle du budget avant tout appel");
  const fr = JSON.parse(read("messages/fr.json")).admin_claude;
  assert.equal(fr.budget_month, "Ce mois-ci : {spent} sur {budget}{eur}");
  for (const l of ["en", "de"]) for (const k of ["budget_month", "budget_near", "budget_over", "budget_confirm_question", "stat_average"]) assert.ok(JSON.parse(read(`messages/${l}.json`)).admin_claude[k], `${l}.${k}`);
});

// ================================================================ ETAPE 5
const inv = await import("../lib/chatbot/invite");

await test("Elena : invitation visible sur une fiche bien, puis changement de page vers une page sans invitation, plus de bulle vide", () => {
  const onProperty = inv.inviteKeyFor("property:appartement-x");
  assert.equal(onProperty, "invite_property");
  assert.equal(inv.showInvite(true, onProperty, false), true);
  // Le visiteur va sur l'accueil : visibilite remise a false, aucun texte.
  const visible = inv.visibleAfterRender(true, "/fr/biens/appartement-x", "/fr");
  assert.equal(visible, false);
  assert.equal(inv.showInvite(visible, inv.inviteKeyFor("home"), false), false);
  // Meme si l'etat restait vrai, une page sans texte n'affiche jamais la bulle.
  assert.equal(inv.showInvite(true, null, false), false);
  // D'une fiche a une autre : la bulle disparait aussi (pas de retour).
  assert.equal(inv.visibleAfterRender(true, "/fr/biens/a", "/fr/biens/b"), false);
  assert.equal(inv.visibleAfterRender(true, "/fr/biens/a", "/fr/biens/a"), true);
});

await test("Elena : branchement dans la bulle, invitation deja montree conservee en sessionStorage", () => {
  const src = read("components/chatbot/ChatbotBubble.tsx");
  assert.match(src, /if \(lastPathname !== pathname\) \{\s*setLastPathname\(pathname\);/);
  assert.match(src, /\{showInvite\(inviteVisible, inviteKey, open\) && \(/);
  assert.match(src, /sessionStorage\.getItem\(INVITE_SESSION_KEY\)\) return;/);
  assert.match(src, /sessionStorage\.setItem\(INVITE_SESSION_KEY, "true"\)/);
});

// ================================================================ SQL 43
await test("SQL 43 : ajout seulement, rejouable, admin seulement, tableau de controle de 6 lignes", () => {
  const sql = read("supabase/sql/43_indexation_et_budget.sql");
  const code = sql.replace(/^--.*$/gm, "");
  assert.ok(!/\bDROP\s+(TABLE|COLUMN)\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bALTER\s+TABLE\s+public\.(?!index_requests|claude_budget)/i.test(code));
  assert.equal((code.match(/CREATE TABLE IF NOT EXISTS/g) ?? []).length, 2);
  assert.equal((code.match(/CREATE POLICY/g) ?? []).length, 7);
  assert.equal((code.match(/DROP POLICY IF EXISTS/g) ?? []).length, 7);
  assert.ok((code.match(/public\.is_mapa_admin\(\)/g) ?? []).length >= 7);
  assert.equal((code.match(/SELECT \d, '/g) ?? []).length + 1, 6);
  assert.match(code, /ON CONFLICT \(id\) DO NOTHING/);
});

// @@STEPS@@

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);

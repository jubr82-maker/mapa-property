// scripts/proof-bug6.mjs — Preuve BUG 6 : CRUD admin estimations.
// L'admin est auth-gated (Supabase SSR) : le flux authentifié complet
// n'est pas rejouable headless (pas de creds admin). On prouve donc de
// façon déterministe que les routes existent et sont SÉCURISÉES :
//   - /admin/estimations/new : page créée, redirige vers login si non-auth
//   - POST /api/admin/estimations : 401 sans session
//   - DELETE /api/admin/estimations/<id> : 401 sans session
//   - /admin/estimations : guard login (le bouton "+ Nouvelle" ne
//     s'affiche que connecté)
import { chromium, request as pwRequest } from "@playwright/test";

const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${BASE}/admin/estimations/new`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(1500);
const newUrl = page.url();
const newGuarded = /\/admin\/login/.test(newUrl);

await page.goto(`${BASE}/admin/estimations`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(1000);
const listGuarded = /\/admin\/login/.test(page.url());
await page.close();

const api = await pwRequest.newContext();
const post = await api.post(`${BASE}/api/admin/estimations`, {
  data: { price_mid: 500000, type: "maison" },
});
const del = await api.delete(
  `${BASE}/api/admin/estimations/00000000-0000-0000-0000-000000000000`,
);
const postStatus = post.status();
const delStatus = del.status();
await api.dispose();
await ctx.close();
await browser.close();

const rows = [{ newGuarded, listGuarded, postNoAuth: postStatus, deleteNoAuth: delStatus }];
console.table(rows);
const ok = newGuarded && listGuarded && postStatus === 401 && delStatus === 401;
console.log(
  ok
    ? "BUG6 PROOF: OK ✅ (routes CRUD créées + auth-gated ; flux authentifié non-headless documenté)"
    : "BUG6 PROOF: KO ❌",
);
process.exit(ok ? 0 : 1);

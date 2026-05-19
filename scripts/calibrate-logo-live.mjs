import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const TARGET = [224, 190, 96];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  try {
    localStorage.setItem("theme", "dark");
  } catch {}
});
await page.goto(`${BASE}/fr`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
  window.scrollTo(0, 400);
});
await page.waitForTimeout(700);
await page.evaluate(() => {
  const h = document.querySelector("header");
  if (h) {
    h.style.backdropFilter = "none";
    h.style.background = getComputedStyle(document.body).backgroundColor;
  }
});
await page.waitForTimeout(300);

const imgs = page.locator("img.mapa-logo-img");
let chosen = null;
const cnt = await imgs.count();
for (let i = 0; i < cnt; i++) {
  const el = imgs.nth(i);
  const box = await el.boundingBox().catch(() => null);
  if (box && box.width > 40 && box.height > 10) {
    chosen = el;
    break;
  }
}

const decodeCtx = await browser.newContext();
const decodePage = await decodeCtx.newPage();
await decodePage.goto("about:blank");

async function coreColor(buf) {
  const url = "data:image/png;base64," + buf.toString("base64");
  return await decodePage.evaluate(async (u) => {
    const img = new Image();
    await new Promise((r, j) => {
      img.onload = r;
      img.onerror = j;
      img.src = u;
    });
    const w = img.naturalWidth,
      h = img.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h).data;
    const cand = [];
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2],
        a = d[i + 3];
      if (a < 200) continue;
      const ch = Math.max(r, g, b) - Math.min(r, g, b);
      if (!(r > g && g >= b)) continue;
      if (ch < 40) continue;
      if (r < 90) continue;
      cand.push([r, g, b, ch]);
    }
    if (!cand.length) return null;
    cand.sort((p, q) => q[3] - p[3]);
    const core = cand.slice(0, Math.max(1, Math.floor(cand.length * 0.6)));
    let R = 0,
      G = 0,
      B = 0;
    for (const v of core) {
      R += v[0];
      G += v[1];
      B += v[2];
    }
    const n = core.length;
    return [Math.round(R / n), Math.round(G / n), Math.round(B / n)];
  }, url);
}

async function measureFilter(filter) {
  await chosen.evaluate((el, f) => {
    el.style.filter = f;
  }, filter);
  await page.waitForTimeout(60);
  const buf = await chosen.screenshot();
  return await coreColor(buf);
}

const f = (inv, sep, sat, hue, br, con) =>
  `brightness(0) saturate(100%) invert(${inv}%) sepia(${sep}%) saturate(${sat}%) hue-rotate(${hue}deg) brightness(${br}%) contrast(${con}%)`;
const cost = (rgb) =>
  rgb ? rgb.reduce((s, v, i) => s + Math.abs(v - TARGET[i]), 0) : 1e9;

let best = { cost: 1e9 };
// coarse — small anchored grid (current filter rendered pale/high-B,
// so explore lower brightness + lower invert to darken/deepen)
for (const inv of [55, 62, 70])
  for (const sep of [55, 75, 95])
    for (const sat of [350, 550, 800])
      for (const hue of [350, 358, 8])
        for (const br of [65, 75, 85])
          for (const con of [95, 110]) {
            const fl = f(inv, sep, sat, hue, br, con);
            const rgb = await measureFilter(fl);
            const c2 = cost(rgb);
            if (c2 < best.cost)
              best = { cost: c2, fl, rgb, p: { inv, sep, sat, hue, br, con } };
          }
let p = best.p;
for (let it = 0; it < 3; it++) {
  for (const dInv of [-4, 0, 4])
    for (const dSep of [-8, 0, 8])
      for (const dSat of [-90, 0, 90])
        for (const dHue of [-3, 0, 3])
          for (const dBr of [-3, 0, 3])
            for (const dCon of [0]) {
              const cd = {
                inv: p.inv + dInv,
                sep: Math.max(0, Math.min(100, p.sep + dSep)),
                sat: Math.max(0, p.sat + dSat),
                hue: p.hue + dHue,
                br: Math.max(1, p.br + dBr),
                con: Math.max(1, p.con + dCon),
              };
              const fl = f(cd.inv, cd.sep, cd.sat, cd.hue, cd.br, cd.con);
              const rgb = await measureFilter(fl);
              const c2 = cost(rgb);
              if (c2 < best.cost) best = { cost: c2, fl, rgb, p: cd };
            }
  p = best.p;
}

console.log("LIVE-CALIBRATED best cost", best.cost, "rgb", best.rgb, "target", TARGET);
console.log(
  "max channel delta",
  Math.max(...best.rgb.map((v, i) => Math.abs(v - TARGET[i]))),
);
console.log("FILTER:");
console.log(best.fl);
await browser.close();

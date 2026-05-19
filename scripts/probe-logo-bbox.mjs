import { chromium } from "@playwright/test";
const BASE = "http://localhost:3001";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded" });
const r = await page.evaluate(async () => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = "/logo-mapa-property-mono.png";
  });
  const w = img.naturalWidth,
    h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h).data;
  let minX = w,
    maxX = 0,
    minY = h,
    maxY = 0;
  for (let yy = 0; yy < h; yy++)
    for (let xx = 0; xx < w; xx++) {
      const a = d[(yy * w + xx) * 4 + 3];
      if (a > 60) {
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  // The wordmark "MAPA" — find where the flame icon ends. Scan column
  // opaque density; the flame is a thin left glyph then a gap then MAPA.
  const colHas = [];
  for (let xx = 0; xx < w; xx++) {
    let cnt = 0;
    for (let yy = 0; yy < h; yy++) if (d[(yy * w + xx) * 4 + 3] > 60) cnt++;
    colHas.push(cnt);
  }
  // find first big gap (>=8px of empty columns) after the first opaque run
  let i = minX;
  while (i < w && colHas[i] > 0) i++; // end of flame
  let flameEnd = i;
  while (i < w && colHas[i] === 0) i++; // gap
  let wordStart = i;
  return {
    natural: `${w}x${h}`,
    opaqueBBox: { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY },
    flameEnd,
    wordmarkStartX: wordStart,
    wordmarkEndX: maxX,
    wordmarkFracStart: wordStart / w,
    wordmarkFracEnd: maxX / w,
    fullFracStart: minX / w,
    fullFracEnd: maxX / w,
  };
});
console.log(JSON.stringify(r, null, 2));
await browser.close();

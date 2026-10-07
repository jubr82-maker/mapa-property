// PDF d'essai de l'avis de valeur (oct. 2026), generes par le MEME point
// d'entree que le bouton de l'admin (lib/estimation/value-opinion-generate)
// a partir de l'estimation fictive lib/estimation/value-opinion-sample.
// Version avec annexes : assemblee par le meme module que le navigateur
// (lib/estimation/value-opinion-assemble, pdf-lib), avec deux photos, un
// plan et un document PDF fictifs fabriques ici.
// Sortie : essais-pdf/ (exclu de git par .git/info/exclude).
// Usage : node --import tsx scripts/generate-value-opinion-samples.mts
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import PDFKit from "pdfkit";
import { generateValueOpinionPdf } from "../lib/estimation/value-opinion-generate";
import { VALUE_OPINION_LANGS } from "../lib/estimation/value-opinion-pdf";
import { VALUE_OPINION_SAMPLE } from "../lib/estimation/value-opinion-sample";
import { annexMetaOf, assembleValueOpinion, type AnnexInput } from "../lib/estimation/value-opinion-assemble";

const outDir = path.resolve(process.cwd(), "essais-pdf");
fs.mkdirSync(outDir, { recursive: true });

const jpeg = async (w: number, h: number, r: number, g: number, b: number) => ({
  bytes: new Uint8Array(await sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } }).jpeg({ quality: 82 }).toBuffer()),
  format: "jpg" as const,
  width: w,
  height: h,
});
const fakePdf = () =>
  new Promise<Uint8Array>((resolve) => {
    const d = new PDFKit({ size: "A4" });
    const parts: Buffer[] = [];
    d.on("data", (c: Buffer) => parts.push(c));
    d.on("end", () => resolve(new Uint8Array(Buffer.concat(parts))));
    d.fontSize(22).text("Document fictif, page 1");
    d.addPage().fontSize(22).text("Document fictif, page 2");
    d.end();
  });

const annexes: AnnexInput = {
  photos: [
    { caption: "Séjour (photo fictive)", image: await jpeg(1600, 1200, 205, 178, 140) },
    { caption: "Terrasse (photo fictive)", image: await jpeg(1200, 1600, 120, 150, 170) },
  ],
  plans: [{ caption: "Plan fictif du rez-de-chaussée", kind: "image", image: await jpeg(2400, 1800, 238, 238, 232) }],
  documents: [{ name: "passeport-energetique-fictif.pdf", kind: "energy_passport", pdf: await fakePdf(), pages: 2 }],
};

for (const lang of VALUE_OPINION_LANGS) {
  const pdf = await generateValueOpinionPdf(VALUE_OPINION_SAMPLE, lang);
  const file = path.join(outDir, `avis-de-valeur-${lang}.pdf`);
  fs.writeFileSync(file, pdf);
  console.log(file);
  const base = await generateValueOpinionPdf(VALUE_OPINION_SAMPLE, lang, { annexes: annexMetaOf(annexes) });
  const full = await assembleValueOpinion(new Uint8Array(base), annexes);
  const fileA = path.join(outDir, `avis-de-valeur-${lang}-avec-annexes.pdf`);
  fs.writeFileSync(fileA, full);
  console.log(fileA);
}

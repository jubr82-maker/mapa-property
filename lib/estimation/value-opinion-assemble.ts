// Assemblage de l'avis de valeur et de ses annexes (oct. 2026), par
// pdf-lib 1.17.1 (version figee). Execute dans le NAVIGATEUR de l'admin :
// les fichiers joints ne sont jamais envoyes au serveur ni stockes. Module
// sans dependance au DOM (octets en entree et en sortie), donc teste aussi
// dans Node par pnpm test:security.
//
// Le serveur a deja dessine les pages d'annexes (sommaire, cadres,
// legendes) a partir des seules metadonnees ; on place ici chaque image ou
// page de plan dans son emplacement (annexLayout, meme calcul que le
// serveur), puis on ajoute les pages des documents PDF en fin de document.
import { PDFDocument } from "pdf-lib";
import { ANNEX_LIMITS, annexLayout, fitRect, type AnnexMeta, type DocumentKind } from "@/lib/estimation/value-opinion-annex-layout";

export type PreparedImage = { bytes: Uint8Array; format: "jpg" | "png"; width: number; height: number };

export type AnnexInput = {
  photos: { caption: string; image: PreparedImage }[];
  plans: ({ caption: string; kind: "image"; image: PreparedImage } | { caption: string; kind: "pdf"; pdf: Uint8Array; pages: number })[];
  documents: { name: string; kind: DocumentKind; pdf: Uint8Array; pages: number }[];
};

/** Metadonnees envoyees au serveur (aucun octet de fichier). */
export function annexMetaOf(input: AnnexInput): AnnexMeta {
  return {
    photos: input.photos.map((p) => ({ caption: p.caption, ratio: p.image.width / p.image.height })),
    plans: input.plans.map((p) =>
      p.kind === "image"
        ? { caption: p.caption, kind: "image" as const, ratio: p.image.width / p.image.height, pages: 1 }
        : { caption: p.caption, kind: "pdf" as const, ratio: 1, pages: Math.min(p.pages, ANNEX_LIMITS.planPages) },
    ),
    documents: input.documents.map((d) => ({ name: d.name, kind: d.kind, pages: Math.min(d.pages, ANNEX_LIMITS.documentPages) })),
  };
}

/** Nombre de pages d'un PDF, ou motif s'il est protege ou illisible. */
export async function inspectPdf(bytes: Uint8Array): Promise<{ ok: true; pages: number } | { ok: false; reason: "protected" | "unreadable" }> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const pages = doc.getPageCount();
    return pages > 0 ? { ok: true, pages } : { ok: false, reason: "unreadable" };
  } catch (e) {
    const name = e instanceof Error ? `${e.name} ${e.message}` : String(e);
    return { ok: false, reason: /encrypt/i.test(name) ? "protected" : "unreadable" };
  }
}

/** Avis (octets recus du serveur) complete par ses annexes. */
export async function assembleValueOpinion(base: Uint8Array, input: AnnexInput): Promise<Uint8Array> {
  const meta = annexMetaOf(input);
  const layout = annexLayout(meta);
  const doc = await PDFDocument.load(base);
  const pages = doc.getPages();
  const first = pages.length - layout.framePages;
  if (first < 1) throw new Error("annex_layout_mismatch");

  const embedImage = (img: PreparedImage) => (img.format === "png" ? doc.embedPng(img.bytes) : doc.embedJpg(img.bytes));

  for (const slot of layout.slots) {
    const page = pages[first + slot.page];
    const H = page.getHeight();
    if (slot.kind === "photo") {
      const img = input.photos[slot.index].image;
      const fit = fitRect(slot.rect, img.width / img.height);
      page.drawImage(await embedImage(img), { x: fit.x, y: H - fit.y - fit.h, width: fit.w, height: fit.h });
      continue;
    }
    const plan = input.plans[slot.index];
    if (plan.kind === "image") {
      const fit = fitRect(slot.rect, plan.image.width / plan.image.height);
      page.drawImage(await embedImage(plan.image), { x: fit.x, y: H - fit.y - fit.h, width: fit.w, height: fit.h });
    } else {
      // Page de plan PDF reprise en vectoriel, mise a l'echelle du cadre.
      const [emb] = await doc.embedPdf(plan.pdf, [slot.planPage]);
      const fit = fitRect(slot.rect, emb.width / emb.height);
      page.drawPage(emb, { x: fit.x, y: H - fit.y - fit.h, width: fit.w, height: fit.h });
    }
  }

  // Documents PDF : ajoutes tels quels en fin de document.
  for (const d of input.documents) {
    const src = await PDFDocument.load(d.pdf);
    const indices = src.getPageIndices().slice(0, ANNEX_LIMITS.documentPages);
    const copied = await doc.copyPages(src, indices);
    for (const p of copied) doc.addPage(p);
  }
  return doc.save();
}

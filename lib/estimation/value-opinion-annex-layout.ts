// Annexes de l'avis de valeur (oct. 2026, decision de Julien) : aucun
// fichier joint n'est envoye au serveur ni stocke. Le navigateur lit les
// fichiers choisis et n'envoie que des METADONNEES (legende, proportions
// d'une image, nombre de pages d'un PDF, nom et type d'un document). Le
// serveur dessine les pages d'annexes avec les polices du site (sommaire,
// grilles de photos, pages de plan) ; le navigateur y place ensuite les
// images et les pages de plan dans les emplacements calcules ici, puis
// ajoute les documents PDF en fin de document (pdf-lib).
//
// Module pur, partage par le serveur et le navigateur : la meme fonction
// calcule les emplacements des deux cotes.
// Coordonnees : points PDF, origine en haut a gauche (convention pdfkit) ;
// le navigateur convertit pour pdf-lib (origine en bas a gauche).

export const ANNEX_PAGE = { w: 595.28, h: 841.89, m: 46, top: 76, bottom: 841.89 - 54 };

export const ANNEX_LIMITS = { photos: 24, plans: 10, documents: 10, planPages: 20, documentPages: 300, caption: 120, name: 120 };

export const DOCUMENT_KINDS = ["energy_passport", "cadastre", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type AnnexPhotoMeta = { caption: string; ratio: number };
export type AnnexPlanMeta = { caption: string; kind: "image" | "pdf"; ratio: number; pages: number };
export type AnnexDocumentMeta = { name: string; kind: DocumentKind; pages: number };
export type AnnexMeta = { photos: AnnexPhotoMeta[]; plans: AnnexPlanMeta[]; documents: AnnexDocumentMeta[] };

export const EMPTY_ANNEXES: AnnexMeta = { photos: [], plans: [], documents: [] };

const clampRatio = (r: unknown) => {
  const n = Number(r);
  return Number.isFinite(n) ? Math.min(5, Math.max(0.2, n)) : 1;
};
const cleanText = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
const cleanPages = (v: unknown, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : 1;
};

/** Metadonnees recues du navigateur, bornees et nettoyees. */
export function sanitizeAnnexMeta(input: unknown): AnnexMeta {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    photos: arr(o.photos).slice(0, ANNEX_LIMITS.photos).map((p) => {
      const x = (p ?? {}) as Record<string, unknown>;
      return { caption: cleanText(x.caption, ANNEX_LIMITS.caption), ratio: clampRatio(x.ratio) };
    }),
    plans: arr(o.plans).slice(0, ANNEX_LIMITS.plans).map((p) => {
      const x = (p ?? {}) as Record<string, unknown>;
      const kind = x.kind === "pdf" ? "pdf" : "image";
      return { caption: cleanText(x.caption, ANNEX_LIMITS.caption), kind, ratio: clampRatio(x.ratio), pages: kind === "pdf" ? cleanPages(x.pages, ANNEX_LIMITS.planPages) : 1 };
    }),
    documents: arr(o.documents).slice(0, ANNEX_LIMITS.documents).map((d) => {
      const x = (d ?? {}) as Record<string, unknown>;
      const kind = (DOCUMENT_KINDS as readonly string[]).includes(String(x.kind)) ? (x.kind as DocumentKind) : "other";
      return { name: cleanText(x.name, ANNEX_LIMITS.name) || "document.pdf", kind, pages: cleanPages(x.pages, ANNEX_LIMITS.documentPages) };
    }),
  };
}

export function hasAnnexes(a: AnnexMeta): boolean {
  return a.photos.length + a.plans.length + a.documents.length > 0;
}

export type Rect = { x: number; y: number; w: number; h: number };

/** Emplacement ou le navigateur place une image ou une page de plan. */
export type AnnexSlot =
  | { kind: "photo"; index: number; page: number; rect: Rect; captionY: number }
  | { kind: "plan"; index: number; planPage: number; page: number; rect: Rect; captionY: number };

export type AnnexLayout = {
  /** Pages dessinees par le serveur (sommaire, photos, plans). */
  framePages: number;
  summaryPages: number;
  photoPages: number;
  planPages: number;
  /** Pages des documents PDF ajoutes en fin de document par le navigateur. */
  documentPages: number;
  slots: AnnexSlot[];
};

const SUMMARY_ROWS_PER_PAGE = 26;
const PHOTO_COLS = 2;
const PHOTO_ROWS = 3;
const TITLE_BLOCK = 40;
const CAPTION_H = 24;
const GAP = 14;

/** Nombre de lignes du sommaire (une par annexe, plus les intitules). */
export function summaryRows(a: AnnexMeta): number {
  return (a.photos.length ? 1 : 0) + (a.plans.length ? 1 + a.plans.length : 0) + (a.documents.length ? 1 + a.documents.length : 0);
}

/**
 * Emplacements des annexes. `page` : index de la page d'annexe, a partir
 * de 0 = premiere page du sommaire (le navigateur ajoute l'index de la
 * premiere page d'annexe dans le PDF recu).
 */
export function annexLayout(a: AnnexMeta): AnnexLayout {
  if (!hasAnnexes(a)) return { framePages: 0, summaryPages: 0, photoPages: 0, planPages: 0, documentPages: 0, slots: [] };
  const P = ANNEX_PAGE;
  const innerW = P.w - 2 * P.m;
  const summaryPages = Math.max(1, Math.ceil(summaryRows(a) / SUMMARY_ROWS_PER_PAGE));
  const perPage = PHOTO_COLS * PHOTO_ROWS;
  const photoPages = Math.ceil(a.photos.length / perPage);
  const slots: AnnexSlot[] = [];

  const cellW = (innerW - GAP * (PHOTO_COLS - 1)) / PHOTO_COLS;
  const gridTop = P.top + TITLE_BLOCK;
  const rowH = (P.bottom - gridTop - GAP * (PHOTO_ROWS - 1)) / PHOTO_ROWS;
  const imgH = rowH - CAPTION_H;
  a.photos.forEach((_, i) => {
    const pageInBlock = Math.floor(i / perPage);
    const k = i % perPage;
    const col = k % PHOTO_COLS;
    const row = Math.floor(k / PHOTO_COLS);
    const x = P.m + col * (cellW + GAP);
    const y = gridTop + row * (rowH + GAP);
    slots.push({ kind: "photo", index: i, page: summaryPages + pageInBlock, rect: { x, y, w: cellW, h: imgH }, captionY: y + imgH + 5 });
  });

  let page = summaryPages + photoPages;
  const planRect: Rect = { x: P.m, y: P.top + TITLE_BLOCK, w: innerW, h: P.bottom - (P.top + TITLE_BLOCK) - CAPTION_H };
  a.plans.forEach((plan, i) => {
    for (let pp = 0; pp < plan.pages; pp++) {
      slots.push({ kind: "plan", index: i, planPage: pp, page, rect: planRect, captionY: planRect.y + planRect.h + 6 });
      page++;
    }
  });
  const planPages = page - summaryPages - photoPages;
  const documentPages = a.documents.reduce((s, d) => s + d.pages, 0);
  return { framePages: page, summaryPages, photoPages, planPages, documentPages, slots };
}

/** Image contenue dans un emplacement, proportions conservees, centree. */
export function fitRect(slot: Rect, ratio: number): Rect {
  const r = ratio > 0 ? ratio : 1;
  let w = slot.w;
  let h = w / r;
  if (h > slot.h) {
    h = slot.h;
    w = h * r;
  }
  return { x: slot.x + (slot.w - w) / 2, y: slot.y + (slot.h - h) / 2, w, h };
}

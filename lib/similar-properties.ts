// Biens similaires d'une fiche (oct. 2026). Module pur, extrait tel quel de
// app/[locale]/biens/[slug]/page.tsx : meme transaction, meme pays, meme
// type si connu, prix a 15 % pres, meme ville en tete, quatre au plus.
// Partage par la fiche (affichage) et par l'admin (quotas Vercel : seules
// les fiches dont le bloc contient le bien modifie sont regenerees).

export type SimilarCandidate = {
  id: string;
  transaction?: string | null;
  country?: string | null;
  property_type?: string | null;
  badge?: string | null;
  price?: number | null;
  city?: string | null;
};

export function pickSimilar<T extends SimilarCandidate>(target: SimilarCandidate, all: T[]): T[] {
  const price = target.price ?? 0;
  const minPrice = price ? price * 0.85 : 0;
  const maxPrice = price ? price * 1.15 : Number.POSITIVE_INFINITY;
  const propertyType = target.property_type ?? target.badge ?? null;
  const similarAll = all.filter((p) => {
    if (p.id === target.id) return false;
    if (p.transaction !== target.transaction) return false;
    // Pays minimum, ville en bonus de match
    if (p.country !== target.country) return false;
    // Meme type si disponible
    const pt = p.property_type ?? p.badge ?? null;
    if (propertyType && pt && pt !== propertyType) return false;
    // Prix +-15 % si on a un prix de reference
    if (price && p.price) {
      if (p.price < minPrice || p.price > maxPrice) return false;
    }
    return true;
  });
  // Priorise meme ville en tete
  similarAll.sort((a, b) => {
    const sameCityA = a.city === target.city ? 1 : 0;
    const sameCityB = b.city === target.city ? 1 : 0;
    return sameCityB - sameCityA;
  });
  return similarAll.slice(0, 4);
}

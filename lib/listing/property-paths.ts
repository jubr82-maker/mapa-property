// Adresses lisibles des fiches de biens (oct. 2026), cote serveur : memes
// mots que le site (messages listing_model.vocab, listing_model.seo et
// search.type_subtype), lus une fois depuis les fichiers de messages.
import "server-only";
import { photoAlt, typeName } from "@/lib/listing/listing-seo";
import { seoContext } from "@/lib/listing/property-paths-core";
import type { ListingLang } from "@/lib/listing/listing-data";

export { seoContext, propertyPathFor, propertyPaths } from "@/lib/listing/property-paths-core";

/**
 * Texte alternatif de la photo principale d'un bien, par langue (oct. 2026) :
 * type et localite seulement ("Maison a Steinfort"), jamais d'adresse.
 * Vide si le type est inconnu (le titre de l'annonce sert alors de repli).
 */
export function coverAlts(p: { property_type?: string | null; city?: string | null }): Record<ListingLang, string> {
  const out = {} as Record<ListingLang, string>;
  for (const lang of ["fr", "en", "de"] as ListingLang[]) {
    const c = seoContext(lang);
    const typeLabel = typeName(p.property_type ?? null, lang, c.types, c.subtypes[p.property_type ?? ""]);
    if (!typeLabel) {
      out[lang] = "";
      continue;
    }
    // Meme regle que les photos de la fiche, sans numero de photo.
    const withPhoto = photoAlt({ index: 0, typeLabel, city: p.city ?? null, title: "" }, c.seo);
    out[lang] = withPhoto.replace(/,\s*(photo|Foto)\s+1$/, "");
  }
  return out;
}

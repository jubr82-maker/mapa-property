// Adresses lisibles des fiches de biens (oct. 2026), cote serveur : memes
// mots que le site (messages listing_model.vocab, listing_model.seo et
// search.type_subtype), lus une fois depuis les fichiers de messages.
import "server-only";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import type { ListingLang } from "@/lib/listing/listing-data";
import { photoAlt, propertyPath, typeName, type ListingSeoVocab, type SeoProperty } from "@/lib/listing/listing-seo";
import type { ListingVocab } from "@/lib/listing/generate";

type Msgs = {
  listing_model: { vocab: ListingVocab; seo: ListingSeoVocab };
  search: { type_subtype: Record<string, string> };
};
const ALL = { fr, en, de } as unknown as Record<ListingLang, Msgs>;

export function seoContext(lang: ListingLang) {
  const m = ALL[lang];
  return { types: m.listing_model.vocab.types, titleTx: m.listing_model.vocab.title_tx, seo: m.listing_model.seo, subtypes: m.search.type_subtype, vocab: m.listing_model.vocab };
}

/** Adresse de la fiche dans une langue ("/biens/appartement-duplex-2-chambres-steinfort-86388715"). */
export function propertyPathFor(p: SeoProperty, lang: ListingLang): string {
  const c = seoContext(lang);
  return propertyPath(p, lang, c.types, c.seo, c.subtypes[p.property_type ?? ""]);
}

export function propertyPaths(p: SeoProperty): Record<ListingLang, string> {
  return { fr: propertyPathFor(p, "fr"), en: propertyPathFor(p, "en"), de: propertyPathFor(p, "de") };
}

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

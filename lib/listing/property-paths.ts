// Adresses lisibles des fiches de biens (oct. 2026), cote serveur : memes
// mots que le site (messages listing_model.vocab, listing_model.seo et
// search.type_subtype), lus une fois depuis les fichiers de messages.
import "server-only";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import type { ListingLang } from "@/lib/listing/listing-data";
import { propertyPath, type ListingSeoVocab, type SeoProperty } from "@/lib/listing/listing-seo";

type Msgs = {
  listing_model: { vocab: { types: Record<string, string>; title_tx: { sale: string; rent: string } }; seo: ListingSeoVocab };
  search: { type_subtype: Record<string, string> };
};
const ALL = { fr, en, de } as unknown as Record<ListingLang, Msgs>;

export function seoContext(lang: ListingLang) {
  const m = ALL[lang];
  return { types: m.listing_model.vocab.types, titleTx: m.listing_model.vocab.title_tx, seo: m.listing_model.seo, subtypes: m.search.type_subtype };
}

/** Adresse de la fiche dans une langue ("/biens/appartement-duplex-2-chambres-steinfort-86388715"). */
export function propertyPathFor(p: SeoProperty, lang: ListingLang): string {
  const c = seoContext(lang);
  return propertyPath(p, lang, c.types, c.seo, c.subtypes[p.property_type ?? ""]);
}

export function propertyPaths(p: SeoProperty): Record<ListingLang, string> {
  return { fr: propertyPathFor(p, "fr"), en: propertyPathFor(p, "en"), de: propertyPathFor(p, "de") };
}

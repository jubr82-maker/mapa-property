// Adresses lisibles des fiches de biens (oct. 2026) : memes mots que le
// site (messages listing_model.vocab, listing_model.seo et
// search.type_subtype). Sans marque "server-only" : utilise aussi par
// proxy.ts (anciennes adresses redirigees directement vers la fiche
// actuelle). Le reste du code passe par lib/listing/property-paths.ts.
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import type { ListingLang } from "@/lib/listing/listing-data";
import { propertyPath, type ListingSeoVocab, type SeoProperty } from "@/lib/listing/listing-seo";
import type { ListingVocab } from "@/lib/listing/generate";

// Acces statiques (fr.listing_model..., jamais ALL[lang]) : le build ne
// garde que ces parties des messages, le proxy reste leger.
type Ctx = { vocab: ListingVocab; seo: ListingSeoVocab; subtypes: Record<string, string> };
const CTX: Record<ListingLang, Ctx> = {
  fr: { vocab: fr.listing_model.vocab, seo: fr.listing_model.seo, subtypes: fr.search.type_subtype } as unknown as Ctx,
  en: { vocab: en.listing_model.vocab, seo: en.listing_model.seo, subtypes: en.search.type_subtype } as unknown as Ctx,
  de: { vocab: de.listing_model.vocab, seo: de.listing_model.seo, subtypes: de.search.type_subtype } as unknown as Ctx,
};

export function seoContext(lang: ListingLang) {
  const m = CTX[lang];
  return { types: m.vocab.types, titleTx: m.vocab.title_tx, seo: m.seo, subtypes: m.subtypes, vocab: m.vocab };
}

/** Adresse de la fiche dans une langue ("/biens/appartement-duplex-2-chambres-steinfort-86388715"). */
export function propertyPathFor(p: SeoProperty, lang: ListingLang): string {
  const c = seoContext(lang);
  return propertyPath(p, lang, c.types, c.seo, c.subtypes[p.property_type ?? ""]);
}

export function propertyPaths(p: SeoProperty): Record<ListingLang, string> {
  return { fr: propertyPathFor(p, "fr"), en: propertyPathFor(p, "en"), de: propertyPathFor(p, "de") };
}

// Liste deroulante des pages d'une question (admin, oct. 2026) : pages
// fixes, villes (lib/cities.ts) et articles du blog (tous, publies ou non).
// Valeurs fermees : aucune saisie libre.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { cities } from "@/lib/cities";
import { ELENA_FAQ_KEY, FAQ_FIXED_KEYS, blogFaqKey, cityFaqKey } from "@/lib/faq/keys";

export type FaqPageOption = { value: string; label: string; group: "pages" | "elena" | "cities" | "blog" };

export async function faqPageOptions(supabase: SupabaseClient): Promise<FaqPageOption[]> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_faq" });
  const { data } = await supabase.from("blog_posts").select("slug, title_fr").order("published_at", { ascending: false });
  const posts = ((data as { slug: string | null; title_fr: string | null }[] | null) ?? []).filter((p) => p.slug);
  return [
    ...FAQ_FIXED_KEYS.map((k) => ({ value: k, label: t(`key_${k.replace(/-/g, "_")}`), group: "pages" as const })),
    // Reponses d'Elena (nov. 2026) : jamais affichees sur le site public.
    { value: ELENA_FAQ_KEY, label: t("key_elena"), group: "elena" as const },
    ...[...cities]
      .sort((a, b) => a.name.fr.localeCompare(b.name.fr, "fr"))
      .map((c) => ({ value: cityFaqKey(c.slug), label: t("city_label", { name: c.name.fr }), group: "cities" as const })),
    ...posts.map((p) => ({ value: blogFaqKey(p.slug as string), label: t("blog_label", { title: p.title_fr || (p.slug as string) }), group: "blog" as const })),
  ];
}

/** Libelle d'une page_key (liste de l'admin) ; la valeur brute si inconnue. */
export function faqPageLabel(options: FaqPageOption[], key: string): string {
  return options.find((o) => o.value === key)?.label ?? key;
}

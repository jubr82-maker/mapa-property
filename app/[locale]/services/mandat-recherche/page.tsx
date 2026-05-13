import { redirect } from "next/navigation";

// Route alias SEO-friendly /services/mandat-recherche → /mandats/recherche
// Le contenu canonique vit dans app/[locale]/mandats/[type]/page.tsx (slug "recherche").

export default async function MandatRechercheAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/mandats/recherche`);
}

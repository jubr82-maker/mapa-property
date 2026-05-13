import { redirect } from "next/navigation";

// Route alias SEO-friendly /services/mandat-exclusif → /mandats/exclusif
// Le contenu canonique vit dans app/[locale]/mandats/[type]/page.tsx (slug "exclusif").
// Conserve la stratégie d'URL : un seul template, pas de duplication de contenu.

export default async function MandatExclusifAliasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/mandats/exclusif`);
}

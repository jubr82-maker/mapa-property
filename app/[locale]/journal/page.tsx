import { permanentRedirect } from "next/navigation";

// Oct. 2026 : /journal et /blog affichaient la meme liste d'articles
// (contenu en double). Adresse unique : /blog, ou vivent aussi les
// articles (/blog/<slug>). /journal redirige en 308 (next.config.ts et
// proxy.ts) ; ce renvoi reste en dernier recours.
export default async function JournalRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/blog`);
}

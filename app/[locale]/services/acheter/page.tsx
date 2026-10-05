import { permanentRedirect } from "next/navigation";

export default async function BuyRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 308 aussi assure par next.config.ts (redirects).
  permanentRedirect(`/${locale}/biens`);
}

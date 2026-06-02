import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { WaitlistForm } from "@/components/forms/WaitlistForm";
import { SignatureLine } from "@/components/ui/SignatureLine";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "waitlist_page" });
  return {
    title: `${t("title")} — MAPA Property`,
    description: t("intro"),
  };
}

export default async function WaitlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "waitlist_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">{t("title")}</h1>
          <SignatureLine />
          <p className="mt-4 text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("intro")}
          </p>
        </header>
        <WaitlistForm />
      </div>
    </div>
  );
}

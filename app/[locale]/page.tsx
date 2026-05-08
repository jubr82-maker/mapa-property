import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 pt-24 pb-16">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
        Setup OK · Étape 2
      </p>
      <h1 className="font-display text-5xl font-black tracking-tight text-ink sm:text-7xl">
        MAPA <span className="gold-text">PROPERTY</span>
      </h1>
      <p className="max-w-md text-center text-ink-mid">{t("placeholder")}</p>
      <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-line px-5 py-2 text-xs font-medium uppercase tracking-widest text-ink-mid">
        <span className="size-2 rounded-full bg-gold" />
        Vol.I MMXXVI
      </div>
    </section>
  );
}

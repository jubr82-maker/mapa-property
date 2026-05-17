import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default async function ArcovaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ArcovaContent />;
}

function ArcovaContent() {
  const t = useTranslations("arcova");
  return (
    <main className="mx-auto max-w-3xl px-6 py-32 lg:px-10">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        <LockIcon /> {t("eyebrow")}
      </div>
      <h1 className="t-h1">
        {t("title")}
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-mid">{t("intro")}</p>

      <div className="mt-12 rounded-lg border border-line bg-bg-soft p-8">
        <h2 className="t-h3">{t("waitlist_title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-mid">{t("waitlist_text")}</p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-navy-deep"
        >
          {t("waitlist_cta")}
          <span aria-hidden>→</span>
        </Link>
      </div>

      <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        {t("legal")}
      </p>
    </main>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

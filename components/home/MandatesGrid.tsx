import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";

const mandates = [
  { key: "exclusive", href: "/mandats/exclusif", rate: "3,5%" },
  { key: "semi", href: "/mandats/semi-exclusif", rate: "4,0%" },
  { key: "simple", href: "/mandats/simple", rate: "4,5%" },
  { key: "autonomous", href: "/mandats/autonome", rate: "—" },
] as const;

export function MandatesGrid() {
  const t = useTranslations("mandates_home");

  return (
    <section className="bg-bg-soft px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-ink-mid">{t("subtitle")}</p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {mandates.map((m) => (
            <HoverFlipCard
              key={m.key}
              height="h-80"
              front={
                <div className="flex size-full flex-col justify-between rounded-xl border border-line bg-bg p-6">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                      {t("type_label")}
                    </span>
                    <h3 className="mt-2 font-display text-3xl font-black leading-tight text-ink">
                      {t(`${m.key}_title`)}
                    </h3>
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                      {t("rate_label")}
                    </span>
                    <span className="mt-1 block gold-text font-display text-3xl font-black">
                      {m.rate}
                    </span>
                  </div>
                </div>
              }
              back={
                <div className="flex size-full flex-col gap-3 rounded-xl border border-gold bg-ink p-6 text-bg">
                  <h3 className="font-display text-2xl font-black leading-tight">
                    {t(`${m.key}_title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-bg/80">
                    {t(`${m.key}_text`)}
                  </p>
                  <Link
                    href={m.href}
                    className="mt-auto inline-flex items-center gap-2 self-start font-mono text-[11px] uppercase tracking-[0.2em] text-gold-bright hover:text-bg"
                  >
                    {t("learn_more")} →
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}

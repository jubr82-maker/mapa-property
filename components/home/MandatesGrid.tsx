import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";

const mandates = [
  { key: "exclusive", href: "/mandats/exclusif", rate: "3%" },
  { key: "semi", href: "/mandats/semi-exclusif", rate: "4%" },
  { key: "simple", href: "/mandats/simple", rate: "5%" },
  { key: "autonomous", href: "/mandats/autonome", rate: "1%" },
] as const;

export function MandatesGrid() {
  const t = useTranslations("mandates_home");

  return (
    <section className="bg-bg px-6 py-6 md:py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-xs text-ink-mid md:text-base">{t("subtitle")}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
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

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContactButtons } from "@/components/ContactButtons";

export function ContactCTA() {
  const t = useTranslations("contact_cta");

  return (
    <section className="px-6 py-24 lg:px-10 lg:py-32">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-2xl border border-line bg-ink p-10 text-bg sm:p-16">
        <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-gold/15 blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-bright">
              {t("eyebrow")}
            </p>
            <h2 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              {t("title")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-bg/80">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <ContactButtons variant="dark" />
            <Link
              href="/contact"
              className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
            >
              {t("cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

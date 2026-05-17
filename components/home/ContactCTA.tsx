import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactReveal } from "@/components/contact-reveal";
import { siteContent } from "@/lib/site-content";
import { SignatureLine } from "@/components/ui/SignatureLine";

export async function ContactCTA({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "contact_cta" });

  // CMS overlay (site_content) — fallback sur next-intl.
  const [eyebrow, title, description, cta] = await Promise.all([
    siteContent("home.contact_cta.eyebrow", locale, t("eyebrow")),
    siteContent("home.contact_cta.title", locale, t("title")),
    siteContent("home.contact_cta.description", locale, t("description")),
    siteContent("home.contact_cta.cta", locale, t("cta")),
  ]);

  return (
    <section className="px-6 py-6 md:py-16 lg:px-10 lg:py-20">
      <div className="relative mx-auto max-w-[1400px] overflow-hidden rounded-2xl border border-line bg-bg-contrast p-5 text-text-contrast md:p-10 lg:p-16">
        <div className="pointer-events-none absolute -right-20 -top-20 size-36 rounded-full bg-gold/15 blur-3xl" />

        <div className="relative grid gap-5 md:gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:text-xs">
              {eyebrow}
            </p>
            <h2 className="mt-3 t-h2-contrast">
              {title}
            </h2>
            <SignatureLine />
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-text-contrast/80 md:mt-5 md:text-base">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:gap-4">
            <ContactReveal variant="full" align="center" theme="dark" />
            <Link
              href="/contact"
              className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
            >
              {cta}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

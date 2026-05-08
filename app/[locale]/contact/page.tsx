import { setRequestLocale, getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/forms/ContactForm";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "contact_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-5xl font-black leading-tight tracking-tight text-ink sm:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("intro")}
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-line bg-bg-soft p-8 sm:p-10">
            <h2 className="mb-6 font-display text-2xl font-bold text-ink">
              {t("form_title")}
            </h2>
            <ContactForm type="general_contact" source="contact" showSubject />
          </section>

          <aside className="space-y-5">
            <ContactBlock label={t("call_label")} value="+352 691 620 127" href="tel:+352691620127" />
            <ContactBlock
              label={t("email_label")}
              value="j.brebion@mapagroup.org"
              href="mailto:j.brebion@mapagroup.org"
            />
            <div className="rounded-xl border border-line bg-bg p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("hq_label")}
              </p>
              <p className="mt-2 font-display text-base font-bold text-ink">
                Luxembourg
              </p>
            </div>
            <div className="rounded-xl border border-line bg-bg p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("meeting_label")}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-mid">
                {t("meeting_value")}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ContactBlock({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-line bg-bg p-5 transition-colors hover:border-gold"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
        {label}
      </p>
      <p className="mt-2 font-display text-lg font-bold text-ink">{value}</p>
    </a>
  );
}

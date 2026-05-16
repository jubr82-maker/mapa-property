import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/brand/Logo";
import { ContactReveal } from "@/components/contact-reveal";

const colServices = [
  { href: "/services/vendre", key: "sell" },
  { href: "/biens", key: "buy" },
  { href: "/biens?transaction=rent", key: "rent" },
  { href: "/off-market", key: "off_market" },
  { href: "/services/estimer", key: "estimate" },
  { href: "/mandats/recherche", key: "search_mandate" },
  { href: "/services/simulateurs", key: "simulators" },
] as const;

const colAgency = [
  { href: "/qui-sommes-nous", key: "about" },
  { href: "/services/marches-actifs", key: "markets" },
  { href: "/mandats/exclusif", key: "mandates" },
  { href: "/legal/honoraires", key: "fees" },
  { href: "/blog", key: "blog" },
] as const;

const colLegal = [
  { href: "/legal/mentions-legales", key: "legal_notice" },
  { href: "/legal/cgu", key: "tos" },
  { href: "/legal/cgv", key: "tos_sale" },
  { href: "/legal/rgpd", key: "privacy" },
  { href: "/legal/honoraires", key: "fees_pdf" },
  { href: "/legal/cookies", key: "cookies" },
] as const;

const socials = [
  {
    href: "https://www.linkedin.com/showcase/mapa-property/",
    label: "LinkedIn",
    icon: LinkedInIcon,
  },
  {
    href: "https://www.instagram.com/mapa_property",
    label: "Instagram",
    icon: InstagramIcon,
  },
  {
    href: "https://www.facebook.com/people/MAPA-Property/61559121213209/",
    label: "Facebook",
    icon: FacebookIcon,
  },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-bg-soft text-ink">
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        {/* CTA mandats — monochrome noir + accents or */}
        <div className="mb-14 grid gap-6 overflow-hidden rounded-2xl border border-gold/30 bg-bg-contrast p-8 text-text-contrast shadow-md md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">
              {t("cta_eyebrow")}
            </p>
            <h3 className="mt-2 font-display text-2xl font-black leading-tight text-text-contrast md:text-4xl">
              {t("cta_title")}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-text-contrast/80 md:text-base">
              {t("cta_subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col md:items-stretch">
            <Link
              href="/mandats/exclusif"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink shadow-md transition-colors hover:bg-gold-bright"
            >
              {t("cta_exclusive")}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/mandats/recherche"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-gold transition-colors hover:border-gold hover:bg-gold/10"
            >
              {t("cta_search")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <Logo size={56} tone="auto" />

        <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <FooterCol title={t("col_services")}>
            {colServices.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {tNav(l.key)}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title={t("col_agency")}>
            {colAgency.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {tNav(l.key)}
              </FooterLink>
            ))}
          </FooterCol>

          <FooterCol title={t("col_contact")}>
            <li>
              <ContactReveal variant="full" align="left" />
            </li>
            <li className="text-sm leading-relaxed text-ink-mid">
              <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("hq")}
              </span>
              {t("hq_value")}
            </li>
            <li className="text-sm leading-relaxed text-ink-mid">
              <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("meeting")}
              </span>
              {t("meeting_value")}
            </li>
          </FooterCol>

          <FooterCol title={t("col_legal")}>
            {colLegal.map((l) => (
              <FooterLink key={l.href} href={l.href}>
                {t(l.key)}
              </FooterLink>
            ))}
          </FooterCol>
        </div>

        <div className="mt-14 h-[2px] w-full bg-gold" />

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-[13px] leading-relaxed text-ink-mid">
            © {year} MAPA Property — MAPA Synergy Sàrl
            <br />
            <span className="text-ink-soft">{t("baseline")}</span>
          </p>

          <ul className="flex items-center gap-2">
            {socials.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold"
                >
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 font-sans text-[11px] leading-relaxed text-ink-soft">
          {t("micro_legal")}
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-ink-soft">
        {title}
      </h4>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-ink-mid transition-colors hover:text-gold"
      >
        {children}
      </Link>
    </li>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <li>
      <span className="block font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
        {label}
      </span>
      <a
        href={href}
        className="text-sm text-ink-mid transition-colors hover:text-gold"
      >
        {value}
      </a>
    </li>
  );
}

function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V21h-4V9Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.81.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.07 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.81-.42 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.07-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.81-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.81.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5 0-4.74.07-.95.05-1.46.2-1.8.34a3 3 0 0 0-1.1.7 3 3 0 0 0-.7 1.1c-.14.34-.29.85-.34 1.8-.07 1.24-.07 1.59-.07 4.74s0 3.5.07 4.74c.05.95.2 1.46.34 1.8.18.45.4.78.7 1.1.32.3.65.52 1.1.7.34.14.85.29 1.8.34 1.24.07 1.59.07 4.74.07s3.5 0 4.74-.07c.95-.05 1.46-.2 1.8-.34a3 3 0 0 0 1.1-.7 3 3 0 0 0 .7-1.1c.14-.34.29-.85.34-1.8.07-1.24.07-1.59.07-4.74s0-3.5-.07-4.74c-.05-.95-.2-1.46-.34-1.8a3 3 0 0 0-.7-1.1 3 3 0 0 0-1.1-.7c-.34-.14-.85-.29-1.8-.34C15.5 4 15.15 4 12 4Zm0 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 1.8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5-2.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.5h2.55l.4-3h-2.95V8.55c0-.85.27-1.45 1.5-1.45h1.6V4.4c-.27-.04-1.2-.13-2.3-.13-2.27 0-3.83 1.4-3.83 3.95V10.5H8v3h2.47V21h3.03Z" />
    </svg>
  );
}


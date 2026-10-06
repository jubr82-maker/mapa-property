// Tableau de bord (oct. 2026) : uniquement ce qui demande une action
// aujourd'hui. Tout le reste est un lien vers l'espace concerne du groupe
// Pilotage. Si rien n'est a traiter, la page le dit clairement.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE, formatDateTime } from "@/lib/datetime";
import { loadDashboard } from "@/lib/pilotage/dashboard";
import { Card, GoLink, PageHeader, Pill, Section, type Tone } from "@/components/admin/pilotage/ui";

export const dynamic = "force-dynamic";

const TONE: Record<"critical" | "warning" | "info", Tone> = { critical: "critical", warning: "warning", info: "neutral" };

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const { items, checked } = await loadDashboard();

  const spaces = [
    { href: "/admin/activite", title: t("nav_activity"), text: t("dashboard_link_activity") },
    { href: "/admin/trafic", title: t("nav_traffic"), text: t("dashboard_link_traffic") },
    { href: "/admin/sante", title: t("nav_health"), text: t("dashboard_link_health") },
    { href: "/admin/journal", title: t("nav_journal"), text: t("dashboard_link_journal") },
  ];

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("eyebrow")} title={t("dashboard_title")} intro={t("dashboard_intro", { date: formatDateTime(new Date()) })} />

      <Section title={t("dashboard_today")}>
        {items.length === 0 ? (
          <Card>
            <p className="font-display text-2xl font-bold text-ink">{t("dashboard_nothing")}</p>
            <p className="mt-2 text-sm text-ink-mid">
              {t("dashboard_checked", { list: checked.map((c) => t(`checked_${c}`)).join(", ") || t("checked_none") })}
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-bg-soft p-4">
                <div className="flex items-center gap-3">
                  <Pill tone={TONE[i.severity]}>{t(`severity_${i.severity}`)}</Pill>
                  <span className="text-sm text-ink">{t(`action_${i.key}`, { count: i.count })}</span>
                </div>
                <GoLink href={i.href}>{t("open")}</GoLink>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("dashboard_spaces")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {spaces.map((s) => (
            <Card key={s.href} title={s.title}>
              <p className="text-sm text-ink-mid">{s.text}</p>
              <p className="mt-3">
                <GoLink href={s.href}>{t("open")}</GoLink>
              </p>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

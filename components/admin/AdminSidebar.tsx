"use client";

// Menu de l'admin (oct. 2026) : trois groupes. Pilotage remplace les
// anciennes pages Dashboard, Analytics, Intelligence visiteurs et
// Performance (adresses conservees, redirigees vers les nouveaux espaces).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ADMIN_NAV_GROUPS as groups, isNavItemActive } from "@/components/admin/admin-nav";

export function AdminSidebar() {
  const t = useTranslations("admin_nav");
  const pathname = usePathname();
  return (
    <aside className="flex min-h-dvh flex-col border-r border-ink/10 bg-bg py-6">
      <div className="px-6 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">{t("brand")}</p>
        <p className="font-display text-2xl font-bold text-ink">{t("console")}</p>
      </div>
      <nav className="flex-1 space-y-6 px-3">
        {groups.map((g) => (
          <div key={g.key}>
            <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink/50">{t(g.key)}</p>
            <ul className="space-y-1">
              {g.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-sans text-sm transition-colors ${
                        active ? "bg-ink text-bg" : "text-ink hover:bg-ink/10"
                      }`}
                    >
                      <Icon className="size-4" />
                      {t(item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-6 pt-4 text-[10px] font-mono uppercase tracking-[0.3em] text-ink/50">
        {t("version", { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}

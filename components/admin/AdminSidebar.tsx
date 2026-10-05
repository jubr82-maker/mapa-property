"use client";

// Menu de l'admin (oct. 2026) : trois groupes. Pilotage remplace les
// anciennes pages Dashboard, Analytics, Intelligence visiteurs et
// Performance (adresses conservees, redirigees vers les nouveaux espaces).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  LayoutDashboard,
  Lock,
  Mail,
  FileText,
  Star,
  BookText,
  FolderArchive,
  Building2,
  Users,
  Settings,
  BarChart3,
  HeartPulse,
  LayoutTemplate,
  Calculator,
  ClipboardList,
  Handshake,
  Radar,
  ScrollText,
} from "lucide-react";

type Item = { href: string; key: string; icon: typeof Lock; match: "exact" | "prefix" };

const groups: { key: string; items: Item[] }[] = [
  {
    key: "group_pilotage",
    items: [
      { href: "/admin", key: "dashboard", icon: LayoutDashboard, match: "exact" },
      { href: "/admin/activite", key: "activity", icon: Radar, match: "prefix" },
      { href: "/admin/trafic", key: "traffic", icon: BarChart3, match: "prefix" },
      { href: "/admin/sante", key: "health", icon: HeartPulse, match: "prefix" },
      { href: "/admin/journal", key: "journal", icon: ScrollText, match: "prefix" },
    ],
  },
  {
    key: "group_gestion",
    items: [
      { href: "/admin/offmarket", key: "offmarket", icon: Lock, match: "prefix" },
      { href: "/admin/estimations", key: "estimations", icon: Calculator, match: "prefix" },
      { href: "/admin/leads", key: "leads", icon: Mail, match: "prefix" },
      { href: "/admin/mandats", key: "mandats", icon: FileText, match: "prefix" },
      { href: "/admin/ventes-realisees", key: "sales", icon: Handshake, match: "prefix" },
      { href: "/admin/liste-attente", key: "waitlist", icon: ClipboardList, match: "prefix" },
      { href: "/admin/arcova", key: "arcova", icon: Users, match: "prefix" },
      { href: "/admin/reviews", key: "reviews", icon: Star, match: "prefix" },
      { href: "/admin/blog", key: "blog", icon: BookText, match: "prefix" },
      { href: "/admin/documents", key: "documents", icon: FolderArchive, match: "prefix" },
      { href: "/admin/properties", key: "properties", icon: Building2, match: "prefix" },
      { href: "/admin/contenu", key: "content", icon: LayoutTemplate, match: "prefix" },
    ],
  },
  {
    key: "group_compte",
    items: [
      { href: "/admin/settings", key: "settings", icon: Settings, match: "prefix" },
      { href: "/admin/securite", key: "account_security", icon: ShieldCheck, match: "prefix" },
    ],
  },
];

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
                const active =
                  item.match === "exact"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
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

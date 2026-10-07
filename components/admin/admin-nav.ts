// Navigation de l'admin (oct. 2026), source unique pour la barre laterale
// (ordinateur) et la navigation au pouce (telephone, AdminMobileNav).
// Aucun texte : cles du namespace next-intl "admin_nav".
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
  SearchCheck,
} from "lucide-react";

export type AdminNavItem = { href: string; key: string; icon: typeof Lock; match: "exact" | "prefix" };

export const ADMIN_NAV_GROUPS: { key: string; items: AdminNavItem[] }[] = [
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
      { href: "/admin/recherches", key: "searches", icon: SearchCheck, match: "prefix" },
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

/** Les quatre acces de la barre du bas (telephone). */
export const ADMIN_THUMB_KEYS = ["dashboard", "leads", "properties", "activity"] as const;

export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  return item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Entree de menu correspondant a la page courante (titre de l'en-tete mobile). */
export function currentNavItem(pathname: string): AdminNavItem | null {
  for (const g of ADMIN_NAV_GROUPS) for (const i of g.items) if (isNavItemActive(i, pathname)) return i;
  return null;
}

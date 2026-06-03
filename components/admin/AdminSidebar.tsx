"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  Gauge,
  LayoutTemplate,
  Calculator,
  ClipboardList,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: "exact" as const },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, match: "prefix" as const },
  { href: "/admin/performance", label: "Performance", icon: Gauge, match: "prefix" as const },
  { href: "/admin/offmarket", label: "Off-Market", icon: Lock, match: "prefix" as const },
  { href: "/admin/estimations", label: "Estimations EVS", icon: Calculator, match: "prefix" as const },
  { href: "/admin/leads", label: "Leads", icon: Mail, match: "prefix" as const },
  { href: "/admin/mandats", label: "Mandats", icon: FileText, match: "prefix" as const },
  { href: "/admin/liste-attente", label: "Liste d'attente", icon: ClipboardList, match: "prefix" as const },
  { href: "/admin/arcova", label: "ARCOVA", icon: Users, match: "prefix" as const },
  { href: "/admin/reviews", label: "Avis", icon: Star, match: "prefix" as const },
  { href: "/admin/blog", label: "Blog", icon: BookText, match: "prefix" as const },
  { href: "/admin/documents", label: "Documents", icon: FolderArchive, match: "prefix" as const },
  { href: "/admin/properties", label: "Properties (Apimo)", icon: Building2, match: "prefix" as const },
  { href: "/admin/contenu", label: "Contenu", icon: LayoutTemplate, match: "prefix" as const },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, match: "prefix" as const },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex min-h-dvh flex-col border-r border-[#3D4F63]/10 bg-[#F5EFE1] py-6">
      <div className="px-6 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3D4F63]/60">
          MAPA Property
        </p>
        <p className="font-display text-2xl font-bold text-[#3D4F63]">Console</p>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((item) => {
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
                    active
                      ? "bg-[#3D4F63] text-[#F5EFE1]"
                      : "text-[#3D4F63] hover:bg-[#3D4F63]/10"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-6 pt-4 text-[10px] font-mono uppercase tracking-[0.3em] text-[#3D4F63]/50">
        v1.0 · {new Date().getFullYear()}
      </div>
    </aside>
  );
}

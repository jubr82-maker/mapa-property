"use client";

// Navigation de l'admin sur telephone (oct. 2026), sous 768 px :
//  - en-tete compact en haut : titre de la page et deconnexion ;
//  - barre fixe en bas, a portee du pouce : Accueil, Leads, Biens,
//    Activite, et Menu qui ouvre la liste complete (groupes Pilotage,
//    Gestion et Compte). Libelles courts propres a la barre (thumb_*),
//    sur une ligne.
// Zones tactiles d'au moins 44 px, marges de securite de l'iPhone
// (encoche et barre d'accueil) respectees. Sur ordinateur, rien ne change :
// barre laterale (AdminSidebar) et en-tete existant.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_THUMB_KEYS,
  currentNavItem,
  isNavItemActive,
  type AdminNavItem,
} from "@/components/admin/admin-nav";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const ALL_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
const THUMB_ITEMS: AdminNavItem[] = ADMIN_THUMB_KEYS.map((k) => ALL_ITEMS.find((i) => i.key === k)!).filter(Boolean);

// Seconde passe (oct. 2026) : un seul titre par page sur telephone. L'en-tete
// reprend le texte du h1 de la page (nom du bien, du lead...), masque dans
// la page par admin-mobile.css ; a defaut, le libelle du menu.
const PAGE_H1 = "main[data-admin-main] h1";
const PAGE_INTRO = "main[data-admin-main] h1 + p";

export function AdminMobileHeader() {
  const t = useTranslations("admin_nav");
  const pathname = usePathname();
  const item = currentNavItem(pathname);
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const text = document.querySelector(PAGE_H1)?.textContent?.trim();
      setPageTitle(text || null);
    };
    read();
    const main = document.querySelector("main[data-admin-main]");
    if (!main) return;
    const observer = new MutationObserver(read);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname]);

  // Description de la page : une ligne, depliee ou repliee d'une touche.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const intro = (e.target as Element | null)?.closest?.(PAGE_INTRO);
      if (!intro) return;
      if (intro.hasAttribute("data-expanded")) intro.removeAttribute("data-expanded");
      else intro.setAttribute("data-expanded", "");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <header
      data-admin-mobile-header
      className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-gold bg-ink px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-bg md:hidden"
    >
      <p className="min-w-0 truncate font-display text-xl font-bold" data-admin-mobile-title>
        {pageTitle ?? (item ? t(item.key) : t("header_title"))}
      </p>
      <AdminLogoutButton />
    </header>
  );
}

export function AdminMobileNav() {
  const t = useTranslations("admin_nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Fermeture a chaque changement de page.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const thumbActive = THUMB_ITEMS.some((i) => isNavItemActive(i, pathname));

  return (
    <>
      <nav
        aria-label={t("mobile_nav")}
        data-admin-bottom-nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {THUMB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[14px] leading-tight ${
                    active ? "font-semibold text-ink" : "text-ink-mid"
                  }`}
                >
                  <Icon className={`size-6 ${active ? "text-gold-deep" : ""}`} aria-hidden />
                  <span className="line-clamp-1">{t(`thumb_${item.key}`)}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="admin-mobile-menu"
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[14px] leading-tight ${
                !thumbActive ? "font-semibold text-ink" : "text-ink-mid"
              }`}
            >
              <Menu className="size-6" aria-hidden />
              <span>{t("thumb_menu")}</span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div
          id="admin-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden"
        >
          <div className="flex items-center justify-between border-b border-ink/15 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <p className="font-display text-2xl font-bold text-ink">{t("menu")}</p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("menu_close")}
              className="inline-flex size-12 items-center justify-center rounded-full border border-ink/20 text-ink"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
            {ADMIN_NAV_GROUPS.map((g) => (
              <section key={g.key} className="mb-6">
                <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-[0.12em] text-ink-mid">{t(g.key)}</h2>
                <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/15 bg-bg-soft">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavItemActive(item, pathname);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={`flex min-h-14 items-center gap-3 px-4 text-[17px] ${active ? "font-semibold text-ink" : "text-ink"}`}
                        >
                          <Icon className={`size-5 shrink-0 ${active ? "text-gold-deep" : "text-ink-mid"}`} aria-hidden />
                          {t(item.key)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

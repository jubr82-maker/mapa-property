import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import "../globals.css";
import "./admin-mobile.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { AdminIdleWatcher } from "@/components/admin/AdminIdleWatcher";
import { AdminMobileHeader, AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminTableCards } from "@/components/admin/AdminTableCards";
import type { Viewport } from "next";

// Tous les namespaces admin (prefixe admin_), pour les composants clients.

async function adminMessages() {
  const all = (await getMessages({ locale: ADMIN_LOCALE })) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(all).filter(([ns]) => ns.startsWith("admin_")));
}

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  display: "swap",
});

const sans = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_nav" });
  return {
    ...staticMetadata,
    title: t("header_title"),
    // Ajout a l'ecran d'accueil (oct. 2026) : manifeste propre a l'admin
    // (app/admin/manifest.webmanifest), icone et nom ; aucun service worker,
    // donc rien n'est mis en cache hors ligne.
    manifest: "/admin/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("app_name"), statusBarStyle: "default" },
    // Memes icones que le site public (scripts/generate-icons.mjs).
    icons: {
      icon: [
        { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    },
  };
}

// Telephone : largeur de l'appareil, zoom manuel autorise, contenu sous
// l'encoche gere par les marges de securite (env(safe-area-inset-*)).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const staticMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body data-admin className="min-h-dvh bg-bg text-ink antialiased">
        {/* Libelles next-intl de l'admin (langue de l'admin, ADMIN_LOCALE). */}
        <NextIntlClientProvider locale={ADMIN_LOCALE} messages={await adminMessages()}>
          <AdminShell>{children}</AdminShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isAdminEmail(user.email)) {
    console.warn("admin access denied");
    redirect("/admin/login");
  }

  // Oct. 2026 : coque admin complete seulement en session aal2 (second
  // facteur verifie). Connexion, double authentification et
  // reinitialisation : page centree, sans menu.
  const { data: aal } = user
    ? await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    : { data: null };
  const tNav = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_nav" });
  if (!user || aal?.currentLevel !== "aal2") {
    return (
      <main data-admin-auth className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[260px_1fr]">
      {/* Ordinateur : barre laterale. Telephone : en-tete compact et barre
          au pouce (AdminMobileNav). */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <div className="flex min-h-dvh min-w-0 flex-col">
        <AdminMobileHeader />
        <header className="hidden items-center justify-between border-b border-gold bg-ink px-8 py-4 text-bg md:flex">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="font-display text-xl font-bold uppercase tracking-[0.15em]">
              {tNav("header_title")}
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-bg/70">
              {user.email}
            </span>
            <AdminLogoutButton />
          </div>
        </header>
        <main
          data-admin-main
          className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-8 md:py-10"
        >
          {children}
        </main>
        <AdminMobileNav />
        <AdminTableCards />
        <AdminIdleWatcher />
      </div>
    </div>
  );
}

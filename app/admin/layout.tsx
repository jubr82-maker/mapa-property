import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { AdminIdleWatcher } from "@/components/admin/AdminIdleWatcher";

const ADMIN_NAMESPACES = ["admin_security", "admin_datetime", "admin_properties", "admin_notices"] as const;

async function adminMessages() {
  const all = (await getMessages({ locale: ADMIN_LOCALE })) as Record<string, unknown>;
  return Object.fromEntries(ADMIN_NAMESPACES.map((ns) => [ns, all[ns]]));
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

export const metadata: Metadata = {
  title: "MAPA Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-ink antialiased">
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
  if (!user || aal?.currentLevel !== "aal2") {
    return <main className="flex min-h-dvh items-center justify-center px-6">{children}</main>;
  }

  return (
    <div className="grid min-h-dvh grid-cols-[260px_1fr] bg-bg">
      <AdminSidebar />
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-gold bg-ink px-8 py-4 text-bg">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="font-display text-xl font-bold uppercase tracking-[0.15em]">
              MAPA · Admin
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-bg/70">
              {user.email}
            </span>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="flex-1 px-8 py-10">{children}</main>
        <AdminIdleWatcher />
      </div>
    </div>
  );
}

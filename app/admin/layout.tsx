import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import "../globals.css";

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
      <body className="min-h-dvh bg-[#F5EFE1] text-[#1A1F2A] antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page : pas de shell admin
  if (!user) {
    return <main className="flex min-h-dvh items-center justify-center px-6">{children}</main>;
  }

  return (
    <div className="grid min-h-dvh grid-cols-[260px_1fr] bg-[#F5EFE1]">
      <AdminSidebar />
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-[#3D4F63]/15 bg-[#3D4F63] px-8 py-4 text-[#F5EFE1]">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="font-display text-xl font-bold uppercase tracking-[0.15em]">
              MAPA · Admin
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1]/70">
              {user.email}
            </span>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="flex-1 px-8 py-10">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";


export function SettingsClient({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="space-y-6">
      {/* Oct. 2026 : mot de passe, Passkeys et double authentification
          dans /admin/securite. */}
      <SecurityMovedNotice />
      <AccountInfoSection email={userEmail} />
    </div>
  );
}

// ----- Account info --------------------------------------------------------
function AccountInfoSection({ email }: { email: string | null }) {
  const t = useTranslations("admin_security");
  return (
    <Section title={t("account_section")}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {t("email")}
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-[#1A1F2A]">{email ?? ""}</dd>
        </div>
      </dl>
    </Section>
  );
}

// ----- Primitives ----------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-[#3D4F63]">{title}</h2>
      {children}
    </section>
  );
}



function SecurityMovedNotice() {
  const t = useTranslations("admin_security");
  return (
    <p className="rounded-md border border-[#3D4F63]/15 bg-white px-4 py-3 text-sm text-[#3D4F63]">
      {t("settings_moved")}{" "}
      <Link href="/admin/securite" className="underline underline-offset-4">
        {t("nav_security")}
      </Link>
    </p>
  );
}

// Securite du compte admin (oct. 2026) : mot de passe (ancien exige,
// 14 caracteres minimum), Passkeys, appareils de double authentification
// (dont un appareil de secours). Le journal des connexions est dans
// l'espace Securite du pilotage (/admin/journal). Session aal2 obligatoire.
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import Link from "next/link";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { ChangePasswordCard, FactorsCard } from "@/components/admin/SecurityClient";
import { PasskeysCard, type PasskeySummary } from "@/components/admin/PasskeyClient";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const { supabase } = await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? null, status: f.status }));
  // Passkeys : erreur si la fonction n'est pas activee dans Supabase
  // (Authentication, Passkeys) ; la carte l'indique sans bloquer la page.
  let passkeys: PasskeySummary[] = [];
  let passkeysAvailable = false;
  try {
    const { data: pk, error: pkErr } = await supabase.auth.passkey.list();
    if (!pkErr && pk) {
      passkeysAvailable = true;
      passkeys = pk.map((p) => ({ id: p.id, name: p.friendly_name ?? null, createdAt: p.created_at, lastUsedAt: p.last_used_at ?? null }));
    }
  } catch {
    passkeysAvailable = false;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-bold text-[#3D4F63]">{t("security_title")}</h1>
      </header>
      <ChangePasswordCard />
      <PasskeysCard passkeys={passkeys} available={passkeysAvailable} />
      <FactorsCard factors={factors} backupName={t("factor_backup_name")} />
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">{t("auth_log_section")}</h2>
        <p className="mt-2 text-sm text-[#3D4F63]/70">{t("auth_log_moved")}</p>
        <Link href="/admin/journal" className="mt-3 inline-block font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] underline underline-offset-4 hover:no-underline">
          {t("auth_log_open")}
        </Link>
      </section>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";


export function SettingsClient({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="space-y-6">
      {/* Oct. 2026 : mot de passe et double authentification deplaces dans
          /admin/securite (ancien mot de passe exige, 14 caracteres, QR code
          fourni par Supabase sans service tiers). */}
      <SecurityMovedNotice />
      <PasskeySection />
      <AccountInfoSection email={userEmail} />
    </div>
  );
}

function PasskeySection() {
  return (
    <Section title="Touch ID / Passkey (WebAuthn)">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">Module en cours d&apos;intégration.</p>
        <p className="mt-2 text-amber-700">
          L&apos;authentification Passkey / Touch ID requiert un service WebAuthn
          côté serveur (génération de challenge, vérification de signature),
          stockage des clés publiques en base, et l&apos;extension du flux Supabase
          Auth. À livrer en pair-programming avec Julien — voir BLOCKERS.md.
          En attendant, l&apos;équipe MAPA peut s&apos;appuyer sur la 2FA TOTP
          ci-dessus pour la sécurité renforcée.
        </p>
      </div>
    </Section>
  );
}

// ----- Account info --------------------------------------------------------
function AccountInfoSection({ email }: { email: string | null }) {
  return (
    <Section title="Compte">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Email
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-[#1A1F2A]">{email ?? "—"}</dd>
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

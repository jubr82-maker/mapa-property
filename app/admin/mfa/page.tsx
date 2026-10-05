// Second facteur obligatoire (oct. 2026). Seule page admin accessible a un
// compte de la liste connecte par mot de passe seulement (aal1) :
//  - aucun appareil verifie -> premiere inscription (QR code) ;
//  - sinon -> saisie du code. Ensuite : session aal2, admin accessible.
import { getTranslations } from "next-intl/server";
import { requireAdminPendingMfa } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { safeAdminRedirect } from "@/lib/admin/security-config";
import { MfaGate } from "@/components/admin/MfaGate";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { supabase } = await requireAdminPendingMfa();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  const { data } = await supabase.auth.mfa.listFactors();
  const factors = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? null, status: f.status }));
  const hasVerified = factors.some((f) => f.status === "verified");
  const from = safeAdminRedirect((await searchParams).from);

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#3D4F63]/20 bg-white p-10 shadow-xl shadow-[#3D4F63]/10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">
          {hasVerified ? t("verify_title") : t("enroll_title")}
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/80">
          {hasVerified ? t("verify_intro") : t("enroll_intro")}
        </p>
      </div>
      <MfaGate mode={hasVerified ? "verify" : "enroll"} factors={factors} redirectTo={from} defaultName={t("factor_default_name")} />
    </div>
  );
}

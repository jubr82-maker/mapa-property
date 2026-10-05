// Reinitialisation du mot de passe (oct. 2026). La session de recuperation
// est creee par /admin/auth/callback ; sans elle (lien expire, ouvert sur
// un autre appareil en flux PKCE...), un message clair remplace l'ancienne
// erreur brute "Auth session missing".
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin/security-config";
import { ResetPasswordForm } from "@/components/admin/ResetPasswordForm";
import { authErrorCls, authLinkCls } from "@/components/admin/auth-ui";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const valid = !sp.error && user && isAdminEmail(user.email);

  let factors: { id: string; name: string | null; status: string }[] = [];
  let needsMfa = false;
  if (valid) {
    const { data } = await supabase.auth.mfa.listFactors();
    factors = (data?.totp ?? []).map((f) => ({ id: f.id, name: f.friendly_name ?? null, status: f.status }));
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    needsMfa = factors.some((f) => f.status === "verified") && aal?.currentLevel !== "aal2";
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#3D4F63]/20 bg-white p-10 shadow-xl shadow-[#3D4F63]/10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("reset_title")}</h1>
        {valid && (
          <p className="mt-2 text-sm text-[#3D4F63]/80">{t("reset_intro", { min: ADMIN_PASSWORD_MIN_LENGTH })}</p>
        )}
      </div>
      {valid ? (
        <ResetPasswordForm needsMfa={needsMfa} factors={factors} />
      ) : (
        <div className="space-y-4">
          <p className={authErrorCls}>{t("reset_invalid_link")}</p>
          <Link href="/admin/forgot-password" className={authLinkCls}>{t("reset_new_link")}</Link>
        </div>
      )}
    </div>
  );
}

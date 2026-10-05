import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/admin/ForgotPasswordForm";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  return (
    <div className="w-full max-w-md rounded-2xl border border-[#3D4F63]/20 bg-white p-10 shadow-xl shadow-[#3D4F63]/10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("forgot_title")}</h1>
        <p className="mt-2 text-sm text-[#3D4F63]/80">{t("forgot_intro")}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

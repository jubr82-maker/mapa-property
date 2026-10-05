import { getTranslations } from "next-intl/server";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { ADMIN_LOCALE } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; reason?: string }>;
}) {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_security" });
  return (
    <div className="w-full max-w-md rounded-2xl border border-[#3D4F63]/20 bg-white p-10 shadow-xl shadow-[#3D4F63]/10">
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("login_brand")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          {t("login_title")}
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/70">
          {t("login_intro")}
        </p>
      </div>
      <AdminLoginForm searchParamsPromise={searchParams} />
    </div>
  );
}

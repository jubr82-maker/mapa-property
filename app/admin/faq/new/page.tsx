import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { faqPageOptions } from "@/lib/faq/admin-options";
import { isFaqPageKey } from "@/lib/faq/keys";
import { FaqForm, emptyFaq } from "@/components/admin/faq/FaqForm";

export const dynamic = "force-dynamic";

export default async function NewFaqPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage();
  const { page } = await searchParams;
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_faq" });
  const options = await faqPageOptions(await createSupabaseServerClient());
  return (
    <div className="space-y-6">
      <Link href="/admin/faq" className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/80 hover:text-[#3D4F63]">
        {t("back")}
      </Link>
      <h1 className="font-display text-3xl font-bold text-[#3D4F63]">{t("new_title")}</h1>
      <FaqForm initial={emptyFaq(isFaqPageKey(page) ? page : "")} options={options} />
    </div>
  );
}

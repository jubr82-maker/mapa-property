import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { ReviewForm } from "@/components/admin/ReviewForm";

export const dynamic = "force-dynamic";

export default async function EditReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!review) notFound();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Avis clients
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Éditer un avis
        </h1>
      </header>
      <ReviewForm review={review} mode="edit" />
    </div>
  );
}

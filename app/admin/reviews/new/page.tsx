import { ReviewForm } from "@/components/admin/ReviewForm";

export const dynamic = "force-dynamic";

export default function NewReviewPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Avis clients
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Nouvel avis
        </h1>
      </header>
      <ReviewForm review={null} mode="create" />
    </div>
  );
}

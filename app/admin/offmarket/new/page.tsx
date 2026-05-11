import { OffmarketForm } from "@/components/admin/OffmarketForm";

export const dynamic = "force-dynamic";

export default function NewOffmarketPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Off-Market
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#3D4F63]">
          Nouveau bien off-market
        </h1>
      </header>
      <OffmarketForm row={null} mode="create" />
    </div>
  );
}

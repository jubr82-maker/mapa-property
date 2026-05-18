import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { NewEstimationForm } from "./NewEstimationForm";

// Création manuelle d'une estimation (BUG 6). Auth SSR obligatoire,
// même garde que la liste / le détail.
export default async function NewEstimationPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?from=/admin/estimations/new");

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/estimations"
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60 hover:text-[#9E7B2A]"
        >
          ← Retour aux estimations
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-[#1A1F2A]">
          Nouvelle estimation manuelle
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#1A1F2A]/70">
          Saisie manuelle (le moteur EVS n&apos;est pas exécuté ici —
          fourchette renseignée par l&apos;estimateur).
        </p>
      </header>
      <NewEstimationForm />
    </div>
  );
}

export const dynamic = "force-dynamic";

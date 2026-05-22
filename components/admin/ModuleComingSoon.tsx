import Link from "next/link";

export function ModuleComingSoon({
  module,
  description,
}: {
  module: string;
  description: string;
}) {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          {module}
        </h1>
      </header>
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Livraison en cours — PARTIE C du brief
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#3D4F63]">
          {description}
        </p>
        <p className="mt-6 text-sm text-[#3D4F63]/70">
          Ce module fait partie du second lot d&apos;implémentation BO admin (Dashboard,
          Leads, Mandats, ARCOVA, Avis, Blog, Documents, Properties Apimo, Paramètres)
          et sera livré après validation de la PARTIE B (Off-Market) par Julien.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-[#3D4F63] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e]"
          >
            ← Dashboard
          </Link>
          <Link
            href="/admin/offmarket"
            className="rounded-full border border-[#3D4F63]/20 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:border-[#e0af6e] hover:text-[#e0af6e]"
          >
            Module Off-Market →
          </Link>
        </div>
      </section>
    </div>
  );
}

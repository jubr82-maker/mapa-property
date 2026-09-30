import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SettingsClient } from "@/components/admin/SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Paramètres
        </h1>
      </header>

      <SettingsClient userEmail={user?.email ?? null} />

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">
          Coordonnées agence
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Téléphone" value="Voir mentions légales (source unique)" />
          <Info label="Email" value="Voir mentions légales (source unique)" />
          <Info
            label="Notification admin"
            value="Configurable via MAPA_NOTIFICATION_EMAILS (Vercel)"
          />
          <Info label="Siège (privé)" value="Dudelange, Luxembourg" />
        </dl>
        <p className="mt-3 text-xs text-[#3D4F63]/60">
          Lecture seule. Les coordonnées Julien / Frédéric ne sont plus
          dupliquées : source unique = <code>lib/legal/mentions.ts</code>.
          Diffusion publique uniquement via le composant <code>&lt;ContactButtons /&gt;</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <h2 className="font-display text-xl font-bold text-[#3D4F63]">
          Sous-traitants RGPD
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-[#3D4F63]/80">
          <li>• <strong>Vercel</strong> — hébergement des pages et fonctions du site (région Stockholm)</li>
          <li>• <strong>Supabase</strong> (Postgres, Auth) — base de données (région Stockholm) et stockage de fichiers</li>
          <li>• <strong>Cloudflare</strong> — protection anti-robots des formulaires et stockage de fichiers (pas de DNS ni de pare-feu du site)</li>
          <li>• <strong>Resend</strong> — envoi d&apos;emails transactionnels</li>
          <li>• <strong>Apimo</strong> — sync biens classiques (lecture seule)</li>
          <li>• <strong>Mistral AI</strong> — chatbot Eléna (modèle IA, société française)</li>
          <li>• <strong>Gandi</strong> — nom de domaine</li>
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">{value}</dd>
    </div>
  );
}

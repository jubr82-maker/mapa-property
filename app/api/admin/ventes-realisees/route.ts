// API admin POST /api/admin/ventes-realisees — insertion d'une vente
// realisee MAPA Property dans la table mapa_historical_sales.
//
// Sprint B2 squelette :
//   - Authentification : auth.email() doit etre Julien ou Frederic
//     (verifie cote SSR + RLS Postgres en defense en profondeur)
//   - Validation minimale (champs obligatoires + types numeriques)
//   - INSERT direct (pas d'edition / suppression : sprint suivant)

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

const ALLOWED_EMAILS = new Set([
  "j.brebion@mapagroup.org",
  "f.mannis@mapagroup.org",
]);

const ALLOWED_AGENTS = new Set(["julien", "frederic"]);

type Body = {
  property_type?: string;
  surface_habitable?: number;
  surface_terrain?: number | null;
  chambres?: number | null;
  classe_energie?: string | null;
  annee_construction?: number | null;
  etat?: string | null;
  adresse?: string;
  commune?: string;
  prix_vente?: number;
  date_acte?: string;
  agent?: string;
  notes?: string | null;
};

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user.email || !ALLOWED_EMAILS.has(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;

  // Validation des champs obligatoires.
  const property_type = strOrNull(body.property_type);
  const adresse = strOrNull(body.adresse);
  const commune = strOrNull(body.commune);
  const date_acte = strOrNull(body.date_acte);
  const agent = strOrNull(body.agent);
  const surface_habitable = numOrNull(body.surface_habitable);
  const prix_vente = numOrNull(body.prix_vente);

  if (
    !property_type ||
    !adresse ||
    !commune ||
    !date_acte ||
    !agent ||
    !ALLOWED_AGENTS.has(agent) ||
    !surface_habitable ||
    surface_habitable <= 0 ||
    !prix_vente ||
    prix_vente <= 0
  ) {
    return NextResponse.json({ error: "missing_or_invalid_fields" }, { status: 400 });
  }

  const insert = {
    property_type,
    surface_habitable: Math.round(surface_habitable),
    surface_terrain: numOrNull(body.surface_terrain),
    chambres: numOrNull(body.chambres),
    classe_energie: strOrNull(body.classe_energie),
    annee_construction: numOrNull(body.annee_construction),
    etat: strOrNull(body.etat),
    adresse,
    commune,
    prix_vente: Math.round(prix_vente),
    date_acte,
    agent,
    notes: strOrNull(body.notes),
  };

  const { data, error } = await supabase
    .from("mapa_historical_sales")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/ventes-realisees] insert error", error.message);
    // Cas tres probable : migration 20260524_mapa_historical_sales.sql pas
    // encore appliquee → renvoie un message explicite cote admin.
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export const dynamic = "force-dynamic";

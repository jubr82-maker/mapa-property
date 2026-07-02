// MAPA Property — Auth + validation partagees pour /admin/ventes-realisees.
//
// Source unique de l'allowlist (les 2 comptes admin reels) et de la
// validation des champs d'une vente, reutilisees par :
//   - POST   /api/admin/ventes-realisees        (creation)
//   - PATCH  /api/admin/ventes-realisees/[id]    (edition + toggle comparable)
//   - DELETE /api/admin/ventes-realisees/[id]    (suppression)
//
// Meme modele de securite partout : session Supabase + allowlist email
// (admin@mapagroup.org + j.brebion@mapagroup.org), en defense-en-profondeur
// avec la RLS Postgres (policies partners_read/write, migration 20260701).

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const SALES_ALLOWED_EMAILS = new Set([
  "admin@mapagroup.org",
  "j.brebion@mapagroup.org",
]);

const ALLOWED_AGENTS = new Set(["julien", "frederic"]);

type RequireOk = { ok: true; supabase: SupabaseClient; userEmail: string };
type RequireErr = { ok: false; response: NextResponse };

/**
 * Verifie session + allowlist. Retourne le client Supabase (anon+cookie,
 * soumis a la RLS) si autorise, sinon une NextResponse 401/403 prete a
 * renvoyer. Meme comportement que le POST historique.
 */
export async function requireSalesAdmin(): Promise<RequireOk | RequireErr> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!user.email || !SALES_ALLOWED_EMAILS.has(user.email)) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, supabase, userEmail: user.email };
}

export interface SaleInput {
  property_type: string;
  surface_habitable: number;
  surface_terrain: number | null;
  chambres: number | null;
  classe_energie: string | null;
  annee_construction: number | null;
  etat: string | null;
  adresse: string;
  commune: string;
  prix_vente: number;
  date_acte: string;
  agent: string;
  notes: string | null;
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function numOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

/**
 * Valide le corps d'une vente (creation OU edition complete). Memes regles
 * que le POST historique (champs obligatoires, prix>0, surface>0, agent
 * valide). Retourne { insert } si OK, sinon { error }.
 */
export function parseSaleInput(body: Record<string, unknown>): { insert?: SaleInput; error?: string } {
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
    return { error: "missing_or_invalid_fields" };
  }

  return {
    insert: {
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
    },
  };
}

import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SITE_DESIGN_TOKENS_TAG } from "@/lib/site-content";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/pilotage/audit";

/**
 * PATCH /api/admin/cms/tokens
 * Met à jour un design token (upsert sur category+token_key).
 *
 * Body JSON :
 *   { category: "font"|"color"|"spacing"|"radius",
 *     token_key: string, token_value: string,
 *     description?: string }
 */

const ALLOWED_CATEGORIES = new Set(["font", "color", "spacing", "radius"]);

export async function PATCH(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  // Messages d'erreur affiches a l'ecran, dans la langue de l'admin.
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_cms" });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: t("api_unauthorized") }, { status: 401 });
  }
  // Oct. 2026 : connecte ne suffit pas. Compte de la liste admin ET
  // session aal2 (double authentification), comme le reste de l'admin.
  const adminCheck = await requireAdminRoute();
  if (!adminCheck.ok) return adminCheck.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("api_invalid_request") }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const category = typeof b.category === "string" ? b.category.trim() : "";
  const tokenKey = typeof b.token_key === "string" ? b.token_key.trim() : "";
  const tokenValue = typeof b.token_value === "string" ? b.token_value : "";
  const description = typeof b.description === "string" ? b.description : null;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: t("api_setting_invalid") }, { status: 400 });
  }
  if (!tokenKey) {
    return NextResponse.json({ error: t("api_setting_missing") }, { status: 400 });
  }
  if (typeof b.token_value !== "string" || !tokenValue) {
    return NextResponse.json({ error: t("api_value_missing") }, { status: 400 });
  }
  if (tokenKey.length > 100 || tokenValue.length > 500) {
    return NextResponse.json({ error: t("api_value_too_long") }, { status: 413 });
  }

  // Validation simple par catégorie
  if (category === "color") {
    // Accepte #rrggbb / #rgb / rgb()/rgba()/hsl()/hsla()
    const v = tokenValue.trim();
    const ok =
      /^#[0-9a-fA-F]{3,8}$/.test(v) ||
      /^(rgb|rgba|hsl|hsla)\(/.test(v);
    if (!ok) {
      return NextResponse.json({ error: t("api_color_invalid") }, { status: 400 });
    }
  }

  const { error } = await supabase
    .from("site_design_tokens")
    .upsert(
      {
        category,
        token_key: tokenKey,
        token_value: tokenValue,
        description,
        updated_by: user.id,
      },
      { onConflict: "category,token_key" },
    );

  if (error) {
    console.error("[admin/cms/tokens] upsert error", error.message);
    console.error("[api/admin/cms/tokens]", { code: error.code });
    return NextResponse.json({ error: t("api_save_failed") }, { status: 500 });
  }

  await logAdminAction({ actorEmail: user.email, action: "settings_design_changed", targetTable: "site_design_tokens", diff: { category, token_key: tokenKey, value: tokenValue } });
  revalidateTag(SITE_DESIGN_TOKENS_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}

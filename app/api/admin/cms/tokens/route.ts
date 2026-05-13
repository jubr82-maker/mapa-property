import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SITE_DESIGN_TOKENS_TAG } from "@/lib/site-content";

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const category = typeof b.category === "string" ? b.category.trim() : "";
  const tokenKey = typeof b.token_key === "string" ? b.token_key.trim() : "";
  const tokenValue = typeof b.token_value === "string" ? b.token_value : "";
  const description = typeof b.description === "string" ? b.description : null;

  if (!ALLOWED_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "category invalide" }, { status: 400 });
  }
  if (!tokenKey) {
    return NextResponse.json({ error: "token_key requis" }, { status: 400 });
  }
  if (typeof b.token_value !== "string" || !tokenValue) {
    return NextResponse.json({ error: "token_value requis" }, { status: 400 });
  }
  if (tokenKey.length > 100 || tokenValue.length > 500) {
    return NextResponse.json({ error: "payload trop grand" }, { status: 413 });
  }

  // Validation simple par catégorie
  if (category === "color") {
    // Accepte #rrggbb / #rgb / rgb()/rgba()/hsl()/hsla()
    const v = tokenValue.trim();
    const ok =
      /^#[0-9a-fA-F]{3,8}$/.test(v) ||
      /^(rgb|rgba|hsl|hsla)\(/.test(v);
    if (!ok) {
      return NextResponse.json({ error: "couleur invalide" }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTag(SITE_DESIGN_TOKENS_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}

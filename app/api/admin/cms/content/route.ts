import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SITE_CONTENT_TAG } from "@/lib/site-content";

/**
 * PATCH /api/admin/cms/content
 * Met à jour ou crée une row site_content (upsert sur key+locale).
 *
 * Auth : session Supabase admin (cookie). Pattern aligné avec les
 * autres routes /admin/* — toute session authentifiée = admin MAPA
 * (RLS `auth.role() = 'authenticated'`).
 *
 * Body JSON :
 *   { key: string, locale: "fr"|"en"|"de", content: string,
 *     section?: string, description?: string,
 *     content_type?: "text"|"html"|"markdown" }
 */

const ALLOWED_LOCALES = new Set(["fr", "en", "de"]);
const ALLOWED_CONTENT_TYPES = new Set(["text", "html", "markdown"]);

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
  const key = typeof b.key === "string" ? b.key.trim() : "";
  const locale = typeof b.locale === "string" ? b.locale.trim() : "";
  const content = typeof b.content === "string" ? b.content : "";
  const section = typeof b.section === "string" ? b.section : null;
  const description = typeof b.description === "string" ? b.description : null;
  const contentType =
    typeof b.content_type === "string" && ALLOWED_CONTENT_TYPES.has(b.content_type)
      ? b.content_type
      : "text";

  if (!key) {
    return NextResponse.json({ error: "key requis" }, { status: 400 });
  }
  if (!ALLOWED_LOCALES.has(locale)) {
    return NextResponse.json({ error: "locale invalide" }, { status: 400 });
  }
  if (typeof b.content !== "string") {
    return NextResponse.json({ error: "content requis" }, { status: 400 });
  }
  if (key.length > 200 || content.length > 20_000) {
    return NextResponse.json({ error: "payload trop grand" }, { status: 413 });
  }

  const { error } = await supabase
    .from("site_content")
    .upsert(
      {
        key,
        locale,
        content,
        content_type: contentType,
        section,
        description,
        updated_by: user.id,
      },
      { onConflict: "key,locale" },
    );

  if (error) {
    console.error("[admin/cms/content] upsert error", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalide le cache pour que le nouveau contenu soit visible immédiatement.
  // Next 16 : 2e arg requis. `{ expire: 0 }` = invalidation immédiate (cf.
  // doc node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md).
  revalidateTag(SITE_CONTENT_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}

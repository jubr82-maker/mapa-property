// Client Supabase server-only, clé service_role — bypass RLS.
//
// Reserve aux ECRITURES des routes API publiques (app/api/*/route.ts) qui
// inseraient sinon avec la cle anon. Les droits anon INSERT/UPDATE/DELETE
// ont ete revoques sur toutes les tables (voir diagnostic formulaire
// contact) : les routes publiques qui ecrivent doivent donc passer par ce
// client, jamais par lib/supabase-server.ts (anon, reserve aux LECTURES
// publiques deja en place — cf. lib/data.ts).
//
// N'importer que depuis du code server-only (Route Handlers, Server
// Actions). Ne jamais exposer ce module a un composant client.
import { createClient } from "@supabase/supabase-js";

export const supabaseService = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );

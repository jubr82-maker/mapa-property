-- MAPA Property — Sprint ELENA-REFONTE point 8 (traces chatbot).
--
-- Cree la table `chatbot_logs`, actuellement absente mais deja attendue
-- par la page admin /admin/analytics et par app/api/admin/analytics/
-- supabase/route.ts (degradation gracieuse tant qu'elle n'existe pas).
-- Alimentee par app/api/chatbot/route.ts a chaque tour de conversation
-- (question, reponse, page d'origine, langue, moteur utilise) et par
-- l'action de consentement explicite (lead_created), sert aussi de base
-- persistante a la limite quotidienne par visiteur (point 6) : sans
-- cette table, seul le limiteur en memoire (rate-limit.ts) reste actif.
--
-- Donnees : question/answer sont le texte tel que saisi/genere par la
-- conversation elle-meme (aucun enrichissement, aucune donnee personnelle
-- non volontairement transmise par le visiteur). visitor_hash est une
-- empreinte SHA-256 (IP + sel), jamais l'IP en clair, meme convention que
-- app/api/track/route.ts et app/api/estimate/route.ts.
--
-- A APPLIQUER MANUELLEMENT par Julien dans Supabase Studio (SQL Editor).
-- Aucune ecriture DB automatique cote code (regle projet).

CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  locale TEXT NOT NULL,
  page_context TEXT,
  -- 'mistral' | 'fallback' | 'consent_accept' | 'consent_decline'
  engine TEXT NOT NULL,
  question TEXT,
  answer TEXT,
  lead_created BOOLEAN NOT NULL DEFAULT FALSE,
  -- SHA-256(ip + TRACKING_IP_SALT), 32 caracteres, jamais l'IP en clair.
  visitor_hash TEXT
);

CREATE INDEX IF NOT EXISTS chatbot_logs_created_at_idx
  ON public.chatbot_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS chatbot_logs_visitor_hash_idx
  ON public.chatbot_logs (visitor_hash, created_at);

-- RLS : donnees de conversation, meme niveau de confidentialite que
-- `leads`. Lecture/ecriture reservees aux deux adresses admin, sur le
-- modele de public.is_mapa_admin() (cf. migration 20260918_rls_admin_
-- allowlist.sql, deja appliquee en production). service_role (route API
-- publique app/api/chatbot/route.ts) bypasse RLS pour l'ecriture, comme
-- pour `leads`.
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chatbot_logs_admin_all" ON public.chatbot_logs;
CREATE POLICY "chatbot_logs_admin_all"
  ON public.chatbot_logs FOR ALL
  USING (public.is_mapa_admin())
  WITH CHECK (public.is_mapa_admin());

-- Aucun SELECT anon (coherent avec la revocation deja faite sur leads,
-- mandats, etc. par la migration 20260918).
REVOKE ALL ON public.chatbot_logs FROM anon;

-- Verification post-migration (optionnel) :
-- SELECT COUNT(*) FROM public.chatbot_logs;  -- 0 attendu
-- SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.chatbot_logs'::regclass;

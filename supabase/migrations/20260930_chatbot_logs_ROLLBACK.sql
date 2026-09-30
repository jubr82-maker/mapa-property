-- Rollback de 20260930_chatbot_logs.sql.
-- A executer manuellement par Julien si la table doit etre retiree.
-- Effet immediat sur le code : app/api/chatbot/route.ts et
-- app/api/admin/analytics/supabase/route.ts degradent gracieusement des
-- que la table redevient absente (memes garde-fous que pour son absence
-- initiale) ; seule la limite quotidienne par visiteur repasse alors sur
-- le limiteur en memoire (rate-limit.ts).

DROP POLICY IF EXISTS "chatbot_logs_admin_all" ON public.chatbot_logs;
DROP TABLE IF EXISTS public.chatbot_logs;

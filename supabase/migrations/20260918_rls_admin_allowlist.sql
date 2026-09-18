-- DEJA EXECUTE MANUELLEMENT EN PRODUCTION le 18 septembre 2026 (SQL Editor
-- Supabase, par Julien). Ce fichier documente a posteriori ce qui a ete
-- fait en base — NE PAS LE REJOUER AVEUGLEMENT (les policies visees
-- existent deja avec le nom exact attendu par ces ALTER POLICY ; un
-- re-run sur un environnement ou elles n'existent pas sous ce nom
-- echouera, et un re-run sur la prod actuelle est un no-op au mieux).
--
-- Objectif : remplacer, sur chaque policy listee, la condition generique
-- "authenticated" (auth.uid() is not null / auth.role() = 'authenticated')
-- par l'allowlist email public.is_mapa_admin(), et retirer le SELECT anon
-- residuel sur les tables sensibles. Rollback : voir le fichier
-- 20260918_rls_admin_allowlist_ROLLBACK.sql du meme dossier.

create or replace function public.is_mapa_admin()
returns boolean language sql stable as $$
  select coalesce(auth.email(), '') = any (array['admin@mapagroup.org','j.brebion@mapagroup.org'])
$$;

alter policy "authenticated all mandats" on public.mandats using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all leads" on public.leads using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all arcova" on public.arcova_waitlist using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all estimations" on public.estimations using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all properties" on public.properties using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all property images" on public.property_images using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all blog posts" on public.blog_posts using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all reviews" on public.reviews using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "authenticated all tmp" on public.tmp_property_images_import using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "offmarket_admin_all" on public.properties_offmarket using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "offmarket_requests_admin_all" on public.offmarket_requests using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "offmarket_audit_admin_all" on public.offmarket_audit_log using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "documents_admin_all" on public.documents using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "site_content_admin_write" on public.site_content using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "site_design_tokens_admin_write" on public.site_design_tokens using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "commune_baseline_admin_write" on public.commune_baseline using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "vdl_admin_write" on public.vdl_quartier_baseline using (public.is_mapa_admin()) with check (public.is_mapa_admin());
alter policy "estimation_requests_admin_update" on public.estimation_requests using (public.is_mapa_admin()) with check (public.is_mapa_admin());

alter policy "properties_authenticated_read_all" on public.properties using (public.is_mapa_admin());
alter policy "property_images_authenticated_read_all" on public.property_images using (public.is_mapa_admin());
alter policy "pv_admin_read" on public.property_views using (public.is_mapa_admin());
alter policy "tracking_events_select_admin" on public.tracking_events using (public.is_mapa_admin());
alter policy "estimation_requests_admin_read" on public.estimation_requests using (public.is_mapa_admin());

revoke select on public.leads, public.mandats, public.documents, public.estimations,
  public.estimation_requests, public.offmarket_requests, public.offmarket_audit_log,
  public.arcova_waitlist, public.tracking_events, public.property_views,
  public.agency_admins, public.tmp_property_images_import, public.mapa_historical_sales from anon;

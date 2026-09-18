-- ROLLBACK de 20260918_rls_admin_allowlist.sql. NON EXECUTE. Ce script
-- annule la migration ci-dessus et retablit l'etat des policies tel que
-- releve avant l'execution du 18 septembre 2026 (conditions generiques
-- "authenticated", sans allowlist email, et SELECT anon retabli sur les
-- tables sensibles). Ne pas jouer sans raison documentee — reviendrait a
-- rouvrir l'acces a des donnees personnelles/confidentielles a tout
-- compte authentifie (voir audit du 18 septembre 2026).

alter policy "authenticated all mandats" on public.mandats using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all leads" on public.leads using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all arcova" on public.arcova_waitlist using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all estimations" on public.estimations using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all properties" on public.properties using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all property images" on public.property_images using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all blog posts" on public.blog_posts using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all reviews" on public.reviews using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "authenticated all tmp" on public.tmp_property_images_import using (auth.uid() is not null) with check (auth.uid() is not null);
alter policy "offmarket_admin_all" on public.properties_offmarket using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "offmarket_requests_admin_all" on public.offmarket_requests using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "offmarket_audit_admin_all" on public.offmarket_audit_log using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "documents_admin_all" on public.documents using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "site_content_admin_write" on public.site_content using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "site_design_tokens_admin_write" on public.site_design_tokens using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "commune_baseline_admin_write" on public.commune_baseline using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "vdl_admin_write" on public.vdl_quartier_baseline using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "estimation_requests_admin_update" on public.estimation_requests using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
alter policy "properties_authenticated_read_all" on public.properties using (true);
alter policy "property_images_authenticated_read_all" on public.property_images using (true);
alter policy "pv_admin_read" on public.property_views using (true);
alter policy "tracking_events_select_admin" on public.tracking_events using (auth.role() = 'authenticated');
alter policy "estimation_requests_admin_read" on public.estimation_requests using (auth.role() = 'authenticated');
grant select on public.leads, public.mandats, public.documents, public.estimations,
  public.estimation_requests, public.offmarket_requests, public.offmarket_audit_log,
  public.arcova_waitlist, public.tracking_events, public.property_views,
  public.agency_admins, public.tmp_property_images_import, public.mapa_historical_sales to anon;

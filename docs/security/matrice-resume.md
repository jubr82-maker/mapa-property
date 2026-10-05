# Matrice de couverture : resume

Genere par `node scripts/security/audit-inventory.mjs` le 2026-10-05. Detail : docs/security/matrice.csv.

| Categorie | Elements | Regle de recherche |
|---|---|---|
| 1. Pages et gabarits | 76 | fichiers app/**/page.tsx et app/**/layout.tsx (find app -name page.tsx -o -name layout.tsx) |
| 2. Routes API et intercepteur | 45 | app/**/route.ts + app/robots.ts + app/sitemap.ts + proxy.ts (find app -name route.ts) |
| 3. Actions serveur | 60 | fonctions `export async function` des fichiers commencant par "use server" (grep -rl '^"use server"') |
| 4. Base de donnees | 52 | CREATE TABLE/VIEW/FUNCTION/TRIGGER des fichiers supabase/**/*.sql + tables lues par le code (grep from("...")) |
| 5. Stockage | 8 | storage.from("x"), sbUrl("x"), BUCKET = "x", bucket_id = 'x' (code et SQL) + clients R2 de lib/r2.ts |
| 6. Saisies des visiteurs | 8 | composants et modules hors admin contenant fetch("/api/...") (grep -rl 'fetch("/api/') |
| 7. Envois de fichiers | 3 | formData.get("file") / instanceof File dans app (grep -rn 'instanceof File\|formData.get("file")') |
| 8. Variables d'environnement | 51 | process.env.NOM dans app, lib, components, proxy.ts, next.config.ts, sentry.*.config.ts |
| 9. Services tiers | 14 | hotes des appels fetch serveur, SDK (Supabase, R2, SMTP) et directives CSP script/connect/img/frame |
| 10. En-tetes et CSP | 24 | securityHeaders et csp de next.config.ts + en-tetes poses par proxy.ts |
| 11. Cookies | 7 | cookies.set / document.cookie / COOKIE dans le code + cookies poses par les bibliotheques et services |
| 12. Envois d'e-mails | 6 | appels sendMail( dans lib/email + e-mails d'authentification Supabase |
| **Total inventaire** | **354** | |

Lignes de la matrice : **354**. Total de l'inventaire : **354**. Egalite verifiee.

Cases : 1398 conformes, 43 failles ouvertes, 39 a verifier hors depot, 2768 sans objet (354 x 12 = 4248).

## Failles ouvertes

- 2. Routes API et intercepteur | /api/arcova-waitlist [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/chatbot [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/contact [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/estimate [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/lead [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/liste-attente [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/nda-offmarket [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/nda-request [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 2. Routes API et intercepteur | /api/offmarket-request [POST] | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table admin_auth_log | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table arcova_waitlist | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table chatbot_logs | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table estimation_requests | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table leads | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table leads_notifications | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table lu_market_prices_by_commune | Authentification | regle lu_market_prices_admin_write sans is_mapa_admin (ASVS 4.1.3) : correction prete, bloc A
- 4. Base de donnees | table lu_market_prices_by_commune | Autorisation | ecriture par tout compte connecte, correction SQL non executee
- 4. Base de donnees | table mandate_requests | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table mandates_requests | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table mandats | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table mapa_historical_sales | Authentification | regle mapa_historical_sales_partners_write sans is_mapa_admin (ASVS 4.1.3) : correction prete, bloc A
- 4. Base de donnees | table mapa_historical_sales | Autorisation | ecriture par tout compte connecte, correction SQL non executee
- 4. Base de donnees | table nda_requests | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table offmarket_requests | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table property_views | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | table tracking_events | Donnees personnelles | aucune duree de conservation appliquee (ASVS 8.3.4), decision Julien
- 4. Base de donnees | fonction bump_offmarket_requests_count | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction estimation_requests_touch_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction is_mapa_admin | Autorisation | n'exige pas aal2 tant que le bloc B n'est pas execute
- 4. Base de donnees | fonction is_mapa_admin | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction lu_market_prices_touch_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction mapa_historical_sales_touch_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction set_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction site_content_touch_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 4. Base de donnees | fonction site_design_tokens_touch_updated_at | Injection | search_path non fixe (ASVS 14.2, linter Supabase) : correction prete, bloc D
- 5. Stockage | bucket Supabase documents | Authentification | ecriture tout compte connecte : correction prete, bloc A
- 5. Stockage | bucket Supabase documents | Autorisation | ecriture tout compte connecte : correction prete, bloc A
- 5. Stockage | bucket Supabase documents | Donnees personnelles | documents internes lisibles par URL (ASVS 12.4.1) : accord requis pour le rendre prive
- 5. Stockage | bucket Supabase offmarket-photos | Authentification | ecriture tout compte connecte : correction prete, bloc A
- 5. Stockage | bucket Supabase offmarket-photos | Autorisation | ecriture tout compte connecte : correction prete, bloc A
- 10. En-tetes et CSP | CSP script-src | Affichage HTML | 'unsafe-inline' et 'unsafe-eval' (ASVS 14.4.3) : CSP a nonce, accord requis
- 11. Cookies | sb-<projet>-auth-token (Supabase, session) | Authentification | lisible par JavaScript (non HttpOnly), exigence du client navigateur Supabase (ASVS 3.4.2) : changement d'architecture, accord requis
- 11. Cookies | sb-<projet>-auth-token (Supabase, session) | Secrets | lisible par JavaScript (non HttpOnly), exigence du client navigateur Supabase (ASVS 3.4.2) : changement d'architecture, accord requis

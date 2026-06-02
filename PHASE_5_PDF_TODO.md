# Phase 5 — Génération PDF Avis de Valeur (à faire en session dédiée)

## Pré-requis
- `pnpm add @react-pdf/renderer` (génération PDF serveur React, ~250kb)
- Bucket Supabase Storage `avis-de-valeur/` à créer
- (Optionnel) `SUPABASE_SERVICE_ROLE_KEY` pour upload bypass RLS, sinon utiliser signed upload URLs

## Structure 9 pages (TEGoVA EVS)
1. Couverture — logo MAPA Property + "AVIS DE VALEUR" + adresse bien + date + ref dossier
2. Sommaire exécutif — prix retenu, fourchette, méthode dominante, confidence
3. Description du bien — caractéristiques détaillées en narratif (depuis `internal_output.inputs_snapshot`)
4-5. Méthodologie — 5 méthodes EVS expliquées (texte pro accessible, pas formules)
6. Détail méthodes retenues — uniquement celles cochées en BO `/admin/estimations/[id]`, avec valeurs
7. Conclusion + signature Real Estate Director + tampon MAPA Property
8. Mentions légales — limites responsabilité, mention "MAPA PROPERTY – marque de MAPA Synergy Sàrl"
9. Contact — pas de tel: en clair (idem ContactReveal), CTA www.mapaproperty.lu

## Header doc (toutes pages)
- Logo MAPA Property centré (utiliser `public/logo-mapa-property-mono.png` couleur or `#C8A04A`)
- Filet copper sous logo

## Footer doc (toutes pages, identique)
```
MAPA PROPERTY – une marque de MAPA Synergy Sàrl
N° LBR: B241974 | TVA: LU 31988923 | AE: N°10108681 / 0–1–2–3
Matricule: 2020 2407 901 | IBAN: LU88 0019 5655 88 84 9000 | BIC: BCEELULL
www.mapaproperty.lu
```

## Architecture proposée
- `lib/pdf/avis-de-valeur.tsx` : composant React-PDF principal
- `lib/pdf/components/` : Header, Footer, MethodCard, etc.
- `app/api/admin/estimations/[id]/pdf/route.ts` : génère PDF + upload Storage + retourne URL signée 7j
- BO `/admin/estimations/[id]` : bouton "Générer Avis de Valeur" qui appelle l'API

## Workflow attendu
1. Julien clique "Générer Avis de Valeur" dans BO détail estimation
2. API génère PDF avec react-pdf + données estimation_requests + commune_baseline pour contexte
3. Upload Supabase Storage `avis-de-valeur/{estimation_id}.pdf`
4. Retourne URL signée 7j au BO
5. Bouton "Envoyer au client" : email auto via Resend avec lien PDF + signature Julien

## Estimation effort
~1 session dédiée (3-4h) :
- 30min setup react-pdf + bucket Storage
- 90min design template 9 pages
- 30min génération + upload + URL signée
- 30min intégration bouton BO + email auto Resend
- 30min tests

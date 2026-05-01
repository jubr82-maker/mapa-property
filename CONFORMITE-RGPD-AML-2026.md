# Audit Conformité RGPD & AML — MAPA Property
## V28 FINAL9 · Avril 2026

⚠️ **DISCLAIMER IMPORTANT**

Ce document a une visée **informative et technique**. Il recense les bonnes pratiques et les obligations principales applicables à une agence immobilière luxembourgeoise en 2026. Il **ne constitue pas un avis juridique**. Pour toute mise en conformité opposable, une **validation par un avocat luxembourgeois ou un consultant CNPD/CSSF** est **indispensable**.

En particulier, les aspects AML (lutte anti-blanchiment) évoluent rapidement suite à la directive UE 2024/1640 et nécessitent un suivi réglementaire continu.

---

## 1. Cadre légal applicable en 2026

### 1.1 RGPD (protection des données personnelles)

**Textes de référence** :
- **Règlement (UE) 2016/679** (RGPD) — toujours en vigueur
- **Loi luxembourgeoise du 1er août 2018** (loi sur la protection des données)
- **Loi du 1er août 2018** portant organisation de la **CNPD** (Commission Nationale pour la Protection des Données)
- **Directive ePrivacy** en cours de révision (attente règlement ePrivacy, pas encore adopté en 2026)

**Autorité compétente** : CNPD — Belval, Esch-sur-Alzette.

### 1.2 AML / Lutte anti-blanchiment (LBC/FT)

**Textes de référence 2026** :
- **Directive UE 2024/1640** (6e directive AML, transposée partiellement en 2026)
- **Règlement UE 2024/1624** (Single Rulebook AML) — applicable à partir de juillet 2027, mais préparation dès 2026
- **Loi luxembourgeoise modifiée du 12 novembre 2004** relative à la lutte contre le blanchiment et le financement du terrorisme
- **AED** (Administration de l'Enregistrement, des Domaines et de la TVA) — autorité AML pour les agents immobiliers
- **Loi du 13 janvier 2019** instaurant le Registre des Bénéficiaires Effectifs (RBE)

**Les agents immobiliers sont considérés comme "entités assujetties"** au sens de la loi AML luxembourgeoise (article 2 LBC/FT). Les agents immobiliers doivent appliquer des mesures de vigilance à l'égard de la clientèle (CDD / KYC) lorsqu'ils interviennent en tant qu'intermédiaires dans des transactions immobilières dépassant certains seuils.

### 1.3 Autres obligations applicables

- **Loi du 17 décembre 2021** (droit de la consommation) : mentions légales obligatoires
- **Loi du 25 mars 2020** (e-commerce et services société de l'information) : mentions obligatoires pour tout site web
- **Code du travail luxembourgeois** (si MAPA emploie des salariés)

---

## 2. Audit du site actuel (V28 FINAL9)

### 2.1 ✅ Ce qui est en place

| Élément | Statut | Localisation |
|---|---|---|
| **Mentions légales** | ✅ | `m-legal` avec onglet "Mentions légales" |
| **CGU** | ✅ | `m-legal` onglet "CGU" |
| **Honoraires affichés** | ✅ | `m-legal` onglet "Honoraires" |
| **Certificat de sincérité** | ✅ | Document agence (production) |
| **Immatriculation LBR** | ✅ | Visible dans le footer et Schema.org (B241974) |
| **Numéro TVA** | ✅ | Footer + Schema.org (LU 31988923) |
| **Autorisation d'établissement** | ✅ | Footer (N°10108681) |
| **IBAN / BIC** | ✅ | Footer |
| **Adresse siège** | ✅ | Footer + Schema.org + mentions légales |
| **Formulaires de contact** | ✅ | Multiples, fonctionnels |
| **Mandat de recherche signable** | ✅ | `m-mandat` + déclinaisons auto/exclu/semi/simple |
| **AML KYC formulaire** | ✅ | Document agence (production) |
| **GDPR formulaire** | ✅ | Document agence (production) |

### 2.2 🔴 Ce qui manque CRITIQUE

| Manque | Impact | Priorité |
|---|---|---|
| **Bandeau cookies RGPD** | Obligatoire dès qu'il y a des cookies non strictement nécessaires (Supabase, analytics, etc.) | 🔴 URGENT |
| **Politique de confidentialité dédiée** (séparée des mentions légales) | Obligatoire RGPD art. 13 | 🔴 URGENT |
| **Mécanisme d'exercice des droits RGPD** (accès, rectification, suppression, portabilité) | Obligatoire RGPD art. 15-22 | 🔴 URGENT |
| **Registre des traitements** interne | Obligatoire RGPD art. 30 (si > 250 salariés OU traitement à risque) | 🟡 À valider avec avocat |
| **DPO ou point de contact RGPD** | Obligatoire si traitement à grande échelle | 🟡 À valider |
| **Politique AML publique** (obligation de vigilance affichée) | Bonne pratique, non obligatoire | 🟢 Recommandé |
| **Journalisation des consentements** | Obligatoire RGPD (preuve de consentement) | 🔴 URGENT |
| **Anonymisation automatique des leads** après durée de conservation | Bonne pratique RGPD + réduction risque | 🟡 Important |

### 2.3 🟡 Ce qui est à améliorer

1. **Formulaires sans case de consentement explicite** : les formulaires de lead (estimation, mandat, contact, ARCOVA) collectent des données personnelles sans case à cocher "J'accepte la politique de confidentialité". Obligatoire RGPD.

2. **Durée de conservation des données non indiquée** : tu dois dire au visiteur combien de temps tu gardes ses données.

3. **Pas de double opt-in pour les emails marketing** : si tu envoies des newsletters, il faut confirmation par email.

4. **Pas de table d'audit Supabase** : qui a accédé à quoi, quand.

---

## 3. Plan de mise en conformité — Actions concrètes

### 3.1 🔴 Action 1 : Bandeau cookies conforme (PRIORITÉ ABSOLUE)

**Code HTML à ajouter dans `index.html`** (juste avant la fermeture `</body>`) :

```html
<!-- Bandeau cookies RGPD -->
<div id="cookie-banner" style="display:none;position:fixed;bottom:0;left:0;right:0;background:rgba(15,26,42,.97);color:#fff;padding:20px 24px;z-index:9999;box-shadow:0 -4px 20px rgba(0,0,0,.3)">
  <div style="max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:280px">
      <p style="font-family:'Cormorant Garamond',serif;font-size:15px;line-height:1.6;margin:0">
        Nous utilisons des cookies strictement nécessaires au fonctionnement du site ainsi que des cookies de mesure d'audience anonymisés. Vous pouvez accepter, refuser ou personnaliser votre choix.
        <a href="/politique-confidentialite" style="color:#b8865a;text-decoration:underline;margin-left:4px">Politique de confidentialité</a>
      </p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button onclick="cookieAccept()" style="background:#b8865a;color:#fff;border:none;padding:10px 20px;cursor:pointer;font-family:'Cinzel',serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase">Accepter</button>
      <button onclick="cookieRefuse()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);padding:10px 20px;cursor:pointer;font-family:'Cinzel',serif;font-size:11px;letter-spacing:.2em;text-transform:uppercase">Refuser</button>
    </div>
  </div>
</div>

<script>
/* Affichage conditionnel du bandeau : uniquement si pas déjà statué */
(function(){
  try{
    if(!localStorage.getItem('mp_cookie_consent')){
      document.getElementById('cookie-banner').style.display='block';
    }
  }catch(e){}
})();
window.cookieAccept=function(){
  try{localStorage.setItem('mp_cookie_consent','accepted');localStorage.setItem('mp_cookie_date',new Date().toISOString());}catch(e){}
  document.getElementById('cookie-banner').style.display='none';
};
window.cookieRefuse=function(){
  try{localStorage.setItem('mp_cookie_consent','refused');localStorage.setItem('mp_cookie_date',new Date().toISOString());}catch(e){}
  document.getElementById('cookie-banner').style.display='none';
};
</script>
```

### 3.2 🔴 Action 2 : Politique de confidentialité

Créer une nouvelle page `/politique-confidentialite` avec ce texte type (à adapter et faire valider par un avocat) :

```markdown
# Politique de confidentialité — MAPA Property

*Dernière mise à jour : [DATE]*

## 1. Responsable du traitement

MAPA Property est une marque de MAPA Synergy Sàrl.
**Adresse** : [adresse du siège]
**LBR** : B241974
**TVA** : LU 31988923
**Contact** : admin@mapagroup.org

## 2. Données collectées

Nous collectons les données suivantes lorsque vous utilisez nos formulaires :
- Identité : prénom, nom, civilité
- Contact : adresse e-mail, numéro de téléphone
- Informations liées à votre projet immobilier : budget indicatif, type de bien recherché, localisation souhaitée, situation familiale, situation patrimoniale (pour les mandats de recherche exclusifs uniquement)
- Données techniques : adresse IP, type de navigateur, pages visitées (via cookies analytiques anonymisés)

## 3. Finalités et bases légales

| Finalité | Base légale RGPD |
|---|---|
| Répondre à votre demande de contact | Mesures précontractuelles (art. 6.1.b) |
| Gérer un mandat de vente/recherche/estimation | Exécution d'un contrat (art. 6.1.b) |
| Obligations AML / KYC | Obligation légale (art. 6.1.c) |
| Newsletter commerciale | Consentement (art. 6.1.a) |
| Amélioration du site | Intérêt légitime (art. 6.1.f) |

## 4. Durées de conservation

| Catégorie | Durée | Justification |
|---|---|---|
| Prospect non converti | 3 ans après dernier contact | Délai de prescription commerciale |
| Client actif | Durée du mandat + 5 ans | Obligations fiscales + AML |
| Dossier AML / KYC | 5 ans après fin de la relation | Art. 3 loi LBC/FT |
| Cookies analytiques | 13 mois maximum | Recommandation CNPD |

## 5. Destinataires des données

Vos données sont accessibles uniquement à :
- L'équipe MAPA Property (Julien Brebion, Frédéric Mannis)
- Nos sous-traitants techniques : Supabase (hébergement base de données, certifiée RGPD), Netlify (hébergement site)
- Nos partenaires locaux sous mandat (uniquement si vous signez un mandat international, et sur la base d'une convention de confidentialité)
- Les autorités compétentes sur réquisition légale (AED, CSSF, police judiciaire)

Aucun transfert hors UE sans garantie adéquate (clauses types UE 2021).

## 6. Vos droits

Vous disposez des droits suivants, exerçables à tout moment :

- **Droit d'accès** : obtenir copie de vos données
- **Droit de rectification** : corriger des données inexactes
- **Droit à l'effacement** (droit à l'oubli) : sous réserve d'obligations légales
- **Droit d'opposition** au traitement
- **Droit à la limitation** du traitement
- **Droit à la portabilité** : récupérer vos données dans un format standard
- **Droit de retirer votre consentement** à tout moment

Pour exercer ces droits : **admin@mapagroup.org** avec copie de pièce d'identité (article 12 RGPD).

**Délai de réponse** : 1 mois (prolongeable à 3 mois pour demandes complexes).

## 7. Réclamation

Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNPD (Commission Nationale pour la Protection des Données) :
**15, Boulevard du Jazz, L-4370 Belvaux — Luxembourg**
**www.cnpd.public.lu**

## 8. Cookies

Notre site utilise :

| Cookie | Finalité | Durée | Obligatoire ? |
|---|---|---|---|
| `mp_cookie_consent` | Mémorisation de votre choix | 13 mois | Non (mais nécessaire pour éviter de vous redemander) |
| `mp_biens`, `mp_avis`, etc. | Fonctionnement du site (favoris, langue) | 1 an | Oui |
| Analytics (si activé) | Mesure d'audience anonymisée | 13 mois | Non, soumis à consentement |

Vous pouvez gérer vos préférences à tout moment via le bandeau cookies.

## 9. Modifications

Cette politique peut être modifiée. La date en haut du document indique la dernière mise à jour.
```

### 3.3 🔴 Action 3 : Ajouter les cases de consentement sur les formulaires

Dans **chaque formulaire** (estimation, mandat, contact, ARCOVA, achat, location, vente), ajouter **avant le bouton de soumission** :

```html
<div style="display:flex;align-items:flex-start;gap:10px;margin:16px 0;padding:14px;background:rgba(184,134,90,.05);border:1px solid var(--l1);font-size:13px;line-height:1.6;color:var(--ink2)">
  <input type="checkbox" id="consent-rgpd" required style="margin-top:3px;flex-shrink:0">
  <label for="consent-rgpd" style="cursor:pointer">
    J'accepte que mes données soient traitées par MAPA Property pour répondre à ma demande, dans les conditions de la <a href="/politique-confidentialite" target="_blank" style="color:var(--cu);text-decoration:underline">politique de confidentialité</a>. Je peux retirer mon consentement à tout moment. <span style="color:#c00">*</span>
  </label>
</div>
```

Et côté JS : **bloquer l'envoi** tant que la case n'est pas cochée :

```javascript
/* Avant tout envoi de formulaire, vérifier le consentement */
function checkConsent(formId){
  var cb=document.querySelector('#'+formId+' #consent-rgpd');
  if(cb && !cb.checked){
    toast("Veuillez accepter la politique de confidentialité pour continuer.");
    return false;
  }
  return true;
}
```

### 3.4 🔴 Action 4 : Anonymisation automatique Supabase (SQL)

Ajoute cette **fonction SQL** dans ton éditeur SQL Supabase pour anonymiser automatiquement les leads vieux de 3 ans :

```sql
-- ═══════════════════════════════════════════════════════════════
-- V28 FINAL9 — Anonymisation automatique RGPD
-- Exécutée quotidiennement via Supabase Edge Function + cron
-- ═══════════════════════════════════════════════════════════════

-- 1. Fonction principale : anonymise les leads > 3 ans sans activité
CREATE OR REPLACE FUNCTION anonymize_old_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date TIMESTAMP := NOW() - INTERVAL '3 years';
  count_anon INT;
BEGIN
  -- Table leads / contacts (adapte les noms de tables selon ta structure Supabase réelle)
  UPDATE contacts
  SET
    email = 'anonymized-' || id || '@example.invalid',
    phone = NULL,
    first_name = 'ANONYMIZED',
    last_name = 'ANONYMIZED',
    message = 'Données anonymisées automatiquement (RGPD)',
    anonymized_at = NOW()
  WHERE created_at < cutoff_date
    AND anonymized_at IS NULL;
  
  GET DIAGNOSTICS count_anon = ROW_COUNT;
  
  -- Journalisation dans table audit
  INSERT INTO rgpd_audit_log (action, count, performed_at)
  VALUES ('auto_anonymize', count_anon, NOW());
END;
$$;

-- 2. Table d'audit RGPD
CREATE TABLE IF NOT EXISTS rgpd_audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  count INT,
  target_id TEXT,
  performed_at TIMESTAMP DEFAULT NOW()
);

-- 3. RLS pour la table d'audit (lecture admin uniquement)
ALTER TABLE rgpd_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
ON rgpd_audit_log
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- 4. Ajouter colonne anonymized_at si elle n'existe pas
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP;

-- 5. Planification via pg_cron (Supabase Pro)
-- À exécuter tous les jours à 3h du matin
SELECT cron.schedule(
  'anonymize-leads-daily',
  '0 3 * * *',
  $$SELECT anonymize_old_leads();$$
);
```

**⚠️ Important** : adapte les noms de tables/colonnes à ta structure Supabase réelle. Fais d'abord un test sur un environnement staging.

### 3.5 🟡 Action 5 : Table "registre des consentements"

```sql
-- Registre des consentements (preuve en cas de contrôle CNPD)
CREATE TABLE IF NOT EXISTS consent_log (
  id BIGSERIAL PRIMARY KEY,
  email TEXT,
  phone TEXT,
  consent_type TEXT NOT NULL, -- 'rgpd_form' | 'cookies_accept' | 'cookies_refuse' | 'newsletter_optin'
  form_context TEXT, -- 'contact' | 'estimation' | 'mandat' | 'arcova' | etc.
  ip_address INET,
  user_agent TEXT,
  consented_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consent_email ON consent_log(email);
CREATE INDEX idx_consent_date ON consent_log(consented_at);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insert consent from public"
ON consent_log
FOR INSERT
TO anon
WITH CHECK (true);
```

Côté JS, à chaque soumission de formulaire :

```javascript
async function logConsent(email, phone, type, context){
  try{
    await fetch(SUPA+'/rest/v1/consent_log', {
      method:'POST',
      headers:{
        'apikey':KEY,
        'Authorization':'Bearer '+KEY,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body: JSON.stringify({
        email: email || null,
        phone: phone || null,
        consent_type: type,
        form_context: context,
        user_agent: navigator.userAgent
      })
    });
  }catch(e){console.error('[MAPA] Erreur log consent:',e);}
}
```

### 3.6 🟡 Action 6 : Formulaire d'exercice des droits RGPD

Ajoute une page `/droits-rgpd` avec un formulaire dédié où l'utilisateur peut :

1. Demander accès à ses données
2. Demander la rectification
3. Demander l'effacement
4. Demander la portabilité
5. S'opposer au traitement

Le formulaire doit demander une **copie de pièce d'identité** (article 12 RGPD pour vérifier l'identité du demandeur) et envoyer un mail à `admin@mapagroup.org` pour traitement manuel.

---

## 4. AML / Lutte anti-blanchiment — Focus agence immobilière

### 4.1 Obligations générales

En tant qu'agence immobilière luxembourgeoise, MAPA Property doit :

1. **Identifier et vérifier l'identité du client** (CDD — Customer Due Diligence) pour toute transaction > 10 000 € (ou en dessous si soupçon)
2. **Identifier le bénéficiaire effectif** (BE) s'il s'agit d'une personne morale
3. **Collecter et conserver les pièces justificatives** pendant **5 ans minimum** après la fin de la relation
4. **Évaluer les risques** (risk-based approach) : client PEP, pays à risque, structure complexe
5. **Déclarer les opérations suspectes** auprès de la CRF (Cellule de Renseignement Financier) via le système goAML
6. **Former le personnel** régulièrement aux obligations AML

### 4.2 Documents à collecter systématiquement

Pour un **client personne physique** :
- Pièce d'identité (CNI, passeport)
- Justificatif de domicile < 3 mois
- Justificatif d'origine des fonds (relevé bancaire, acte de vente précédent, décision d'héritage, etc.)
- Déclaration PEP (Personne Politiquement Exposée)

Pour un **client personne morale** (société) :
- Extrait LBR < 3 mois
- Statuts à jour
- Identité des bénéficiaires effectifs > 25%
- Justificatif d'origine des fonds de la société

### 4.3 Nouveautés 2026 (directive 2024/1640)

- **Seuil CDD abaissé** pour certaines opérations immobilières à risque
- **Registre des Bénéficiaires Effectifs (RBE)** renforcé : accès restreint aux "intérêt légitime"
- **Transparence accrue** sur les fiducies et structures équivalentes
- **Obligation de désignation d'un "compliance officer"** (ou sous-traitance à un cabinet agréé si pas de ressource interne)

### 4.4 Outils recommandés

- **goAML** (système FIU-LU) : déclaration de soupçon en ligne
- **RBE** : consultation des bénéficiaires effectifs luxembourgeois
- **World-Check** ou **Dow Jones Risk & Compliance** : screening PEP/sanctions
- **Solutions SaaS AML** : SmartSearch, Veriff, Sumsub pour l'onboarding digital

### 4.5 Ce que MAPA doit afficher publiquement

Sur le site, il est recommandé (mais pas obligatoire) d'ajouter une mention du type :

> **Conformité AML** — En tant qu'entité assujettie à la loi luxembourgeoise du 12 novembre 2004 modifiée relative à la lutte contre le blanchiment et le financement du terrorisme, MAPA Property applique des mesures de vigilance renforcée à l'égard de sa clientèle, en particulier pour les transactions supérieures à 10 000 €. Nous vous remercions de votre coopération pour la transmission des documents requis.

---

## 5. Plan d'action priorisé — à effectuer dans les 30 jours

| # | Action | Durée estimée | Priorité |
|---|---|---|---|
| 1 | Ajouter bandeau cookies | 30 min | 🔴 URGENT |
| 2 | Créer page `/politique-confidentialite` | 2h | 🔴 URGENT |
| 3 | Ajouter case consentement sur TOUS les formulaires | 2h | 🔴 URGENT |
| 4 | Créer table `consent_log` Supabase | 30 min | 🔴 URGENT |
| 5 | Créer page `/droits-rgpd` avec formulaire | 2h | 🟡 IMPORTANT |
| 6 | Fonction SQL anonymisation auto | 1h | 🟡 IMPORTANT |
| 7 | Table `rgpd_audit_log` + RLS | 30 min | 🟡 IMPORTANT |
| 8 | Mention AML dans mentions légales | 15 min | 🟢 RECOMMANDÉ |
| 9 | Procédure interne KYC documentée | 4h | 🟢 RECOMMANDÉ |
| 10 | Validation juridique par avocat | variable | 🟡 OBLIGATOIRE avant déploiement en prod |

**Budget estimé** pour la validation juridique par un avocat luxembourgeois spécialisé RGPD/AML : **800 à 2 000 €** selon cabinet.

---

## 6. Outils et ressources

### 6.1 Sites officiels

- **CNPD** : https://cnpd.public.lu
- **AED** (AML immobilier) : https://pfi.public.lu
- **CRF (goAML)** : https://justice.public.lu/fr/organisation-justice/crf
- **RBE** : https://www.lbr.lu

### 6.2 Ressources pratiques

- Guide CNPD "PME et RGPD" (téléchargeable gratuitement)
- Guide AED sur les obligations AML des agents immobiliers
- **Luxembourg Bankers Association** (ABBL) : conseils AML
- **Chambre de commerce Luxembourg** : formations compliance

---

## 7. Conclusion

Le site MAPA Property a **une base de conformité solide** sur les mentions obligatoires (LBR, TVA, honoraires, siège) mais **des lacunes critiques** sur le volet RGPD (bandeau cookies, politique de confidentialité, consentements, exercice des droits).

**Les 4 actions urgentes** (bandeau cookies, politique de confidentialité, consentements formulaires, table consent_log) peuvent être implémentées en **~6 heures de développement** et doivent être prioritaires avant toute campagne publicitaire.

Pour l'AML, tu es déjà globalement conforme via tes documents internes (formulaire AML/KYC existant, certificat de sincérité). Les évolutions 2026-2027 nécessiteront un suivi continu — je te recommande de t'abonner aux newsletters CNPD et AED.

**⚠️ Rappel final** : ce document est **indicatif**. Une validation par un avocat luxembourgeois spécialisé est **indispensable** avant publication, en particulier pour la politique de confidentialité et les procédures AML.

---

*Document généré le 22 avril 2026 — build V28 FINAL9*
*Auteurs : Claude (Anthropic) sur la base des règles publiques connues à cette date*
*⚠️ À faire valider par un avocat spécialisé CNPD/AML Luxembourg avant usage opposable*

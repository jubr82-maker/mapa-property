-- =====================================================================
-- 36 CORRECTIONS DES QUESTIONS FREQUENTES PUBLIEES
-- MAPA Property, prepare le 2026-11-12. MODIFIE uniquement les reponses
-- (FR, EN, DE) de trois questions de public.faqs, reperees par leur
-- question_fr EXACTE (toutes pages du site confondues). Aucune autre ligne,
-- aucune structure, aucun droit (RLS) n'est modifie. Les reponses d'Elena
-- (page_key 'elena', SQL 37 : memes intitules pour deux d'entre elles) ne
-- sont JAMAIS touchees : leur texte valide reste mot pour mot.
--   1. "Qu'est-ce que le Bëllegen Akt ?" : 45 000 euros par acquereur
--      depuis le 16 juillet 2026 (communique du gouvernement du
--      16 juillet 2026), sans mention de la loi du 3 juillet 2025 ;
--   2. "Quels sont les honoraires de mise en location ?" : un mois de loyer
--      HT, etat des lieux inclus, partage par moitie (loi du 23 juillet 2024) ;
--   3. "Combien coute la gestion locative ?" : 6 % a 8 % HT du loyer
--      mensuel ; MAPA Property n'encaisse pas les loyers.
-- Textes identiques a ceux du site (messages/*.json, intent_pages).
-- Rejouable : UPDATE ciblees, meme resultat a chaque execution.
-- Mode d'emploi : coller le fichier ENTIER, Run. Un seul tableau.
-- Apres execution : enregistrer une question frequente dans l'admin (meme
-- sans modification) pour rafraichir les pages du site.
-- =====================================================================

BEGIN;

UPDATE public.faqs SET
  answer_fr = 'Un crédit d''impôt sur les droits d''enregistrement, jusqu''à 45 000 euros par acquéreur depuis le 16 juillet 2026, pour l''achat d''une résidence principale, sans condition d''âge ni de première acquisition.',
  answer_en = 'A tax credit on registration duties of up to 45,000 euros per buyer since 16 July 2026, for the purchase of a main residence, with no age or first-time buyer condition.',
  answer_de = 'Eine Steuergutschrift auf die Registrierungsgebühren von bis zu 45 000 Euro pro Käufer seit dem 16. Juli 2026, beim Kauf eines Hauptwohnsitzes, ohne Alters- oder Ersterwerbsbedingung.',
  updated_at = now()
WHERE question_fr = 'Qu''est-ce que le Bëllegen Akt ?'
  AND page_key <> 'elena';

UPDATE public.faqs SET
  answer_fr = 'Un mois de loyer HT, état des lieux inclus, partagé par moitié entre le bailleur et le locataire conformément à la loi luxembourgeoise sur le bail d''habitation (loi du 23 juillet 2024).',
  answer_en = 'One month''s rent excluding VAT, inventory of fixtures included, split equally between the landlord and the tenant in accordance with the Luxembourg residential lease law (law of 23 July 2024).',
  answer_de = 'Eine Monatsmiete zzgl. MwSt., Wohnungsübergabeprotokoll inbegriffen, je zur Hälfte zwischen Vermieter und Mieter geteilt gemäß dem luxemburgischen Gesetz über den Wohnungsmietvertrag (Gesetz vom 23. Juli 2024).',
  updated_at = now()
WHERE question_fr = 'Quels sont les honoraires de mise en location ?'
  AND page_key <> 'elena';

UPDATE public.faqs SET
  answer_fr = 'De 6 % à 8 % HT du loyer mensuel : entrées et sorties des locataires avec tous les états des lieux, et mise en relation avec des entreprises si des travaux sont nécessaires. MAPA Property n''encaisse pas les loyers.',
  answer_en = 'From 6% to 8% excluding VAT of the monthly rent: tenant move-ins and move-outs with all inventories of fixtures, and referral to contractors if works are needed. MAPA Property does not collect rents.',
  answer_de = '6 % bis 8 % zzgl. MwSt. der Monatsmiete: Ein- und Auszüge der Mieter mit allen Übergabeprotokollen sowie Vermittlung von Handwerksbetrieben, falls Arbeiten nötig sind. MAPA Property zieht keine Mieten ein.',
  updated_at = now()
WHERE question_fr = 'Combien coûte la gestion locative ?'
  AND page_key <> 'elena';

COMMIT;

-- Controle (seul tableau affiche) : les trois questions et leurs reponses.
SELECT page_key, question_fr, answer_fr, answer_en, answer_de, published, updated_at
FROM public.faqs
WHERE question_fr IN ('Qu''est-ce que le Bëllegen Akt ?', 'Quels sont les honoraires de mise en location ?', 'Combien coûte la gestion locative ?')
  AND page_key <> 'elena'
ORDER BY page_key, position;

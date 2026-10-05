// Script execute avant l'affichage de chaque page publique (oct. 2026) :
// marque <html> de la classe "consent-decided" si un choix de cookies
// valide est deja enregistre (meme regle que hasConsentDecision), pour que
// la banniere rendue dans le HTML ne s'affiche pas. Module serveur et
// client (aucune directive) : importable par le layout.
// Cle et version du choix enregistre : source unique, reprise par
// lib/consent/store.ts (module client).
export const CONSENT_STORAGE_KEY = "mp_cookie_consent";
export const CONSENT_VERSION = 1;

export const CONSENT_DECIDED_SCRIPT = `(function(){try{var r=localStorage.getItem(${JSON.stringify(CONSENT_STORAGE_KEY)});if(!r)return;var p=JSON.parse(r);if(p&&typeof p.stats==='boolean'&&typeof p.marketing==='boolean'&&p.version===${CONSENT_VERSION}){document.documentElement.classList.add('consent-decided');}}catch(e){}})();`;

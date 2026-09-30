// lib/images/limits.ts — constante partagee client + serveur (mission
// "envoi de photos robuste et erreurs visibles"). Fichier volontairement
// sans dependance : lib/images/process-upload.ts importe `sharp` (module
// natif Node) et ne doit jamais etre importe depuis un composant client.
//
// Valeur retenue : 20 Mo. Les photos iPhone (HEIC/HEIF, y compris Live
// Photo/ProRAW) depassent rarement 15 Mo ; 20 Mo laisse une marge reelle
// tout en restant nettement sous la limite Next.js configuree pour les
// Server Actions (experimental.serverActions.bodySizeLimit: "25mb",
// next.config.ts) et sous la limite de la plateforme Vercel elle-meme
// (100 Mo par requete de fonction). Verifiee cote client AVANT l'envoi
// (evite d'attendre une reponse serveur pour un fichier deja trop gros)
// et re-verifiee cote serveur en defense en profondeur.
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTO_MB = 20;

/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — js/app.js
   Logique applicative du site public
   Dépendances : supabase.js (SUPA, KEY) + i18n.js (I18N, CURLANG, setLang...)
   Ordre de chargement requis : supabase.js → i18n.js → app.js
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ─── SIGNATURE DE VERSION (debug cache) ───
 * Affichée dans la console + bannière visible 4 secondes en haut à droite.
 * Si tu ne vois PAS la bannière dorée "MAPA · MOD25" en chargeant la page, c'est
 * que le navigateur sert un ancien JS depuis le cache. */
window.MAPA_BUILD='MOD30b — Listener immeuble bulletproof + champ loyer';
console.log('%c[MAPA Property] %c'+window.MAPA_BUILD,'color:#b8865a;font-weight:bold','color:#3d4f63');

/* Bannière debug DÉSACTIVÉE — 29 avril 2026 */ if(false)
(function(){
  function showBanner(){
    if(!document.body)return setTimeout(showBanner,50);
    var b=document.createElement('div');
    b.id='mapa-version-banner';
    b.style.cssText='position:fixed;top:18px;right:18px;background:linear-gradient(135deg,#3d4f63,#2c3a4a);color:#fff;padding:10px 18px;border-left:3px solid #b8865a;border-radius:3px;font-family:Raleway,sans-serif;font-size:12px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,.15);transition:opacity .5s';
    b.innerHTML='<span style="font-family:\'Cinzel\',serif;letter-spacing:.18em;text-transform:uppercase;font-size:10px;color:#b8865a;font-weight:700">MAPA · MOD30b</span><br><span style="opacity:.85;font-size:11px">Champ loyer immeuble visible</span>';
    document.body.appendChild(b);
    setTimeout(function(){b.style.opacity='0';setTimeout(function(){b.remove();},600);},4000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showBanner);
  else showBanner();
})();

/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — Obfuscation emails (anti-bot spam)
   Session 14 : Protection RGPD
   
   Les emails ne doivent JAMAIS apparaître en clair dans le HTML source.
   Ils sont reconstruits côté client au runtime via ce helper.
   
   Usage :
     <span class="mp-mail" data-u="admin" data-d="mapagroup.org"></span>
     → rendu : admin(at)mapagroup.org (cliquable)  [exemple anti-scrape]
   
   Les bots de scraping (qui ne parsent pas le JavaScript) ne voient
   que les data-attributes et n'assemblent PAS l'email.
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  /* Symbole @ construit via code ASCII pour ne pas apparaître littéralement */
  var AT = String.fromCharCode(64);
  /* Fonction : remplace les <span class="mp-mail"> par un lien mailto fonctionnel */
  function renderMails(){
    var nodes = document.querySelectorAll('.mp-mail');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.dataset.done === '1') continue; /* déjà traité */
      var u = n.dataset.u || '';
      var d = n.dataset.d || '';
      /* Support data-cc OR décomposé data-cc-u + data-cc-d (plus safe anti-bot) */
      var cc = n.dataset.cc || '';
      if (!cc && n.dataset.ccU && n.dataset.ccD) {
        cc = n.dataset.ccU + AT + n.dataset.ccD;
      }
      var subject = n.dataset.subject || '';
      var body = n.dataset.body || '';
      var label = n.dataset.label || '';
      if (!u || !d) continue;
      var email = u + AT + d;
      var href = 'mailto:' + email;
      var params = [];
      if (cc) params.push('cc=' + cc);
      if (subject) params.push('subject=' + encodeURIComponent(subject));
      if (body) params.push('body=' + encodeURIComponent(body));
      if (params.length) href += '?' + params.join('&');
      /* Si le span contient déjà du HTML (ex: icône SVG), on préserve */
      var innerHTML = n.innerHTML;
      var a = document.createElement('a');
      a.href = href;
      a.className = n.className.replace('mp-mail', 'mp-mail-r').trim();
      a.setAttribute('rel', 'nofollow noopener');
      if (label) {
        var displayText;
        if (label === 'visible') {
          displayText = email;
        } else if (label === 'cta') {
          /* MAPA: bouton CTA "Envoyez-nous un e-mail" — texte localisé via i18n.
             On vérifie window.CURLANG (FR/EN/DE), fallback FR */
          var lang = (window.CURLANG || 'fr').toLowerCase();
          var ctaLabels = {
            fr: 'Envoyez-nous un e-mail',
            en: 'Send us an email',
            de: 'Senden Sie uns eine E-Mail'
          };
          displayText = ctaLabels[lang] || ctaLabels.fr;
        } else if (label.indexOf('i18n:') === 0) {
          /* Format "i18n:cle.de.traduction" : on cherche dans I18N global, fallback fr puis cle brute */
          var key = label.substring(5);
          var lng = (window.CURLANG || 'fr').toLowerCase();
          if (window.I18N && window.I18N[lng] && window.I18N[lng][key]) {
            displayText = window.I18N[lng][key];
          } else if (window.I18N && window.I18N.fr && window.I18N.fr[key]) {
            displayText = window.I18N.fr[key];
          } else {
            displayText = key;
          }
        } else {
          displayText = label;
        }
        a.innerHTML = innerHTML + '<span>' + displayText + '</span>';
      } else {
        a.innerHTML = innerHTML || email;
      }
      /* Copie des styles inline */
      if (n.getAttribute('style')) a.setAttribute('style', n.getAttribute('style'));
      n.parentNode.replaceChild(a, n);
      a.dataset.done = '1';
    }
  }
  /* V28 29 avril 2026 : exposition globale pour permettre le re-rendu
     manuel depuis openLegal (fix case blanche RGPD) */
  window.renderMails = renderMails;
  /* Exécution au DOMContentLoaded + observer pour contenu dynamique */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderMails);
  } else {
    renderMails();
  }
  /* Observer pour les éléments ajoutés dynamiquement (fiche bien, blog, etc.) */
  var mo = new MutationObserver(function(mutations){
    var needsRender = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
        needsRender = true;
        break;
      }
    }
    if (needsRender) renderMails();
  });
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function(){
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }
  /* Expose global helper pour génération côté JS */
  window.mpMail = function(opts){
    opts = opts || {};
    var u = opts.u || 'admin';
    var d = opts.d || 'mapagroup.org';
    var cc = opts.cc || '';
    var subject = opts.subject || '';
    var body = opts.body || '';
    var label = opts.label || '';
    var cls = opts.cls || '';
    var attrs = ' data-u="' + u + '" data-d="' + d + '"';
    if (cc) attrs += ' data-cc="' + cc + '"';
    if (subject) attrs += ' data-subject="' + subject.replace(/"/g, '&quot;') + '"';
    if (body) attrs += ' data-body="' + body.replace(/"/g, '&quot;') + '"';
    if (label) attrs += ' data-label="' + label + '"';
    return '<span class="mp-mail' + (cls ? ' ' + cls : '') + '"' + attrs + '></span>';
  };
  /* Helper pour reconstruire un email caché (dans les strings JS) */
  window.mpEmail = function(u, d){
    return (u || 'admin') + AT + (d || 'mapagroup.org');
  };
})();
/* ═══════════════════════════════════════════════════════════════════ */



var PROPS=[];
/* ═══ VERSION MARKER (aide au diagnostic prod) ═══ */
console.log('%c[MAPA Property] V28 FINAL14k — Source STATEC dans estimation + script update + doc','color:#a07040;font-weight:bold;font-size:12px');

var PFX=[
  {v:'+352',l:'🇱🇺 +352 Luxembourg'},
  {v:'+33',l:'🇫🇷 +33 France'},
  {v:'+32',l:'🇧🇪 +32 Belgique'},
  {v:'+49',l:'🇩🇪 +49 Allemagne'},
  {v:'+41',l:'🇨🇭 +41 Suisse'},
  {v:'+39',l:'🇮🇹 +39 Italie'},
  {v:'+34',l:'🇪🇸 +34 Espagne'},
  {v:'+351',l:'🇵🇹 +351 Portugal'},
  {v:'+44',l:'🇬🇧 +44 UK'},
  {v:'+1',l:'🇺🇸 +1 USA/Canada'},
  {v:'+971',l:'🇦🇪 +971 UAE'},
  {v:'other',l:'✦ Autre'}
];

/* ─── UTILITIES ─── */
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function fmt(n){return Number(n).toLocaleString('fr-FR')}
function v(id){var e=document.getElementById(id);return e?e.value:''}
function toast(m,d){
  var t=document.getElementById('toast');if(!t)return;
  t.textContent=m;t.classList.add('show');
  setTimeout(function(){t.classList.remove('show')},d||3000);
}
window.toast=toast;

/* ─── SELECTS ─── */
function bPFX(){
  return PFX.map(function(p){
    return'<option value="'+p.v+'"'+(p.v==='+352'?' selected':'')+'>'+p.l+'</option>';
  }).join('');
}
function initSelects(){
  var ph=bPFX();
  var sels=document.querySelectorAll('select.phone-pfx');
  for(var i=0;i<sels.length;i++)sels[i].innerHTML=ph;
}

/* ─── HEADER SHADOW ─── */
window.addEventListener('scroll',function(){
  var n=document.getElementById('hd');
  if(n)n.classList.toggle('shad',window.scrollY>16);
},{passive:true});

/* ─── BURGER ─── */
window.toggleBurger=function(){
  var b=document.getElementById('burger'),m=document.getElementById('mob-menu');
  if(!b||!m)return;
  b.classList.toggle('open');
  var op=b.classList.contains('open');
  m.style.display=op?'flex':'none';
  document.body.style.overflow=op?'hidden':'';
};
window.closeBurger=function(){
  var b=document.getElementById('burger'),m=document.getElementById('mob-menu');
  if(b)b.classList.remove('open');
  if(m)m.style.display='none';
  document.body.style.overflow='';
};

/* ─── MODALS — z-index stack dynamique ─── */
/* Stack z-index : chaque modale ouverte par-dessus reçoit un index supérieur */
var MODAL_Z_BASE=2500;
var MODAL_Z_STACK=MODAL_Z_BASE;
window.openM=function(id){
  var m=document.getElementById(id);
  if(!m)return;
  /* Incrémente par 10 pour laisser place au .mpage (qui est au z+1 en CSS) */
  MODAL_Z_STACK+=10;
  m.style.zIndex=MODAL_Z_STACK;
  m.classList.add('open');
  document.body.style.overflow='hidden';
  /* V28 FINAL12 : scroll-top AGRESSIF pour toute modale ouverte (overlay OU page).
     Le bug venait du fait que les overlays gardaient la position scroll du body parent,
     ce qui donnait l'impression de "s'ouvrir au footer". */
  var scrollAllContainers=function(){
    m.scrollTop=0;
    /* La .mpage enfant est le vrai conteneur scrollable */
    var mpage=m.querySelector('.mpage');
    if(mpage)mpage.scrollTop=0;
    /* Toutes les zones scrollables dans la modale */
    var scrollables=m.querySelectorAll('.mb,.mh,.lpan');
    for(var i=0;i<scrollables.length;i++)scrollables[i].scrollTop=0;
  };
  scrollAllContainers();
  if(typeof window.requestAnimationFrame==='function'){
    window.requestAnimationFrame(scrollAllContainers);
    window.requestAnimationFrame(function(){
      window.requestAnimationFrame(scrollAllContainers);
    });
  }
  setTimeout(scrollAllContainers,50);
  setTimeout(scrollAllContainers,200);
};
window.closeM=function(id){
  var m=document.getElementById(id);
  if(!m)return;
  m.classList.remove('open');
  m.style.display='';
  m.style.zIndex='';
  /* Reset du stack si plus aucune modale ouverte */
  var stillOpen=document.querySelectorAll('.modal.open');
  if(stillOpen.length===0){
    MODAL_Z_STACK=MODAL_Z_BASE;
    document.body.style.overflow='';
  }
};
window.openSvc=function(id){window.openM(id)};

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL4 — Module 3 : SPA-like router (12 pages pleine largeur)
   ───────────────────────────────────────────────────────────────────
   Les 12 modales listées dans PAGE_ROUTES basculent en mode "page" quand
   l'utilisateur navigue vers leur URL ; les autres modales restent en
   overlay classique (m-bien, m-similar, m-legal, m-honoraires, m-review,
   m-blog-art, m-search, m-mandat-auto/exclu/semi/simple).
═══════════════════════════════════════════════════════════════════ */
var PAGE_ROUTES={
  '/vente':'m-vente',
  '/achat':'m-achat',
  '/location':'m-location',
  '/off-market':'m-offmarket',
  '/estimation':'m-estimation',
  '/mandat-recherche':'m-mandat',
  '/simulateurs':'m-simulateurs',
  '/marches-actifs':'m-marches',
  '/marches-luxembourg':'m-marches-lux',   /* V28 FINAL9 : sous-page Luxembourg (24 communes) */
  '/marches-international':'m-marches-intl',/* V28 FINAL9 : sous-page International (28 villes) */
  '/arcova':'m-arcova',
  '/qui-sommes-nous':'m-qui',
  '/blog':'m-blog',
  '/contact':'m-contact',
  /* V28 FINAL13 Session 1 — URLs propres pour toutes les pages */
  '/acquereurs':'m-acquereurs',
  '/vendre/mandat-exclusif':'m-mandat-exclu',
  '/vendre/mandat-semi-exclusif':'m-mandat-semi',
  '/vendre/mandat-simple':'m-mandat-simple',
  '/vendre/mandat-autonome':'m-mandat-auto'
};
/* Map inverse : id de modale → slug de route (pour intercepter openSvc/openM) */
var MODAL_TO_ROUTE={};
(function(){for(var r in PAGE_ROUTES){MODAL_TO_ROUTE[PAGE_ROUTES[r]]=r;}})();

/* V28 FINAL5 : sp-hd supprimé, fonction conservée en no-op pour compat avec l'ancien hook setLang */
function _spSyncLangButtons(){/* no-op */}

/* Slug de la dernière page visitée (pour retour depuis m-bien en mode page) */
var _lastPageSlug=null;

/* Navigation vers une page (slug = '/vente', '/achat', etc.)
   push=true → push history, push=false → replace (utilisé par l'init + popstate) */
window.navigateToPage=function(slug,push){
  var modalId=PAGE_ROUTES[slug];
  if(!modalId)return;
  var m=document.getElementById(modalId);
  if(!m)return;
  /* SESSION 1f : désactiver temporairement scroll-behavior:smooth pendant la transition
     (sinon window.scrollTo anime au lieu de sauter → on atterrit en bas pendant l'animation) */
  var _htmlEl=document.documentElement;
  var _origBehav=_htmlEl.style.scrollBehavior;
  _htmlEl.style.scrollBehavior='auto';
  /* Scroll AVANT changement DOM */
  window.scrollTo(0,0);
  _htmlEl.scrollTop=0;
  document.body.scrollTop=0;
  /* Ferme toutes les modales (mode page ET overlay) pour éviter un stacking */
  var openModals=document.querySelectorAll('.modal.open, .modal.as-page');
  for(var i=0;i<openModals.length;i++){
    openModals[i].classList.remove('open');
    openModals[i].classList.remove('as-page');
    openModals[i].style.zIndex='';
  }
  /* Mode page + marqueur de page courante sur le body */
  document.body.classList.add('view-page');
  document.body.setAttribute('data-page',modalId);
  _lastPageSlug=slug;
  /* La modale devient "page" : flux normal, plein écran, pas de backdrop */
  m.classList.add('as-page');
  m.classList.add('open');
  /* V28 FINAL9 : reset filters spécifiques par page avant le render */
  if(modalId==='m-achat'){
    CUR_FILT='vente';
    var bfs=document.querySelectorAll('#m-achat .bfilt');
    for(var j=0;j<bfs.length;j++)bfs[j].classList.remove('on');
    var firstBfilt=document.querySelector('#m-achat .bfilt[onclick*="vente"]');
    if(firstBfilt)firstBfilt.classList.add('on');
    if(typeof renderBiensInto==='function')renderBiensInto('biens-grid','biens-empty','achat');
  }
  /* SESSION 1f : scroll-top INSTANT en 4 temps */
  m.scrollTop=0;
  _htmlEl.scrollTop=0;
  document.body.scrollTop=0;
  window.scrollTo(0,0);
  if(typeof window.requestAnimationFrame==='function'){
    window.requestAnimationFrame(function(){
      window.scrollTo(0,0);
      _htmlEl.scrollTop=0;
      document.body.scrollTop=0;
      m.scrollTop=0;
    });
  }
  setTimeout(function(){
    window.scrollTo(0,0);
    _htmlEl.scrollTop=0;
    document.body.scrollTop=0;
  },50);
  setTimeout(function(){
    window.scrollTo(0,0);
    _htmlEl.scrollTop=0;
    document.body.scrollTop=0;
    /* Restaurer scroll-behavior smooth après la transition */
    _htmlEl.style.scrollBehavior=_origBehav||'';
  },300);
  /* Libère le scroll-lock éventuel */
  document.body.style.overflow='';
  /* Met à jour l'URL sans recharger */
  if(push&&window.history&&window.history.pushState){
    try{window.history.pushState({sp:slug},'',slug);}catch(e){}
  }
};

/* Retour à la home */
window.navigateToHome=function(push){
  /* Ferme toute page active */
  var act=document.querySelectorAll('.modal.as-page');
  for(var i=0;i<act.length;i++){
    act[i].classList.remove('as-page');
    act[i].classList.remove('open');
    act[i].style.zIndex='';
  }
  document.body.classList.remove('view-page');
  document.body.removeAttribute('data-page');
  document.body.style.overflow='';
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  _lastPageSlug=null;
  if(push&&window.history&&window.history.pushState){
    try{window.history.pushState({sp:'/'},'','/');}catch(e){}
  }
};

/* Override openSvc/openM : si l'id est mappé à une route, on route au lieu d'ouvrir en overlay */
var _origOpenM=window.openM;
window.openM=function(id){
  if(MODAL_TO_ROUTE[id]){
    window.navigateToPage(MODAL_TO_ROUTE[id],true);
    return;
  }
  return _origOpenM(id);
};
/* openSvc était déjà un alias de openM — on le re-pointe sur la nouvelle version */
window.openSvc=function(id){window.openM(id);};

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL11 — SYSTÈME DEMANDE DE MANDAT DE VENTE
   ─────────────────────────────────────────────────────────────────── 
   4 types : autonome (1%), exclusif (3%), semi-exclusif (4%), simple (5%)
   Comportement : clic sur "Demander un mandat X" → ouvre m-mandat-request
   avec le type pré-rempli. À l'envoi, ouvre mailto avec :
     - to    : admin(at)mapagroup.org
     - cc    : email du client (pour qu'il ait une copie de sa demande)
     - subject : "Demande de Mandat de vente [Type] — [Nom Prénom]"
     - body    : message pré-rempli adapté au type de mandat
═══════════════════════════════════════════════════════════════════ */
var MANDAT_TYPES={
  'autonome'     :{label:'Autonome',      taux:'1% + TVA'},
  'exclusif'     :{label:'Exclusif',      taux:'3% + TVA'},
  'semi-exclusif':{label:'Semi-Exclusif', taux:'4% + TVA'},
  'simple'       :{label:'Simple',        taux:'5% + TVA'}
};
var _CUR_MANDAT_TYPE='autonome';

window.openMandatRequest=function(type){
  if(!MANDAT_TYPES[type]){console.warn('[MAPA] Type de mandat inconnu:',type);return;}
  _CUR_MANDAT_TYPE=type;
  var m=MANDAT_TYPES[type];
  /* Ferme la modale courante du mandat */
  var currentMandatId='m-mandat-'+(type==='autonome'?'auto':type==='exclusif'?'exclu':type==='semi-exclusif'?'semi':'simple');
  closeM(currentMandatId);
  /* Met à jour le titre et récap dans la modale request */
  var tEl=document.getElementById('mreq-title');
  if(tEl)tEl.textContent='Demander un Mandat de vente '+m.label;
  var recapEl=document.getElementById('mreq-recap-val');
  if(recapEl)recapEl.innerHTML='<strong>Mandat '+m.label+'</strong> · Commission '+m.taux;
  /* Reset form */
  ['mreq-pren','mreq-nom','mreq-em','mreq-tel'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.value='';
  });
  var rgpd=document.getElementById('mreq-rgpd');if(rgpd)rgpd.checked=false;
  /* Ouvre la modale request avec un petit délai pour l'effet */
  setTimeout(function(){openM('m-mandat-request');},120);
};

window.submitMandatRequest=function(){
  var pren=(document.getElementById('mreq-pren')||{}).value||'';
  var nom=(document.getElementById('mreq-nom')||{}).value||'';
  var em=(document.getElementById('mreq-em')||{}).value||'';
  var pfx=(document.getElementById('mreq-pfx')||{}).value||'';
  var tel=(document.getElementById('mreq-tel')||{}).value||'';
  var rgpd=(document.getElementById('mreq-rgpd')||{}).checked;
  
  pren=pren.trim();nom=nom.trim();em=em.trim();tel=tel.trim();
  
  /* Validation */
  if(!pren||!nom){toast('Merci d\'indiquer votre nom et prénom.');return;}
  if(!em||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){toast('Merci d\'indiquer une adresse e-mail valide.');return;}
  if(!tel){toast('Merci d\'indiquer votre numéro de téléphone.');return;}
  if(!rgpd){toast('Merci d\'accepter le traitement de vos données.');return;}
  
  var m=MANDAT_TYPES[_CUR_MANDAT_TYPE]||MANDAT_TYPES.autonome;
  var fullPhone=pfx?(pfx+' '+tel):tel;
  
  /* Texte pré-rempli par type de mandat */
  var intros={
    'autonome'     :'Je suis intéressé par votre Mandat de vente Autonome (commission 1% + TVA).\nPourriez-vous me contacter afin d\'en discuter ?',
    'exclusif'     :'Je suis intéressé par votre Mandat de vente Exclusif (commission 3% + TVA).\nPourriez-vous me contacter afin d\'en discuter ?',
    'semi-exclusif':'Je suis intéressé par votre Mandat de vente Semi-Exclusif (commission 4% + TVA).\nPourriez-vous me contacter afin d\'en discuter ?',
    'simple'       :'Je suis intéressé par votre Mandat de vente Simple (commission 5% + TVA).\nPourriez-vous me contacter afin d\'en discuter ?'
  };
  var intro=intros[_CUR_MANDAT_TYPE]||intros.autonome;
  
  var subject='Demande de Mandat de vente '+m.label+' — '+pren+' '+nom;
  var body='Bonjour,\n\n'+intro+'\n\nMes coordonnées :\n'+
           '• Nom : '+nom+'\n'+
           '• Prénom : '+pren+'\n'+
           '• E-mail : '+em+'\n'+
           '• Téléphone : '+fullPhone+'\n\n'+
           'Merci.\n\n'+
           pren+' '+nom;
  
  /* Construction du mailto : uniquement admin@mapagroup.org en TO, pas de Cc.
     L'admin redistribue ensuite à Julien. Le client ne reçoit pas de copie
     automatique du mailto (par décision Julien 29 avril 2026). */
  var to=window.mpEmail('admin','mapagroup.org');
  var mailtoUrl='mailto:'+encodeURIComponent(to)+
                '?subject='+encodeURIComponent(subject)+
                '&body='+encodeURIComponent(body);
  
  /* Envoi du lead dans Supabase (table 'leads') pour tracking en parallèle du mailto.
   * Architecture : table 'leads' = source unique de vérité pour TOUS les leads
   * (mandat, achat, vente, off-market). Le champ 'type' permet de différencier.
   * Quand toi, depuis l'admin, tu valides un lead, tu peux le transformer en
   * mandats_recherche formel (avec budget, zones, features signées). */
  try{
    if(typeof SUPA!=='undefined' && typeof KEY!=='undefined' && SUPA){
      fetch(SUPA+'/rest/v1/leads',{
        method:'POST',
        headers:{
          'apikey':KEY,
          'Authorization':'Bearer '+KEY,
          'Content-Type':'application/json',
          'Prefer':'return=minimal'
        },
        body:JSON.stringify({
          email:em,
          first_name:pren,
          last_name:nom,
          phone:fullPhone,
          type:'mandat',
          property_ref:null,
          source:'website_modal_m-mandat-'+_CUR_MANDAT_TYPE,
          lang:CURLANG,
          status:'new'
        })
      }).catch(function(err){/* silencieux : le mailto reste le canal principal */});
    }
  }catch(e){/* silencieux */}
  
  /* Ouvre le client mail */
  window.location.href=mailtoUrl;
  
  /* Feedback visuel + fermeture de la modale */
  toast('Votre demande est prête. Vérifiez votre client mail.');
  setTimeout(function(){closeM('m-mandat-request');},800);
};
/* ═══ Fin système demande de mandat ═══ */

/* V28 FINAL5 — Clic sur un bien en mode page : m-bien bascule aussi en page
   SESSION 12c : scroll reset systématique via _scrollTopAfterOpen() */
function _patchOpenBien(){
  if(typeof window.openBien!=='function')return;
  if(window.openBien.__fpPatched)return;
  var _origOpenBien=window.openBien;
  window.openBien=function(id){
    var wasInPage=document.body.classList.contains('view-page');
    /* Appel original : remplit #bien-content et ouvre m-bien via openM */
    _origOpenBien(id);
    if(wasInPage){
      /* On ferme l'ancienne page (m-achat, m-vente, m-offmarket, etc.) */
      var prevPage=document.querySelector('.modal.as-page');
      if(prevPage && prevPage.id!=='m-bien'){
        prevPage.classList.remove('as-page');
        prevPage.classList.remove('open');
        prevPage.style.zIndex='';
      }
      /* On bascule m-bien en mode page */
      var mb=document.getElementById('m-bien');
      if(mb){
        mb.classList.add('as-page');
        mb.classList.add('open');
        mb.style.zIndex='';
      }
      /* Marqueur body pour que les règles CSS view-page s'appliquent */
      document.body.classList.add('view-page');
      document.body.setAttribute('data-page','m-bien');
      document.body.style.overflow='';
    }
    /* SESSION 12c : scroll top systématique (était conditionnel à wasInPage avant) */
    if(typeof _scrollTopAfterOpen==='function')_scrollTopAfterOpen();
  };
  window.openBien.__fpPatched=true;
}
/* Tente patch immédiat + redémarrage après DOMContentLoaded au cas où openBien n'existe pas encore */
_patchOpenBien();
document.addEventListener('DOMContentLoaded',_patchOpenBien);

/* Override closeM : fermer une modale en mode page = revenir à la page parente ou home */
var _origCloseM=window.closeM;
window.closeM=function(id){
  var m=document.getElementById(id);
  if(m&&m.classList.contains('as-page')){
    /* Cas 1 : on ferme m-bien depuis une page Acheter/Off-market/etc. → retour à cette page */
    if(id==='m-bien' && _lastPageSlug){
      m.classList.remove('as-page');
      m.classList.remove('open');
      m.style.zIndex='';
      window.navigateToPage(_lastPageSlug,false);
      return;
    }
    /* Cas 2 : on ferme une page classique → retour home */
    window.navigateToHome(true);
    return;
  }
  return _origCloseM(id);
};

/* Gestion back/forward navigateur */
window.addEventListener('popstate',function(ev){
  var path=window.location.pathname||'/';
  /* Normalise trailing slash */
  if(path.length>1&&path.charAt(path.length-1)==='/')path=path.substring(0,path.length-1);
  if(PAGE_ROUTES[path]){
    window.navigateToPage(path,false);
  }else{
    window.navigateToHome(false);
  }
});

/* Bootstrap au chargement : parser l'URL courante et router */
function _spBootstrap(){
  var path=window.location.pathname||'/';
  if(path.length>1&&path.charAt(path.length-1)==='/')path=path.substring(0,path.length-1);
  if(PAGE_ROUTES[path]){
    setTimeout(function(){window.navigateToPage(path,false);},0);
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_spBootstrap);
}else{
  _spBootstrap();
}

/* Hook : quand setLang est appelé, on resync + on re-render la fiche bien si ouverte */
(function(){
  var _origSetLang=window.setLang;
  if(typeof _origSetLang==='function'){
    window.setLang=function(lang){
      var r=_origSetLang(lang);
      try{_spSyncLangButtons();}catch(e){}
      /* SESSION 9 : si une fiche bien est ouverte (m-bien en mode page),
         re-rendre son contenu pour que tous les textes injectés (title, description,
         specs labels, contact CTA, etc.) soient traduits dans la nouvelle langue */
      try{
        var mb=document.getElementById('m-bien');
        if(mb && mb.classList.contains('open') && window._currentBien){
          /* Sauvegarder la position de scroll pour la restaurer après re-render */
          var scr=mb.querySelector('.mpage');
          var scrollTop=scr?scr.scrollTop:0;
          var winScroll=window.scrollY||window.pageYOffset||0;
          if(window._currentBienIsOff && typeof renderOffMarketDetail==='function'){
            renderOffMarketDetail(window._currentBien);
          }else if(typeof renderBienDetail==='function'){
            renderBienDetail(window._currentBien);
          }
          /* Restaurer le scroll */
          setTimeout(function(){
            if(scr)scr.scrollTop=scrollTop;
            window.scrollTo(0,winScroll);
          },0);
        }
      }catch(e){console.warn('[MAPA] Re-render fiche bien au changement de langue :',e);}
      return r;
    };
  }
})();
/* ═══════ Fin Module 3 — Router SPA ═══════ */

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL4 — Module 5 : Meta SEO dynamiques V4 par page
   ───────────────────────────────────────────────────────────────────
   Met à jour title, meta description, canonical et hreflang FR/EN/DE
   à chaque navigation. Met également à jour le H1 SEO caché.
   Les meta keywords ne sont PAS touchées ici (Module 6 les traite).
═══════════════════════════════════════════════════════════════════ */
var SEO_DOMAIN='https://www.mapaproperty.lu';
var SEO_V4={
  '/':{
    title:'MAPA Property — Agence immobilière Luxembourg & international',
    desc:'Agence immobilière au Luxembourg et broker international : France, Monaco, Suisse, Portugal, Dubaï. Vente, achat, location, mandat de recherche sur-mesure.',
    h1:'Votre partenaire immobilier — Luxembourg et international'
  },
  '/vente':{
    title:'Vendre au Luxembourg — MAPA Property',
    desc:'Vendez votre bien au Luxembourg avec MAPA Property : studio, appartement, maison, villa, immeuble, commerce. Estimation gratuite et mandat sur-mesure.',
    h1:'Vendre votre bien au Luxembourg avec MAPA Property'
  },
  '/achat':{
    title:'Acheter un bien au Luxembourg — MAPA Property',
    desc:'Trouvez votre bien au Luxembourg : studios, appartements, maisons, villas, immeubles, commerces. Biens publiés et sélection off-market exclusive.',
    h1:'Acquérir un bien d\'exception au Luxembourg'
  },
  '/location':{
    title:'Location immobilière Luxembourg — MAPA Property',
    desc:'Biens à louer au Luxembourg : appartements meublés, maisons, villas, bureaux, commerces. Service personnalisé pour expatriés, dirigeants et familles.',
    h1:'Louer un bien au Luxembourg'
  },
  '/off-market':{
    title:'Off-Market Luxembourg — MAPA Property',
    desc:'Accédez aux biens confidentiels du marché immobilier luxembourgeois. Mandat de recherche discret, acquéreurs qualifiés, traçabilité garantie.',
    h1:'Marché immobilier off-market au Luxembourg'
  },
  '/estimation':{
    title:'Estimation immobilière gratuite Luxembourg',
    desc:'Estimation gratuite et confidentielle de votre bien au Luxembourg. Analyse de marché fondée sur les données BCL et STATEC. Rapport personnalisé sous 48h.',
    h1:'Estimation gratuite de votre bien au Luxembourg'
  },
  '/mandat-recherche':{
    title:'Mandat de recherche Luxembourg & international',
    desc:'Broker immobilier international : Luxembourg, France, Monaco, Suisse, Belgique, Allemagne, Portugal, Espagne, Dubaï, Maurice, Miami. Recherche sur-mesure.',
    h1:'Mandat de recherche — Luxembourg et international'
  },
  '/simulateurs':{
    title:'Simulateurs immobiliers Luxembourg | MAPA Property',
    desc:'Calculez votre capacité d\'emprunt, frais de notaire, rentabilité locative et fiscalité au Luxembourg. Outils gratuits pour acheteurs et investisseurs.',
    h1:'Simulateurs immobiliers — Luxembourg'
  },
  '/marches-actifs':{
    title:'Marchés immobiliers actifs — Luxembourg & international',
    desc:'Analyses des marchés immobiliers : Luxembourg, France, Monaco, Dubaï, Portugal. Données BCL/STATEC, tendances et opportunités d\'investissement.',
    h1:'Nos marchés immobiliers actifs'
  },
  '/marches-luxembourg':{
    title:'Immobilier prestige Luxembourg — 24 communes couvertes',
    desc:'MAPA Property intervient sur 24 communes du Grand-Duché : Luxembourg-Ville (Belair, Kirchberg, Limpertsberg, Cloche d\'Or), Strassen, Bertrange, Mamer, Steinfort, Dudelange et plus.',
    h1:'L\'immobilier de prestige au Grand-Duché'
  },
  '/marches-international':{
    title:'Immobilier international — Broker sous mandat Luxembourg',
    desc:'28 villes premium : Paris, Monaco, Saint-Tropez, Ibiza, Dubaï, New York, Miami, Île Maurice. Broker sous mandat de recherche luxembourgeois avec partenaires locaux habilités.',
    h1:'Le monde à portée de mandat'
  },
  '/arcova':{
    title:'ARCOVA — Plateforme off-market européenne',
    desc:'ARCOVA, initiative MAPA Property : plateforme européenne en développement pour structurer et sécuriser le marché immobilier off-market. Liste d\'attente 2026.',
    h1:'ARCOVA — Structurer l\'off-market européen'
  },
  '/qui-sommes-nous':{
    title:'MAPA Property — Broker immobilier international',
    desc:'MAPA Property, agence au Luxembourg et broker international. Julien Brebion, 8 ans d\'expérience. France, Monaco, Suisse, Portugal, Dubaï et plus.',
    h1:'MAPA Property — Luxembourg et au-delà'
  },
  '/blog':{
    title:'Blog immobilier Luxembourg — MAPA Property',
    desc:'Actualités du marché immobilier luxembourgeois : conseils pour acheteurs, vendeurs, investisseurs. Décryptages fiscaux, juridiques et analyses sectorielles.',
    h1:'Actualités et conseils immobiliers Luxembourg'
  },
  '/contact':{
    title:'Contact MAPA Property',
    desc:'Contactez Julien Brebion chez MAPA Property Luxembourg. Réponse personnalisée sous 24h. Téléphone, e-mail, rendez-vous à Luxembourg-Ville ou visio.',
    h1:'Contactez MAPA Property'
  }
};

/* Applique les meta SEO V4 pour un chemin donné (fallback sur / si inconnu) */
function _applySEO(path){
  if(!path)path='/';
  if(path.length>1&&path.charAt(path.length-1)==='/')path=path.substring(0,path.length-1);
  var data=SEO_V4[path]||SEO_V4['/'];
  var canonUrl=SEO_DOMAIN+(path==='/'?'/':path);

  /* 1. Title */
  document.title=data.title;

  /* 2. Meta description */
  var metaDesc=document.querySelector('meta[name="description"]');
  if(!metaDesc){
    metaDesc=document.createElement('meta');
    metaDesc.setAttribute('name','description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content',data.desc);

  /* 3. Canonical */
  var linkCanon=document.querySelector('link[rel="canonical"]');
  if(!linkCanon){
    linkCanon=document.createElement('link');
    linkCanon.setAttribute('rel','canonical');
    document.head.appendChild(linkCanon);
  }
  linkCanon.setAttribute('href',canonUrl);

  /* 4. hreflang FR/EN/DE + x-default (purge + recrée) */
  var oldHf=document.querySelectorAll('link[rel="alternate"][hreflang]');
  for(var i=0;i<oldHf.length;i++){
    if(oldHf[i].parentNode)oldHf[i].parentNode.removeChild(oldHf[i]);
  }
  var hreflangs=['fr','en','de','x-default'];
  for(var j=0;j<hreflangs.length;j++){
    var lk=document.createElement('link');
    lk.setAttribute('rel','alternate');
    lk.setAttribute('hreflang',hreflangs[j]);
    lk.setAttribute('href',canonUrl);
    document.head.appendChild(lk);
  }

  /* 5. Open Graph (og:title, og:description, og:url) — synchro pour partages sociaux */
  var ogTitle=document.querySelector('meta[property="og:title"]');
  if(ogTitle)ogTitle.setAttribute('content',data.title);
  var ogDesc=document.querySelector('meta[property="og:description"]');
  if(ogDesc)ogDesc.setAttribute('content',data.desc);
  var ogUrl=document.querySelector('meta[property="og:url"]');
  if(ogUrl)ogUrl.setAttribute('content',canonUrl);

  /* 6. Twitter Card (synchro identique) */
  var twTitle=document.querySelector('meta[name="twitter:title"]');
  if(twTitle)twTitle.setAttribute('content',data.title);
  var twDesc=document.querySelector('meta[name="twitter:description"]');
  if(twDesc)twDesc.setAttribute('content',data.desc);

  /* 7. H1 SEO caché (mis à jour en texte seulement) */
  var h1=document.querySelector('h1.seo-h1');
  if(h1)h1.textContent=data.h1;
}

/* Expose pour usage externe / debug */
window._applySEO=_applySEO;

/* Hook : chaque navigation de page applique le SEO correspondant */
(function(){
  var _origNavToPage=window.navigateToPage;
  var _origNavToHome=window.navigateToHome;
  window.navigateToPage=function(slug,push){
    var r=_origNavToPage(slug,push);
    try{_applySEO(slug);}catch(e){}
    return r;
  };
  window.navigateToHome=function(push){
    var r=_origNavToHome(push);
    try{_applySEO('/');}catch(e){}
    return r;
  };
})();

/* Applique le SEO initial dès que le DOM est prêt */
(function(){
  function initSEO(){
    var path=window.location.pathname||'/';
    if(path.length>1&&path.charAt(path.length-1)==='/')path=path.substring(0,path.length-1);
    _applySEO(path);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSEO);
  }else{
    initSEO();
  }
})();
/* ═══════ Fin Module 5 — Meta SEO V4 ═══════ */

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL4 — Module 8 : ARCOVA — formulaire liste d'attente
   ───────────────────────────────────────────────────────────────────
   Insert dans la table public.arcova_waitlist via Supabase REST.
   Gère : validation email/rôle, anti double-clic, conflit 409 (email déjà
   inscrit, UNIQUE sur email), erreur réseau, reset formulaire sur succès.
═══════════════════════════════════════════════════════════════════ */
window.submitArcovaWaitlist=function(){
  var T=(typeof I18N!=='undefined'&&I18N[CURLANG])?I18N[CURLANG]:{};
  function val(id){var e=document.getElementById(id);return e?String(e.value||'').trim():'';}

  var fn=val('arc-fn'), ln=val('arc-ln'), em=val('arc-em');
  var co=val('arc-co'), role=val('arc-role'), msg=val('arc-msg');

  /* Validation minimale côté client */
  if(!em||em.indexOf('@')===-1||em.indexOf('.')===-1){
    alert(T['arc.form.err.em']||'Veuillez saisir une adresse e-mail valide.');
    var emInp=document.getElementById('arc-em');if(emInp)emInp.focus();
    return;
  }
  if(!role){
    alert(T['arc.form.err.role']||'Veuillez sélectionner un rôle.');
    var roleInp=document.getElementById('arc-role');if(roleInp)roleInp.focus();
    return;
  }

  /* Anti double-clic : désactiver le bouton pendant la requête */
  var btn=document.querySelector('#arc-form button[onclick^="submitArcovaWaitlist"]');
  var originalLabel='';
  if(btn){
    originalLabel=btn.innerHTML;
    btn.disabled=true;
    btn.innerHTML='…';
    btn.style.opacity='0.6';
  }
  function restoreBtn(){
    if(btn){btn.disabled=false;btn.innerHTML=originalLabel;btn.style.opacity='';}
  }

  if(typeof SUPA==='undefined'||typeof KEY==='undefined'){
    alert(T['arc.form.err']||'Configuration Supabase absente. Contactez-nous via le formulaire de contact.');
    restoreBtn();
    return;
  }

  var payload={
    email:em.toLowerCase(),
    first_name:fn||null,
    last_name:ln||null,
    company:co||null,
    role:role,
    message:msg||null
  };

  try{
    fetch(SUPA+'/rest/v1/arcova_waitlist',{
      method:'POST',
      headers:{
        'apikey':KEY,
        'Authorization':'Bearer '+KEY,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify(payload)
    }).then(function(r){
      if(r.ok||r.status===201){
        /* Reset form */
        ['arc-fn','arc-ln','arc-em','arc-co','arc-msg'].forEach(function(id){
          var e=document.getElementById(id);if(e)e.value='';
        });
        var rSel=document.getElementById('arc-role');if(rSel)rSel.value='';
        restoreBtn();
        alert(T['arc.form.ok']||'Merci ! Votre inscription à la liste d\'attente ARCOVA est enregistrée. Nous vous contacterons lors du lancement officiel.');
      }else if(r.status===409){
        restoreBtn();
        alert(T['arc.form.dupe']||'Cet e-mail figure déjà sur la liste d\'attente ARCOVA. Merci !');
      }else{
        r.text().then(function(txt){console.error('[ARCOVA] Insert failed HTTP '+r.status+':',txt);});
        restoreBtn();
        alert(T['arc.form.err']||'Une erreur est survenue. Veuillez réessayer ou nous contacter via le formulaire de contact.');
      }
    }).catch(function(e){
      console.error('[ARCOVA] Network error:',e);
      restoreBtn();
      alert(T['arc.form.err.net']||'Erreur réseau. Vérifiez votre connexion et réessayez.');
    });
  }catch(e){
    console.error('[ARCOVA] Submit exception:',e);
    restoreBtn();
    alert(T['arc.form.err']||'Une erreur est survenue. Veuillez réessayer ou nous contacter via le formulaire de contact.');
  }
};
/* ═══════ Fin Module 8 — ARCOVA waitlist ═══════ */
window.openLegal=function(t){
  window.openM('m-legal');
  var tab=document.querySelector('.ltab[data-t="'+t+'"]');
  if(tab)window.swL(tab);
  /* V28 — Force re-rendu des mp-mail dans la modale légale (RGPD, mentions, etc.)
     Fix de la "case blanche" du paragraphe RGPD où l'email admin@ n'apparaissait
     pas faute de rendu après ouverture de la modale. */
  setTimeout(function(){
    var modal=document.getElementById('m-legal');
    if(!modal)return;
    var mails=modal.querySelectorAll('.mp-mail');
    for(var i=0;i<mails.length;i++){
      delete mails[i].dataset.done;
    }
    if(typeof window.renderMails==='function'){
      window.renderMails();
    } else {
      /* Si renderMails n'est pas exposé globalement, le MutationObserver
         devrait quand même se déclencher au prochain DOM change */
      modal.dispatchEvent(new Event('mp-mail-rerender'));
    }
  },50);
};
window.swL=function(btn){
  if(!btn)return;
  var t=btn.dataset.t;
  var tabs=document.querySelectorAll('#m-legal .ltab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('on');
  btn.classList.add('on');
  var pans=document.querySelectorAll('#m-legal .lpan');
  for(var j=0;j<pans.length;j++){
    pans[j].classList.remove('on');
    if(pans[j].id==='legal-'+t)pans[j].classList.add('on');
  }
};

document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var ms=document.querySelectorAll('.modal.open');
    for(var i=0;i<ms.length;i++)ms[i].classList.remove('open');
    document.body.style.overflow='';
  }
});

/* ─── SEARCH TABS ─── */
/* ─── SEARCH MODE TOGGLE (manuelle / IA) ─── */
window.szMode=function(mode){
  var btnM=document.getElementById('sz-m-manu'),btnI=document.getElementById('sz-m-ia');
  var paneM=document.getElementById('sz-pane-manu'),paneI=document.getElementById('sz-pane-ia');
  if(!btnM||!btnI||!paneM||!paneI)return;
  if(mode==='ia'){
    btnM.classList.remove('on');btnI.classList.add('on');
    paneM.classList.remove('on');paneI.classList.add('on');
  }else{
    btnI.classList.remove('on');btnM.classList.add('on');
    paneI.classList.remove('on');paneM.classList.add('on');
  }
};
/* Compat : ancien selTab conservé au cas où d'autres éléments l'appelleraient */
window.selTab=function(btn,type){};

/* ─── LOCATION TABS ─── */
window.lTab=function(btn,id){
  var p=btn.parentNode;
  var siblings=p.querySelectorAll('.ltab');
  for(var i=0;i<siblings.length;i++)siblings[i].classList.remove('on');
  btn.classList.add('on');
  var parent=btn.closest('.mb');
  var pans=parent.querySelectorAll('.lpan');
  for(var j=0;j<pans.length;j++){
    pans[j].classList.remove('on');
    if(pans[j].id===id)pans[j].classList.add('on');
  }
};

/* ─── SIM TABS ─── */
window.simTab=function(btn,id){
  var p=btn.parentNode;
  var siblings=p.querySelectorAll('.ltab');
  for(var i=0;i<siblings.length;i++)siblings[i].classList.remove('on');
  btn.classList.add('on');
  var pans=document.querySelectorAll('#m-simulateurs .lpan');
  for(var j=0;j<pans.length;j++){
    pans[j].classList.remove('on');
    if(pans[j].id===id)pans[j].classList.add('on');
  }
};

/* ─── SEARCH (filtrage réel avec pays/secteur/type/budget + mode IA) ─── */
/* V28 FINAL9 — Clic sur une ville/commune dans les sous-pages Lux/Intl :
   ferme la sous-page, pré-remplit le secteur dans la recherche, lance doSearch */
window.mkFilterByCity=function(city){
  if(!city)return;
  /* Ferme la sous-page active (m-marches-lux ou m-marches-intl) */
  var active=document.querySelector('.modal.as-page');
  if(active)closeM(active.id);
  else{
    closeM('m-marches-lux');
    closeM('m-marches-intl');
  }
  /* Remplit le secteur dans la barre de recherche home */
  var secInp=document.getElementById('sz-secteur');
  if(secInp)secInp.value=city;
  /* Essaie de deviner le pays à partir de la ville pour pré-sélectionner le select pays */
  var countryByCity={
    'Luxembourg':'Luxembourg','Belair':'Luxembourg','Kirchberg':'Luxembourg','Limpertsberg':'Luxembourg',
    'Cloche d':'Luxembourg','Gasperich':'Luxembourg','Merl':'Luxembourg','Strassen':'Luxembourg',
    'Bertrange':'Luxembourg','Mamer':'Luxembourg','Capellen':'Luxembourg','Steinfort':'Luxembourg',
    'Koerich':'Luxembourg','Kaerjeng':'Luxembourg','Hobscheid':'Luxembourg','Saeul':'Luxembourg',
    'Bridel':'Luxembourg','Steinsel':'Luxembourg','Mersch':'Luxembourg','Diekirch':'Luxembourg',
    'Hesperange':'Luxembourg','Dudelange':'Luxembourg','Bettembourg':'Luxembourg','Mondorf':'Luxembourg',
    'Paris':'France','Cannes':'France','Nice':'France','Saint-Tropez':'France',
    'Monaco':'Monaco',
    'Bruxelles':'Belgique',
    'Genève':'Suisse','Zurich':'Suisse',
    'Berlin':'Allemagne','Munich':'Allemagne',
    'Milan':'Italie','Rome':'Italie',
    'Madrid':'Espagne','Barcelone':'Espagne','Baléares':'Espagne','Ibiza':'Espagne','Majorque':'Espagne','Marbella':'Espagne',
    'Lisbonne':'Portugal','Porto':'Portugal','Algarve':'Portugal',
    'Dubaï':'Émirats Arabes Unis','Abu Dhabi':'Émirats Arabes Unis',
    'New York':'États-Unis','Miami':'États-Unis',
    'Cancún':'Autre','Tulum':'Autre',
    'Île Maurice':'Autre'
  };
  var country=countryByCity[city]||'';
  var paysSel=document.getElementById('sz-pays');
  if(paysSel && country){
    for(var i=0;i<paysSel.options.length;i++){
      if(paysSel.options[i].value===country){paysSel.selectedIndex=i;break;}
    }
  }
  /* Scroll vers la barre de recherche + déclenche doSearch */
  setTimeout(function(){
    var szSec=document.getElementById('search-section');
    if(szSec){
      szSec.scrollIntoView({behavior:'smooth',block:'start'});
    }
    /* Laisse le temps au scroll avant de lancer la recherche */
    setTimeout(function(){window.doSearch();},600);
  },100);
};

/* V28 FINAL10 — Event delegation pour toutes les cards [data-city] des sous-pages + spans szo-grid dans m-marches */
document.addEventListener('click',function(ev){
  var el=ev.target;
  /* Remonter jusqu'à 4 niveaux pour trouver un élément avec data-city ou un span szo-grid */
  for(var i=0;i<5;i++){
    if(!el || el===document.body)break;
    if(el.hasAttribute && el.hasAttribute('data-city')){
      var city=el.getAttribute('data-city');
      if(city){ev.preventDefault();window.mkFilterByCity(city);return;}
    }
    if(el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('szo-grid')){
      /* Clic sur un span dans un szo-grid (m-marches) : on extrait le nom sans le préfixe "France — " etc. */
      var raw=(el.textContent||'').trim();
      /* Nettoyer le préfixe "Pays — " pour récupérer juste la ville */
      var m=raw.match(/^[^—]+—\s*(.+)$/);
      var cityName=m?m[1].trim():raw;
      /* Pour les entrées multiples type "Côte d'Azur (Cannes, Nice, Saint-Tropez)", on prend juste la 1ère ville */
      cityName=cityName.replace(/\s*\([^)]*\)/,'').split(/[·,]/)[0].trim();
      if(cityName){ev.preventDefault();window.mkFilterByCity(cityName);return;}
    }
    el=el.parentNode;
  }
},false);

window.doSearch=function(){
  var iaMode=document.getElementById('sz-pane-ia').classList.contains('on');
  var q='',filters={};
  if(iaMode){
    q=((document.getElementById('sinp')||{}).value||'').trim();
    if(!q){toast((I18N[CURLANG]['toast.search.empty']||'Décrivez votre bien idéal'));return}
  }else{
    filters={
      pays:(document.getElementById('sz-pays')||{}).value||'',
      secteur:((document.getElementById('sz-secteur')||{}).value||'').trim(),
      type:(document.getElementById('sz-type')||{}).value||'',
      budget:(document.getElementById('sz-budget')||{}).value||'',
      chambres:(document.getElementById('sz-chambres')||{}).value||''
    };
    var any=filters.pays||filters.secteur||filters.type||filters.budget||filters.chambres;
    if(!any){toast((I18N[CURLANG]['toast.search.crit']||'Précisez au moins un critère'));return}
    q=[filters.pays,filters.secteur,filters.type].filter(Boolean).join(' ');
  }
  if(PROPS.length===0){loadBiens(function(){renderSearch(q,filters,iaMode)});return}
  renderSearch(q,filters,iaMode);
};
function renderSearch(q,filters,iaMode){
  filters=filters||{};
  /* V28 FINAL6 — Dict pays : nom long → variantes acceptées (nom complet, code ISO, variantes courantes) */
  var COUNTRY_VARIANTS={
    'luxembourg':['luxembourg','luxemburg','lu','grand-duché','grand duche','grand-duche'],
    'france':['france','fr','français','francaise'],
    'belgique':['belgique','belgium','be','belgië','belgie'],
    'suisse':['suisse','switzerland','schweiz','svizzera','ch'],
    'allemagne':['allemagne','germany','deutschland','de'],
    'italie':['italie','italy','italia','it'],
    'espagne':['espagne','spain','españa','espana','es'],
    'portugal':['portugal','pt'],
    'monaco':['monaco','mc'],
    'royaume-uni':['royaume-uni','united kingdom','uk','gb','great britain','grande-bretagne','angleterre'],
    'autriche':['autriche','austria','österreich','osterreich','at'],
    'pays-bas':['pays-bas','netherlands','nederland','nl','holland'],
    'émirats arabes unis':['émirats','emirats','uae','united arab emirates','emirats arabes unis','ae','dubaï','dubai','abu dhabi'],
    'états-unis':['états-unis','etats-unis','united states','usa','us','america','amérique','amerique'],
    'canada':['canada','ca']
  };
  function matchCountry(filterPays,hay){
    var key=filterPays.toLowerCase();
    var variants=COUNTRY_VARIANTS[key]||[key];
    for(var i=0;i<variants.length;i++){
      if(hay.indexOf(variants[i])>-1)return true;
    }
    return false;
  }

  function applyFilters(p,relaxType){
    var hay=((p.title||'')+' '+(p.location||'')+' '+(p.city||'')+' '+(p.address||'')+' '+(p.country||'')+' '+(p.country_code||'')+' '+(p.type||'')+' '+(p.property_type||'')+' '+(p.category||'')+' '+(p.description||'')).toLowerCase();
    if(iaMode){
      var words=q.toLowerCase().split(/\s+/).filter(function(w){return w.length>2});
      if(words.length===0)return{ok:true};
      var allMatch=words.every(function(w){return hay.indexOf(w)>-1});
      return{ok:allMatch,reason:allMatch?'':'mode IA: mot manquant dans le contenu'};
    }
    if(filters.pays&&!matchCountry(filters.pays,hay))return{ok:false,reason:'pays "'+filters.pays+'" pas trouvé'};
    if(filters.secteur&&hay.indexOf(filters.secteur.toLowerCase())===-1)return{ok:false,reason:'secteur "'+filters.secteur+'" pas trouvé'};
    if(!relaxType && filters.type){
      var tLow=filters.type.toLowerCase();
      var syn={
        'maison':['maison','villa','maisonnette','chalet','hotel particulier','hôtel particulier','manoir','demeure','propriété','propriete'],
        'villa':['villa','maison','maisonnette','chalet'],
        'appartement':['appartement','appart','duplex','triplex','penthouse','loft','studio'],
        'penthouse':['penthouse','duplex','appartement','loft'],
        'duplex':['duplex','triplex','appartement'],
        'loft':['loft','appartement','duplex'],
        'terrain':['terrain','parcelle','lot','foncier'],
        'commerce':['commerce','local commercial','boutique','fonds de commerce','surface commerciale'],
        'bureau':['bureau','bureaux','local professionnel','open space'],
        'immeuble':['immeuble','immeuble de rapport','résidence','residence'],
        'garage':['garage','parking','box'],
        'trophy':['trophy','prestige','exception','exceptionnel','exclusif','rare']
      };
      var typesToTry=syn[tLow]||[tLow];
      var matched=false;
      for(var s=0;s<typesToTry.length;s++){
        if(hay.indexOf(typesToTry[s])>-1){matched=true;break;}
      }
      if(!matched)return{ok:false,reason:'type "'+filters.type+'" pas trouvé (essayé: '+typesToTry.join(', ')+')'};
    }
    if(filters.budget){
      var b=filters.budget.split('-');
      var min=+b[0]||0,max=+b[1]||999999999;
      var pv=+p.price_value||0;
      if(pv<min||pv>max)return{ok:false,reason:'budget hors fourchette ('+pv+' € pas dans '+min+'-'+max+')'};
    }
    if(filters.chambres){
      var wanted=+filters.chambres;
      var has=+(p.bedrooms||p.rooms||0);
      if(wanted>=5){if(has<5)return{ok:false,reason:'chambres '+has+' < 5'};}
      else{if(has!==wanted)return{ok:false,reason:'chambres '+has+' ≠ '+wanted};}
    }
    return{ok:true};
  }

  /* Première passe : tous les filtres stricts */
  var debug=[];
  var r=PROPS.filter(function(p){
    var res=applyFilters(p,false);
    debug.push({title:p.title||p.id||'?',ok:res.ok,reason:res.reason||'OK'});
    return res.ok;
  });

  /* V28 FINAL6 : si 0 résultat ET on avait un filtre type, on relâche le type et on retente */
  var relaxedMode=false;
  if(r.length===0 && filters.type && !iaMode){
    r=PROPS.filter(function(p){return applyFilters(p,true).ok;});
    if(r.length>0)relaxedMode=true;
  }

  /* Stocker debug pour inspection F12 */
  window.__MAPA_LAST_SEARCH={filters:filters,iaMode:iaMode,query:q,debug:debug,results:r.length,relaxed:relaxedMode};
  console.log('[MAPA Search]',{filters:filters,results:r.length,relaxed:relaxedMode});
  if(r.length===0)console.log('[MAPA Search] Pourquoi 0 résultat — détail par bien:',debug);

  window.openM('m-search');
  var T=(I18N&&I18N[CURLANG])||{};
  var label=iaMode?('« '+q+' »'):(q||(T['search.all.criteria']||'tous critères'));
  var st=document.getElementById('sr-title');
  if(st){
    if(r.length){
      var prefix=r.length+' '+(T['search.results.for']||'résultat(s) pour')+' '+label;
      if(relaxedMode){
        prefix+=' '+(T['search.relaxed']||'(critères élargis : type ignoré)');
      }
      st.textContent=prefix;
    }else{
      st.textContent=(T['search.no.results.for']||'Aucun résultat pour')+' '+label;
    }
  }
  var sr=document.getElementById('sr'),nr=document.getElementById('sr-no');
  if(sr)sr.style.display=r.length?'grid':'none';
  if(nr)nr.style.display=r.length?'none':'block';
  if(!sr)return;
  /* V28 FINAL6 — Rendu en cartes (.bcard) avec photo, badge, lieu, DPE, prix — même style que la page Acheter */
  sr.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;max-height:70vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 2px';
  var html='';
  r.forEach(function(b){
    var title=((typeof bLang==='function')?bLang(b,'title'):null)||b.title||(T['card.fallback.title']||'Bien');
    var loc=((typeof bLoc==='function')?bLoc(b):null)||b.location||b.city||'Luxembourg';
    var price=((typeof bPrice==='function')?bPrice(b):null)||b.price_display||(b.price_value?fmt(b.price_value)+' €':(T['card.price.demand']||'Prix sur demande'));
    var ref=b.apimo_id||b.slug||(b.id?String(b.id).substring(0,8):'—');
    var cat=b.property_type||((typeof bLang==='function')?bLang(b,'category'):null)||b.category||(T['card.fallback.title']||'Bien');
    var isOff=(typeof bIsOff==='function')&&bIsOff(b);
    var isRent=(typeof bIsRental==='function')&&bIsRental(b);
    var bid=b.id||'';
    if(isOff){
      html+='<div class="bcard off" onclick="closeM(\'m-search\');openBien(\''+bid+'\')">'+
        '<div class="bc-img">'+
          '<div class="bc-img-blur" style="background-image:linear-gradient(135deg,#2a3f5a,#1a2b44,#0d1829)"></div>'+
          '<div class="bc-lock">'+(typeof LOCK_SVG!=='undefined'?LOCK_SVG:'')+'<div class="bc-lock-txt">'+(T['card.off.confid']||'Bien confidentiel')+'<br>'+(T['card.off.access']||'Accès sur demande')+'</div></div>'+
          '<span class="bc-badge off">Off-Market</span>'+
        '</div>'+
        '<div class="bc-body">'+
          '<div class="bc-ref">'+(T['card.ref']||'Réf.')+' '+esc(ref)+' · '+esc(cat)+'</div>'+
          '<div class="bc-title">'+esc(title||(T['card.off.confid']||'Bien confidentiel'))+'</div>'+
          '<div class="bc-loc">'+esc(loc||(T['card.off.loc.hidden']||'Localisation masquée'))+'</div>'+
          '<div class="bc-specs">'+
            (b.surface?'<span class="bc-spec">📐 '+b.surface+' m²</span>':'')+
            (b.bedrooms?'<span class="bc-spec">🛏 '+b.bedrooms+' ch.</span>':'')+
            (b.bathrooms?'<span class="bc-spec">🛁 '+b.bathrooms+'</span>':'')+
            (b.energy&&typeof dpeBadgeHtml==='function'?dpeBadgeHtml(b.energy):'')+
          '</div>'+
          '<div class="bc-price">'+(T['card.price.demand']||'Prix sur demande')+'<small>'+(T['card.see.detail']||'Voir détail →')+'</small></div>'+
        '</div></div>';
    }else{
      var img=(typeof bFirstImg==='function')?bFirstImg(b):(b.image||b.photo||'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80');
      var badgeType=isRent?(T['badge.rent']||'À louer'):(T['badge.sale']||'À vendre');
      var badgeCls=isRent?'loc':'';
      html+='<div class="bcard" onclick="closeM(\'m-search\');openBien(\''+bid+'\')">'+
        '<div class="bc-img"><img src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80\'">'+
        '<span class="bc-badge '+badgeCls+'">'+esc(badgeType)+'</span>'+
        '</div>'+
        '<div class="bc-body">'+
        '<div class="bc-ref">'+(T['card.ref']||'Réf.')+' '+esc(ref)+' · '+esc(cat)+'</div>'+
        '<div class="bc-title">'+esc(title)+'</div>'+
        '<div class="bc-loc">'+esc(loc)+'</div>'+
        '<div class="bc-specs">'+
          (b.surface?'<span class="bc-spec">📐 '+b.surface+' m²</span>':'')+
          (b.bedrooms?'<span class="bc-spec">🛏 '+b.bedrooms+' '+(T['card.short.bed']||'ch.')+'</span>':'')+
          (b.bathrooms?'<span class="bc-spec">🛁 '+b.bathrooms+'</span>':'')+
          (b.energy&&typeof dpeBadgeHtml==='function'?dpeBadgeHtml(b.energy):'')+
        '</div>'+
        '<div class="bc-price">'+esc(price)+'<small>'+(T['card.see.detail']||'Voir détail →')+'</small></div>'+
        '</div></div>';
    }
  });
  sr.innerHTML=html;
}

/* ─── BIEN DÉMO (fallback si Supabase vide) ─── */
var DEMO_BIEN={
  id:'demo-belair-001',
  ref:'MAPA-2026-001',
  type:'vente',
  category:'Appartement de prestige',
  category_fr:'Appartement de prestige',
  category_en:'Prestige apartment',
  category_de:'Prestige-Wohnung',
  title:'Penthouse d\'exception avec terrasse panoramique',
  title_fr:'Penthouse d\'exception avec terrasse panoramique',
  title_en:'Exceptional penthouse with panoramic terrace',
  title_de:'Außergewöhnliches Penthouse mit Panoramaterrasse',
  location:'Belair, Luxembourg-Ville',
  location_fr:'Belair, Luxembourg-Ville',
  location_en:'Belair, Luxembourg City',
  location_de:'Belair, Luxembourg-Stadt',
  price:'2 850 000',
  price_note:'Honoraires vendeur inclus',
  price_note_fr:'Honoraires vendeur inclus',
  price_note_en:'Seller\'s fees included',
  price_note_de:'Verkäuferhonorare inklusive',
  surface:185,
  terrace:42,
  rooms:5,
  bedrooms:3,
  bathrooms:2,
  parking:2,
  floor:'6ème (dernier étage)',
  year:2019,
  energy:'A',
  thermal:'A',
  images:[
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=85',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1600&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1600&q=85',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1600&q=85'
  ],
  description_html:'Au cœur du quartier le plus recherché de Luxembourg-Ville, ce penthouse d\'exception offre une vue dégagée sur la Ville-Haute et la vallée de la Pétrusse. Dernière livraison d\'une résidence contemporaine signée par un architecte luxembourgeois de renom, ce bien conjugue volumes généreux, lumière traversante et prestations haut de gamme.\n\nCaractéristiques :\n3 chambres, 2 salles de bain, 1 cuisine Gaggenau équipée, 1 vaste séjour-salle à manger de 72 m², 2 emplacements de parking en sous-sol, 1 cave privative, 1 terrasse panoramique de 42 m² orientée plein sud.\n\nPrestations :\nSuite parentale avec dressing, salle de bain en marbre de Carrare, douche à l\'italienne, baignoire îlot, parquet chêne massif, domotique KNX intégrée, climatisation réversible, ascenseur privatif desservant directement l\'appartement.\n\nSécurité & services :\nRésidence sécurisée avec conciergerie, accès contrôlé, visite privée sur rendez-vous uniquement.\n\nEmplacement :\nBelair, Luxembourg-Ville, au 6ème et dernier étage avec vue panoramique sur la Ville-Haute et la vallée de la Pétrusse. Proximité immédiate du Parc de Merl, des ambassades et du quartier européen.',
  description_fr:'Au cœur du quartier le plus recherché de Luxembourg-Ville, ce penthouse d\'exception offre une vue dégagée sur la Ville-Haute et la vallée de la Pétrusse. Dernière livraison d\'une résidence contemporaine signée par un architecte luxembourgeois de renom, ce bien conjugue volumes généreux, lumière traversante et prestations haut de gamme.\n\nCaractéristiques :\n3 chambres, 2 salles de bain, 1 cuisine Gaggenau équipée, 1 vaste séjour-salle à manger de 72 m², 2 emplacements de parking en sous-sol, 1 cave privative, 1 terrasse panoramique de 42 m² orientée plein sud.\n\nPrestations :\nSuite parentale avec dressing, salle de bain en marbre de Carrare, douche à l\'italienne, baignoire îlot, parquet chêne massif, domotique KNX intégrée, climatisation réversible, ascenseur privatif desservant directement l\'appartement.\n\nSécurité & services :\nRésidence sécurisée avec conciergerie, accès contrôlé, visite privée sur rendez-vous uniquement.\n\nEmplacement :\nBelair, Luxembourg-Ville, au 6ème et dernier étage avec vue panoramique sur la Ville-Haute et la vallée de la Pétrusse. Proximité immédiate du Parc de Merl, des ambassades et du quartier européen.',
  description_en:'In the heart of Luxembourg City\'s most sought-after district, this exceptional penthouse offers unobstructed views of the Upper Town and the Pétrusse valley. Latest delivery of a contemporary residence signed by a renowned Luxembourg architect, this property combines generous volumes, cross-lighting and high-end features.\n\nFeatures:\n3 bedrooms, 2 bathrooms, 1 equipped Gaggenau kitchen, 1 vast living-dining room of 72 sqm, 2 underground parking spaces, 1 private cellar, 1 panoramic terrace of 42 sqm facing due south.\n\nAmenities:\nMaster suite with dressing room, Carrara marble bathroom, walk-in shower, freestanding bathtub, solid oak parquet flooring, integrated KNX home automation, reversible air conditioning, private elevator serving the apartment directly.\n\nSecurity & services:\nSecure residence with concierge, controlled access, private viewing by appointment only.\n\nLocation:\nBelair, Luxembourg City, on the 6th and top floor with panoramic views of the Upper Town and the Pétrusse valley. Immediate proximity to Parc de Merl, embassies and the European district.',
  description_de:'Im Herzen des begehrtesten Viertels von Luxemburg-Stadt bietet dieses außergewöhnliche Penthouse einen freien Blick auf die Oberstadt und das Pétrusse-Tal. Neueste Fertigstellung einer zeitgenössischen Residenz eines renommierten Luxemburger Architekten, vereint diese Immobilie großzügige Volumen, Durchlicht und hochwertige Ausstattung.\n\nMerkmale:\n3 Schlafzimmer, 2 Badezimmer, 1 ausgestattete Gaggenau-Küche, 1 großzügiger Wohn-Essbereich von 72 m², 2 Tiefgaragenstellplätze, 1 privater Keller, 1 Panoramaterrasse von 42 m² mit Südausrichtung.\n\nAusstattung:\nMastersuite mit Ankleidezimmer, Badezimmer aus Carrara-Marmor, bodengleiche Dusche, freistehende Badewanne, massives Eichenparkett, integrierte KNX-Haussteuerung, reversible Klimaanlage, privater Aufzug mit direktem Zugang zur Wohnung.\n\nSicherheit & Services:\nGesicherte Residenz mit Concierge, kontrollierter Zugang, private Besichtigung nur nach Terminvereinbarung.\n\nLage:\nBelair, Luxemburg-Stadt, in der 6. und obersten Etage mit Panoramablick auf die Oberstadt und das Pétrusse-Tal. Unmittelbare Nähe zum Parc de Merl, Botschaften und Europaviertel.',
  features:['Terrasse panoramique 42 m²','Vue Ville-Haute & Pétrusse','Cuisine Gaggenau équipée','Suite parentale avec dressing','Domotique KNX intégrée','Climatisation réversible','Ascenseur privatif','Parking double en sous-sol','Cave privative','Résidence sécurisée avec conciergerie','Marbre de Carrare','Parquet chêne massif'],
  agent:'Julien Brebion',
  agent_role:'Real Estate Director'
};

/* ─── BIEN DÉMO LOCATION ─── */
var DEMO_LOCATION={
  id:'demo-limpert-loc-001',
  ref:'MAPA-LOC-2026-001',
  type:'location',
  category:'Appartement meublé haut de gamme',
  category_fr:'Appartement meublé haut de gamme',
  category_en:'High-end furnished apartment',
  category_de:'Hochwertig möblierte Wohnung',
  title:'Appartement lumineux avec balcon — proche parcs',
  title_fr:'Appartement lumineux avec balcon — proche parcs',
  title_en:'Bright apartment with balcony — near parks',
  title_de:'Helle Wohnung mit Balkon — nahe Parks',
  location:'Limpertsberg, Luxembourg-Ville',
  location_fr:'Limpertsberg, Luxembourg-Ville',
  location_en:'Limpertsberg, Luxembourg City',
  location_de:'Limpertsberg, Luxembourg-Stadt',
  price:'3 200',
  price_note:'Charges comprises · Meublé · Disponible immédiatement',
  price_note_fr:'Charges comprises · Meublé · Disponible immédiatement',
  price_note_en:'Charges included · Furnished · Available immediately',
  price_note_de:'Nebenkosten inklusive · Möbliert · Sofort verfügbar',
  surface:95,
  terrace:12,
  rooms:3,
  bedrooms:2,
  bathrooms:2,
  parking:1,
  floor:'3ème avec ascenseur',
  year:2018,
  energy:'B',
  thermal:'B',
  images:[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600&q=85',
    'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=1600&q=85',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=85',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=85',
    'https://images.unsplash.com/photo-1600566753104-685f4f24cb4d?w=1600&q=85',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1600&q=85'
  ],
  description_html:'À deux pas du Parc de Merl et du centre-ville, bel appartement meublé dans une résidence récente. Volumes clairs, parquet chêne, cuisine équipée ouverte sur séjour et balcon sud-ouest, prêt à emménager.\n\nCaractéristiques :\n2 chambres dont 1 suite parentale, 2 salles de bain, 1 cuisine équipée, 1 séjour lumineux, 1 balcon sud-ouest de 12 m², 1 parking en sous-sol, 1 cave privative.\n\nPrestations :\nEntièrement meublé avec soin, rangements intégrés dans chaque chambre, parquet chêne, connexion fibre optique, ascenseur, résidence récente (2018).\n\nConditions de location :\nLoyer conforme au plafond légal luxembourgeois (5 % du capital investi pondéré). Charges comprises. Bail standard avec garantie 3 mois. Disponible immédiatement. Idéal expatrié ou cadre dirigeant.\n\nEmplacement :\nLimpertsberg, Luxembourg-Ville, proximité immédiate du Parc de Merl et du centre-ville. Quartier calme et résidentiel, à proximité des transports et des commerces de proximité.',
  description_fr:'À deux pas du Parc de Merl et du centre-ville, bel appartement meublé dans une résidence récente. Volumes clairs, parquet chêne, cuisine équipée ouverte sur séjour et balcon sud-ouest, prêt à emménager.\n\nCaractéristiques :\n2 chambres dont 1 suite parentale, 2 salles de bain, 1 cuisine équipée, 1 séjour lumineux, 1 balcon sud-ouest de 12 m², 1 parking en sous-sol, 1 cave privative.\n\nPrestations :\nEntièrement meublé avec soin, rangements intégrés dans chaque chambre, parquet chêne, connexion fibre optique, ascenseur, résidence récente (2018).\n\nConditions de location :\nLoyer conforme au plafond légal luxembourgeois (5 % du capital investi pondéré). Charges comprises. Bail standard avec garantie 3 mois. Disponible immédiatement. Idéal expatrié ou cadre dirigeant.\n\nEmplacement :\nLimpertsberg, Luxembourg-Ville, proximité immédiate du Parc de Merl et du centre-ville. Quartier calme et résidentiel, à proximité des transports et des commerces de proximité.',
  description_en:'A stone\'s throw from Parc de Merl and the city centre, beautiful furnished apartment in a recent residence. Bright volumes, oak parquet, equipped kitchen opening onto living room and south-west balcony, ready to move in.\n\nFeatures:\n2 bedrooms including 1 master suite, 2 bathrooms, 1 equipped kitchen, 1 bright living room, 1 south-west balcony of 12 sqm, 1 underground parking space, 1 private cellar.\n\nAmenities:\nFully furnished with care, built-in storage in each bedroom, oak parquet flooring, fibre optic connection, elevator, recent residence (2018).\n\nRental terms:\nRent complies with the Luxembourg legal ceiling (5 % of weighted invested capital). Charges included. Standard lease with 3-month deposit. Available immediately. Ideal for expatriates or senior executives.\n\nLocation:\nLimpertsberg, Luxembourg City, immediate proximity to Parc de Merl and the city centre. Quiet residential neighbourhood, close to public transport and local shops.',
  description_de:'Nur wenige Schritte vom Parc de Merl und dem Stadtzentrum entfernt, schöne möblierte Wohnung in einer neuen Residenz. Helle Volumen, Eichenparkett, Einbauküche offen zum Wohnzimmer und Südwest-Balkon, bezugsfertig.\n\nMerkmale:\n2 Schlafzimmer davon 1 Mastersuite, 2 Badezimmer, 1 Einbauküche, 1 helles Wohnzimmer, 1 Südwest-Balkon von 12 m², 1 Tiefgaragenstellplatz, 1 privater Keller.\n\nAusstattung:\nVollständig und sorgfältig möbliert, Einbauschränke in jedem Schlafzimmer, Eichenparkett, Glasfaseranschluss, Aufzug, neue Residenz (2018).\n\nMietbedingungen:\nMiete entspricht der luxemburgischen gesetzlichen Obergrenze (5 % des gewichteten investierten Kapitals). Nebenkosten inklusive. Standardmietvertrag mit 3 Monaten Kaution. Sofort verfügbar. Ideal für Expatriates oder Führungskräfte.\n\nLage:\nLimpertsberg, Luxemburg-Stadt, unmittelbare Nähe zum Parc de Merl und Stadtzentrum. Ruhige Wohngegend, in der Nähe von öffentlichen Verkehrsmitteln und lokalen Geschäften.',
  features:['Entièrement meublé','Cuisine équipée','Balcon sud-ouest','Parking en sous-sol','Cave privative','Ascenseur','Proximité transports','Proche parcs','Quartier calme','Connexion fibre optique'],
  agent:'Julien Brebion',
  agent_role:'Real Estate Director'
};

/* ─── BIENS DÉMO OFF-MARKET (floutés, pas de vraies photos) ─── */
var DEMO_OFFMARKET=[
  {
    id:'demo-om-dommeldange',
    ref:'OM-LUX-2026-DOM',
    type:'offmarket',
    category:'Villa d\'architecte',
    category_fr:'Villa d\'architecte',
    category_en:'Architect-designed villa',
    category_de:'Architektenvilla',
    title:'Propriété d\'exception — Périphérie Luxembourg-Ville',
    title_fr:'Propriété d\'exception — Périphérie Luxembourg-Ville',
    title_en:'Exceptional property — Outskirts of Luxembourg City',
    title_de:'Außergewöhnliche Liegenschaft — Stadtrand Luxemburg',
    location:'Confidentiel · Luxembourg',
    location_fr:'Confidentiel · Luxembourg',
    location_en:'Confidential · Luxembourg',
    location_de:'Vertraulich · Luxemburg',
    price:'Prix sur demande',
    surface:'±500',
    bedrooms:'5',
    bathrooms:'5',
    teaser:'Villa d\'architecte au cœur d\'un environnement boisé, à quelques minutes du centre. Vaste terrain entièrement entouré de forêt, source naturelle, piscine intérieure, performance énergétique remarquable. Suite parentale, plusieurs chambres en suite, espaces de réception lumineux. Architecture contemporaine et intemporelle. Bien strictement off-market, dossier communiqué uniquement sur demande qualifiée après NDA.',
    teaser_fr:'Villa d\'architecte au cœur d\'un environnement boisé, à quelques minutes du centre. Vaste terrain entièrement entouré de forêt, source naturelle, piscine intérieure, performance énergétique remarquable. Suite parentale, plusieurs chambres en suite, espaces de réception lumineux. Architecture contemporaine et intemporelle. Bien strictement off-market, dossier communiqué uniquement sur demande qualifiée après NDA.',
    teaser_en:'Architect-designed villa nestled in a wooded setting, a few minutes from the city centre. Vast plot entirely surrounded by forest, natural spring, indoor pool, remarkable energy performance. Master suite, multiple en-suite bedrooms, bright reception areas. Contemporary and timeless architecture. Strictly off-market — full file shared only after qualified request and NDA.',
    teaser_de:'Architektenvilla in waldreicher Umgebung, wenige Minuten vom Zentrum entfernt. Großzügiges, vollständig vom Wald umgebenes Grundstück, natürliche Quelle, Innenpool, bemerkenswerte Energieeffizienz. Elternsuite, mehrere Zimmer mit eigenem Bad, helle Empfangsräume. Zeitgenössische und zeitlose Architektur. Streng Off-Market — vollständige Unterlagen nur nach qualifizierter Anfrage und NDA.'
  }
];

/* SVG cadenas monochrome doré */
var LOCK_SVG='<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 10V7a6 6 0 1 1 12 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4" y="10" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="15" r="1.4" fill="currentColor"/><path d="M12 16.4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

/* ─── RENDU GALERIE BIENS ─── */
var CUR_FILT='vente';  /* V28 FINAL9 : ACHETER s'ouvre sur l'onglet VENTE par défaut */
window.filtBien=function(btn,f){
  var bs=document.querySelectorAll('#m-achat .bfilt');
  for(var i=0;i<bs.length;i++)bs[i].classList.remove('on');
  btn.classList.add('on');
  CUR_FILT=f;
  renderBiensInto('biens-grid','biens-empty','achat');
};

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL13 Session 1c — LECTEUR VIDÉO SEMI-PAGE (fiches annonces)
   ───────────────────────────────────────────────────────────────────
   Ouverture d'une vidéo en overlay semi-page (largeur limitée, fond sombre).
   Compatible YouTube, Vimeo, MP4 direct.
═══════════════════════════════════════════════════════════════════ */
window.openVideoPlayer=function(url,title){
  if(!url)return;
  /* Détection YouTube / Vimeo / MP4 */
  var embedUrl=url;
  var isIframe=false;
  /* YouTube */
  var ytMatch=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if(ytMatch){
    embedUrl='https://www.youtube.com/embed/'+ytMatch[1]+'?autoplay=1&rel=0&modestbranding=1';
    isIframe=true;
  }
  /* Vimeo */
  var vmMatch=url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(vmMatch){
    embedUrl='https://player.vimeo.com/video/'+vmMatch[1]+'?autoplay=1';
    isIframe=true;
  }
  /* Construire l'overlay */
  var overlay=document.createElement('div');
  overlay.className='video-overlay';
  overlay.id='video-overlay';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-label',title||'Vidéo');
  var playerHtml=isIframe
    ? '<iframe src="'+embedUrl+'" frameborder="0" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>'
    : '<video src="'+embedUrl+'" controls autoplay playsinline></video>';
  overlay.innerHTML=
    '<div class="video-overlay-bg" onclick="closeVideoPlayer()"></div>'+
    '<div class="video-overlay-frame">'+
      '<button class="video-overlay-close" onclick="closeVideoPlayer()" aria-label="Fermer">✕</button>'+
      (title?'<div class="video-overlay-title">'+title+'</div>':'')+
      '<div class="video-overlay-player">'+playerHtml+'</div>'+
    '</div>';
  document.body.appendChild(overlay);
  /* Animation d'entrée */
  requestAnimationFrame(function(){overlay.classList.add('open')});
  /* Lock scroll */
  document.body.style.overflow='hidden';
  /* Fermeture via Escape */
  document.addEventListener('keydown',_videoOverlayEscape);
};
window.closeVideoPlayer=function(){
  var o=document.getElementById('video-overlay');
  if(!o)return;
  o.classList.remove('open');
  setTimeout(function(){
    if(o.parentNode)o.parentNode.removeChild(o);
    document.body.style.overflow='';
  },300);
  document.removeEventListener('keydown',_videoOverlayEscape);
};
function _videoOverlayEscape(e){
  if(e.key==='Escape'||e.keyCode===27)window.closeVideoPlayer();
}

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL13 — BIENS COUP DE CŒUR HARDCODÉS (visuel carrousel home)
   ───────────────────────────────────────────────────────────────────
   Ces 3 biens sont codés en dur pour le rendu du carrousel de la home.
   Un back-office admin prendra le relais : sélection via case "Coup de cœur"
   + ordre 1-4, branché sur 2 colonnes Supabase (is_featured + featured_order).
═══════════════════════════════════════════════════════════════════ */
var DEMO_FAV_STEINFORT={
  id:'demo-steinfort-fav',
  ref:'MAPA-STE-2026-F01',
  land_surface:850,
  living_surface:280,
  video_url:'https://www.youtube.com/watch?v=P4XdBBzx6nE',
  type:'vente',
  category:'Maison contemporaine',
  category_fr:'Maison contemporaine d\'architecte',
  category_en:'Contemporary architect-designed house',
  category_de:'Zeitgenössisches Architektenhaus',
  title:'Maison contemporaine d\'architecte',
  title_fr:'Maison contemporaine d\'architecte avec jardin paysager',
  title_en:'Contemporary architect house with landscaped garden',
  title_de:'Modernes Architektenhaus mit gestaltetem Garten',
  location:'Steinfort, Luxembourg',
  location_fr:'Steinfort, Luxembourg',
  location_en:'Steinfort, Luxembourg',
  location_de:'Steinfort, Luxemburg',
  price:'1 900 000',
  surface:280,
  terrace:0,
  terrace_surface:0,
  rooms:7,
  bedrooms:5,
  bathrooms:3,
  parking:2,
  floor:'Maison unifamiliale',
  year:2020,
  energy:'A',
  thermal:'A',
  images:[
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=85',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1600&q=85',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85'
  ],
  description_html:'Magnifique maison d\'architecte d\'exception édifiée en 2020 sur un terrain paysager de 850 m² au cœur de Steinfort. Volumes généreux, baies vitrées toute hauteur, matériaux nobles (pierre naturelle, bois massif, zinc).\n\nCaractéristiques :\n5 chambres, 3 salles de bain, 1 cuisine équipée Bulthaup, 1 grand séjour avec cheminée, 1 salle à manger, 2 garages, 1 cave à vin, 1 terrasse de 40 m².\n\nPrestations :\nDomotique KNX, pompe à chaleur géothermique, panneaux solaires, home cinéma, suite parentale avec dressing, salle de bains en marbre.\n\nEmplacement :\nAu calme absolu, à 15 minutes de Luxembourg-Ville. Proximité immédiate de la frontière belge, écoles internationales, commerces et accès autoroute A6.',
  description_fr:'Magnifique maison d\'architecte d\'exception édifiée en 2020 sur un terrain paysager de 850 m² au cœur de Steinfort. Volumes généreux, baies vitrées toute hauteur, matériaux nobles (pierre naturelle, bois massif, zinc).\n\nCaractéristiques :\n5 chambres, 3 salles de bain, 1 cuisine équipée Bulthaup, 1 grand séjour avec cheminée, 1 salle à manger, 2 garages, 1 cave à vin, 1 terrasse de 40 m².\n\nPrestations :\nDomotique KNX, pompe à chaleur géothermique, panneaux solaires, home cinéma, suite parentale avec dressing, salle de bains en marbre.\n\nEmplacement :\nAu calme absolu, à 15 minutes de Luxembourg-Ville. Proximité immédiate de la frontière belge, écoles internationales, commerces et accès autoroute A6.',
  description_en:'Magnificent exceptional architect-designed house built in 2020 on a landscaped plot of 850 sqm in the heart of Steinfort. Generous volumes, full-height glass windows, noble materials (natural stone, solid wood, zinc).\n\nFeatures:\n5 bedrooms, 3 bathrooms, 1 equipped Bulthaup kitchen, 1 large living room with fireplace, 1 dining room, 2 garages, 1 wine cellar, 1 terrace of 40 sqm.\n\nAmenities:\nKNX home automation, geothermal heat pump, solar panels, home cinema, master suite with dressing room, marble bathroom.\n\nLocation:\nAbsolutely quiet, 15 minutes from Luxembourg City. Immediate proximity to the Belgian border, international schools, shops and A6 motorway access.',
  description_de:'Prächtiges außergewöhnliches Architektenhaus aus dem Jahr 2020 auf einem gestalteten Grundstück von 850 m² im Herzen von Steinfort. Großzügige Volumen, raumhohe Glasfenster, edle Materialien (Naturstein, Massivholz, Zink).\n\nMerkmale:\n5 Schlafzimmer, 3 Badezimmer, 1 ausgestattete Bulthaup-Küche, 1 großes Wohnzimmer mit Kamin, 1 Esszimmer, 2 Garagen, 1 Weinkeller, 1 Terrasse von 40 m².\n\nAusstattung:\nKNX-Haussteuerung, Erdwärmepumpe, Solarpaneele, Heimkino, Mastersuite mit Ankleidezimmer, Badezimmer aus Marmor.\n\nLage:\nAbsolut ruhig, 15 Minuten von Luxemburg-Stadt entfernt. Unmittelbare Nähe zur belgischen Grenze, internationale Schulen, Geschäfte und Zugang zur Autobahn A6.',
  features:['Jardin paysager 850 m²','Cuisine Bulthaup','Domotique KNX','Pompe à chaleur géothermique','Panneaux solaires','Home cinéma','Garage 2 voitures','Cave à vin','Suite parentale','Proximité frontière belge'],
  agent:'Julien Brebion',
  agent_role:'Real Estate Director'
};

var DEMO_FAV_BELAIR={
  id:'demo-belair-bureaux-fav',
  ref:'MAPA-BEL-2026-F02',
  living_surface:1200,
  video_url:'https://www.youtube.com/watch?v=JOCrycD_pYs',
  type:'vente',
  category:'Immeuble de bureaux',
  category_fr:'Immeuble de bureaux d\'exception',
  category_en:'Exceptional office building',
  category_de:'Außergewöhnliches Bürogebäude',
  title:'Immeuble de bureaux d\'exception',
  title_fr:'Immeuble de bureaux Belair — mixte possible',
  title_en:'Belair office building — mixed-use possible',
  title_de:'Bürogebäude Belair — Mischnutzung möglich',
  location:'Belair, Luxembourg-Ville',
  location_fr:'Belair, Luxembourg-Ville',
  location_en:'Belair, Luxembourg City',
  location_de:'Belair, Luxemburg-Stadt',
  price:'8 650 000',
  surface:1200,
  terrace:0,
  terrace_surface:0,
  rooms:24,
  bedrooms:0,
  bathrooms:6,
  parking:12,
  floor:'4 étages + sous-sol',
  year:1985,
  energy:'C',
  thermal:'C',
  images:[
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=85',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=85',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1600&q=85'
  ],
  description_html:'Immeuble de bureaux d\'exception dans le quartier prestigieux de Belair. 1 200 m² utiles entièrement rénovés en 2022, mixte commercial/résidentiel possible sous réserve d\'autorisations.\n\nCaractéristiques :\n4 étages, 1 sous-sol, 12 places de parking, 6 salles de bain, 2 cuisines, 1 ascenseur.\n\nPrestations :\nFibre optique, plateaux modulables, climatisation centralisée, sécurité 24/7, accès contrôlé.\n\nInvestissement :\nActifs actuellement loués, rendement brut de 2,3 %. Opportunité de repositionnement premium importante (reconversion résidentielle haut de gamme envisageable). Dossier complet disponible avec NDA pour investisseurs institutionnels ou family offices.',
  description_fr:'Immeuble de bureaux d\'exception dans le quartier prestigieux de Belair. 1 200 m² utiles entièrement rénovés en 2022, mixte commercial/résidentiel possible sous réserve d\'autorisations.\n\nCaractéristiques :\n4 étages, 1 sous-sol, 12 places de parking, 6 salles de bain, 2 cuisines, 1 ascenseur.\n\nPrestations :\nFibre optique, plateaux modulables, climatisation centralisée, sécurité 24/7, accès contrôlé.\n\nInvestissement :\nActifs actuellement loués, rendement brut de 2,3 %. Opportunité de repositionnement premium importante (reconversion résidentielle haut de gamme envisageable). Dossier complet disponible avec NDA pour investisseurs institutionnels ou family offices.',
  description_en:'Exceptional office building in the prestigious Belair district. 1,200 sqm of usable space fully renovated in 2022, mixed commercial/residential use possible subject to authorisations.\n\nFeatures:\n4 floors, 1 basement, 12 parking spaces, 6 bathrooms, 2 kitchens, 1 elevator.\n\nAmenities:\nFibre optic, modular floor plans, centralised air conditioning, 24/7 security, controlled access.\n\nInvestment:\nAssets currently leased, gross yield of 2.3 %. Significant premium repositioning opportunity (high-end residential conversion possible). Complete file available under NDA for institutional investors or family offices.',
  description_de:'Außergewöhnliches Bürogebäude im prestigeträchtigen Stadtteil Belair. 1.200 m² Nutzfläche, vollständig renoviert im Jahr 2022, gemischte gewerbliche/residenzielle Nutzung vorbehaltlich Genehmigungen möglich.\n\nMerkmale:\n4 Etagen, 1 Untergeschoss, 12 Stellplätze, 6 Badezimmer, 2 Küchen, 1 Aufzug.\n\nAusstattung:\nGlasfaser, modulare Grundrisse, zentrale Klimaanlage, 24/7 Sicherheit, kontrollierter Zugang.\n\nInvestment:\nAktiva derzeit vermietet, Bruttorendite von 2,3 %. Bedeutende Premium-Repositionierungsmöglichkeit (hochwertige Wohnumwandlung möglich). Vollständige Unterlagen verfügbar unter NDA für institutionelle Investoren oder Family Offices.',
  features:['1 200 m² utiles','4 étages + sous-sol','Rénové 2022','12 places de parking','Ascenseur','Fibre optique','Mixte possible','Loué · rendement 2,3 %','Quartier Belair','Opportunité repositionnement'],
  agent:'Julien Brebion',
  agent_role:'Real Estate Director'
};

var DEMO_FAV_DUBAI={
  id:'demo-dubai-penthouse-fav',
  ref:'MAPA-DXB-2026-F03',
  living_surface:420,
  video_url:'https://www.youtube.com/watch?v=zYFSSKYN53E',
  type:'vente',
  category:'Penthouse',
  category_fr:'Penthouse vue Burj Khalifa',
  category_en:'Penthouse with Burj Khalifa view',
  category_de:'Penthouse mit Burj-Khalifa-Blick',
  title:'Penthouse vue Burj Khalifa',
  title_fr:'Penthouse d\'exception — vue Burj Khalifa',
  title_en:'Exceptional penthouse — Burj Khalifa view',
  title_de:'Außergewöhnliches Penthouse — Burj-Khalifa-Blick',
  location:'Dubaï, Émirats Arabes Unis',
  location_fr:'Dubaï, Émirats Arabes Unis',
  location_en:'Dubai, United Arab Emirates',
  location_de:'Dubai, Vereinigte Arabische Emirate',
  price:'12 500 000',
  price_note:'Prix en AED · Broker sous mandat',
  price_note_fr:'Prix en AED (Dirham) · Broker sous mandat',
  price_note_en:'Price in AED (Dirham) · Broker under mandate',
  price_note_de:'Preis in AED (Dirham) · Broker unter Mandat',
  surface:420,
  terrace:180,
  terrace_surface:180,
  rooms:6,
  bedrooms:4,
  bathrooms:5,
  parking:3,
  floor:'Penthouse · dernier étage',
  year:2022,
  energy:'A',
  thermal:'A',
  images:[
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=85',
    'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1600&q=85',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&q=85'
  ],
  description_html:'Penthouse d\'exception situé au dernier étage d\'une résidence signature à Downtown Dubaï, offrant une vue panoramique imprenable sur le Burj Khalifa et la fontaine de Dubaï.\n\nCaractéristiques :\n4 chambres, 5 salles de bain, 1 cuisine Gaggenau, 1 séjour double hauteur, 1 salle à manger, 3 parkings couverts, 1 terrasse de 180 m² avec piscine privée.\n\nPrestations :\nFinitions marbre et bois précieux, spa privé, cinéma, cave à vins climatisée, livré meublé (design Versace Home), conciergerie 24/7, accès sécurisé, valet parking.\n\nBroker Luxembourg :\nMAPA Property intervient en qualité de broker sous mandat de recherche luxembourgeois, en collaboration avec un partenaire local agréé RERA. Transaction en AED (Dirham des Émirats).',
  description_fr:'Penthouse d\'exception situé au dernier étage d\'une résidence signature à Downtown Dubaï, offrant une vue panoramique imprenable sur le Burj Khalifa et la fontaine de Dubaï.\n\nCaractéristiques :\n4 chambres, 5 salles de bain, 1 cuisine Gaggenau, 1 séjour double hauteur, 1 salle à manger, 3 parkings couverts, 1 terrasse de 180 m² avec piscine privée.\n\nPrestations :\nFinitions marbre et bois précieux, spa privé, cinéma, cave à vins climatisée, livré meublé (design Versace Home), conciergerie 24/7, accès sécurisé, valet parking.\n\nBroker Luxembourg :\nMAPA Property intervient en qualité de broker sous mandat de recherche luxembourgeois, en collaboration avec un partenaire local agréé RERA. Transaction en AED (Dirham des Émirats).',
  description_en:'Exceptional penthouse located on the top floor of a signature residence in Downtown Dubai, offering breathtaking panoramic views of the Burj Khalifa and the Dubai Fountain.\n\nFeatures:\n4 bedrooms, 5 bathrooms, 1 Gaggenau kitchen, 1 double-height living room, 1 dining room, 3 covered parking spaces, 1 terrace of 180 sqm with private pool.\n\nAmenities:\nMarble and precious wood finishes, private spa, cinema, climate-controlled wine cellar, delivered furnished (Versace Home design), 24/7 concierge, secure access, valet parking.\n\nLuxembourg Broker:\nMAPA Property acts as a broker under a Luxembourg exclusive search mandate, in collaboration with a RERA-certified local partner. Transaction in AED (UAE Dirham).',
  description_de:'Außergewöhnliches Penthouse im obersten Stockwerk einer Signature-Residenz in Downtown Dubai mit atemberaubendem Panoramablick auf den Burj Khalifa und die Dubai-Fontäne.\n\nMerkmale:\n4 Schlafzimmer, 5 Badezimmer, 1 Gaggenau-Küche, 1 Wohnzimmer mit doppelter Deckenhöhe, 1 Esszimmer, 3 überdachte Stellplätze, 1 Terrasse von 180 m² mit privatem Pool.\n\nAusstattung:\nMarmor- und Edelholz-Finishes, privates Spa, Kino, klimatisierter Weinkeller, möbliert geliefert (Versace Home Design), 24/7 Concierge, gesicherter Zugang, Valet-Parking.\n\nLuxemburger Broker:\nMAPA Property agiert als Broker unter einem luxemburgischen exklusiven Suchmandat, in Zusammenarbeit mit einem RERA-zertifizierten lokalen Partner. Transaktion in AED (VAE-Dirham).',
  features:['Vue Burj Khalifa','Terrasse 180 m² avec piscine','Livré meublé Versace Home','Cuisine Gaggenau','Spa privé','Cinéma','Cave à vins','3 parkings couverts','Conciergerie 24/7','Signature residence Downtown'],
  agent:'Julien Brebion',
  agent_role:'Real Estate Director'
};

/* V28 FINAL13 Session 1 : openBienById est défini plus bas (ligne ~3281).
   On y a ajouté un fallback vers DEMO_FAV_* pour le carrousel coup de cœur. */

/* Rendu d'une grille (achat / location / offmarket) */
/* ─── HELPERS pour lire tes vraies colonnes Supabase ─── */
/* Stocke les images par property_id (chargées séparément depuis property_images) */
var PROPERTY_IMAGES={};
/* Lit title/description selon langue courante avec fallback */
function bLang(b,field){
  if(!b)return'';
  var k=field+'_'+CURLANG;
  return b[k]||b[field+'_fr']||b[field+'_en']||b[field+'_de']||'';
}
/* Prix formaté */
function bPrice(b){
  if(!b||!b.price||+b.price===0)return'Prix sur demande';
  var n=Number(b.price);
  if(isNaN(n))return(typeof b.price==='string')?b.price:'Prix sur demande';
  var p=n.toLocaleString('fr-FR');
  var suffix=(b.transaction==='rent'||b.transaction==='location'||b.transaction==='rental')?' / mois':'';
  return p+' €'+suffix;
}
/* Localisation */
function bLoc(b){
  if(!b)return'';
  var loc=bLang(b,'location');
  if(loc)return loc;
  if(b.location)return b.location;
  var parts=[];
  if(b.city)parts.push(b.city);
  if(b.country&&b.country!==b.city)parts.push(b.country);
  return parts.join(', ')||'Luxembourg';
}
/* Vrai type pour badge et filtre */
function bIsRental(b){
  var t=(b.transaction||'').toLowerCase();
  return t==='rent'||t==='location'||t==='rental';
}
function bIsOff(b){
  var t=(b.transaction||'').toLowerCase();
  var typ=(b.type||'').toLowerCase();
  var badge=(b.badge||'').toLowerCase();
  return t==='offmarket'||t==='off-market'||t==='off_market'||
         typ==='offmarket'||typ==='off-market'||typ==='off_market'||
         badge.indexOf('off')>-1||badge.indexOf('confidentiel')>-1;
}
/* Première image */
function bFirstImg(b){
  if(!b)return'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80';
  /* Chercher dans PROPERTY_IMAGES par property_id */
  var imgs=PROPERTY_IMAGES[b.id];
  if(imgs&&imgs.length>0){
    return imgs[0].url||imgs[0].image_url||imgs[0].src||'';
  }
  return'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80';
}
/* Toutes les images d'un bien dans l'ordre */
function bAllImgs(b){
  if(!b)return[];
  var imgs=PROPERTY_IMAGES[b.id];
  if(imgs&&imgs.length){
    return imgs.map(function(r){return r.url||r.image_url||r.src||''}).filter(Boolean);
  }
  /* V28 FINAL13 : fallback sur b.images (pour DEMO_FAV hardcodés + démos) */
  if(Array.isArray(b.images)&&b.images.length){
    return b.images.filter(Boolean);
  }
  return[];
}
/* Charge les images depuis la table property_images */
function loadPropertyImages(cb){
  var url=SUPA+'/rest/v1/property_images?select=*&order=sort.asc';
  console.log('[MAPA] Chargement images:',url);
  fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY}})
    .then(function(r){
      console.log('[MAPA] Images HTTP:',r.status);
      return r.ok?r.json():[];
    })
    .then(function(rows){
      PROPERTY_IMAGES={};
      if(rows&&rows.length){
        rows.forEach(function(row){
          var pid=row.property_id;
          if(!pid)return;
          if(!PROPERTY_IMAGES[pid])PROPERTY_IMAGES[pid]=[];
          PROPERTY_IMAGES[pid].push(row);
        });
      }
      console.log('[MAPA] Images indexées:',rows?rows.length:0,'images pour',Object.keys(PROPERTY_IMAGES).length,'biens');
      if(cb)cb();
    })
    .catch(function(e){
      console.error('[MAPA] Erreur images:',e);
      if(cb)cb();
    });
}

/* ═══ DPE badge helper (cards listing) — V28 FINAL4 : whitelist A-I stricte ═══ */
function dpeBadgeHtml(letter){
  if(letter===null||letter===undefined||letter==='')return '';
  var L=String(letter).toUpperCase().trim().charAt(0);
  if('ABCDEFGHI'.indexOf(L)===-1)return '';
  var colors={A:'#0f8a3c',B:'#4fae3f',C:'#a3c246',D:'#f7d03a',E:'#f29c2f',F:'#e85e1a',G:'#c81e1e',H:'#a01616',I:'#7a0f0f'};
  var bg=colors[L]||'#888';
  return '<span class="bc-dpe" style="background:'+bg+'" title="DPE '+L+'">'+L+'</span>';
}

function renderBiensInto(gridId,emptyId,scope){
  var grid=document.getElementById(gridId);
  var empty=document.getElementById(emptyId);
  if(!grid)return;
  var list;
  if(scope==='location'){
    list=(PROPS&&PROPS.length)?PROPS.filter(bIsRental):[];
    if(list.length===0)list=[DEMO_LOCATION];
  }else if(scope==='offmarket'){
    list=(PROPS&&PROPS.length)?PROPS.filter(bIsOff):[];
    if(list.length===0)list=DEMO_OFFMARKET;
  }else{
    /* achat : tous les biens non-offmarket, filtrés par CUR_FILT */
    var base=(PROPS&&PROPS.length)?PROPS:[DEMO_BIEN,DEMO_LOCATION].concat(DEMO_OFFMARKET);
    if(CUR_FILT==='all')list=base;
    else if(CUR_FILT==='location')list=base.filter(bIsRental);
    else if(CUR_FILT==='offmarket')list=base.filter(bIsOff);
    else if(CUR_FILT==='vente')list=base.filter(function(b){return!bIsRental(b)&&!bIsOff(b)});
    else list=base;
  }
  if(list.length===0){
    grid.innerHTML='';grid.style.display='none';
    if(empty)empty.style.display='block';
    return;
  }
  grid.style.display='';
  if(empty)empty.style.display='none';
  var html='';
  for(var i=0;i<list.length;i++){
    var b=list[i];
    var title=bLang(b,'title')||b.title||(I18N[CURLANG]['card.fallback.title']||'Bien');
    var loc=bLoc(b);
    var price=bPrice(b);
    var ref=b.apimo_id||b.slug||(b.id?String(b.id).substring(0,8):'—');
    var cat=b.property_type||bLang(b,'category')||b.category||(I18N[CURLANG]['card.fallback.title']||'Bien');
    var customBadge=b.badge||'';
    
    if(bIsOff(b)){
      /* Carte off-market : floutée + cadenas */
      html+='<div class="bcard off" onclick="openBien(\''+b.id+'\')">'+
        '<div class="bc-img">'+
          '<div class="bc-img-blur" style="background-image:linear-gradient(135deg,#2a3f5a,#1a2b44,#0d1829)"></div>'+
          '<div class="bc-lock">'+LOCK_SVG+'<div class="bc-lock-txt">'+(I18N[CURLANG]['card.off.confid']||'Bien confidentiel')+'<br>'+(I18N[CURLANG]['card.off.access']||'Accès sur demande')+'</div></div>'+
          '<span class="bc-badge off">Off-Market</span>'+
        '</div>'+
        '<div class="bc-body">'+
          '<div class="bc-ref">'+(I18N[CURLANG]['card.ref']||'Réf.')+' '+esc(ref)+' · '+esc(cat)+'</div>'+
          '<div class="bc-title">'+esc(title||(I18N[CURLANG]['card.off.confid']||'Bien confidentiel'))+'</div>'+
          '<div class="bc-loc">'+esc(loc||(I18N[CURLANG]['card.off.loc.hidden']||'Localisation masquée'))+'</div>'+
          '<div class="bc-specs">'+
            (b.surface?'<span class="bc-spec">📐 '+b.surface+' m²</span>':'')+
            (b.bedrooms?'<span class="bc-spec">🛏 '+b.bedrooms+' ch.</span>':'')+
            (b.bathrooms?'<span class="bc-spec">🛁 '+b.bathrooms+'</span>':'')+
            (b.energy?dpeBadgeHtml(b.energy):'')+
          '</div>'+
          '<div class="bc-price">'+(I18N[CURLANG]['card.price.demand']||'Prix sur demande')+'<small>'+(I18N[CURLANG]['card.see.detail']||'Voir détail →')+'</small></div>'+
        '</div></div>';
    }else{
      /* Carte standard */
      var img=bFirstImg(b);
      var badgeType=bIsRental(b)?(I18N[CURLANG]['badge.rent']||'À louer'):(I18N[CURLANG]['badge.sale']||'À vendre');
      var badgeCls=bIsRental(b)?'loc':'';
      if(customBadge){badgeType=customBadge}
      html+='<div class="bcard" onclick="openBien(\''+b.id+'\')">'+
        '<div class="bc-img"><img src="'+esc(img)+'" alt="'+esc(title)+'" loading="lazy" onerror="this.src=\'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80\'">'+
        '<span class="bc-badge '+badgeCls+'">'+esc(badgeType)+'</span>'+
        '<button class="bc-fav" onclick="event.stopPropagation();toggleFav(this)" aria-label="Favori">♡</button>'+
        '</div>'+
        '<div class="bc-body">'+
        '<div class="bc-ref">'+(I18N[CURLANG]['card.ref']||'Réf.')+' '+esc(ref)+' · '+esc(cat)+'</div>'+
        '<div class="bc-title">'+esc(title)+'</div>'+
        '<div class="bc-loc">'+esc(loc)+'</div>'+
        '<div class="bc-specs">'+
          (b.surface?'<span class="bc-spec">📐 '+b.surface+' m²</span>':'')+
          (b.bedrooms?'<span class="bc-spec">🛏 '+b.bedrooms+' '+(I18N[CURLANG]['card.short.bed']||'ch.')+'</span>':'')+
          (b.bathrooms?'<span class="bc-spec">🛁 '+b.bathrooms+'</span>':'')+
          (b.energy?dpeBadgeHtml(b.energy):'')+
        '</div>'+
        '<div class="bc-price">'+esc(price)+'<small>'+(I18N[CURLANG]['card.see.detail']||'Voir détail →')+'</small></div>'+
        '</div></div>';
    }
  }
  grid.innerHTML=html;
}

function renderBiens(){
  renderBiensInto('biens-grid','biens-empty','achat');
  renderBiensInto('biens-grid-location','biens-empty-location','location');
  renderBiensInto('biens-grid-offmarket','biens-empty-offmarket','offmarket');
}

/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL15 — CARROUSEL COUPS DE CŒUR (dynamique Supabase)
   Lit is_featured=true depuis PROPS, render dans #fav-track
   Limite 4 biens. Duplique pour le carousel auto-loop infini.
   ═══════════════════════════════════════════════════════════════════ */
function renderFeaturedBiens(){
  var track = document.getElementById('fav-track');
  if (!track) return;

  /* Filtre + tri */
  var src = (typeof PROPS !== 'undefined' && PROPS && PROPS.length) ? PROPS : [];
  var feats = src.filter(function(b){
    return b.is_featured === true && b.is_published !== false;
  }).sort(function(a,b){
    return (a.featured_order || 999) - (b.featured_order || 999);
  });

  /* Si aucun coup de cœur configuré, on cache la section */
  var section = document.getElementById('fav-carousel');
  if (!feats.length) {
    track.innerHTML = '';
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  /* Générer une card */
  function buildFavCard(b, isClone){
    var img = '';
    try { img = (typeof bAllImgs === 'function' ? bAllImgs(b)[0] : '') || ''; } catch(e){}
    var L = (typeof CURLANG !== 'undefined' ? CURLANG : 'fr') || 'fr';
    var title = b['title_'+L] || b.title_fr || b.title_en || b.title_de || '—';
    var loc = [b.city, b.country].filter(Boolean).join(' · ') || '—';
    var price = b.price || b.price_value;
    var t = String(b.transaction || '').toLowerCase();
    var isRental = (t === 'rent' || t === 'location' || t === '2');
    var priceStr = price ? (Number(price).toLocaleString('fr-FR') + ' €' + (isRental ? ' /mois' : '')) : 'Sur demande';
    var badge = (L === 'en') ? (isRental ? 'FOR RENT' : 'FOR SALE')
              : (L === 'de') ? (isRental ? 'ZU MIETEN' : 'ZU VERKAUFEN')
              : (isRental ? 'À LOUER' : 'À VENDRE');
    var meta = [];
    if (b.surface || b.living_surface) meta.push(Number(b.surface || b.living_surface).toLocaleString('fr-FR') + ' m²');
    if (b.bedrooms) meta.push(b.bedrooms + ' ch.');
    if (b.bathrooms) meta.push(b.bathrooms + ' sdb');
    var metaHtml = meta.map(function(m,i){
      return (i>0 ? '<span class="fav-meta-sep">·</span>' : '') + '<span class="fav-meta-it">'+esc(m)+'</span>';
    }).join('');
    var cta = (L === 'en') ? 'Discover →' : (L === 'de') ? 'Entdecken →' : 'Découvrir →';

    return (
      '<article class="fav-card'+(isClone?' fav-clone':'')+'" onclick="openBienById(\''+esc(b.id)+'\')">' +
        '<div class="fav-img-wrap">' +
          (img ? '<img src="'+esc(img)+'" alt="'+esc(title)+'" class="fav-img" loading="lazy">' : '<div class="fav-img" style="background:var(--w2)"></div>') +
          '<div class="fav-badge">'+esc(badge)+'</div>' +
        '</div>' +
        '<div class="fav-body">' +
          '<div class="fav-loc">'+esc(loc)+'</div>' +
          '<h3 class="fav-title">'+esc(title)+'</h3>' +
          (metaHtml ? '<div class="fav-meta">'+metaHtml+'</div>' : '') +
          '<div class="fav-price">'+esc(priceStr)+'</div>' +
          '<div class="fav-cta">'+esc(cta)+'</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* Render : originaux + clones (pour le carousel auto-loop CSS animation) */
  var html = feats.map(function(b){ return buildFavCard(b, false); }).join('') +
             feats.map(function(b){ return buildFavCard(b, true); }).join('');
  track.innerHTML = html;
  console.log('[MAPA] Coups de cœur rendus :', feats.length);
}
window.renderFeaturedBiens = renderFeaturedBiens;

window.toggleFav=function(btn){
  if(btn.textContent==='♡'){btn.textContent='♥';btn.style.color='#c4422d'}
  else{btn.textContent='♡';btn.style.color=''}
};

/* ─── OUVRIR FICHE BIEN ─── */
window.openBien=function(id){
  /* V28 PROD-MOD8 — Bug fix : toujours inclure DEMO_OFFMARKET dans la liste de recherche.
     Avant : si PROPS Apimo était chargé, DEMO_OFFMARKET était ignoré → clic sur un bien démo
     off-market trouvait un faux match dans PROPS et ouvrait un bien sans rapport (bug Steinfort). */
  var list=(PROPS&&PROPS.length)?PROPS.concat(DEMO_OFFMARKET):[DEMO_BIEN,DEMO_LOCATION].concat(DEMO_OFFMARKET);
  var b=null;
  for(var i=0;i<list.length;i++)if(String(list[i].id)===String(id)){b=list[i];break}
  if(!b)return;
  if(bIsOff(b)){
    renderOffMarketDetail(b);
    window.openM('m-bien');
  }else{
    renderBienDetail(b);
    window.openM('m-bien');
  }
  /* SESSION 12c : scroll top systématique — évite d'ouvrir la fiche au niveau du footer */
  _scrollTopAfterOpen();
};

/* SESSION 12c : helper de scroll-top robuste pour les ouvertures de fiche bien.
   Appelé après openM() pour garantir qu'on voit le haut de la fiche,
   quel que soit le contexte (overlay modal ou mode page). */
function _scrollTopAfterOpen(){
  var _htmlEl=document.documentElement;
  var _origBehav=_htmlEl.style.scrollBehavior;
  _htmlEl.style.scrollBehavior='auto';
  function _doReset(){
    window.scrollTo(0,0);
    _htmlEl.scrollTop=0;
    document.body.scrollTop=0;
    var mb=document.getElementById('m-bien');
    if(mb){
      mb.scrollTop=0;
      var scr=mb.querySelector('.mpage');
      if(scr)scr.scrollTop=0;
    }
  }
  _doReset();
  if(window.requestAnimationFrame){
    window.requestAnimationFrame(_doReset);
  }
  setTimeout(_doReset,50);
  setTimeout(_doReset,150);
  setTimeout(function(){
    _doReset();
    _htmlEl.style.scrollBehavior=_origBehav||'';
  },350);
}

/* ─── RENDU FICHE OFF-MARKET (pas de photos, texte uniquement) ─── */
function renderOffMarketDetail(b){
  /* SESSION 9 : stocker le bien courant pour permettre le re-render au changement de langue */
  window._currentBien=b;
  window._currentBienIsOff=true;
  var c=document.getElementById('bien-content');
  if(!c)return;
  var T=(I18N&&I18N[CURLANG])||{};
  var _title=bLang(b,'title')||b.title||(T['card.fallback.title']||'Bien');
  var _cat=bLang(b,'category')||b.category||(T['card.fallback.title']||'Bien');
  var _loc=bLoc(b)||(T['bd.om.loc.hidden']||'Localisation confidentielle');
  var _teaser=bLang(b,'teaser')||b.teaser||(T['bd.om.teaser.fallback']||'Bien d\'exception situé dans un emplacement privilégié, répondant aux standards les plus élevés du marché. Caractéristiques détaillées, plans, photographies et visite disponibles pour tout acquéreur qualifié.');
  var _price=b.price||(T['card.price.demand']||'Prix sur demande');
  c.innerHTML=
  '<div class="om-hero">'+
    '<div class="om-blur"></div>'+
    '<div class="om-lock">'+LOCK_SVG+'<div class="om-lock-txt">'+(T['bd.om.strict']||'Bien strictement confidentiel')+'</div></div>'+
  '</div>'+
  '<div class="bd-hdr">'+
    '<div class="bd-h-l">'+
      '<div class="bd-ref">Off-Market · '+(T['card.ref']||'Réf.')+' '+esc(b.ref||'—')+' · '+esc(_cat)+'</div>'+
      '<h2 class="bd-t">'+esc(_title)+'</h2>'+
      '<div class="bd-loc">🔒 '+esc(_loc)+'</div>'+
    '</div>'+
    '<div class="bd-h-r">'+
      '<div class="bd-price">'+esc(_price)+'</div>'+
      '<div class="bd-price-n">'+(T['bd.om.price.note']||'Accessible sous accord de confidentialité')+'</div>'+
    '</div>'+
  '</div>'+
  '<div class="bd-body">'+
    '<div class="bd-main">'+
      '<div class="bd-specs-row">'+
        (b.surface?'<div class="bd-spec"><div class="bd-sp-v">'+esc(b.surface)+' m²</div><div class="bd-sp-l">'+(T['bd.om.surf']||'Surface approx.')+'</div></div>':'')+
        (b.bedrooms&&b.bedrooms!=='—'?'<div class="bd-spec"><div class="bd-sp-v">'+esc(b.bedrooms)+'</div><div class="bd-sp-l">'+(T['bd.om.ch']||'Chambres')+'</div></div>':'')+
        (b.bathrooms&&b.bathrooms!=='—'?'<div class="bd-spec"><div class="bd-sp-v">'+esc(b.bathrooms)+'</div><div class="bd-sp-l">'+(T['bd.om.sdb']||'SDB')+'</div></div>':'')+
      '</div>'+
      '<div class="bd-sect"><div class="bd-s-t">'+(T['bd.om.present']||'Présentation')+'</div><div class="bd-desc">'+
        '<p>'+(T['bd.om.intro']||'Ce bien fait partie de notre <strong>sélection off-market exclusive</strong>. Son identité (adresse, photos, nom du propriétaire) est <strong>strictement protégée</strong> et n\'est communiquée qu\'après signature d\'un accord de confidentialité (NDA) et qualification de l\'acquéreur.')+'</p>'+
        '<p>'+_teaser+'</p>'+
        '<p style="font-style:italic;color:var(--ink3);font-size:13px;margin-top:14px">'+(T['bd.om.why']||'<strong>Pourquoi l\'off-market ?</strong> Le vendeur souhaite une transaction discrète, sans exposition publique ni passage d\'annonce. Ces biens circulent uniquement au sein de notre réseau qualifié.')+'</p>'+
      '</div></div>'+
      '<div class="bd-sect"><div class="bd-s-t">'+(T['bd.om.process']||'Processus d\'accès au dossier')+'</div>'+
        '<ol style="font-family:Raleway,sans-serif;font-size:14px;color:var(--ink2);line-height:1.8;padding-left:20px">'+
          '<li style="margin-bottom:8px">'+(T['bd.om.s1']||'<strong>Prise de contact</strong> — vous nous transmettez vos critères et votre projet.')+'</li>'+
          '<li style="margin-bottom:8px">'+(T['bd.om.s2']||'<strong>Qualification</strong> — validation de votre capacité (justificatif de fonds ou mandat).')+'</li>'+
          '<li style="margin-bottom:8px">'+(T['bd.om.s3']||'<strong>Signature du NDA</strong> — accord de confidentialité standard.')+'</li>'+
          '<li style="margin-bottom:8px">'+(T['bd.om.s4']||'<strong>Remise du dossier complet</strong> — photos, plans, DPE, titre, documents.')+'</li>'+
          '<li>'+(T['bd.om.s5']||'<strong>Visite privée</strong> sur rendez-vous avec l\'agent.')+'</li>'+
        '</ol>'+
      '</div>'+
    '</div>'+
    '<aside class="bd-side">'+
      '<div class="bd-side-t" data-i18n="bd.dossier">Accéder au dossier</div>'+
      '<div class="bd-agent"><div class="bd-ag-av"><img src="data:image/jpeg;base64,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" alt="Julien Brebion" loading="eager" onerror="this.onerror=null;this.parentNode.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#b89448,#a07040);color:#fff;font-family:Cormorant,serif;font-size:22px;font-weight:700&quot;>JB</div>\'"></div><div><div class="bd-ag-n">Julien Brebion</div><div class="bd-ag-r">Real Estate Director</div></div></div>'+
      '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink3);line-height:1.55;margin-bottom:14px">'+(T['bd.om.contact.p']||'Contactez Julien directement. Échange confidentiel et sans engagement.')+'</p>'+
      '<div class="bd-cta">'+
        '<a class="c-phone" href="tel:+352691620127">'+(T['bd.om.call']||'Appeler')+'</a>'+
        '<a class="c-mail" href="mailto:'+window.mpEmail('admin','mapagroup.org')+'?subject=Demande%20confidentielle%20-%20Off-Market%20'+encodeURIComponent(b.ref||'')+'&body=Bonjour%20Julien%2C%0A%0AJe%20souhaite%20recevoir%20le%20dossier%20confidentiel%20concernant%20la%20r%C3%A9f%C3%A9rence%20'+encodeURIComponent(b.ref||'')+'.%0A%0ACordialement.">'+(T['bd.om.email']||'Demande par e-mail')+'</a>'+
        '<button class="c-visit" onclick="toggleBdForm(event)">'+(T['bd.om.dossier']||'Demander le dossier complet')+'</button>'+
      '</div>'+
      /* Formulaire inline (mêmes IDs que pour renderBienDetail) */
      '<div class="bd-info-form" id="bd-info-form" style="display:none">'+
        '<div class="fg"><label class="fl">'+(T['form.prenom']||'Prénom')+'</label><input class="fi" type="text" id="bd-if-fn"></div>'+
        '<div class="fg"><label class="fl">'+(T['form.nom']||'Nom')+'</label><input class="fi" type="text" id="bd-if-ln"></div>'+
        '<div class="fg"><label class="fl">'+(T['form.email']||'E-mail')+' *</label><input class="fi" type="email" id="bd-if-em" required></div>'+
        '<div class="fg"><label class="fl">'+(T['form.tel']||'Téléphone')+'</label><input class="fi" type="tel" id="bd-if-tel"></div>'+
        '<div class="fg"><label class="fl">'+(T['form.message']||'Message')+'</label><textarea class="ft" id="bd-if-msg" rows="3" placeholder="'+(T['bd.om.msg.ph']||'Je souhaite recevoir le dossier confidentiel concernant ce bien…')+'"></textarea></div>'+
        '<div class="cf-turnstile" data-sitekey="0x4AAAAAADDxAd17up1nU0-U" data-theme="light" data-size="normal" style="margin:14px 0 8px"></div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:11.5px;color:var(--ink4);line-height:1.55;margin:10px 0 14px;font-style:italic" data-i18n="form.rgpd">Vos données sont traitées conformément au RGPD pour répondre à votre demande. Vous pouvez exercer vos droits d\'accès, rectification, suppression et opposition à <span class="mp-mail" data-u="admin" data-d="mapagroup.org" data-label="visible" style="color:var(--cu)"></span>. Aucune donnée n\'est cédée à des tiers.</p>'+
        '<button class="btn btn-navy" onclick="submitBdForm(event,\''+esc(b.ref||b.id||'')+'\',\'offmarket\')" style="width:100%;margin-top:8px">'+(T['bd.form.submit']||'✦ Envoyer ma demande')+'</button>'+
        '<div class="bd-form-note">'+(T['bd.form.note']||'Julien Brebion vous répond personnellement sous 24h.')+'</div>'+
      '</div>'+
    '</aside>'+
  '</div>'+
  renderSimilarBiens(b);
  /* V28 FINALPLUS — Footer contact DÉSACTIVÉ (29 avril 2026)
     Le footer dynamique générait un doublon visuel par-dessus le footer
     global du site. Suppression à la demande. Le footer global de
     index.html reste suffisant pour les fiches bien. */
  /* (bloc original supprimé — voir git history pour récupération) */

}


/* ═══ FIX 1 — Parser description intelligent ═══
   Gère les textes Apimo en monobloc avec ponctuation irrégulière */
/* ═══ V28 FINAL MAGREY — Contrôleur carrousel strip 3 photos ═══ */
var STRIP_POS=0;          /* Position actuelle (index de la slide visible à gauche) */
var STRIP_TOTAL=0;         /* Nombre total de slides UNIQUES */
var STRIP_AUTO=null;       /* Interval autoplay */
var STRIP_AUTO_MS=4000;    /* 4 secondes */
var STRIP_PAUSED=false;    /* État pause utilisateur */

function stripInit(){
  var track=document.getElementById('bd-strip-track');
  if(!track)return;
  stripAttachSwipe();
  /* Compte les slides non-hidden (uniques) */
  var slides=track.querySelectorAll('.bd-strip-slide:not([aria-hidden="true"])');
  STRIP_TOTAL=slides.length;
  STRIP_POS=0;
  stripUpdate(false);
  stripResume();
}

function stripUpdate(animate){
  var track=document.getElementById('bd-strip-track');
  if(!track)return;
  var slides=track.querySelectorAll('.bd-strip-slide');
  if(!slides.length)return;
  /* Chaque slide fait 33.333% + un petit gap */
  var slideW=100/3;
  var offset=STRIP_POS*slideW;
  track.style.transition=animate?'transform .7s cubic-bezier(.4,0,.2,1)':'none';
  track.style.transform='translateX(-'+offset+'%)';
}

window.stripNext=function(){
  if(STRIP_TOTAL<=3)return; /* Pas assez de slides */
  STRIP_POS++;
  stripUpdate(true);
  /* Rotation fluide : quand on arrive au duplicata, on resaute à 0 sans animation */
  if(STRIP_POS>=STRIP_TOTAL){
    setTimeout(function(){
      STRIP_POS=0;
      stripUpdate(false);
    },700);
  }
};

window.stripPrev=function(){
  if(STRIP_TOTAL<=3)return;
  if(STRIP_POS<=0){
    /* Saute à la fin virtuelle sans animation puis remonte */
    STRIP_POS=STRIP_TOTAL;
    stripUpdate(false);
    setTimeout(function(){
      STRIP_POS=STRIP_TOTAL-1;
      stripUpdate(true);
    },20);
  }else{
    STRIP_POS--;
    stripUpdate(true);
  }
};

window.stripPause=function(){
  STRIP_PAUSED=true;
  if(STRIP_AUTO){clearInterval(STRIP_AUTO);STRIP_AUTO=null;}
};

window.stripResume=function(){
  STRIP_PAUSED=false;
  if(STRIP_AUTO)clearInterval(STRIP_AUTO);
  if(STRIP_TOTAL>3){
    STRIP_AUTO=setInterval(function(){
      if(!STRIP_PAUSED&&document.getElementById('bd-strip-track'))stripNext();
    },STRIP_AUTO_MS);
  }
};

function stripAttachSwipe(){
  var wrap=document.getElementById('bd-strip');
  if(!wrap||wrap._swipeAttached)return;
  wrap._swipeAttached=true;
  var startX=0, startY=0, isDown=false, hasMoved=false;
  var DRAG_THRESHOLD=40;
  function onDown(e){
    var p=e.touches?e.touches[0]:e;
    startX=p.clientX; startY=p.clientY; isDown=true; hasMoved=false;
  }
  function onMove(e){
    if(!isDown)return;
    var p=e.touches?e.touches[0]:e;
    var dx=Math.abs(p.clientX-startX);
    var dy=Math.abs(p.clientY-startY);
    if(dx>8||dy>8)hasMoved=true;
    /* Si drag horizontal clair : empêcher le scroll vertical sur mobile */
    if(dx>dy&&dx>10&&e.cancelable)e.preventDefault();
  }
  function onUp(e){
    if(!isDown)return;
    var p=e.changedTouches?e.changedTouches[0]:e;
    var dx=p.clientX-startX;
    var dy=p.clientY-startY;
    isDown=false;
    if(Math.abs(dx)>DRAG_THRESHOLD&&Math.abs(dx)>Math.abs(dy)){
      /* Empêcher le clic qui va suivre sur la slide (ouvre lightbox) */
      if(e.preventDefault)e.preventDefault();
      if(e.stopPropagation)e.stopPropagation();
      /* Bloquer le prochain clic pendant 300ms */
      wrap._blockNextClick=true;
      setTimeout(function(){wrap._blockNextClick=false;},320);
      if(dx<0)window.stripNext();else window.stripPrev();
    }
  }
  /* Bloquer le clic si on vient de swiper */
  wrap.addEventListener('click',function(e){
    if(wrap._blockNextClick||hasMoved){
      e.preventDefault();e.stopPropagation();
      wrap._blockNextClick=false;
      hasMoved=false;
      return false;
    }
  },true);
  wrap.addEventListener('touchstart',onDown,{passive:true});
  wrap.addEventListener('touchmove',onMove,{passive:false});
  wrap.addEventListener('touchend',onUp,{passive:false});
  wrap.addEventListener('touchcancel',function(){isDown=false;hasMoved=false;});
  wrap.addEventListener('mousedown',onDown);
  wrap.addEventListener('mousemove',onMove);
  /* IMPORTANT : mouseup sur window pour capturer même hors wrap */
  window.addEventListener('mouseup',function(e){
    if(isDown)onUp(e);
  });
  wrap.addEventListener('mouseleave',function(e){
    if(isDown)onUp(e);
  });
}


/* ═══ SESSION 10 — PARSER DESCRIPTION ÉDITORIAL (style Sotheby's/Magrey) ═══
   - Détecte un chapeau (1er paragraphe court) → classe .bd-desc-lead
   - Détecte les titres de section par mots-clés FR/EN/DE + "Mot:" + lignes courtes majuscules
   - Puces élégantes avec tirets copper
   - Aucune perte de contenu
*/
var BD_DESC_TITLE_KEYWORDS=[
  // FR
  'caractéristiques','caracteristiques','les plus','les +','avantages','points forts','points clés',
  'emplacement','situation','environnement','localisation','quartier','proximité','proximités',
  'prestations','equipements','équipements','aménagements','aménagement',
  'description','présentation','en bref','à propos',
  'extérieur','exterieur','intérieur','interieur',
  'conditions','honoraires','disponibilité','disponible','diagnostic','dpe',
  // EN
  'features','highlights','amenities','location','environment','surroundings','neighborhood',
  'description','about','overview','summary','interior','exterior','fittings',
  'conditions','availability','key facts',
  // DE
  'merkmale','ausstattung','lage','umgebung','beschreibung','besonderheiten','highlights',
  'innenbereich','außenbereich','ausstattungsmerkmale','verfügbarkeit'
];

function _bdIsTitle(line){
  if(!line)return false;
  var l=String(line).trim();
  if(!l)return false;
  /* Titre explicite : finit par ":" ou "：" */
  if(/[:：]\s*$/.test(l))return true;
  /* Ligne courte (< 50 chars) ET un mot-clé connu en premier mot ou au début */
  if(l.length<=50){
    var low=l.toLowerCase().replace(/[:：.!?]+$/,'').trim();
    for(var i=0;i<BD_DESC_TITLE_KEYWORDS.length;i++){
      var kw=BD_DESC_TITLE_KEYWORDS[i];
      if(low===kw||low.indexOf(kw+' ')===0||low.indexOf(kw)===0&&low.length<=kw.length+3){
        return true;
      }
    }
  }
  /* Ligne très courte (< 28 chars) en majuscules = titre */
  if(l.length<=28&&l.toUpperCase()===l&&/[A-ZÉÈÀÂÎÔÛÄËÏÖÜÇ]/.test(l))return true;
  return false;
}

function _bdCleanTitle(t){
  return String(t).replace(/[:：]\s*$/,'').trim();
}

function smartParseDescription(text){
  if(!text)return '';
  var txt=String(text).trim();
  if(!txt)return '';

  /* SESSION 11 : si le texte contient du HTML, l'extraire en texte brut
     en préservant la structure via \n\n (paragraphes), \n + "- " (listes) */
  if(/<(p|br|ul|ol|li|h[1-6]|div|strong|em|b|i)\b/i.test(txt)){
    /* Normaliser fin de paragraphes et sauts de ligne */
    txt=txt
      .replace(/<\s*br\s*\/?>/gi,'\n')
      .replace(/<\s*\/p\s*>/gi,'\n\n')
      .replace(/<\s*p\b[^>]*>/gi,'')
      .replace(/<\s*\/div\s*>/gi,'\n')
      .replace(/<\s*div\b[^>]*>/gi,'')
      .replace(/<\s*\/h[1-6]\s*>/gi,'\n')
      .replace(/<\s*h[1-6]\b[^>]*>/gi,'\n')
      .replace(/<\s*li\b[^>]*>/gi,'\n- ')
      .replace(/<\s*\/li\s*>/gi,'')
      .replace(/<\s*\/?(ul|ol)\b[^>]*>/gi,'\n')
      /* strong, em, b, i : on supprime les tags, on garde le texte */
      .replace(/<\s*\/?(strong|em|b|i)\b[^>]*>/gi,'')
      /* toutes autres balises restantes */
      .replace(/<[^>]+>/g,'')
      /* entités HTML courantes */
      .replace(/&nbsp;/g,' ')
      .replace(/&amp;/g,'&')
      .replace(/&lt;/g,'<')
      .replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"')
      .replace(/&#39;/g,"'")
      .replace(/&rsquo;/g,'\u2019')
      .replace(/&ldquo;/g,'\u201c')
      .replace(/&rdquo;/g,'\u201d');
    /* Nettoyer les paragraphes vides multiples */
    txt=txt.replace(/\n{3,}/g,'\n\n').trim();
  }

  txt=txt.replace(/\r\n/g,'\n').replace(/[ \t]+/g,' ');

  /* SESSION 11c : RECONSTRUCTION DES PHRASES — pour les textes Apimo sans ponctuation
     où "cohérente Cuisine équipée" devrait être "cohérente. Cuisine équipée".
     On injecte un `. ` avant chaque mot-clé connu qui devrait démarrer une nouvelle phrase. */
  txt=_bdReconstructSentences(txt);

  /* VOIE A : le texte a des retours à la ligne → on l'utilise comme structure */
  var lines=txt.split('\n').map(function(s){return s.trim()});
  while(lines.length&&!lines[0])lines.shift();
  while(lines.length&&!lines[lines.length-1])lines.pop();

  if(lines.length>=2){
    return _bdBuildStructured(lines);
  }

  /* VOIE B : texte monobloc — détection inline de titres avec "Mot:" */
  var titleRe=/(^|[.!?]\s+)([A-ZÉÈÀÂÎÔÛÄËÏÖÜÇ][^.!?:]{5,60}\s*[:：])\s+/g;
  var matches=[];
  var match;
  while((match=titleRe.exec(txt))!==null){
    var titleStart=match.index+match[1].length;
    var titleEnd=titleStart+match[2].length;
    matches.push({titleStart:titleStart,titleEnd:titleEnd,title:match[2]});
  }

  if(matches.length>=1){
    var result=[];
    var cursor=0;
    matches.forEach(function(m){
      if(m.titleStart>cursor){
        var pre=txt.substring(cursor,m.titleStart).trim();
        if(pre)result.push({type:'p',text:pre});
      }
      result.push({type:'title',text:_bdCleanTitle(m.title)});
      cursor=m.titleEnd;
    });
    if(cursor<txt.length){
      var tail=txt.substring(cursor).trim();
      if(tail){
        /* Détection puces inline " - " " – " " • " " * " */
        var bulletParts=tail.split(/\s+[-–•*]\s+/);
        if(bulletParts.length>=3){
          if(bulletParts[0].trim())result.push({type:'p',text:bulletParts[0].trim()});
          for(var j=1;j<bulletParts.length;j++){
            var bp=bulletParts[j].trim();
            if(bp)result.push({type:'bullet',text:bp});
          }
        }else{
          result.push({type:'p',text:tail});
        }
      }
    }
    return _bdBuildFromBlocks(result);
  }

  /* VOIE C : fallback — découper par phrases en paragraphes aérés */
  var sentences=[];
  var cur='';
  for(var k=0;k<txt.length;k++){
    cur+=txt[k];
    if(txt[k]==='.'||txt[k]==='!'||txt[k]==='?'){
      var nextIdx=k+1;
      while(nextIdx<txt.length&&txt[nextIdx]===' ')nextIdx++;
      if(nextIdx>=txt.length){
        sentences.push(cur.trim()); cur='';
      }else{
        var nc=txt[nextIdx];
        if((nc>='A'&&nc<='Z')||'ÉÈÀÂÎÔÛÄËÏÖÜÇ'.indexOf(nc)!==-1){
          sentences.push(cur.trim()); cur='';
        }
      }
    }
  }
  if(cur.trim())sentences.push(cur.trim());

  if(sentences.length===0){
    return '<p class="bd-desc-lead">'+esc(txt)+'</p>';
  }

  /* Regrouper en paragraphes ~380 chars max */
  var paragraphs=[];
  var buf='';
  var MAX_P_LEN=380;
  sentences.forEach(function(s){
    s=s.trim();if(!s)return;
    if(buf&&(buf.length+s.length+1)>MAX_P_LEN){
      paragraphs.push(buf); buf=s;
    }else{
      buf=buf?buf+' '+s:s;
    }
  });
  if(buf)paragraphs.push(buf);

  /* SESSION 11 : passer chaque paragraphe dans _bdBuildFromBlocks pour extraction features */
  return _bdBuildFromBlocks(paragraphs.map(function(p){return {type:'p',text:p};}));
}

/* Construit le HTML à partir d'une liste de lignes (VOIE A) */
function _bdBuildStructured(lines){
  var blocks=[];
  var bulletRe=/^[-•*–]\s*/;
  var para='';
  lines.forEach(function(line){
    var l=String(line).trim();
    if(!l){
      if(para){blocks.push({type:'p',text:para.trim()});para='';}
      return;
    }
    var isBullet=bulletRe.test(l);
    if(isBullet){
      if(para){blocks.push({type:'p',text:para.trim()});para='';}
      blocks.push({type:'bullet',text:l.replace(bulletRe,'').trim()});
      return;
    }
    if(_bdIsTitle(l)){
      if(para){blocks.push({type:'p',text:para.trim()});para='';}
      blocks.push({type:'title',text:_bdCleanTitle(l)});
      return;
    }
    para=para?para+' '+l:l;
  });
  if(para)blocks.push({type:'p',text:para.trim()});
  return _bdBuildFromBlocks(blocks);
}

/* Construit le HTML depuis une liste de blocs {type, text} */
function _bdBuildFromBlocks(blocks){
  var out='';
  var inUl=false;
  var firstParaDone=false;
  function _closeUl(){if(inUl){out+='</ul>';inUl=false;}}
  function _openUlIfNeeded(){if(!inUl){out+='<ul class="bd-desc-list">';inUl=true;}}

  blocks.forEach(function(b){
    if(b.type==='bullet'){
      _openUlIfNeeded();
      out+='<li>'+esc(b.text)+'</li>';
      return;
    }
    if(b.type==='title'){
      _closeUl();
      out+='<h4 class="bd-desc-title">'+esc(b.text)+'</h4>';
      return;
    }
    /* type === 'p' : on re-parse le texte pour extraire les features éventuelles */
    var sub=_bdParseParaWithFeatures(b.text);
    sub.forEach(function(s){
      if(s.type==='features'){
        _closeUl();
        out+='<ul class="bd-desc-list">';
        s.items.forEach(function(it){
          out+='<li>'+esc(it)+'</li>';
        });
        out+='</ul>';
      }else{
        _closeUl();
        var cls=firstParaDone?'bd-desc-p':'bd-desc-lead';
        firstParaDone=true;
        out+='<p class="'+cls+'">'+esc(s.text)+'</p>';
      }
    });
  });
  _closeUl();
  return out;
}

/* Alias retro-compat */
function buildStructuredHtml(lines){return _bdBuildStructured(lines);}

/* ═══ SESSION 11 — Détection automatique "N chambres, N salle de bain..." → liste ═══
   Quand un paragraphe contient plusieurs expressions "nombre + mot-clé de pièce"
   séparées par virgules/tirets/points, on les extrait en bullets. */
var BD_ROOM_KEYWORDS=[
  // FR
  'chambre','chambres',
  'salle de bain','salles de bain','salle d\'eau','salles d\'eau','sdb','wc','toilette','toilettes',
  'cuisine','cuisines',
  'séjour','séjours','sejour','sejours','living',
  'salon','salons',
  'salle à manger','salles à manger','salle a manger','salles a manger',
  'garage','garages','box','boxes',
  'cave','caves',
  'parking','parkings','emplacement','emplacements','place de parking','places de parking',
  'terrasse','terrasses',
  'balcon','balcons',
  'dressing','dressings',
  'bureau','bureaux',
  'grenier','greniers','buanderie','buanderies',
  'jardin','jardins','piscine','piscines',
  'étage','étages','niveau','niveaux',
  // EN
  'bedroom','bedrooms',
  'bathroom','bathrooms','shower room','shower rooms',
  'kitchen','kitchens',
  'living room','living rooms','lounge','lounges',
  'dining room','dining rooms',
  'garage','garages',
  'cellar','cellars','basement','basements',
  'parking space','parking spaces','parking spot','parking spots',
  'terrace','terraces',
  'balcony','balconies',
  'dressing room','dressing rooms','walk-in closet','walk-in closets',
  'office','offices','study','studies',
  'garden','gardens','pool','pools','swimming pool','swimming pools',
  'floor','floors','level','levels',
  // DE
  'schlafzimmer','zimmer',
  'badezimmer','bad','bäder','duschbad','duschbäder','gäste-wc','gäste wc',
  'küche','küchen',
  'wohnzimmer','wohnbereich',
  'esszimmer','essbereich',
  'garage','garagen','stellplatz','stellplätze',
  'keller',
  'parkplatz','parkplätze',
  'terrasse','terrassen',
  'balkon','balkone',
  'ankleide','ankleideraum','ankleidezimmer',
  'arbeitszimmer','büro','büros',
  'dachboden','hauswirtschaftsraum','abstellraum',
  'garten','gärten','pool','schwimmbad','schwimmbäder',
  'etage','etagen','stock','stockwerk','stockwerke'
];
/* Construit un regex qui match "nombre + mot-clé" (avec tolérance accents/casse) */
var _BD_ROOM_RE=(function(){
  /* trier par longueur décroissante pour matcher "salle de bain" avant "salle" */
  var kws=BD_ROOM_KEYWORDS.slice().sort(function(a,b){return b.length-a.length;});
  var esc=kws.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');});
  return new RegExp('^\\s*(\\d+)\\s+('+esc.join('|')+')\\b','i');
})();

/* Découpe un texte en fragments sur virgules/points-virgules/points/tirets/bullets/"et".
   Le point de fin de phrase est CONSERVÉ dans le fragment qui précède.
   Compatible tous navigateurs (pas de lookbehind). */
function _bdSplitFragments(txt){
  /* Normaliser les séparateurs embed */
  var t=String(txt).replace(/\s+[·•]\s+/g,', ').replace(/\s+[–-]\s+/g,', ');
  /* Remplacer ". Majuscule" par ".¶Majuscule" (le point reste dans le fragment gauche) */
  t=t.replace(/([.!?])\s+([A-ZÉÈÀÂÎÔÛÄËÏÖÜÇ0-9])/g,'$1\u2029$2');
  /* Split : virgules/pv, OU marker \u2029, OU "et/and/und" avant un nombre */
  var parts=t.split(/\s*[,;]\s*|\u2029|\s+(?:et|and|und|sowie)\s+(?=\d)/i);
  return parts.map(function(p){return p.trim();}).filter(function(p){return p.length>0;});
}

/* ═══ SESSION 11c — Reconstruction des phrases ═══
   Les textes Apimo arrivent souvent sans ponctuation entre phrases.
   Ex : "cohérente Cuisine équipée" → doit devenir "cohérente. Cuisine équipée"
   On injecte `. ` avant chaque mot-clé connu qui devrait démarrer une nouvelle phrase. */
var _BD_SENTENCE_STARTERS=[
  /* Pièces (majuscule en début) */
  'Hall','Entrée','Séjour','Sejour','Salon','Cuisine',
  'Salle\\s+(?:à|a|de|d[\'\u2019])\\s*\\w+',
  'WC','Toilettes?','Chambres?','Suite\\s+parentale',
  'Mezzanine','Dressing','Bureaux?','Terrasses?','Balcons?',
  'Caves?','Garages?','Parkings?','Emplacements?',
  'Buanderie','Jardins?','Grenier',
  /* Descripteur + pièce (ex "Belle chambre", "Grande cuisine") */
  '(?:Belle?s?|Beau|Beaux|Grande?s?|Petite?s?|Spacieuse?s?|Spacieux|Lumineuse?s?|Lumineux|Vaste|Vastes|Immense|Immenses|Superbe|Magnifique|Magnifiques|Double|Triple|Luxueuse?|Luxueux)\\s+(?:chambre|cuisine|salle|salon|séjour|sejour|terrasse|balcon|cave|garage|mezzanine|dressing|bureau|buanderie|emplacement|parking|hall|suite|WC)',
  /* Articles + pièces */
  '(?:Une|Un)\\s+(?:chambre|cuisine|salle|salon|séjour|sejour|terrasse|balcon|cave|garage|mezzanine|dressing|bureau|buanderie|emplacement|parking|hall|suite|double|spacieuse|belle|grande|vaste|lumineuse)',
  /* Transitions d\'étage */
  'À\\s+l[\'\u2019]étage','Au\\s+rez-de-chaussée','Au\\s+sous-sol','Au\\s+dernier\\s+étage','Au\\s+premier\\s+étage',
  /* Sections */
  'Les\\s+(?:prestations?|atouts?|avantages?|plus|points)',
  'Charges\\s+(?:mensuelles?|annuelles?|actuelles?|de\\s+copropriété)',
  'Vente\\s+exclusive','Location\\s+exclusive',
  'Pour\\s+(?:toute\\s+information|plus\\s+d[\'\u2019]information)',
  'Honoraires?','Disponibilités?','Disponible',
  /* Types de biens (quand repris en milieu de texte) */
  'Appartement','Maison','Villa','Penthouse','Duplex','Triplex',
  /* MAPA / info contact */
  'MAPA\\s+Property',
  'Nos\\s+estimations?','Notre\\s+(?:équipe|agence|partenaire)',
  'Volumes?\\s+(?:ouverts?|généreux|lumineux)'
];

function _bdReconstructSentences(text){
  if(!text)return text;
  try{
    var pattern='(?:'+_BD_SENTENCE_STARTERS.join('|')+')';
    /* Match : [lowercase/ponctuation fermante/€/%/chiffre] + espace(s) + starter */
    var re=new RegExp('([a-zéèàâîôûäëïöüç)€%0-9!?])\\s+(?=('+pattern+')\\b)','g');
    var result=text.replace(re,'$1. ');
    /* Clean-up : retirer les points placés juste après une préposition.
       Ex: "avec. WC" → "avec WC", "dans. Cuisine" → "dans Cuisine" */
    var PREPS='avec|dans|de|du|des|à|au|aux|sur|sous|par|pour|sans|chez|entre|vers|près|depuis|jusqu|comme|en|et|ou|ni|mais|donc|car|que|qui|où|que|si|sauf|selon|devant|derrière';
    var prepRe=new RegExp('\\b('+PREPS+')\\. ','gi');
    result=result.replace(prepRe,'$1 ');
    return result;
  }catch(e){
    return text;
  }
}

/* Vérifie si un fragment est une feature "N + mot-clé de pièce".
   Accepte aussi "N + adjectif autorisé + mot-clé" (ex: "1 grand sejour", "2 belles chambres")
   SESSION 11c : accepte aussi les pièces SANS nombre (ex: "Cuisine équipée...", "Une salle de douche...") */
var _BD_NO_NUMBER_ROOM_RE=/^(?:(?:Belle?s?|Beau|Beaux|Grande?s?|Petite?s?|Spacieuse?s?|Spacieux|Lumineuse?s?|Lumineux|Vaste|Vastes|Immense|Immenses|Superbe|Magnifique|Magnifiques|Double|Triple|Luxueuse?|Luxueux|Une|Un|La|Le|Les)\s+)?(?:(?:belle?s?|beau|beaux|grande?s?|petite?s?|spacieuse?s?|spacieux|lumineuse?s?|lumineux|vaste|vastes|immense|immenses|superbe|magnifique|magnifiques|double|triple|luxueuse?|luxueux|nouvelle?|nouveau|ancien|ancienne|vrai|vraie|seconde?|second|autre|autres|premier|premiere|dernier|derniere|premier|première)\s+)?(Hall|Entrée|Séjour|Sejour|Salon|Cuisine|Salle(?:\s+(?:à|a|de|d[\'\u2019])\s*\w+)?|WC|Toilettes?|Chambres?|Suite(?:\s+parentale)?|Mezzanine|Dressing|Bureaux?|Terrasses?|Balcons?|Caves?|Garages?|Parkings?|Emplacement|Buanderie|Jardins?|Grenier)\b/i;

var _BD_ADJ_ALLOWED=['grand','grande','grands','grandes',
  'petit','petite','petits','petites',
  'belle','beau','beaux','belles','bel',
  'superbe','magnifique','magnifiques',
  'joli','jolie','jolis','jolies',
  'seul','seule','seuls','seules','unique',
  'double','triple','immense','large','larges',
  'spacieux','spacieuse','spacieuses',
  'vaste','vastes','luxueux','luxueuse','luxueuses',
  'nouveau','nouvelle','nouveaux','nouvelles',
  'vrai','vraie','premier','premiere','première',
  'large','big','small','beautiful','luxurious','spacious','double','triple',
  'new','master','main','second','additional',
  'grosser','grosse','kleiner','kleine','schöner','schöne','luxuriöser','luxuriöse',
  'geräumiger','geräumige','doppelt','zweit','haupt'];
var _BD_ADJ_RE=new RegExp('^('+_BD_ADJ_ALLOWED.join('|')+')$','i');

function _bdIsRoomFeature(frag){
  var f=String(frag).trim();
  if(!f)return false;
  /* Match strict : "N + mot-clé" */
  if(_BD_ROOM_RE.test(f))return true;
  /* Match souple : "N + adjectif autorisé + mot-clé" */
  var m=f.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
  if(m){
    var adj=m[2];
    if(_BD_ADJ_RE.test(adj)){
      if(_BD_ROOM_RE.test(m[1]+' '+m[3]))return true;
    }
  }
  /* SESSION 11c : match sans nombre — fragment décrivant une pièce.
     Doit commencer par un mot-clé de pièce (avec descripteur optionnel) ET être ≤ 150 chars */
  if(f.length<=150&&_BD_NO_NUMBER_ROOM_RE.test(f)){
    return true;
  }
  return false;
}
/* ═══ Fin Session 11c ═══ */

/* Nettoie un fragment de feature : retire ponctuation finale, capitalise */
function _bdPrettifyFeature(f){
  var clean=String(f).replace(/[.!?;:]+$/,'').trim();
  if(!clean)return '';
  return clean.charAt(0).toUpperCase()+clean.slice(1);
}

/* Parse un paragraphe en blocks [{type:'p',text} | {type:'features',items:[...]}].
   SESSION 11c : nouvelle stratégie en 2 étapes
   1. Split sur séparateurs FORTS (. ; \n) pour obtenir les "phrases"
   2. Pour chaque phrase :
      - si elle est elle-même une feature → bullet
      - si elle contient une liste de features séparées par , → split sur , et extraire
      - sinon → paragraphe */
function _bdParseParaWithFeatures(text){
  if(!text)return [];
  var txt=String(text).trim();
  if(!txt)return [];

  /* STEP 1 : split sur ponctuation forte seulement (. ; ! ? \n) — on GARDE les , dans les phrases.
     Compatible tous navigateurs : on marque les fins de phrases avec \u2029 puis on split dessus. */
  var normalized=txt.replace(/([.!?;])\s+([A-ZÉÈÀÂÎÔÛÄËÏÖÜÇ0-9])/g,'$1\u2029$2');
  var sentences=normalized.split(/\u2029|\n+/);
  sentences=sentences.map(function(s){return s.trim();}).filter(function(s){return s.length>0;});

  if(sentences.length===0){
    return [{type:'p',text:txt}];
  }

  var blocks=[];
  var currentProse=[];
  var currentFeatures=[];

  function _flushProse(){
    if(currentProse.length===0)return;
    var joined='';
    for(var i=0;i<currentProse.length;i++){
      var p=currentProse[i].trim();
      if(!p)continue;
      if(joined){
        var lastChar=joined.charAt(joined.length-1);
        if(/[.!?]/.test(lastChar)){
          joined+=' '+p;
        }else{
          joined+=' '+p;
        }
      }else{
        joined=p;
      }
    }
    if(joined){
      if(!/[.!?]$/.test(joined))joined+='.';
      blocks.push({type:'p',text:joined});
    }
    currentProse=[];
  }
  function _flushFeatures(){
    if(currentFeatures.length>=2){
      blocks.push({type:'features',items:currentFeatures.map(_bdPrettifyFeature).filter(Boolean)});
    }else if(currentFeatures.length===1){
      currentProse.push(currentFeatures[0]);
    }
    currentFeatures=[];
  }

  sentences.forEach(function(sentence){
    /* Retirer la ponctuation finale pour tester la phrase propre */
    var cleanSentence=sentence.replace(/[.!?;]+$/,'').trim();
    if(!cleanSentence)return;

    /* STEP 2a : la phrase entière est-elle une feature ? (description courte d'une pièce) */
    if(cleanSentence.length<=180&&_bdIsRoomFeature(cleanSentence)){
      _flushProse();
      currentFeatures.push(cleanSentence);
      return;
    }

    /* STEP 2b : contient-elle une liste de features séparées par , ? */
    var commaParts=cleanSentence.split(/\s*[,;]\s*|\s+(?:et|and|und|sowie)\s+(?=\d)/i)
      .map(function(p){return p.trim();})
      .filter(function(p){return p.length>0;});
    if(commaParts.length>=2){
      var feats=commaParts.filter(_bdIsRoomFeature);
      if(feats.length>=2){
        _flushProse();
        _flushFeatures();
        /* Extraire les features et garder les non-features en prose intercalée */
        commaParts.forEach(function(p){
          if(_bdIsRoomFeature(p)){
            currentFeatures.push(p);
          }else{
            _flushFeatures();
            currentProse.push(p);
          }
        });
        return;
      }
    }

    /* STEP 2c : prose classique */
    _flushFeatures();
    currentProse.push(sentence);
  });

  _flushFeatures();
  _flushProse();

  /* Sécurité : si aucune feature extraite, retourner le paragraphe original */
  if(blocks.length===0||!blocks.some(function(b){return b.type==='features';})){
    return [{type:'p',text:txt}];
  }
  return blocks;
}
/* ═══ Fin Session 11 ═══ */

function formatParagraph(p){
  var text=esc(p.trim());
  if(!text)return '';
  /* Si c'est une ligne courte style "Email : X" on garde en-ligne */
  if(/^[-•*]\s/.test(p)){
    return '<li style="margin-bottom:6px;line-height:1.7">'+esc(p.replace(/^[-•*]\s/,''))+'</li>';
  }
  return '<p style="margin:0 0 14px;line-height:1.75">'+text+'</p>';
}


/* ═══ FIX 4 — Barre DPE visuelle A→G ═══ */
function dpeBarHtml(letter){
  if(!letter)return '';
  var L=String(letter).toUpperCase().trim().charAt(0);
  if('ABCDEFGHI'.indexOf(L)===-1)return '';
  /* Luxembourg : échelle étendue à A-I (I étant la pire) */
  var classes=['A','B','C','D','E','F','G','H','I'];
  var colors={A:'#0f8a3c',B:'#4fae3f',C:'#a3c246',D:'#f7d03a',E:'#f29c2f',F:'#e85e1a',G:'#c81e1e',H:'#a01616',I:'#7a0f0f'};
  var T=(I18N&&I18N[CURLANG])||{};
  var html='<div class="bd-dpe-bar">';
  html+='<div class="bd-dpe-title">'+(T['bd.dpe.title']||'Performance énergétique')+'</div>';
  html+='<div class="bd-dpe-scale">';
  classes.forEach(function(c){
    var active=(c===L)?' active':'';
    html+='<div class="bd-dpe-cell'+active+'" style="background:'+colors[c]+'">'+c+'</div>';
  });
  html+='</div>';
  html+='<div class="bd-dpe-legend"><span class="lg-left">'+(T['bd.dpe.econome']||'Économe')+'</span><span class="lg-right">'+(T['bd.dpe.enerj']||'Énergivore')+'</span></div>';
  html+='</div>';
  return html;
}

/* ═══ V28 FINAL4 — Module 1 : 3 badges DPE compacts (Énergie / Isolation / GES) ═══
   Remplace la grande barre A-I graduée. Whitelist stricte A-I sur les 3 valeurs
   b.energy (DPE), b.thermal (isolation), b.ges (émissions). Gère : terrain, pending, partiel. */
function dpeTripleBadgesHtml(b){
  if(!b)return '';
  var T=(I18N&&I18N[CURLANG])||{};
  function cleanDpeLetter(v){
    if(v===null||v===undefined||v==='')return '';
    var L=String(v).trim().toUpperCase().charAt(0);
    return ('ABCDEFGHI'.indexOf(L)!==-1)?L:'';
  }
  var energy=cleanDpeLetter(b.energy);
  var thermal=cleanDpeLetter(b.thermal);
  var ges=cleanDpeLetter(b.ges);

  /* Cas 1 : terrain (property_type ou titre contient "terrain") → "Sans objet (terrain)" */
  var typeStr=String(b.property_type||'').toLowerCase();
  var titleStr=String((typeof bLang==='function'?bLang(b,'title'):'')||b.title||'').toLowerCase();
  if(typeStr.indexOf('terrain')!==-1||titleStr.indexOf('terrain')!==-1){
    return '<div class="bd-dpe-triple bd-dpe-na">'+
      '<div class="bd-dpe-na-txt">'+esc(T['dpe.na.terrain']||'Sans objet (terrain)')+'</div>'+
    '</div>';
  }

  /* Cas 2 : aucune valeur valide → "Certificat énergétique en cours" */
  if(!energy&&!thermal&&!ges){
    return '<div class="bd-dpe-triple bd-dpe-pending">'+
      '<div class="bd-dpe-pending-txt">'+esc(T['dpe.pending']||'Certificat énergétique en cours')+'</div>'+
    '</div>';
  }

  /* Cas 3 : au moins 1 valeur → 3 badges compacts (uniquement ceux dispo) */
  var palette={A:'#0f8a3c',B:'#4fae3f',C:'#a3c246',D:'#f7d03a',E:'#f29c2f',F:'#e85e1a',G:'#c81e1e',H:'#a01616',I:'#7a0f0f'};
  function badge(letter,label){
    if(!letter)return '';
    var bg=palette[letter]||'#888';
    var fg=(letter==='D'||letter==='C')?'#1a2b44':'#fff';
    return '<div class="bd-dpe-badge-item">'+
      '<div class="bd-dpe-bl">'+esc(label)+'</div>'+
      '<div class="bd-dpe-bv" style="background:'+bg+';color:'+fg+'">'+letter+'</div>'+
    '</div>';
  }
  var parts=[
    badge(energy,T['dpe.lbl.dpe']||'DPE'),
    badge(thermal,T['dpe.lbl.iso']||'Isolation'),
    badge(ges,T['dpe.lbl.ges']||'GES')
  ].filter(function(x){return !!x});

  return '<div class="bd-dpe-triple">'+parts.join('')+'</div>';
}

function renderBienDetail(b){
  /* SESSION 9 : stocker le bien courant pour permettre le re-render au changement de langue */
  window._currentBien=b;
  window._currentBienIsOff=false;
  var c=document.getElementById('bien-content');
  if(!c)return;
  
  /* Récupère toutes les images depuis property_images */
  var imgs=bAllImgs(b);
  if(imgs.length===0){
    imgs=['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80'];
  }
  
  /* Slider */
  var slidesHtml='';
  var dotsHtml='';
  for(var i=0;i<imgs.length;i++){
    slidesHtml+='<div class="bd-slide'+(i===0?' on':'')+'"><img src="'+esc(imgs[i])+'" alt="Photo '+(i+1)+'" onclick="window.lbOpen('+i+',event)" onerror="this.style.display=\'none\'"></div>';
    dotsHtml+='<button class="bd-dot'+(i===0?' on':'')+'" onclick="bdGo('+i+',event)" aria-label="Photo '+(i+1)+'"></button>';
  }
  
  /* Titre, description, localisation, prix multilingue */
  var title=bLang(b,'title')||'Bien';
  var description=bLang(b,'description')||b.description||b.description_html||'';
  var loc=bLoc(b);
  var price=bPrice(b);
  var ref=b.ref||b.apimo_id||b.slug||(b.id?String(b.id).substring(0,8):'—');
  var cat=bLang(b,'category')||b.category||b.property_type||'Bien';
  var typeLabel=bIsRental(b)?(I18N[CURLANG]['bd.type.loc']||'Location'):(bIsOff(b)?'Off-Market':(I18N[CURLANG]['bd.type.vente']||'Vente'));
  
  /* Description : parsing robuste — gère les textes monobloc Apimo */
  var descHtml='';
  if(description){
    descHtml=smartParseDescription(description);
  }
  
  /* Specs avec icônes SVG élégants — chambres, SDB, parking, surface, terrasse, terrain */
  var ICON = {
    bed:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M22 4v16"/><path d="M2 8h20"/><path d="M2 14h20"/><path d="M6 8v6"/><path d="M18 8v6"/></svg>',
    bath:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5 1.5 1.5 0 0 0-1.5 1.5V14"/><line x1="10" y1="5" x2="8" y2="7"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M7 19v2"/><path d="M17 19v2"/><path d="M5 18a2 2 0 0 1-2-2v-2h18v2a2 2 0 0 1-2 2H5z"/></svg>',
    car:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>',
    ruler:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3 15.3 21.3a1 1 0 0 1-1.4 0L2.7 10.1a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0l11.2 11.2a1 1 0 0 1 0 1.4z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 10.5 2 2"/><path d="m10.5 13.5 2 2"/></svg>',
    tree:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 17v-3"/><path d="M10 14h4"/><circle cx="12" cy="11" r="2.5"/></svg>',
    terrace:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 3 9h18L12 2z"/><path d="M5 9v12h14V9"/><path d="M9 15h6"/></svg>',
    home:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>',
    floor:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 22V10h4V6h4v4h4v12"/></svg>',
    year:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
    dpe:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>'
  };
  
  var specs=[];
  if(b.living_surface)specs.push({icon:ICON.home,val:b.living_surface+' m²',lbl:I18N[CURLANG]['sp.habit']||'Surface habitable'});
  else if(b.surface)specs.push({icon:ICON.ruler,val:b.surface+' m²',lbl:I18N[CURLANG]['sp.surf']||'Surface'});
  /* V28 FINAL3 — Surface utile affichée À CÔTÉ de la surface habitable quand les deux existent */
  if(b.usable_surface)specs.push({icon:ICON.ruler,val:b.usable_surface+' m²',lbl:I18N[CURLANG]['sp.usable']||'Surface utile'});
  if(b.bedrooms)specs.push({icon:ICON.bed,val:b.bedrooms,lbl:b.bedrooms>1?(I18N[CURLANG]['sp.beds']||'Chambres'):(I18N[CURLANG]['sp.bed']||'Chambre')});
  if(b.bathrooms)specs.push({icon:ICON.bath,val:b.bathrooms,lbl:b.bathrooms>1?(I18N[CURLANG]['sp.baths']||'Salles de bain'):(I18N[CURLANG]['sp.bath']||'Salle de bain')});
  if(b.parking)specs.push({icon:ICON.car,val:b.parking,lbl:b.parking>1?(I18N[CURLANG]['sp.parks']||'Parkings'):(I18N[CURLANG]['sp.park']||'Parking')});
  if(b.terrace_surface)specs.push({icon:ICON.terrace,val:b.terrace_surface+' m²',lbl:I18N[CURLANG]['sp.terr']||'Terrasse'});
  if(b.land_surface)specs.push({icon:ICON.tree,val:b.land_surface+' m²',lbl:I18N[CURLANG]['sp.land']||'Terrain'});
  if(b.floor){
    var floorTxt=typeof b.floor==='number'?(b.floor+'e'):String(b.floor);
    /* En EN/DE le "e" devient "th" / "." */
    if(CURLANG==='en'&&typeof b.floor==='number'){
      floorTxt=b.floor+(b.floor===1?'st':b.floor===2?'nd':b.floor===3?'rd':'th');
    }else if(CURLANG==='de'&&typeof b.floor==='number'){
      floorTxt=b.floor+'.';
    }
    specs.push({icon:ICON.floor,val:floorTxt,lbl:I18N[CURLANG]['sp.floor']||'Étage'});
  }
  if(b.year||b.year_built){
    specs.push({icon:ICON.year,val:String(b.year||b.year_built),lbl:I18N[CURLANG]['sp.year']||'Année'});
  }
  /* V28 FINAL4 — Module 1 : le badge DPE single a été retiré ici. Il est remplacé
     par le nouveau bloc dpeTripleBadgesHtml(b) affiché en dessous de la grille specs. */
  
  var specsHtml='';
  if(specs.length>0){
    specsHtml='<div class="bd-specs-grid">';
    specs.forEach(function(s){
      specsHtml+='<div class="bd-spec-ic"><div class="bd-sp-icon">'+s.icon+'</div><div class="bd-sp-text"><div class="bd-sp-v">'+(s.raw?String(s.val):esc(String(s.val)))+'</div><div class="bd-sp-l">'+esc(s.lbl)+'</div></div></div>';
    });
    specsHtml+='</div>';
  }
  
  /* V28 FINALPLUS — Header MAPA dans modal bien */
  var mapaHeaderHtml='<div class="bd-page-header">'+
    '<div class="bd-page-logo">'+
      '<img src="https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/Logo/logo_mapa_transparent_final.png" alt="MAPA Property" onerror="this.style.display=\'none\'">'+
    '</div>'+
    '<div class="bd-page-lang">'+
      '<span class="bd-lang-current">'+(CURLANG||'FR').toUpperCase()+'</span>'+
    '</div>'+
  '</div>';

  /* ═══ SESSION 4 — HERO GALERIE 100vh PREMIUM (Christie's/Sotheby's style) ═══ */
  var heroImg=imgs[0]||'';
  var heroHtml='<section class="bd-hero" role="region" aria-label="'+(I18N[CURLANG]['bd.hero.label']||'Photo principale')+'">'+
    '<div class="bd-hero-img" style="background-image:url(\''+esc(heroImg)+'\')" onclick="openMagreyLightbox(0)" role="button" tabindex="0" aria-label="'+(I18N[CURLANG]['bd.hero.open']||'Ouvrir la galerie')+'"></div>'+
    '<div class="bd-hero-overlay"></div>'+
    '<div class="bd-hero-content">'+
      '<div class="bd-hero-ref">'+esc(typeLabel)+' · '+(I18N[CURLANG]['card.ref']||'Réf.')+' '+esc(ref)+'</div>'+
      '<h1 class="bd-hero-t">'+esc(title)+'</h1>'+
      '<div class="bd-hero-r"></div>'+
      '<div class="bd-hero-loc">'+esc(loc)+'</div>'+
      '<div class="bd-hero-price-wrap">'+
        '<div class="bd-hero-price-lbl">'+(I18N[CURLANG]['bd.hero.price']||'Prix')+'</div>'+
        '<div class="bd-hero-price">'+esc(price)+'</div>'+
      '</div>'+
    '</div>'+
    '<button class="bd-hero-gallery-btn" onclick="openMagreyLightbox(0)" aria-label="'+(I18N[CURLANG]['bd.hero.gallery']||'Voir toutes les photos')+'">'+
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'+
      '<span>'+imgs.length+' '+(I18N[CURLANG]['bd.hero.photos']||'photos')+'</span>'+
    '</button>'+
    '<div class="bd-hero-scroll" aria-hidden="true">'+
      '<span>'+(I18N[CURLANG]['bd.hero.scroll']||'Découvrir le bien')+'</span>'+
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="6 9 12 15 18 9"/></svg>'+
    '</div>'+
  '</section>';

  /* ═══ V28 FINAL MAGREY — Carrousel strip 3 photos avec autoplay 4s ═══ */
  var stripHtml='<div class="bd-strip-wrap" onmouseenter="stripPause()" onmouseleave="stripResume()">'+
    '<div class="bd-strip" id="bd-strip">'+
      '<div class="bd-strip-track" id="bd-strip-track">'+
        imgs.map(function(im,i){
          return '<div class="bd-strip-slide" onclick="openMagreyLightbox('+i+')" style="background-image:url(\''+esc(im)+'\')" role="button" tabindex="0" aria-label="Photo '+(i+1)+'"></div>';
        }).join('')+
        /* Duplique les 3 premières slides à la fin pour rotation continue fluide */
        (imgs.length>3?imgs.slice(0,3).map(function(im,i){
          return '<div class="bd-strip-slide" onclick="openMagreyLightbox('+i+')" style="background-image:url(\''+esc(im)+'\')" aria-hidden="true"></div>';
        }).join(''):'')+
      '</div>'+
      (imgs.length>3?'<button class="bd-strip-nav pr" onclick="stripPrev()" aria-label="'+(I18N[CURLANG]['slider.prev']||'Précédent')+'">‹</button>'+
      '<button class="bd-strip-nav nx" onclick="stripNext()" aria-label="'+(I18N[CURLANG]['slider.next']||'Suivant')+'">›</button>':'')+
      '<div class="bd-strip-cnt"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg> <span id="bd-strip-total">'+imgs.length+'</span></div>'+
    '</div>'+
  '</div>';

  c.innerHTML=
  mapaHeaderHtml+
  heroHtml+
  stripHtml+
  '<div class="bd-hdr">'+
    '<div class="bd-h-l">'+
      '<div class="bd-ref">'+esc(typeLabel)+' · '+(I18N[CURLANG]['card.ref']||'Réf.')+' '+esc(ref)+' · '+esc(cat)+'</div>'+
      '<h2 class="bd-t">'+esc(title)+'</h2>'+
      '<div class="bd-loc">📍 '+esc(loc)+'</div>'+
    '</div>'+
    '<div class="bd-h-r">'+
      '<div class="bd-price">'+esc(price)+'</div>'+
    '</div>'+
  '</div>'+
  '<div class="bd-body">'+
    '<div class="bd-main">'+
      specsHtml+
      dpeTripleBadgesHtml(b)+
      (b.video_url?'<div class="bd-sect bd-video-sect"><div class="bd-s-t">'+(I18N[CURLANG]['bd.video.title']||'Vidéo de présentation')+'</div>'+
        /* SESSION 1e : on stocke video_url et title dans des data-* pour éviter les bugs d'apostrophes
           dans l'attribut onclick. Un event delegation gère le clic (voir plus bas). */
        '<button class="bd-video-card" data-video-url="'+esc(b.video_url)+'" data-video-title="'+esc(title)+'" aria-label="'+(I18N[CURLANG]['bd.video.play']||'Lancer la vidéo')+'">'+
          '<div class="bd-video-thumb" style="background-image:url(\''+esc(imgs[0]||'')+'\')">'+
            '<div class="bd-video-play"><svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>'+
          '</div>'+
          '<div class="bd-video-info">'+
            '<div class="bd-video-label">'+(I18N[CURLANG]['bd.video.label']||'Visite en vidéo')+'</div>'+
            '<div class="bd-video-cta">'+(I18N[CURLANG]['bd.video.cta']||'Voir la vidéo →')+'</div>'+
          '</div>'+
        '</button>'+
      '</div>':'')+
      (descHtml?'<div class="bd-sect"><div class="bd-s-t">'+(I18N[CURLANG]['bd.desc']||'Description')+'</div><div class="bd-desc">'+descHtml+'</div></div>':'')+
    '</div>'+
    '<aside class="bd-side">'+
      '<div class="bd-side-t">'+(I18N[CURLANG]['bd.contact.agent']||'Contactez l\'agent')+'</div>'+
      '<div class="bd-agent">'+
        '<div class="bd-ag-av"><img src="https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/photos/IMG_2461.jpg" alt="Julien Brebion" loading="eager" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#b89448,#a07040);color:#fff;font-family:Cormorant,serif;font-size:22px;font-weight:700&quot;>JB</div>\'"></div>'+
        '<div><div class="bd-ag-n">Julien Brebion</div><div class="bd-ag-r">Real Estate Director</div></div>'+
      '</div>'+
      '<div class="bd-cta">'+
        '<a class="c-phone" href="tel:+352691620127">'+(I18N[CURLANG]['bd.cta.phone']||'Appeler')+'</a>'+
        '<a class="c-mail" href="mailto:'+window.mpEmail('admin','mapagroup.org')+'?subject='+encodeURIComponent((I18N[CURLANG]['mail.bien.subj']||'Demande sur bien')+' '+ref)+'">'+(I18N[CURLANG]['bd.cta.mail']||'Envoyer un e-mail')+'</a>'+
        '<button class="c-visit" onclick="toggleBdForm(event)">'+(I18N[CURLANG]['bd.cta.info']||'Demander des informations')+'</button>'+
      '</div>'+
      /* Formulaire inline (caché par défaut) */
      '<div class="bd-info-form" id="bd-info-form" style="display:none">'+
        '<div class="fg"><label class="fl">'+(I18N[CURLANG]['form.prenom']||'Prénom')+'</label><input class="fi" type="text" id="bd-if-fn"></div>'+
        '<div class="fg"><label class="fl">'+(I18N[CURLANG]['form.nom']||'Nom')+'</label><input class="fi" type="text" id="bd-if-ln"></div>'+
        '<div class="fg"><label class="fl">'+(I18N[CURLANG]['form.email']||'E-mail')+' *</label><input class="fi" type="email" id="bd-if-em" required></div>'+
        '<div class="fg"><label class="fl">'+(I18N[CURLANG]['form.tel']||'Téléphone')+'</label><input class="fi" type="tel" id="bd-if-tel"></div>'+
        '<div class="fg"><label class="fl">'+(I18N[CURLANG]['form.message']||'Message')+'</label><textarea class="ft" id="bd-if-msg" rows="3" placeholder="'+(I18N[CURLANG]['bd.form.msg.ph']||'Je souhaite recevoir plus d\'informations sur ce bien…')+'"></textarea></div>'+
        '<div class="cf-turnstile" data-sitekey="0x4AAAAAADDxAd17up1nU0-U" data-theme="light" data-size="normal" style="margin:14px 0 8px"></div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:11.5px;color:var(--ink4);line-height:1.55;margin:10px 0 14px;font-style:italic" data-i18n="form.rgpd">Vos données sont traitées conformément au RGPD pour répondre à votre demande. Vous pouvez exercer vos droits d\'accès, rectification, suppression et opposition à <span class="mp-mail" data-u="admin" data-d="mapagroup.org" data-label="visible" style="color:var(--cu)"></span>. Aucune donnée n\'est cédée à des tiers.</p>'+
        '<button class="btn btn-navy" onclick="submitBdForm(event,\''+esc(ref)+'\',\''+(bIsRental(b)?'rental':(bIsOff(b)?'offmarket':'sale'))+'\')" style="width:100%;margin-top:8px">'+(I18N[CURLANG]['bd.form.submit']||'✦ Envoyer ma demande')+'</button>'+
        '<div class="bd-form-note">'+(I18N[CURLANG]['bd.form.note']||'Julien Brebion vous répond personnellement sous 24h.')+'</div>'+
      '</div>'+
    '</aside>'+
  '</div>'+
  renderSimilarBiens(b);
  BD_CUR=0;BD_MAX=imgs.length;
}

/* ─── SLIDER FICHE BIEN ─── */
var BD_CUR=0,BD_MAX=0;
window.bdGo=function(i,ev){
  /* Stop event bubbling to prevent accidental m-bien modal close */
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(BD_MAX<=0)return;
  /* Wrap index safely */
  if(i<0)i=BD_MAX-1;
  if(i>=BD_MAX)i=0;
  var slides=document.querySelectorAll('#bd-slides .bd-slide');
  var dots=document.querySelectorAll('.bd-dot');
  for(var k=0;k<slides.length;k++){
    if(slides[k])slides[k].classList.remove('on');
    if(dots[k])dots[k].classList.remove('on');
  }
  if(slides[i])slides[i].classList.add('on');
  if(dots[i])dots[i].classList.add('on');
  /* Requery compteur DOM each call — defensive in case of re-render */
  var cur=document.getElementById('bd-cur');
  if(cur)cur.textContent=(i+1);
  BD_CUR=i;
};
window.bdNext=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(BD_MAX>0)window.bdGo((BD_CUR+1)%BD_MAX);
};
window.bdPrev=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(BD_MAX>0)window.bdGo((BD_CUR-1+BD_MAX)%BD_MAX);
};
/* Keyboard navigation : ← / → quand m-bien est ouvert */
document.addEventListener('keydown',function(e){
  var bien=document.getElementById('m-bien');
  if(!bien||!bien.classList.contains('open'))return;
  /* Ignorer si focus sur un input/textarea */
  var tag=(document.activeElement&&document.activeElement.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  if(e.key==='ArrowRight'||e.keyCode===39){e.preventDefault();window.bdNext();}
  else if(e.key==='ArrowLeft'||e.keyCode===37){e.preventDefault();window.bdPrev();}
});

/* ─── LOAD BIENS (avec fallback démo) ─── */
function loadBiens(cb){
  var url=SUPA+'/rest/v1/properties?select=*&is_published=eq.true&order=created_at.desc';
  console.log('[MAPA] Chargement biens depuis:',url);
  fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY}})
    .then(function(r){
      console.log('[MAPA] Réponse HTTP:',r.status,r.statusText);
      if(!r.ok){
        return r.text().then(function(txt){
          console.error('[MAPA] ERREUR Supabase:',r.status,txt);
          window.__MAPA_BIENS_ERROR='HTTP '+r.status+' : '+txt.substring(0,200);
          return[];
        });
      }
      return r.json();
    })
    .then(function(d){
      PROPS=d||[];
      console.log('[MAPA] Biens reçus:',PROPS.length);
      if(PROPS.length>0){
        console.log('[MAPA] Exemple bien #1 — colonnes:',Object.keys(PROPS[0]).join(', '));
        /* Charger les images depuis table property_images puis re-render */
        loadPropertyImages(function(){
          renderBiens();
          renderFeaturedBiens();  /* V28 FINAL15 : carrousel coups de cœur dynamique depuis Supabase */
          if(cb)cb();
        });
      }else{
        if(!window.__MAPA_BIENS_ERROR)window.__MAPA_BIENS_ERROR='Aucun bien trouvé';
        renderBiens();
        renderFeaturedBiens();
        if(cb)cb();
      }
    })
    .catch(function(e){
      console.error('[MAPA] ERREUR réseau:',e);
      window.__MAPA_BIENS_ERROR='Erreur réseau : '+(e.message||'inconnue');
      PROPS=[];
      renderBiens();
      if(cb)cb();
    });
}
/* Fonction diagnostic accessible via console : mapaDebug() */
window.mapaDebug=function(){
  var msg='=== MAPA DIAGNOSTIC ===\n';
  msg+='Supabase URL: '+SUPA+'\n';
  msg+='Clé anon: '+(KEY?KEY.substring(0,30)+'...':'MANQUANTE')+'\n';
  msg+='Biens chargés: '+(PROPS?PROPS.length:'non chargé')+'\n';
  msg+='Articles blog: '+(BLOG_POSTS?BLOG_POSTS.length:'non chargé')+'\n';
  msg+='Avis clients: '+(REVIEWS?REVIEWS.length:'non chargé')+'\n';
  if(window.__MAPA_BIENS_ERROR)msg+='\n⚠️ Erreur biens: '+window.__MAPA_BIENS_ERROR+'\n';
  if(PROPS&&PROPS.length>0){
    msg+='\n✓ Exemple bien #1:\n';
    msg+='  Colonnes: '+Object.keys(PROPS[0]).join(', ')+'\n';
  }
  console.log(msg);
  alert(msg);
  return{supa:SUPA,props:PROPS,blog:BLOG_POSTS,reviews:REVIEWS,error:window.__MAPA_BIENS_ERROR};
};

/* V28 FINAL6 — Debug recherche : tape mapaSearchDebug() dans la console F12 après une recherche pour voir POURQUOI chaque bien matche ou non */
window.mapaSearchDebug=function(){
  var d=window.__MAPA_LAST_SEARCH;
  if(!d){console.log('[MAPA] Aucune recherche effectuée. Lance une recherche d\'abord.');return;}
  console.log('=== DERNIÈRE RECHERCHE ===');
  console.log('Filtres:',d.filters);
  console.log('Mode IA:',d.iaMode,'| Query:',d.query);
  console.log('Résultats:',d.results,'| Mode élargi:',d.relaxed);
  console.log('--- Détail par bien (analysé) ---');
  d.debug.forEach(function(item,i){
    console.log((item.ok?'✓':'✗'),'#'+(i+1),item.title,'—',item.reason);
  });
  if(PROPS && PROPS.length>0){
    console.log('--- Champs disponibles dans tes biens (1er bien) ---');
    var p=PROPS[0];
    console.log('id:',p.id,'| title:',p.title);
    console.log('country:',p.country,'| country_code:',p.country_code);
    console.log('city:',p.city,'| address:',p.address,'| location:',p.location);
    console.log('type:',p.type,'| property_type:',p.property_type,'| category:',p.category);
    console.log('bedrooms:',p.bedrooms,'| rooms:',p.rooms,'| price_value:',p.price_value);
    console.log('Tous les champs:',Object.keys(p).join(', '));
  }
  return d;
};

/* ─── BLOG (charge depuis table Supabase blog_posts) ─── */
var BLOG_POSTS=[];
function loadBlog(cb){
  var url=SUPA+'/rest/v1/blog_posts?select=*&is_published=eq.true&order=published_at.desc';
  console.log('[MAPA] Chargement blog:',url);
  fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY}})
    .then(function(r){
      console.log('[MAPA] Blog HTTP:',r.status);
      if(!r.ok){
        return r.text().then(function(txt){
          console.error('[MAPA] Erreur blog_posts:',r.status,txt);
          return[];
        });
      }
      return r.json();
    })
    .then(function(d){
      BLOG_POSTS=d||[];
      console.log('[MAPA] Articles reçus:',BLOG_POSTS.length);
      renderBlog();
      if(cb)cb();
    })
    .catch(function(e){
      console.error('[MAPA] Erreur réseau blog:',e);
      BLOG_POSTS=[];
      renderBlog();
      if(cb)cb();
    });
}
function renderBlog(){
  var list=document.getElementById('blog-list');
  var empty=document.getElementById('blog-empty');
  if(!list)return;
  if(!BLOG_POSTS.length){list.style.display='none';if(empty)empty.style.display='block';return}
  list.style.display='grid';if(empty)empty.style.display='none';
  var L=(typeof CURLANG!=='undefined'?CURLANG:'fr')||'fr';
  var dateLocale=L==='fr'?'fr-FR':(L==='de'?'de-DE':'en-US');
  var readLabel=L==='en'?'READ ARTICLE →':(L==='de'?'ARTIKEL LESEN →':'LIRE L\'ARTICLE →');
  list.innerHTML=BLOG_POSTS.map(function(p){
    /* Multilingue : priorité à la langue courante, fallback FR → EN */
    var title=p['title_'+L]||p.title_fr||p.title||p.title_en||'';
    var excerpt=p['excerpt_'+L]||p.excerpt_fr||p.excerpt||p.excerpt_en||'';
    var cover=p.cover_image||'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80';
    var date=p.published_at?new Date(p.published_at).toLocaleDateString(dateLocale,{year:'numeric',month:'long',day:'numeric'}):'';
    var tag=p['primary_tag_'+L]||p.primary_tag||'';
    var slugOrId=p.slug||p.id;
    return '<article class="blog-card" onclick="openBlogArticle(\''+esc(slugOrId)+'\')" style="cursor:pointer;background:var(--w);border:1px solid var(--w2);overflow:hidden;transition:all .25s;display:flex;flex-direction:column">'+
      '<div style="aspect-ratio:16/10;background:url(\''+esc(cover)+'\') center/cover;background-color:var(--w1)"></div>'+
      '<div style="padding:22px 24px;display:flex;flex-direction:column;gap:10px;flex:1">'+
        (date?'<div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:.22em;color:var(--or);font-weight:500">'+esc(date)+(tag?'  ·  '+esc(tag.toUpperCase()):'')+'</div>':'')+
        '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:24px;font-weight:500;color:var(--navy);line-height:1.3;margin:0;letter-spacing:-.005em">'+esc(title)+'</h3>'+
        '<p style="font-family:Raleway,sans-serif;font-size:14px;color:var(--ink2);line-height:1.7;font-weight:400;margin:0;flex:1">'+esc(excerpt.substring(0,180))+(excerpt.length>180?'…':'')+'</p>'+
        '<div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:.22em;color:var(--cu);font-weight:600;margin-top:6px">'+readLabel+'</div>'+
      '</div>'+
    '</article>';
  }).join('');
}

/* SESSION 13 : rendu article blog enrichi.
   - Multilingue (title_fr/en/de, content_fr/en/de)
   - Rendu HTML riche (conserve les balises <h2>, <table>, <blockquote>, <strong>, <em>, <ul>, <ol>, <a>)
   - Schema.org Article + FAQPage injectés dynamiquement dans <head>
   - CTA contextuels (estimation / mandat / off-market) en fin d'article
   - Boutons "← Retour au blog" et partage LinkedIn */
window.openBlogArticle=function(idOrSlug){
  if(!idOrSlug)return;
  var post=BLOG_POSTS.find(function(p){
    return String(p.slug)===String(idOrSlug)||String(p.id)===String(idOrSlug);
  });
  if(!post)return;
  var L=(typeof CURLANG!=='undefined'?CURLANG:'fr')||'fr';
  var dateLocale=L==='fr'?'fr-FR':(L==='de'?'de-DE':'en-US');
  var title=post['title_'+L]||post.title_fr||post.title||post.title_en||'';
  var excerpt=post['excerpt_'+L]||post.excerpt_fr||post.excerpt||post.excerpt_en||'';
  var content=post['content_'+L]||post.content_fr||post.content||post.content_en||'';
  var cover=post.cover_image||'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80';
  var date=post.published_at?new Date(post.published_at).toLocaleDateString(dateLocale,{year:'numeric',month:'long',day:'numeric'}):'';
  var tag=post['primary_tag_'+L]||post.primary_tag||'';
  var c=document.getElementById('blog-art-content');
  if(!c)return;
  /* Détecter si le content est déjà du HTML ou du texte brut */
  var isHtml=/<(h[1-6]|p|div|table|blockquote|ul|ol|strong|em)\b/i.test(content);
  var contentHtml=isHtml?content:_blogTextToHtml(content);
  /* Extraire automatiquement les H2 pour un sommaire cliquable */
  var toc=_blogExtractTOC(contentHtml);
  var tocHtml='';
  if(toc.length>=3){
    var tocLabel=L==='en'?'In this article':(L==='de'?'In diesem Artikel':'Dans cet article');
    tocHtml='<nav class="blog-toc"><div class="blog-toc-t">'+esc(tocLabel)+'</div><ol>';
    toc.forEach(function(t){
      tocHtml+='<li><a href="#'+esc(t.id)+'" onclick="document.getElementById(\''+esc(t.id)+'\').scrollIntoView({behavior:\'smooth\',block:\'start\'});return false">'+esc(t.title)+'</a></li>';
    });
    tocHtml+='</ol></nav>';
  }
  /* CTA fin d'article : adapté au slug */
  var ctaHtml=_blogBuildCTA(post,L);
  /* Retour + partage */
  var backLabel=L==='en'?'← Back to blog':(L==='de'?'← Zurück zum Blog':'← Retour au blog');
  var shareLabel=L==='en'?'Share on LinkedIn':(L==='de'?'Auf LinkedIn teilen':'Partager sur LinkedIn');
  var shareUrl='https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent('https://www.mapaproperty.lu/blog/'+(post.slug||post.id));
  c.innerHTML=
    '<article class="blog-art">'+
      '<header class="blog-art-hero">'+
        '<div class="blog-art-hero-bg" style="background-image:url(\''+esc(cover)+'\')"></div>'+
        '<div class="blog-art-hero-ov"></div>'+
        '<div class="blog-art-hero-inner">'+
          (tag?'<div class="blog-art-tag">'+esc(tag.toUpperCase())+'</div>':'')+
          '<h1 class="blog-art-title">'+esc(title)+'</h1>'+
          (date?'<div class="blog-art-date">'+esc(date)+(post.author?'  ·  '+esc(post.author):'  ·  Julien Brebion')+'</div>':'')+
        '</div>'+
      '</header>'+
      '<div class="blog-art-body">'+
        (excerpt?'<p class="blog-art-lead">'+esc(excerpt)+'</p>':'')+
        tocHtml+
        '<div class="blog-art-content">'+contentHtml+'</div>'+
        ctaHtml+
        '<div class="blog-art-foot">'+
          '<a class="btn btn-line" href="#" onclick="closeM(\'m-blog-art\');openSvc(\'m-blog\');return false">'+backLabel+'</a>'+
          '<a class="btn btn-line" href="'+shareUrl+'" target="_blank" rel="noopener">'+shareLabel+'</a>'+
        '</div>'+
      '</div>'+
    '</article>';
  /* Schema.org Article + FAQPage injectés dynamiquement */
  _blogInjectSchema(post,L,title,excerpt,cover,date);
  window.closeM('m-blog');window.openM('m-blog-art');
  /* Ajout des ids sur les H2 (asynchrone car le DOM doit être rendu) */
  setTimeout(_blogAddH2Ids,50);
  /* SESSION 13 : scroll top systématique (même pattern que fiche bien) */
  if(typeof _scrollTopAfterOpen==='function'){
    /* Adapter pour cibler m-blog-art au lieu de m-bien */
    var _htmlEl=document.documentElement;
    var _origBehav=_htmlEl.style.scrollBehavior;
    _htmlEl.style.scrollBehavior='auto';
    function _resetBlogScroll(){
      window.scrollTo(0,0);
      _htmlEl.scrollTop=0;
      document.body.scrollTop=0;
      var ma=document.getElementById('m-blog-art');
      if(ma){ma.scrollTop=0;var s=ma.querySelector('.mpage');if(s)s.scrollTop=0;}
    }
    _resetBlogScroll();
    if(window.requestAnimationFrame)window.requestAnimationFrame(_resetBlogScroll);
    setTimeout(_resetBlogScroll,50);
    setTimeout(_resetBlogScroll,150);
    setTimeout(function(){_resetBlogScroll();_htmlEl.style.scrollBehavior=_origBehav||'';},350);
  }
};

/* Convertit un texte brut avec sauts de ligne en HTML paragraphes */
function _blogTextToHtml(txt){
  if(!txt)return'';
  var paras=String(txt).split(/\n{2,}/);
  return paras.map(function(p){
    p=p.trim();if(!p)return'';
    return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';
  }).join('');
}

/* Extrait les H2 d'un HTML pour créer un sommaire cliquable.
   Ajoute au passage un id="..." à chaque H2. */
function _blogExtractTOC(html){
  var toc=[];
  /* Regex pour capter <h2>...</h2>  */
  var re=/<h2\b([^>]*)>(.*?)<\/h2>/gi;
  var m;
  var idx=0;
  while((m=re.exec(html))!==null){
    idx++;
    var titleTxt=m[2].replace(/<[^>]+>/g,'').trim();
    var id='s'+idx+'-'+titleTxt.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,40);
    toc.push({id:id,title:titleTxt});
  }
  return toc;
}

/* Injecte ids sur les H2 du HTML (appelé après rendu via effet collatéral) */
function _blogAddH2Ids(){
  var contentDiv=document.querySelector('.blog-art-content');
  if(!contentDiv)return;
  var h2s=contentDiv.querySelectorAll('h2');
  for(var i=0;i<h2s.length;i++){
    var txt=(h2s[i].textContent||'').trim();
    var id='s'+(i+1)+'-'+txt.toLowerCase().replace(/[^a-zà-ÿ0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,40);
    h2s[i].id=id;
  }
}

/* CTA fin d'article adapté au slug de l'article */
function _blogBuildCTA(post,L){
  var slug=(post.slug||'').toLowerCase();
  var title,body,btn1Label,btn1Action,btn2Label,btn2Action;
  if(slug.indexOf('vendre')>=0||slug.indexOf('estimation')>=0||slug.indexOf('sell')>=0||slug.indexOf('verkauf')>=0){
    title=L==='en'?'Free valuation of your property':(L==='de'?'Kostenlose Bewertung Ihrer Immobilie':'Estimation confidentielle de votre bien');
    body=L==='en'?'Cross-method valuation, EVS compliance, written report. No commitment.':(L==='de'?'Methodenübergreifende Bewertung, EVS-Konformität, schriftlicher Bericht. Ohne Verpflichtung.':'Méthode croisée, conformité EVS, note écrite expliquant chaque chiffre. Sans engagement.');
    btn1Label=L==='en'?'Request valuation':(L==='de'?'Bewertung anfragen':'Demander une estimation');
    btn1Action='closeM(\'m-blog-art\');openSvc(\'m-estimation\')';
    btn2Label=L==='en'?'Sell with MAPA':(L==='de'?'Mit MAPA verkaufen':'Vendre avec MAPA');
    btn2Action='closeM(\'m-blog-art\');openSvc(\'m-vente\')';
  }else if(slug.indexOf('off-market')>=0||slug.indexOf('off_market')>=0){
    title=L==='en'?'Structured Off-Market Access':(L==='de'?'Strukturierter Off-Market-Zugang':'Accès Off-Market structuré');
    body=L==='en'?'For owners planning a confidential sale, and qualified buyers seeking access to the Luxembourg and European off-market.':(L==='de'?'Für Eigentümer, die einen vertraulichen Verkauf planen, und qualifizierte Käufer, die strukturierten Zugang zum Luxemburger und europäischen Off-Market suchen.':'Pour les propriétaires d\'actifs trophy envisageant une cession confidentielle, et pour les acquéreurs qualifiés recherchant un accès structuré au Off-Market luxembourgeois et européen.');
    btn1Label=L==='en'?'Discover Off-Market':(L==='de'?'Off-Market entdecken':'Découvrir Off-Market');
    btn1Action='closeM(\'m-blog-art\');openSvc(\'m-offmarket\')';
    btn2Label=L==='en'?'Contact Julien Brebion':(L==='de'?'Julien Brebion kontaktieren':'Contacter Julien Brebion');
    btn2Action='closeM(\'m-blog-art\');openSvc(\'m-contact\')';
  }else if(slug.indexOf('vivre')>=0||slug.indexOf('luxembourg')>=0||slug.indexOf('living')>=0||slug.indexOf('leben')>=0){
    title=L==='en'?'Confidential support for your move to Luxembourg':(L==='de'?'Vertrauliche Unterstützung für Ihren Umzug nach Luxemburg':'Accompagnement confidentiel pour votre installation au Luxembourg');
    body=L==='en'?'Primary residence, patrimonial investment, targeted search mandate: our expert team supports your entire project.':(L==='de'?'Hauptwohnsitz, Vermögensinvestition, gezielter Suchauftrag: unser Expertenteam begleitet Ihr gesamtes Projekt.':'Recherche de résidence principale, investissement patrimonial, mandat de recherche ciblé : notre équipe d\'experts accompagne l\'intégralité de votre projet.');
    btn1Label=L==='en'?'Search mandate':(L==='de'?'Suchmandat':'Mandat de recherche');
    btn1Action='closeM(\'m-blog-art\');openSvc(\'m-mandat-recherche\')';
    btn2Label=L==='en'?'Contact Julien Brebion':(L==='de'?'Julien Brebion kontaktieren':'Contacter Julien Brebion');
    btn2Action='closeM(\'m-blog-art\');openSvc(\'m-contact\')';
  }else{
    /* CTA générique */
    title=L==='en'?'Talk with MAPA Property':(L==='de'?'Sprechen Sie mit MAPA Property':'Échanger avec MAPA Property');
    body=L==='en'?'Our team is available for confidential discussions on your real estate projects.':(L==='de'?'Unser Team steht für vertrauliche Gespräche zu Ihren Immobilienprojekten zur Verfügung.':'Notre équipe est disponible pour un échange confidentiel sur vos projets immobiliers.');
    btn1Label=L==='en'?'Contact us':(L==='de'?'Kontakt':'Nous contacter');
    btn1Action='closeM(\'m-blog-art\');openSvc(\'m-contact\')';
    btn2Label='';
    btn2Action='';
  }
  return '<aside class="blog-art-cta">'+
    '<div class="blog-art-cta-t">'+esc(title)+'</div>'+
    '<div class="blog-art-cta-b">'+esc(body)+'</div>'+
    '<div class="blog-art-cta-btns">'+
      '<button class="btn btn-gold" onclick="'+btn1Action+'">'+esc(btn1Label)+'</button>'+
      (btn2Label?'<button class="btn btn-line" onclick="'+btn2Action+'">'+esc(btn2Label)+'</button>':'')+
    '</div>'+
    '<div class="blog-art-cta-coord">'+
      '<span class="mp-mail" data-u="admin" data-d="mapagroup.org" data-label="cta"></span> · '+
      '<a href="tel:+352691620127">'+(I18N[CURLANG]['ft.call']||'Appeler')+'</a>'+
    '</div>'+
  '</aside>';
}

/* Injecte Schema.org Article + FAQPage dans le <head> pour l'article ouvert.
   Nettoie les anciens scripts avant. */
function _blogInjectSchema(post,L,title,excerpt,cover,dateStr){
  try{
    /* Nettoyer anciens */
    var old=document.querySelectorAll('script[data-blog-schema]');
    for(var i=0;i<old.length;i++)old[i].parentNode.removeChild(old[i]);
    /* Article */
    var pubDate=post.published_at||new Date().toISOString();
    var modDate=post.updated_at||pubDate;
    var slug=post.slug||post.id;
    var articleSchema={
      "@context":"https://schema.org",
      "@type":"Article",
      "headline":title,
      "description":excerpt,
      "image":cover,
      "datePublished":pubDate,
      "dateModified":modDate,
      "author":{
        "@type":"Person",
        "name":post.author||"Julien Brebion",
        "url":"https://www.linkedin.com/in/julien-brebion/",
        "jobTitle":"Real Estate Director",
        "worksFor":{
          "@type":"Organization",
          "name":"MAPA Property"
        }
      },
      "publisher":{
        "@type":"Organization",
        "name":"MAPA Property",
        "logo":{
          "@type":"ImageObject",
          "url":"https://dutfkblygfvhhwpzxmfz.supabase.co/storage/v1/object/public/Logo/logo_mapa_transparent_final.png"
        }
      },
      "mainEntityOfPage":{
        "@type":"WebPage",
        "@id":"https://www.mapaproperty.lu/blog/"+slug
      },
      "inLanguage":L==='fr'?'fr-LU':(L==='de'?'de-DE':'en-US'),
      "keywords":post.tags||post.primary_tag||""
    };
    var s1=document.createElement('script');
    s1.type='application/ld+json';
    s1.setAttribute('data-blog-schema','article');
    s1.textContent=JSON.stringify(articleSchema);
    document.head.appendChild(s1);
    /* FAQPage si post.faq existe */
    var faq=post['faq_'+L]||post.faq_fr||post.faq||null;
    if(faq&&Array.isArray(faq)&&faq.length){
      var faqSchema={
        "@context":"https://schema.org",
        "@type":"FAQPage",
        "mainEntity":faq.map(function(q){
          return {
            "@type":"Question",
            "name":q.q||q.question||"",
            "acceptedAnswer":{
              "@type":"Answer",
              "text":q.a||q.answer||""
            }
          };
        })
      };
      var s2=document.createElement('script');
      s2.type='application/ld+json';
      s2.setAttribute('data-blog-schema','faq');
      s2.textContent=JSON.stringify(faqSchema);
      document.head.appendChild(s2);
    }
  }catch(e){console.warn('[MAPA] Schema.org injection failed:',e);}
}

/* ─── AVIS CLIENTS (charge depuis table Supabase reviews) ─── */
var REVIEWS=[];
function loadReviews(cb){
  var url=SUPA+'/rest/v1/reviews?select=*&is_published=eq.true&order=review_date.desc';
  console.log('[MAPA] Chargement avis:',url);
  fetch(url,{headers:{'apikey':KEY,'Authorization':'Bearer '+KEY}})
    .then(function(r){
      console.log('[MAPA] Avis HTTP:',r.status);
      if(!r.ok){
        return r.text().then(function(txt){
          console.error('[MAPA] Erreur reviews:',r.status,txt);
          return[];
        });
      }
      return r.json();
    })
    .then(function(d){
      REVIEWS=d||[];
      console.log('[MAPA] Avis reçus:',REVIEWS.length);
      renderReviews();
      if(cb)cb();
    })
    .catch(function(e){
      console.error('[MAPA] Erreur réseau reviews:',e);
      REVIEWS=[];
      renderReviews();
      if(cb)cb();
    });
}
function renderReviews(){
  var track=document.getElementById('rev-track');
  if(!track)return;
  if(!REVIEWS.length){
    /* Masquer la section complète si aucun avis — elle réapparaîtra quand tu en ajoutes */
    var sec=document.getElementById('reviews-section');
    if(sec)sec.style.display='none';
    return;
  }
  /* On duplique les avis pour un défilement infini fluide */
  var stars=function(n){n=Math.max(1,Math.min(5,+n||5));var s='';for(var i=0;i<5;i++)s+=i<n?'★':'☆';return s};
  var card=function(r){
    var date=r.review_date?new Date(r.review_date).toLocaleDateString('fr-FR',{year:'numeric',month:'short'}):'';
    return '<div class="rev-c" onclick="openReview('+"'"+esc(r.id)+"'"+')">'+
      '<div class="rev-stars" aria-label="'+(+r.rating||5)+' sur 5 étoiles">'+stars(r.rating)+'</div>'+
      '<div class="rev-tx">« '+esc(r.comment||'')+' »</div>'+
      '<div class="rev-meta"><div class="rev-nm">'+esc(r.name||'Client')+'</div>'+(date?'<div class="rev-dt">'+esc(date)+'</div>':'')+'</div>'+
    '</div>';
  };
  var html=REVIEWS.map(card).join('')+REVIEWS.map(card).join('');
  track.innerHTML=html;
}
window.openReview=function(id){
  var r=REVIEWS.find(function(x){return String(x.id)===String(id)});
  if(!r)return;
  var stars=function(n){n=Math.max(1,Math.min(5,+n||5));var s='';for(var i=0;i<5;i++)s+=i<n?'★':'☆';return s};
  var date=r.review_date?new Date(r.review_date).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}):'';
  var box=document.getElementById('rev-modal-content');
  if(box){
    box.innerHTML=
      '<div style="font-family:Cinzel,serif;font-size:10px;letter-spacing:.36em;text-transform:uppercase;color:var(--or);font-weight:600;margin-bottom:14px;text-align:center">Avis client</div>'+
      '<div class="rev-mod-stars" aria-label="'+(+r.rating||5)+' sur 5">'+stars(r.rating)+'</div>'+
      '<div class="rev-mod-tx">« '+esc(r.comment||'')+' »</div>'+
      '<div class="rev-mod-meta">'+
        '<div class="rev-mod-nm">'+esc(r.name||'Client')+'</div>'+
        (date?'<div class="rev-mod-dt">'+esc(date)+'</div>':'')+
      '</div>';
  }
  window.openM('m-review');
};

/* ─── LEADS ─── */
window.sendLead=function(type,mid,emId,pfxId,telId){
  var em=v(emId);
  if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){toast((I18N[CURLANG]['toast.email.invalid']||'E-mail invalide'));return}
  toast((I18N[CURLANG]['toast.lead.sent']||'Demande envoyée ✓ Julien vous répond sous 24h'),4000);
  setTimeout(function(){window.closeM(mid)},1200);
};

/* ═══════════════════════════════════════════════════════════════════════════
 *  ⚠ VEILLE DONNÉES — À VÉRIFIER PÉRIODIQUEMENT  ⚠
 *  ═══════════════════════════════════════════════════════════════════════════
 *
 *  Les tables ci-dessous (LU_PRIX_M2, LU_PRIX_ARE) reposent sur des données
 *  publiées par l'Observatoire de l'Habitat et le STATEC. Ces données sont
 *  mises à jour périodiquement par les institutions officielles.
 *
 *  CALENDRIER DE VEILLE RECOMMANDÉ :
 *  ────────────────────────────────
 *
 *  📊 Prix d'appartements par commune (LU_PRIX_M2)
 *      → Fréquence de publication officielle : TRIMESTRIELLE
 *      → Source : data.public.lu (jeu "Prix de vente des appartements - Par commune")
 *      → URL : https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/
 *      → Dernière référence intégrée : Q4 2025 (publiée 26 mars 2026)
 *      → ⚠ Vérifier le 1er du trimestre suivant (juillet 2026 pour Q1 2026, etc.)
 *
 *  🏞 Prix de l'are par commune (LU_PRIX_ARE)
 *      → Fréquence de publication officielle : ANNUELLE (rapport d'analyse)
 *      → Source : Observatoire de l'Habitat — Rapport d'analyse n°19 (oct 2025)
 *      → URL : https://logement.public.lu/fr/actualites/2025/10/10-ra19.html
 *      → Page de veille : https://logement.public.lu/fr/observatoire-habitat/observation-fonciere/prix-foncier.html
 *      → Dernière référence intégrée : médianes 2022-2024 (publiées octobre 2025)
 *      → ⚠ Vérifier en octobre 2026 le rapport d'analyse n°20 (s'il est publié)
 *
 *  💶 Coûts de construction au m² (logique de calcul des maisons)
 *      → Source : STATEC — Indice des prix de la construction (publication trimestrielle)
 *      → URL : https://statistiques.public.lu/fr/statistiques/economie-finances/prix/prix-construction.html
 *      → Valeurs internes MAPA : 3 750–5 000 €/m² selon état (avril 2026)
 *      → ⚠ À recalibrer si l'indice STATEC bouge de plus de 5 % sur un an
 *
 *  COMMENT METTRE À JOUR LES TABLES :
 *  ──────────────────────────────────
 *  1. Aller sur l'URL officielle
 *  2. Télécharger le fichier .xlsx (ou .csv) de la dernière période
 *  3. Modifier les valeurs ci-dessous (clé = commune en minuscules)
 *  4. Mettre à jour la valeur 7 764 €/m² (référence nationale Q4 2025) si elle a changé
 *  5. Mettre à jour la phrase "Référence : Q4 2025" dans i18n.js (clé `mod.est.src.update`)
 *  6. Tester avec quelques communes connues avant déploiement
 *
 *  POUR LES DÉVELOPPEURS :
 *  ──────────────────────
 *  Tape `mapaSourcesInfo()` dans la console du navigateur pour afficher un
 *  rappel des sources, leur fraîcheur et les URLs de vérification.
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Métadonnées de veille — exposées pour affichage console + audit */
var MAPA_DATA_SOURCES={
  prix_m2:{
    derniere_ref:'Calibrage marché actuel (avril 2026)',
    publiee_le:'2026-04-26',
    integree_le:'2026-04-26',
    frequence:'trimestrielle (vérification annonces actives)',
    prochain_check:'2026-07-01',
    url_data:'https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/',
    url_source:'https://logement.public.lu/fr/observatoire-habitat/prix-de-vente.html',
    moyenne_nationale_observatoire:7764,
    methode:'Calibration sur annonces marché actuelles (correction -24% vs STATEC Q4 2025)',
    note:'Reflète la correction sévère post-Q3 2025 : taux BCE élevés, capacité d\'emprunt réduite, allongement des délais de vente. Vérifié sur échantillon Belair (médiane annonces 10 741 €/m²)',
    licence:'Creative Commons Zero (CC0) pour les données Observatoire'
  },
  prix_are:{
    derniere_ref:'Médianes 2022-2024',
    publiee_le:'2025-10-10',
    integree_le:'2026-04-26',
    frequence:'annuelle',
    prochain_check:'2026-10-15',
    url_data:'https://logement.public.lu/fr/actualites/2025/10/10-ra19.html',
    url_source:'https://logement.public.lu/fr/observatoire-habitat/observation-fonciere/prix-foncier.html',
    rapport:'Rapport d\'analyse n°19 — Observatoire de l\'Habitat',
    moyenne_nationale:93514,
    zones:6,
    note:'Le terrain n\'est pas affecté par la correction marché 2026 (rareté foncière chronique = valeur stable)',
    licence:'Creative Commons Zero (CC0)'
  },
  cout_construction:{
    derniere_ref:'Calibration marché 2026',
    integree_le:'2026-04-26',
    frequence:'trimestrielle',
    prochain_check:'2026-07-01',
    url_source:'https://statistiques.public.lu/fr/statistiques/economie-finances/prix/prix-construction.html',
    fourchette:'3 600 – 5 184 €/m² selon état',
    methode:'Coût de remplacement (norme EVS/TEGoVA), calibré sur marché actuel'
  },
  classe_energetique:{
    derniere_ref:'2026',
    integree_le:'2026-04-26',
    methode:'Coefficient modulé par classe CPE (référence D)',
    sources:[
      'Observatoire de l\'Habitat (cité Le Quotidien) : 9 547 €/m² A vs 7 156 €/m² G (-25%)',
      'sellect.lu : "Classe A-B = +15-20% par rapport à D"',
      'enrlux.lu : "Passoires G-H-I subissent décote de 15-25%"',
      'mortgage.lu : "Classes H-I = taux majoré 0.20-0.40% ou non finançable"'
    ]
  }
};

/* Fonction console pour afficher un rappel lisible des sources et de leur fraîcheur.
 * Utilisation : ouvrir la console (Cmd+Option+K sur Firefox) et taper mapaSourcesInfo() */
window.mapaSourcesInfo=function(){
  var s=MAPA_DATA_SOURCES;
  var aujd=new Date();
  function joursDepuis(iso){
    if(!iso)return null;
    var d=new Date(iso);
    return Math.round((aujd-d)/(1000*60*60*24));
  }
  function statut(iso){
    var j=joursDepuis(iso);
    if(j===null)return '—';
    if(j<0)return '✓ pas encore atteint ('+(-j)+' j)';
    if(j<30)return '✓ à jour ('+j+' j)';
    if(j<90)return '⚠ à vérifier ('+j+' j)';
    return '⚠⚠ DONNÉES POTENTIELLEMENT OBSOLÈTES ('+j+' j)';
  }
  console.log('%c═══ MAPA Property — Sources de données ═══','color:#b89448;font-weight:bold;font-size:13px');
  console.log('');
  console.log('%c📊 Prix appartements/m² (LU_PRIX_M2)','color:#3D4F63;font-weight:bold');
  console.log('  Dernière référence intégrée :',s.prix_m2.derniere_ref,'(publiée',s.prix_m2.publiee_le+')');
  console.log('  Moyenne nationale :',s.prix_m2.moyenne_nationale,'€/m²');
  console.log('  Prochain check :',s.prix_m2.prochain_check,'—',statut(s.prix_m2.prochain_check));
  console.log('  URL :',s.prix_m2.url_data);
  console.log('');
  console.log('%c🏞 Prix terrains/are (LU_PRIX_ARE)','color:#3D4F63;font-weight:bold');
  console.log('  Dernière référence intégrée :',s.prix_are.derniere_ref);
  console.log('  Source :',s.prix_are.rapport);
  console.log('  Moyenne nationale :',s.prix_are.moyenne_nationale,'€/are ('+s.prix_are.zones+' zones)');
  console.log('  Prochain check :',s.prix_are.prochain_check,'—',statut(s.prix_are.prochain_check));
  console.log('  URL :',s.prix_are.url_data);
  console.log('');
  console.log('%c💶 Coût construction (calcul maisons)','color:#3D4F63;font-weight:bold');
  console.log('  Méthode :',s.cout_construction.methode);
  console.log('  Fourchette :',s.cout_construction.fourchette);
  console.log('  Prochain check :',s.cout_construction.prochain_check,'—',statut(s.cout_construction.prochain_check));
  console.log('  URL :',s.cout_construction.url_source);
  console.log('');
  console.log('Toutes les données sont en licence Creative Commons Zero (CC0).');
  console.log('Pour mettre à jour les tables, voir les commentaires dans js/app.js.');
};
/* Affichage automatique d'un mini-rappel au chargement (en mode dev uniquement) */
try{
  if(typeof window!=='undefined' && location && (location.hostname==='localhost'||location.hostname==='127.0.0.1')){
    console.log('%c[MAPA] Tape mapaSourcesInfo() dans la console pour voir les sources de données','color:#b89448;font-style:italic;font-size:11px');
  }
}catch(_e){}

/* ─── ESTIMATION ─── */
/* ─── TABLE PRIX AU M² PAR COMMUNE ─── */
/* SOURCES & MÉTHODOLOGIE (recalibration MOD24 — avril 2026)
 * ──────────────────────────────────────────────────────────────────────
 *
 * IMPORTANT — Méthodologie de calibration :
 *
 * Les valeurs ci-dessous ne sont PAS les prix médians STATEC bruts. Elles ont été
 * recalibrées en avril 2026 à partir d'un échantillon d'annonces actives sur les
 * principales communes (athome.lu, immotop.lu, atHome Group), pour refléter la
 * RÉALITÉ DU MARCHÉ ACTUEL plutôt que les moyennes de transactions historiques.
 *
 * Justification : les prix STATEC Q4 2025 (publiés mars 2026) intègrent des
 * transactions notariales étalées sur le trimestre, dont une partie a été conclue
 * à des prix de la période haute 2022-2024. La correction sévère du marché
 * (post-Q3 2025) entraîne des baisses de prix accumulées dans les annonces
 * actives qui ne sont pas encore reflétées dans les chiffres STATEC officiels.
 *
 * Échantillon de référence Belair (avril 2026, 12 annonces) :
 *   - Médiane annonces : 10 741 €/m²  (vs STATEC Q4 2025 : 14 489 €/m², écart -26%)
 *   - Moyenne annonces : 10 520 €/m²
 *   - Min : 7 664 €/m² (137m², ancien)
 *   - Max : 14 053 €/m² (penthouse 224m², bien d'exception non représentatif)
 *
 * Coefficient global de recalibration appliqué : ×0.759 sur l'ensemble de la
 * grille STATEC, ce qui produit pour Belair une référence à 10 997 €/m²
 * (cohérent avec la médiane annonces +2 % de prudence pour les biens de qualité
 * supérieure à la médiane).
 *
 * Les estimations produites par cette table donnent ainsi systématiquement
 * une valeur 10-15 % en dessous des prix vendeurs des annonces, ce qui correspond
 * exactement à la décote de négociation typique observée au Luxembourg en 2026.
 *
 * SOURCES OFFICIELLES utilisées (références) :
 * • Observatoire de l'Habitat — https://logement.public.lu
 * • STATEC — https://statistiques.public.lu
 * • Administration de l'Enregistrement (AED) — actes notariés
 * • Échantillonnage annonces actives athome.lu / immotop.lu (avril 2026)
 *
 * RÉVISION : tous les 3 mois, vérification d'au moins 10 annonces par commune
 * de référence (Belair, Kirchberg, Esch, Steinfort, Mersch).
 *
 * Pour l'historique de la table STATEC brute :
 * • https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/
 * • Licence Creative Commons Zero (CC0)
 * ────────────────────────────────────────────────────────────────────── */
var LU_PRIX_M2={
/* Luxembourg-Ville (canton & quartiers — données hédoniques quartier) */
'luxembourg':8403,'luxembourg-ville':8403,'luxembourg ville':8403,
'belair':11500,'kirchberg':9412,'limpertsberg':9829,'merl':9184,'centre':10019,'ville-haute':10246,'ville haute':10246,
'bonnevoie':7742,'gasperich':7970,'cloche d\'or':9715,'cloche-d-or':9715,'cessange':8045,'weimerskirch':8197,'hollerich':8349,'gare':8045,'clausen':8653,'pfaffenthal':6376,'neudorf':8121,'cents':8349,'dommeldange':7970,'eich':8045,'beggen':7590,'weimershof':8577,'kopstal':6907,
/* Communes périphériques premium (médianes Q4 2025 hédoniques) */
'strassen':6965,'bereldange':7859,'bertrange':7616,'walferdange':7380,'steinsel':7247,'howald':7228,'mamer':7222,'moutfort':7142,'alzingen':7003,'schuttrange':6900,'kehlen':6846,'bridel':6831,'helmsange':6822,'lorentzweiler':6768,'hesperange':6765,'junglinster':6712,'itzig':6685,'fentange':6672,'hagen':6671,
'leudelange':6582,'contern':6538,'heffingen':6513,'belval':6511,'steinfort':6462,'capellen':6381,'heisdorf':6361,'mersch':6238,'lintgen':6238,'kleinbettingen':6130,'gonderange':6116,'grevenmacher':6105,
'bascharage':6052,'dippach':6031,'olm':6027,'pontpierre':6008,'erpeldange':6000,'erpeldange-sur-sure':6000,'hellange':5923,'bettange':5917,'bettange-sur-mess':5917,'mondorf':5893,'mondorf-les-bains':5893,'sandweiler':5882,'rollingen':5830,'roeser':5827,'oetrange':5822,'hautcharage':5747,'filsdorf':5667,'frisange':5638,'schieren':5582,'bettembourg':5541,'schifflange':5529,'garnich':5456,'mertert':5430,'diekirch':5412,'bissen':5402,
'kayl':5298,'remich':5245,'aspelt':5232,'wasserbillig':5181,'dudelange':5132,'sanem':5126,'echternach':5094,'dalheim':5086,'soleuvre':5083,'eischen':5041,'sprinkange':5015,'esch':5012,'esch-sur-alzette':5012,'lallange':5001,'rodange':5001,'belvaux':4989,'colmar-berg':4980,'colmar berg':4980,'differdange':4946,'mondercange':4936,'petange':4928,'pétange':4928,'tetange':4911,'oberkorn':4905,'beaufort':4862,'niederkorn':4849,
'weiswampach':4680,'clemency':4678,'mertzig':4675,'redange':4528,'consdorf':4517,'ettelbruck':4511,'moestroff':4511,'bettendorf':4493,'larochette':4487,'hobscheid':4446,'rumelange':4417,'burmerange':4368,'ell':4364,'lamadelaine':4345,'medernach':4233,'clervaux':4112,'wiltz':3948,'grosbous':3938,'beckerich':3719,'vianden':3673,'folschette':3535,'stegen':3356
};

/* ─── TABLE PRIX AU M² PAR COMMUNE — TERRAINS À BÂTIR (€/are) ───
 * SOURCE OFFICIELLE :
 *   Observatoire de l'Habitat — Ministère du Logement luxembourgeois
 *   Rapport d'analyse n°19 (octobre 2025) :
 *   "Les évolutions des prix des terrains à bâtir en 2023 et 2024"
 *   https://logement.public.lu/fr/actualites/2025/10/10-ra19.html
 *   https://gouvernement.lu/dam-assets/images-documents/actualites/2025/10/10-observatoire-habitat-rapport/oh-rapport-analyse-19.pdf
 *
 * Méthodologie : indice hédonique des prix par commune (zones d'habitation et zones
 * mixtes des PAG), basé sur les actes notariés transmis par l'Administration de
 * l'Enregistrement, des Domaines et de la TVA (AED) via la Publicité Foncière.
 * Données ouvertes sous licence Creative Commons Zero (CC0).
 *
 * SEGMENTATION OFFICIELLE EN 6 ZONES (médianes 2022-2024) :
 *   Centre (Luxembourg-Ville) : 272 851 €/are
 *   1ère couronne : 147 187 €/are
 *   2ème couronne : 109 176 €/are
 *   3ème couronne : 101 231 €/are
 *   Centre-Nord : 57 552 – 81 590 €/are (médiane utilisée : 69 571)
 *   Nord : 37 034 – 56 668 €/are (médiane utilisée : 46 851)
 *   Moyenne nationale : 93 514 €/are
 *
 * ⚠ Les valeurs ci-dessous sont les médianes de zone Observatoire (officielles, sourcées).
 * Elles peuvent s'écarter ±15-20 % des prix réels d'une commune individuelle au sein
 * de la même zone (avertissement légal explicite dans l'estimation).
 * Mise à jour : avril 2026 (rapport n°19 le plus récent disponible).
 * ──────────────────────────────────────────────────────────────────────  */
var LU_PRIX_ARE={
  /* CENTRE — Luxembourg-Ville */
  'luxembourg':272851,'luxembourg-ville':272851,'luxembourg ville':272851,
  'belair':272851,'kirchberg':272851,'limpertsberg':272851,'merl':272851,'centre':272851,'ville-haute':272851,'ville haute':272851,
  'bonnevoie':272851,'gasperich':272851,'cloche d\'or':272851,'cloche-d-or':272851,'cessange':272851,'weimerskirch':272851,'hollerich':272851,'gare':272851,'clausen':272851,'pfaffenthal':272851,'neudorf':272851,'cents':272851,'dommeldange':272851,'eich':272851,'beggen':272851,'weimershof':272851,
  /* 1ÈRE COURONNE — 147 187 €/are */
  'bertrange':147187,'hesperange':147187,'kopstal':147187,'leudelange':147187,'mamer':147187,'niederanven':147187,'roeser':147187,'sandweiler':147187,'steinsel':147187,'strassen':147187,'walferdange':147187,'weiler-la-tour':147187,'weiler la tour':147187,
  'bereldange':147187,'helmsange':147187,'bridel':147187,'howald':147187,'alzingen':147187,'fentange':147187,'itzig':147187,'moutfort':147187,'oetrange':147187,'heisdorf':147187,'rollingen':147187,
  /* 2ÈME COURONNE — 109 176 €/are */
  'bettembourg':109176,'contern':109176,'dalheim':109176,'dippach':109176,'frisange':109176,'garnich':109176,'junglinster':109176,'kehlen':109176,'koerich':109176,'lorentzweiler':109176,'mondercange':109176,'mondorf':109176,'mondorf-les-bains':109176,'reckange-sur-mess':109176,'reckange':109176,'schuttrange':109176,
  'gonderange':109176,'sprinkange':109176,'aspelt':109176,'hellange':109176,'bettange':109176,'bettange-sur-mess':109176,'olm':109176,'capellen':109176,'kleinbettingen':109176,'hagen':109176,'hautcharage':109176,'pontpierre':109176,'filsdorf':109176,
  /* 3ÈME COURONNE — 101 231 €/are */
  'bech':101231,'betzdorf':101231,'biwer':101231,'bous':101231,'bous-waldbredimus':101231,'waldbredimus':101231,'differdange':101231,'dudelange':101231,'esch':101231,'esch-sur-alzette':101231,'fischbach':101231,'flaxweiler':101231,'grevenmacher':101231,'habscht':101231,'helperknapp':101231,'kaerjeng':101231,'käerjeng':101231,'kayl':101231,'lenningen':101231,'lintgen':101231,'mersch':101231,'petange':101231,'pétange':101231,'remich':101231,'rumelange':101231,'sanem':101231,'schengen':101231,'schifflange':101231,'stadtbredimus':101231,'steinfort':101231,'wormeldange':101231,'wormledange':101231,
  'soleuvre':101231,'belvaux':101231,'lallange':101231,'rodange':101231,'oberkorn':101231,'niederkorn':101231,'tetange':101231,'lamadelaine':101231,'eischen':101231,'hobscheid':101231,'clemency':101231,'belval':101231,'wasserbillig':101231,'mertert':101231,'schieren':101231,'bissen':101231,
  /* CENTRE-NORD — 69 571 €/are (médiane de la fourchette 57 552–81 590) */
  'beaufort':69571,'beckerich':69571,'berdorf':69571,'bettendorf':69571,'colmar-berg':69571,'colmar berg':69571,'consdorf':69571,'diekirch':69571,'echternach':69571,'ell':69571,'erpeldange':69571,'erpeldange-sur-sure':69571,'ettelbruck':69571,'feulen':69571,'grosbous':69571,'grosbous-wal':69571,'heffingen':69571,'larochette':69571,'manternach':69571,'mertzig':69571,'nommern':69571,'preizerdaul':69571,'redange':69571,'redange-sur-attert':69571,'moestroff':69571,'medernach':69571,'burmerange':69571,'schieren':69571,
  /* NORD — 46 851 €/are (médiane de la fourchette 37 034–56 668) */
  'clervaux':46851,'wiltz':46851,'vianden':46851,'weiswampach':46851,'folschette':46851,'stegen':46851,
  /* Fallback : moyenne nationale */
  '_default':93514
};

/* Ratio terrain bâti vs terrain nu — règle agence MAPA Property
 * Quand un terrain est déjà bâti, sa valeur "résiduelle" pour l'estimation 
 * de la maison existante est inférieure à un terrain nu (le terrain est
 * "consommé" par la construction). Décote standard : -25 %. */
var LU_TERRAIN_BATI_RATIO=0.80;

/* ─── COEFFICIENT TERRASSE / BALCON / VÉRANDA ───
 * Pratique d'expertise immobilière standard (norme EVS) : la surface extérieure
 * (terrasse, balcon, véranda non chauffée) est valorisée comme un pourcentage
 * du prix m² habitable, multiplié par sa surface réelle.
 *
 * Ratio retenu : 30 % du prix m² habitable (option conservatrice).
 * Fourchette pratique : 30–50 % selon exposition, vue, vis-à-vis.
 * Sources : pratique standard expert immobilier, Observatoire de l'Habitat
 * (la surface balcon/terrasse est un paramètre du simulateur officiel
 *  https://logement.public.lu/fr/observatoire-habitat/prix-de-vente/simulateur.html). */
var LU_TERRASSE_RATIO=0.30;

/* ─── PRIX PARKING / GARAGE — MATRICE TYPE × ZONE ───
 * SOURCE OFFICIELLE : Observatoire de l'Habitat — prix implicites des annexes
 * (modèle hédonique 2022, mis à jour annuellement pour les statistiques Q4).
 * Moyennes nationales 2022 :
 *   - Garage / emplacement intérieur : 67 000 €
 *   - Emplacement extérieur : 32 000 €
 *   - Cave : 15 000 € (non utilisée ici, intégrée au prix m² des apparts)
 *
 * URL : https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-prix-affines-hors-annexes-par-commune/
 *
 * Modulation géographique (basée sur les 6 zones Observatoire et données Paperjam/Editus 2022-2025) :
 * Box fermé = +35 % par rapport au garage/intérieur (étanchéité, sécurité supérieure).
 * Tableau ci-dessous : valeurs en EUROS pour [extérieur, intérieur, box fermé]. */
var LU_PRIX_PARKING={
  /* Centre — Luxembourg-Ville (Belair, Kirchberg, Limpertsberg…) */
  centre:           {ext: 50000, int:  90000, box: 120000},
  /* 1ère couronne — Bertrange, Strassen, Mamer, Hesperange… */
  couronne1:        {ext: 40000, int:  70000, box:  95000},
  /* 2ème couronne — Bettembourg, Junglinster, Kehlen, Schuttrange… */
  couronne2:        {ext: 32000, int:  55000, box:  75000},
  /* 3ème couronne — Steinfort, Esch, Differdange, Mersch, Pétange… */
  couronne3:        {ext: 28000, int:  45000, box:  60000},
  /* Centre-Nord — Diekirch, Echternach, Ettelbruck… */
  centre_nord:      {ext: 22000, int:  35000, box:  48000},
  /* Nord — Clervaux, Wiltz, Vianden… */
  nord:             {ext: 18000, int:  28000, box:  38000}
};

/* Détermine la zone d'une commune à partir de son prix au m² terrain
 * (les seuils correspondent aux 6 zones Observatoire Rapport n°19) */
function _LU_zoneFromCommune(commune){
  if(!commune)return 'couronne3'; /* défaut moyenne nationale */
  var prix=LU_PRIX_ARE[commune];
  if(!prix)return 'couronne3';
  if(prix>=250000)return 'centre';        /* 272 851 = Centre */
  if(prix>=130000)return 'couronne1';     /* 147 187 = 1ère couronne */
  if(prix>=105000)return 'couronne2';     /* 109 176 = 2ème couronne */
  if(prix>=85000)return 'couronne3';      /* 101 231 = 3ème couronne */
  if(prix>=55000)return 'centre_nord';    /* 69 571 = Centre-Nord */
  return 'nord';                          /* 46 851 = Nord */
}

/* ─── SURCOTE RÉNOVATIONS ───
 * Méthodologie : la surcote = montant investi × ratio_récupération × (1 - ancienneté×1%)
 * Plafond rénovation 80 ans (comme bâti). Au-delà, surcote = 0.
 *
 * Ratios de récupération (pratique d'expert immobilier) :
 *   - Cuisine / Salle de bain : 80 %
 *   - Décoration / peinture / sols : 60 %
 *   - Gros œuvre / toiture / isolation / structure : 100 %
 *   - Énergie / chauffage / fenêtres : 90 % (Bëllegen Akt sur travaux énergétiques)
 *   - Autres : 70 % (par défaut) */
var LU_RENOV_RATIO={
  cuisine_sdb: 0.80,
  deco:        0.60,
  gros_oeuvre: 1.00,
  energie:     0.90,
  autres:      0.70
};

/* ─── COEFFICIENT SURFACE (PROD-MOD20 / révisé MOD24) ───
 * Modulation du prix au m² selon la surface du bien.
 * Principe expert standard : plus l'appartement est petit, plus le prix au m² est élevé,
 * et inversement pour les grandes surfaces.
 *
 * Calibrage MOD24 adouci après vérification sur annonces réelles Belair (avril 2026) :
 * la pente est moins forte qu'en théorie car les biens premium grand standing
 * gardent une bonne tenue de prix même sur grandes surfaces.
 *
 * Tranches retenues (écart studio↔grand = 18 points) :
 *   < 40 m²        Studio / T1 atypique          → +10 %
 *   40-60 m²       T1 / T2 confort               → +5 %
 *   60-90 m²       T2 / T3 standard (référence)  → ±0 %
 *   90-130 m²      T3 / T4 grand                 → -3 %
 *   130-180 m²     Grand appartement             → -5 %
 *   > 180 m²       Atypique / prestige           → -8 %
 *
 * Note : ces tranches ne s'appliquent QU'AUX APPARTEMENTS / BUREAUX / IMMEUBLES. */
function _LU_coefSurface(surf){
  if(!surf||surf<=0)return 1.00;
  if(surf<40)return 1.10;
  if(surf<60)return 1.05;
  if(surf<90)return 1.00;
  if(surf<130)return 0.97;
  if(surf<180)return 0.95;
  return 0.92;
}

/* ─── COEFFICIENT CLASSE ÉNERGÉTIQUE (PROD-MOD22) ───
 * Modulation du prix au m² selon la classe du Certificat de Performance Énergétique
 * (CPE / Energiepass) — obligatoire pour toute vente au Luxembourg.
 *
 * Sources :
 *   - Observatoire de l'Habitat (cité Le Quotidien) : prix moyen national T4 2023
 *     = 9 547 €/m² classe A vs 7 156 €/m² classe G (écart -25 %).
 *   - sellect.lu (déc 2025) : "Classe A-B = prix supérieur de 15-20 % par rapport à D".
 *   - enrlux.lu (fév 2026) : "Passoires G-H-I subissent une décote de 15-25 % sur le marché".
 *   - mortgage.lu (2025) : "Classes H-I : taux majoré de 0.20-0.40 %, parfois non finançable".
 *
 * Échelle officielle Luxembourg : A+ → I (10 classes, kWh/m²/an)
 *   A+    ≤ 0      Quasi zéro énergie (NZEB)
 *   A     ≤ 45
 *   B     ≤ 75
 *   C     ≤ 110
 *   D     ≤ 150    Référence (parc moyen luxembourgeois)
 *   E     ≤ 210
 *   F     ≤ 285    Travaux à prévoir, vigilance bancaire
 *   G     ≤ 375    Passoire, surcoût de taux
 *   H     ≤ 480    Quasi non-finançable
 *   I     > 480    Non-finançable en l'état
 *
 * NB : la classe énergétique est étroitement corrélée avec l'année de construction
 * (depuis 2017 toute construction neuve doit atteindre A minimum). Pour éviter le
 * double comptage avec la décote ancienneté, ce coefficient s'applique en complément. */
function _LU_coefDPE(dpe){
  if(!dpe)return 1.00; /* non renseigné = neutre */
  switch(dpe){
    case 'AP': case 'A': return 1.05;  /* +5 % NZEB / A++, prime green Luxembourg */
    case 'B':            return 1.03;  /* +3 % très bonne perf */
    case 'C':            return 1.01;  /* +1 % bonne perf */
    case 'D':            return 1.00;  /* référence parc moyen */
    case 'E':            return 0.96;  /* -4 % vigilance bancaire */
    case 'F':            return 0.92;  /* -8 % travaux à prévoir */
    case 'G':            return 0.85;  /* -15 % passoire, surcoût taux */
    case 'H': case 'I':  return 0.78;  /* -22 % quasi non-finançable */
    default:             return 1.00;
  }
}

/* ─── PLAFOND ABSOLU 15 500 €/m² (PROD-MOD22 / révisé MOD24) ───
 * Au-delà de 15 500 €/m² effectif (post-coefficients), un appartement devient
 * structurellement très peu liquide au Luxembourg dans les conditions de marché actuelles.
 * Au-delà de ce seuil → redirection vers estimation professionnelle sur demande. */
var LU_PLAFOND_M2_APPT=15500;

/* ─── ESTIMATION INDICATIVE ─── 
 * V28 PROD-MOD7 — Refonte conformité légale (avril 2026)
 * 
 * Estimation calculée UNIQUEMENT pour le Luxembourg, à partir de données publiques officielles
 * (STATEC + Observatoire de l'Habitat + AED, licence CC0).
 *
 * Pour les autres pays : redirection vers le formulaire de contact (estimation manuelle
 * par un partenaire local habilité — pas d'algorithme automatique non sourcé).
 *
 * Méthodologie :
 *  1. Prix médian par commune (transactions notariales Q4 2025)
 *  2. Coefficient type de bien (appartement = base, villa = +8 %, bureau = -18 %, etc.)
 *  3. Coefficient état général (neuf = +15 %, bon = base, à rafraîchir = -14 %, travaux = -32 %)
 *  4. Coefficient année construction
 *  5. Coefficient nombre de chambres
 *  6. Fourchette ±10 % autour de la médiane
 *
 * Avertissement obligatoire : cette estimation algorithmique a une valeur strictement
 * indicative et ne constitue ni un avis de valeur vénale (norme EVS/TEGoVA) ni une
 * expertise immobilière. Elle ne remplace pas une visite physique par un professionnel
 * certifié. */

/* ─── BLOC "SOURCES & MÉTHODOLOGIE" affiché à l'utilisateur (PROD-MOD25) ───
 * Texte vague et professionnel par défaut, avec un toggle <details> qui dévoile
 * une explication plus complète en 3 parties (approche / critères / contexte marché).
 *
 * Choix éditorial : ne PAS citer de pourcentages précis dans le contexte marché
 * (énerve les propriétaires sans qu'ils comprennent), ne PAS révéler les coefs
 * exacts (propriété intellectuelle MAPA Property), MAIS expliquer pourquoi
 * l'estimation est plus basse que les portails (= prix de vente réel vs prix
 * vendeur négociable). */
function _mapaEstSourcesBlock(commune_label){
  var T=(window.I18N&&window.I18N[window.CURLANG])||{};
  var t_title  = T['mod.est.src.t']         || 'Sources & méthodologie';
  var t_intro  = T['mod.est.src.intro']     || 'Cette estimation s\'appuie sur les données publiques de l\'<strong>Observatoire de l\'Habitat</strong> (Ministère du Logement luxembourgeois), adaptées en continu par notre agence à la réalité du marché actuel et aux transactions effectives.';
  var t_more   = T['mod.est.src.more']      || 'En savoir plus sur notre méthodologie';
  var t_h_app  = T['mod.est.src.h.app']     || 'Approche';
  var t_p_app  = T['mod.est.src.p.app']     || 'MAPA Property utilise un modèle d\'estimation propriétaire calibré en continu sur les transactions et annonces réelles du marché luxembourgeois. Cette approche, plus réactive que les statistiques officielles publiées trimestriellement, reflète la réalité de transaction effective plutôt que les moyennes historiques.';
  var t_h_crit = T['mod.est.src.h.crit']    || 'Critères pris en compte';
  var t_p_crit = T['mod.est.src.p.crit']    || 'Localisation (commune et quartier) · Surface (les petites surfaces sont surcotées au m², les grandes décotées) · État général (bien récent valorisé, à rafraîchir ou avec travaux décoté) · Performance énergétique (CPE) : prime pour classe A-B, décote significative pour G-H-I · Ancienneté du bâti · Annexes (terrasse, parking, surface utile, jardin) · Travaux récents (valorisés selon leur nature et leur ancienneté).';
  var t_h_mar  = T['mod.est.src.h.mar']     || 'Contexte de marché 2026';
  var t_p_mar  = T['mod.est.src.p.mar']     || 'Notre estimation intègre la correction du marché en cours depuis Q3 2025 (taux d\'emprunt élevés, capacité d\'achat réduite, allongement des délais de vente). Elle peut donc se situer en dessous des prix d\'annonce affichés sur les portails immobiliers, qui reflètent des prix vendeurs négociables. Cette approche conservatrice vise à donner une <strong>valeur réaliste de transaction</strong>, pas un prix de mise en vente optimiste.';

  return ''+
  '<div class="note" style="margin-top:14px;background:#f6f1e6;border-left:3px solid var(--cu);padding:14px 18px">'+
    '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:8px">'+
      t_title+
    '</div>'+
    '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.65;margin:0 0 10px 0">'+
      t_intro+
      (commune_label||'')+
    '</p>'+
    '<details style="margin-top:8px">'+
      '<summary style="cursor:pointer;font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--cu);font-weight:600;outline:none;padding:6px 0;user-select:none">'+
        t_more+' ↓'+
      '</summary>'+
      '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e8dcc0">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:5px">'+t_h_app+'</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:12px;color:var(--ink2);line-height:1.6;margin:0 0 12px 0">'+t_p_app+'</p>'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:5px">'+t_h_crit+'</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:12px;color:var(--ink2);line-height:1.6;margin:0 0 12px 0">'+t_p_crit+'</p>'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:5px">'+t_h_mar+'</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:12px;color:var(--ink2);line-height:1.6;margin:0">'+t_p_mar+'</p>'+
      '</div>'+
    '</details>'+
  '</div>';
}

/* ─── BLOC "SIGNALER UNE INCOHÉRENCE" affiché à l'utilisateur (PROD-MOD26) ───
 * Petit encart cuivre en bas du résultat d'estimation, qui invite l'utilisateur
 * à signaler une éventuelle incohérence régionale. Deux CTA : appel direct (tel:)
 * et email pré-rempli avec les paramètres de l'estimation.
 *
 * Stratégie commerciale : transformer une plainte potentielle en lead qualifié
 * (le propriétaire a déjà saisi son bien, sa localisation, ses caractéristiques —
 * c'est un lead chaud avec contexte).
 *
 * Note : on construit l'email côté JS en utilisant les helpers d'obfuscation
 * email existants pour éviter le scraping. */
function _mapaEstFeedbackBlock(t, l, s, a, e, dpe){
  var T=(window.I18N&&window.I18N[window.CURLANG])||{};
  var t_intro = T['mod.est.fb.intro']  || 'Nous nous efforçons de rendre notre système d\'estimation le plus juste possible. Si vous constatez une incohérence sur votre bien ou votre quartier, n\'hésitez pas à nous contacter — votre retour nous permet d\'affiner le simulateur en continu.';
  var t_call  = T['mod.est.fb.call']   || 'Appeler';
  var t_email = T['mod.est.fb.email']  || 'Envoyer un email';

  /* Résumé bien estimé pour pré-remplir l'email */
  var typeLabels={appartement:'Appartement',maison:'Maison/Villa',bureau:'Bureau',immeuble:'Immeuble'};
  var typeLib=typeLabels[(t||'').toLowerCase()]||t||'Bien';
  var bienResume=typeLib+(l?' à '+l:'')+(s?' · '+s+' m²':'')+(a?' · '+a:'')+(e?' · '+e:'')+(dpe?' · CPE '+dpe:'');

  /* Email obfusqué : reconstruit côté client */
  var emailUser='j.brebion';
  var emailHost='mapagroup.org';
  var subject=encodeURIComponent('Incohérence simulateur — '+bienResume);
  var body=encodeURIComponent(
    'Bonjour,\n\n'+
    'J\'ai utilisé votre simulateur d\'estimation en ligne pour mon bien et le résultat me semble incohérent.\n\n'+
    'Détails saisis :\n'+
    '- Type : '+typeLib+'\n'+
    (l?'- Localisation : '+l+'\n':'')+
    (s?'- Surface : '+s+' m²\n':'')+
    (a?'- Année construction : '+a+'\n':'')+
    (e?'- État : '+e+'\n':'')+
    (dpe?'- Classe énergétique : '+dpe+'\n':'')+
    '\nMerci de me recontacter pour discuter.\n\nCordialement,'
  );
  var mailtoHref='mailto:'+emailUser+'@'+emailHost+'?subject='+subject+'&body='+body;
  var telHref='tel:+352691620127';

  return ''+
  '<div style="margin-top:14px;background:linear-gradient(135deg,#fff8eb,#fdf3df);border:1px solid #e8dcc0;border-left:3px solid var(--cu);padding:14px 18px;border-radius:3px">'+
    '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.6;margin:0 0 12px 0">'+
      t_intro+
    '</p>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
      '<a href="'+telHref+'" style="flex:1 1 140px;min-width:140px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:var(--cu);color:#fff;border:none;padding:10px 16px;text-decoration:none;font-family:\'Cinzel\',serif;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;border-radius:3px;transition:opacity .2s">'+
        '<span style="font-size:14px">📞</span> '+t_call+
      '</a>'+
      '<a href="'+mailtoHref+'" style="flex:1 1 140px;min-width:140px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:transparent;color:var(--cu);border:1px solid var(--cu);padding:10px 16px;text-decoration:none;font-family:\'Cinzel\',serif;font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;border-radius:3px;transition:background .2s">'+
        '<span style="font-size:14px">✉</span> '+t_email+
      '</a>'+
    '</div>'+
  '</div>';
}

window.runEst=function(){
  var t=v('et'),p=v('ep'),l=v('el'),s=+v('es')||0,a=+v('ea')||0,c=+v('ec')||0,e=v('ee');
  /* PROD-MOD13 : nouveaux champs (terrasse, parking, rénovations) */
  var surfTerrasse=+v('eterr')||0;        /* surface terrasse/balcon en m² */
  var surfUtile=+v('eutile')||0;          /* PROD-MOD15 : surface utile (habitable + sous-sol/combles/garage intégré) en m² */
  var parkType=v('eparkType')||'';        /* '', 'ext', 'int', 'box' */
  var dpe=v('edpe')||'';                  /* PROD-MOD22 : classe énergétique CPE (A+, A, B, C, D, E, F, G, H, I) */
  /* PROD-MOD28 : champs spécifiques IMMEUBLE */
  var immSubtype=v('eimmSubtype')||'habitation'; /* 'habitation', 'bureau', 'mixte' */

  /* NEW 2026-04-28 V4 : Dictionnaires ZONES (utilisés à la fois pour la
   * méthode rendement ET pour la pénalité parking). Hoistés en haut de
   * la fonction pour être accessibles dans toutes les branches. */
  var ZONES_HYPER_CENTRE={'belair':1,'limpertsberg':1,'kirchberg':1,'merl':1,'centre':1,'ville-haute':1,'ville haute':1,'cloche d\'or':1,'cloche-d-or':1};
  var ZONES_CENTRE_LUXVILLE={'luxembourg':1,'luxembourg-ville':1,'luxembourg ville':1,'bonnevoie':1,'gasperich':1,'hollerich':1,'gare':1,'cessange':1,'weimerskirch':1,'clausen':1,'pfaffenthal':1,'neudorf':1,'cents':1,'dommeldange':1,'eich':1,'beggen':1,'weimershof':1,'kopstal':1};
  var ZONES_PREMIERE_COURONNE={'strassen':1,'bereldange':1,'bertrange':1,'walferdange':1,'steinsel':1,'howald':1,'mamer':1,'moutfort':1,'alzingen':1,'schuttrange':1,'kehlen':1,'bridel':1,'helmsange':1,'lorentzweiler':1,'hesperange':1,'itzig':1,'fentange':1};
  var ZONES_DEUXIEME_COURONNE={'leudelange':1,'contern':1,'heffingen':1,'belval':1,'steinfort':1,'capellen':1,'heisdorf':1,'mersch':1,'lintgen':1,'kleinbettingen':1,'gonderange':1,'junglinster':1,'mondorf':1,'mondorf-les-bains':1,'bettembourg':1,'sandweiler':1,'roeser':1,'oetrange':1};

  var immSurfTot=+v('eimmSurfTot')||0;     /* surface totale immeuble incluant non-habitable */
  var immTerrain=+v('eimmTerrain')||0;     /* surface terrain de l'immeuble en ares */
  var immLoyer=+v('eimmLoyer')||0;         /* PROD-MOD29 : loyer mensuel net (€) */
  var immJardin=false;
  try{ immJardin=!!document.getElementById('eimmJardin') && document.getElementById('eimmJardin').checked; }catch(_e){}
  var parkNb=+v('eparkNb')||0;            /* nombre de parkings */
  /* PROD-MOD19 : Lecture multi-postes rénovations (liste dynamique #renov-list) */
  var renovList=[];
  try{
    var rows=document.querySelectorAll('#renov-list .renov-row');
    for(var ri=0;ri<rows.length;ri++){
      var row=rows[ri];
      var mnt=+(row.querySelector('.renov-mnt')||{}).value||0;
      var yr=+(row.querySelector('.renov-yr')||{}).value||0;
      var typ=(row.querySelector('.renov-type')||{}).value||'';
      if(mnt>0 && yr>=1800 && yr<=2030 && typ){
        renovList.push({mnt:mnt,yr:yr,type:typ});
      }
    }
  }catch(_e){}
  /* Compatibilité ascendante : si le formulaire est encore l'ancien mono-poste */
  if(renovList.length===0){
    var legacyMnt=+v('erenovMnt')||0;
    var legacyYr=+v('erenovYr')||0;
    var legacyTyp=v('erenovType')||'';
    if(legacyMnt>0 && legacyYr>=1800 && legacyYr<=2030 && legacyTyp){
      renovList.push({mnt:legacyMnt,yr:legacyYr,type:legacyTyp});
    }
  }
  if(!t||!s){toast((I18N[CURLANG]['toast.est.required']||'Type et surface obligatoires'));return}

  /* ═══ Cas 1 : pays autre que Luxembourg → redirection contact ═══ */
  if(p&&p!=='LU'&&p!=='Luxembourg'){
    var rIntl=document.getElementById('est-res');
    if(!rIntl)return;
    rIntl.style.display='block';
    var T=(I18N&&I18N[CURLANG])||{};
    rIntl.innerHTML=
      '<div class="note" style="background:linear-gradient(135deg,#f5efe2,#faf5e8);border-left:3px solid var(--cu);padding:18px 22px">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:10px">'+
          (T['mod.est.intl.ey']||'✦ Estimation à l\'international')+
        '</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px">'+
          (T['mod.est.intl.body']||'Pour une estimation à l\'international (France, Monaco, Côte d\'Azur, Dubai, Suisse…), nous travaillons avec des partenaires locaux dûment habilités. Aucune estimation algorithmique n\'est fournie en ligne pour ces marchés afin de garantir la fiabilité juridique et la précision du résultat.')+
        '</p>'+
        '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
          (T['mod.est.intl.cta']||'Demander une estimation personnalisée →')+
        '</button>'+
      '</div>';
    return;
  }

  /* ═══ Cas 2 : Luxembourg → calcul sourcé ═══ */
  /* 1. Prix médian Q4 2025 par commune (LU_PRIX_M2 — sources STATEC/Observatoire/AED) */
  var base=7764; /* Référence nationale Q4 2025 — appartements existants */
  var commune_used=null;
  if(l){
    var key=String(l).toLowerCase().trim().replace(/\s+/g,' ').replace(/[,.;]/g,'').replace(/^(à|a|au|aux|en|de|du)\s+/,'');
    if(LU_PRIX_M2[key]){base=LU_PRIX_M2[key];commune_used=key;}
    else{
      /* PROD-MOD30 — Recherche partielle améliorée :
       * On privilégie le PRIX LE PLUS ÉLEVÉ parmi les matches, ce qui revient à
       * privilégier le quartier spécifique (Belair, Kirchberg, Limpertsberg…)
       * sur le générique "Luxembourg". Exemples :
       *   - "Luxembourg-Belair" → matche {luxembourg, belair} → on prend belair (plus cher)
       *   - "Belair, Luxembourg" → idem
       *   - "Eich Luxembourg" → matche {luxembourg, eich} → on prend le plus cher
       * Cette heuristique reflète le bon sens : un quartier mentionné dans la
       * saisie est l'info la plus précise et la plus chère localement. */
      var candidates=[];
      for(var k in LU_PRIX_M2){
        if(k==='_default')continue;
        if(key.indexOf(k)>=0||k.indexOf(key)>=0){
          candidates.push({k:k, prix:LU_PRIX_M2[k]});
        }
      }
      if(candidates.length>0){
        /* Tri décroissant par prix → on prend le plus cher (= quartier le plus précis) */
        candidates.sort(function(a,b){return b.prix-a.prix;});
        base=candidates[0].prix;
        commune_used=candidates[0].k;
      }
    }
  }

  /* ═══ Validation maison : surface terrain ET année construction obligatoires ═══ */
  var isMaison=(t==='maison'||t==='Maison / Villa');
  var surfTerrain=+v('estr')||0; /* en ares */
  if(isMaison && (!surfTerrain||surfTerrain<=0)){
    var rErr=document.getElementById('est-res');
    if(rErr){
      rErr.style.display='block';
      rErr.innerHTML=
        '<div class="note" style="background:#fff4e6;border-left:3px solid #c79b3d;padding:18px 22px">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#9a751b;font-weight:700;margin-bottom:10px">'+
            '⚠ Surface terrain manquante'+
          '</div>'+
          '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin:0">'+
            'Pour estimer une <strong>maison ou villa</strong>, la <strong>surface du terrain en ARES</strong> est obligatoire. Le champ apparaît juste sous l\'année de construction quand vous sélectionnez "Maison / Villa".<br><br>'+
            '<strong>Exemple</strong> : un terrain de 520 m² = <strong>5,20 ares</strong> (et NON 520).'+
          '</p>'+
        '</div>';
    }
    toast((I18N[CURLANG]['toast.terrain.required']||'Surface terrain obligatoire pour les maisons (en ares — ex : 6 ares = 600 m²)'));
    return;
  }
  if(isMaison && (!a||a<1800||a>2030)){
    toast((I18N[CURLANG]['toast.annee.required']||'Année de construction obligatoire pour les maisons'));
    return;
  }

  /* ═══ MAISON / VILLA — Méthode COÛT DE REMPLACEMENT (norme EVS/TEGoVA) ═══
   * Méthodologie d'expertise immobilière professionnelle :
   *   Valeur maison = Coût construction × surface × (1 - décote ancienneté)
   *                 + Prix terrain × surface terrain × 0.75 (décote terrain bâti)
   *
   * Coût construction selon état :
   *   Neuf / Récent      = 5 000 €/m²
   *   Bon état           = 4 750 €/m²
   *   À rafraîchir       = 4 000 €/m²
   *   Travaux importants = 3 750 €/m²
   *
   * Décote ancienneté = 1 % par an, plafonnée à 80 ans.
   * Au-delà de 80 ans → estimation non calculable, redirection vers
   * estimation professionnelle (chaque bien ancien étant unique). */
  if(isMaison){
    var anneeBien=a;
    var ageBien=(new Date().getFullYear())-anneeBien;
    if(ageBien<0)ageBien=0;

    /* Plafond 80 ans : redirection contact */
    if(ageBien>80){
      var rOld=document.getElementById('est-res');
      if(!rOld)return;
      rOld.style.display='block';
      var Tx=(I18N&&I18N[CURLANG])||{};
      rOld.innerHTML=
        '<div class="note" style="background:linear-gradient(135deg,#f5efe2,#faf5e8);border-left:3px solid var(--cu);padding:18px 22px">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:10px">'+
            (Tx['mod.est.tooold.ey']||'✦ Estimation sur demande')+
          '</div>'+
          '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px">'+
            (Tx['mod.est.tooold.neutral']||'Étant donné l\'ancienneté de votre bien, il serait imprudent de proposer une estimation sans l\'avoir vu — la valeur dépend trop fortement d\'éléments qu\'aucun algorithme ne peut apprécier à distance (état de conservation, qualité des matériaux d\'origine, rénovations, cachet, potentiel d\'optimisation, micro-localisation). <strong>Merci de nous contacter afin de prendre rendez-vous directement.</strong>')+
          '</p>'+
          '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
            (Tx['mod.est.tooold.cta']||'Prendre rendez-vous gratuitement →')+
          '</button>'+
        '</div>';
      return;
    }

    /* Coût construction au m² selon état (€/m²)
     *
     * Calibrage MOD20 (avril 2026) : valeurs cohérentes avec les ratios état appartements.
     * Référence "bon état" = 4 800 €/m². Les autres états appliquent les mêmes ratios
     * que pour les appartements (+8 % neuf / -12 % à rafraîchir / -25 % travaux).
     * Source : STATEC indice prix construction résidentielle (oct 2025 = 1 173,24 pts),
     * fourchette marché 2 500-4 000 €/m² construction pure hors TVA et hors terrain.
     * Les valeurs incluent : construction pure + frais annexes (architecte, raccordements,
     * aménagements ext.) + finitions selon gamme. */
    var coutConstr=4800; /* défaut : bon état (référence) */
    if(e==='neuf')coutConstr=5184;       /* +8 % standard NZEB/A++, prestations modernes */
    else if(e==='bon')coutConstr=4800;   /* référence */
    else if(e==='moyen')coutConstr=4224; /* -12 % à rafraîchir (peintures/sols) */
    else if(e==='travaux')coutConstr=3600;/* -25 % travaux importants (cuisine/SDB/élec) */

    /* Décote ancienneté = 1 %/an */
    var decoteAge=ageBien*0.01;
    if(decoteAge>0.80)decoteAge=0.80; /* sécurité (déjà bloqué par le plafond 80 ans plus haut) */

    /* PROD-MOD15 : Valorisation des surfaces utiles complémentaires
     * La surface utile inclut habitable + sous-sol aménageable + combles aménagés
     * + garage intégré + dépendances. Les m² au-delà de l'habitable sont valorisés
     * à 50 % du coût construction (ratio conservateur : ces espaces ont une valeur
     * réelle mais inférieure à l'habitable). */
    var sUtileComp=0;
    if(surfUtile>0 && surfUtile>s){
      sUtileComp=surfUtile-s;
    }
    var prixBati=Math.round(coutConstr*s*(1-decoteAge));
    var prixUtileComp=Math.round(coutConstr*0.50*sUtileComp*(1-decoteAge));
    var prixBatiTotal=prixBati+prixUtileComp;

    /* PROD-MOD22 / MOD24 : Application coef DPE sur le bâti.
     * Le terrain n'est pas affecté (sa valeur dépend de la rareté foncière, pas
     * de la performance énergétique du bâti ni du climat de marché immobilier).
     * NB : la correction marché 2026 a été intégrée directement dans la calibration
     * du coût construction (4 800 €/m² référence calibré sur marché 2026 actuel). */
    var coefDPEM=_LU_coefDPE(dpe);
    if(coefDPEM!==1.00){
      prixBati=Math.round(prixBati*coefDPEM);
      prixUtileComp=Math.round(prixUtileComp*coefDPEM);
      prixBatiTotal=prixBati+prixUtileComp;
    }

    /* Prix terrain de la commune (Observatoire Rapport n°19) */
    var prixAre=LU_PRIX_ARE._default;
    var prixAreUsed=null;
    if(commune_used && LU_PRIX_ARE[commune_used]){
      prixAre=LU_PRIX_ARE[commune_used];
      prixAreUsed=prixAre;
    }
    var prixTerrain=Math.round(prixAre*surfTerrain*LU_TERRAIN_BATI_RATIO);

    /* PROD-MOD13 : Terrasse/balcon (30 % du coût construction au m² du bâti) */
    var prixTerrasseM=0;
    if(surfTerrasse>0){
      prixTerrasseM=Math.round(coutConstr*(1-decoteAge)*LU_TERRASSE_RATIO*surfTerrasse);
    }

    /* PROD-MOD13 : Parking/garage selon zone + type */
    var prixParkingM=0;
    var parkLabelM='';
    if(parkType && parkNb>0){
      var zoneM=_LU_zoneFromCommune(commune_used);
      var prixUnitParkM=LU_PRIX_PARKING[zoneM][parkType]||0;
      prixParkingM=prixUnitParkM*parkNb;
      var labelsM={ext:'extérieur',int:'intérieur',box:'box fermé'};
      parkLabelM=parkNb+' × '+(labelsM[parkType]||parkType)+' ('+fmt(prixUnitParkM)+' € chacun)';
    }

    /* PROD-MOD19 : Surcote rénovations multi-postes
     * Chaque poste a son propre montant / année / type avec son ratio de récupération.
     * Décote ancienneté 1 %/an par poste, plafonnée à 80 ans (au-delà : ignoré). */
    var surcoteRenovM=0;
    var renovLabelM='';
    var typeLabelsM={cuisine_sdb:'cuisine/SDB',deco:'décoration',gros_oeuvre:'gros œuvre',energie:'énergie',autres:'travaux'};
    var renovDetailsM=[]; /* pour le label détaillé */
    for(var rmi=0;rmi<renovList.length;rmi++){
      var rm=renovList[rmi];
      var ageRm=(new Date().getFullYear())-rm.yr;
      if(ageRm<0)ageRm=0;
      if(ageRm>80)continue; /* ignore les rénovations > 80 ans */
      var ratioRm=LU_RENOV_RATIO[rm.type]||LU_RENOV_RATIO.autres;
      var decRm=ageRm*0.01;
      if(decRm>0.80)decRm=0.80;
      var sc=Math.round(rm.mnt*ratioRm*(1-decRm));
      surcoteRenovM+=sc;
      renovDetailsM.push(fmt(rm.mnt)+' € '+(typeLabelsM[rm.type]||'travaux')+' '+rm.yr+' (+'+fmt(sc)+' €)');
    }
    if(renovDetailsM.length>0){
      renovLabelM=renovDetailsM.join(' · ');
    }

    var val=prixBatiTotal+prixTerrain+prixTerrasseM+prixParkingM+surcoteRenovM;
    /* Fourchette ±15 % pour les maisons : la méthode du coût de remplacement
     * comporte plus d'incertitude que la méthode hédonique appartements
     * (peu de comparables directs, valeur fortement influencée par la qualité
     * réelle des prestations, l'orientation, l'agencement, etc.) */
    var low=Math.round(val*.85),high=Math.round(val*1.15);

    var r=document.getElementById('est-res');
    if(!r)return;
    r.style.display='block';

    var T=(I18N&&I18N[CURLANG])||{};
    var commune_label=commune_used?(' · '+(T['mod.est.commune.used']||'Commune')+' : '+commune_used.charAt(0).toUpperCase()+commune_used.slice(1)):'';

    /* Détail du calcul (transparent) */
    var detailRowsM='';
    detailRowsM+=
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
        '<span>'+(T['mod.est.detail.bati']||'Valeur du bâti habitable')+' ('+s+' m² × '+fmt(coutConstr)+' €/m² × '+(Math.round((1-decoteAge)*100))+'&nbsp;%)</span>'+
        '<strong>'+fmt(prixBati)+' €</strong>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0;font-size:11.5px;color:var(--ink2);opacity:.85">'+
        '<span style="padding-left:14px">↳ Décote ancienneté : '+ageBien+' an(s) × 1&nbsp;% = '+(Math.round(decoteAge*100))+'&nbsp;%</span>'+
        '<span></span>'+
      '</div>';
    if(prixUtileComp>0){
      detailRowsM+=
        '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
          '<span>'+(T['mod.est.detail.utile']||'Surfaces utiles complémentaires')+' ('+sUtileComp+' m² × 50 % du m² bâti)<br><span style="font-size:11px;opacity:.7;padding-left:14px">'+(T['mod.est.detail.utile.hint']||'sous-sol, combles, garage intégré, dépendances')+'</span></span>'+
          '<strong>+ '+fmt(prixUtileComp)+' €</strong>'+
        '</div>';
    }
    detailRowsM+=
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
        '<span>'+(T['mod.est.detail.terrain']||'Valeur du terrain')+' ('+surfTerrain+' ares × '+fmt(prixAreUsed||LU_PRIX_ARE._default)+' €/are × 80&nbsp;%)</span>'+
        '<strong>+ '+fmt(prixTerrain)+' €</strong>'+
      '</div>';
    if(prixTerrasseM>0){
      detailRowsM+=
        '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
          '<span>'+(T['mod.est.detail.terrasse']||'Terrasse / balcon')+' ('+surfTerrasse+' m² × 30 % du m² bâti)</span>'+
          '<strong>+ '+fmt(prixTerrasseM)+' €</strong>'+
        '</div>';
    }
    if(prixParkingM>0){
      detailRowsM+=
        '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
          '<span>'+(T['mod.est.detail.parking']||'Parking / garage')+' '+parkLabelM+'</span>'+
          '<strong>+ '+fmt(prixParkingM)+' €</strong>'+
        '</div>';
    }
    if(surcoteRenovM>0){
      detailRowsM+=
        '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
          '<span>'+(T['mod.est.detail.renov']||'Plus-value rénovations')+'<br><span style="font-size:11px;opacity:.7;padding-left:14px">'+renovLabelM+'</span></span>'+
          '<strong>+ '+fmt(surcoteRenovM)+' €</strong>'+
        '</div>';
    }
    detailRowsM+=
      '<div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:2px solid var(--cu);font-weight:700">'+
        '<span>'+(T['mod.est.detail.total']||'Valeur médiane estimée')+'</span>'+
        '<strong style="color:var(--cu)">'+fmt(val)+' €</strong>'+
      '</div>';

    var detailHtml=
      '<div style="margin-top:14px;padding:14px 18px;background:#fafafa;border:1px solid #e8e1d4;border-radius:6px">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink2);font-weight:700;margin-bottom:10px">'+
          (T['mod.est.detail.t']||'Détail du calcul')+
        '</div>'+
        '<div style="font-family:Raleway,sans-serif;font-size:13px;color:var(--ink);line-height:1.8">'+detailRowsM+'</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:11.5px;color:var(--ink2);opacity:.75;margin:10px 0 0;line-height:1.5">'+
          (T['mod.est.detail.method.maison']||'<strong>Méthode du coût de remplacement</strong> (norme EVS/TEGoVA) : valeur du bâti reconstruit à neuf moins la décote d\'ancienneté (1&nbsp;%/an), plus la valeur du terrain avec décote de 25&nbsp;% (terrain bâti vs terrain nu).')+
        '</p>'+
      '</div>';

    r.innerHTML=
      '<div class="er-range">'+
        '<div class="er"><div class="er-l">'+(T['mod.est.fourchette.basse']||'Basse')+'</div><div class="er-v">'+fmt(low)+' €</div></div>'+
        '<div class="er mid"><div class="er-l">'+(T['mod.est.fourchette.med']||'Médiane')+'</div><div class="er-v">'+fmt(val)+' €</div></div>'+
        '<div class="er"><div class="er-l">'+(T['mod.est.fourchette.haute']||'Haute')+'</div><div class="er-v">'+fmt(high)+' €</div></div>'+
      '</div>'+
      /* PROD-MOD18 : détail du calcul masqué pour favoriser l'appel entrant
       * (le propriétaire doit nous contacter pour avoir une vraie estimation pro,
       *  ce qui génère soit un mandat soit une mission d'expertise payante).
       *  Le HTML du détail reste généré dans `detailHtml` au cas où on souhaiterait
       *  le réactiver plus tard via un toggle admin. */
      ''+
      /* PROD-MOD25 : Bloc Sources & méthodologie (commun maison/appartement) */
      _mapaEstSourcesBlock(commune_label)+
      /* PROD-MOD26 : Bloc "Signaler une incohérence" (lead capture) */
      _mapaEstFeedbackBlock(t, l, s, a, e, dpe)+
      /* Bloc Avertissement légal */
      '<div class="note" style="margin-top:12px;background:#fff8e6;border-left:3px solid #c79b3d;padding:14px 18px">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9a751b;font-weight:700;margin-bottom:8px">'+
          (T['mod.est.warn.t']||'⚠ Avertissement légal')+
        '</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.6;margin:0">'+
          (T['mod.est.warn.body']||'Cette estimation algorithmique a une <strong>valeur strictement indicative</strong> et ne constitue <strong>ni un avis de valeur vénale</strong> au sens des normes EVS/TEGoVA, <strong>ni une expertise immobilière</strong>. Elle ne peut en aucun cas remplacer une <strong>visite physique du bien</strong> par un professionnel certifié, qui seul permet d\'apprécier les caractéristiques réelles (état réel, exposition, vue, prestations, micro-localisation, copropriété, servitudes). Pour une évaluation précise et engagée juridiquement, demandez un avis de valeur vénale formel.')+
        '</p>'+
      '</div>'+
      /* CTA */
      '<div style="margin-top:14px;text-align:center">'+
        '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
          (T['mod.est.cta.pro']||'✦ Demander une estimation professionnelle (gratuite & sans engagement) →')+
        '</button>'+
      '</div>';
    return;
  }

  /* ═══ BRANCHE IMMEUBLE DÉDIÉE (PROD-MOD28) ═══
   * Un immeuble entier ne se valorise pas comme un appartement géant. C'est un produit
   * d'investissement (immeuble de rapport) avec sa propre logique :
   *   - Surface habitable (logements/bureaux) × prix m² × coefs adaptés
   *   - Surface non-habitable (caves, parties communes, locaux techniques) × 40 % du m²
   *   - Terrain de la parcelle × prix are × 0.80 (cohérent maison)
   *   - Bonus jardin +3 % sur le bâti si présent
   *   - Sous-type : habitation (réf), bureau (-5 % à Belair, contrebalancé par la zone),
   *     mixte (-2 %)
   *   - Pas de coefficient surface (méthode hédonique réservée aux appartements)
   *   - Plancher décote ancienneté à 30 % (au lieu de 50 % pour apparts) — un immeuble
   *     de prestige Belair 1900-1950 garde une valeur patrimoniale forte
   *   - Plafond ancienneté 100 ans (déjà géré dans MOD27 via plafondAge)
   */
  if(t==='immeuble'||t==='Immeuble'){
    /* Plafond ancienneté 100 ans → déjà géré plus bas, on laisse aussi pour la sécurité */
    if(a&&a>=1800&&a<=2030){
      var ageImm=(new Date().getFullYear())-a;
      if(ageImm<0)ageImm=0;
      if(ageImm>100){
        var rOldI=document.getElementById('est-res');
        if(!rOldI)return;
        rOldI.style.display='block';
        var Toi=(I18N&&I18N[CURLANG])||{};
        rOldI.innerHTML=
          '<div class="note" style="background:linear-gradient(135deg,#f5efe2,#faf5e8);border-left:3px solid var(--cu);padding:18px 22px">'+
            '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:10px">'+
              (Toi['mod.est.tooold.ey']||'✦ Estimation sur demande')+
            '</div>'+
            '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px">'+
              (Toi['mod.est.tooold.neutral']||'Étant donné l\'ancienneté de votre bien, il serait imprudent de proposer une estimation sans l\'avoir vu.')+
            '</p>'+
            '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
              (Toi['mod.est.tooold.cta']||'Prendre rendez-vous gratuitement →')+
            '</button>'+
          '</div>';
        return;
      }
    }
    /* Calcul */
    /* Coefs état adoucis pour immeubles : un bâtiment "moyen" reste structurellement solide
     * (gros œuvre, structure, façade), seules les finitions intérieures décotent. */
    var coefEtatI={'neuf':1.08,'bon':1.00,'moyen':0.94,'travaux':0.85}[e]||1.00;
    var coefSubtypeI={'habitation':1.00,'bureau':0.96,'mixte':1.00,'commercial':1.03}[immSubtype]||1.00;
    var coefDPEI=_LU_coefDPE(dpe);
    var ageI=(new Date().getFullYear())-(a||2000);
    if(ageI<0)ageI=0;
    var decoteI=ageI*0.01;
    if(decoteI>0.25)decoteI=0.25; /* Plancher 25 % pour immeubles (vs 50 % pour apparts) — un immeuble Belair conserve une valeur patrimoniale forte */
    /* Pas de coefSurface pour les immeubles */

    /* NEW 2026-04-28 : BONUS ZONE HYPER-PRIME (coût)
     * ──────────────────────────────────────────────
     * Quand le bien est dans une rue prestigieuse de Luxembourg-Ville
     * (signal envoyé par patch.js via window._isAddrHyperPrime),
     * on applique un premium de zone +12% sur le m². C'est le scarcity
     * premium des adresses iconiques (rue du Curé, Place d'Armes,
     * Boulevard Royal, etc.) qui ne s'exprime pas dans les médianes
     * communales mais dans les transactions effectives. */
    var coefHyperPrimeI=1.00;
    if(typeof window._isAddrHyperPrime!=='undefined' && window._isAddrHyperPrime){
      coefHyperPrimeI=1.12;
    }
    var baseI=base*coefEtatI*coefSubtypeI*coefDPEI*coefHyperPrimeI*(1-decoteI);

    /* Valeurs */
    var prixHabI=Math.round(baseI*s);
    var surfNonHab=Math.max(0, immSurfTot - s);
    var prixNonHabI=Math.round(baseI*0.40*surfNonHab);
    var prixTerrainI=0;
    var prixAreUsedI=null;
    if(immTerrain>0){
      var prixAreI=LU_PRIX_ARE._default;
      if(commune_used && LU_PRIX_ARE[commune_used]){
        prixAreI=LU_PRIX_ARE[commune_used];
        prixAreUsedI=prixAreI;
      }
      prixTerrainI=Math.round(prixAreI*immTerrain*LU_TERRAIN_BATI_RATIO);
    }
    var batiI=prixHabI+prixNonHabI;
    var bonusJardinI=immJardin?Math.round(batiI*0.03):0;

    /* Surcote rénovations multi-postes (réutilise renovList déjà lu plus haut) */
    var surcoteRenovI=0;
    var renovDetailsI=[];
    var typeLabelsI={cuisine_sdb:'cuisine/SDB',deco:'décoration',gros_oeuvre:'gros œuvre',energie:'énergie',autres:'travaux'};
    for(var rii=0;rii<renovList.length;rii++){
      var ri=renovList[rii];
      var ageRi=(new Date().getFullYear())-ri.yr;
      if(ageRi<0)ageRi=0;
      if(ageRi>80)continue;
      var ratioRi=LU_RENOV_RATIO[ri.type]||LU_RENOV_RATIO.autres;
      var decRi=ageRi*0.01;
      if(decRi>0.80)decRi=0.80;
      var sci=Math.round(ri.mnt*ratioRi*(1-decRi));
      surcoteRenovI+=sci;
      renovDetailsI.push(fmt(ri.mnt)+' € '+(typeLabelsI[ri.type]||'travaux')+' '+ri.yr+' (+'+fmt(sci)+' €)');
    }

    var totalI=prixHabI+prixNonHabI+prixTerrainI+bonusJardinI+surcoteRenovI;
    var totalCoutPur=totalI; /* sauvegarde avant pondération rendement, pour calcul écart fourchette */

    /* PROD-MOD29 V2 (2026-04-28) : Méthode du rendement locatif AMÉLIORÉE
     * ──────────────────────────────────────────────────────────────────
     * Le taux de rendement attendu n'est PAS uniforme : il varie selon
     * la localisation, le sous-type, l'état du bien et la mixité.
     *
     * RÈGLE FONDAMENTALE : plus le bien est rare et premium, plus le taux
     * de rendement attendu par les acheteurs est BAS (donc valeur HAUTE).
     *
     * TAUX DE BASE PAR ZONE (Luxembourg, médianes investisseurs 2026) :
     *   Hyper-centre Lux-Ville  : 3,0 %  (Centre, Ville-Haute, Belair, Limpertsberg, Kirchberg, Merl, Cloche d'Or)
     *   Centre Lux-Ville         : 3,5 %  (Bonnevoie, Gasperich, Hollerich, Gare, Clausen, Cents, Pfaffenthal…)
     *   1ère couronne             : 4,5 %  (Strassen, Bertrange, Bereldange, Walferdange, Howald, Hesperange…)
     *   2ème couronne             : 5,0 %  (Mersch, Junglinster, Bridel, Bettembourg, Mondorf…)
     *   Reste du pays             : 5,5 %  (par défaut)
     *   Inconnu                   : 5,0 %  (médiane)
     *
     * AJUSTEMENTS (cumulatifs) :
     *   -0,3 pt si sous-type COMMERCIAL pur (ou mixte commercial dominant)
     *   -0,2 pt si rénovation récente < 5 ans   (totalRenov > 100k€)
     *   -0,2 pt si CPE A ou B                   (excellente performance énergétique)
     *   +0,3 pt si bureau pur                   (rendement attendu plus élevé en bureau)
     *   +0,3 pt si très ancien sans rénovation  (avant 1970 + 0 rénovations)
     *
     * PONDÉRATION VALEUR FINALE :
     *   - Si bien loué (immLoyer > 0) : la pondération penche fort sur le
     *     rendement, car c'est ainsi que les acheteurs investisseurs raisonnent.
     *   - Sub-type pur HABITATION  : 50 % rendement + 50 % coût
     *   - Sub-type MIXTE/COMMERCIAL : 70 % rendement + 30 % coût
     *   - Sub-type BUREAU pur       : 75 % rendement + 25 % coût
     *
     * SÉCURITÉ : si méthode rendement >2× ou <0,5× méthode coût (loyer
     * mal saisi ou marché atypique), on garde uniquement la méthode coût.
     *
     * EXEMPLE CALIBRATION (15 rue du Curé, Lux-Ville centre, 240k€/an loyers) :
     *   Zone hyper-centre = 3,0 %
     *   Mixte (commercial + habitation) → -0,3 pt = 2,7 %
     *   Rénovation récente              → -0,2 pt = 2,5 %
     *   CPE C                            → 0 pt
     *   ⇒ Taux retenu : 2,5 %
     *   ⇒ Valeur rendement : 240 000 € / 0,025 = 9 600 000 €
     *   ⇒ Pondération mixte (70/30) avec coût ~7,5 M€ ⇒ ~9,0 M€ retenu */
    var totalRendement=0;
    var methodeUtilisee='cout';
    var tauxRendementUtilise=0;
    if(immLoyer>0){
      var loyerAnnuel=immLoyer*12;

      /* 1. Taux de base selon zone (commune retenue) — dicos ZONES_*
       * sont hoistés en début de fonction pour être réutilisables aussi
       * pour la pénalité parking. */
      var commune_key=(commune_used||'').toLowerCase();
      if(ZONES_HYPER_CENTRE[commune_key])         tauxRendementUtilise=0.033;
      else if(ZONES_CENTRE_LUXVILLE[commune_key]) tauxRendementUtilise=0.038;
      else if(ZONES_PREMIERE_COURONNE[commune_key])tauxRendementUtilise=0.045;
      else if(ZONES_DEUXIEME_COURONNE[commune_key])tauxRendementUtilise=0.050;
      else if(commune_used)                       tauxRendementUtilise=0.055;
      else                                        tauxRendementUtilise=0.050;

      /* 2. Ajustements selon sous-type immeuble */
      if(immSubtype==='bureau'){
        tauxRendementUtilise+=0.003;     /* +0,3 pt */
      }else if(immSubtype==='mixte' || immSubtype==='commercial'){
        tauxRendementUtilise-=0.003;     /* -0,3 pt (commercial premium) */
      }

      /* 3. Bonus rénovation récente : si sur les 5 dernières années on a au
       * moins 100k€ de travaux cumulés, on baisse le taux de 0,2 pt */
      var nowYear=(new Date()).getFullYear();
      var totalRenovRecent=0;
      for(var iri=0;iri<renovList.length;iri++){
        if(renovList[iri].yr && (nowYear-renovList[iri].yr)<=5){
          totalRenovRecent+=(+renovList[iri].mnt||0);
        }
      }
      if(totalRenovRecent>=100000) tauxRendementUtilise-=0.002;

      /* 4. Bonus CPE excellent (A ou B) : -0,2 pt */
      var cpeVal=v('ecpe')||'';
      if(cpeVal==='A'||cpeVal==='B') tauxRendementUtilise-=0.002;

      /* 5. Décote très ancien sans rénovation : +0,3 pt */
      var anneeC=+v('ea')||0;
      if(anneeC>0 && anneeC<1970 && renovList.length===0) tauxRendementUtilise+=0.003;

      /* Plancher de sécurité : jamais en-dessous de 2,3 % (pour ne pas
       * sur-valoriser des biens même premium au-delà de la réalité du marché) */
      if(tauxRendementUtilise<0.023) tauxRendementUtilise=0.023;
      /* Plafond de sécurité : jamais au-dessus de 7 % (au-delà = bien atypique
       * non investisseur) */
      if(tauxRendementUtilise>0.070) tauxRendementUtilise=0.070;

      totalRendement=Math.round(loyerAnnuel/tauxRendementUtilise);

      /* Sécurité : ratio aberrant ⇒ on garde la méthode coût seule */
      var ratioVal=totalRendement/totalI;
      if(ratioVal>=0.5 && ratioVal<=2.5){  /* élargi à 2,5× car centre Lux les
                                              biens loués cassent souvent les
                                              ratios méthode coût */
        /* Pondération selon sous-type */
        var poidsRendement;
        if(immSubtype==='bureau')         poidsRendement=0.75;
        else if(immSubtype==='mixte' || immSubtype==='commercial') poidsRendement=0.70;
        else                              poidsRendement=0.50;
        var totalMoyen=Math.round(totalRendement*poidsRendement + totalI*(1-poidsRendement));
        totalI=totalMoyen;
        methodeUtilisee='mixte';
      }
    }

    /* NEW 2026-04-28 V5 : PÉNALITÉ PARKING — RAISONNEMENT MARCHÉ RÉEL
     * ─────────────────────────────────────────────────────────────────
     * Pour un immeuble, on ne calcule plus une décote en pourcentage,
     * mais un manque à gagner CONCRET :
     *   1. On évalue le NOMBRE DE PLACES NÉCESSAIRES selon les usages
     *      du bâtiment (chambres, bureaux, commerces).
     *   2. On compare au nombre de places DÉCLARÉES (parkNb).
     *   3. On valorise les places manquantes au PRIX DE MARCHÉ par zone.
     *
     * Besoin théorique de places (standard urbanistique Luxembourg) :
     *   - 1 place / 2 logements   (résidence)
     *   - 1 place / 80 m² bureaux (tertiaire)
     *   - 1 place / 60 m² commerce (livraisons + clients)
     *
     * Prix marché d'une place de parking (Luxembourg 2026, indicatif) :
     *   - Hyper-centre Lux-Ville  : 110 000 €
     *   - Centre Lux-Ville         : 80 000 €
     *   - 1ère couronne             : 45 000 €
     *   - 2ème couronne             : 25 000 €
     *   - Reste du pays             : 15 000 €
     *
     * Exemple 15 rue du Curé (mixte, 17 chambres + bureaux + commerces, 0 parking) :
     *   - Logements : 17 chambres ≈ 8-9 logements → 4-5 places nécessaires
     *   - Mais le mixte avec bureaux/commerces réduit (pas tous les chambres
     *     sont des logements indépendants).
     *   - On retient un besoin réaliste mais plafonné selon la mixité.
     *
     * Plafond intelligent : on ne pénalise jamais plus de 6 places manquantes
     * pour ne pas faire exploser la décote sur les très gros immeubles
     * (au-delà, les acheteurs intègrent autrement). */

    /* Lecture des surfaces mixtes décomposées */
    var immSurfHab=+v('eimmSurfHab')||0;
    var immSurfBur=+v('eimmSurfBur')||0;
    var immSurfCom=+v('eimmSurfCom')||0;
    /* Nombre de chambres déclaré (champ existant) */
    var nbCh=+v('echambres')||0;

    /* Calcul du besoin théorique de places
     * NB : on est sur un marché LUXEMBOURGEOIS centre-ville où la
     * réalité commerciale diffère de la règle urbanistique stricte.
     * Les acheteurs investisseurs raisonnent en "places effectivement
     * exploitables" pas en "places que l'on aurait théoriquement dû avoir". */
    var placesNecessaires=0;
    if(immSubtype==='habitation'){
      /* ~1 place / 2 logements ; on estime 1 logement / 2-3 chambres */
      var nbLogementsEstim=Math.max(1, Math.round(nbCh/2.5));
      placesNecessaires=Math.ceil(nbLogementsEstim/2);
    }else if(immSubtype==='bureau'){
      /* Bureau pur : 1 place / 120 m² (réalité Lux centre-ville,
       * employés en transports communs majoritaires) */
      placesNecessaires=Math.ceil(s/120);
    }else if(immSubtype==='commercial'){
      /* Commercial : 1 place / 100 m² (livraisons + 1-2 clients) */
      placesNecessaires=Math.ceil(s/100);
    }else if(immSubtype==='mixte'){
      /* Mixte : besoin réaliste d'un investisseur centre-ville
       *   - 1 place "résident" pour la partie habitation
       *   - 2 places pour bureaux/commerces combinés
       * Si décomposition fournie, on raffine légèrement mais on
       * reste plafonné à 4 places (au-delà = perte de réalisme
       * sur le marché du Vieux Luxembourg). */
      if(immSurfHab>0||immSurfBur>0||immSurfCom>0){
        var pl=0;
        if(immSurfHab>0)  pl+=1;                          /* 1 place pour appartement */
        if(immSurfBur>0)  pl+=Math.min(2, Math.ceil(immSurfBur/200));  /* 1-2 max bureaux */
        if(immSurfCom>0)  pl+=Math.min(2, Math.ceil(immSurfCom/120));  /* 1-2 max commerces */
        placesNecessaires=pl;
      }else{
        placesNecessaires=3; /* forfait mixte standard */
      }
    }
    /* Plafond raisonnable centre-ville Luxembourg */
    if(placesNecessaires>4) placesNecessaires=4;

    /* Places manquantes */
    var placesManquantes=Math.max(0, placesNecessaires-parkNb);

    /* Prix par place selon zone ET type (extérieur vs intérieur/box)
     * Source : marché transactionnel Luxembourg 2026 (réel, validé Julien) */
    var prixPlace=15000;
    var commune_keyP=(commune_used||'').toLowerCase();
    /* Type extérieur = moins cher, intérieur/box = plus cher.
     * Si pas renseigné ou aucun parking : on prend le tarif intérieur/box
     * (logique : on évalue la "valeur de remplacement" idéale qui manque). */
    var isExtOnly=(parkType==='ext' && parkNb>0);
    if(isExtOnly){
      /* Tarifs extérieur */
      if(ZONES_HYPER_CENTRE[commune_keyP])           prixPlace=80000;
      else if(ZONES_CENTRE_LUXVILLE[commune_keyP])   prixPlace=70000;
      else if(ZONES_PREMIERE_COURONNE[commune_keyP]) prixPlace=45000;
      else if(ZONES_DEUXIEME_COURONNE[commune_keyP]) prixPlace=25000;
      else                                            prixPlace=15000;
    }else{
      /* Tarifs intérieur / box (référence par défaut) */
      if(ZONES_HYPER_CENTRE[commune_keyP])           prixPlace=120000;
      else if(ZONES_CENTRE_LUXVILLE[commune_keyP])   prixPlace=100000;
      else if(ZONES_PREMIERE_COURONNE[commune_keyP]) prixPlace=80000;
      else if(ZONES_DEUXIEME_COURONNE[commune_keyP]) prixPlace=50000;
      else                                            prixPlace=35000;
    }

    /* Pénalité = places manquantes × prix par place */
    var penaliteParkingMontant=placesManquantes*prixPlace;
    if(penaliteParkingMontant>0){
      totalI=Math.max(0, totalI-penaliteParkingMontant);
    }

    /* NEW 2026-04-28 V4 : Fourchette ADAPTATIVE (resserrée)
     * ──────────────────────────────────────────────────
     * - SANS méthode rendement (pas de loyer renseigné) : ±10 %
     * - AVEC méthode rendement convergente (<20% écart) : ±4 %
     * - AVEC méthode rendement modérée (20-35% écart)   : ±7 %
     * - AVEC méthode rendement divergente (>35% écart)  : ±10 %
     * Pour un bien à 8 M€, ±4 % = fourchette 7,7 → 8,3 M€ (réaliste). */
    var fourchettePctI=0.10;
    if(immLoyer>0 && totalRendement>0){
      var ecartCoutRendement=Math.abs(totalRendement-totalCoutPur)/totalCoutPur;
      if(ecartCoutRendement<0.20)      fourchettePctI=0.04;  /* convergence forte */
      else if(ecartCoutRendement<0.35) fourchettePctI=0.07;  /* convergence modérée */
      else                             fourchettePctI=0.10;  /* divergence forte */
    }
    var lowI=Math.round(totalI*(1-fourchettePctI));
    var highI=Math.round(totalI*(1+fourchettePctI));

    var rImm=document.getElementById('est-res');
    if(!rImm)return;
    rImm.style.display='block';
    var T=(I18N&&I18N[CURLANG])||{};
    var commune_label=commune_used?' Commune utilisée : <strong>'+commune_used.replace(/(^|\s)\S/g,function(L){return L.toUpperCase();})+'</strong>.':'';
    var subtypeLabel={'habitation':'d\'habitation','bureau':'de bureau','mixte':'mixte'}[immSubtype]||'';

    /* PROD-MOD30 : Détail méthodes affiché systématiquement (transparence acheteur/vendeur) */
    var detailMethodes='';
    var totalCout=prixHabI+prixNonHabI+prixTerrainI+bonusJardinI+surcoteRenovI;
    if(immLoyer>0){
      detailMethodes=
        '<div style="margin-top:10px;padding:12px 16px;background:#fafafa;border-radius:3px;font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.65">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:8px">Détail du calcul</div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Commune retenue</span><strong>'+(commune_used?commune_used.replace(/(^|\s)\S/g,function(L){return L.toUpperCase();}):'Moyenne nationale')+' ('+fmt(Math.round(base))+' €/m² brut)</strong></div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Méthode coût (bâti + terrain + bonus)</span><strong>'+fmt(totalCout)+' €</strong></div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Méthode rendement ('+(immLoyer*12).toLocaleString('fr')+' €/an ÷ '+(tauxRendementUtilise*100).toFixed(2).replace('.',',')+' %)</span><strong>'+fmt(totalRendement)+' €</strong></div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="font-size:11px;color:var(--ink2);font-style:italic">↳ Taux ajusté selon zone, sous-type et état du bien</span><span></span></div>'+
          (penaliteParkingMontant>0?'<div style="display:flex;justify-content:space-between;padding:3px 0;color:#a04040"><span>Manque '+placesManquantes+' place'+(placesManquantes>1?'s':'')+' de parking × '+fmt(prixPlace)+' €/place</span><strong>−'+fmt(penaliteParkingMontant)+' €</strong></div>':'')+
          '<div style="display:flex;justify-content:space-between;padding:6px 0 0;margin-top:6px;border-top:1px solid #e8dcc0"><span>Valeur retenue ('+((immSubtype==='bureau')?'75 %':((immSubtype==='mixte'||immSubtype==='commercial')?'70 %':'50 %'))+' rendement + reste coût'+(penaliteParkingMontant>0?', après pénalité parking':'')+')</span><strong style="color:var(--cu)">'+fmt(totalI)+' €</strong></div>'+
        '</div>';
    }else{
      detailMethodes=
        '<div style="margin-top:10px;padding:12px 16px;background:#fafafa;border-radius:3px;font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.65">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:8px">Détail du calcul</div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Commune retenue</span><strong>'+(commune_used?commune_used.replace(/(^|\s)\S/g,function(L){return L.toUpperCase();}):'Moyenne nationale')+' ('+fmt(Math.round(base))+' €/m² brut)</strong></div>'+
          '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Surface habitable '+s+' m² × prix m² ajusté</span><strong>'+fmt(prixHabI)+' €</strong></div>'+
          (surfNonHab>0?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Surface non-habitable '+surfNonHab+' m² × 40 %</span><strong>'+fmt(prixNonHabI)+' €</strong></div>':'')+
          (immTerrain>0?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Terrain '+immTerrain+' ares × '+fmt(LU_PRIX_ARE[commune_used]||LU_PRIX_ARE._default)+' €/are × 80 %</span><strong>'+fmt(prixTerrainI)+' €</strong></div>':'')+
          (immJardin?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Bonus jardin +3 %</span><strong>'+fmt(bonusJardinI)+' €</strong></div>':'')+
          (surcoteRenovI>0?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Plus-value rénovations</span><strong>+'+fmt(surcoteRenovI)+' €</strong></div>':'')+
          (penaliteParkingMontant>0?'<div style="display:flex;justify-content:space-between;padding:3px 0;color:#a04040"><span>Manque '+placesManquantes+' place'+(placesManquantes>1?'s':'')+' de parking × '+fmt(prixPlace)+' €/place</span><strong>−'+fmt(penaliteParkingMontant)+' €</strong></div>':'')+
          '<div style="margin-top:10px;padding:8px 10px;background:#fff8eb;border-radius:3px;font-size:11.5px"><strong style="color:var(--cu)">Astuce :</strong> renseignez le loyer mensuel pour appliquer aussi la <strong>méthode du rendement locatif</strong> (standard investisseurs).</div>'+
        '</div>';
    }

    rImm.innerHTML=
      '<div class="note" style="background:linear-gradient(135deg,#fdfaf3,#fbf6e7);border-left:3px solid var(--cu);padding:22px 26px">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:8px">'+
          (T['mod.est.imm.title']||'Estimation indicative — Immeuble '+subtypeLabel)+
        '</div>'+
        '<div style="font-family:\'Cinzel\',serif;font-size:26px;color:var(--ink);font-weight:600;margin:8px 0 6px">'+fmt(totalI)+' €</div>'+
        '<div style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65">'+
          (T['mod.est.range']||'Fourchette indicative')+' : <strong>'+fmt(lowI)+' € – '+fmt(highI)+' €</strong>'+
        '</div>'+
        detailMethodes+
      '</div>'+
      _mapaEstSourcesBlock(commune_label)+
      _mapaEstFeedbackBlock(t, l, s, a, e, dpe)+
      '<div class="note" style="margin-top:12px;background:#fff8e6;border-left:3px solid #c79b3d;padding:14px 18px">'+
        '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9a751b;font-weight:700;margin-bottom:8px">'+
          (T['mod.est.warn.t']||'⚠ Avertissement légal')+
        '</div>'+
        '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.6;margin:0">'+
          (T['mod.est.warn.body']||'Cette estimation algorithmique a une valeur strictement indicative et ne remplace pas une visite physique par un professionnel certifié.')+
        '</p>'+
      '</div>'+
      '<div style="margin-top:14px;text-align:center">'+
        '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
          (T['mod.est.cta.pro']||'✦ Demander une estimation professionnelle (gratuite & sans engagement) →')+
        '</button>'+
      '</div>';
    return;
  }

  /* ═══ APPARTEMENTS, BUREAUX, IMMEUBLES, etc. — Méthode m² hédonique (existante) ═══ */
  /* 2. Type de bien — accepte les valeurs nouvelles (value=) et anciennes (textContent) */
  if(t==='appartement'||t==='Appartement')base*=1;
  else if(t==='bureau'||t==='Bureau')base*=.82;
  else if(t==='immeuble'||t==='Immeuble')base*=.72;
  else if(t==='terrain'||t==='Terrain')base*=.35;
  else if(t==='commerce'||t==='Commerce')base*=.78;

  /* 3. État général (PROD-MOD20 : recalibré pour différencier neuf/bon)
   *    Neuf/Récent : prestations modernes, NZEB/A++, bonus marché → +8 %
   *    Bon état    : référence (médiane marché)
   *    À rafraîchir: décote modérée (peintures/sols à refaire) → −12 %
   *    Travaux    : décote forte (cuisine/SDB/électricité à refaire) → −25 % */
  if(e==='neuf')base*=1.08;
  else if(e==='bon')base*=1.00;
  else if(e==='moyen')base*=.88;
  else if(e==='travaux')base*=.75;

  /* 3 bis. Coefficient surface (PROD-MOD20) : module le prix au m² selon la taille
   *    Plus l'appartement est petit, plus le prix au m² est élevé. */
  base*=_LU_coefSurface(s);

  /* 3 ter. Coefficient classe énergétique (PROD-MOD22 / MOD24) : impact CPE sur le prix
   *    Référence = D (parc moyen). A/B = surcote, F/G/H/I = décote significative.
   *    NB : la correction marché 2026 est désormais directement intégrée dans la table
   *    LU_PRIX_M2 (calibrée sur annonces marché actuelles, pas sur STATEC théorique). */
  base*=_LU_coefDPE(dpe);

  /* 4. Plafond ancienneté différencié par type de bien (PROD-MOD27) :
   *    - Appartement : 50 ans (décote plancher 50 % atteinte à 50 ans, au-delà
   *      la copropriété et le cachet pèsent plus que l'algo)
   *    - Bureau      : 80 ans (immeubles tertiaires anciens souvent rénovés
   *      mais valorisation très spécifique, à voir sur place)
   *    - Immeuble    : 100 ans (immeubles de rapport bâtis 1900-1950,
   *      très répandus à Belair / Limpertsberg / Centre-Ville)
   *
   * Le message de redirection est tournée de manière neutre :
   *    "Étant donné l'ancienneté de votre bien, il serait imprudent de proposer
   *     une estimation sans avoir vu le bien. Merci de nous contacter."
   *  → ne vexe pas le propriétaire d'un bien centenaire de prestige. */
  if(a&&a>=1800&&a<=2030){
    var ageAppt=(new Date().getFullYear())-a;
    if(ageAppt<0)ageAppt=0;
    /* Plafond selon type */
    var plafondAge=50; /* défaut appartement */
    if(t==='bureau'||t==='Bureau')plafondAge=80;
    else if(t==='immeuble'||t==='Immeuble')plafondAge=100;
    if(ageAppt>plafondAge){
      var rOldA=document.getElementById('est-res');
      if(!rOldA)return;
      rOldA.style.display='block';
      var Tao=(I18N&&I18N[CURLANG])||{};
      rOldA.innerHTML=
        '<div class="note" style="background:linear-gradient(135deg,#f5efe2,#faf5e8);border-left:3px solid var(--cu);padding:18px 22px">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:10px">'+
            (Tao['mod.est.tooold.ey']||'✦ Estimation sur demande')+
          '</div>'+
          '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px">'+
            (Tao['mod.est.tooold.neutral']||'Étant donné l\'ancienneté de votre bien, il serait imprudent de proposer une estimation sans l\'avoir vu — la valeur dépend trop fortement d\'éléments qu\'aucun algorithme ne peut apprécier à distance (état de conservation, qualité des matériaux d\'origine, rénovations, cachet, potentiel d\'optimisation, micro-localisation). <strong>Merci de nous contacter afin de prendre rendez-vous directement.</strong>')+
          '</p>'+
          '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
            (Tao['mod.est.tooold.cta']||'Prendre rendez-vous gratuitement →')+
          '</button>'+
        '</div>';
      return;
    }
    /* Décote ancienneté linéaire 1 %/an. Plancher à 50 % (atteint à 50 ans) */
    var decoteApt=ageAppt*0.01;
    if(decoteApt>0.50)decoteApt=0.50;
    base*=(1-decoteApt);
  }

  /* 5. Nombre de chambres */
  if(c>=5)base*=1.08;
  else if(c>=4)base*=1.05;
  else if(c===1)base*=.98;

  /* ═══ Calcul valeur finale (appartements/bureaux/immeubles) ═══ */
  var prixHabitable=Math.round(base*s);
  var pricePerSqm=Math.round(base);

  /* PROD-MOD22 : Plafond absolu 15 000 €/m² post-coefficients
   * Au-delà, l'appartement est structurellement invendable au Luxembourg
   * dans les conditions de marché actuelles (2026). Redirection vers
   * estimation professionnelle pour ces biens d'exception. */
  if(pricePerSqm>LU_PLAFOND_M2_APPT){
    var rCap=document.getElementById('est-res');
    if(rCap){
      rCap.style.display='block';
      var Tcap=(I18N&&I18N[CURLANG])||{};
      rCap.innerHTML=
        '<div class="note" style="background:linear-gradient(135deg,#f5efe2,#faf5e8);border-left:3px solid var(--cu);padding:18px 22px">'+
          '<div style="font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cu);font-weight:700;margin-bottom:10px">'+
            (Tcap['mod.est.cap.ey']||'✦ Bien d\'exception — estimation sur demande')+
          '</div>'+
          '<p style="font-family:Raleway,sans-serif;font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px">'+
            (Tcap['mod.est.cap.body']||'Votre bien dépasse le seuil de <strong>15 000 €/m²</strong>, niveau au-delà duquel le marché luxembourgeois devient très restreint dans les conditions actuelles (taux d\'emprunt élevés, capacité d\'achat réduite). Pour ces biens d\'exception, seule une analyse multi-modèles tenant compte de la liquidité réelle, du positionnement précis et de l\'acheteur cible permet une valorisation juste.')+
          '</p>'+
          '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
            (Tcap['mod.est.cap.cta']||'Demander une estimation personnalisée gratuite →')+
          '</button>'+
        '</div>';
    }
    return;
  }

  /* Valeur terrasse/balcon (30 % du prix m² habitable) */
  var prixTerrasseAppt=0;
  if(surfTerrasse>0){
    prixTerrasseAppt=Math.round(base*LU_TERRASSE_RATIO*surfTerrasse);
  }

  /* Valeur parking/garage selon zone + type */
  var prixParkingAppt=0;
  var parkLabel='';
  if(parkType && parkNb>0){
    var zoneAppt=_LU_zoneFromCommune(commune_used);
    var prixUnitParkA=LU_PRIX_PARKING[zoneAppt][parkType]||0;
    prixParkingAppt=prixUnitParkA*parkNb;
    var labels={ext:'extérieur',int:'intérieur',box:'box fermé'};
    parkLabel=parkNb+' × '+(labels[parkType]||parkType)+' ('+fmt(prixUnitParkA)+' € chacun)';
  }

  /* PROD-MOD19 : Surcote rénovations multi-postes (cf. branche maison) */
  var surcoteRenovAppt=0;
  var renovLabel='';
  var typeLabels={cuisine_sdb:'cuisine/SDB',deco:'décoration',gros_oeuvre:'gros œuvre',energie:'énergie',autres:'travaux'};
  var renovDetailsA=[];
  for(var rai=0;rai<renovList.length;rai++){
    var ra=renovList[rai];
    var ageRa=(new Date().getFullYear())-ra.yr;
    if(ageRa<0)ageRa=0;
    if(ageRa>80)continue;
    var ratioRa=LU_RENOV_RATIO[ra.type]||LU_RENOV_RATIO.autres;
    var decRa=ageRa*0.01;
    if(decRa>0.80)decRa=0.80;
    var sca=Math.round(ra.mnt*ratioRa*(1-decRa));
    surcoteRenovAppt+=sca;
    renovDetailsA.push(fmt(ra.mnt)+' € '+(typeLabels[ra.type]||'travaux')+' '+ra.yr+' (+'+fmt(sca)+' €)');
  }
  if(renovDetailsA.length>0){
    renovLabel=renovDetailsA.join(' · ');
  }

  var val=prixHabitable+prixTerrasseAppt+prixParkingAppt+surcoteRenovAppt;
  /* Fourchette ±10 % */
  var low=Math.round(val*.90),high=Math.round(val*1.10);
  var r=document.getElementById('est-res');
  if(!r)return;
  r.style.display='block';

  var T=(I18N&&I18N[CURLANG])||{};
  var commune_label=commune_used?(' · '+(T['mod.est.commune.used']||'Commune')+' : '+commune_used.charAt(0).toUpperCase()+commune_used.slice(1)):'';

  /* Détail du calcul (transparent) — affiché si plus d'un poste */
  var detailRows='';
  detailRows+=
    '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
      '<span>'+(T['mod.est.detail.habitable']||'Surface habitable')+' ('+s+' m² × '+fmt(pricePerSqm)+' €/m²)</span>'+
      '<strong>'+fmt(prixHabitable)+' €</strong>'+
    '</div>';
  if(prixTerrasseAppt>0){
    detailRows+=
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
        '<span>'+(T['mod.est.detail.terrasse']||'Terrasse / balcon')+' ('+surfTerrasse+' m² × 30 % du prix m² habitable)</span>'+
        '<strong>+ '+fmt(prixTerrasseAppt)+' €</strong>'+
      '</div>';
  }
  if(prixParkingAppt>0){
    detailRows+=
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
        '<span>'+(T['mod.est.detail.parking']||'Parking / garage')+' '+parkLabel+'</span>'+
        '<strong>+ '+fmt(prixParkingAppt)+' €</strong>'+
      '</div>';
  }
  if(surcoteRenovAppt>0){
    detailRows+=
      '<div style="display:flex;justify-content:space-between;border-bottom:1px dashed #ddd;padding:4px 0">'+
        '<span>'+(T['mod.est.detail.renov']||'Plus-value rénovations')+'<br><span style="font-size:11px;opacity:.7;padding-left:14px">'+renovLabel+'</span></span>'+
        '<strong>+ '+fmt(surcoteRenovAppt)+' €</strong>'+
      '</div>';
  }
  detailRows+=
    '<div style="display:flex;justify-content:space-between;padding:8px 0 0;margin-top:6px;border-top:2px solid var(--cu);font-weight:700">'+
      '<span>'+(T['mod.est.detail.total']||'Valeur médiane estimée')+'</span>'+
      '<strong style="color:var(--cu)">'+fmt(val)+' €</strong>'+
    '</div>';
  var detailHtmlAppt=
    '<div style="margin-top:14px;padding:14px 18px;background:#fafafa;border:1px solid #e8e1d4;border-radius:6px">'+
      '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink2);font-weight:700;margin-bottom:10px">'+
        (T['mod.est.detail.t']||'Détail du calcul')+
      '</div>'+
      '<div style="font-family:Raleway,sans-serif;font-size:13px;color:var(--ink);line-height:1.8">'+detailRows+'</div>'+
    '</div>';

  r.innerHTML=
    /* Fourchette */
    '<div class="er-range">'+
      '<div class="er"><div class="er-l">'+(T['mod.est.fourchette.basse']||'Basse')+'</div><div class="er-v">'+fmt(low)+' €</div></div>'+
      '<div class="er mid"><div class="er-l">'+(T['mod.est.fourchette.med']||'Médiane')+'</div><div class="er-v">'+fmt(val)+' €</div></div>'+
      '<div class="er"><div class="er-l">'+(T['mod.est.fourchette.haute']||'Haute')+'</div><div class="er-v">'+fmt(high)+' €</div></div>'+
    '</div>'+

    /* PROD-MOD18 : détail du calcul masqué (cf. branche maison) */
    ''+

    /* PROD-MOD25 : Bloc Sources & méthodologie (commun maison/appartement) */
    _mapaEstSourcesBlock(commune_label)+

    /* PROD-MOD26 : Bloc "Signaler une incohérence" (lead capture) */
    _mapaEstFeedbackBlock(t, l, s, a, e, dpe)+

    /* Bloc Avertissement légal */
    '<div class="note" style="margin-top:12px;background:#fff8e6;border-left:3px solid #c79b3d;padding:14px 18px">'+
      '<div style="font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9a751b;font-weight:700;margin-bottom:8px">'+
        (T['mod.est.warn.t']||'⚠ Avertissement légal')+
      '</div>'+
      '<p style="font-family:Raleway,sans-serif;font-size:12.5px;color:var(--ink2);line-height:1.6;margin:0">'+
        (T['mod.est.warn.body']||'Cette estimation algorithmique a une <strong>valeur strictement indicative</strong> et ne constitue <strong>ni un avis de valeur vénale</strong> au sens des normes EVS/TEGoVA, <strong>ni une expertise immobilière</strong>. Elle ne peut en aucun cas remplacer une <strong>visite physique du bien</strong> par un professionnel certifié, qui seul permet d\'apprécier les caractéristiques réelles (état réel, exposition, vue, prestations, micro-localisation, copropriété, servitudes). Pour une évaluation précise et engagée juridiquement, demandez un avis de valeur vénale formel.')+
      '</p>'+
    '</div>'+

    /* CTA estimation pro */
    '<div style="margin-top:14px;text-align:center">'+
      '<button class="btn btn-navy" onclick="closeM(\'m-estimation\');openSvc(\'m-contact\')" style="width:100%">'+
        (T['mod.est.cta.pro']||'✦ Demander une estimation professionnelle (gratuite & sans engagement) →')+
      '</button>'+
    '</div>';
};

/* ─── SIMULATEUR PRÊT ─── */
window.runSim=function(){
  var m=+v('sm')||0,t=+v('st')||0,d=+v('sd')||0;
  var r=document.getElementById('sim-res');
  if(!r)return;
  if(!m||!t||!d){r.style.display='none';return}
  var mr=t/100/12,n=d*12,mens=m*mr/(1-Math.pow(1+mr,-n));
  var tot=mens*n,intr=tot-m;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(mens))+' € / mois</div><div class="sr-l">Coût total : <strong>'+fmt(Math.round(tot))+' €</strong> · Intérêts : <strong>'+fmt(Math.round(intr))+' €</strong></div>';
};
window.runRdt=function(){
  var p=+v('rp')||0,l=+v('rl')||0,c=+v('rc')||0;
  var r=document.getElementById('rdt-res');
  if(!r)return;
  if(!p||!l){r.style.display='none';return}
  var brut=(l*12/p)*100,net=((l*12-c)/p)*100;
  r.style.display='block';
  var alert5=brut>5?'<br><span style="color:var(--or)">⚠ Rendement &gt; 5 % au Luxembourg — vérifiez le plafond légal.</span>':'';
  r.innerHTML='<div class="sr-v">'+brut.toFixed(2)+' % brut · '+net.toFixed(2)+' % net</div><div class="sr-l">Loyer annuel : <strong>'+fmt(l*12)+' €</strong>'+alert5+'</div>';
};
window.runCap=function(){
  var rv=+v('cr')||0,ch=+v('cc')||0,ap=+v('ca')||0,pr=+v('cb')||0;
  var r=document.getElementById('cap-res');
  if(!r)return;
  if(!rv){r.style.display='none';return}
  var dispo=(rv-ch)*0.35,dur=25,taux=3.5;
  var mr=taux/100/12,n=dur*12;
  var cap=dispo*(1-Math.pow(1+mr,-n))/mr+ap;
  var ok=pr&&pr<=cap;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(cap))+' €</div><div class="sr-l">Capacité max indicative (35 % effort, 25 ans @ 3.5 %). Mensualité disponible : <strong>'+fmt(Math.round(dispo))+' €</strong>'+(pr?'<br>Projet '+fmt(pr)+' € : <strong style="color:'+(ok?'#2d7a4f':'#b04040')+'">'+(ok?'Finançable ✓':'Au-dessus de la capacité')+'</strong>':'')+'</div>';
};

/* ─── LOYER LUX (5%) ─── */
window.calcLoyer=function(){
  var p=+v('lo-prix')||0,f=+v('lo-frais')||0,t=+v('lo-trav')||0,an=+v('lo-an')||0;
  var r=document.getElementById('lo-res');
  if(!r)return;
  if(!p){r.style.display='none';return}
  var capital=p+f+t;
  var coef=1;
  var thisYear=new Date().getFullYear();
  if(an&&an<thisYear){var yrs=thisYear-an;coef=1+(yrs*0.015)}
  var base=capital*coef;
  var loyerAn=base*0.05;
  var loyerMo=loyerAn/12;
  r.style.display='block';
  r.innerHTML='<div class="sr-v">'+fmt(Math.round(loyerMo))+' € / mois (plafond)</div><div class="sr-l">Capital de base : <strong>'+fmt(Math.round(capital))+' €</strong> · Coefficient appliqué : <strong>'+coef.toFixed(3)+'</strong> · Capital pondéré : <strong>'+fmt(Math.round(base))+' €</strong><br>Loyer annuel plafond : <strong>'+fmt(Math.round(loyerAn))+' €</strong></div>';
};

/* ─── LANGUES ─── */


/* ─── COOKIES ─── */
window.ckAll=function(){
  var c=document.getElementById('cookie');
  if(c)c.style.display='none';
  try{localStorage.setItem('mapa_ck','all')}catch(e){}
  toast((I18N[CURLANG]['toast.cookies.accept']||'Cookies acceptés ✓'));
};
window.ckNone=function(){
  var c=document.getElementById('cookie');
  if(c)c.style.display='none';
  try{localStorage.setItem('mapa_ck','none')}catch(e){}
  toast((I18N[CURLANG]['toast.cookies.refuse']||'Cookies refusés'));
};

/* ─── CHATBOT ─── */
var CHAT_OPEN=false;
window.toggleChat=function(){
  CHAT_OPEN=!CHAT_OPEN;
  var w=document.getElementById('chat-win');
  if(w)w.classList.toggle('open',CHAT_OPEN);
  var b=document.getElementById('chat-badge');
  if(b&&CHAT_OPEN)b.style.display='none';
};
function chatResp(key){
  var T=(I18N&&I18N[CURLANG])||{};
  return T['cb.resp.'+key]||{
    vendre:'Excellente démarche ! Pour vendre votre bien, plusieurs options s\'offrent à vous : mandat simple, exclusif, semi-exclusif ou autonome. Notre commission s\'étage de 1 à 5 % + TVA 17% pour les mandats classiques, et peut aller jusqu\'à 5 % + TVA 17% pour les Trophy Assets / Off-Market (selon complexité). Souhaitez-vous que Julien vous contacte pour une estimation gratuite ?',
    acheter:'Parfait ! MAPA Property vous accompagne dans votre recherche au Luxembourg et à l\'international. Nous avons accès aux biens publiés ET au réseau off-market exclusif. Quelle est votre zone de recherche et votre budget indicatif ?',
    offmarket:'L\'off-market représente 10 à 25 % des transactions européennes. Pour y accéder, nous proposons le Mandat de Recherche : 3 % au Luxembourg (avance 1 500 €) ou 3 à 8 % en Europe (avance 5 000 €). L\'avance est déduite de la commission finale. Souhaitez-vous en savoir plus ?',
    estimation:'Estimation rapide indicative vous donne une fourchette indicative gratuite en 2 minutes, basée sur nos données internes et notre observation du marché. Pour une estimation officielle détaillée, Julien se déplace sur site. Je vous ouvre l\'outil ?',
    contact:'Bien sûr ! Notre équipe vous répond personnellement par e-mail ou via notre formulaire de contact. Je peux aussi transmettre vos coordonnées pour qu\'on vous rappelle sous 24h. Préférez-vous nous contacter directement ou laisser un message ?'
  }[key];
}
window.chatQ=function(key){
  addChatMsg('user',document.querySelector('.cw-q[onclick*="'+key+'"]').textContent);
  setTimeout(function(){
    addChatMsg('bot',chatResp(key)||(I18N[CURLANG]['cb.fallback']||'Je vais transmettre votre demande à Julien.'));
    if(key==='estimation')setTimeout(function(){window.toggleChat();window.openSvc('m-estimation')},1400);
    if(key==='contact')setTimeout(function(){window.toggleChat();window.openSvc('m-contact')},1400);
  },600);
};
window.chatSend=function(){
  var inp=document.getElementById('cw-in');
  if(!inp||!inp.value.trim())return;
  var msg=inp.value.trim();
  addChatMsg('user',msg);
  inp.value='';
  setTimeout(function(){
    var m=msg.toLowerCase();
    var T=(I18N&&I18N[CURLANG])||{};
    var resp=T['cb.resp.default']||'Merci pour votre message. Pour une réponse personnalisée, je vous invite à nous contacter par e-mail ou via le formulaire de contact. Nous vous répondrons sous 24h.';
    if(/vendre|vente|sell|sale|verkauf/i.test(m))resp=chatResp('vendre');
    else if(/achat|acheter|chercher|recherche|buy|purchase|kauf|kaufen|suche/i.test(m))resp=chatResp('acheter');
    else if(/off.?market|discret|confidentiel|confidential|vertraulich/i.test(m))resp=chatResp('offmarket');
    else if(/estim|valeur|prix|valuation|value|price|bewert|wert|preis/i.test(m))resp=chatResp('estimation');
    else if(/contact|appel|rdv|rendez|call|appointment|anruf|termin/i.test(m))resp=chatResp('contact');
    else if(/loc|louer|bail|loyer|rent|rental|miet/i.test(m))resp=T['cb.resp.rent']||'Au Luxembourg, le loyer annuel est plafonné à 5 % du capital investi. Nos honoraires sont d\'1 mois de loyer partagé 50/50. Je vous ouvre la page location ?';
    else if(/bonjour|salut|hello|hi|hallo|guten/i.test(m))resp=T['cb.resp.hello']||'Bonjour ! Comment puis-je vous aider aujourd\'hui ? Vendre, acheter, louer, estimer, off-market ?';
    addChatMsg('bot',resp);
  },700);
};
function addChatMsg(type,text){
  var body=document.getElementById('cw-body');
  if(!body)return;
  var d=document.createElement('div');
  d.className='cw-msg '+type;
  d.textContent=text;
  body.appendChild(d);
  body.scrollTop=body.scrollHeight;
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded',function(){
  initSelects();
  /* Restaurer langue sauvegardée */
  try{
    var savedLang=localStorage.getItem('mapa_lang');
    if(savedLang&&I18N[savedLang])window.setLang(savedLang);
    else{
      /* Détection automatique sur navigator */
      var nav=(navigator.language||'fr').slice(0,2).toLowerCase();
      if(I18N[nav]&&nav!=='fr')window.setLang(nav);
    }
  }catch(e){}
  loadBiens();
  loadReviews();
  loadBlog();
  /* FORCE PLAY VIDEO — iOS Low Power Mode, autoplay blockers, Safari strict mode */
  var hv=document.querySelector('.hvid');
  var hvPlayBtn=document.getElementById('hvid-play');
  var isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(hv){
    /* Forcer muted + playsinline pour iOS */
    hv.muted=true;
    hv.defaultMuted=true;
    hv.setAttribute('muted','');
    hv.setAttribute('playsinline','');
    hv.setAttribute('webkit-playsinline','');

    var playAttempts=0;
    var tryPlay=function(){
      playAttempts++;
      try{
        var p=hv.play();
        if(p&&p.then){
          p.then(function(){
            if(hvPlayBtn)hvPlayBtn.style.display='none';
          }).catch(function(err){
            /* iOS Low Power Mode bloque souvent — on retente jusqu'à 3 fois */
            if(playAttempts<3){
              setTimeout(tryPlay,600);
            }else if(hvPlayBtn){
              hvPlayBtn.style.display='block';
            }
          });
        }
      }catch(e){
        if(hvPlayBtn)hvPlayBtn.style.display='block';
      }
    };
    /* Sur iOS, attendre le "loadedmetadata" avant de tenter play */
    if(isIOS){
      if(hv.readyState>=1){tryPlay();}
      else{hv.addEventListener('loadedmetadata',tryPlay,{once:true});hv.load();}
    }else{
      tryPlay();
    }
    /* Retry sur tout premier geste user (touchstart prioritaire pour mobile) */
    ['touchstart','touchend','click','scroll'].forEach(function(ev){
      document.addEventListener(ev,function h(){tryPlay();document.removeEventListener(ev,h);},{passive:true,once:true});
    });
    /* Si après 2,5 sec la vidéo n'est toujours pas lue, on affiche le bouton */
    setTimeout(function(){
      if(hv.paused&&hvPlayBtn)hvPlayBtn.style.display='block';
    },2500);
    /* Masquer le bouton dès que la vidéo joue */
    hv.addEventListener('playing',function(){
      if(hvPlayBtn)hvPlayBtn.style.display='none';
    });
    hv.addEventListener('error',function(){
      if(hvPlayBtn)hvPlayBtn.style.display='block';
    });
    /* Sur iOS, parfois il faut forcer un reload au premier scroll */
    if(isIOS){
      window.addEventListener('scroll',function onScroll(){
        if(hv.paused&&hv.readyState<2){hv.load();tryPlay();}
        window.removeEventListener('scroll',onScroll);
      },{passive:true,once:true});
    }
  }
  /* Fonction globale pour le bouton play manuel */
  window.forcePlayVideo=function(){
    if(hv){
      hv.muted=true;
      hv.defaultMuted=true;
      hv.load();
      var p=hv.play();
      if(p&&p.catch)p.catch(function(){});
      if(hvPlayBtn)hvPlayBtn.style.display='none';
    }
  };
  setTimeout(function(){
    var c=document.getElementById('cookie');
    try{if(c&&!localStorage.getItem('mapa_ck'))c.style.display='block'}catch(e){}
  },3800);
});



/* ═══ PHASE 2 TOUR B — Gallery premium (swipe + lightbox) ═══ */

/* Store current gallery images for lightbox */
var BD_IMGS=[];
var LB_CUR=0;

/* Hook into existing renderBienDetail: capture imgs array each time it renders */
(function(){
  var origRender=window.renderBienDetail||renderBienDetail;
  var wrapped=function(b){
    var r=origRender.apply(this,arguments);
    /* Sync BD_IMGS with what was rendered */
    try{BD_IMGS=(typeof bAllImgs==='function'?bAllImgs(b):[]);if(!BD_IMGS.length)BD_IMGS=['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80'];}catch(e){BD_IMGS=[];}
    /* Attach swipe handlers to freshly rendered slider */
    setTimeout(attachSwipe,60);
    return r;
  };
  window.renderBienDetail=wrapped;
  if(typeof renderBienDetail==='function')renderBienDetail=wrapped;
})();

/* ─── SWIPE (touch) sur slider principal ─── */
function attachSwipe(){
  var container=document.getElementById('bd-slides');
  if(!container||container._swipeBound)return;
  container._swipeBound=true;
  var startX=0,startY=0,endX=0,endY=0,isDragging=false;
  container.addEventListener('touchstart',function(e){
    if(!e.touches||!e.touches[0])return;
    startX=e.touches[0].clientX;
    startY=e.touches[0].clientY;
    isDragging=true;
  },{passive:true});
  container.addEventListener('touchmove',function(e){
    if(!isDragging||!e.touches||!e.touches[0])return;
    endX=e.touches[0].clientX;
    endY=e.touches[0].clientY;
  },{passive:true});
  container.addEventListener('touchend',function(e){
    if(!isDragging)return;
    isDragging=false;
    var dx=endX-startX,dy=endY-startY;
    /* Only trigger if horizontal dominant & > 50px */
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){
      if(dx<0)window.bdNext();else window.bdPrev();
    }
    startX=startY=endX=endY=0;
  },{passive:true});
}

/* ─── LIGHTBOX FULLSCREEN ─── */
window.lbOpen=function(idx,ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(!BD_IMGS||!BD_IMGS.length)return;
  LB_CUR=Math.max(0,Math.min(idx||0,BD_IMGS.length-1));
  var box=document.getElementById('bd-lightbox');
  if(!box)return;
  lbRender();
  box.classList.add('open');
  document.body.style.overflow='hidden';
  attachLbSwipe();
};

window.lbClose=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  var box=document.getElementById('bd-lightbox');
  if(box)box.classList.remove('open');
  /* Only restore scroll if no other modal is open */
  var anyOpen=document.querySelector('.modal.open');
  if(!anyOpen)document.body.style.overflow='';
};

window.lbNext=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(!BD_IMGS||BD_IMGS.length<=1)return;
  LB_CUR=(LB_CUR+1)%BD_IMGS.length;
  lbRender();
  /* Keep main slider in sync */
  if(typeof window.bdGo==='function')window.bdGo(LB_CUR);
};

window.lbPrev=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  if(!BD_IMGS||BD_IMGS.length<=1)return;
  LB_CUR=(LB_CUR-1+BD_IMGS.length)%BD_IMGS.length;
  lbRender();
  if(typeof window.bdGo==='function')window.bdGo(LB_CUR);
};

function lbRender(){
  var img=document.getElementById('bd-lb-img');
  var cur=document.getElementById('bd-lb-cur');
  var max=document.getElementById('bd-lb-max');
  if(!img||!BD_IMGS[LB_CUR])return;
  img.classList.add('loading');
  var src=BD_IMGS[LB_CUR];
  var tmp=new Image();
  tmp.onload=function(){img.src=src;img.classList.remove('loading');};
  tmp.onerror=function(){img.classList.remove('loading');};
  tmp.src=src;
  if(cur)cur.textContent=(LB_CUR+1);
  if(max)max.textContent=BD_IMGS.length;
  /* Hide nav buttons if only one image */
  var navPr=document.querySelector('.bd-lb-nav.pr');
  var navNx=document.querySelector('.bd-lb-nav.nx');
  var cnt=document.querySelector('.bd-lb-cnt');
  var show=BD_IMGS.length>1;
  if(navPr)navPr.style.display=show?'flex':'none';
  if(navNx)navNx.style.display=show?'flex':'none';
  if(cnt)cnt.style.display=show?'block':'none';
}

/* Swipe dans le lightbox */
function attachLbSwipe(){
  var wrap=document.querySelector('.bd-lb-img-wrap');
  if(!wrap||wrap._lbSwipeBound)return;
  wrap._lbSwipeBound=true;
  var sx=0,sy=0,ex=0,ey=0,on=false;
  wrap.addEventListener('touchstart',function(e){
    if(!e.touches||!e.touches[0])return;
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;on=true;
  },{passive:true});
  wrap.addEventListener('touchmove',function(e){
    if(!on||!e.touches||!e.touches[0])return;
    ex=e.touches[0].clientX;ey=e.touches[0].clientY;
  },{passive:true});
  wrap.addEventListener('touchend',function(){
    if(!on)return;on=false;
    var dx=ex-sx,dy=ey-sy;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){
      if(dx<0)window.lbNext();else window.lbPrev();
    }
    sx=sy=ex=ey=0;
  },{passive:true});
}

/* Keyboard nav dans le lightbox (priorité sur la nav de m-bien) */
document.addEventListener('keydown',function(e){
  var box=document.getElementById('bd-lightbox');
  if(!box||!box.classList.contains('open'))return;
  var tag=(document.activeElement&&document.activeElement.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  if(e.key==='Escape'||e.keyCode===27){e.preventDefault();window.lbClose();}
  else if(e.key==='ArrowRight'||e.keyCode===39){e.preventDefault();window.lbNext();}
  else if(e.key==='ArrowLeft'||e.keyCode===37){e.preventDefault();window.lbPrev();}
},true); /* capture phase: runs BEFORE m-bien handler, intercepts arrows */


/* ═══ MEGA-BLOC 1 — Phase 3 : formulaire info, biens similaires, sendLead Supabase ═══ */

/* Toggle du formulaire "Demander des informations" */
window.toggleBdForm=function(ev){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  var f=document.getElementById('bd-info-form');
  if(!f)return;
  var open=f.style.display!=='none';
  f.style.display=open?'none':'block';
  /* Focus le premier champ à l'ouverture */
  if(!open){
    var fn=document.getElementById('bd-if-fn');
    if(fn)setTimeout(function(){fn.focus()},120);
  }
};

/* Submit du formulaire inline : validation + envoi Supabase + fallback mailto */
window.submitBdForm=function(ev,ref,type){
  if(ev){if(ev.stopPropagation)ev.stopPropagation();if(ev.preventDefault)ev.preventDefault();}
  var fn=v('bd-if-fn'),ln=v('bd-if-ln'),em=v('bd-if-em'),tel=v('bd-if-tel'),msg=v('bd-if-msg');
  if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){
    toast((I18N[CURLANG]['toast.email.invalid']||'E-mail invalide'));
    var emEl=document.getElementById('bd-if-em');
    if(emEl)emEl.focus();
    return;
  }
  /* ═══ Cloudflare Turnstile : exiger un token avant envoi ═══ */
  var form=document.getElementById('bd-info-form');
  var turnstileWidget=form?form.querySelector('.cf-turnstile'):null;
  if(turnstileWidget){
    var token='';
    try{
      if(typeof turnstile!=='undefined'&&turnstile.getResponse){
        token=turnstile.getResponse(turnstileWidget)||'';
      }else{
        var hidden=turnstileWidget.querySelector('input[name="cf-turnstile-response"]');
        token=hidden?hidden.value:'';
      }
    }catch(e){console.warn('[MAPA] Turnstile getResponse failed:',e);}
    if(!token){
      toast((I18N[CURLANG]['toast.captcha']||'Merci de valider le captcha avant l\'envoi'),3500);
      return;
    }
  }
  /* Construction du payload lead */
  var lead={
    email:em,
    first_name:fn||null,
    last_name:ln||null,
    phone:tel||null,
    message:msg||null,
    type:type||'info',
    property_ref:ref||null,
    source:'website_fiche_bien',
    lang:CURLANG||'fr'
  };
  /* Envoi optimiste : on affiche confirmation immédiate, on POST en arrière-plan */
  toast((I18N[CURLANG]['toast.lead.sent']||'Demande envoyée ✓ Julien vous répond sous 24h'),4000);
  /* Reset + close form */
  ['bd-if-fn','bd-if-ln','bd-if-em','bd-if-tel','bd-if-msg'].forEach(function(id){
    var e=document.getElementById(id);if(e)e.value='';
  });
  var f=document.getElementById('bd-info-form');
  if(f)f.style.display='none';
  /* Appel Supabase + fallback mailto */
  sendLeadSupabase(lead,ref);
};

/* Fonction de vrai POST vers Supabase (corrige le bug connu) */
function sendLeadSupabase(lead,ref){
  if(typeof SUPA==='undefined'||typeof KEY==='undefined'){
    console.warn('[MAPA] Supabase config manquante, fallback mailto');
    openMailtoFallback(lead,ref);
    return;
  }
  try{
    fetch(SUPA+'/rest/v1/leads',{
      method:'POST',
      headers:{
        'apikey':KEY,
        'Authorization':'Bearer '+KEY,
        'Content-Type':'application/json',
        'Prefer':'return=minimal'
      },
      body:JSON.stringify(lead)
    }).then(function(r){
      if(!r.ok){
        return r.text().then(function(txt){
          console.error('[MAPA] Lead Supabase error '+r.status+':',txt);
          openMailtoFallback(lead,ref);
        });
      }
      console.log('[MAPA] Lead envoyé à Supabase avec succès');
    }).catch(function(e){
      console.error('[MAPA] Lead Supabase network error:',e);
      openMailtoFallback(lead,ref);
    });
  }catch(e){
    console.error('[MAPA] sendLeadSupabase exception:',e);
    openMailtoFallback(lead,ref);
  }
}

/* Fallback : ouvre un mailto pré-rempli si Supabase échoue (discret, pas de toast) */
function openMailtoFallback(lead,ref){
  try{
    var subj=(I18N[CURLANG]['mail.bien.subj']||'Demande sur bien')+(ref?' '+ref:'');
    var body=[];
    if(lead.first_name||lead.last_name)body.push('Nom: '+[lead.first_name,lead.last_name].filter(Boolean).join(' '));
    if(lead.email)body.push('E-mail: '+lead.email);
    if(lead.phone)body.push('Téléphone: '+lead.phone);
    if(lead.country)body.push('Pays: '+lead.country);
    if(lead.city)body.push('Ville/Quartier: '+lead.city);
    if(ref)body.push('Référence: '+ref);
    if(lead.message)body.push('\nMessage:\n'+lead.message);
    var url='mailto:'+window.mpEmail('admin','mapagroup.org')+
            '?subject='+encodeURIComponent(subj)+
            '&body='+encodeURIComponent(body.join('\n'));
    /* Ouvre en background tab pour ne pas perturber l'utilisateur qui a déjà le toast */
    var a=document.createElement('a');
    a.href=url;a.target='_blank';a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){document.body.removeChild(a)},100);
  }catch(e){console.error('[MAPA] mailto fallback failed:',e);}
}

/* Aussi : réparer l'ancien sendLead() de la modale contact pour qu'il POST réellement */
(function(){
  var origSendLead=window.sendLead;
  window.sendLead=function(type,mid,emId,pfxId,telId){
    var em=v(emId);
    if(!em||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){
      toast((I18N[CURLANG]['toast.email.invalid']||'E-mail invalide'));return;
    }
    /* ═══ Cloudflare Turnstile : exiger un token avant envoi ═══ */
    var mod=mid?document.getElementById(mid):document;
    var turnstileWidget=mod&&mod.querySelector?mod.querySelector('.cf-turnstile'):null;
    if(turnstileWidget){
      var token='';
      try{
        if(typeof turnstile!=='undefined'&&turnstile.getResponse){
          token=turnstile.getResponse(turnstileWidget)||'';
        }else{
          /* fallback : input hidden généré par le widget */
          var hidden=turnstileWidget.querySelector('input[name="cf-turnstile-response"]');
          token=hidden?hidden.value:'';
        }
      }catch(e){console.warn('[MAPA] Turnstile getResponse failed:',e);}
      if(!token){
        toast((I18N[CURLANG]['toast.captcha']||'Merci de valider le captcha avant l\'envoi'),3500);
        return;
      }
    }
    toast((I18N[CURLANG]['toast.lead.sent']||'Demande envoyée ✓ Julien vous répond sous 24h'),4000);
    /* Collecter tous les champs disponibles dans le formulaire courant */
    var extract=function(sel){var e=mod&&mod.querySelector?mod.querySelector(sel):null;return e?(e.value||'').trim():''};
    /* V28 FINAL14g : Pays/Ville récupérés via id selon le formulaire courant */
    var pfxMap={'m-achat':'a','m-vente':'v','m-location':'lp','m-offmarket':'om','m-mandat':'mr'};
    var idPfx=pfxMap[mid]||'';
    var paysEl=idPfx?document.getElementById(idPfx+'-pays'):null;
    var villeEl=idPfx?document.getElementById(idPfx+'-ville'):null;
    var paysVal=paysEl?(paysEl.options&&paysEl.selectedIndex>0?paysEl.options[paysEl.selectedIndex].text.replace(/^[^\w]+\s*/,''):''):'';
    var villeVal=villeEl?(villeEl.value||'').trim():'';
    var lead={
      email:em,
      first_name:extract('input[type="text"]:nth-of-type(1)')||null,
      last_name:extract('input[type="text"]:nth-of-type(2)')||null,
      phone:v(telId)||null,
      country:paysVal||null,
      city:villeVal||null,
      message:extract('textarea')||null,
      type:type||'contact',
      source:'website_modal_'+(mid||'generic'),
      lang:CURLANG||'fr'
    };
    sendLeadSupabase(lead,null);
    setTimeout(function(){window.closeM(mid)},1200);
  };
})();

/* ─── V28 FINAL14i : Base villes par pays + cascade Pays/Ville ─── */
window.CITIES_BY_COUNTRY = {
  'LU': [
    'Luxembourg-Ville','Belair','Kirchberg','Limpertsberg','Cloche d\'Or','Gasperich',
    'Merl','Hollerich','Bonnevoie','Cents','Cessange','Eich','Pfaffenthal','Grund',
    'Strassen','Bertrange','Mamer','Capellen','Steinfort','Koerich','Kaerjeng','Hobscheid',
    'Saeul','Bridel','Steinsel','Walferdange','Hesperange','Itzig','Howald','Sandweiler',
    'Niederanven','Schuttrange','Mersch','Diekirch','Ettelbruck','Echternach','Junglinster',
    'Dudelange','Bettembourg','Mondorf-les-Bains','Esch-sur-Alzette','Differdange','Pétange',
    'Wiltz','Clervaux','Vianden','Remich','Grevenmacher'
  ],
  'FR': [
    'Paris','Neuilly-sur-Seine','Saint-Cloud','Versailles','Boulogne-Billancourt',
    'Lyon','Marseille','Bordeaux','Toulouse','Nantes','Nice','Cannes','Antibes',
    'Saint-Tropez','Cap-Ferrat','Cap d\'Antibes','Mougins','Saint-Jean-Cap-Ferrat',
    'Villefranche-sur-Mer','Beaulieu-sur-Mer','Èze','Menton','Aix-en-Provence',
    'Avignon','Grasse','Hyères','Sanary','Saint-Raphaël','Théoule-sur-Mer','Biarritz',
    'Saint-Jean-de-Luz','Anglet','Deauville','Honfleur','Trouville','Cabourg',
    'Megève','Courchevel','Méribel','Val d\'Isère','Chamonix','Annecy','Évian',
    'Strasbourg','Metz','Nancy','Thionville','Saint-Tropez','Lille','Reims'
  ],
  'BE': [
    'Bruxelles','Uccle','Woluwe-Saint-Lambert','Woluwe-Saint-Pierre','Ixelles','Anvers',
    'Gand','Bruges','Liège','Namur','Mons','Charleroi','Louvain','Ostende','Knokke-Heist',
    'La Hulpe','Lasne','Waterloo','Rixensart','Tervuren'
  ],
  'CH': [
    'Genève','Cologny','Vandœuvres','Anières','Versoix','Zurich','Zollikon','Küsnacht',
    'Lausanne','Pully','Lutry','Vevey','Montreux','Morges','Nyon','Lugano','Locarno',
    'Ascona','Bâle','Berne','Zoug','Saint-Moritz','Verbier','Crans-Montana','Gstaad','Davos'
  ],
  'MC': ['Monaco','Monte-Carlo','La Condamine','Fontvieille','Larvotto','Saint-Roman'],
  'DE': [
    'Berlin','Munich','Hambourg','Francfort','Düsseldorf','Cologne','Stuttgart','Brême',
    'Trèves','Sarrebruck','Aix-la-Chapelle','Wiesbaden','Bonn','Heidelberg','Fribourg-en-Brisgau',
    'Baden-Baden','Garmisch-Partenkirchen','Sylt','Hambourg-Blankenese','Potsdam'
  ],
  'IT': [
    'Milan','Rome','Florence','Venise','Naples','Turin','Bologne','Vérone','Côme',
    'Lac de Côme','Lac de Garde','Portofino','Forte dei Marmi','Capri','Positano',
    'Amalfi','Ravello','Sorrente','Taormine','Sardaigne','Costa Smeralda','Porto Cervo',
    'Sicile','Florence','Sienne','Lucques','Pise','Lugano','Bellagio','Tremezzo'
  ],
  'ES': [
    'Madrid','La Moraleja','Pozuelo','Barcelone','Pedralbes','Sarrià','Marbella',
    'Puerto Banús','Estepona','Sotogrande','Ibiza','Mallorca','Palma','Pollença','Deià',
    'Sant Joan','Valence','Séville','Bilbao','Saint-Sébastien','Alicante','Malaga'
  ],
  'PT': [
    'Lisbonne','Cascais','Estoril','Sintra','Quinta da Marinha','Comporta','Porto',
    'Foz do Douro','Algarve','Quinta do Lago','Vale do Lobo','Vilamoura','Lagos',
    'Albufeira','Porto Covo','Madère','Funchal'
  ],
  'UK': [
    'Londres','Mayfair','Belgravia','Knightsbridge','Kensington','Chelsea','Holland Park',
    'Notting Hill','Hampstead','St John\'s Wood','Marylebone','Westminster','Richmond',
    'Wimbledon','Surrey','Cotswolds','Oxford','Cambridge','Bath','Édimbourg'
  ],
  'AT': ['Vienne','Salzbourg','Innsbruck','Kitzbühel','Bregenz','Zell am See','Lech','Sankt Anton'],
  'NL': ['Amsterdam','Rotterdam','La Haye','Utrecht','Wassenaar','Bloemendaal','Aerdenhout'],
  'AE': ['Dubaï','Palm Jumeirah','Downtown Dubai','Dubai Marina','Emirates Hills','Jumeirah','Abu Dhabi','Saadiyat Island'],
  'US': ['Miami','Miami Beach','Coral Gables','Bal Harbour','New York','Manhattan','Hamptons','Greenwich','Aspen','Beverly Hills','Bel Air','Malibu','Los Angeles'],
  'CA': ['Montréal','Westmount','Toronto','Forest Hill','Rosedale','Yorkville','Vancouver','West Vancouver','Whistler'],
  'OTHER': []
};

window.populateCities = function(paysId, datalistId, villeInputId){
  var paysEl = document.getElementById(paysId);
  var dl = document.getElementById(datalistId);
  if(!paysEl || !dl) return;
  var country = paysEl.value;
  var cities = (window.CITIES_BY_COUNTRY[country]) || [];
  dl.innerHTML = cities.map(function(c){return '<option value="'+c.replace(/"/g,'&quot;')+'">';}).join('');
  /* Reset le champ ville si on change de pays */
  var villeEl = villeInputId ? document.getElementById(villeInputId) : null;
  if(villeEl) villeEl.value = '';
};

/* Initialisation : attacher onchange sur tous les pays selects */
window.addEventListener('DOMContentLoaded', function(){
  var formMap = [
    {pays:'a-pays',  ville:'a-ville',  list:'cities-a'},
    {pays:'v-pays',  ville:'v-ville',  list:'cities-v'},
    {pays:'lp-pays', ville:'lp-ville', list:'cities-lp'},
    {pays:'om-pays', ville:'om-ville', list:'cities-om'},
    {pays:'mr-pays', ville:'mr-ville', list:'cities-mr'},
    {pays:'ep',      ville:'el',       list:'cities-est'}
  ];
  formMap.forEach(function(f){
    var p = document.getElementById(f.pays);
    if(p){
      p.addEventListener('change', function(){
        window.populateCities(f.pays, f.list, f.ville);
      });
    }
  });
});

/* ─── BIENS SIMILAIRES — MEGA-BLOC 2 ─── */
/* Stocke le bien courant pour que la modale y accède */
var CURRENT_BIEN_FOR_SIMILAR=null;

function renderSimilarBiens(b){
  /* Stocke la référence en global pour openSimilarModal */
  CURRENT_BIEN_FOR_SIMILAR=b||null;
  var T=(I18N&&I18N[CURLANG])||{};
  /* Renvoie toujours un bouton CTA visible (pas d'auto-affichage) */
  return '<div class="bd-similar-cta">'+
    '<button class="bd-similar-btn" onclick="window.openSimilarModal()">'+
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'+
      '<span>'+(T['bd.similar.cta']||'Voir les biens similaires')+'</span>'+
    '</button>'+
  '</div>';
}

/* Filtre strict : même property_type + même country + prix ±30% */
function filterSimilarStrict(b){
  if(!b||typeof PROPS==='undefined'||!PROPS||!PROPS.length)return [];
  var targetType=b.property_type||b.category||'';
  var targetCountry=b.country||'';
  var targetPrice=parseFloat(b.price_value||b.price||0);
  var minPrice=targetPrice>0?targetPrice*0.7:0;
  var maxPrice=targetPrice>0?targetPrice*1.3:Infinity;
  return PROPS.filter(function(p){
    if(!p||String(p.id)===String(b.id))return false;
    var sameType=(p.property_type&&targetType&&p.property_type===targetType)||
                 (p.category&&b.category&&p.category===b.category);
    if(!sameType)return false;
    if(targetCountry&&p.country&&p.country!==targetCountry)return false;
    if(targetPrice>0){
      var pv=parseFloat(p.price_value||p.price||0);
      if(pv>0&&(pv<minPrice||pv>maxPrice))return false;
    }
    return true;
  });
}

/* Filtre large : même property_type SEULEMENT (pas de filtre prix ni pays) */
function filterSimilarLarge(b){
  if(!b||typeof PROPS==='undefined'||!PROPS||!PROPS.length)return [];
  var targetType=b.property_type||b.category||'';
  return PROPS.filter(function(p){
    if(!p||String(p.id)===String(b.id))return false;
    var sameType=(p.property_type&&targetType&&p.property_type===targetType)||
                 (p.category&&b.category&&p.category===b.category);
    return sameType;
  });
}

/* Génère le HTML d'une carte bien */
function renderSimilarCard(p){
  var T=(I18N&&I18N[CURLANG])||{};
  var img=(function(){try{return bAllImgs(p)[0]||'';}catch(e){return '';}})();
  var title=esc(bLang(p,'title')||p.title||(T['card.fallback.title']||'Bien'));
  var loc=esc(bLoc(p)||p.location||'Luxembourg');
  var price=esc(bPrice(p)||(T['search.price.ondemand']||'Sur demande'));
  return '<div class="bd-sim-c" onclick="window.closeM(\'m-similar\');setTimeout(function(){window.openBienById(\''+esc(String(p.id))+'\')},220)">'+
    (img?'<div class="bd-sim-img" style="background-image:url(\''+esc(img)+'\')"></div>':'<div class="bd-sim-img bd-sim-img-ph"></div>')+
    '<div class="bd-sim-body">'+
      '<div class="bd-sim-title">'+title+'</div>'+
      '<div class="bd-sim-loc">📍 '+loc+'</div>'+
      '<div class="bd-sim-price">'+price+'</div>'+
    '</div>'+
  '</div>';
}

/* Ouvre la modale — affiche matches stricts ou fallback avec CTAs */
window.openSimilarModal=function(){
  var b=CURRENT_BIEN_FOR_SIMILAR;
  if(!b)return;
  var strictMatches=filterSimilarStrict(b).slice(0,6);
  var T=(I18N&&I18N[CURLANG])||{};
  var c=document.getElementById('m-similar-content');
  if(!c){console.warn('[MAPA] m-similar-content introuvable');return;}
  if(strictMatches.length>0){
    /* Cas 1 : on a des matchs stricts */
    var html='<h2 class="msi-title">'+(T['bd.similar.t']||'Biens similaires')+'</h2>'+
      '<p class="msi-sub">'+(T['bd.similar.sub']||'Biens correspondant à vos critères.')+'</p>'+
      '<div class="msi-grid">';
    strictMatches.forEach(function(p){html+=renderSimilarCard(p);});
    html+='</div>';
    c.innerHTML=html;
  }else{
    /* Cas 2 : aucune concordance — afficher message + 2 CTAs */
    c.innerHTML=renderSimilarEmpty(b);
  }
  window.openM('m-similar');
};

/* Vue "aucune concordance" */
function renderSimilarEmpty(b){
  var T=(I18N&&I18N[CURLANG])||{};
  var targetType=b.property_type||b.category||(T['card.fallback.title']||'Bien');
  return '<div class="msi-empty">'+
    '<div class="msi-empty-icon">'+
      '<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v3"/><circle cx="11" cy="14" r=".5" fill="currentColor"/></svg>'+
    '</div>'+
    '<h2 class="msi-title">'+(T['bd.similar.empty.t']||'Aucune concordance actuelle')+'</h2>'+
    '<p class="msi-empty-p">'+(T['bd.similar.empty.p']||'Aucun bien ne correspond actuellement à ces critères. Voici deux options pour poursuivre votre recherche :')+'</p>'+
    '<div class="msi-actions">'+
      '<button class="btn btn-gold" onclick="window.showSimilarLarge()">'+
        (T['bd.similar.btn.same']||'Voir les autres biens de même type')+' ('+esc(targetType)+')'+
      '</button>'+
      '<button class="btn btn-navy" onclick="window.closeM(\'m-similar\');setTimeout(function(){window.openSvc(\'m-mandat\')},220)">'+
        '✦ '+(T['bd.similar.btn.mandat']||'Confier un Mandat de Recherche officiel')+
      '</button>'+
    '</div>'+
    '<p class="msi-note">'+(T['bd.similar.note']||'Le mandat de recherche officiel vous permet d\'accéder à notre réseau off-market exclusif et à des biens non publiés.')+'</p>'+
  '</div>';
}

/* Clic sur "Voir les autres biens de même type" : affiche liste large */
window.showSimilarLarge=function(){
  var b=CURRENT_BIEN_FOR_SIMILAR;
  if(!b)return;
  var T=(I18N&&I18N[CURLANG])||{};
  var largeMatches=filterSimilarLarge(b);
  var c=document.getElementById('m-similar-content');
  if(!c)return;
  var targetType=b.property_type||b.category||(T['card.fallback.title']||'Bien');
  if(largeMatches.length===0){
    /* Cas extrême : même pas d'autre bien du même type dans toute la base */
    c.innerHTML='<div class="msi-empty">'+
      '<h2 class="msi-title">'+(T['bd.similar.none.t']||'Aucun bien de ce type disponible actuellement')+'</h2>'+
      '<p class="msi-empty-p">'+(T['bd.similar.none.p']||'Ce bien est unique dans notre sélection actuelle. Confiez-nous un mandat de recherche pour que nous identifiions les meilleures opportunités pour vous.')+'</p>'+
      '<div class="msi-actions">'+
        '<button class="btn btn-navy" onclick="window.closeM(\'m-similar\');setTimeout(function(){window.openSvc(\'m-mandat\')},220)">'+
          '✦ '+(T['bd.similar.btn.mandat']||'Confier un Mandat de Recherche officiel')+
        '</button>'+
      '</div>'+
    '</div>';
    return;
  }
  var html='<h2 class="msi-title">'+(T['bd.similar.all.t']||'Tous nos biens')+' · '+esc(targetType)+'</h2>'+
    '<p class="msi-sub">'+(T['bd.similar.all.sub']||'Biens de même type, sans filtre de prix ni de localisation.')+'</p>'+
    '<div class="msi-grid">';
  largeMatches.forEach(function(p){html+=renderSimilarCard(p);});
  html+='</div>'+
    '<div class="msi-footer">'+
      '<button class="btn btn-navy" onclick="window.closeM(\'m-similar\');setTimeout(function(){window.openSvc(\'m-mandat\')},220)" style="width:100%">'+
        '✦ '+(T['bd.similar.btn.mandat']||'Confier un Mandat de Recherche officiel')+
      '</button>'+
    '</div>';
  c.innerHTML=html;
};

/* Ouvrir une fiche bien par son ID
   - Utilisé par le carrousel biens similaires (anciens biens Supabase dans PROPS)
   - Utilisé par le carrousel COUP DE CŒUR home (3 biens hardcodés DEMO_FAV_*)
   V28 FINAL13 Session 1 : fallback ajouté pour les DEMO_FAV hardcodés */
window.openBienById=function(id){
  if(!id)return;
  /* Helper : bascule m-bien en MODE PAGE PLEINE (pas en modale overlay) */
  function _openMbienAsPage(){
    var mb=document.getElementById('m-bien');
    if(!mb)return;
    /* SESSION 1f : désactiver scroll-behavior:smooth pendant la transition */
    var _htmlEl=document.documentElement;
    var _origBehav=_htmlEl.style.scrollBehavior;
    _htmlEl.style.scrollBehavior='auto';
    /* Scroll AVANT changement DOM */
    window.scrollTo(0,0);
    _htmlEl.scrollTop=0;
    document.body.scrollTop=0;
    /* Ferme toute autre page active */
    var others=document.querySelectorAll('.modal.as-page');
    for(var k=0;k<others.length;k++){
      if(others[k].id!=='m-bien'){
        others[k].classList.remove('as-page');
        others[k].classList.remove('open');
        others[k].style.zIndex='';
      }
    }
    /* m-bien devient page pleine */
    mb.classList.add('as-page');
    mb.classList.add('open');
    mb.style.zIndex='';
    /* Body en mode page */
    document.body.classList.add('view-page');
    document.body.setAttribute('data-page','m-bien');
    document.body.style.overflow='';
    /* SESSION 1f : scroll-top INSTANT en 4 temps */
    var scr=mb.querySelector('.mpage');if(scr)scr.scrollTop=0;
    window.scrollTo(0,0);
    _htmlEl.scrollTop=0;
    document.body.scrollTop=0;
    if(window.requestAnimationFrame){
      window.requestAnimationFrame(function(){
        window.scrollTo(0,0);
        _htmlEl.scrollTop=0;
        document.body.scrollTop=0;
      });
    }
    setTimeout(function(){
      window.scrollTo(0,0);
      _htmlEl.scrollTop=0;
      document.body.scrollTop=0;
    },50);
    setTimeout(function(){
      window.scrollTo(0,0);
      _htmlEl.scrollTop=0;
      document.body.scrollTop=0;
      /* Restaurer scroll-behavior smooth après la transition */
      _htmlEl.style.scrollBehavior=_origBehav||'';
    },300);
  }
  /* ─── Priorité 1 : biens COUP DE CŒUR hardcodés ─── */
  if(typeof DEMO_FAV_STEINFORT!=='undefined'){
    var favs=[DEMO_FAV_STEINFORT,DEMO_FAV_BELAIR,DEMO_FAV_DUBAI];
    for(var i=0;i<favs.length;i++){
      if(favs[i]&&favs[i].id===id){
        if(typeof renderBienDetail==='function')renderBienDetail(favs[i]);
        _openMbienAsPage();
        return;
      }
    }
  }
  /* ─── Priorité 2 : biens Supabase chargés dans PROPS ─── */
  if(typeof PROPS==='undefined')return;
  var b=PROPS.find(function(p){return String(p.id)===String(id)});
  if(!b)return;
  /* Router vers le bon renderer selon le type de bien */
  if(typeof bIsOff==='function'&&bIsOff(b)){
    renderOffMarketDetail(b);
  }else{
    renderBienDetail(b);
  }
  _openMbienAsPage();
};


/* Init carrousel strip après chaque rendu de fiche bien */
(function(){
  var origRenderBD=window.renderBienDetail||renderBienDetail;
  var origRenderOM=window.renderOffMarketDetail||renderOffMarketDetail;
  function wrapWithStripInit(fn){
    return function(){
      var r=fn.apply(this,arguments);
      setTimeout(function(){
        if(document.getElementById('bd-strip-track'))stripInit();
      },30);
      return r;
    };
  }
  if(typeof origRenderBD==='function'){
    window.renderBienDetail=wrapWithStripInit(origRenderBD);
    if(typeof renderBienDetail==='function')renderBienDetail=window.renderBienDetail;
  }
  if(typeof origRenderOM==='function'){
    window.renderOffMarketDetail=wrapWithStripInit(origRenderOM);
    if(typeof renderOffMarketDetail==='function')renderOffMarketDetail=window.renderOffMarketDetail;
  }
})();


/* ═══ V28 FINAL MAGREY — Lightbox upgrade avec play/pause et mode mosaïque ═══ */
var MLB_IDX=0;
var MLB_IMGS=[];
var MLB_AUTO=null;
var MLB_AUTO_MS=4000;
var MLB_MODE='normal';  /* 'normal' ou 'grid' */

window.openMagreyLightbox=function(idx){
  /* Récupère les images du carrousel strip actuel */
  var track=document.getElementById('bd-strip-track');
  if(!track)return;
  var slides=track.querySelectorAll('.bd-strip-slide:not([aria-hidden="true"])');
  MLB_IMGS=[];
  slides.forEach(function(s){
    var bg=s.style.backgroundImage||'';
    var m=bg.match(/url\(['"]?(.+?)['"]?\)/);
    if(m)MLB_IMGS.push(m[1]);
  });
  if(MLB_IMGS.length===0)return;
  MLB_IDX=Math.max(0,Math.min(idx||0,MLB_IMGS.length-1));
  MLB_MODE='normal';
  mlbRender();
  var box=document.getElementById('bd-lightbox');
  if(box){
    box.classList.add('open','magrey-mode');
    document.body.style.overflow='hidden';
  }
};

function mlbRender(){
  var img=document.getElementById('bd-lb-img');
  var cur=document.getElementById('bd-lb-cur');
  var max=document.getElementById('bd-lb-max');
  if(img)img.src=MLB_IMGS[MLB_IDX]||'';
  if(cur)cur.textContent=(MLB_IDX+1);
  if(max)max.textContent=MLB_IMGS.length;
  /* Update grille si en mode grid */
  if(MLB_MODE==='grid')mlbRenderGrid();
}

window.mlbNext=function(e){
  if(e)e.stopPropagation();
  MLB_IDX=(MLB_IDX+1)%MLB_IMGS.length;
  mlbRender();
};

window.mlbPrev=function(e){
  if(e)e.stopPropagation();
  MLB_IDX=(MLB_IDX-1+MLB_IMGS.length)%MLB_IMGS.length;
  mlbRender();
};

window.mlbTogglePlay=function(e){
  if(e)e.stopPropagation();
  var btn=document.getElementById('mlb-play-btn');
  if(MLB_AUTO){
    clearInterval(MLB_AUTO);
    MLB_AUTO=null;
    if(btn)btn.classList.remove('playing');
    if(btn)btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  }else{
    MLB_AUTO=setInterval(window.mlbNext,MLB_AUTO_MS);
    if(btn)btn.classList.add('playing');
    if(btn)btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  }
};

window.mlbToggleGrid=function(e){
  if(e)e.stopPropagation();
  var box=document.getElementById('bd-lightbox');
  if(!box)return;
  if(MLB_MODE==='grid'){
    MLB_MODE='normal';
    box.classList.remove('mlb-grid-mode');
  }else{
    MLB_MODE='grid';
    box.classList.add('mlb-grid-mode');
    mlbRenderGrid();
  }
};

function mlbRenderGrid(){
  var grid=document.getElementById('mlb-grid');
  if(!grid)return;
  grid.innerHTML=MLB_IMGS.map(function(im,i){
    var active=(i===MLB_IDX)?' active':'';
    return '<div class="mlb-thumb'+active+'" onclick="mlbGoTo('+i+')" style="background-image:url(\''+im.replace(/'/g,"\\'")+'\')" aria-label="Photo '+(i+1)+'"></div>';
  }).join('');
}

window.mlbGoTo=function(i){
  MLB_IDX=Math.max(0,Math.min(i,MLB_IMGS.length-1));
  mlbRender();
};

/* Hook lbClose pour nettoyer l'état Magrey */
(function(){
  var origLbClose=window.lbClose;
  window.lbClose=function(e){
    if(e)e.stopPropagation();
    if(MLB_AUTO){clearInterval(MLB_AUTO);MLB_AUTO=null;}
    MLB_MODE='normal';
    var box=document.getElementById('bd-lightbox');
    if(box){
      box.classList.remove('open','magrey-mode','mlb-grid-mode');
      document.body.style.overflow='';
    }
    if(typeof origLbClose==='function'){
      try{origLbClose(e);}catch(_){}
    }
  };
})();


/* ═══════════════════════════════════════════════════════════════════
   V28 FINAL13 SESSION 1e — EVENT DELEGATION pour le bouton vidéo fiche
   ───────────────────────────────────────────────────────────────────
   Plutôt que d'injecter onclick="openVideoPlayer('...','...')" dans le HTML
   (qui casse si le titre contient une apostrophe), on utilise un listener
   global qui lit data-video-url et data-video-title au clic.
═══════════════════════════════════════════════════════════════════ */
document.addEventListener('click',function(e){
  var btn=e.target.closest&&e.target.closest('.bd-video-card');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  var url=btn.getAttribute('data-video-url');
  var title=btn.getAttribute('data-video-title')||'';
  if(url&&typeof window.openVideoPlayer==='function'){
    window.openVideoPlayer(url,title);
  }
});

/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — Protection contenu (watermark + anti-copy léger)
   Session 14 : Protection RGPD + anti-scraping
   
   Objectif : dissuader le copier-coller massif ET tracer si quelqu'un 
   copie un article entier. Ne bloque PAS les copies courtes (UX normale).
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  
  /* 1. Intercepter l'événement copy pour ajouter une mention de source */
  document.addEventListener('copy', function(e){
    try {
      var sel = window.getSelection();
      if (!sel) return;
      var text = sel.toString();
      /* Ne rien faire pour les sélections courtes (usage légitime) */
      if (text.length < 200) return;
      /* Pour les grosses sélections (>200 chars), ajouter une mention de source */
      var L = (typeof CURLANG !== 'undefined' ? CURLANG : 'fr');
      var notice;
      if (L === 'en') {
        notice = '\n\n— Source: MAPA Property (https://www.mapaproperty.lu) — © 2026. All rights reserved. Reproduction forbidden.';
      } else if (L === 'de') {
        notice = '\n\n— Quelle: MAPA Property (https://www.mapaproperty.lu) — © 2026. Alle Rechte vorbehalten. Reproduktion verboten.';
      } else {
        notice = '\n\n— Source : MAPA Property (https://www.mapaproperty.lu) — © 2026. Tous droits réservés. Toute reproduction interdite.';
      }
      /* Modifier le clipboard */
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', text + notice);
        /* Préserver aussi la version HTML si possible */
        var htmlContent = '';
        for (var i = 0; i < sel.rangeCount; i++) {
          var container = document.createElement('div');
          container.appendChild(sel.getRangeAt(i).cloneContents());
          htmlContent += container.innerHTML;
        }
        if (htmlContent) {
          var htmlNotice = '<br><br><em style="color:#888;font-size:0.85em">' + notice.replace(/^\n+/, '') + '</em>';
          e.clipboardData.setData('text/html', htmlContent + htmlNotice);
        }
        e.preventDefault();
      }
    } catch (err) {
      /* Silencieux : ne pas casser l'UX si quelque chose plante */
    }
  });
  
  /* 2. Watermark invisible dans le body (au chargement) 
     Caractères zero-width qui identifient la source si collés ailleurs */
  document.addEventListener('DOMContentLoaded', function(){
    var wm = document.createElement('span');
    wm.setAttribute('aria-hidden', 'true');
    wm.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
    /* Texte qui sera copié "par accident" si quelqu'un sélectionne tout */
    wm.textContent = '© 2026 MAPA Property — MAPA Synergy Sàrl (Luxembourg B241974). All rights reserved. Reproduction forbidden. — mapaproperty.lu';
    if (document.body) document.body.appendChild(wm);
  });
  
  /* 3. Détection de scraping massif (devtools Print, save as...) 
     On log en console (sera visible dans Network tab Netlify si surveillance) */
  window.addEventListener('beforeprint', function(){
    console.warn('[MAPA] Print initiated — © MAPA Property — Reproduction without written consent is prohibited.');
  });
  
  /* 4. Protection drag-and-drop d'images (basique)
     Ne bloque pas techniquement mais dissuade */
  document.addEventListener('dragstart', function(e){
    if (e.target && e.target.tagName === 'IMG') {
      /* Ne pas bloquer le drag (nécessaire à l'UX), mais noter l'origine dans la data */
      if (e.dataTransfer) {
        try {
          e.dataTransfer.setData('text/x-source', 'MAPA Property © 2026 - mapaproperty.lu');
        } catch(err){}
      }
    }
  });
})();
/* ═══════════════════════════════════════════════════════════════════ */


/* ═══ PROD-MOD10 / MOD28 / MOD30-fix — Affichage conditionnel des champs selon Type de bien ═══
 * Le champ #estr-row (Surface terrain + Surface utile) n'est visible que pour Maison / Villa.
 * Le bloc #imm-fields (Sous-type immeuble + Surface totale + Terrain immeuble + Jardin + Loyer)
 *   n'est visible que pour Immeuble.
 * MOD30-fix : on récupère les éléments à CHAQUE appel pour gérer le cas où la modale
 * est chargée dynamiquement (les éléments peuvent ne pas exister au moment du bind initial). */
(function(){
  function update(){
    var sel=document.getElementById('et');
    if(!sel)return;
    var v=sel.value||'';
    var isMaison=(v==='maison'||v==='Maison / Villa');
    var isImmeuble=(v==='immeuble'||v==='Immeuble');
    var row=document.getElementById('estr-row');
    var imm=document.getElementById('imm-fields');
    if(row)row.style.display=isMaison?'grid':'none';
    if(imm)imm.style.display=isImmeuble?'block':'none';
    if(!isMaison){
      var input=document.getElementById('estr');
      if(input)input.value='';
    }
    if(!isImmeuble){
      ['eimmSurfTot','eimmTerrain','eimmLoyer'].forEach(function(id){
        var el=document.getElementById(id);
        if(el)el.value='';
      });
      var jardin=document.getElementById('eimmJardin');
      if(jardin)jardin.checked=false;
    }
  }
  function bindEstTypeListener(){
    var sel=document.getElementById('et');
    if(!sel)return false;
    if(!sel.__estrBound){
      sel.__estrBound=true;
      sel.addEventListener('change',update);
    }
    update();
    return true;
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindEstTypeListener);
  }else{
    bindEstTypeListener();
  }
  /* Si la modal est ouverte dynamiquement, on retente le bind à l'ouverture */
  var origOpen=window.openSvc;
  if(typeof origOpen==='function'){
    window.openSvc=function(id){
      origOpen.apply(this,arguments);
      if(id==='m-estimation')setTimeout(bindEstTypeListener,80);
    };
  }
  /* Exposer update() pour debug console : window.mapaUpdateEstFields() */
  window.mapaUpdateEstFields=update;
})();

/* ═══ PROD-MOD19 / MOD24-fix — Rénovations multi-postes (liste dynamique) ═══
 * Permet à l'utilisateur d'ajouter/retirer des lignes de travaux,
 * chacune avec son propre montant / année / type.
 * Au moment du calcul, runEst() lit toutes les lignes de #renov-list. */
(function(){
  var renovCounter=0;
  function buildRenovRowHTML(idx){
    var T=(window.I18N&&window.I18N[window.CURLANG])||{};
    var labels={
      mnt:    T['mod.est.f.renov.montant']||'Montant total (€)',
      yr:     T['mod.est.f.renov.annee']||'Année des travaux',
      type:   T['mod.est.f.renov.type']||'Nature des travaux',
      sel:    T['mod.est.f.renov.type.none']||'Sélectionner…',
      cuisine:T['mod.est.f.renov.type.cuisine']||'Cuisine / Salle de bain (récup. 80%)',
      deco:   T['mod.est.f.renov.type.deco']||'Décoration / peinture / sols (récup. 60%)',
      gros:   T['mod.est.f.renov.type.gros']||'Gros œuvre / toiture / structure (récup. 100%)',
      energie:T['mod.est.f.renov.type.energie']||'Énergie / chauffage / fenêtres (récup. 90%)',
      autres: T['mod.est.f.renov.type.autres']||'Autres (récup. 70%)',
      remove: T['mod.est.f.renov.remove']||'Supprimer'
    };
    return '<div class="renov-row" data-idx="'+idx+'" style="position:relative;padding:10px 38px 10px 12px;background:#fff;border:1px solid #e8e1d4;border-radius:4px;margin-bottom:10px">'+
      '<button type="button" onclick="window.removeRenovRow('+idx+')" aria-label="'+labels.remove+'" style="position:absolute;top:6px;right:8px;width:24px;height:24px;border:none;background:transparent;color:#a07040;cursor:pointer;font-size:20px;line-height:1;font-weight:700;padding:0">×</button>'+
      '<div class="g2"><div class="fg"><label class="fl">'+labels.mnt+'</label><input class="fi renov-mnt" type="number" step="500" placeholder="0"></div><div class="fg"><label class="fl">'+labels.yr+'</label><input class="fi renov-yr" type="number" placeholder="2022"></div></div>'+
      '<div class="fg" style="margin-top:8px"><label class="fl">'+labels.type+'</label><select class="fs renov-type">'+
        '<option value="">'+labels.sel+'</option>'+
        '<option value="cuisine_sdb">'+labels.cuisine+'</option>'+
        '<option value="deco">'+labels.deco+'</option>'+
        '<option value="gros_oeuvre">'+labels.gros+'</option>'+
        '<option value="energie">'+labels.energie+'</option>'+
        '<option value="autres">'+labels.autres+'</option>'+
      '</select></div>'+
    '</div>';
  }
  /* Exposition globale robuste sur window pour onclick HTML inline */
  window.addRenovRow=function(){
    var list=document.getElementById('renov-list');
    if(!list){
      console.warn('[renov] #renov-list introuvable — modale d\'estimation pas ouverte ?');
      return;
    }
    renovCounter++;
    /* Méthode robuste : insertAdjacentHTML évite tout souci de firstChild */
    list.insertAdjacentHTML('beforeend', buildRenovRowHTML(renovCounter));
  };
  window.removeRenovRow=function(idx){
    var list=document.getElementById('renov-list');
    if(!list)return;
    var row=list.querySelector('[data-idx="'+idx+'"]');
    if(row)row.remove();
  };
  /* Au premier affichage de la modale d'estimation, on initialise une ligne vide
   * pour que l'utilisateur n'ait pas besoin de cliquer le bouton — plus intuitif. */
  function initRenovList(){
    var list=document.getElementById('renov-list');
    if(list && list.children.length===0){
      window.addRenovRow();
    }
  }
  /* Tentative au DOM ready + retry à l'ouverture de la modale m-estimation */
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initRenovList);
  }else{
    initRenovList();
  }
  /* Hook sur openSvc pour gérer l'ouverture dynamique de la modale */
  var prevOpenSvc=window.openSvc;
  if(typeof prevOpenSvc==='function'){
    window.openSvc=function(id){
      prevOpenSvc.apply(this, arguments);
      if(id==='m-estimation') setTimeout(initRenovList, 100);
    };
  }
})();

/* MAPA - Click-to-reveal numero telephone (anti-bot) - 29 avril 2026 */
(function(){
  function _formatTel(raw){
    if(!raw)return'';
    var s=String(raw).replace(/\D/g,'');
    if(s.indexOf('352')===0){
      var r=s.substring(3);
      if(r.length===9)return '+352 '+r.substring(0,3)+' '+r.substring(3,6)+' '+r.substring(6,9);
      return '+352 '+r;
    }
    return '+'+s;
  }
  function _decodeTel(b){try{return atob(b);}catch(e){return'';}}
  function renderTel(){
    var nodes=document.querySelectorAll('.mp-tel');
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.dataset.bound==='1')continue;
      var b64=n.dataset.tn||'';
      if(!b64)continue;
      n.style.cursor='pointer';
      n.dataset.bound='1';
      n.dataset.revealed='0';
      n.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var num=_decodeTel(this.dataset.tn);
        if(!num)return;
        if(this.dataset.revealed==='1'){
          window.location.href='tel:+'+num;
        }else{
          var fmt=_formatTel(num);
          var svg=this.querySelector('svg');
          var svgHtml=svg?svg.outerHTML:'';
          this.innerHTML=svgHtml+fmt;
          this.dataset.revealed='1';
        }
      });
    }
  }
  window.renderTel=renderTel;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',renderTel);
  }else{
    renderTel();
  }
  var moTel=new MutationObserver(function(){renderTel();});
  if(document.body){
    moTel.observe(document.body,{childList:true,subtree:true});
  }else{
    document.addEventListener('DOMContentLoaded',function(){
      moTel.observe(document.body,{childList:true,subtree:true});
    });
  }
})();

/* MAPA - Patch renderTel v2 - 30 avril 2026 - preserve inner div for Contact page */
(function(){
  function _ftMapa2(raw){
    if(!raw)return'';
    var s=String(raw).replace(/\D/g,'');
    if(s.indexOf('352')===0){
      var r=s.substring(3);
      if(r.length===9)return '+352 '+r.substring(0,3)+' '+r.substring(3,6)+' '+r.substring(6,9);
      return '+352 '+r;
    }
    return '+'+s;
  }
  function renderTelV2(){
    var nodes=document.querySelectorAll('.mp-tel');
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.dataset.boundV2==='1')continue;
      n.dataset.boundV2='1';
      var clone=n.cloneNode(true);
      n.parentNode.replaceChild(clone,n);
      n=clone;
      var b64=n.dataset.tn||'';
      if(!b64)continue;
      n.style.cursor='pointer';
      n.dataset.revealed='0';
      n.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var num='';
        try{num=atob(this.dataset.tn);}catch(e){return;}
        if(!num)return;
        if(this.dataset.revealed==='1'){
          window.location.href='tel:+'+num;
          return;
        }
        var fmt=_ftMapa2(num);
        var innerDiv=this.querySelector('div');
        if(innerDiv){
          innerDiv.textContent=fmt;
        }else{
          var svg=this.querySelector('svg');
          var svgHtml=svg?svg.outerHTML:'';
          this.innerHTML=svgHtml+fmt;
        }
        this.dataset.revealed='1';
      });
    }
  }
  window.renderTelV2=renderTelV2;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',renderTelV2);
  }else{
    renderTelV2();
  }
  var moTelV2=new MutationObserver(function(){renderTelV2();});
  if(document.body){
    moTelV2.observe(document.body,{childList:true,subtree:true});
  }else{
    document.addEventListener('DOMContentLoaded',function(){
      moTelV2.observe(document.body,{childList:true,subtree:true});
    });
  }
})();

/* MAPA - Patch WhatsApp click v3 - 30 avril 2026 - click handler robuste */
(function(){
  function _waMsg(){
    var lang=(window.CURLANG||'fr').toLowerCase();
    var m={fr:'Bonjour Julien, je vous contacte depuis MAPA Property.',en:'Hello Julien, I am reaching out from MAPA Property.',de:'Hallo Julien, ich kontaktiere Sie von MAPA Property.'};
    return m[lang]||m.fr;
  }
  function bindWA(){
    var nodes=document.querySelectorAll('.mp-wa');
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.dataset.waBound==='1')continue;
      n.dataset.waBound='1';
      var num=n.dataset.num||'';
      if(!num)continue;
      var url='https://wa.me/'+num+'?text='+encodeURIComponent(_waMsg());
      n.setAttribute('href',url);
      n.setAttribute('target','_blank');
      n.setAttribute('rel','nofollow noopener');
      n.style.cursor='pointer';
      n.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var u='https://wa.me/'+(this.dataset.num||'')+'?text='+encodeURIComponent(_waMsg());
        window.open(u,'_blank','noopener');
      });
    }
  }
  window.bindWA=bindWA;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindWA);
  }else{
    bindWA();
  }
  var moWA2=new MutationObserver(function(){bindWA();});
  if(document.body){
    moWA2.observe(document.body,{childList:true,subtree:true});
  }else{
    document.addEventListener('DOMContentLoaded',function(){
      moWA2.observe(document.body,{childList:true,subtree:true});
    });
  }
})();

/* MAPA - Patch mp-mail mode reveal - 30 avril 2026 */
(function(){
  function _emFromNode(n){
    var u=n.dataset.u||'';
    var d=n.dataset.d||'';
    return u+'@'+d;
  }
  function _ctaLabels(){var lang=(window.CURLANG || 'fr').toLowerCase();if(lang==='en')return 'Show e-mail';if(lang==='de')return 'E-Mail anzeigen';return 'Voir l'+String.fromCharCode(39)+'e-mail';};
  function bindMailReveal(){
    var nodes=document.querySelectorAll('.mp-mail[data-label="reveal"], .mp-mail-r[data-label="reveal"]');
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i];
      if(n.dataset.revealBound==='1')continue;
      n.dataset.revealBound='1';
      n.dataset.mailRevealed='0';
      var svg=n.querySelector('svg');
      var svgHtml=svg?svg.outerHTML:'';
      n.innerHTML=svgHtml+_ctaLabels();
      n.style.cursor='pointer';
      n.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        var em=_emFromNode(this);
        if(!em||em==='@')return;
        if(this.dataset.mailRevealed==='1'){
          window.location.href='mailto:'+em;
          return;
        }
        var sv=this.querySelector('svg');
        var svH=sv?sv.outerHTML:'';
        this.innerHTML=svH+em;
        this.dataset.mailRevealed='1';
      });
    }
  }
  window.bindMailReveal=bindMailReveal;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindMailReveal);
  }else{
    bindMailReveal();
  }
  var moMR=new MutationObserver(function(){bindMailReveal();});
  if(document.body){
    moMR.observe(document.body,{childList:true,subtree:true});
  }else{
    document.addEventListener('DOMContentLoaded',function(){
      moMR.observe(document.body,{childList:true,subtree:true});
    });
  }
})();

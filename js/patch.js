/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — patch.js (session 2026-04-28)
   ─────────────────────────────────────────────────────────────────
   Patches appliqués :
   1. Estimation : décomposition Mixte (chambres/bureaux/commerces)
   2. Estimation : autocomplete adresse Luxembourg
   3. Recherche & Coups de cœur : ouverture fiche bien en pleine page
   4. Blog : article ouvert en pleine page
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ════════════════════════════════════════════
     1. TOGGLE BLOC MIXTE
     ════════════════════════════════════════════ */
  window._toggleImmMixte=function(){
    var sel=document.getElementById('eimmSubtype');
    var bloc=document.getElementById('imm-mixte-fields');
    if(!sel||!bloc)return;
    bloc.style.display=(sel.value==='mixte')?'block':'none';
  };
  /* Toggle au moment où on ouvre la modale + lors du changement de type */
  document.addEventListener('DOMContentLoaded',function(){
    /* Hook sur le sélecteur principal type=immeuble */
    var et=document.getElementById('et');
    if(et){
      et.addEventListener('change',function(){
        setTimeout(window._toggleImmMixte,30);
      });
    }
    setTimeout(window._toggleImmMixte,400);
  });

  /* ════════════════════════════════════════════
     2. AUTOCOMPLETE ADRESSE LUXEMBOURG
     ──────────────────────────────────────────
     Quand l'utilisateur tape un nom de rue, on propose toutes les
     communes Luxembourg dont le préfixe (les 2-3 premiers caractères
     du mot principal) match. C'est volontairement une heuristique
     simple — pour un vrai autocomplete geoportail.lu il faudrait
     un proxy backend pour leur API.
     ════════════════════════════════════════════ */
  /* Mapping rues connues → quartier suggéré (à compléter au fil du temps) */
  /* Format : 'nom_rue': [quartier_suggéré, isHyperPrime]
   * isHyperPrime=true → la méthode coût applique +18% scarcity premium */
  var STREETS_HINT={
    /* Rues hyper-prime Vieille-Ville Luxembourg */
    'rue du curé':['Centre · Ville-Haute',true],
    'rue du cure':['Centre · Ville-Haute',true],
    'rue notre-dame':['Centre · Ville-Haute',true],
    'rue notre dame':['Centre · Ville-Haute',true],
    'rue philippe ii':['Centre · Ville-Haute',true],
    'rue de l\'eau':['Centre · Ville-Haute',true],
    'rue de leau':['Centre · Ville-Haute',true],
    'place d\'armes':['Centre · Ville-Haute',true],
    'place darmes':['Centre · Ville-Haute',true],
    'place guillaume ii':['Centre · Ville-Haute',true],
    'rue du marché-aux-herbes':['Centre · Ville-Haute',true],
    'rue du marche aux herbes':['Centre · Ville-Haute',true],
    'rue du fossé':['Centre · Ville-Haute',true],
    'rue du fosse':['Centre · Ville-Haute',true],
    'rue de la reine':['Centre · Ville-Haute',true],
    'côte d\'eich':['Centre · Ville-Haute',true],
    'cote deich':['Centre · Ville-Haute',true],
    'boulevard royal':['Centre · Ville-Haute',true],
    'boulevard prince henri':['Centre · Ville-Haute',true],
    'rue beaumont':['Centre · Ville-Haute',true],
    'rue des bains':['Centre · Ville-Haute',true],
    'rue aldringen':['Centre · Ville-Haute',true],
    'avenue monterey':['Centre · Ville-Haute',true],
    /* Belair / Limpertsberg prime */
    'avenue gaston diderich':['Belair',true],
    'avenue du x septembre':['Belair',true],
    'avenue victor hugo':['Limpertsberg',true],
    'avenue guillaume':['Limpertsberg',true],
    'boulevard grande-duchesse charlotte':['Limpertsberg',true],
    'boulevard grande duchesse charlotte':['Limpertsberg',true],
    /* Autres rues principales (non hyper-prime mais quartier reconnu) */
    'avenue de la liberté':['Gare · Hollerich',false],
    'avenue de la liberte':['Gare · Hollerich',false],
    'avenue jf kennedy':['Kirchberg',false],
    'avenue john f kennedy':['Kirchberg',false],
    'avenue kennedy':['Kirchberg',false],
    'place de paris':['Gare',false],
    'avenue de la gare':['Gare',false],
    'route d\'arlon':['Belair · Strassen',false],
    'route darlon':['Belair · Strassen',false]
  };

  /* Drapeau global utilisé par app.js pour appliquer le bonus zone hyper-prime */
  window._isAddrHyperPrime=false;

  /* Liste rapide des communes/quartiers les plus communs pour le
   * datalist (utilisé en fallback) */
  var COMMUNES_LUX=[
    'Luxembourg-Ville · Centre',
    'Luxembourg-Ville · Ville-Haute',
    'Luxembourg-Ville · Belair',
    'Luxembourg-Ville · Limpertsberg',
    'Luxembourg-Ville · Kirchberg',
    'Luxembourg-Ville · Merl',
    'Luxembourg-Ville · Gare',
    'Luxembourg-Ville · Hollerich',
    'Luxembourg-Ville · Bonnevoie',
    'Luxembourg-Ville · Gasperich',
    'Luxembourg-Ville · Cessange',
    'Luxembourg-Ville · Cents',
    'Luxembourg-Ville · Neudorf',
    'Luxembourg-Ville · Clausen',
    'Luxembourg-Ville · Pfaffenthal',
    'Luxembourg-Ville · Eich',
    'Luxembourg-Ville · Beggen',
    'Luxembourg-Ville · Dommeldange',
    'Luxembourg-Ville · Cloche d\'Or',
    'Strassen','Bertrange','Bereldange','Walferdange','Steinsel','Howald','Mamer','Bridel','Hesperange','Itzig','Fentange','Leudelange','Contern','Kopstal','Mersch','Junglinster','Bettembourg','Mondorf-les-Bains','Sandweiler','Roeser','Steinfort','Capellen','Heisdorf','Belval','Esch-sur-Alzette','Differdange','Pétange','Sanem','Diekirch','Ettelbruck','Wiltz','Vianden','Echternach','Remich','Grevenmacher','Wasserbillig','Dudelange','Schifflange','Rumelange','Kayl','Bascharage','Mondercange','Dippach','Aspelt','Beaufort','Larochette','Clervaux'
  ];

  function _initCitiesDatalist(){
    var dl=document.getElementById('cities-est');
    if(!dl)return;
    if(dl.children.length>0)return; /* déjà rempli */
    var html='';
    for(var i=0;i<COMMUNES_LUX.length;i++){
      html+='<option value="'+COMMUNES_LUX[i].replace(/"/g,'&quot;')+'">';
    }
    dl.innerHTML=html;
  }
  document.addEventListener('DOMContentLoaded',_initCitiesDatalist);
  setTimeout(_initCitiesDatalist,800);

  window._addrAutocomplete=function(){
    var addrEl=document.getElementById('eaddr');
    var elEl=document.getElementById('el');
    var hintEl=document.getElementById('addr-suggest-hint');
    if(!addrEl||!elEl)return;
    var addr=(addrEl.value||'').trim().toLowerCase();
    /* Nettoyage : supprime numéro de rue + virgule */
    var addrClean=addr.replace(/^\d+\s*[,.\-]?\s*/,'').replace(/,.*$/,'').trim();

    /* 1. Match exact dans STREETS_HINT */
    var foundEntry=null;
    var foundKey=null;
    if(STREETS_HINT[addrClean]){foundEntry=STREETS_HINT[addrClean];foundKey=addrClean;}
    else{
      /* 2. Match préfixe : si l'utilisateur tape "rue du cur", on match "rue du curé" */
      for(var k in STREETS_HINT){
        if(k.indexOf(addrClean)===0 && addrClean.length>=3){
          foundEntry=STREETS_HINT[k];foundKey=k;break;
        }
      }
    }

    if(foundEntry){
      var quartier=foundEntry[0];
      var isHyperPrime=foundEntry[1];
      window._isAddrHyperPrime=!!isHyperPrime;
      /* Pré-remplir uniquement si le champ localisation est vide */
      if(!elEl.value || elEl.value.trim()===''){
        elEl.value='Luxembourg-Ville · '+quartier.split(' · ')[0];
      }
      if(hintEl){
        var primeBadge=isHyperPrime?' <span style="background:linear-gradient(135deg,#B8865A,#D4A574);color:white;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-left:6px">Hyper-prime</span>':'';
        hintEl.innerHTML='✓ Adresse reconnue : <strong style="color:var(--cu)">'+quartier+'</strong>'+primeBadge+(isHyperPrime?'<br><span style="font-size:10.5px;color:var(--ink2);font-style:italic">Localisation iconique → premium scarcity de +12 % sur la valorisation au m².</span>':'');
        hintEl.style.color='var(--cu)';
      }
    }else{
      window._isAddrHyperPrime=false;
      if(hintEl){
        hintEl.innerHTML='';
      }
    }
  };

  /* ════════════════════════════════════════════
     3. PLEINE PAGE POUR FICHE BIEN
     ──────────────────────────────────────────
     Le code existant (app.js ligne 542-579) ne bascule m-bien en
     pleine page QUE si on était déjà dans une page (wasInPage).
     Or quand on clique sur un bien depuis :
        - la home (coups de cœur)
        - le résultat de recherche (m-search)
        - une notification
     on n'est PAS dans une page → la modale s'ouvre en mode flottant.

     SOLUTION : on patche openBien pour qu'il bascule TOUJOURS
     en pleine page sauf cas explicites (popup mini-fiche).
     ════════════════════════════════════════════ */
  function _patchOpenBienFullPage(){
    if(typeof window.openBien!=='function')return false;
    if(window.openBien.__forceFullPage)return true;

    var _origOpenBien=window.openBien;
    window.openBien=function(id){
      /* Appel original (remplit #bien-content + ouvre m-bien) */
      _origOpenBien(id);

      /* Force toujours la pleine page */
      var prevPage=document.querySelector('.modal.as-page');
      if(prevPage && prevPage.id!=='m-bien'){
        prevPage.classList.remove('as-page');
        prevPage.classList.remove('open');
        prevPage.style.zIndex='';
      }
      /* Si on vient d'une modale recherche, on la ferme */
      var msearch=document.getElementById('m-search');
      if(msearch && msearch.classList.contains('open') && !msearch.classList.contains('as-page')){
        msearch.classList.remove('open');
      }

      var mb=document.getElementById('m-bien');
      if(mb){
        mb.classList.add('as-page');
        mb.classList.add('open');
        mb.style.zIndex='';
      }
      document.body.classList.add('view-page');
      document.body.setAttribute('data-page','m-bien');
      document.body.style.overflow='';

      /* Scroll top systématique */
      if(typeof window._scrollTopAfterOpen==='function'){
        window._scrollTopAfterOpen();
      }else{
        window.scrollTo(0,0);
        if(mb) mb.scrollTop=0;
      }
    };
    window.openBien.__forceFullPage=true;
    return true;
  }
  /* Tente patch immédiat puis retry à plusieurs reprises pour passer
   * après les autres patches existants */
  _patchOpenBienFullPage();
  document.addEventListener('DOMContentLoaded',function(){
    _patchOpenBienFullPage();
    setTimeout(_patchOpenBienFullPage,200);
    setTimeout(_patchOpenBienFullPage,600);
    setTimeout(_patchOpenBienFullPage,1500);
  });

  /* ════════════════════════════════════════════
     4. PLEINE PAGE POUR ARTICLE BLOG
     ──────────────────────────────────────────
     Même logique : openBlogArticle ouvre m-blog-art en modale.
     On le bascule en pleine page systématiquement.
     ════════════════════════════════════════════ */
  function _patchOpenBlogArticleFullPage(){
    if(typeof window.openBlogArticle!=='function')return false;
    if(window.openBlogArticle.__forceFullPage)return true;

    var _origOpenBlog=window.openBlogArticle;
    window.openBlogArticle=function(idOrSlug){
      _origOpenBlog(idOrSlug);

      /* Ferme la page blog liste si elle est ouverte */
      var mblog=document.getElementById('m-blog');
      if(mblog && mblog.classList.contains('as-page')){
        mblog.classList.remove('as-page');
        mblog.classList.remove('open');
        mblog.style.zIndex='';
      }else if(mblog && mblog.classList.contains('open')){
        mblog.classList.remove('open');
      }

      var mba=document.getElementById('m-blog-art');
      if(mba){
        mba.classList.add('as-page');
        mba.classList.add('open');
        mba.style.zIndex='';
      }
      document.body.classList.add('view-page');
      document.body.setAttribute('data-page','m-blog-art');
      document.body.style.overflow='';
      window.scrollTo(0,0);
      if(mba) mba.scrollTop=0;
    };
    window.openBlogArticle.__forceFullPage=true;
    return true;
  }
  _patchOpenBlogArticleFullPage();
  document.addEventListener('DOMContentLoaded',function(){
    _patchOpenBlogArticleFullPage();
    setTimeout(_patchOpenBlogArticleFullPage,200);
    setTimeout(_patchOpenBlogArticleFullPage,600);
    setTimeout(_patchOpenBlogArticleFullPage,1500);
  });

  /* Override closeM pour gérer le retour quand on quitte une fiche
   * bien ou article ouverts en pleine page directe (sans page parente) */
  function _patchCloseMReturnHome(){
    if(typeof window.closeM!=='function')return false;
    if(window.closeM.__forceFullPagePatched)return true;
    var _origCloseM=window.closeM;
    window.closeM=function(id){
      var m=document.getElementById(id);
      if(m && m.classList.contains('as-page')){
        if(id==='m-bien' || id==='m-blog-art'){
          /* Si on vient d'une page parente (acheter, blog) : retour à elle */
          if(typeof window._lastPageSlug!=='undefined' && window._lastPageSlug){
            m.classList.remove('as-page');
            m.classList.remove('open');
            m.style.zIndex='';
            if(typeof window.navigateToPage==='function'){
              window.navigateToPage(window._lastPageSlug,false);
              return;
            }
          }
          /* Sinon retour home */
          m.classList.remove('as-page');
          m.classList.remove('open');
          m.style.zIndex='';
          document.body.classList.remove('view-page');
          document.body.removeAttribute('data-page');
          document.body.style.overflow='';
          window.scrollTo(0,0);
          return;
        }
      }
      return _origCloseM(id);
    };
    window.closeM.__forceFullPagePatched=true;
    return true;
  }
  document.addEventListener('DOMContentLoaded',function(){
    _patchCloseMReturnHome();
    setTimeout(_patchCloseMReturnHome,300);
    setTimeout(_patchCloseMReturnHome,900);
  });

  console.log('%c[MAPA] patch.js (session 2026-04-28) chargé : rendement V2 + adresse + pleine page','color:#B8865A;font-weight:bold');
})();

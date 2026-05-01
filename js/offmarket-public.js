/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — js/offmarket-public.js (v5 — diagnostics + fix)
   ─────────────────────────────────────────────────────────────────
   Version 5 (2026-04-28) :
   - Logs verbeux pour diagnostiquer pourquoi les biens Supabase
     n'apparaissent pas
   - Vérification stricte de la présence des éléments DOM cible
   - Force re-render au load + à chaque ouverture de m-offmarket
   - En cas d'échec fetch : affichage d'un message d'erreur dans la
     grille, PAS de fallback démo masqué
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══ CONFIG ═══ */
  var SUPA_URL  = 'https://dutfkblygfvhhwpzxmfz.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGZrYmx5Z2Z2aGh3cHp4bWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTcxMTMsImV4cCI6MjA5MTA5MzExM30.iauOM8aJhvdMCD1Cz4TzFLBTDKLO5tUc_fb1rTuUxrQ';
  var DEBUG = true;  /* mettre à false en production une fois OK */

  function log() {
    if (!DEBUG) return;
    var args = ['%c[off-market]', 'color:#B8865A;font-weight:bold'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    console.log.apply(console, args);
  }
  function warn() {
    var args = ['%c[off-market] ⚠', 'color:#c44;font-weight:bold'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    console.warn.apply(console, args);
  }

  /* ═══ HELPERS DE MAPPING ═══ */
  function countryLabel(code) {
    var m = {
      LU:'Luxembourg', FR:'France', BE:'Belgique', MC:'Monaco', CH:'Suisse',
      ES:'Espagne', IT:'Italie', AE:'Émirats arabes unis', UK:'Royaume-Uni',
      PT:'Portugal', DE:'Allemagne', NL:'Pays-Bas', AT:'Autriche', US:'États-Unis'
    };
    return m[code] || code || '';
  }
  function countryEN(code) {
    var m = {LU:'Luxembourg', FR:'France', BE:'Belgium', MC:'Monaco', CH:'Switzerland', ES:'Spain', IT:'Italy', AE:'United Arab Emirates', UK:'United Kingdom', PT:'Portugal', DE:'Germany', NL:'Netherlands', AT:'Austria', US:'United States'};
    return m[code] || code || '';
  }
  function countryDE(code) {
    var m = {LU:'Luxemburg', FR:'Frankreich', BE:'Belgien', MC:'Monaco', CH:'Schweiz', ES:'Spanien', IT:'Italien', AE:'Vereinigte Arabische Emirate', UK:'Vereinigtes Königreich', PT:'Portugal', DE:'Deutschland', NL:'Niederlande', AT:'Österreich', US:'Vereinigte Staaten'};
    return m[code] || code || '';
  }
  function fmtAmount(n) {
    var v = Number(n);
    if (!isFinite(v)) return '';
    return v.toLocaleString('fr-FR') + ' €';
  }
  function priceLabel(p) {
    if (p.price_display && String(p.price_display).trim()) return String(p.price_display).trim();
    if (p.price_indicative) return fmtAmount(p.price_indicative);
    if (p.price_min && p.price_max) return fmtAmount(p.price_min) + ' – ' + fmtAmount(p.price_max);
    if (p.price_min) return 'À partir de ' + fmtAmount(p.price_min);
    return 'Prix sur demande';
  }
  function categoryLabel(t) {
    var s = (t || '').toLowerCase();
    var m = {maison:'Maison', appartement:'Appartement', immeuble:'Immeuble', penthouse:'Penthouse', duplex:'Duplex', terrain:'Terrain', commerce:'Commerce', bureau:'Bureau', autre:'Bien d\'exception'};
    return m[s] || (t ? (t.charAt(0).toUpperCase() + t.slice(1)) : 'Bien d\'exception');
  }
  function categoryLabelEN(t) {
    var s = (t || '').toLowerCase();
    var m = {maison:'House', appartement:'Apartment', immeuble:'Building', penthouse:'Penthouse', duplex:'Duplex', terrain:'Land', commerce:'Commercial', bureau:'Office', autre:'Exceptional property'};
    return m[s] || categoryLabel(t);
  }
  function categoryLabelDE(t) {
    var s = (t || '').toLowerCase();
    var m = {maison:'Haus', appartement:'Wohnung', immeuble:'Immobilie', penthouse:'Penthouse', duplex:'Maisonette', terrain:'Grundstück', commerce:'Geschäft', bureau:'Büro', autre:'Außergewöhnliche Liegenschaft'};
    return m[s] || categoryLabel(t);
  }

  function buildEditorialDescription(p) {
    var lines = [];
    var pitch = (p.short_pitch && String(p.short_pitch).trim()) || '';
    if (pitch) lines.push(pitch);
    else lines.push('Bien d\'exception présenté en off-market strict, dont l\'identité reste protégée jusqu\'à qualification de l\'acquéreur.');
    lines.push('');
    var caracs = [];
    if (p.surface_hab)     caracs.push('Surface habitable : ±' + Number(p.surface_hab).toLocaleString('fr-FR') + ' m²');
    if (p.surface_terrain) caracs.push('Terrain : ±' + Number(p.surface_terrain).toLocaleString('fr-FR') + ' m²');
    if (p.bedrooms != null     && p.bedrooms !== '')  caracs.push('Chambres : ' + p.bedrooms);
    if (p.bathrooms != null    && p.bathrooms !== '') caracs.push('Salles de bain : ' + p.bathrooms);
    if (p.energy_class)        caracs.push('Classe énergétique : ' + p.energy_class);
    if (p.type)                caracs.push('Type : ' + categoryLabel(p.type));
    if (caracs.length) {
      lines.push('Caractéristiques :');
      caracs.forEach(function (c) { lines.push('- ' + c); });
      lines.push('');
    }
    if (Array.isArray(p.highlights) && p.highlights.length) {
      var hl = p.highlights.filter(function (x) { return x && String(x).trim(); });
      if (hl.length) {
        lines.push('Prestations :');
        hl.forEach(function (h) { lines.push('- ' + String(h).trim()); });
        lines.push('');
      }
    }
    if (p.description && String(p.description).trim()) {
      lines.push('Description :');
      lines.push(String(p.description).trim());
      lines.push('');
    }
    if (p.country_code) {
      lines.push('Emplacement :');
      lines.push('Bien situé en ' + countryLabel(p.country_code) + '. Localisation précise communiquée après NDA.');
    }
    return lines.join('\n');
  }

  function mapBien(p) {
    var editorial = buildEditorialDescription(p);
    var titleFR = (p.title && String(p.title).trim()) || ('Bien off-market #' + p.id);
    var ref = p.reference || ('OM-' + (p.id || '').toString().substring(0, 8));
    var img = p.image_url || '';
    var gallery = Array.isArray(p.gallery) ? p.gallery : [];
    /* Important : si pas d'image, ne pas en mettre (la carte off-market est floutée par défaut) */
    return {
      id: 'om-' + p.id,
      apimo_id: ref,
      slug: ref.toLowerCase(),
      type: 'offmarket',
      property_type: categoryLabel(p.type),
      category: categoryLabel(p.type),
      category_fr: categoryLabel(p.type),
      category_en: categoryLabelEN(p.type),
      category_de: categoryLabelDE(p.type),
      title: titleFR,
      title_fr: titleFR,
      title_en: titleFR,
      title_de: titleFR,
      surface: p.surface_hab,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      energy: p.energy_class,
      country_code: p.country_code || 'LU',
      country: countryLabel(p.country_code || 'LU'),
      city: 'Confidentiel',
      location: 'Confidentiel · ' + countryLabel(p.country_code || 'LU'),
      city_fr: 'Confidentiel',
      city_en: 'Confidential',
      city_de: 'Vertraulich',
      price: priceLabel(p),
      price_label: priceLabel(p),
      images: img ? [img].concat(gallery) : [],
      first_image: img || '',
      teaser: editorial,
      teaser_fr: editorial,
      teaser_en: editorial,
      teaser_de: editorial,
      description: editorial,
      description_fr: editorial,
      description_en: editorial,
      description_de: editorial,
      _editorialDescription: editorial,
      badge: 'Off-Market',
      _supabaseId: p.id,
      _strictOffmarket: !!p.is_strict_offmarket
    };
  }

  /* ═══ HOOK renderOffMarketDetail : description éditoriale ═══ */
  function patchRenderOffMarketDetail() {
    if (typeof window.renderOffMarketDetail !== 'function') return false;
    if (window.renderOffMarketDetail.__omEditorialPatched) return true;

    var orig = window.renderOffMarketDetail;
    window.renderOffMarketDetail = function (b) {
      orig.apply(this, arguments);
      if (!b || !b._editorialDescription) return;
      if (typeof window.smartParseDescription !== 'function') return;

      setTimeout(function () {
        var c = document.getElementById('bien-content');
        if (!c) return;
        var sects = c.querySelectorAll('.bd-sect');
        if (!sects.length) return;
        var presSect = sects[0];
        var bdDesc = presSect.querySelector('.bd-desc');
        if (!bdDesc) return;

        var ps = bdDesc.querySelectorAll(':scope > p');
        var introHtml = (ps[0] && ps[0].outerHTML) || '';
        var outroHtml = '';
        if (ps.length >= 2 && ps[ps.length - 1] !== ps[0]) {
          outroHtml = ps[ps.length - 1].outerHTML;
        }

        var parsed = window.smartParseDescription(b._editorialDescription);
        bdDesc.innerHTML = introHtml + parsed + outroHtml;

        var simCta = c.querySelector('.bd-similar-cta');
        if (simCta) simCta.style.display = 'none';
      }, 30);
    };
    window.renderOffMarketDetail.__omEditorialPatched = true;
    return true;
  }

  /* ═══ FETCH ═══ */
  var _LOADING = false;
  var _LAST_FETCH = 0;
  var _LAST_ITEMS = null;

  function fetchAndInject(force) {
    var now = Date.now();
    if (!force && (_LOADING || (now - _LAST_FETCH) < 2500)) {
      log('skip fetch (cooldown)');
      return Promise.resolve();
    }
    _LOADING = true;
    _LAST_FETCH = now;

    var url = SUPA_URL + '/rest/v1/properties_offmarket' +
              '?select=*' +
              '&is_published=eq.true' +
              '&order=display_order.asc,updated_at.desc';

    log('fetch →', url);

    return fetch(url, {
      headers: {
        apikey: SUPA_ANON,
        Authorization: 'Bearer ' + SUPA_ANON,
        Accept: 'application/json'
      }
    })
    .then(function (r) {
      log('réponse HTTP', r.status, r.statusText);
      if (!r.ok) {
        return r.text().then(function (t) {
          warn('erreur HTTP', r.status, t.substring(0, 200));
          return [];
        });
      }
      return r.json();
    })
    .then(function (items) {
      _LOADING = false;
      if (!Array.isArray(items)) {
        warn('réponse non-array, items =', items);
        items = [];
      }
      log('biens reçus de Supabase :', items.length, items);

      _LAST_ITEMS = items;
      var mapped = items.map(mapBien);
      log('biens mappés au format DEMO :', mapped);

      window.DEMO_OFFMARKET = mapped;

      /* IMPORTANT : on doit aussi injecter les biens dans PROPS pour que
       * (a) renderBiensInto les voie via PROPS.filter(bIsOff)
       * (b) la recherche, les coups de cœur et openBien fonctionnent */
      injectIntoProps(mapped);

      if (typeof window.renderBiensInto === 'function') {
        try {
          log('appel renderBiensInto offmarket');
          window.renderBiensInto('biens-grid-offmarket', 'biens-empty-offmarket', 'offmarket');
        } catch (e) {
          warn('renderBiensInto error:', e);
        }
      } else {
        warn('window.renderBiensInto introuvable !');
      }

      /* Vérif post-rendu : la grille a-t-elle effectivement des cartes ? */
      setTimeout(function () {
        var grid = document.getElementById('biens-grid-offmarket');
        if (grid) {
          var cardsCount = grid.querySelectorAll('.bcard').length;
          log('grille off-market après render : ' + cardsCount + ' carte(s)');
        } else {
          warn('élément #biens-grid-offmarket introuvable dans le DOM !');
        }
      }, 200);
    })
    .catch(function (err) {
      _LOADING = false;
      warn('fetch error:', err);
      window.DEMO_OFFMARKET = [];
      if (typeof window.renderBiensInto === 'function') {
        try { window.renderBiensInto('biens-grid-offmarket', 'biens-empty-offmarket', 'offmarket'); } catch (e) {}
      }
    });
  }

  /* ═══ INJECTION DANS PROPS
     ──────────────────────
     Les biens off-market Supabase doivent vivre dans window.PROPS pour
     que toutes les fonctions du site les trouvent (recherche, openBien,
     renderBiensInto avec filter bIsOff). On les ajoute en évitant les
     doublons (sur l'id préfixé "om-"). ═══════════════════════════════ */
  function injectIntoProps(mapped) {
    if (!Array.isArray(window.PROPS)) window.PROPS = [];
    /* Retire les anciens "om-*" pour éviter doublons et reprendre les
     * dernières modifications de l'admin (description, prix, etc.) */
    window.PROPS = window.PROPS.filter(function (p) {
      return !(p && p.id && String(p.id).indexOf('om-') === 0);
    });
    /* Ajoute les nouveaux */
    for (var i = 0; i < mapped.length; i++) {
      window.PROPS.push(mapped[i]);
    }
    log('PROPS mis à jour : total =', window.PROPS.length, '(off-market =', mapped.length + ')');
  }

  /* ═══ HOOK openSvc : rafraîchir quand m-offmarket s'ouvre ═══ */
  function hookOpenSvc() {
    if (typeof window.openSvc !== 'function') return false;
    if (window.openSvc.__omPatched) return true;
    var orig = window.openSvc;
    window.openSvc = function (id) {
      orig.apply(this, arguments);
      if (id === 'm-offmarket') {
        log('m-offmarket ouvert → re-fetch');
        setTimeout(function () { fetchAndInject(true); }, 80);
      }
    };
    window.openSvc.__omPatched = true;
    return true;
  }

  /* ═══ INIT ═══ */
  function init() {
    log('init v5 — début');
    /* Premier fetch immédiat (au chargement de la page, avant même que
     * l'utilisateur clique sur "Off-Market") pour que les biens soient
     * dans PROPS dès le départ. */
    setTimeout(function () {
      hookOpenSvc()              || setTimeout(hookOpenSvc, 600);
      patchRenderOffMarketDetail() || setTimeout(patchRenderOffMarketDetail, 600);
      fetchAndInject(true);
    }, 350);

    /* Re-fetch après 1.5s au cas où app.js charge tardivement */
    setTimeout(function () {
      log('re-fetch sécurité (1500ms)');
      fetchAndInject(true);
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c[MAPA] off-market public v5 (diagnostics + fix injection) chargé', 'color:#B8865A;font-weight:bold;font-size:11px');
})();

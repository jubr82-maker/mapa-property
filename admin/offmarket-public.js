/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — js/offmarket-public.js (v2 — avec fiche détaillée)
   ─────────────────────────────────────────────────────────────────
   Charge les biens off-market depuis Supabase et les injecte dans
   #biens-grid-offmarket. « Voir détail » ouvre une modale dédiée
   avec toutes les infos. L'image reste bleue confidentielle partout.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══ CONFIG ═══ */
  var SUPA_URL  = 'https://dutfkblygfvhhwpzxmfz.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGZrYmx5Z2Z2aGh3cHp4bWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTcxMTMsImV4cCI6MjA5MTA5MzExM30.iauOM8aJhvdMCD1Cz4TzFLBTDKLO5tUc_fb1rTuUxrQ';

  var GRID_ID  = 'biens-grid-offmarket';
  var EMPTY_ID = 'biens-empty-offmarket';
  var DETAIL_ID = 'om-detail-modal';

  var CACHE = [];

  /* ═══ HELPERS ═══ */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
    });
  }
  function fmtPrice(n) {
    if (n == null || n === '') return '';
    var v = Number(n);
    if (!isFinite(v)) return '';
    return v.toLocaleString('fr-FR') + ' €';
  }
  function fmtNum(n) {
    if (n == null || n === '') return '';
    var v = Number(n);
    if (!isFinite(v)) return '';
    return v.toLocaleString('fr-FR');
  }
  function nl2br(s) {
    return esc(s || '').replace(/\n/g, '<br>');
  }
  function priceLabel(p) {
    if (p.price_display && String(p.price_display).trim()) return p.price_display;
    if (p.price_indicative) return fmtPrice(p.price_indicative);
    if (p.price_min && p.price_max) return fmtPrice(p.price_min) + ' – ' + fmtPrice(p.price_max);
    if (p.price_min) return 'À partir de ' + fmtPrice(p.price_min);
    return 'Prix sur demande';
  }
  function countryLabel(code) {
    var m = {LU:'Luxembourg', FR:'France', BE:'Belgique', MC:'Monaco', CH:'Suisse', ES:'Espagne', IT:'Italie', AE:'Émirats arabes unis', UK:'Royaume-Uni', PT:'Portugal', DE:'Allemagne', NL:'Pays-Bas', AT:'Autriche', US:'États-Unis'};
    return m[code] || code || '';
  }
  function typeLabel(t) {
    if (!t) return '';
    var s = String(t).toLowerCase();
    var m = {maison:'Maison', appartement:'Appartement', immeuble:'Immeuble', penthouse:'Penthouse', duplex:'Duplex', terrain:'Terrain', commerce:'Commerce', bureau:'Bureau', autre:'Autre'};
    return m[s] || (s.charAt(0).toUpperCase() + s.slice(1));
  }

  /* ═══ IMAGE CONFIDENTIELLE NAVY ═══ */
  function confidentialImage(big) {
    var h = big ? 480 : 380;
    var sId = big ? 'omgrad2' : 'omgrad1';
    return (
      '<svg viewBox="0 0 600 ' + h + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">' +
        '<defs>' +
          '<linearGradient id="' + sId + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0" stop-color="#3D4F63"/>' +
            '<stop offset="1" stop-color="#2C3A4A"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<rect width="600" height="' + h + '" fill="url(#' + sId + ')"/>' +
        '<text x="40" y="48" font-family="Cinzel, serif" font-size="13" letter-spacing="3" fill="#B8865A">OFF-MARKET</text>' +
        '<g transform="translate(300 ' + (big ? 215 : 175) + ')" stroke="#B8865A" stroke-width="2.5" fill="none">' +
          '<rect x="-26" y="-6" width="52" height="42" rx="5"/>' +
          '<path d="M-16 -6 v-13 a16 16 0 0 1 32 0 v13"/>' +
          '<circle cx="0" cy="14" r="4" fill="#B8865A"/>' +
        '</g>' +
        '<text x="300" y="' + (big ? 320 : 270) + '" text-anchor="middle" font-family="Cormorant Garamond, serif" font-style="italic" font-size="' + (big ? 26 : 20) + '" letter-spacing="2" fill="#fff">BIEN CONFIDENTIEL</text>' +
        '<text x="300" y="' + (big ? 354 : 298) + '" text-anchor="middle" font-family="Cinzel, serif" font-size="' + (big ? 13 : 11) + '" letter-spacing="3" fill="#B8865A">ACCÈS SUR DEMANDE</text>' +
      '</svg>'
    );
  }

  /* ═══ RENDER CARD (grille) ═══ */
  function renderCard(p) {
    var ref = (p.internal_ref || '').toString().toUpperCase();
    var typ = typeLabel(p.type).toUpperCase();
    var tagText = ref ? ('RÉF. ' + esc(ref) + (typ ? ' · ' + esc(typ) : '')) : (typ ? esc(typ) : '');
    var loc = '🔒 Confidentiel · ' + esc(countryLabel(p.country) || '—');
    var meta = [];
    if (p.surface_hab) meta.push('±' + fmtNum(p.surface_hab) + ' m²');
    if (p.bedrooms)    meta.push(p.bedrooms + ' ch.');
    if (p.bathrooms)   meta.push(p.bathrooms);

    return (
      '<article class="bcard om-card" data-omid="' + esc(p.id) + '" onclick="window.openOmDetail(\'' + esc(p.id) + '\')" style="position:relative;background:#fff;border:1px solid #ECE6DC;border-radius:4px;overflow:hidden;display:flex;flex-direction:column;cursor:pointer;transition:transform .25s ease, box-shadow .25s ease" onmouseenter="this.style.boxShadow=\'0 8px 24px rgba(0,0,0,.08)\';this.style.transform=\'translateY(-2px)\'" onmouseleave="this.style.boxShadow=\'\';this.style.transform=\'\'">' +
        '<div style="position:absolute;top:14px;left:14px;z-index:2;background:#3D4F63;color:#fff;font-family:Cinzel,serif;font-size:10px;letter-spacing:2.5px;padding:5px 11px">OFF-MARKET</div>' +
        '<div class="om-img" style="aspect-ratio:600/380;width:100%;background:#3D4F63">' + confidentialImage(false) + '</div>' +
        '<div class="om-body" style="padding:16px 18px 20px">' +
          (tagText ? '<div style="font-family:Cinzel,serif;font-size:10.5px;letter-spacing:2px;color:#B8865A;margin-bottom:6px">' + tagText + '</div>' : '') +
          '<h3 style="font-family:\'Cormorant Garamond\',serif;font-size:19px;font-weight:500;color:#2C3A4A;margin:0 0 6px;line-height:1.3">' + esc(p.title || '—') + '</h3>' +
          '<div style="font-size:13px;color:#7A8694;margin-bottom:10px">' + loc + '</div>' +
          (meta.length ? '<div style="font-size:13px;color:#5C6877;margin-bottom:10px">' + meta.join(' &nbsp;|&nbsp; ') + '</div>' : '') +
          '<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:18px;color:#B8865A">' + esc(priceLabel(p)) + '</div>' +
          '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #ECE6DC">' +
            '<span style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2px;color:#B8865A">VOIR DÉTAIL →</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* ═══ MODALE FICHE DÉTAIL ═══ */
  function ensureDetailModal() {
    if (document.getElementById(DETAIL_ID)) return;
    var d = document.createElement('div');
    d.id = DETAIL_ID;
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(20,28,40,.78);overflow-y:auto;padding:40px 16px';
    d.innerHTML = '<div id="' + DETAIL_ID + '-inner" style="max-width:920px;margin:0 auto;background:#FCFAF6;border-radius:6px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5);position:relative"></div>';
    d.addEventListener('click', function (e) {
      if (e.target === d) closeOmDetail();
    });
    document.body.appendChild(d);

    /* Esc pour fermer */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var m = document.getElementById(DETAIL_ID);
        if (m && m.style.display !== 'none') closeOmDetail();
      }
    });
  }

  function renderDetail(p) {
    var ref = (p.internal_ref || '').toString().toUpperCase();
    var typ = typeLabel(p.type);
    var loc = '🔒 Confidentiel · ' + esc(countryLabel(p.country) || '—');

    var meta = [];
    if (p.surface_hab)     meta.push({label:'Surface habitable',  value:'± ' + fmtNum(p.surface_hab) + ' m²'});
    if (p.surface_terrain) meta.push({label:'Terrain',            value:'± ' + fmtNum(p.surface_terrain) + ' m²'});
    if (p.bedrooms)        meta.push({label:'Chambres',           value:p.bedrooms});
    if (p.bathrooms)       meta.push({label:'Salles de bain',     value:p.bathrooms});
    if (p.energy_class)    meta.push({label:'Classe énergétique', value:p.energy_class});
    if (typ)               meta.push({label:'Type',               value:typ});

    var metaHtml = meta.length ? (
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px 22px;padding:22px 0;border-top:1px solid #ECE6DC;border-bottom:1px solid #ECE6DC;margin:24px 0">' +
        meta.map(function (m) {
          return (
            '<div>' +
              '<div style="font-family:Cinzel,serif;font-size:9.5px;letter-spacing:2px;color:#B8865A;margin-bottom:4px">' + esc(m.label.toUpperCase()) + '</div>' +
              '<div style="font-family:\'Cormorant Garamond\',serif;font-size:18px;color:#2C3A4A">' + esc(m.value) + '</div>' +
            '</div>'
          );
        }).join('') +
      '</div>'
    ) : '';

    var highlights = Array.isArray(p.highlights) ? p.highlights : [];
    var highlightsHtml = highlights.length ? (
      '<div style="margin-top:24px">' +
        '<div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2.5px;color:#B8865A;margin-bottom:14px">POINTS FORTS</div>' +
        '<ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px">' +
          highlights.map(function (h) {
            return '<li style="position:relative;padding-left:22px;font-family:\'Cormorant Garamond\',serif;font-size:17px;color:#2C3A4A;line-height:1.5">' +
              '<span style="position:absolute;left:0;top:5px;width:8px;height:8px;background:#B8865A;border-radius:50%"></span>' +
              esc(h) +
            '</li>';
          }).join('') +
        '</ul>' +
      '</div>'
    ) : '';

    var pitchHtml = p.short_pitch ? (
      '<p style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:21px;color:#3D4F63;margin:18px 0 0;line-height:1.5">« ' + esc(p.short_pitch) + ' »</p>'
    ) : '';

    var descHtml = p.description ? (
      '<div style="margin-top:24px">' +
        '<div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2.5px;color:#B8865A;margin-bottom:12px">DESCRIPTION</div>' +
        '<div style="font-family:Raleway,sans-serif;font-size:15px;color:#3D4F63;line-height:1.7">' + nl2br(p.description) + '</div>' +
      '</div>'
    ) : '';

    return (
      /* Header avec image confidentielle */
      '<div style="position:relative;aspect-ratio:600/360;background:#3D4F63">' +
        confidentialImage(true) +
        '<button onclick="window.closeOmDetail()" aria-label="Fermer" style="position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:Raleway,sans-serif;z-index:3">✕</button>' +
        '<div style="position:absolute;top:18px;left:18px;background:#3D4F63;color:#fff;font-family:Cinzel,serif;font-size:11px;letter-spacing:3px;padding:7px 14px">OFF-MARKET</div>' +
      '</div>' +

      /* Corps */
      '<div style="padding:32px 40px 36px">' +
        (ref ? '<div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2.5px;color:#B8865A;margin-bottom:8px">RÉF. ' + esc(ref) + (typ ? ' · ' + esc(typ.toUpperCase()) : '') + '</div>' : '') +
        '<h2 style="font-family:\'Cormorant Garamond\',serif;font-size:32px;font-weight:500;color:#2C3A4A;margin:0 0 6px;line-height:1.2">' + esc(p.title || '—') + '</h2>' +
        '<div style="font-size:14px;color:#7A8694">' + loc + '</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:24px;color:#B8865A;margin-top:14px">' + esc(priceLabel(p)) + '</div>' +
        pitchHtml +
        metaHtml +
        descHtml +
        highlightsHtml +

        /* Disclaimer + CTA */
        '<div style="margin-top:32px;padding:22px;background:#3D4F63;color:#fff;border-radius:4px">' +
          '<div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:2.5px;color:#B8865A;margin-bottom:10px">CONFIDENTIALITÉ STRICTE</div>' +
          '<p style="font-family:\'Cormorant Garamond\',serif;font-size:17px;font-style:italic;line-height:1.5;margin:0 0 18px;color:#fff">Aucune photo, adresse ou détail identifiable n\'est publié. Pour recevoir le dossier complet, déposez votre demande sous accord de confidentialité.</p>' +
          '<button type="button" onclick="window.closeOmDetail();setTimeout(function(){var t=document.getElementById(\'om-em\');if(t){t.scrollIntoView({behavior:\'smooth\',block:\'center\'});setTimeout(function(){t.focus()},400)}},120)" ' +
            'style="background:#B8865A;color:#fff;border:none;padding:13px 26px;font-family:Cinzel,serif;font-size:11.5px;letter-spacing:2.5px;cursor:pointer;border-radius:2px">' +
            'DEMANDER LE DOSSIER COMPLET →' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  window.openOmDetail = function (id) {
    var p = CACHE.find(function (x) { return String(x.id) === String(id); });
    if (!p) return;
    ensureDetailModal();
    var modal = document.getElementById(DETAIL_ID);
    var inner = document.getElementById(DETAIL_ID + '-inner');
    if (!modal || !inner) return;
    inner.innerHTML = renderDetail(p);
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.scrollTop = 0;
  };

  window.closeOmDetail = function () {
    var modal = document.getElementById(DETAIL_ID);
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  /* ═══ EMPTY / RENDER LISTE ═══ */
  function renderEmpty() {
    var grid  = document.getElementById(GRID_ID);
    var empty = document.getElementById(EMPTY_ID);
    if (grid)  grid.innerHTML = '';
    if (empty) empty.style.display = '';
  }
  function renderItems(items) {
    CACHE = Array.isArray(items) ? items : [];
    var grid  = document.getElementById(GRID_ID);
    var empty = document.getElementById(EMPTY_ID);
    if (!grid) return;
    if (!CACHE.length) { renderEmpty(); return; }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = CACHE.map(renderCard).join('');
  }

  /* ═══ FETCH ═══ */
  var _LOADING = false;
  var _LAST_FETCH = 0;
  function fetchAndRender(force) {
    var now = Date.now();
    if (!force && (_LOADING || (now - _LAST_FETCH) < 3000)) return;
    _LOADING = true;
    _LAST_FETCH = now;

    var url = SUPA_URL + '/rest/v1/properties_offmarket' +
              '?select=id,internal_ref,title,type,country,city_label,district_label,surface_hab,surface_terrain,bedrooms,bathrooms,energy_class,price_display,price_indicative,price_min,price_max,short_pitch,description,highlights,is_strict_offmarket,display_order' +
              '&is_published=eq.true' +
              '&order=display_order.asc,updated_at.desc';

    fetch(url, {
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + SUPA_ANON,
        'Accept': 'application/json'
      }
    })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (items) {
      _LOADING = false;
      renderItems(Array.isArray(items) ? items : []);
    })
    .catch(function (err) {
      _LOADING = false;
      console.warn('[offmarket-public] fetch error:', err);
      renderEmpty();
    });
  }

  /* ═══ HOOK openSvc ═══ */
  function hookOpenSvc() {
    if (typeof window.openSvc !== 'function') return false;
    var orig = window.openSvc;
    window.openSvc = function (id) {
      orig.apply(this, arguments);
      if (id === 'm-offmarket') {
        setTimeout(function () { fetchAndRender(true); }, 80);
      }
    };
    return true;
  }

  function init() {
    setTimeout(function () {
      if (!hookOpenSvc()) setTimeout(hookOpenSvc, 500);
      fetchAndRender(true);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('%c[MAPA] off-market public v2 (avec fiche détail) chargé', 'color:#B8865A;font-weight:bold');
})();

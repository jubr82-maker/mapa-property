/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — admin/offmarket.js (Module Off-Market)
   ─────────────────────────────────────────────────────────────────
   Module ISOLÉ : ne modifie pas admin.js.
   Réutilise les helpers globaux (esc, fmtNum, fmtPrice, toast, openModal,
   closeModal, api, $, $$, CACHE) déjà définis par admin.js.
   Wrappe window.showTab pour intercepter le tab 'offmarket'.
   ─────────────────────────────────────────────────────────────────
   Table : public.properties_offmarket
   Sécurité : RLS strictes — seul agency_admins.is_active = true peut écrire.
              Toutes les modifs sont tracées dans offmarket_audit_log.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* État local au module (évite collision avec admin.js) */
  const OM_FILTERS = { search: '', status: 'all' };
  let _OM_DRAFT = null;

  /* Hook dans showTab existant : ajoute la prise en charge de 'offmarket'
     sans modifier la fonction d'origine. */
  const _origShowTab = window.showTab;
  window.showTab = function (tabId) {
    if (typeof _origShowTab === 'function') _origShowTab(tabId);
    if (tabId === 'offmarket') loadOffmarket();
  };

  /* ═══ LOAD ═══ */
  async function loadOffmarket() {
    const list = document.getElementById('offmarket-list');
    if (!list) return;
    list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement des biens off-market…</div>';

    try {
      const props = await api('/rest/v1/properties_offmarket?select=*&order=display_order.asc,updated_at.desc');
      if (!window.CACHE) window.CACHE = {};
      window.CACHE.offmarket = Array.isArray(props) ? props : [];
      renderOffmarketList();
    } catch (err) {
      console.error('[off-market] loadOffmarket:', err);
      list.innerHTML = '<div class="empty">Erreur chargement : ' + esc(err.message) + '</div>';
    }
  }

  /* ═══ RENDER LISTE ═══ */
  function renderOffmarketList() {
    const list = document.getElementById('offmarket-list');
    if (!list) return;
    list.className = '';

    const items = (window.CACHE && window.CACHE.offmarket) || [];
    const filtered = applyOffmarketFilters(items);

    const banner =
      '<div class="apimo-banner" style="border-left-color:#b89448">' +
        '<strong>💎 Biens off-market</strong> — Gestion <em>manuelle</em>, indépendante d\'Apimo. ' +
        'Saisis ici les biens confidentiels (vendeurs qui ne veulent pas être exposés sur les portails). ' +
        'Ils ne sont visibles que sur le site MAPA Property si tu coches « Publier ».' +
      '</div>';

    const counters =
      '<div class="props-counters">' +
        '<span class="pill pill-info">' + filtered.length + ' / ' + items.length + ' affichés</span>' +
        '<span class="pill pill-ok">' + items.filter(p => p.is_published).length + ' publiés</span>' +
      '</div>';

    if (filtered.length === 0) {
      list.innerHTML = banner + counters +
        '<div class="empty" style="margin-top:24px">' +
          (items.length === 0
            ? 'Aucun bien off-market pour l\'instant. Clique sur « + Nouveau bien off-market » pour commencer.'
            : 'Aucun bien ne correspond à ta recherche.') +
        '</div>';
      return;
    }

    const grid = '<div class="props-grid">' + filtered.map(renderOffmarketCard).join('') + '</div>';
    list.innerHTML = banner + counters + grid;
  }

  function applyOffmarketFilters(arr) {
    const q = (OM_FILTERS.search || '').toLowerCase().trim();
    return arr.filter(p => {
      if (OM_FILTERS.status === 'published'   && !p.is_published) return false;
      if (OM_FILTERS.status === 'unpublished' &&  p.is_published) return false;
      if (q) {
        const blob = [
          p.internal_ref, p.title, p.city_label, p.district_label, p.country, p.type
        ].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  function renderOffmarketCard(p) {
    const cover = p.cover_image_url || '';
    const title = p.title || '—';
    const ref = p.internal_ref || '—';
    const loc = [p.district_label, p.city_label, p.country].filter(Boolean).join(', ') || '—';

    const priceDisplay = p.price_display ||
      (p.price_indicative ? fmtPrice(p.price_indicative) :
       (p.price_min && p.price_max ? fmtPrice(p.price_min) + ' – ' + fmtPrice(p.price_max) :
       (p.price_min ? 'À partir de ' + fmtPrice(p.price_min) : 'Sur demande')));

    const tags = [];
    if (!p.is_published) tags.push('<span class="prop-tag unpub">Non publié</span>');
    if (p.is_strict_offmarket) tags.push('<span class="prop-tag" style="background:#3D4F63;color:#fff">Off-market strict</span>');

    return (
      '<article class="prop-card' + (p.is_published ? '' : ' unpublished') + '">' +
        '<div class="prop-card-img"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '>' +
          (tags.length ? '<div class="prop-card-tags">' + tags.join('') + '</div>' : '') +
        '</div>' +
        '<div class="prop-card-body">' +
          '<div class="prop-card-ref">Réf. ' + esc(ref) + (p.type ? ' · ' + esc(p.type) : '') + '</div>' +
          '<h3 class="prop-card-title">' + esc(title) + '</h3>' +
          '<div class="prop-card-loc">📍 ' + esc(loc) + '</div>' +
          '<div class="prop-card-price">' + esc(priceDisplay) + '</div>' +
          '<div class="prop-card-meta">' +
            (p.surface_hab  ? '<span>📐 ' + fmtNum(p.surface_hab) + ' m²</span>' : '') +
            (p.bedrooms     ? '<span>🛏 ' + p.bedrooms + ' ch.</span>'             : '') +
            (p.bathrooms    ? '<span>🛁 ' + p.bathrooms + '</span>'                : '') +
            (p.energy_class ? '<span>⚡ ' + esc(p.energy_class) + '</span>'        : '') +
          '</div>' +
        '</div>' +
        '<div class="prop-card-actions">' +
          '<label class="toggle btn-toggle" title="Afficher sur le site public">' +
            '<input type="checkbox"' + (p.is_published ? ' checked' : '') +
              ' onchange="toggleOffmarketPublished(\'' + p.id + '\', this.checked)">' +
            '<span class="toggle-track"></span>' +
            '<span>Visible</span>' +
          '</label>' +
          '<button class="btn btn-ghost btn-sm" onclick="editOffmarket(\'' + p.id + '\')" title="Éditer">✏️</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="deleteOffmarket(\'' + p.id + '\')" title="Supprimer" style="color:#c0392b">🗑</button>' +
        '</div>' +
      '</article>'
    );
  }

  /* ═══ FILTRES ═══ */
  window.filterOffmarket = function () {
    const s = document.getElementById('om-search');
    const f = document.getElementById('om-filter-status');
    OM_FILTERS.search = s ? (s.value || '').trim() : '';
    OM_FILTERS.status = f ? f.value : 'all';
    renderOffmarketList();
  };

  /* ═══ EDITOR ═══ */
  window.newOffmarket = function () {
    openOffmarketEditor(null);
  };

  window.editOffmarket = function (id) {
    const items = (window.CACHE && window.CACHE.offmarket) || [];
    const p = items.find(x => String(x.id) === String(id));
    if (p) openOffmarketEditor(p);
  };

  function openOffmarketEditor(p) {
    _OM_DRAFT = p ? Object.assign({}, p) : {
      internal_ref: '',
      internal_notes: '',
      is_published: false,
      is_strict_offmarket: true,
      show_to_qualified_only: true,
      display_order: 100,
      title: '',
      type: '',
      country: 'LU',
      city_label: '',
      district_label: '',
      surface_hab: null,
      surface_terrain: null,
      bedrooms: null,
      bathrooms: null,
      energy_class: '',
      price_indicative: null,
      price_min: null,
      price_max: null,
      price_display: '',
      short_pitch: '',
      description: '',
      highlights: [],
      cover_image_url: '',
      gallery_urls: []
    };

    const d = _OM_DRAFT;
    const html =
      '<div class="form">' +

        '<div class="form-row cols-2">' +
          '<div class="field">' +
            '<label class="field-label">Référence interne</label>' +
            '<input type="text" id="om-ref" value="' + esc(d.internal_ref || '') + '" placeholder="OFF-2026-014">' +
            '<span class="field-hint">Pour ton suivi privé. N\'apparaît pas publiquement.</span>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Ordre d\'affichage</label>' +
            '<input type="number" id="om-order" value="' + (d.display_order != null ? d.display_order : 100) + '">' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label field-required">Titre public</label>' +
          '<input type="text" id="om-title" value="' + esc(d.title || '') + '" placeholder="Maison de maître à Belair">' +
        '</div>' +

        '<div class="form-row cols-3">' +
          '<div class="field">' +
            '<label class="field-label">Type</label>' +
            '<select id="om-type" onchange="window._omToggleImm && window._omToggleImm()">' +
              ['', 'maison', 'appartement', 'immeuble', 'penthouse', 'duplex', 'terrain', 'commerce', 'bureau', 'autre']
                .map(t => '<option value="' + t + '"' + (d.type === t ? ' selected' : '') + '>' + (t || '—') + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Pays</label>' +
            '<select id="om-country">' +
              [['LU','Luxembourg'],['FR','France'],['BE','Belgique'],['MC','Monaco'],['CH','Suisse'],['ES','Espagne'],['IT','Italie'],['AE','Émirats arabes unis'],['OTHER','Autre']]
                .map(c => '<option value="' + c[0] + '"' + (d.country === c[0] ? ' selected' : '') + '>' + c[1] + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Classe énergétique</label>' +
            '<select id="om-energy">' +
              ['','A++','A+','A','B','C','D','E','F','G','H','I']
                .map(e => '<option value="' + e + '"' + (d.energy_class === e ? ' selected' : '') + '>' + (e || '—') + '</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="form-row cols-2">' +
          '<div class="field">' +
            '<label class="field-label">Ville</label>' +
            '<input type="text" id="om-city" value="' + esc(d.city_label || '') + '" placeholder="Luxembourg">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Quartier / secteur</label>' +
            '<input type="text" id="om-district" value="' + esc(d.district_label || '') + '" placeholder="Belair">' +
          '</div>' +
        '</div>' +

        '<div class="form-row cols-2">' +
          '<div class="field">' +
            '<label class="field-label">Surface hab. (m²)</label>' +
            '<input type="number" id="om-surface-hab" value="' + (d.surface_hab != null ? d.surface_hab : '') + '" min="0">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Surface terrain (m²)</label>' +
            '<input type="number" id="om-surface-terrain" value="' + (d.surface_terrain != null ? d.surface_terrain : '') + '" min="0">' +
          '</div>' +
        '</div>' +

        '<div class="form-row cols-2">' +
          '<div class="field">' +
            '<label class="field-label">Chambres</label>' +
            '<input type="number" id="om-bedrooms" value="' + (d.bedrooms != null ? d.bedrooms : '') + '" min="0">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Salles de bain</label>' +
            '<input type="number" id="om-bathrooms" value="' + (d.bathrooms != null ? d.bathrooms : '') + '" min="0">' +
          '</div>' +
        '</div>' +

        /* === Bloc immeuble structuré (visible uniquement si type=immeuble) === */
        '<div id="om-imm-block" style="' + (d.type === 'immeuble' ? '' : 'display:none;') + 'background:#faf6f0;border:1px solid #e8dcc0;border-left:3px solid var(--cu);padding:14px 18px;border-radius:3px;margin:14px 0">' +
          '<div style="font-family:Cinzel,serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--cu);font-weight:600;margin-bottom:12px">⌂ Détails immeuble</div>' +
          '<div class="form-row cols-2">' +
            '<div class="field">' +
              '<label class="field-label">Sous-type d\'immeuble</label>' +
              '<select id="om-building-subtype" onchange="window._omToggleSubtype && window._omToggleSubtype()">' +
                ['','habitation','bureau','mixte'].map(s => '<option value="' + s + '"' + (d.building_subtype === s ? ' selected' : '') + '>' + (s === '' ? '— Choisir —' : s === 'habitation' ? "Immeuble d'habitation" : s === 'bureau' ? 'Immeuble de bureau' : 'Immeuble mixte') + '</option>').join('') +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label class="field-label">Surface totale brute (m²)</label>' +
              '<input type="number" id="om-area-total" value="' + (d.area_total != null ? d.area_total : '') + '" min="0" placeholder="Habitable + parties communes + sous-sols">' +
            '</div>' +
          '</div>' +
          /* Sous-bloc HABITATION */
          '<div id="om-sub-habitation" style="display:none;margin-top:14px">' +
            '<div style="font-family:Raleway,sans-serif;font-size:13px;color:var(--ink2);font-weight:600;margin-bottom:8px">Détail des appartements</div>' +
            '<textarea id="om-apartments-details" rows="6" placeholder="Un appartement par ligne au format :\nÉtage | Surface m² | Chambres | Type\nExemple :\nRDC | 80 | 2 | T3\nR+1 | 90 | 3 | T4\nR+1 | 75 | 2 | T3\nR+2 | 100 | 3 | T4" style="width:100%;font-family:monospace;font-size:13px">' + esc((function(){ var arr = Array.isArray(d.apartments_details) ? d.apartments_details : []; return arr.map(function(a){ return (a.floor || '') + ' | ' + (a.surface || '') + ' | ' + (a.bedrooms || '') + ' | ' + (a.type || ''); }).join('\n'); })()) + '</textarea>' +
            '<span class="field-hint" style="display:block;margin-top:6px">Format : <strong>Étage | Surface | Chambres | Type</strong> (séparé par des barres verticales). Un appartement par ligne.</span>' +
          '</div>' +
          /* Sous-bloc BUREAU */
          '<div id="om-sub-bureau" style="display:none;margin-top:14px">' +
            '<div style="font-family:Raleway,sans-serif;font-size:13px;color:var(--ink2);font-weight:600;margin-bottom:8px">Détail des bureaux</div>' +
            '<div class="form-row cols-2">' +
              '<div class="field"><label class="field-label">Surface totale bureaux (m²)</label><input type="number" id="om-office-total" value="' + ((d.office_details && d.office_details.total_m2) != null ? d.office_details.total_m2 : '') + '" min="0"></div>' +
              '<div class="field"><label class="field-label">Surface plateau ouvert (m²)</label><input type="number" id="om-office-openplan" value="' + ((d.office_details && d.office_details.open_plan_m2) != null ? d.office_details.open_plan_m2 : '') + '" min="0" placeholder="Si plateau, sinon laisser vide"></div>' +
            '</div>' +
            '<div class="form-row cols-2">' +
              '<div class="field"><label class="field-label">Nombre de bureaux séparés</label><input type="number" id="om-office-separated-count" value="' + ((d.office_details && d.office_details.separated_count) != null ? d.office_details.separated_count : '') + '" min="0" placeholder="Si bureaux cloisonnés"></div>' +
              '<div class="field"><label class="field-label">Surface moy. par bureau séparé (m²)</label><input type="number" id="om-office-separated-avg" value="' + ((d.office_details && d.office_details.separated_avg_m2) != null ? d.office_details.separated_avg_m2 : '') + '" min="0"></div>' +
            '</div>' +
          '</div>' +
          /* Sous-bloc MIXTE */
          '<div id="om-sub-mixte" style="display:none;margin-top:14px">' +
            '<div style="font-family:Raleway,sans-serif;font-size:13px;color:var(--ink2);font-weight:600;margin-bottom:8px">Composition de l\'immeuble mixte</div>' +
            '<div class="field"><label class="field-label">Commerces (1 par ligne — Nom | Surface m² | Type)</label>' +
              '<textarea id="om-mixte-commerces" rows="3" placeholder="Café du Coin | 80 | restauration\nBoutique mode | 120 | retail" style="width:100%;font-family:monospace;font-size:13px">' + esc((function(){ var arr = (d.mixed_breakdown && Array.isArray(d.mixed_breakdown.commercial)) ? d.mixed_breakdown.commercial : []; return arr.map(function(c){ return (c.name || '') + ' | ' + (c.surface || '') + ' | ' + (c.type || ''); }).join('\n'); })()) + '</textarea>' +
            '</div>' +
            '<div class="field"><label class="field-label">Bureaux (1 par ligne — Étage | Surface m² | Type)</label>' +
              '<textarea id="om-mixte-bureaux" rows="3" placeholder="R+1 | 200 | plateau ouvert\nR+2 | 150 | bureaux séparés" style="width:100%;font-family:monospace;font-size:13px">' + esc((function(){ var arr = (d.mixed_breakdown && Array.isArray(d.mixed_breakdown.office)) ? d.mixed_breakdown.office : []; return arr.map(function(o){ return (o.floor || '') + ' | ' + (o.surface || '') + ' | ' + (o.type || ''); }).join('\n'); })()) + '</textarea>' +
            '</div>' +
            '<div class="field"><label class="field-label">Logements (1 par ligne — Étage | Surface m² | Chambres | Type)</label>' +
              '<textarea id="om-mixte-logements" rows="3" placeholder="R+3 | 90 | 3 | T4\nR+4 | 110 | 3 | T4" style="width:100%;font-family:monospace;font-size:13px">' + esc((function(){ var arr = (d.mixed_breakdown && Array.isArray(d.mixed_breakdown.residential)) ? d.mixed_breakdown.residential : []; return arr.map(function(r){ return (r.floor || '') + ' | ' + (r.surface || '') + ' | ' + (r.bedrooms || '') + ' | ' + (r.type || ''); }).join('\n'); })()) + '</textarea>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label">Affichage prix (prioritaire)</label>' +
          '<input type="text" id="om-price-display" value="' + esc(d.price_display || '') + '" placeholder="Sur demande / À partir de 4,5 M€">' +
          '<span class="field-hint">Si rempli, c\'est ce texte qui s\'affiche. Sinon le système utilise les prix ci-dessous.</span>' +
        '</div>' +

        '<div class="form-row cols-3">' +
          '<div class="field">' +
            '<label class="field-label">Prix indicatif (€)</label>' +
            '<input type="number" id="om-price-indicative" value="' + (d.price_indicative != null ? d.price_indicative : '') + '" min="0" step="1000">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Prix min (€)</label>' +
            '<input type="number" id="om-price-min" value="' + (d.price_min != null ? d.price_min : '') + '" min="0" step="1000">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Prix max (€)</label>' +
            '<input type="number" id="om-price-max" value="' + (d.price_max != null ? d.price_max : '') + '" min="0" step="1000">' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label">Pitch court</label>' +
          '<textarea id="om-pitch" rows="2" maxlength="280" placeholder="Phrase d\'accroche (280 car. max)">' + esc(d.short_pitch || '') + '</textarea>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label">Description longue</label>' +
          '<textarea id="om-description" rows="6">' + esc(d.description || '') + '</textarea>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label">Points forts (un par ligne)</label>' +
          '<textarea id="om-highlights" rows="4" placeholder="Vue dégagée\nGarage 2 voitures\nProche écoles internationales">' + esc((Array.isArray(d.highlights) ? d.highlights : []).join('\n')) + '</textarea>' +
        '</div>' +

        '<div class="form-row cols-2">' +
          '<div class="field">' +
            '<label class="field-label">URL image principale</label>' +
            '<input type="url" id="om-cover" value="' + esc(d.cover_image_url || '') + '" placeholder="https://…">' +
          '</div>' +
          '<div class="field">' +
            '<label class="field-label">Galerie (1 URL par ligne)</label>' +
            '<textarea id="om-gallery" rows="3" placeholder="https://…">' + esc((Array.isArray(d.gallery_urls) ? d.gallery_urls : []).join('\n')) + '</textarea>' +
          '</div>' +
        '</div>' +

        '<div class="field">' +
          '<label class="field-label">Notes internes (privées)</label>' +
          '<textarea id="om-notes" rows="2" placeholder="Notes privées, ne s\'affichent jamais publiquement">' + esc(d.internal_notes || '') + '</textarea>' +
        '</div>' +

        '<div class="form-row cols-3">' +
          '<div class="field"><label class="field-label" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="om-pub"' + (d.is_published ? ' checked' : '') + '> Publier sur le site</label></div>' +
          '<div class="field"><label class="field-label" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="om-strict"' + (d.is_strict_offmarket ? ' checked' : '') + '> Off-market strict</label></div>' +
          '<div class="field"><label class="field-label" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="om-qualified"' + (d.show_to_qualified_only ? ' checked' : '') + '> Qualification requise</label></div>' +
        '</div>' +

        '<div style="display:flex;gap:10px;justify-content:space-between;align-items:center;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
          '<div>' +
            (d.id ? '<button class="btn btn-ghost" style="color:#c0392b" onclick="deleteOffmarketFromEditor()">🗑 Supprimer</button>' : '') +
          '</div>' +
          '<div style="display:flex;gap:10px">' +
            '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
            '<button class="btn btn-copper" onclick="saveOffmarket()">💾 Enregistrer</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    openModal(p ? 'Éditer le bien off-market' : 'Nouveau bien off-market', html, { size: 'lg' });
  }

  /* ═══ TOGGLE BLOC IMMEUBLE STRUCTURE ═══ */
  window._omToggleImm = function(){
    var sel = document.getElementById('om-type');
    var blk = document.getElementById('om-imm-block');
    if (!sel || !blk) return;
    blk.style.display = (sel.value === 'immeuble') ? '' : 'none';
    if (sel.value === 'immeuble') window._omToggleSubtype();
  };
  window._omToggleSubtype = function(){
    var sub = document.getElementById('om-building-subtype');
    if (!sub) return;
    var v = sub.value;
    var hab = document.getElementById('om-sub-habitation');
    var bur = document.getElementById('om-sub-bureau');
    var mix = document.getElementById('om-sub-mixte');
    if (hab) hab.style.display = (v === 'habitation') ? '' : 'none';
    if (bur) bur.style.display = (v === 'bureau') ? '' : 'none';
    if (mix) mix.style.display = (v === 'mixte') ? '' : 'none';
  };
  /* Auto-trigger lors de l'ouverture du modal pour pre-afficher */
  var _origOpenOM = window.openOffmarketEditor;
  if (typeof _origOpenOM === 'function') {
    window.openOffmarketEditor = function(){
      var r = _origOpenOM.apply(this, arguments);
      setTimeout(function(){
        if (window._omToggleImm) window._omToggleImm();
      }, 100);
      return r;
    };
  }

  /* ═══ SAVE ═══ */
  window.saveOffmarket = async function () {
    const d = _OM_DRAFT;
    if (!d) return;

    const txtToArr = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
    const numOrNull = v => {
      v = (v || '').toString().trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const get = id => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };
    const checked = id => {
      const el = document.getElementById(id);
      return el ? !!el.checked : false;
    };

    /* === Parsers pour bloc immeuble === */
    var _numOrNull2 = function(v){ v=(v||'').toString().trim(); if(!v) return null; var n=Number(v); return Number.isFinite(n)?n:null; };
    var _parsePipeRows = function(text, cols){
      /* cols = ['floor','surface','bedrooms','type'] -- nombre = nb colonnes attendues */
      var lines = (text||'').split('\n').map(function(l){return l.trim();}).filter(Boolean);
      var out = [];
      for (var i=0; i<lines.length; i++){
        var parts = lines[i].split('|').map(function(p){return p.trim();});
        var obj = {};
        for (var j=0; j<cols.length; j++){
          var key = cols[j];
          var val = parts[j] || '';
          /* Convertir surface/bedrooms en number si c'est numérique */
          if (key === 'surface' || key === 'bedrooms') {
            obj[key] = _numOrNull2(val);
          } else {
            obj[key] = val || null;
          }
        }
        /* Ne garder que les lignes ayant au moins 1 valeur */
        var hasVal = false;
        for (var k in obj) if (obj[k] !== null && obj[k] !== '') { hasVal = true; break; }
        if (hasVal) out.push(obj);
      }
      return out;
    };

    /* === Lire les champs du bloc immeuble === */
    var _isImm = (get('om-type') === 'immeuble');
    if (_isImm) {
      d.building_subtype = get('om-building-subtype') || null;
      d.area_total = _numOrNull2(get('om-area-total'));

      /* Habitation */
      if (d.building_subtype === 'habitation') {
        d.apartments_details = _parsePipeRows(get('om-apartments-details'), ['floor','surface','bedrooms','type']);
        d.office_details = null;
        d.mixed_breakdown = null;
      }
      /* Bureau */
      else if (d.building_subtype === 'bureau') {
        d.office_details = {
          total_m2: _numOrNull2(get('om-office-total')),
          open_plan_m2: _numOrNull2(get('om-office-openplan')),
          separated_count: _numOrNull2(get('om-office-separated-count')),
          separated_avg_m2: _numOrNull2(get('om-office-separated-avg'))
        };
        /* Si tout est null, on met à null entier */
        var anyOff = false;
        for (var oo in d.office_details) if (d.office_details[oo] !== null) { anyOff = true; break; }
        if (!anyOff) d.office_details = null;
        d.apartments_details = null;
        d.mixed_breakdown = null;
      }
      /* Mixte */
      else if (d.building_subtype === 'mixte') {
        d.mixed_breakdown = {
          commercial: _parsePipeRows(get('om-mixte-commerces'), ['name','surface','type']),
          office: _parsePipeRows(get('om-mixte-bureaux'), ['floor','surface','type']),
          residential: _parsePipeRows(get('om-mixte-logements'), ['floor','surface','bedrooms','type'])
        };
        if (!d.mixed_breakdown.commercial.length && !d.mixed_breakdown.office.length && !d.mixed_breakdown.residential.length) {
          d.mixed_breakdown = null;
        }
        d.apartments_details = null;
        d.office_details = null;
      }
      /* Pas de sous-type choisi : tout null */
      else {
        d.apartments_details = null;
        d.office_details = null;
        d.mixed_breakdown = null;
      }
    } else {
      /* Pas un immeuble : reset tous les champs structures */
      d.building_subtype = null;
      d.area_total = null;
      d.apartments_details = null;
      d.office_details = null;
      d.mixed_breakdown = null;
    }

    d.internal_ref           = (get('om-ref') || '').trim() || null;
    d.internal_notes         = (get('om-notes') || '').trim() || null;
    d.title                  = (get('om-title') || '').trim();
    d.type                   = get('om-type') || null;
    d.country                = get('om-country') || null;
    d.city_label             = (get('om-city') || '').trim() || null;
    d.district_label         = (get('om-district') || '').trim() || null;
    d.surface_hab            = numOrNull(get('om-surface-hab'));
    d.surface_terrain        = numOrNull(get('om-surface-terrain'));
    d.bedrooms               = numOrNull(get('om-bedrooms'));
    d.bathrooms              = numOrNull(get('om-bathrooms'));
    d.energy_class           = get('om-energy') || null;
    d.price_indicative       = numOrNull(get('om-price-indicative'));
    d.price_min              = numOrNull(get('om-price-min'));
    d.price_max              = numOrNull(get('om-price-max'));
    d.price_display          = (get('om-price-display') || '').trim() || null;
    d.short_pitch            = (get('om-pitch') || '').trim() || null;
    d.description            = (get('om-description') || '').trim() || null;
    d.cover_image_url        = (get('om-cover') || '').trim() || null;
    d.highlights             = txtToArr(get('om-highlights'));
    d.gallery_urls           = txtToArr(get('om-gallery'));
    d.is_published           = checked('om-pub');
    d.is_strict_offmarket    = checked('om-strict');
    d.show_to_qualified_only = checked('om-qualified');
    d.display_order          = numOrNull(get('om-order')) || 100;

    if (!d.title) return toast('Le titre est obligatoire', 'err');

    const payload = {
      internal_ref: d.internal_ref,
      internal_notes: d.internal_notes,
      title: d.title,
      type: d.type,
      country: d.country,
      city_label: d.city_label,
      district_label: d.district_label,
      surface_hab: d.surface_hab,
      surface_terrain: d.surface_terrain,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      energy_class: d.energy_class,
      price_indicative: d.price_indicative,
      price_min: d.price_min,
      price_max: d.price_max,
      price_display: d.price_display,
      short_pitch: d.short_pitch,
      description: d.description,
      cover_image_url: d.cover_image_url,
      highlights: d.highlights,
      gallery_urls: d.gallery_urls,
      is_published: d.is_published,
      is_strict_offmarket: d.is_strict_offmarket,
      show_to_qualified_only: d.show_to_qualified_only,
      display_order: d.display_order,
      building_subtype: d.building_subtype,
      area_total: d.area_total,
      apartments_details: d.apartments_details,
      office_details: d.office_details,
      mixed_breakdown: d.mixed_breakdown
    };

    try {
      let saved;
      if (d.id) {
        const arr = await api('/rest/v1/properties_offmarket?id=eq.' + encodeURIComponent(d.id), {
          method: 'PATCH',
          body: payload,
          headers: { 'Prefer': 'return=representation' }
        });
        saved = Array.isArray(arr) ? arr[0] : arr;
        if (!window.CACHE) window.CACHE = {};
        if (!window.CACHE.offmarket) window.CACHE.offmarket = [];
        const idx = window.CACHE.offmarket.findIndex(x => String(x.id) === String(d.id));
        if (idx >= 0 && saved) window.CACHE.offmarket[idx] = saved;
      } else {
        const arr = await api('/rest/v1/properties_offmarket', {
          method: 'POST',
          body: payload,
          headers: { 'Prefer': 'return=representation' }
        });
        saved = Array.isArray(arr) ? arr[0] : arr;
        if (saved) {
          if (!window.CACHE) window.CACHE = {};
          if (!window.CACHE.offmarket) window.CACHE.offmarket = [];
          window.CACHE.offmarket.unshift(saved);
        }
      }
      toast(d.id ? '✓ Bien mis à jour' : '✓ Bien créé', 'ok');
      closeModal();
      renderOffmarketList();
    } catch (err) {
      console.error('[off-market] saveOffmarket:', err);
      toast('Erreur : ' + err.message, 'err');
    }
  };

  /* ═══ DELETE ═══ */
  window.deleteOffmarket = async function (id) {
    const items = (window.CACHE && window.CACHE.offmarket) || [];
    const p = items.find(x => String(x.id) === String(id));
    if (!p) return;
    if (!confirm('Supprimer définitivement « ' + (p.title || 'ce bien') + ' » ?\n\nCette action est irréversible.')) return;
    try {
      await api('/rest/v1/properties_offmarket?id=eq.' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: { 'Prefer': 'return=minimal' }
      });
      window.CACHE.offmarket = items.filter(x => String(x.id) !== String(id));
      toast('✓ Bien supprimé', 'ok');
      renderOffmarketList();
    } catch (err) {
      toast('Erreur : ' + err.message, 'err');
    }
  };

  window.deleteOffmarketFromEditor = function () {
    if (_OM_DRAFT && _OM_DRAFT.id) {
      const id = _OM_DRAFT.id;
      closeModal();
      window.deleteOffmarket(id);
    }
  };

  /* ═══ TOGGLE PUBLISH ═══ */
  window.toggleOffmarketPublished = async function (id, isChecked) {
    try {
      await api('/rest/v1/properties_offmarket?id=eq.' + encodeURIComponent(id), {
        method: 'PATCH',
        body: { is_published: !!isChecked },
        headers: { 'Prefer': 'return=minimal' }
      });
      const items = (window.CACHE && window.CACHE.offmarket) || [];
      const p = items.find(x => String(x.id) === String(id));
      if (p) p.is_published = !!isChecked;
      toast(isChecked ? '✓ Publié' : '✓ Dépublié', 'ok');
      renderOffmarketList();
    } catch (err) {
      toast('Erreur : ' + err.message, 'err');
    }
  };

  console.log('%c[MAPA Admin] Module Off-Market chargé', 'color:#b89448;font-weight:bold');
})();

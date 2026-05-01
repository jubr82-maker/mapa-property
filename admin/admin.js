/* ═══════════════════════════════════════════════════════════════════
   MAPA Property — admin.js (Bloc 1/5)
   Login Supabase Auth + Navigation + Dashboard + Helpers globaux
   ─────────────────────────────────────────────────────────────────
   Architecture :
   - Auth via Supabase (email/password)
   - Session JWT stockée localStorage (clé sb-{ref}-auth-token)
   - Toutes les requêtes admin utilisent le JWT user (rôle authenticated)
   - Les policies "authenticated all X" donnent accès complet à l'admin
   ─────────────────────────────────────────────────────────────────
   Périmètre back-office MAPA :
   - CRUD : blog_posts, reviews, mandats_recherche, estimations
   - Lecture + workflow : leads, arcova_waitlist
   - Toggle UNIQUEMENT : properties.is_published, properties.is_featured
   - JAMAIS modifier : prix, surface, photos, description (Apimo source de vérité)
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

/* ═══ CONFIG SUPABASE ═══ */
const SUPA = 'https://dutfkblygfvhhwpzxmfz.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dGZrYmx5Z2Z2aGh3cHp4bWZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTcxMTMsImV4cCI6MjA5MTA5MzExM30.iauOM8aJhvdMCD1Cz4TzFLBTDKLO5tUc_fb1rTuUxrQ';
const PROJECT_REF = 'dutfkblygfvhhwpzxmfz';
const AUTH_STORAGE_KEY = 'sb-' + PROJECT_REF + '-auth-token';

/* ═══ ÉTAT GLOBAL ═══ */
let CURRENT_USER = null;        // user Supabase Auth { id, email, ... }
let ACCESS_TOKEN = null;        // JWT pour appels API
let CURRENT_TAB = 'dashboard';

/* Caches données (rechargés à chaque tab show) */
const CACHE = {
  properties: [],
  property_images: {},
  blog_posts: [],
  reviews: [],
  leads: [],
  mandats: [],
  arcova: [],
  estimations: []
};

/* ═══ HELPERS GLOBAUX ═══ */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtNum(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('fr-FR');
}

function fmtPrice(n) {
  if (n == null || n === '' || isNaN(n)) return '—';
  return Number(n).toLocaleString('fr-FR') + ' €';
}

function fmtDate(d, opts) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleDateString('fr-FR', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return '—'; }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return '—'; }
}

function fmtRelative(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const diff = (Date.now() - dt.getTime()) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return 'il y a ' + Math.floor(diff / 86400) + 'j';
  return fmtDate(d);
}

function debounce(fn, ms) {
  let t;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), ms || 250);
  };
}

/* ═══ TOAST ═══ */
function toast(msg, kind, dur) {
  const el = $('toast');
  if (!el) return;
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  el.style.display = 'block';
  // Force reflow
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.style.display = 'none'; }, 300);
  }, dur || 3000);
}
window.toast = toast;

/* ═══ MODAL ═══ */
function openModal(title, html, opts) {
  $('modal-title').textContent = title || '';
  $('modal-body').innerHTML = html || '';
  const m = $('modal');
  m.className = 'modal-admin' + (opts && opts.size ? ' ' + opts.size : '');
  $('modal-backdrop').style.display = 'block';
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  $('modal-backdrop').style.display = 'none';
  $('modal').style.display = 'none';
  $('modal-body').innerHTML = '';
  document.body.style.overflow = '';
}
window.closeModal = closeModal;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('modal').style.display === 'flex') closeModal();
});

/* ═══ SUPABASE FETCH WRAPPER ═══
   Auto-injecte JWT user si dispo, sinon anon key */
async function api(path, opts) {
  opts = opts || {};
  // Auto-refresh du token si proche de l'expiration
  if (ACCESS_TOKEN) await authEnsureFreshToken();
  const url = path.startsWith('http') ? path : SUPA + path;
  const headers = Object.assign({
    'apikey': SUPA_ANON,
    'Authorization': 'Bearer ' + (ACCESS_TOKEN || SUPA_ANON),
    'Content-Type': 'application/json',
    'Prefer': opts.prefer || ''
  }, opts.headers || {});

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch (e) { err = await res.text(); }
    const msg = (err && (err.message || err.error || err.hint)) || ('HTTP ' + res.status);
    const error = new Error(msg);
    error.status = res.status;
    error.body = err;
    throw error;
  }

  // 204 No Content
  if (res.status === 204) return null;

  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

/* ═══ SUPABASE AUTH ═══ */
async function authSignIn(email, password) {
  const res = await fetch(SUPA + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      'apikey': SUPA_ANON,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: email, password: password })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || err.message || ('HTTP ' + res.status));
  }

  const data = await res.json();
  ACCESS_TOKEN = data.access_token;
  CURRENT_USER = data.user;
  // Stockage compatible Supabase JS SDK
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
    user: data.user
  }));
  return data;
}

async function authSignOut() {
  try {
    if (ACCESS_TOKEN) {
      await fetch(SUPA + '/auth/v1/logout', {
        method: 'POST',
        headers: {
          'apikey': SUPA_ANON,
          'Authorization': 'Bearer ' + ACCESS_TOKEN
        }
      });
    }
  } catch (e) { /* ignore */ }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  ACCESS_TOKEN = null;
  CURRENT_USER = null;
}

async function authEnsureFreshToken() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return false;
  let session;
  try { session = JSON.parse(raw); } catch (e) { return false; }
  if (!session.access_token) return false;

  // Token expiré ou expire dans <60s : on rafraîchit
  const expired = session.expires_at && session.expires_at < Math.floor(Date.now() / 1000) + 60;
  if (!expired) {
    ACCESS_TOKEN = session.access_token;
    return true;
  }
  if (!session.refresh_token) return false;

  try {
    const res = await fetch(SUPA + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    ACCESS_TOKEN = data.access_token;
    CURRENT_USER = data.user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
      user: data.user
    }));
    return true;
  } catch (e) {
    console.error('[AUTH] Token refresh failed:', e);
    return false;
  }
}

async function authRestoreSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  const ok = await authEnsureFreshToken();
  if (!ok) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
  // Re-lire la session après refresh éventuel
  const session = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  CURRENT_USER = session.user;
  return session.user;
}

async function authResetPassword(email) {
  const res = await fetch(SUPA + '/auth/v1/recover', {
    method: 'POST',
    headers: { 'apikey': SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.msg || err.message || 'Erreur réinitialisation');
  }
}

/* ═══ HANDLERS LOGIN ═══ */
window.handleLogin = async function (ev) {
  ev.preventDefault();
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errEl = $('login-error');
  errEl.style.display = 'none';

  const submitBtn = ev.target.querySelector('button[type="submit"]');
  const oldText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loader"></span> Connexion...';

  try {
    await authSignIn(email, password);
    showApp();
  } catch (err) {
    errEl.textContent = err.message === 'Invalid login credentials'
      ? 'Email ou mot de passe incorrect'
      : err.message;
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = oldText;
  }

  return false;
};

window.resetPassword = async function () {
  const email = $('login-email').value.trim();
  if (!email) {
    toast('Saisis ton email d\'abord', 'warn');
    $('login-email').focus();
    return;
  }
  if (!confirm('Envoyer un lien de réinitialisation à ' + email + ' ?')) return;
  try {
    await authResetPassword(email);
    toast('Email envoyé. Vérifie ta boîte de réception.', 'ok', 5000);
  } catch (err) {
    toast(err.message, 'err', 5000);
  }
};

window.handleLogout = async function () {
  if (!confirm('Se déconnecter ?')) return;
  await authSignOut();
  showLogin();
};

/* ═══ AFFICHAGE LOGIN / APP ═══ */
function showLogin() {
  $('login-view').style.display = 'flex';
  $('app').style.display = 'none';
  $('login-email').value = '';
  $('login-password').value = '';
  $('login-error').style.display = 'none';
  setTimeout(() => $('login-email').focus(), 100);
}

function showApp() {
  $('login-view').style.display = 'none';
  $('app').style.display = 'block';
  $('hd-user').textContent = CURRENT_USER ? CURRENT_USER.email : '';
  showTab(CURRENT_TAB || 'dashboard');
  // Précharger les compteurs pour les badges
  refreshBadges();
}

/* ═══ NAVIGATION TABS ═══ */
window.showTab = function (tabId) {
  CURRENT_TAB = tabId;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tabId));

  // Loader dans chaque tab
  switch (tabId) {
    case 'dashboard': loadDashboard(); break;
    case 'properties': if (typeof loadProperties === 'function') loadProperties(); break;
    case 'featured': if (typeof loadFeatured === 'function') loadFeatured(); break;
    case 'reviews': if (typeof loadReviews === 'function') loadReviews(); break;
    case 'blog': if (typeof loadBlog === 'function') loadBlog(); break;
    case 'leads': if (typeof loadLeads === 'function') loadLeads(); break;
    case 'mandats': if (typeof loadMandats === 'function') loadMandats(); break;
    case 'arcova': if (typeof loadArcova === 'function') loadArcova(); break;
  }
};

/* ═══ BADGES (compteurs notifications) ═══ */
async function refreshBadges() {
  try {
    const [leads, mandats] = await Promise.all([
      api('/rest/v1/leads?select=id&status=eq.new', { headers: { 'Prefer': 'count=exact' } }).catch(() => []),
      api('/rest/v1/mandats_recherche?select=id&status=eq.active', { headers: { 'Prefer': 'count=exact' } }).catch(() => [])
    ]);
    setBadge('leads-badge', Array.isArray(leads) ? leads.length : 0);
    setBadge('mandats-badge', Array.isArray(mandats) ? mandats.length : 0);
  } catch (e) { /* silencieux */ }
}

function setBadge(id, count) {
  const el = $(id);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.style.display = 'inline-block';
  } else {
    el.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const setVal = (id, val) => { const e = $(id); if (e) e.textContent = val; };

  // Loaders
  ['stat-props', 'stat-featured', 'stat-pending-reviews', 'stat-new-leads', 'stat-new-mandats', 'stat-blog']
    .forEach(id => setVal(id, '…'));

  try {
    // Compte parallèle (Prefer: count=exact + Range head)
    const [props, featured, reviewsAll, leadsNew, mandatsNew, blogPub] = await Promise.all([
      countRows('properties', 'is_published=eq.true'),
      countRows('properties', 'is_featured=eq.true'),
      countRows('reviews', 'is_published=eq.false'),  // "en attente" = non publié
      countRows('leads', 'status=eq.new'),
      countRows('mandats_recherche', 'status=eq.active'),
      countRows('blog_posts', 'is_published=eq.true')
    ]);

    setVal('stat-props', fmtNum(props));
    setVal('stat-featured', fmtNum(featured) + ' / 4');
    setVal('stat-pending-reviews', fmtNum(reviewsAll));
    setVal('stat-new-leads', fmtNum(leadsNew));
    setVal('stat-new-mandats', fmtNum(mandatsNew));
    setVal('stat-blog', fmtNum(blogPub));

    // Activité récente : 10 dernières actions tous types
    loadRecentActivity();
  } catch (err) {
    console.error('[admin] dashboard error:', err);
    toast('Erreur chargement dashboard : ' + err.message, 'err');
  }
}

async function countRows(table, filter) {
  try {
    const res = await fetch(SUPA + '/rest/v1/' + table + '?select=id&' + (filter || ''), {
      method: 'HEAD',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + (ACCESS_TOKEN || SUPA_ANON),
        'Prefer': 'count=exact',
        'Range': '0-0'
      }
    });
    const range = res.headers.get('Content-Range') || '';
    // Format "0-0/123"
    const total = range.split('/')[1];
    return parseInt(total, 10) || 0;
  } catch (e) { return 0; }
}

async function loadRecentActivity() {
  const list = $('dashboard-activity');
  if (!list) return;

  try {
    const [leads, reviews, blog] = await Promise.all([
      api('/rest/v1/leads?select=id,created_at,name,email,type&order=created_at.desc&limit=5').catch(() => []),
      api('/rest/v1/reviews?select=id,created_at,author,is_published&order=created_at.desc&limit=3').catch(() => []),
      api('/rest/v1/blog_posts?select=id,created_at,updated_at,title_fr,is_published&order=updated_at.desc&limit=3').catch(() => [])
    ]);

    const items = [];
    (leads || []).forEach(l => items.push({
      time: l.created_at,
      icon: '📥',
      text: 'Nouveau lead — <strong>' + esc(l.name || l.email || 'Anonyme') + '</strong>' + (l.type ? ' (' + esc(l.type) + ')' : ''),
      onclick: 'showTab(\'leads\')'
    }));
    (reviews || []).forEach(r => items.push({
      time: r.created_at,
      icon: '✍️',
      text: 'Avis ajouté — <strong>' + esc(r.author || 'Client') + '</strong>' + (r.is_published ? ' <span class="pill pill-ok">publié</span>' : ' <span class="pill pill-warn">à modérer</span>'),
      onclick: 'showTab(\'reviews\')'
    }));
    (blog || []).forEach(b => items.push({
      time: b.updated_at || b.created_at,
      icon: '📰',
      text: 'Article — <strong>' + esc(b.title_fr || 'Sans titre') + '</strong>' + (b.is_published ? ' <span class="pill pill-ok">publié</span>' : ' <span class="pill pill-muted">brouillon</span>'),
      onclick: 'showTab(\'blog\')'
    }));

    items.sort((a, b) => new Date(b.time) - new Date(a.time));
    const top = items.slice(0, 10);

    if (top.length === 0) {
      list.innerHTML = '<div class="empty">Aucune activité récente</div>';
      return;
    }

    list.innerHTML = top.map(it => (
      '<div class="activity-item" onclick="' + it.onclick + '" style="cursor:pointer">' +
        '<div class="activity-icon">' + it.icon + '</div>' +
        '<div style="flex:1">' + it.text + '</div>' +
        '<div class="activity-time">' + esc(fmtRelative(it.time)) + '</div>' +
      '</div>'
    )).join('');
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur chargement activité</div>';
  }
}

/* ═══ STUBS POUR TABS NON ENCORE LIVRÉS (Bloc 3+) ═══ */
/* ═══════════════════════════════════════════════════════════════════
   MODULE BIENS (Bloc 3)
   Périmètre strict : toggle is_published + is_featured UNIQUEMENT
   Tout le reste (prix, surface, photos, description) = lecture seule (Apimo)
   ═══════════════════════════════════════════════════════════════════ */

const APIMO_AGENCY_ID = 3508;
const PROPS_FILTERS = { search: '', status: 'all', transaction: 'all' };
const MAX_FEATURED = 4;

async function loadProperties() {
  const list = $('properties-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement des biens…</div>';

  try {
    const props = await api('/rest/v1/properties?select=*,property_images(url,sort)&order=created_at.desc');
    CACHE.properties = props || [];
    CACHE.properties.forEach(p => {
      if (Array.isArray(p.property_images)) {
        p.property_images.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
      } else {
        p.property_images = [];
      }
    });
    renderPropertiesGrid();
  } catch (err) {
    console.error('[admin] loadProperties:', err);
    list.innerHTML = '<div class="empty">Erreur chargement : ' + esc(err.message) + '</div>';
  }
}

function renderPropertiesGrid() {
  const list = $('properties-list');
  if (!list) return;
  list.className = '';  /* annule props-grid hérité du HTML, on rebuild en interne */

  const filtered = applyPropsFilters(CACHE.properties);
  const featuredCount = CACHE.properties.filter(p => p.is_featured).length;

  const banner = (
    '<div class="apimo-banner">' +
      '<strong>⚠️ Source de vérité Apimo CRM</strong> — ' +
      'Les biens sont synchronisés depuis Apimo. Pour modifier <em>prix, surface, photos, description</em> ou ajouter un bien, ' +
      'va dans <a href="https://app.apimo.pro" target="_blank" rel="noopener">Apimo (agence ' + APIMO_AGENCY_ID + ')</a>. ' +
      'Ici tu peux uniquement <strong>publier/dépublier</strong> et <strong>marquer en coup de cœur</strong> (max ' + MAX_FEATURED + ').' +
    '</div>'
  );

  const counters = (
    '<div class="props-counters">' +
      '<span class="pill pill-info">' + filtered.length + ' / ' + CACHE.properties.length + ' affichés</span>' +
      '<span class="pill pill-ok">' + CACHE.properties.filter(p => p.is_published).length + ' publiés</span>' +
      '<span class="pill ' + (featuredCount >= MAX_FEATURED ? 'pill-warn' : 'pill-muted') + '">' +
        featuredCount + ' / ' + MAX_FEATURED + ' coups de cœur' +
      '</span>' +
    '</div>'
  );

  if (filtered.length === 0) {
    list.innerHTML = banner + counters + '<div class="empty">Aucun bien ne correspond aux filtres.</div>';
    return;
  }

  const cards = filtered.map(p => renderPropCard(p, featuredCount)).join('');
  list.innerHTML = banner + counters + '<div class="props-grid">' + cards + '</div>';
}

function applyPropsFilters(arr) {
  const f = PROPS_FILTERS;
  return arr.filter(p => {
    if (f.status === 'published' && !p.is_published) return false;
    if (f.status === 'unpublished' && p.is_published) return false;
    if (f.transaction !== 'all') {
      const t = String(p.transaction || '').toLowerCase();
      if (f.transaction === 'sale' && !(t === 'sale' || t === 'vente' || t === '1')) return false;
      if (f.transaction === 'rent' && !(t === 'rent' || t === 'location' || t === '2')) return false;
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [p.apimo_id, p.slug, p.city, p.country, p.title_fr, p.title_en, p.title_de]
        .filter(Boolean).join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function renderPropCard(p, featuredCount) {
  const cover = (p.property_images[0] && p.property_images[0].url) || '';
  const title = p.title_fr || p.title_en || p.title_de || '—';
  const ref = p.apimo_id || '—';
  const loc = [p.city, p.country].filter(Boolean).join(', ') || '—';
  const isPub = !!p.is_published;
  const isFeat = !!p.is_featured;
  const t = String(p.transaction || '').toLowerCase();
  const isRental = t === 'rent' || t === 'location' || t === '2';
  const featureDisabled = !isFeat && featuredCount >= MAX_FEATURED;

  const tags = [];
  if (!isPub) tags.push('<span class="prop-tag unpub">Non publié</span>');
  if (isFeat) tags.push('<span class="prop-tag featured">Coup de cœur</span>');
  if (isRental) tags.push('<span class="prop-tag rent">Location</span>');

  return (
    '<article class="prop-card' + (isPub ? '' : ' unpublished') + '">' +
      '<div class="prop-card-img"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '>' +
        (tags.length ? '<div class="prop-card-tags">' + tags.join('') + '</div>' : '') +
      '</div>' +
      '<div class="prop-card-body">' +
        '<div class="prop-card-ref">Réf. ' + esc(ref) + (p.property_type ? ' · ' + esc(p.property_type) : '') + '</div>' +
        '<h3 class="prop-card-title">' + esc(title) + '</h3>' +
        '<div class="prop-card-loc">📍 ' + esc(loc) + '</div>' +
        '<div class="prop-card-price">' + fmtPrice(p.price || p.price_value) + (isRental ? ' /mois' : '') + '</div>' +
        '<div class="prop-card-meta">' +
          (p.surface || p.living_surface ? '<span>📐 ' + fmtNum(p.surface || p.living_surface) + ' m²</span>' : '') +
          (p.bedrooms ? '<span>🛏 ' + p.bedrooms + ' ch.</span>' : '') +
          (p.bathrooms ? '<span>🛁 ' + p.bathrooms + '</span>' : '') +
          (p.energy ? '<span>⚡ ' + esc(p.energy) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="prop-card-actions">' +
        '<label class="toggle btn-toggle" title="Afficher sur le site public">' +
          '<input type="checkbox"' + (isPub ? ' checked' : '') + ' onchange="togglePublished(\'' + p.id + '\', this.checked)">' +
          '<span class="toggle-track"></span>' +
          '<span>Visible</span>' +
        '</label>' +
        '<label class="toggle featured btn-toggle" title="' +
          (featureDisabled ? 'Limite ' + MAX_FEATURED + ' atteinte' : 'Coup de cœur') + '">' +
          '<input type="checkbox"' + (isFeat ? ' checked' : '') + (featureDisabled ? ' disabled' : '') +
            ' onchange="toggleFeatured(\'' + p.id + '\', this.checked)">' +
          '<span class="toggle-track"></span>' +
          '<span>★</span>' +
        '</label>' +
        '<a href="https://app.apimo.pro" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Voir/éditer dans Apimo">↗</a>' +
      '</div>' +
    '</article>'
  );
}

window.filterProperties = function () {
  PROPS_FILTERS.search = ($('props-search').value || '').trim();
  PROPS_FILTERS.status = $('props-filter-status').value;
  PROPS_FILTERS.transaction = $('props-filter-transaction').value;
  renderPropertiesGrid();
};

window.togglePublished = async function (id, checked) {
  try {
    await api('/rest/v1/properties?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: { is_published: checked },
      headers: { 'Prefer': 'return=minimal' }
    });
    const p = CACHE.properties.find(x => x.id === id);
    if (p) p.is_published = checked;
    toast(checked ? '✓ Bien publié sur le site' : '◯ Bien retiré du site', 'ok');
    renderPropertiesGrid();
    refreshBadges();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
    renderPropertiesGrid();
  }
};

window.toggleFeatured = async function (id, checked) {
  try {
    let body;
    if (checked) {
      const featured = CACHE.properties.filter(p => p.is_featured && p.id !== id);
      if (featured.length >= MAX_FEATURED) {
        toast('Limite ' + MAX_FEATURED + ' coups de cœur atteinte', 'warn');
        renderPropertiesGrid();
        return;
      }
      const maxOrder = featured.reduce((m, p) => Math.max(m, p.featured_order || 0), 0);
      body = { is_featured: true, featured_order: maxOrder + 1 };
    } else {
      body = { is_featured: false, featured_order: null };
    }
    await api('/rest/v1/properties?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: body,
      headers: { 'Prefer': 'return=minimal' }
    });
    const p = CACHE.properties.find(x => x.id === id);
    if (p) {
      p.is_featured = body.is_featured;
      p.featured_order = body.featured_order;
    }
    toast(checked ? '★ Ajouté aux coups de cœur' : '☆ Retiré des coups de cœur', 'ok');
    if (CURRENT_TAB === 'featured') renderFeatured();
    else renderPropertiesGrid();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
    renderPropertiesGrid();
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MODULE COUPS DE CŒUR
   ═══════════════════════════════════════════════════════════════════ */
async function loadFeatured() {
  const cur = $('featured-list');
  const avail = $('featured-available');
  if (!cur || !avail) return;

  cur.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';
  avail.innerHTML = '';

  try {
    if (!CACHE.properties.length) {
      const props = await api('/rest/v1/properties?select=*,property_images(url,sort)&order=created_at.desc');
      CACHE.properties = props || [];
      CACHE.properties.forEach(p => {
        if (Array.isArray(p.property_images)) p.property_images.sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999));
        else p.property_images = [];
      });
    }
    renderFeatured();
  } catch (err) {
    cur.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderFeatured() {
  const cur = $('featured-list');
  const avail = $('featured-available');
  if (!cur) return;

  const featured = CACHE.properties
    .filter(p => p.is_featured)
    .sort((a, b) => (a.featured_order || 999) - (b.featured_order || 999));

  const available = CACHE.properties
    .filter(p => !p.is_featured && p.is_published);

  if (featured.length === 0) {
    cur.innerHTML = '';  // CSS :empty hint
  } else {
    cur.innerHTML = featured.map((p, i) => renderFeaturedCard(p, i, featured.length)).join('');
    enableDragDrop(cur);
  }

  if (avail) {
    avail.className = '';  /* idem : neutralise props-grid héritée */
    if (available.length === 0) {
      avail.innerHTML = '<div class="empty">Aucun bien publié disponible. Publie un bien depuis l\'onglet Biens.</div>';
    } else {
      avail.innerHTML = '<div class="props-grid">' +
        available.map(p => renderAvailableCard(p, featured.length)).join('') +
        '</div>';
    }
  }
}

function renderFeaturedCard(p, index, total) {
  const cover = (p.property_images[0] && p.property_images[0].url) || '';
  const title = p.title_fr || p.title_en || '—';
  const loc = [p.city, p.country].filter(Boolean).join(', ');

  return (
    '<article class="prop-card featured-card" draggable="true" data-id="' + esc(p.id) + '">' +
      '<div class="featured-rank">' + (index + 1) + '</div>' +
      '<div class="prop-card-img"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '>' +
        '<div class="prop-card-tags"><span class="prop-tag featured">Coup de cœur</span></div>' +
      '</div>' +
      '<div class="prop-card-body">' +
        '<div class="prop-card-ref">Réf. ' + esc(p.apimo_id || '—') + '</div>' +
        '<h3 class="prop-card-title">' + esc(title) + '</h3>' +
        '<div class="prop-card-loc">📍 ' + esc(loc || '—') + '</div>' +
        '<div class="prop-card-price">' + fmtPrice(p.price || p.price_value) + '</div>' +
      '</div>' +
      '<div class="prop-card-actions">' +
        '<button class="btn btn-ghost btn-sm" onclick="moveFeatured(\'' + p.id + '\',-1)" ' +
          (index === 0 ? 'disabled' : '') + ' title="Monter">↑</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="moveFeatured(\'' + p.id + '\',1)" ' +
          (index === total - 1 ? 'disabled' : '') + ' title="Descendre">↓</button>' +
        '<button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="toggleFeatured(\'' + p.id + '\',false)">✕ Retirer</button>' +
      '</div>' +
    '</article>'
  );
}

function renderAvailableCard(p, currentFeaturedCount) {
  const cover = (p.property_images[0] && p.property_images[0].url) || '';
  const title = p.title_fr || p.title_en || '—';
  const loc = [p.city, p.country].filter(Boolean).join(', ');
  const disabled = currentFeaturedCount >= MAX_FEATURED;

  return (
    '<article class="prop-card' + (disabled ? ' unpublished' : '') + '">' +
      '<div class="prop-card-img"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '></div>' +
      '<div class="prop-card-body">' +
        '<div class="prop-card-ref">Réf. ' + esc(p.apimo_id || '—') + '</div>' +
        '<h3 class="prop-card-title">' + esc(title) + '</h3>' +
        '<div class="prop-card-loc">📍 ' + esc(loc || '—') + '</div>' +
        '<div class="prop-card-price">' + fmtPrice(p.price || p.price_value) + '</div>' +
      '</div>' +
      '<div class="prop-card-actions">' +
        '<button class="btn btn-copper btn-sm btn-full" onclick="toggleFeatured(\'' + p.id + '\',true)" ' +
          (disabled ? 'disabled' : '') + '>' +
          (disabled ? 'Limite atteinte' : '★ Promouvoir') +
        '</button>' +
      '</div>' +
    '</article>'
  );
}

window.moveFeatured = async function (id, delta) {
  const featured = CACHE.properties
    .filter(p => p.is_featured)
    .sort((a, b) => (a.featured_order || 999) - (b.featured_order || 999));
  const idx = featured.findIndex(p => p.id === id);
  if (idx < 0) return;
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= featured.length) return;
  [featured[idx], featured[newIdx]] = [featured[newIdx], featured[idx]];
  await persistFeaturedOrder(featured);
};

async function persistFeaturedOrder(orderedFeatured) {
  try {
    const promises = orderedFeatured.map((p, i) =>
      api('/rest/v1/properties?id=eq.' + encodeURIComponent(p.id), {
        method: 'PATCH',
        body: { featured_order: i + 1 },
        headers: { 'Prefer': 'return=minimal' }
      }).then(() => {
        const cached = CACHE.properties.find(x => x.id === p.id);
        if (cached) cached.featured_order = i + 1;
      })
    );
    await Promise.all(promises);
    toast('✓ Ordre mis à jour', 'ok');
    renderFeatured();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
    renderFeatured();
  }
}

function enableDragDrop(container) {
  let dragged = null;
  container.querySelectorAll('[draggable="true"]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragged = el;
      el.style.opacity = '.45';
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      if (dragged) dragged.style.opacity = '';
      dragged = null;
      container.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (el !== dragged) el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      if (!dragged || dragged === el) return;
      const all = Array.from(container.querySelectorAll('[draggable="true"]'));
      const fromIdx = all.indexOf(dragged);
      const toIdx = all.indexOf(el);
      const ids = all.map(x => x.dataset.id);
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, dragged.dataset.id);
      const ordered = ids.map(id => CACHE.properties.find(p => p.id === id)).filter(Boolean);
      await persistFeaturedOrder(ordered);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE AVIS (Bloc 5) — CRUD + modération
   Apimo n'a pas d'API reviews exploitable → gestion manuelle Supabase.
   ═══════════════════════════════════════════════════════════════════ */
async function loadReviews() {
  const list = $('reviews-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';

  try {
    const reviews = await api('/rest/v1/reviews?select=*&order=created_at.desc');
    CACHE.reviews = reviews || [];
    renderReviewsList();
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderReviewsList() {
  const list = $('reviews-list');
  if (!list) return;
  list.className = '';

  const banner = '<div class="apimo-banner" style="margin-bottom:18px">' +
    '<strong>📝 Avis clients</strong> — Gestion manuelle (Apimo n\'expose pas d\'API reviews). Saisis chaque avis vérifié, contrôle l\'affichage public via le toggle ' +
    '<em>Publié</em>. Les avis publiés s\'affichent sur la home du site.' +
    '</div>';

  const counters = (() => {
    const total = CACHE.reviews.length;
    const pub = CACHE.reviews.filter(r => r.is_published).length;
    const pending = CACHE.reviews.filter(r => !r.is_published).length;
    const avgRating = total ? (CACHE.reviews.reduce((s, r) => s + (r.rating || 0), 0) / total).toFixed(1) : '—';
    return '<div class="counter-pills" style="margin-bottom:18px">' +
      '<span class="pill">' + total + ' avis</span>' +
      '<span class="pill ok">' + pub + ' publiés</span>' +
      '<span class="pill pending">' + pending + ' en attente</span>' +
      '<span class="pill">★ ' + avgRating + '/5</span>' +
      '</div>';
  })();

  if (!CACHE.reviews.length) {
    list.innerHTML = banner + '<div class="empty">Aucun avis. Clique "+ Nouvel avis" pour saisir le premier.</div>';
    return;
  }

  const cards = CACHE.reviews.map(r => {
    const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
    const pubClass = r.is_published ? 'published' : 'draft';
    const pubLabel = r.is_published ? 'Publié' : 'En attente';
    const text = r.comment || '';
    const author = r.name || '—';
    const dt = r.review_date || r.created_at;
    const source = r.source || 'manuel';
    const apimoRef = r.apimo_id_link ? '🏠 ' + r.apimo_id_link : '';

    return (
      '<article class="review-card">' +
        '<div class="review-card-hd">' +
          '<div class="review-stars">' + stars + ' <span style="color:var(--n3);font-size:13px">' + (r.rating || 0) + '/5</span></div>' +
          '<span class="blog-status ' + pubClass + '">' + pubLabel + '</span>' +
        '</div>' +
        '<div class="review-text">' + esc(text) + '</div>' +
        '<div class="review-meta">' +
          '<strong>' + esc(author) + '</strong>' +
          ' · <span style="color:var(--n3)">' + esc(fmtDate(dt)) + '</span>' +
          ' · <span class="ref">' + esc(source) + '</span>' +
          (apimoRef ? ' · <span class="ref">' + esc(apimoRef) + '</span>' : '') +
        '</div>' +
        '<div class="blog-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="editReview(\'' + r.id + '\')">✎ Éditer</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="toggleReviewPublished(\'' + r.id + '\',' + (!r.is_published) + ')">' +
            (r.is_published ? '◯ Dépublier' : '✓ Publier') +
          '</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteReview(\'' + r.id + '\')" title="Supprimer">✕</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');

  list.innerHTML = banner + counters + '<div class="reviews-grid">' + cards + '</div>';
}

window.newReview = function () { openReviewEditor(null); };
window.editReview = function (id) {
  const r = CACHE.reviews.find(x => String(x.id) === String(id));
  if (!r) return toast('Avis introuvable', 'err');
  openReviewEditor(r);
};

let _REVIEW_DRAFT = null;

function openReviewEditor(review) {
  _REVIEW_DRAFT = review ? Object.assign({}, review) : {
    name: '',
    rating: 5,
    comment: '',
    review_date: new Date().toISOString().slice(0, 10),
    source: 'manuel',
    is_published: false,
    apimo_id_link: null
  };

  const r = _REVIEW_DRAFT;
  const html = (
    '<div class="form">' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label field-required">Nom du client</label>' +
          '<input type="text" id="rv-name" value="' + esc(r.name || '') + '" placeholder="ex: M. Dupont · Belair">' +
          '<span class="field-hint">Tu peux inclure la ville dans le nom (ex: « Sophie Martin · Limpertsberg »)</span>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label field-required">Note (1-5)</label>' +
          '<select id="rv-rating">' +
            [5,4,3,2,1].map(n => '<option value="' + n + '"' + (r.rating === n ? ' selected' : '') + '>' + ('★'.repeat(n)) + ' (' + n + ')</option>').join('') +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label field-required">Commentaire</label>' +
        '<textarea id="rv-comment" rows="5" placeholder="Le témoignage du client, tel qu\'il sera affiché sur le site…">' + esc(r.comment || '') + '</textarea>' +
      '</div>' +

      '<div class="form-row cols-3">' +
        '<div class="field">' +
          '<label class="field-label">Date de l\'avis</label>' +
          '<input type="date" id="rv-date" value="' + esc((r.review_date || '').slice(0,10)) + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Source</label>' +
          '<select id="rv-source">' +
            ['manuel','google','immotop','site-mapa','email','autre'].map(s =>
              '<option value="' + s + '"' + (r.source === s ? ' selected' : '') + '>' + s + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Bien Apimo lié (optionnel)</label>' +
          '<input type="number" id="rv-apimo" value="' + esc(r.apimo_id_link || '') + '" placeholder="ex: 86621029">' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-secondary" onclick="saveReview(false)">💾 Enregistrer (en attente)</button>' +
        '<button class="btn btn-copper" onclick="saveReview(true)">✓ Publier</button>' +
      '</div>' +
    '</div>'
  );

  openModal(review ? 'Éditer l\'avis' : 'Nouvel avis', html, { size: 'lg' });
}

window.saveReview = async function (publish) {
  const d = _REVIEW_DRAFT;
  d.name = ($('rv-name').value || '').trim();
  d.rating = parseInt($('rv-rating').value, 10) || 5;
  d.review_date = $('rv-date').value || null;
  d.comment = ($('rv-comment').value || '').trim();
  d.source = $('rv-source').value || 'manuel';
  const apimoVal = ($('rv-apimo').value || '').trim();
  d.apimo_id_link = apimoVal ? parseInt(apimoVal, 10) : null;
  d.is_published = !!publish;

  if (!d.name) return toast('Le nom du client est obligatoire', 'err');
  if (!d.comment) return toast('Le commentaire est obligatoire', 'err');

  // Payload aligné sur les VRAIES colonnes DB
  const payload = {
    name: d.name,
    rating: d.rating,
    comment: d.comment,
    review_date: d.review_date,
    source: d.source,
    apimo_id_link: d.apimo_id_link,
    is_published: d.is_published
  };

  try {
    let saved;
    if (d.id) {
      const arr = await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(d.id), {
        method: 'PATCH',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      const idx = CACHE.reviews.findIndex(x => String(x.id) === String(d.id));
      if (idx >= 0 && saved) CACHE.reviews[idx] = saved;
    } else {
      const arr = await api('/rest/v1/reviews', {
        method: 'POST',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      if (saved) CACHE.reviews.unshift(saved);
    }
    toast(publish ? '✓ Avis publié' : '✓ Avis enregistré (en attente)', 'ok');
    closeModal();
    renderReviewsList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err', 5000);
  }
};

window.toggleReviewPublished = async function (id, publish) {
  try {
    await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: { is_published: publish },
      headers: { 'Prefer': 'return=minimal' }
    });
    const r = CACHE.reviews.find(x => String(x.id) === String(id));
    if (r) r.is_published = publish;
    toast(publish ? '✓ Publié' : '◯ Dépublié', 'ok');
    renderReviewsList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.deleteReview = async function (id) {
  const r = CACHE.reviews.find(x => String(x.id) === String(id));
  if (!r) return;
  if (!confirm('Supprimer définitivement l\'avis de "' + (r.name || 'inconnu') + '" ?')) return;
  try {
    await api('/rest/v1/reviews?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    CACHE.reviews = CACHE.reviews.filter(x => String(x.id) !== String(id));
    toast('✓ Avis supprimé', 'ok');
    renderReviewsList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MODULE LEADS (Bloc 5) — Workflow de traitement
   Lecture seule du contenu, édition statut + notes uniquement.
   ═══════════════════════════════════════════════════════════════════ */
const LEAD_STATUSES = {
  'new':         { label: 'Nouveau',     color: '#c4422d', icon: '🔴' },
  'in_progress': { label: 'En cours',    color: '#b89448', icon: '🟡' },
  'handled':     { label: 'Traité',      color: '#3a7a4a', icon: '🟢' },
  'converted':   { label: 'Converti',    color: '#1a2b44', icon: '⭐' },
  'lost':        { label: 'Perdu',       color: '#888',    icon: '⚫' }
};

let _LEADS_FILTER = 'all';

async function loadLeads() {
  const list = $('leads-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';

  try {
    const leads = await api('/rest/v1/leads?select=*&order=created_at.desc');
    CACHE.leads = leads || [];
    renderLeadsList();
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderLeadsList() {
  const list = $('leads-list');
  if (!list) return;
  list.className = '';

  const counts = { all: CACHE.leads.length };
  Object.keys(LEAD_STATUSES).forEach(s => {
    counts[s] = CACHE.leads.filter(l => (l.status || 'new') === s).length;
  });

  const filterPills = '<div class="counter-pills" style="margin-bottom:18px">' +
    '<button class="pill clickable' + (_LEADS_FILTER === 'all' ? ' active' : '') + '" onclick="setLeadsFilter(\'all\')">' +
      'Tous (' + counts.all + ')</button>' +
    Object.keys(LEAD_STATUSES).map(s => {
      const cfg = LEAD_STATUSES[s];
      return '<button class="pill clickable' + (_LEADS_FILTER === s ? ' active' : '') + '" onclick="setLeadsFilter(\'' + s + '\')">' +
        cfg.icon + ' ' + cfg.label + ' (' + counts[s] + ')</button>';
    }).join('') +
    '</div>';

  const visible = _LEADS_FILTER === 'all'
    ? CACHE.leads
    : CACHE.leads.filter(l => (l.status || 'new') === _LEADS_FILTER);

  if (!visible.length) {
    list.innerHTML = filterPills + '<div class="empty">Aucun lead' + (_LEADS_FILTER !== 'all' ? ' avec ce statut' : '') + '.</div>';
    return;
  }

  const rows = visible.map(l => {
    const status = l.status || 'new';
    const cfg = LEAD_STATUSES[status] || LEAD_STATUSES.new;
    const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.name || '—';
    const subject = l.subject || l.lead_type || l.type || 'Demande';
    const message = l.message || l.note || '';
    const phone = l.phone || '';
    const email = l.email || '';
    const propertyRef = l.property_ref || l.apimo_id || l.bien_id || '';

    return (
      '<article class="lead-card">' +
        '<div class="lead-card-hd">' +
          '<div>' +
            '<span class="lead-status" style="background:' + cfg.color + '">' + cfg.icon + ' ' + cfg.label + '</span>' +
            '<span class="lead-subject">' + esc(subject) + '</span>' +
          '</div>' +
          '<span class="lead-date">' + esc(fmtRelative(l.created_at)) + '</span>' +
        '</div>' +
        '<h3 class="lead-name">' + esc(name) + '</h3>' +
        '<div class="lead-contacts">' +
          (email ? '<a href="mailto:' + esc(email) + '" class="lead-link">📧 ' + esc(email) + '</a>' : '') +
          (phone ? '<a href="tel:' + esc(phone.replace(/\s+/g, '')) + '" class="lead-link">📱 ' + esc(phone) + '</a>' : '') +
          (propertyRef ? '<span class="ref">🏠 Bien ' + esc(propertyRef) + '</span>' : '') +
        '</div>' +
        (message ? '<div class="lead-message">' + esc(message) + '</div>' : '') +
        (l.notes ? '<div class="lead-notes"><strong>📝 Notes internes :</strong> ' + esc(l.notes) + '</div>' : '') +
        '<div class="blog-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="openLeadStatusEditor(\'' + l.id + '\')">⚙️ Statut + Notes</button>' +
          (status === 'new' ? '<button class="btn btn-secondary btn-sm" onclick="quickHandleLead(\'' + l.id + '\')">✓ Marquer traité</button>' : '') +
          '<button class="btn btn-copper btn-sm" onclick="convertLeadToMandat(\'' + l.id + '\')" title="Créer un mandat de recherche à partir de ce lead">📝 → Mandat</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteLead(\'' + l.id + '\')" title="Supprimer">✕</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');

  list.innerHTML = filterPills + '<div class="leads-list">' + rows + '</div>';
}

window.setLeadsFilter = function (f) {
  _LEADS_FILTER = f;
  renderLeadsList();
};

window.convertLeadToMandat = function (leadId) {
  const lead = CACHE.leads.find(x => String(x.id) === String(leadId));
  if (!lead) return toast('Lead introuvable', 'err');

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name || lead.email || '';
  const message = lead.message || lead.note || '';
  const propRef = lead.property_ref || lead.apimo_id || lead.bien_id || '';

  // Détermine le type de transaction depuis le subject/lead_type du lead
  const subject = (lead.subject || lead.lead_type || lead.type || '').toLowerCase();
  let txType = 'sale';
  if (subject.includes('rent') || subject.includes('location') || subject.includes('louer')) txType = 'rent';

  // Pré-rempli un draft mandat avec les infos du lead
  _MANDAT_DRAFT = {
    lead_id: lead.id,
    client_name: fullName,
    client_email: lead.email || null,
    client_phone: lead.phone || null,
    client_city: null,
    client_country: 'Luxembourg',
    property_type: '',
    transaction_type: txType,
    budget_min: null,
    budget_max: null,
    zones: [],
    min_bedrooms: null,
    min_surface: null,
    features: propRef ? ['Bien initialement consulté : Apimo ' + propRef] : [],
    status: 'active',
    offmarket_only: false,
    signed_at: null,
    notes: '— Lead d\'origine —\n' +
           'Sujet : ' + (lead.subject || lead.lead_type || '—') + '\n' +
           'Date : ' + fmtDate(lead.created_at) + '\n' +
           (message ? 'Message :\n' + message + '\n\n' : '\n') +
           '— À compléter après prise de contact —'
  };

  // Réutilise openMandatEditor mais avec un draft pré-rempli (on ne passe pas null pour avoir le titre "édition")
  // Fake: on injecte un objet temporaire pour que le titre soit "Nouveau mandat (depuis lead)"
  openMandatEditor(null);
  // Le draft initialisé par openMandatEditor a écrasé le nôtre, donc on remet :
  _MANDAT_DRAFT.lead_id = lead.id;
  _MANDAT_DRAFT.client_name = fullName;
  _MANDAT_DRAFT.client_email = lead.email || null;
  _MANDAT_DRAFT.client_phone = lead.phone || null;
  _MANDAT_DRAFT.transaction_type = txType;
  _MANDAT_DRAFT.features = propRef ? ['Bien initialement consulté : Apimo ' + propRef] : [];
  _MANDAT_DRAFT.notes = '— Lead d\'origine —\n' +
    'Sujet : ' + (lead.subject || lead.lead_type || '—') + '\n' +
    'Date : ' + fmtDate(lead.created_at) + '\n' +
    (message ? 'Message :\n' + message + '\n\n' : '\n') +
    '— À compléter après prise de contact —';

  // Re-render la modal avec le bon draft
  closeModal();
  setTimeout(() => {
    openModal('Nouveau mandat (depuis lead « ' + fullName + ' »)', renderMandatEditorBody(), { size: 'xl' });
  }, 50);
};

/* Helper extrait pour pouvoir re-render la modal mandat depuis le converter */
function renderMandatEditorBody() {
  const m = _MANDAT_DRAFT;
  const zonesStr = Array.isArray(m.zones) ? m.zones.join(', ') : '';
  const featuresStr = Array.isArray(m.features) ? m.features.join(', ') : '';

  return (
    '<div class="form">' +
      (m.lead_id ? '<div class="apimo-banner" style="margin-bottom:14px"><strong>🔗 Mandat issu d\'un lead</strong> — Le lien avec le lead d\'origine sera conservé. Pense à passer le lead en statut <em>Converti</em> ensuite.</div>' : '') +

      '<h3 class="form-section-title">Acheteur</h3>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label field-required">Nom complet</label>' +
          '<input type="text" id="md-name" value="' + esc(m.client_name || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Email</label>' +
          '<input type="email" id="md-email" value="' + esc(m.client_email || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="form-row cols-3">' +
        '<div class="field">' +
          '<label class="field-label">Téléphone</label>' +
          '<input type="tel" id="md-phone" value="' + esc(m.client_phone || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Ville</label>' +
          '<input type="text" id="md-city" value="' + esc(m.client_city || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Pays</label>' +
          '<input type="text" id="md-country" value="' + esc(m.client_country || '') + '">' +
        '</div>' +
      '</div>' +

      '<h3 class="form-section-title">Recherche</h3>' +
      '<div class="form-row cols-3">' +
        '<div class="field">' +
          '<label class="field-label">Type de bien</label>' +
          '<select id="md-proptype">' +
            ['','Appartement','Maison','Maison de maître','Penthouse','Villa','Duplex','Loft','Terrain','Local commercial','Bureau','Immeuble','Mixte'].map(t =>
              '<option value="' + esc(t) + '"' + (m.property_type === t ? ' selected' : '') + '>' + (t || '— Tous types —') + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Transaction</label>' +
          '<select id="md-tx">' +
            '<option value="sale"' + (m.transaction_type === 'sale' ? ' selected' : '') + '>Achat</option>' +
            '<option value="rent"' + (m.transaction_type === 'rent' ? ' selected' : '') + '>Location</option>' +
          '</select>' +
        '</div>' +
        '<div class="field" style="display:flex;align-items:flex-end">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
            '<input type="checkbox" id="md-offmarket"' + (m.offmarket_only ? ' checked' : '') + '>' +
            '<span><strong>Off-market uniquement</strong></span>' +
          '</label>' +
        '</div>' +
      '</div>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Budget minimum (€)</label>' +
          '<input type="number" id="md-bmin" value="' + (m.budget_min || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Budget maximum (€)</label>' +
          '<input type="number" id="md-bmax" value="' + (m.budget_max || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Surface min (m²)</label>' +
          '<input type="number" id="md-surf" value="' + (m.min_surface || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Chambres min</label>' +
          '<input type="number" id="md-beds" value="' + (m.min_bedrooms || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Zones recherchées (séparées par virgule)</label>' +
        '<input type="text" id="md-zones" value="' + esc(zonesStr) + '">' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Caractéristiques recherchées (séparées par virgule)</label>' +
        '<input type="text" id="md-features" value="' + esc(featuresStr) + '">' +
      '</div>' +

      '<h3 class="form-section-title">Gestion</h3>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Statut</label>' +
          '<select id="md-status">' +
            Object.keys(MANDAT_STATUSES).map(s => {
              const cfg = MANDAT_STATUSES[s];
              return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + cfg.icon + ' ' + cfg.label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Date de signature du mandat</label>' +
          '<input type="date" id="md-signed" value="' + esc((m.signed_at || '').slice(0,10)) + '">' +
        '</div>' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Notes internes</label>' +
        '<textarea id="md-notes" rows="6">' + esc(m.notes || '') + '</textarea>' +
      '</div>' +

      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-copper" onclick="saveMandat()">💾 Enregistrer</button>' +
      '</div>' +
    '</div>'
  );
}

window.openLeadStatusEditor = function (id) {
  const l = CACHE.leads.find(x => String(x.id) === String(id));
  if (!l) return;
  const html = (
    '<div class="form">' +
      '<div class="field">' +
        '<label class="field-label">Statut</label>' +
        '<select id="lead-status">' +
          Object.keys(LEAD_STATUSES).map(s => {
            const cfg = LEAD_STATUSES[s];
            return '<option value="' + s + '"' + ((l.status || 'new') === s ? ' selected' : '') + '>' +
              cfg.icon + ' ' + cfg.label + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Notes internes</label>' +
        '<textarea id="lead-notes" rows="6" placeholder="Date de rappel, action commerciale, RDV pris…">' + esc(l.notes || '') + '</textarea>' +
        '<span class="field-hint">Visible uniquement dans le back-office. Pas envoyé au client.</span>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-copper" onclick="saveLeadStatus(\'' + id + '\')">💾 Enregistrer</button>' +
      '</div>' +
    '</div>'
  );
  openModal('Lead — ' + ([l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || ''), html, { size: 'lg' });
};

window.saveLeadStatus = async function (id) {
  const status = $('lead-status').value;
  const notes = ($('lead-notes').value || '').trim();
  const payload = { status, notes };
  if (status === 'handled' || status === 'converted') {
    payload.handled_at = new Date().toISOString();
    payload.handled_by = (CURRENT_USER && CURRENT_USER.email) || 'admin';
  }
  try {
    await api('/rest/v1/leads?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
      headers: { 'Prefer': 'return=minimal' }
    });
    const l = CACHE.leads.find(x => String(x.id) === String(id));
    if (l) Object.assign(l, payload);
    toast('✓ Lead mis à jour', 'ok');
    closeModal();
    renderLeadsList();
    refreshDashboardBadges();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.quickHandleLead = async function (id) {
  try {
    const payload = {
      status: 'handled',
      handled_at: new Date().toISOString(),
      handled_by: (CURRENT_USER && CURRENT_USER.email) || 'admin'
    };
    await api('/rest/v1/leads?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
      headers: { 'Prefer': 'return=minimal' }
    });
    const l = CACHE.leads.find(x => String(x.id) === String(id));
    if (l) Object.assign(l, payload);
    toast('✓ Lead marqué comme traité', 'ok');
    renderLeadsList();
    refreshDashboardBadges();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.deleteLead = async function (id) {
  const l = CACHE.leads.find(x => String(x.id) === String(id));
  if (!l) return;
  const who = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'ce lead';
  if (!confirm('Supprimer définitivement le lead de "' + who + '" ?')) return;
  try {
    await api('/rest/v1/leads?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    CACHE.leads = CACHE.leads.filter(x => String(x.id) !== String(id));
    toast('✓ Lead supprimé', 'ok');
    renderLeadsList();
    refreshDashboardBadges();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

/* Helper appelé après modif d'un lead pour mettre à jour le badge "Leads (N)" en haut */
function refreshDashboardBadges() {
  const newCount = CACHE.leads.filter(l => (l.status || 'new') === 'new').length;
  const badge = document.querySelector('[data-tab="leads"] .tab-badge, [onclick*="leads"] .tab-badge');
  if (badge) {
    if (newCount > 0) {
      badge.textContent = newCount;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MODULE BLOG (Bloc 4) — CRUD complet
   Multilingue FR/EN/DE + upload covers + FAQ Schema.org
   ═══════════════════════════════════════════════════════════════════ */

const BLOG_AUTHOR_DEFAULT = 'Julien Brebion';
const BLOG_BUCKET = 'blog-covers';
const SOURCES_ALLOWED = 'STATEC, Observatoire de l\'Habitat, ABBL, BCE, BCL, LISER, AED, Ministère du Logement, CIGDL, Immotop.lu';
const SOURCES_FORBIDDEN = 'mortgage.lu, athome.lu';

async function loadBlog() {
  const list = $('blog-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';

  try {
    const posts = await api('/rest/v1/blog_posts?select=*&order=published_at.desc.nullslast,created_at.desc');
    CACHE.blog_posts = posts || [];
    renderBlogList();
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderBlogList() {
  const list = $('blog-list');
  if (!list) return;
  list.className = '';  /* annule blog-list flex hérité */

  if (!CACHE.blog_posts.length) {
    list.innerHTML = '<div class="empty">Aucun article. Clique "+ Nouvel article" pour démarrer.</div>';
    return;
  }

  const cards = CACHE.blog_posts.map(p => {
    const cover = p.cover_image || '';
    const title = p.title_fr || p.title || '(sans titre)';
    const excerpt = p.excerpt_fr || p.excerpt || '';
    const date = p.published_at || p.created_at;
    const status = p.is_published ? 'published' : 'draft';
    const statusLabel = p.is_published ? 'Publié' : 'Brouillon';
    const tag = p.primary_tag_fr || p.primary_tag || '';

    return (
      '<article class="blog-row">' +
        '<div class="blog-cover"' + (cover ? ' style="background-image:url(\'' + esc(cover) + '\')"' : '') + '>' +
          '<span class="blog-status ' + status + '">' + statusLabel + '</span>' +
        '</div>' +
        '<div class="blog-body">' +
          (tag ? '<div class="prop-card-ref">' + esc(tag) + '</div>' : '') +
          '<h3 class="blog-title">' + esc(title) + '</h3>' +
          '<p class="blog-excerpt">' + esc(excerpt) + '</p>' +
          '<div class="blog-meta">' +
            '<span>📅 ' + esc(fmtDate(date)) + '</span>' +
            '<span>🔗 ' + esc(p.slug || '—') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="blog-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="editBlogPost(\'' + p.id + '\')">✎ Éditer</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="duplicateBlogPost(\'' + p.id + '\')" title="Dupliquer">⎘</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="toggleBlogPublished(\'' + p.id + '\',' + (!p.is_published) + ')" title="' +
            (p.is_published ? 'Dépublier' : 'Publier') + '">' +
            (p.is_published ? '◯ Dépublier' : '✓ Publier') +
          '</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteBlogPost(\'' + p.id + '\')" title="Supprimer">✕</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');

  list.innerHTML = '<div class="blog-list">' + cards + '</div>';
}

window.newBlogPost = function () {
  openBlogEditor(null);
};

window.editBlogPost = function (id) {
  const post = CACHE.blog_posts.find(p => String(p.id) === String(id));
  if (!post) return toast('Article introuvable', 'err');
  openBlogEditor(post);
};

window.duplicateBlogPost = async function (id) {
  const orig = CACHE.blog_posts.find(p => String(p.id) === String(id));
  if (!orig) return;
  const copy = Object.assign({}, orig);
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  copy.slug = (orig.slug || 'article') + '-copie';
  copy.title_fr = (orig.title_fr || '') + ' (copie)';
  copy.is_published = false;
  copy.published_at = null;
  try {
    const created = await api('/rest/v1/blog_posts', {
      method: 'POST',
      body: copy,
      headers: { 'Prefer': 'return=representation' }
    });
    if (Array.isArray(created) && created.length) CACHE.blog_posts.unshift(created[0]);
    toast('✓ Article dupliqué (brouillon)', 'ok');
    renderBlogList();
  } catch (err) {
    toast('Erreur duplication : ' + err.message, 'err');
  }
};

window.toggleBlogPublished = async function (id, publish) {
  try {
    const body = { is_published: publish };
    if (publish) body.published_at = new Date().toISOString();
    await api('/rest/v1/blog_posts?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: body,
      headers: { 'Prefer': 'return=minimal' }
    });
    const p = CACHE.blog_posts.find(x => String(x.id) === String(id));
    if (p) {
      p.is_published = publish;
      if (publish) p.published_at = body.published_at;
    }
    toast(publish ? '✓ Article publié' : '◯ Article dépublié', 'ok');
    renderBlogList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.deleteBlogPost = async function (id) {
  const p = CACHE.blog_posts.find(x => String(x.id) === String(id));
  if (!p) return;
  if (!confirm('Supprimer définitivement l\'article "' + (p.title_fr || 'sans titre') + '" ?\n\nCette action est irréversible.')) return;
  try {
    await api('/rest/v1/blog_posts?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    CACHE.blog_posts = CACHE.blog_posts.filter(x => String(x.id) !== String(id));
    toast('✓ Article supprimé', 'ok');
    renderBlogList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

/* ═══ ÉDITEUR ARTICLE ═══ */
let _BLOG_DRAFT = null;        // copie du post en cours d'édition
let _BLOG_LANG = 'fr';

function openBlogEditor(post) {
  // Mapping colonnes DB → draft uniforme (FR n'a pas de suffixe en DB pour meta/primary_tag)
  const baseDraft = {
    title_fr: '', title_en: '', title_de: '',
    excerpt_fr: '', excerpt_en: '', excerpt_de: '',
    content_fr: '', content_en: '', content_de: '',
    primary_tag_fr: '', primary_tag_en: '', primary_tag_de: '',
    meta_title_fr: '', meta_title_en: '', meta_title_de: '',
    meta_description_fr: '', meta_description_en: '', meta_description_de: '',
    cover_image: '',
    slug: '',
    author: BLOG_AUTHOR_DEFAULT,
    tags: [],
    faq_fr: [], faq_en: [], faq_de: [],
    is_published: false,
    published_at: null
  };

  if (post) {
    _BLOG_DRAFT = Object.assign({}, baseDraft, post);
    // Map les colonnes DB sans suffixe vers les keys _fr du draft
    _BLOG_DRAFT.primary_tag_fr = post.primary_tag || _BLOG_DRAFT.primary_tag_fr || '';
    _BLOG_DRAFT.meta_title_fr = post.meta_title || _BLOG_DRAFT.meta_title_fr || '';
    _BLOG_DRAFT.meta_description_fr = post.meta_description || _BLOG_DRAFT.meta_description_fr || '';
  } else {
    _BLOG_DRAFT = baseDraft;
  }
  _BLOG_LANG = 'fr';

  openModal(post ? 'Éditer l\'article' : 'Nouvel article', renderBlogEditor(), { size: 'xl' });
  setTimeout(() => { wireBlogEditor(); }, 50);
}

function renderBlogEditor() {
  const d = _BLOG_DRAFT;
  return (
    '<div class="form blog-editor">' +
      // Cover
      '<div class="field">' +
        '<label class="field-label field-required">Image de couverture</label>' +
        '<div class="cover-uploader' + (d.cover_image ? ' has-image' : '') + '" id="blog-cover-zone" onclick="document.getElementById(\'blog-cover-input\').click()">' +
          (d.cover_image
            ? '<div class="cover-preview" style="background-image:url(\'' + esc(d.cover_image) + '\')">' +
                '<span class="cover-replace">↻ Remplacer</span>' +
              '</div>'
            : '<div style="font-size:32px;opacity:.4">📷</div>' +
              '<div style="margin-top:8px;font-size:13px">Cliquer pour uploader (JPG/PNG, ≤5 Mo)</div>') +
        '</div>' +
        '<input type="file" id="blog-cover-input" accept="image/*" style="display:none">' +
      '</div>' +

      // Slug + author
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label field-required">Slug (URL)</label>' +
          '<input type="text" id="blog-slug" value="' + esc(d.slug || '') + '" placeholder="auto-généré depuis le titre FR">' +
          '<span class="field-hint">URL : /blog/' + esc(d.slug || '…') + '</span>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Auteur</label>' +
          '<input type="text" id="blog-author" value="' + esc(d.author || BLOG_AUTHOR_DEFAULT) + '">' +
        '</div>' +
      '</div>' +

      // Tags langue
      '<div class="lang-tabs">' +
        '<button class="lang-tab active" data-lang="fr" onclick="switchBlogLang(\'fr\')">FR (requis)</button>' +
        '<button class="lang-tab" data-lang="en" onclick="switchBlogLang(\'en\')">EN</button>' +
        '<button class="lang-tab" data-lang="de" onclick="switchBlogLang(\'de\')">DE</button>' +
      '</div>' +

      ['fr','en','de'].map(L => renderBlogLangPane(L)).join('') +

      // SOURCES rappel
      '<div class="apimo-banner" style="margin-top:18px">' +
        '<strong>Sources éditoriales</strong><br>' +
        '✅ <em>' + SOURCES_ALLOWED + '</em><br>' +
        '❌ Ne JAMAIS citer : <em>' + SOURCES_FORBIDDEN + '</em>' +
      '</div>' +

      // Footer (publier / save)
      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-secondary" onclick="saveBlogPost(false)">💾 Enregistrer brouillon</button>' +
        '<button class="btn btn-copper" onclick="saveBlogPost(true)">✓ Publier</button>' +
      '</div>' +
    '</div>'
  );
}

function renderBlogLangPane(L) {
  const d = _BLOG_DRAFT;
  const isFr = L === 'fr';
  const required = isFr ? ' field-required' : '';
  const faqs = Array.isArray(d['faq_' + L]) ? d['faq_' + L] : [];

  return (
    '<div class="lang-pane' + (L === 'fr' ? ' active' : '') + '" data-lang="' + L + '">' +
      '<div class="field">' +
        '<label class="field-label' + required + '">Titre ' + L.toUpperCase() + '</label>' +
        '<input type="text" id="blog-title-' + L + '" value="' + esc(d['title_' + L] || '') + '"' +
          (isFr ? ' oninput="autoSlug(this.value)"' : '') + '>' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label">Tag principal ' + L.toUpperCase() + '</label>' +
        '<input type="text" id="blog-tag-' + L + '" value="' + esc(d['primary_tag_' + L] || '') + '" placeholder="ex: Marché, Off-Market, Investissement">' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label">Extrait ' + L.toUpperCase() + ' (sous-titre court, ≤300 car.)</label>' +
        '<textarea id="blog-excerpt-' + L + '" rows="2" maxlength="300">' + esc(d['excerpt_' + L] || '') + '</textarea>' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label' + required + '">Contenu ' + L.toUpperCase() + ' (HTML supporté)</label>' +
        '<textarea id="blog-content-' + L + '" rows="14" style="font-family:monospace;font-size:12px">' + esc(d['content_' + L] || '') + '</textarea>' +
        '<span class="field-hint">Balises autorisées : &lt;h2&gt; &lt;h3&gt; &lt;p&gt; &lt;strong&gt; &lt;em&gt; &lt;ul&gt;&lt;li&gt; &lt;a href&gt; &lt;blockquote&gt; &lt;table&gt;</span>' +
      '</div>' +

      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Meta title ' + L.toUpperCase() + ' (SEO, ≤60 car.)</label>' +
          '<input type="text" id="blog-meta-title-' + L + '" value="' + esc(d['meta_title_' + L] || '') + '" maxlength="80">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Meta description ' + L.toUpperCase() + ' (≤155 car.)</label>' +
          '<input type="text" id="blog-meta-desc-' + L + '" value="' + esc(d['meta_description_' + L] || '') + '" maxlength="200">' +
        '</div>' +
      '</div>' +

      // FAQ Schema.org
      '<div class="field">' +
        '<label class="field-label">FAQ ' + L.toUpperCase() + ' (Schema.org pour SEO)</label>' +
        '<div id="blog-faq-' + L + '" class="faq-list">' +
          faqs.map((qa, i) => renderFaqItem(L, i, qa)).join('') +
        '</div>' +
        '<button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="addFaq(\'' + L + '\')">+ Ajouter une question</button>' +
      '</div>' +
    '</div>'
  );
}

function renderFaqItem(L, idx, qa) {
  return (
    '<div class="faq-item" data-idx="' + idx + '">' +
      '<input type="text" class="faq-q" placeholder="Question" value="' + esc(qa.q || '') + '">' +
      '<textarea class="faq-a" rows="2" placeholder="Réponse">' + esc(qa.a || '') + '</textarea>' +
      '<button type="button" class="btn btn-ghost btn-xs" onclick="removeFaq(\'' + L + '\',' + idx + ')" title="Supprimer">✕</button>' +
    '</div>'
  );
}

window.addFaq = function (L) {
  if (!Array.isArray(_BLOG_DRAFT['faq_' + L])) _BLOG_DRAFT['faq_' + L] = [];
  // D'abord on capture les valeurs déjà saisies
  syncFaqFromDOM(L);
  _BLOG_DRAFT['faq_' + L].push({ q: '', a: '' });
  refreshFaqUI(L);
};

window.removeFaq = function (L, idx) {
  syncFaqFromDOM(L);
  _BLOG_DRAFT['faq_' + L].splice(idx, 1);
  refreshFaqUI(L);
};

function syncFaqFromDOM(L) {
  const container = document.getElementById('blog-faq-' + L);
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.faq-item'));
  _BLOG_DRAFT['faq_' + L] = items.map(it => ({
    q: it.querySelector('.faq-q').value.trim(),
    a: it.querySelector('.faq-a').value.trim()
  }));
}

function refreshFaqUI(L) {
  const container = document.getElementById('blog-faq-' + L);
  if (!container) return;
  const faqs = _BLOG_DRAFT['faq_' + L] || [];
  container.innerHTML = faqs.map((qa, i) => renderFaqItem(L, i, qa)).join('');
}

window.switchBlogLang = function (L) {
  // Sync les FAQ avant de switcher
  syncFaqFromDOM(_BLOG_LANG);
  _BLOG_LANG = L;
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.toggle('active', t.dataset.lang === L));
  document.querySelectorAll('.lang-pane').forEach(p => p.classList.toggle('active', p.dataset.lang === L));
};

window.autoSlug = function (titleFr) {
  const slugInput = $('blog-slug');
  if (!slugInput) return;
  // N'override que si l'utilisateur n'a rien tapé (ou si déjà auto)
  if (!slugInput.dataset.touched) {
    slugInput.value = slugify(titleFr);
  }
};

function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function wireBlogEditor() {
  // Marque slug comme "touched" si l'utilisateur le modifie
  const slug = $('blog-slug');
  if (slug) slug.addEventListener('input', () => { slug.dataset.touched = '1'; });

  // Upload cover
  const input = $('blog-cover-input');
  if (input) input.addEventListener('change', handleCoverUpload);
}

async function handleCoverUpload(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;

  if (!/^image\//.test(file.type)) {
    toast('Seules les images sont acceptées', 'err');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast('Image trop lourde (>5 Mo)', 'err');
    return;
  }

  const zone = $('blog-cover-zone');
  zone.innerHTML = '<div style="padding:24px"><span class="loader"></span> Upload en cours…</div>';

  try {
    // Refresh le token auth si besoin avant de toucher au Storage
    const tokenOk = await authEnsureFreshToken();
    if (!tokenOk) {
      throw new Error('Session expirée. Recharge la page et reconnecte-toi.');
    }

    // Nom unique : <slug>-<timestamp>.<ext>
    const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1] || 'jpg';
    const slug = ($('blog-slug').value || 'article').trim() || 'article';
    const filename = slug + '-' + Date.now() + '.' + ext.toLowerCase();

    const url = SUPA + '/storage/v1/object/' + BLOG_BUCKET + '/' + encodeURIComponent(filename);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + (ACCESS_TOKEN || SUPA_ANON),
        'Content-Type': file.type
        /* x-upsert retiré : nos noms de fichiers ont un timestamp unique → INSERT pur,
           ça évite de devoir avoir une policy SELECT côté authenticated */
      },
      body: file
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Upload Storage : ' + err);
    }
    const publicUrl = SUPA + '/storage/v1/object/public/' + BLOG_BUCKET + '/' + encodeURIComponent(filename);
    _BLOG_DRAFT.cover_image = publicUrl;

    zone.classList.add('has-image');
    zone.innerHTML = '<div class="cover-preview" style="background-image:url(\'' + esc(publicUrl) + '\')">' +
      '<span class="cover-replace">↻ Remplacer</span></div>';
    toast('✓ Cover uploadée', 'ok');
  } catch (err) {
    toast('Erreur upload : ' + err.message, 'err', 6000);
    // Restaure UI
    zone.classList.remove('has-image');
    zone.innerHTML = '<div style="font-size:32px;opacity:.4">📷</div>' +
      '<div style="margin-top:8px;font-size:13px">Cliquer pour uploader (JPG/PNG, ≤5 Mo)</div>';
  }
}

window.saveBlogPost = async function (publish) {
  // Sync FAQs de la langue active
  syncFaqFromDOM(_BLOG_LANG);

  const d = _BLOG_DRAFT;

  // Lire les champs
  ['fr','en','de'].forEach(L => {
    d['title_' + L] = ($('blog-title-' + L).value || '').trim();
    d['primary_tag_' + L] = ($('blog-tag-' + L).value || '').trim();
    d['excerpt_' + L] = ($('blog-excerpt-' + L).value || '').trim();
    d['content_' + L] = ($('blog-content-' + L).value || '').trim();
    d['meta_title_' + L] = ($('blog-meta-title-' + L).value || '').trim();
    d['meta_description_' + L] = ($('blog-meta-desc-' + L).value || '').trim();
  });
  d.slug = ($('blog-slug').value || '').trim() || slugify(d.title_fr);
  d.author = ($('blog-author').value || '').trim() || BLOG_AUTHOR_DEFAULT;

  // Validation minimale
  if (!d.title_fr) { toast('Le titre FR est obligatoire', 'err'); switchBlogLang('fr'); return; }
  if (!d.content_fr) { toast('Le contenu FR est obligatoire', 'err'); switchBlogLang('fr'); return; }
  if (!d.slug) { toast('Le slug est obligatoire', 'err'); return; }
  if (!d.cover_image) { toast('Une image de couverture est obligatoire', 'err'); return; }

  // Marquer publication
  if (publish) {
    d.is_published = true;
    if (!d.published_at) d.published_at = new Date().toISOString();
  } else {
    d.is_published = false;
  }

  // Sanitize tags
  if (!Array.isArray(d.tags)) d.tags = [];
  ['fr','en','de'].forEach(L => {
    if (!Array.isArray(d['faq_' + L])) d['faq_' + L] = [];
    // Filtre les FAQ vides
    d['faq_' + L] = d['faq_' + L].filter(qa => qa.q || qa.a);
  });

  // Champ "title" / "excerpt" / "content" / "primary_tag" / "meta_*" (sans suffixe lang) = colonnes DB pour FR
  d.title = d.title_fr;
  d.excerpt = d.excerpt_fr;
  d.content = d.content_fr;
  d.primary_tag = d.primary_tag_fr;
  d.meta_title = d.meta_title_fr;
  d.meta_description = d.meta_description_fr;

  // Préparer le payload — IMPORTANT : la DB a primary_tag/meta_title/meta_description sans suffixe pour FR
  // (PAS de primary_tag_fr / meta_title_fr / meta_description_fr en colonnes)
  const payload = {};
  ['title','excerpt','content','primary_tag','meta_title','meta_description',
   'title_fr','title_en','title_de',
   'excerpt_fr','excerpt_en','excerpt_de',
   'content_fr','content_en','content_de',
   'primary_tag_en','primary_tag_de',
   'meta_title_en','meta_title_de',
   'meta_description_en','meta_description_de',
   'cover_image','slug','author','tags',
   'faq_fr','faq_en','faq_de',
   'is_published','published_at'
  ].forEach(k => { if (d[k] !== undefined) payload[k] = d[k]; });

  try {
    let saved;
    if (d.id) {
      // UPDATE
      const arr = await api('/rest/v1/blog_posts?id=eq.' + encodeURIComponent(d.id), {
        method: 'PATCH',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      const idx = CACHE.blog_posts.findIndex(p => String(p.id) === String(d.id));
      if (idx >= 0 && saved) CACHE.blog_posts[idx] = saved;
    } else {
      // INSERT
      const arr = await api('/rest/v1/blog_posts', {
        method: 'POST',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      if (saved) CACHE.blog_posts.unshift(saved);
    }

    toast(publish ? '✓ Article publié' : '✓ Brouillon enregistré', 'ok');
    closeModal();
    renderBlogList();
  } catch (err) {
    // Slug duplicate ?
    if (err.message && err.message.toLowerCase().indexOf('duplicate') > -1) {
      toast('Ce slug existe déjà. Choisis un autre.', 'err', 5000);
    } else {
      toast('Erreur : ' + err.message, 'err', 5000);
    }
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MODULE MANDATS RECHERCHE (Bloc 6)
   Apimo gère mandats VENTE / Supabase gère mandats RECHERCHE acheteurs
   ═══════════════════════════════════════════════════════════════════ */
const MANDAT_STATUSES = {
  'active':      { label: 'Actif',      color: '#3a7a4a', icon: '🟢' },
  'in_progress': { label: 'En cours',   color: '#b89448', icon: '🟡' },
  'found':       { label: 'Trouvé',     color: '#1a2b44', icon: '⭐' },
  'abandoned':   { label: 'Abandonné',  color: '#888',    icon: '⚫' }
};

let _MANDATS_FILTER = 'all';
let _MANDAT_DRAFT = null;

async function loadMandats() {
  const list = $('mandats-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';

  try {
    const mandats = await api('/rest/v1/mandats_recherche?select=*&order=created_at.desc');
    CACHE.mandats = mandats || [];
    renderMandatsList();
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderMandatsList() {
  const list = $('mandats-list');
  if (!list) return;
  list.className = '';

  const banner = '<div class="apimo-banner" style="margin-bottom:14px">' +
    '<strong>📝 Mandats de RECHERCHE</strong> — Acheteurs qui te confient une mission de sourcing. ' +
    'Apimo gère les mandats <em>VENTE</em> côté vendeurs ; ces mandats <em>RECHERCHE</em> sont propres à MAPA.' +
    '</div>';

  const counts = { all: CACHE.mandats.length };
  Object.keys(MANDAT_STATUSES).forEach(s => {
    counts[s] = CACHE.mandats.filter(m => (m.status || 'active') === s).length;
  });

  const filterPills = '<div class="counter-pills" style="margin-bottom:18px">' +
    '<button class="pill clickable' + (_MANDATS_FILTER === 'all' ? ' active' : '') + '" onclick="setMandatsFilter(\'all\')">' +
      'Tous (' + counts.all + ')</button>' +
    Object.keys(MANDAT_STATUSES).map(s => {
      const cfg = MANDAT_STATUSES[s];
      return '<button class="pill clickable' + (_MANDATS_FILTER === s ? ' active' : '') + '" onclick="setMandatsFilter(\'' + s + '\')">' +
        cfg.icon + ' ' + cfg.label + ' (' + counts[s] + ')</button>';
    }).join('') +
    '</div>';

  const visible = _MANDATS_FILTER === 'all'
    ? CACHE.mandats
    : CACHE.mandats.filter(m => (m.status || 'active') === _MANDATS_FILTER);

  if (!visible.length) {
    list.innerHTML = banner + filterPills + '<div class="empty">Aucun mandat' +
      (_MANDATS_FILTER !== 'all' ? ' avec ce statut' : '') + '. Clique "+ Nouveau mandat" pour démarrer.</div>';
    return;
  }

  const cards = visible.map(m => {
    const status = m.status || 'active';
    const cfg = MANDAT_STATUSES[status] || MANDAT_STATUSES.active;
    const budget = (m.budget_min || m.budget_max)
      ? (m.budget_min ? Number(m.budget_min).toLocaleString('fr-FR') + ' €' : '—') +
        ' → ' +
        (m.budget_max ? Number(m.budget_max).toLocaleString('fr-FR') + ' €' : '—')
      : 'Budget non défini';
    const zones = Array.isArray(m.zones) && m.zones.length ? m.zones.join(', ') : '—';
    const features = Array.isArray(m.features) && m.features.length ? m.features.join(', ') : '';
    const tx = (m.transaction_type || 'sale').toLowerCase();
    const txLabel = (tx === 'rent' || tx === 'location') ? 'Location' : 'Achat';
    const propType = m.property_type || 'Tous types';

    return (
      '<article class="lead-card mandat-card">' +
        '<div class="lead-card-hd">' +
          '<div>' +
            '<span class="lead-status" style="background:' + cfg.color + '">' + cfg.icon + ' ' + cfg.label + '</span>' +
            '<span class="lead-subject">' + esc(txLabel) + ' · ' + esc(propType) + '</span>' +
            (m.offmarket_only ? '<span class="ref" style="margin-left:8px;background:var(--copper-tint);color:var(--copper)">OFF-MARKET</span>' : '') +
            (m.lead_id ? '<span class="ref" style="margin-left:8px;background:#e8f0fb;color:#1a2b44">🔗 ISSU D\'UN LEAD</span>' : '') +
          '</div>' +
          '<span class="lead-date">' + esc(fmtRelative(m.created_at)) + '</span>' +
        '</div>' +
        '<h3 class="lead-name">' + esc(m.client_name) + '</h3>' +
        '<div class="lead-contacts">' +
          (m.client_email ? '<a href="mailto:' + esc(m.client_email) + '" class="lead-link">📧 ' + esc(m.client_email) + '</a>' : '') +
          (m.client_phone ? '<a href="tel:' + esc(m.client_phone.replace(/\s+/g, '')) + '" class="lead-link">📱 ' + esc(m.client_phone) + '</a>' : '') +
          ([m.client_city, m.client_country].filter(Boolean).join(', ') ? '<span class="ref">📍 ' + esc([m.client_city, m.client_country].filter(Boolean).join(', ')) + '</span>' : '') +
        '</div>' +
        '<div class="mandat-criteria">' +
          '<div class="mc-row"><span class="mc-label">💶 Budget</span><span>' + esc(budget) + '</span></div>' +
          '<div class="mc-row"><span class="mc-label">📍 Zones</span><span>' + esc(zones) + '</span></div>' +
          '<div class="mc-row"><span class="mc-label">📐 Critères</span><span>' +
            (m.min_surface ? '≥ ' + m.min_surface + ' m²' : '—') + ' · ' +
            (m.min_bedrooms ? '≥ ' + m.min_bedrooms + ' ch.' : '—') +
          '</span></div>' +
          (features ? '<div class="mc-row"><span class="mc-label">✨ Features</span><span>' + esc(features) + '</span></div>' : '') +
          (m.signed_at ? '<div class="mc-row"><span class="mc-label">📅 Signé le</span><span>' + esc(fmtDate(m.signed_at)) + '</span></div>' : '') +
        '</div>' +
        (m.notes ? '<div class="lead-notes"><strong>📝 Notes :</strong> ' + esc(m.notes) + '</div>' : '') +
        '<div class="blog-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="editMandat(\'' + m.id + '\')">✎ Éditer</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="changeMandatStatus(\'' + m.id + '\')">⚙️ Statut</button>' +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteMandat(\'' + m.id + '\')" title="Supprimer">✕</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');

  list.innerHTML = banner + filterPills + '<div class="leads-list">' + cards + '</div>';
}

window.setMandatsFilter = function (f) {
  _MANDATS_FILTER = f;
  renderMandatsList();
};

window.newMandat = function () { openMandatEditor(null); };
window.editMandat = function (id) {
  const m = CACHE.mandats.find(x => String(x.id) === String(id));
  if (!m) return toast('Mandat introuvable', 'err');
  openMandatEditor(m);
};

function openMandatEditor(mandat) {
  _MANDAT_DRAFT = mandat ? Object.assign({}, mandat) : {
    client_name: '', client_email: '', client_phone: '',
    client_city: '', client_country: 'Luxembourg',
    property_type: '', transaction_type: 'sale',
    budget_min: null, budget_max: null,
    zones: [], min_bedrooms: null, min_surface: null,
    features: [],
    status: 'active', offmarket_only: false,
    signed_at: null, notes: ''
  };

  const m = _MANDAT_DRAFT;
  const zonesStr = Array.isArray(m.zones) ? m.zones.join(', ') : '';
  const featuresStr = Array.isArray(m.features) ? m.features.join(', ') : '';

  const html = (
    '<div class="form">' +

      // CLIENT
      '<h3 class="form-section-title">Acheteur</h3>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label field-required">Nom complet</label>' +
          '<input type="text" id="md-name" value="' + esc(m.client_name || '') + '" placeholder="ex: Famille Dubois">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Email</label>' +
          '<input type="email" id="md-email" value="' + esc(m.client_email || '') + '">' +
        '</div>' +
      '</div>' +
      '<div class="form-row cols-3">' +
        '<div class="field">' +
          '<label class="field-label">Téléphone</label>' +
          '<input type="tel" id="md-phone" value="' + esc(m.client_phone || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Ville</label>' +
          '<input type="text" id="md-city" value="' + esc(m.client_city || '') + '" placeholder="ex: Paris, Genève">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Pays</label>' +
          '<input type="text" id="md-country" value="' + esc(m.client_country || '') + '">' +
        '</div>' +
      '</div>' +

      // RECHERCHE
      '<h3 class="form-section-title">Recherche</h3>' +
      '<div class="form-row cols-3">' +
        '<div class="field">' +
          '<label class="field-label">Type de bien</label>' +
          '<select id="md-proptype">' +
            ['','Appartement','Maison','Maison de maître','Penthouse','Villa','Duplex','Loft','Terrain','Local commercial','Bureau','Immeuble','Mixte'].map(t =>
              '<option value="' + esc(t) + '"' + (m.property_type === t ? ' selected' : '') + '>' + (t || '— Tous types —') + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Transaction</label>' +
          '<select id="md-tx">' +
            '<option value="sale"' + (m.transaction_type === 'sale' ? ' selected' : '') + '>Achat</option>' +
            '<option value="rent"' + (m.transaction_type === 'rent' ? ' selected' : '') + '>Location</option>' +
          '</select>' +
        '</div>' +
        '<div class="field" style="display:flex;align-items:flex-end">' +
          '<label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
            '<input type="checkbox" id="md-offmarket"' + (m.offmarket_only ? ' checked' : '') + '>' +
            '<span><strong>Off-market uniquement</strong></span>' +
          '</label>' +
        '</div>' +
      '</div>' +

      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Budget minimum (€)</label>' +
          '<input type="number" id="md-bmin" value="' + (m.budget_min || '') + '" placeholder="ex: 800000">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Budget maximum (€)</label>' +
          '<input type="number" id="md-bmax" value="' + (m.budget_max || '') + '" placeholder="ex: 2500000">' +
        '</div>' +
      '</div>' +

      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Surface min (m²)</label>' +
          '<input type="number" id="md-surf" value="' + (m.min_surface || '') + '">' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Chambres min</label>' +
          '<input type="number" id="md-beds" value="' + (m.min_bedrooms || '') + '">' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label">Zones recherchées (séparées par virgule)</label>' +
        '<input type="text" id="md-zones" value="' + esc(zonesStr) + '" placeholder="ex: Belair, Limpertsberg, Strassen, Steinfort">' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label">Caractéristiques recherchées (séparées par virgule)</label>' +
        '<input type="text" id="md-features" value="' + esc(featuresStr) + '" placeholder="ex: Jardin, Terrasse, Garage 2 voitures, Vue dégagée, Calme, Classe énergétique A ou B">' +
      '</div>' +

      // STATUT + GESTION
      '<h3 class="form-section-title">Gestion</h3>' +
      '<div class="form-row cols-2">' +
        '<div class="field">' +
          '<label class="field-label">Statut</label>' +
          '<select id="md-status">' +
            Object.keys(MANDAT_STATUSES).map(s => {
              const cfg = MANDAT_STATUSES[s];
              return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' +
                cfg.icon + ' ' + cfg.label + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label class="field-label">Date de signature du mandat</label>' +
          '<input type="date" id="md-signed" value="' + esc((m.signed_at || '').slice(0,10)) + '">' +
        '</div>' +
      '</div>' +

      '<div class="field">' +
        '<label class="field-label">Notes internes</label>' +
        '<textarea id="md-notes" rows="4" placeholder="Stratégie de recherche, contacts à faire, urgence, etc.">' + esc(m.notes || '') + '</textarea>' +
        '<span class="field-hint">Visibles uniquement dans le back-office.</span>' +
      '</div>' +

      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-copper" onclick="saveMandat()">💾 Enregistrer</button>' +
      '</div>' +
    '</div>'
  );

  openModal(mandat ? 'Éditer le mandat — ' + (mandat.client_name || '') : 'Nouveau mandat de recherche', html, { size: 'xl' });
}

function parseCSV(s) {
  return (s || '').split(',').map(x => x.trim()).filter(Boolean);
}

window.saveMandat = async function () {
  const d = _MANDAT_DRAFT;
  const payload = {
    client_name: ($('md-name').value || '').trim(),
    client_email: ($('md-email').value || '').trim() || null,
    client_phone: ($('md-phone').value || '').trim() || null,
    client_city: ($('md-city').value || '').trim() || null,
    client_country: ($('md-country').value || '').trim() || null,
    property_type: $('md-proptype').value || null,
    transaction_type: $('md-tx').value,
    budget_min: $('md-bmin').value ? parseFloat($('md-bmin').value) : null,
    budget_max: $('md-bmax').value ? parseFloat($('md-bmax').value) : null,
    min_surface: $('md-surf').value ? parseFloat($('md-surf').value) : null,
    min_bedrooms: $('md-beds').value ? parseInt($('md-beds').value, 10) : null,
    zones: parseCSV($('md-zones').value),
    features: parseCSV($('md-features').value),
    status: $('md-status').value || 'active',
    offmarket_only: !!$('md-offmarket').checked,
    signed_at: $('md-signed').value || null,
    notes: ($('md-notes').value || '').trim() || null,
    lead_id: d.lead_id || null
  };

  if (!payload.client_name) return toast('Le nom du client est obligatoire', 'err');

  try {
    let saved;
    if (d.id) {
      const arr = await api('/rest/v1/mandats_recherche?id=eq.' + encodeURIComponent(d.id), {
        method: 'PATCH',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      const idx = CACHE.mandats.findIndex(x => String(x.id) === String(d.id));
      if (idx >= 0 && saved) CACHE.mandats[idx] = saved;
    } else {
      const arr = await api('/rest/v1/mandats_recherche', {
        method: 'POST',
        body: payload,
        headers: { 'Prefer': 'return=representation' }
      });
      saved = Array.isArray(arr) ? arr[0] : arr;
      if (saved) CACHE.mandats.unshift(saved);

      // Si conversion depuis un lead : on passe le lead en "converted"
      if (payload.lead_id) {
        try {
          await api('/rest/v1/leads?id=eq.' + encodeURIComponent(payload.lead_id), {
            method: 'PATCH',
            body: {
              status: 'converted',
              handled_at: new Date().toISOString(),
              handled_by: (CURRENT_USER && CURRENT_USER.email) || 'admin'
            },
            headers: { 'Prefer': 'return=minimal' }
          });
          const l = CACHE.leads.find(x => String(x.id) === String(payload.lead_id));
          if (l) {
            l.status = 'converted';
            l.handled_at = new Date().toISOString();
          }
        } catch (e) {
          console.warn('[MAPA] Lead status update failed:', e);
        }
      }
    }
    toast(payload.lead_id && !d.id ? '✓ Mandat créé et lead converti' : '✓ Mandat enregistré', 'ok');
    closeModal();
    renderMandatsList();
    refreshDashboardBadges();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err', 6000);
  }
};

window.changeMandatStatus = function (id) {
  const m = CACHE.mandats.find(x => String(x.id) === String(id));
  if (!m) return;
  const html = (
    '<div class="form">' +
      '<div class="field">' +
        '<label class="field-label">Statut du mandat</label>' +
        '<select id="ms-status">' +
          Object.keys(MANDAT_STATUSES).map(s => {
            const cfg = MANDAT_STATUSES[s];
            return '<option value="' + s + '"' + (m.status === s ? ' selected' : '') + '>' + cfg.icon + ' ' + cfg.label + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Notes</label>' +
        '<textarea id="ms-notes" rows="5">' + esc(m.notes || '') + '</textarea>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-copper" onclick="saveMandatStatus(\'' + id + '\')">💾 Enregistrer</button>' +
      '</div>' +
    '</div>'
  );
  openModal('Mandat — ' + (m.client_name || ''), html, { size: 'lg' });
};

window.saveMandatStatus = async function (id) {
  const payload = {
    status: $('ms-status').value,
    notes: ($('ms-notes').value || '').trim() || null
  };
  try {
    await api('/rest/v1/mandats_recherche?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
      headers: { 'Prefer': 'return=minimal' }
    });
    const m = CACHE.mandats.find(x => String(x.id) === String(id));
    if (m) Object.assign(m, payload);
    toast('✓ Mandat mis à jour', 'ok');
    closeModal();
    renderMandatsList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.deleteMandat = async function (id) {
  const m = CACHE.mandats.find(x => String(x.id) === String(id));
  if (!m) return;
  if (!confirm('Supprimer définitivement le mandat de "' + (m.client_name || 'inconnu') + '" ?')) return;
  try {
    await api('/rest/v1/mandats_recherche?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    CACHE.mandats = CACHE.mandats.filter(x => String(x.id) !== String(id));
    toast('✓ Mandat supprimé', 'ok');
    renderMandatsList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   MODULE ARCOVA WAITLIST (Bloc 6)
   Inscriptions à la waitlist, lecture + workflow contact
   ═══════════════════════════════════════════════════════════════════ */
const ARCOVA_STATUSES = {
  'subscribed':   { label: 'Inscrit',     color: '#3a7a4a', icon: '🟢' },
  'contacted':    { label: 'Contacté',    color: '#b89448', icon: '🟡' },
  'converted':    { label: 'Converti',    color: '#1a2b44', icon: '⭐' },
  'unsubscribed': { label: 'Désabonné',   color: '#888',    icon: '⚫' }
};

let _ARCOVA_FILTER = 'all';

async function loadArcova() {
  const list = $('arcova-list');
  if (!list) return;
  list.innerHTML = '<div class="empty"><span class="loader"></span> Chargement…</div>';

  try {
    const items = await api('/rest/v1/arcova_waitlist?select=*&order=created_at.desc');
    CACHE.arcova = items || [];
    renderArcovaList();
  } catch (err) {
    list.innerHTML = '<div class="empty">Erreur : ' + esc(err.message) + '</div>';
  }
}

function renderArcovaList() {
  const list = $('arcova-list');
  if (!list) return;
  list.className = '';

  const banner = '<div class="apimo-banner" style="margin-bottom:14px">' +
    '<strong>🔒 ARCOVA waitlist</strong> — Inscriptions au programme confidentiel d\'accès anticipé. ' +
    'Les inscriptions arrivent automatiquement via le formulaire public. Suis le workflow de contact ici.' +
    '</div>';

  const counts = { all: CACHE.arcova.length };
  Object.keys(ARCOVA_STATUSES).forEach(s => {
    counts[s] = CACHE.arcova.filter(a => (a.status || 'subscribed') === s).length;
  });

  const filterPills = '<div class="counter-pills" style="margin-bottom:18px">' +
    '<button class="pill clickable' + (_ARCOVA_FILTER === 'all' ? ' active' : '') + '" onclick="setArcovaFilter(\'all\')">' +
      'Tous (' + counts.all + ')</button>' +
    Object.keys(ARCOVA_STATUSES).map(s => {
      const cfg = ARCOVA_STATUSES[s];
      return '<button class="pill clickable' + (_ARCOVA_FILTER === s ? ' active' : '') + '" onclick="setArcovaFilter(\'' + s + '\')">' +
        cfg.icon + ' ' + cfg.label + ' (' + counts[s] + ')</button>';
    }).join('') +
    '</div>';

  const visible = _ARCOVA_FILTER === 'all'
    ? CACHE.arcova
    : CACHE.arcova.filter(a => (a.status || 'subscribed') === _ARCOVA_FILTER);

  if (!visible.length) {
    list.innerHTML = banner + filterPills + '<div class="empty">Aucune inscription' +
      (_ARCOVA_FILTER !== 'all' ? ' avec ce statut' : '') + '.</div>';
    return;
  }

  const cards = visible.map(a => {
    const status = a.status || 'subscribed';
    const cfg = ARCOVA_STATUSES[status] || ARCOVA_STATUSES.subscribed;
    const fullName = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
    const orgLine = [a.role, a.company].filter(Boolean).join(' · ');

    return (
      '<article class="lead-card">' +
        '<div class="lead-card-hd">' +
          '<div>' +
            '<span class="lead-status" style="background:' + cfg.color + '">' + cfg.icon + ' ' + cfg.label + '</span>' +
            (orgLine ? '<span class="lead-subject">' + esc(orgLine) + '</span>' : '') +
          '</div>' +
          '<span class="lead-date">Inscrit ' + esc(fmtRelative(a.created_at)) + '</span>' +
        '</div>' +
        '<h3 class="lead-name">' + esc(fullName) + '</h3>' +
        '<div class="lead-contacts">' +
          '<a href="mailto:' + esc(a.email) + '" class="lead-link">📧 ' + esc(a.email) + '</a>' +
          (a.contacted_at ? '<span class="ref">📞 Contacté le ' + esc(fmtDate(a.contacted_at)) + '</span>' : '') +
        '</div>' +
        (a.message ? '<div class="lead-message">' + esc(a.message) + '</div>' : '') +
        (a.notes ? '<div class="lead-notes"><strong>📝 Notes :</strong> ' + esc(a.notes) + '</div>' : '') +
        '<div class="blog-actions">' +
          '<button class="btn btn-primary btn-sm" onclick="openArcovaEditor(\'' + a.id + '\')">⚙️ Statut + Notes</button>' +
          (status === 'subscribed' ? '<button class="btn btn-secondary btn-sm" onclick="quickContactArcova(\'' + a.id + '\')">✓ Marquer contacté</button>' : '') +
          '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteArcova(\'' + a.id + '\')" title="Supprimer">✕</button>' +
        '</div>' +
      '</article>'
    );
  }).join('');

  list.innerHTML = banner + filterPills + '<div class="leads-list">' + cards + '</div>';
}

window.setArcovaFilter = function (f) {
  _ARCOVA_FILTER = f;
  renderArcovaList();
};

window.openArcovaEditor = function (id) {
  const a = CACHE.arcova.find(x => String(x.id) === String(id));
  if (!a) return;
  const fullName = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
  const html = (
    '<div class="form">' +
      '<div class="field">' +
        '<label class="field-label">Statut</label>' +
        '<select id="ar-status">' +
          Object.keys(ARCOVA_STATUSES).map(s => {
            const cfg = ARCOVA_STATUSES[s];
            return '<option value="' + s + '"' + ((a.status || 'subscribed') === s ? ' selected' : '') + '>' + cfg.icon + ' ' + cfg.label + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="field">' +
        '<label class="field-label">Notes internes</label>' +
        '<textarea id="ar-notes" rows="6" placeholder="Date d\'appel, intérêt manifesté, biens présentés…">' + esc(a.notes || '') + '</textarea>' +
        '<span class="field-hint">Visibles uniquement dans le back-office.</span>' +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--w2);padding-top:18px;margin-top:18px">' +
        '<button class="btn btn-ghost" onclick="closeModal()">Annuler</button>' +
        '<button class="btn btn-copper" onclick="saveArcovaStatus(\'' + id + '\')">💾 Enregistrer</button>' +
      '</div>' +
    '</div>'
  );
  openModal('ARCOVA — ' + fullName, html, { size: 'lg' });
};

window.saveArcovaStatus = async function (id) {
  const status = $('ar-status').value;
  const payload = {
    status,
    notes: ($('ar-notes').value || '').trim() || null
  };
  if (status === 'contacted' || status === 'converted') {
    payload.contacted_at = new Date().toISOString();
  }
  try {
    await api('/rest/v1/arcova_waitlist?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
      headers: { 'Prefer': 'return=minimal' }
    });
    const a = CACHE.arcova.find(x => String(x.id) === String(id));
    if (a) Object.assign(a, payload);
    toast('✓ ARCOVA mis à jour', 'ok');
    closeModal();
    renderArcovaList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.quickContactArcova = async function (id) {
  try {
    const payload = {
      status: 'contacted',
      contacted_at: new Date().toISOString()
    };
    await api('/rest/v1/arcova_waitlist?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
      headers: { 'Prefer': 'return=minimal' }
    });
    const a = CACHE.arcova.find(x => String(x.id) === String(id));
    if (a) Object.assign(a, payload);
    toast('✓ Marqué contacté', 'ok');
    renderArcovaList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

window.deleteArcova = async function (id) {
  const a = CACHE.arcova.find(x => String(x.id) === String(id));
  if (!a) return;
  const who = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email;
  if (!confirm('Supprimer définitivement l\'inscription "' + who + '" ?\n\nNote : c\'est généralement préférable de marquer "Désabonné" plutôt que supprimer (RGPD).')) return;
  try {
    await api('/rest/v1/arcova_waitlist?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'Prefer': 'return=minimal' }
    });
    CACHE.arcova = CACHE.arcova.filter(x => String(x.id) !== String(id));
    toast('✓ Inscription supprimée', 'ok');
    renderArcovaList();
  } catch (err) {
    toast('Erreur : ' + err.message, 'err');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async function () {
  console.log('%c[MAPA Admin] Bloc 1 — Login + Dashboard', 'color:#b89448;font-weight:bold');

  // Click backdrop pour fermer modal
  const backdrop = $('modal-backdrop');
  if (backdrop) backdrop.onclick = closeModal;

  // Tente la restauration de session
  const user = await authRestoreSession();
  if (user) {
    showApp();
  } else {
    showLogin();
  }
});

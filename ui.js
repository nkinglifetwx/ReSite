/* ui.js — éléments communs : en-tête, session, toasts, effet verre.
 * Tout texte venant de l'API passe par textContent (jamais innerHTML). */
(function () {
  'use strict';
  var C = window.RELINK_CONFIG || {};

  /* ── Helper DOM sûr ─────────────────────────────────────── */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  var nf = new Intl.NumberFormat('fr-FR');
  function fmt(n) { return nf.format(Number(n) || 0); }

  /* ── Toasts ─────────────────────────────────────────────── */
  function toast(message, type) {
    var host = document.getElementById('toasts');
    if (!host) { host = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.appendChild(host); }
    var t = h('div', { class: 'toast glass ' + (type || 'info'), role: 'status', text: message });
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  }
  document.addEventListener('relink:error', function (e) { toast(e.detail, 'error'); });

  /* ── Avatar ─────────────────────────────────────────────── */
  function avatar(url, name, cls) {
    var safe = window.Relink.safeAvatar(url);
    var letter = function () { return h('span', { class: (cls || 'avatar') + ' fallback', 'aria-hidden': 'true', text: (name || '?').trim().charAt(0).toUpperCase() }); };
    if (safe) return h('img', { class: cls || 'avatar', src: safe, alt: '', width: 40, height: 40, referrerpolicy: 'no-referrer',
      onerror: function (e) { var t = e.target; if (t.parentNode) t.replaceWith(letter()); } });
    return h('span', { class: (cls || 'avatar') + ' fallback', 'aria-hidden': 'true', text: (name || '?').trim().charAt(0).toUpperCase() });
  }

  /* ── Session ────────────────────────────────────────────── */
  var state = { user: null, ready: null };
  var listeners = [];

  function renderSession() {
    var slot = document.getElementById('session');
    if (!slot) return;
    slot.replaceChildren();
    var u = state.user;
    if (u) {
      var chip = h('div', { class: 'user-chip glass-soft' }, [
        avatar(u.avatar_url, u.pseudo),
        h('div', { class: 'user-meta' }, [
          h('strong', { text: u.pseudo || 'Joueur' }),
          h('span', { class: 'eclats', title: 'Éclats' }, ['✦ ', h('b', { id: 'nav-eclats', text: fmt(u.eclats) })])
        ])
      ]);
      var out = h('button', { class: 'btn ghost small', type: 'button', 'aria-label': 'Se déconnecter', text: 'Déconnexion',
        onclick: function () { window.Relink.logout('manual'); } });
      slot.append(chip, out);
    } else {
      slot.append(
        h('button', { class: 'nav-text', type: 'button', text: 'Connexion', onclick: function () { window.Relink.login(); } }),
        h('button', { class: 'btn primary small', type: 'button', onclick: function () { window.Relink.login(); } }, [discordIcon(), 'S’inscrire'])
      );
    }
  }

  function discordIcon() { // icône « lien » générique (stroke, style Feather)
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    ['viewBox:0 0 24 24', 'width:16', 'height:16', 'fill:none', 'stroke:currentColor', 'stroke-width:2',
     'stroke-linecap:round', 'stroke-linejoin:round', 'aria-hidden:true'].forEach(function (kv) {
      var i = kv.indexOf(':'); svg.setAttribute(kv.slice(0, i), kv.slice(i + 1));
    });
    ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'].forEach(function (d) {
      var p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.appendChild(p);
    });
    return svg;
  }

  function loadMe() {
    if (!window.Relink.isLoggedIn()) { state.user = null; renderSession(); return Promise.resolve(null); }
    return window.Relink.me().then(function (u) {
      state.user = u; renderSession(); listeners.forEach(function (f) { f(u); }); return u;
    }).catch(function (e) {
      state.user = null; renderSession();
      if (e.status === 403) toast(e.message || 'Compte banni ou suspendu.', 'error');
      else if (e.status !== 401) toast(e.message, 'error');
      return null;
    });
  }

  document.addEventListener('relink:logout', function (e) {
    state.user = null; renderSession();
    if (e.detail && e.detail.reason === 'expired') toast('Session expirée, reconnecte-toi.', 'info');
    listeners.forEach(function (f) { f(null); });
  });

  /* ── Effet « verre » : le reflet suit le pointeur ───────── */
  function glow() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.glass, .glass-soft');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      t.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }


  /* ── Fond étoilé (canvas) ───────────────────────────────── */
  function starfield() {
    var c = document.createElement('canvas'); c.id = 'stars'; c.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(c, document.body.firstChild);
    var ctx = c.getContext('2d'); if (!ctx) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var stars = [], shoot = null, W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(W * H / 6500); stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .2,
        p: Math.random() * 6.28, s: Math.random() * .02 + .005, g: Math.random() < .12 });
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(function (s) {
        var a = reduce ? .7 : .45 + .45 * Math.sin(s.p + t * s.s * .06);
        ctx.globalAlpha = a; ctx.fillStyle = s.g ? '#b9ffd9' : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      });
      if (!reduce) {
        if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W * .8, y: Math.random() * H * .4, l: 0 };
        if (shoot) {
          var g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - 90, shoot.y - 40);
          g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1 - shoot.l / 60; ctx.strokeStyle = g; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - 90, shoot.y - 40); ctx.stroke();
          shoot.x += 9; shoot.y += 4; shoot.l++; if (shoot.l > 60) shoot = null;
        }
        requestAnimationFrame(draw);
      }
    }
    resize(); addEventListener('resize', resize);
    if (reduce) draw(0); else requestAnimationFrame(draw);
  }

  /* ── Chargement du script de visibilité (panel → site) ──── */
  function loadFlags() {
    if (!C.WORKER_URL || C.WORKER_URL.indexOf('REMPLACE') !== -1) return;
    var s = document.createElement('script');
    s.src = 'relink-flags.js';
    s.dataset.worker = C.WORKER_URL;
    s.dataset.site = C.SITE_SLUG;
    document.head.appendChild(s);
  }

  /* Si le panel impose la connexion et que l'utilisateur n'est pas connecté */
  document.addEventListener('relink:flags', function (e) {
    if (e.detail && e.detail.require_auth && !window.Relink.isLoggedIn() && window.Relink.configured()) window.Relink.login();
  });

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('brand-name'); if (b) b.textContent = C.SITE_NAME || 'ReLink';
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav a').forEach(function (a) {
      if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
    });
    starfield(); glow(); loadFlags();
    state.ready = loadMe();
    if (!window.Relink.configured()) {
      var bar = document.getElementById('config-warning'); if (bar) bar.hidden = false;
    }
  });

  window.UI = {
    h: h, fmt: fmt, toast: toast, avatar: avatar,
    user: function () { return state.user; },
    ready: function () { return state.ready || Promise.resolve(null); },
    refresh: loadMe,
    onSession: function (f) { listeners.push(f); },
    setEclats: function (n) { var e = document.getElementById('nav-eclats'); if (e) e.textContent = fmt(n); if (state.user) state.user.eclats = n; }
  };
})();

/* relink.js — module unique pour tous les appels au Worker ReLink.
 * Auth : en-tête Authorization: Bearer <access_token>. Pas de cookies.
 * Règles : aucun secret, un 401 authentifié = session terminée. */
(function () {
  'use strict';
  var C = window.RELINK_CONFIG || {};
  var TOKEN_KEY = 'relink_token';
  var STATE_KEY = 'relink_oauth_state';
  var RETURN_KEY = 'relink_return_to';

  function base() { return String(C.WORKER_URL || '').replace(/\/$/, ''); }
  function configured() {
    return /^https?:\/\//.test(base()) && base().indexOf('REMPLACE') === -1 &&
      C.DISCORD_CLIENT_ID && String(C.DISCORD_CLIENT_ID).indexOf('REMPLACE') === -1;
  }

  /* Gère les deux formats d'erreur du Worker : {error:"txt"} et {error:{code,message}} */
  function errorMessage(json, fallback) {
    if (json && json.error) {
      if (typeof json.error === 'string') return json.error;
      if (json.error.message) return json.error.message;
    }
    return fallback || 'Une erreur est survenue.';
  }
  function errorCode(json) { return json && json.error && typeof json.error === 'object' ? json.error.code : undefined; }

  function ApiError(status, message, data) {
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
    this.data = data || null;
    var d = data || {};
    var s = d.retry_after_seconds != null ? Number(d.retry_after_seconds)
      : (d.retry_after_ms != null ? Math.ceil(Number(d.retry_after_ms) / 1000) : null);
    this.retryAfter = isFinite(s) ? s : null;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  function logout(reason) {
    clearToken();
    document.dispatchEvent(new CustomEvent('relink:logout', { detail: { reason: reason || 'manual' } }));
  }

  function request(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    var token = getToken();
    if (opts.auth) {
      if (!token) return Promise.reject(new ApiError(401, 'Non connecté.'));
      headers['Authorization'] = 'Bearer ' + token;
    }
    var init = { method: opts.method || 'GET', headers: headers };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(base() + path, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (res.ok) return data;
        var msg = errorMessage(data, 'Erreur ' + res.status);
        if (res.status === 401 && opts.auth) logout('expired');
        if (res.status === 429 && !(data && (data.retry_after_seconds || data.retry_after_ms)) && res.headers.get('Retry-After')) {
          data = Object.assign({}, data, { retry_after_seconds: Number(res.headers.get('Retry-After')) });
        }
        var err = new ApiError(res.status, msg, data);
        err.code = errorCode(data);
        throw err;
      });
    }, function () {
      throw new ApiError(0, 'Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.');
    });
  }

  /* ── Connexion Discord (OAuth2 « code ») ───────────────────── */
  function randomState() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  function login(returnTo) {
    if (!configured()) {
      document.dispatchEvent(new CustomEvent('relink:error', { detail: 'Le site n’est pas encore configuré (config.js).' }));
      return;
    }
    var state = randomState();
    try {
      sessionStorage.setItem(STATE_KEY, state);
      sessionStorage.setItem(RETURN_KEY, returnTo || (location.pathname.split('/').pop() || 'index.html'));
    } catch (e) {}
    var url = 'https://discord.com/oauth2/authorize' +
      '?client_id=' + encodeURIComponent(C.DISCORD_CLIENT_ID) +
      '&response_type=code' +
      '&redirect_uri=' + encodeURIComponent(C.REDIRECT_URI) +
      '&scope=' + encodeURIComponent('identify email') +
      '&state=' + encodeURIComponent(state);
    location.href = url;
  }

  /* À appeler sur REDIRECT_URI. Renvoie {user, isNew, returnTo}. */
  function completeLogin() {
    var p = new URLSearchParams(location.search);
    var code = p.get('code'), state = p.get('state'), err = p.get('error');
    var saved = null, returnTo = 'index.html';
    try { saved = sessionStorage.getItem(STATE_KEY); returnTo = sessionStorage.getItem(RETURN_KEY) || 'index.html'; } catch (e) {}
    history.replaceState(null, '', location.pathname); // retire ?code= de l'URL
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}

    if (err) return Promise.reject(new ApiError(0, err === 'access_denied' ? 'Connexion annulée.' : 'Discord a refusé la connexion.'));
    if (!code || !state || !saved || state !== saved)
      return Promise.reject(new ApiError(0, 'Session de connexion invalide ou expirée. Relance la connexion.'));

    return request('/auth/discord', { method: 'POST', body: { code: code, redirect_uri: C.REDIRECT_URI } })
      .then(function (data) {
        setToken(data.access_token);
        var user = Object.assign({}, data); delete user.access_token;
        // returnTo : uniquement une page relative du site (pas de redirection ouverte)
        if (!/^[a-z0-9_-]+\.html$/i.test(returnTo)) returnTo = 'index.html';
        return { user: user, isNew: !!data.is_new_user, returnTo: returnTo };
      });
  }

  /* Avatars : uniquement depuis cdn.discordapp.com */
  function safeAvatar(url) {
    try { var u = new URL(url); return u.protocol === 'https:' && u.hostname === 'cdn.discordapp.com' ? u.href : null; }
    catch (e) { return null; }
  }

  window.Relink = {
    config: C, configured: configured,
    errorMessage: errorMessage, ApiError: ApiError,
    isLoggedIn: function () { return !!getToken(); },
    login: login, completeLogin: completeLogin, logout: logout, safeAvatar: safeAvatar,

    me: function () { return request('/me', { auth: true }); },
    server: function () { return request('/server'); },
    rewards: function () { return request('/rewards/summary', { auth: true }); },
    linkConfirm: function (code, referral) {
      var b = { code: String(code) }; if (referral) b.referral_code = referral;
      return request('/link/confirm', { method: 'POST', auth: true, body: b });
    },
    redeemReferral: function (code) { return request('/referral/redeem', { method: 'POST', auth: true, body: { code: code } }); },
    shop: function () { return request('/shop'); },
    purchase: function (id, qty) { return request('/shop/' + encodeURIComponent(id) + '/purchase', { method: 'POST', auth: true, body: { quantity: qty } }); },
    purchases: function () { return request('/shop/purchases/me', { auth: true }); }
  };
})();

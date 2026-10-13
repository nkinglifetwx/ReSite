(function () {
  'use strict';
  var h = UI.h, $ = function (id) { return document.getElementById(id); };

  $('cta-main').addEventListener('click', function () { Relink.login('index.html'); });

  function render(user) {
    $('view-guest').hidden = !!user;
    $('view-member').hidden = !user;
    if (!user) return;

    $('welcome-title').textContent = 'Salut, ' + (user.pseudo || 'joueur') + ' 👋';
    $('m-name').textContent = user.pseudo || 'Joueur';
    $('m-avatar').replaceChildren(UI.avatar(user.avatar_url, user.pseudo, 'avatar big'));
    $('s-eclats').textContent = UI.fmt(user.eclats);

    var linked = !!user.minecraft_uuid;
    $('m-mc').textContent = linked ? 'Minecraft : ' + (user.minecraft_username || 'lié') : 'Compte Minecraft non lié';
    var badge = $('m-badge');
    badge.className = 'badge ' + (linked ? 'ok' : 'warn');
    badge.textContent = linked ? '● Compte lié' : '● Liaison Minecraft requise';
    $('link-form').hidden = linked;
    $('link-done').hidden = !linked;

    Relink.rewards().then(function (r) {
      $('s-streak').textContent = UI.fmt(r.streak && r.streak.current_streak);
      $('s-ref').textContent = UI.fmt(r.referral_count);
      $('ref-code').textContent = r.referral_code || 'Disponible après la liaison Minecraft';
      $('ref-copy').hidden = !r.referral_code;
    }).catch(function () { $('ref-code').textContent = 'Indisponible pour le moment'; $('ref-copy').hidden = true; });
  }

  $('ref-copy').addEventListener('click', function () {
    var t = $('ref-code').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
      function () { UI.toast('Code copié !', 'success'); },
      function () { UI.toast('Copie impossible, sélectionne le code manuellement.', 'error'); });
  });

  /* ── Liaison Minecraft ───────────────────────────────── */
  var busy = false, timer = null;
  $('link-code').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });

  function setMsg(text, kind) { var m = $('link-msg'); m.textContent = text || ''; m.className = 'msg ' + (kind || ''); }

  function countdown(sec) {
    var btn = $('link-btn'); btn.disabled = true;
    clearInterval(timer);
    (function tick() {
      if (sec <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = 'Lier mon compte'; setMsg(''); return; }
      btn.textContent = 'Réessaie dans ' + sec + ' s';
      sec--;
    })();
    timer = setInterval(function () {
      if (sec <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = 'Lier mon compte'; setMsg(''); return; }
      btn.textContent = 'Réessaie dans ' + sec + ' s'; sec--;
    }, 1000);
  }

  $('link-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var code = $('link-code').value.trim(), ref = $('link-ref').value.trim();
    if (!/^\d{6}$/.test(code)) { setMsg('Le code comporte 6 chiffres.', 'err'); return; }
    busy = true; $('link-btn').disabled = true; setMsg('Vérification…');
    Relink.linkConfirm(code, ref).then(function (res) {
      setMsg('');
      UI.toast('Compte Minecraft lié : ' + (res.minecraft_username || 'ok') + ' ✔', 'success');
      return UI.refresh();
    }).catch(function (err) {
      if (err.status === 429) {
        var s = err.retryAfter || 30;
        setMsg('Trop de tentatives. Réessaie dans ' + s + ' s.', 'err'); countdown(s); return;
      }
      if (err.status === 409) setMsg(err.message || 'Ce compte Minecraft est déjà lié à un autre profil.', 'err');
      else if (err.status === 401) setMsg('Session expirée, reconnecte-toi.', 'err');
      else if (/expir/i.test(err.message)) setMsg('Code expiré, régénère-le avec /link en jeu.', 'err');
      else if (err.status === 400 || err.status === 404) setMsg(err.message || 'Code invalide.', 'err');
      else setMsg(err.message, 'err');
      $('link-btn').disabled = false;
    }).then(function () { busy = false; if (!timer || $('link-btn').textContent === 'Lier mon compte') $('link-btn').disabled = false; });
  });

  Relink.server().then(function (s) {
    var n = s && s.players && s.players.current;
    if (typeof n === 'number') { $('online-n').textContent = UI.fmt(n); $('online').hidden = false; }
  }).catch(function () { /* serveur indisponible : on n'affiche rien */ });

  UI.onSession(render);
  UI.ready().then(function (u) {
    if (!u) render(null); // les membres sont rendus par onSession
    if (u && new URLSearchParams(location.search).get('welcome') === '1') {
      $('welcome-sub').textContent = 'Ton compte ReLink est créé ! Il reste à lier ton compte Minecraft.';
      history.replaceState(null, '', location.pathname);
    }
  });
})();

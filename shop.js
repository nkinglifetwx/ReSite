(function () {
  'use strict';
  var h = UI.h, $ = function (id) { return document.getElementById(id); };
  var items = [], category = 'all', query = '', pending = null, buying = false;

  function unitPrice(it) { return (it.promo_active && it.promo_price != null) ? it.promo_price : it.price_eclats; }
  function hue(s) { var n = 0; for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 150; return 140 + n; }
  function remaining(it) { return it.max_total != null ? Math.max(0, it.max_total - (it.purchased_total || 0)) : null; }

  /* ── Rendu ───────────────────────────────────────────── */
  function renderChips() {
    var cats = ['all'].concat(items.map(function (i) { return i.category || 'Divers'; })
      .filter(function (c, i, a) { return a.indexOf(c) === i; }));
    $('chips').replaceChildren.apply($('chips'), cats.map(function (c) {
      return h('button', { class: 'chip', type: 'button', 'aria-pressed': String(c === category), text: c === 'all' ? 'Tout' : c,
        onclick: function () { category = c; renderChips(); renderGrid(); } });
    }));
  }

  function card(it) {
    var left = remaining(it), soldOut = left === 0, name = it.name || 'Article';
    var promo = !!(it.promo_active && it.promo_price != null);
    var maxQty = Math.min(100, it.max_per_player != null ? Math.max(1, it.max_per_player) : 100, left != null && left > 0 ? left : 100);
    var qty = 1;
    var qEl = h('span', { text: '1' });
    var minus = h('button', { type: 'button', 'aria-label': 'Moins', text: '−', disabled: true });
    var plus = h('button', { type: 'button', 'aria-label': 'Plus', text: '+', disabled: maxQty <= 1 });
    function sync() { qEl.textContent = String(qty); minus.disabled = qty <= 1; plus.disabled = qty >= maxQty; total.textContent = ''; }
    minus.addEventListener('click', function () { qty = Math.max(1, qty - 1); sync(); });
    plus.addEventListener('click', function () { qty = Math.min(maxQty, qty + 1); sync(); });
    var total = h('span');

    var logged = Relink.isLoggedIn();
    var btn = h('button', { class: 'btn primary', type: 'button', disabled: soldOut,
      text: soldOut ? 'Épuisé' : (logged ? 'Acheter' : 'Connecte-toi pour acheter'),
      onclick: function () { if (!Relink.isLoggedIn()) return Relink.login('boutique.html'); openConfirm(it, qty); } });

    var limits = [];
    if (it.pack_quantity > 1) limits.push(h('span', { text: 'Pack ×' + it.pack_quantity }));
    if (left != null) limits.push(h('span', { text: soldOut ? 'Stock épuisé' : 'Reste ' + UI.fmt(left) }));
    if (it.max_per_player != null) limits.push(h('span', { text: 'Max ' + it.max_per_player + ' / joueur' }));

    return h('article', { class: 'item glass' + (soldOut ? ' sold' : '') }, [
      h('div', { class: 'tile', style: '--h:' + hue(it.category || name), 'aria-hidden': 'true', text: name.trim().charAt(0).toUpperCase() }),
      h('div', {}, [h('span', { class: 'cat', text: it.category || 'Divers' }), h('h3', { text: name })]),
      h('p', { class: 'desc', text: it.description || '' }),
      h('div', { class: 'price' }, [
        h('b', { text: '✦ ' + UI.fmt(unitPrice(it)) }),
        promo ? h('s', { text: UI.fmt(it.price_eclats) }) : null,
        promo ? h('span', { class: 'badge ok', text: 'Promo' }) : null
      ]),
      limits.length ? h('div', { class: 'limits' }, limits) : null,
      h('div', { class: 'buy' }, [
        soldOut ? null : h('div', { class: 'qty', role: 'group', 'aria-label': 'Quantité' }, [minus, qEl, plus]),
        btn
      ])
    ]);
  }

  function renderGrid() {
    var q = query.trim().toLowerCase();
    var list = items.filter(function (it) {
      var okCat = category === 'all' || (it.category || 'Divers') === category;
      var okQ = !q || (it.name || '').toLowerCase().indexOf(q) !== -1 || (it.description || '').toLowerCase().indexOf(q) !== -1;
      return okCat && okQ;
    });
    var grid = $('grid');
    if (!list.length) {
      grid.replaceChildren(h('div', { class: 'empty glass' }, [
        h('h3', { text: items.length ? 'Aucun résultat' : 'La boutique arrive bientôt' }),
        h('p', { text: items.length ? 'Essaie une autre recherche ou catégorie.' : 'Aucun article n’est disponible pour le moment.' })
      ]));
      return;
    }
    grid.replaceChildren.apply(grid, list.map(card));
  }

  function showError(text) {
    $('grid').replaceChildren(h('div', { class: 'empty glass' }, [
      h('h3', { text: 'Boutique indisponible' }), h('p', { text: text }),
      h('button', { class: 'btn', type: 'button', text: 'Réessayer', onclick: load })
    ]));
  }

  function load() {
    $('grid').replaceChildren(h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }), h('div', { class: 'skeleton' }));
    Relink.shop().then(function (d) {
      items = (d && d.items) || []; renderChips(); renderGrid();
    }).catch(function (e) { showError(e.message); });
  }

  /* ── Achat ───────────────────────────────────────────── */
  var dlg = $('confirm');
  function openConfirm(it, qty) {
    pending = { it: it, qty: qty };
    $('c-name').textContent = it.name;
    $('c-qty').textContent = '× ' + qty + (it.pack_quantity > 1 ? ' (pack de ' + it.pack_quantity + ')' : '');
    $('c-total').textContent = '✦ ' + UI.fmt(unitPrice(it) * qty);
    $('c-err').textContent = '';
    $('c-ok').disabled = false; $('c-ok').textContent = 'Acheter';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeConfirm() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); pending = null; }
  $('c-cancel').addEventListener('click', closeConfirm);

  $('c-ok').addEventListener('click', function () {
    if (!pending || buying) return;
    buying = true; $('c-ok').disabled = true; $('c-ok').textContent = 'Achat…';
    var p = pending;
    Relink.purchase(p.it.id, p.qty).then(function () {
      closeConfirm();
      UI.toast('Achat confirmé : ' + p.it.name + ' ×' + p.qty + ' ✔', 'success');
      // le solde est relu depuis /me (jamais calculé côté front)
      return Promise.all([UI.refresh().then(updateBalance), loadHistory(), Relink.shop().then(function (d) { items = d.items || []; renderGrid(); })]);
    }).catch(function (e) {
      var msg = e.message;
      if (e.status === 402) msg = 'Pas assez d’éclats pour cet achat.';
      else if (e.status === 409) msg = e.message || 'Limite atteinte ou stock épuisé.';
      else if (e.status === 401) { closeConfirm(); return; }
      else if (e.status === 403) msg = e.message || 'Ton compte ne peut pas effectuer d’achat.';
      else if (e.status === 429) msg = 'Trop de requêtes, réessaie dans ' + (e.retryAfter || 'quelques') + ' s.';
      $('c-err').textContent = msg;
      $('c-ok').disabled = false; $('c-ok').textContent = 'Réessayer';
      if (e.status === 409) Relink.shop().then(function (d) { items = d.items || []; renderGrid(); }).catch(function () {});
    }).then(function () { buying = false; });
  });

  /* ── Solde & historique ──────────────────────────────── */
  function updateBalance(u) {
    $('balance').hidden = !u;
    if (u) $('bal-val').textContent = UI.fmt(u.eclats);
  }

  var STATUS = { pending: ['En attente', 'warn'], fulfilled: ['Livré', 'ok'], cancelled: ['Annulé', 'err'] };
  function loadHistory() {
    if (!Relink.isLoggedIn()) { $('history-section').hidden = true; return Promise.resolve(); }
    return Relink.purchases().then(function (d) {
      var rows = (d && d.purchases) || [];
      $('history-section').hidden = rows.length === 0;
      var body = $('history');
      body.replaceChildren.apply(body, rows.map(function (p) {
        var s = STATUS[p.status] || [p.status || '—', ''];
        var date = p.created_at ? new Date(String(p.created_at).replace(' ', 'T') + 'Z') : null;
        return h('tr', {}, [
          h('td', { text: p.name || ('Article #' + p.item_id) }),
          h('td', { text: String(p.quantity) }),
          h('td', { text: '✦ ' + UI.fmt(p.eclats_spent) }),
          h('td', {}, [h('span', { class: 'badge ' + s[1], text: s[0] })]),
          h('td', { text: date && !isNaN(date) ? date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' })
        ]);
      }));
    }).catch(function () {});
  }

  $('q').addEventListener('input', function (e) { query = e.target.value; renderGrid(); });

  UI.onSession(function (u) { updateBalance(u); renderGrid(); loadHistory(); });
  UI.ready().then(function (u) { updateBalance(u); renderGrid(); loadHistory(); });
  load();
})();

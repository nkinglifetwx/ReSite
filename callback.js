(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function fail(msg) {
    $('cb-spin').hidden = true;
    $('cb-title').textContent = 'Connexion impossible';
    $('cb-text').textContent = msg;
    $('cb-back').hidden = false; // pas de reconnexion automatique : évite toute boucle
  }

  if (!Relink.configured()) { fail('Le site n’est pas encore configuré (config.js).'); return; }

  Relink.completeLogin().then(function (r) {
    $('cb-title').textContent = r.isNew ? 'Compte créé ✔' : 'Content de te revoir ✔';
    $('cb-text').textContent = 'Redirection…';
    var target = r.returnTo + (r.isNew && r.returnTo === 'index.html' ? '?welcome=1' : '');
    setTimeout(function () { location.replace(target); }, 600);
  }).catch(function (e) {
    if (e.status === 403) fail(e.message || 'Ce compte est banni ou suspendu.');
    else fail(e.message || 'Une erreur est survenue. Réessaie.');
  });
})();

/*! relink-flags.js — branche un site sur le Worker ReLink (≈ 40 lignes, sans dépendance)
 *
 * Usage (dans le <head> ou en fin de <body>) :
 *   <script src="relink-flags.js" data-worker="https://TON-WORKER.workers.dev" data-site="wiki"></script>
 *
 * Dans ta page, marque chaque section/page contrôlable :
 *   <section data-relink-section="editor"> … </section>
 *   <a href="/editor" data-relink-section="editor">Éditeur</a>
 *   <div data-relink-maintenance hidden>Site en maintenance</div>   (optionnel)
 *
 * Le script lit  GET /flags?site=<site>  et :
 *   • masque (hidden) tout élément dont la section est désactivée dans le panel ;
 *   • si le site entier est désactivé : masque tout et affiche [data-relink-maintenance] ;
 *   • expose window.RELINK_FLAGS et l'évènement « relink:flags » (pour ton propre code,
 *     ex. rediriger vers la connexion si flags.require_auth).
 * Panne réseau ou site pas encore détecté : rien n'est masqué (le site reste utilisable).
 */
(function () {
  var s = document.currentScript;
  var worker = ((s && s.dataset.worker) || '').replace(/\/$/, '');
  var site = s && s.dataset.site;
  if (!worker || !site) { console.warn('[relink] data-worker et data-site sont requis'); return; }

  function apply(flags) {
    window.RELINK_FLAGS = flags;
    var maintenance = flags.site_enabled === false;
    document.querySelectorAll('[data-relink-section]').forEach(function (el) {
      var on = flags.sections && flags.sections[el.getAttribute('data-relink-section')];
      el.hidden = maintenance || on === false;
    });
    document.querySelectorAll('[data-relink-maintenance]').forEach(function (el) { el.hidden = !maintenance; });
    document.dispatchEvent(new CustomEvent('relink:flags', { detail: flags }));
  }

  function run() {
    fetch(worker + '/flags?site=' + encodeURIComponent(site))
      .then(function (r) { return r.json(); })
      .then(apply)
      .catch(function () { /* hors-ligne : on laisse tout visible */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

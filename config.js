/* ──────────────────────────────────────────────────────────────
   Configuration publique du site (aucun secret ici !).
   Remplace les valeurs ci-dessous avant la mise en ligne.
   ────────────────────────────────────────────────────────────── */
window.RELINK_CONFIG = {
  // URL du Worker ReLink, sans « / » final
  WORKER_URL: 'https://REMPLACE-MOI.workers.dev',

  // Client ID Discord (public). Le secret reste dans le Worker.
  DISCORD_CLIENT_ID: 'REMPLACE_MOI',

  // Doit être IDENTIQUE à celle déclarée chez Discord (OAuth2 → Redirects)
  REDIRECT_URI: location.origin + '/callback.html',

  // Nom court du site pour le panel (a-z, 0-9, tirets) — voir relink.manifest.json
  SITE_SLUG: 'relink',

  // Nom affiché dans l'en-tête
  SITE_NAME: 'ReLink'
};

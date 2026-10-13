/* ──────────────────────────────────────────────────────────────
   Configuration publique du site (aucun secret ici !).
   Remplace les valeurs ci-dessous avant la mise en ligne.
   ────────────────────────────────────────────────────────────── */
window.RELINK_CONFIG = {
  // URL du Worker ReLink, sans « / » final
  WORKER_URL: 'https://relink-auth.refugeemeraudien-direction.workers.dev/',

  // Client ID Discord (public). Le secret reste dans le Worker.
  DISCORD_CLIENT_ID: '1333801116692910172',

  // Doit être IDENTIQUE à celle déclarée chez Discord (OAuth2 → Redirects)
  REDIRECT_URI: "https://nkinglifetwx.github.io/ReSite/",

  // Nom court du site pour le panel (a-z, 0-9, tirets) — voir relink.manifest.json
  SITE_SLUG: 'MainWeb',

  // Nom affiché dans l'en-tête
  SITE_NAME: 'ReLink'
};

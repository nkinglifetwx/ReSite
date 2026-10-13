# Site ReLink — mise en route
1. Édite `config.js` : WORKER_URL et DISCORD_CLIENT_ID (SITE_SLUG si besoin).
2. Worker : ajoute l'URL du site à EXACT_ALLOWED_ORIGINS puis redéploie.
3. Discord Developer Portal → OAuth2 → Redirects : `https://TON-SITE/callback.html`.
4. Mets l'URL du site dans `relink.manifest.json`, déploie, puis panel → Sites & visibilité → SITE_SLUG + URL du manifeste → Détecter.
Test local : `python3 -m http.server 8000` (pas en file://).

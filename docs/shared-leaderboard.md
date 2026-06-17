# Shared leaderboard experiment

The game still works with browser-local scores by default. To test a free shared leaderboard, deploy `workers/leaderboard.js` as a Cloudflare Worker with one KV namespace binding named `LEADERBOARD`.

Then build the game with:

```bash
VITE_LEADERBOARD_URL=https://<worker-name>.<account>.workers.dev npm run build
```

The browser never receives a GitHub token or Discord webhook. It only sends `{ name, score, level, grazes }` to the Worker. If the Worker is missing/offline, the game falls back to localStorage.

## Worker setup sketch

1. Create a Cloudflare Worker.
2. Create a KV namespace.
3. Bind it to the Worker as `LEADERBOARD`.
4. Paste/deploy `workers/leaderboard.js`.
5. Set `VITE_LEADERBOARD_URL` during the GitHub Pages build once the endpoint is ready.

No backend is required for local-only testing; leave `VITE_LEADERBOARD_URL` unset.

# Google Sheets leaderboard

Direct browser writes to a Google Sheet are not safe/available from GitHub Pages. The safe free version is a tiny Google Apps Script web app attached to the sheet. The browser talks to the web app; the script appends rows to the sheet.

Sheet provided for testing:

<https://docs.google.com/spreadsheets/d/1l5ncisNjIlkywP6UHRYhGY7jhOXOPtGLiUzM5k7_bXE/edit?usp=sharing>

## Setup

1. Open the Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Paste `scripts/google-sheets-leaderboard.gs` into `Code.gs`.
4. Click **Deploy → New deployment**.
5. Type: **Web app**.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Deploy and copy the Web app URL.

## Configure the game

Set the GitHub Actions build env var:

```yaml
env:
  VITE_LEADERBOARD_URL: https://script.google.com/macros/s/<deployment-id>/exec
```

The existing game client already expects this endpoint shape:

- `GET` → `{ "scores": [...] }`
- `POST` JSON `{ name, score, level, grazes }` → `{ "scores": [...] }`

The live game now expects `VITE_LEADERBOARD_URL` to be configured; if the endpoint is unavailable, scores are not saved locally.

## Notes

- Do not put Google credentials or GitHub tokens in browser JavaScript.
- Apps Script handles the write using the sheet owner’s permission.
- The script stores only the top 10 scores to keep the sheet tidy.

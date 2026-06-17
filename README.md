# Bullet Hell Game

Project workspace for the Discord-bound OpenClaw agent `bullet-hell-game`.

- Discord guild ID: `1515020347425030245`
- Discord channel ID: `1516540611136589864`
- Agent ID: `bullet-hell-game`
- Default model: `gpt-5.5`
- Workspace: `/home/garrin/.openclaw/workspace-bullet-hell-game`
- GitHub repo: `Garrin-Project-Labs/project-bullet-hell-game`

Use this workspace for project-specific notes, code, docs, and memory. Keep unrelated project files out of this directory.

## Who can do what

Plain-language defaults for this Project Space:

- **Everyone invited here:** can chat, ask questions, and request summaries.
- **Contributors:** can suggest tasks, claim work, and ask me to draft plans or branch/PR updates.
- **Maintainers:** can approve plans, durable docs/memory updates, and merges.
- **Owner:** can configure the project, repo, roles, and override locks.

Role names in policy:
- Viewer: `bullet-hell-game-viewer`
- Contributor: `bullet-hell-game-contributor`
- Maintainer: `bullet-hell-game-maintainer`

Current enforcement note: this card is the human-facing policy for the project. The factory scaffolds these role names and approval expectations, but not every role check is hard-enforced yet. Keep maintainer approval explicit for durable changes until enforcement is tightened.


## Starting summary

This project was promoted using a summary-only handoff. Raw conversation transcript was intentionally not copied.

Origin: #chat-bullet-hell-game

# Bullet Hell Game promotion summary

A Phaser + Vite MVP was created in the chat workspace for a browser-playable bullet hell game.

Current MVP includes:
- player movement with WASD/arrow keys
- player shooting with Space
- boss enemy at the top of the arena
- radial bullet patterns with increasing density/speed as score rises
- player HP, brief invulnerability after hits, game over overlay, and R-to-restart
- graze scoring for skimming near bullets
- responsive Phaser Scale.FIT canvas

Current files worth carrying into the project repo:
- package.json
- package-lock.json
- index.html
- src/main.ts
- src/style.css
- README.md

Verified:
- npm install completed successfully
- npm run build completed successfully
- npm run dev started Vite at http://localhost:5173/

Requested next state:
- promote this chat into a durable OpenClaw Project Space
- create a private GitHub repo so development can proceed with branches, testing, and review
- seed the project with the current MVP code, not raw chat transcript

## Current playable MVP

A Phaser + Vite bullet hell MVP has been seeded into this repo.

Run locally:

```bash
npm install
npm run dev
```

Open the Vite local URL, usually <http://localhost:5173/>.

Build for production:

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This repo is configured for GitHub Pages as a Vite project site:

- `vite.config.ts` sets `base: '/project-bullet-hell-game/'` so built JS/CSS asset URLs resolve under the repository path.
- `.github/workflows/deploy-pages.yml` builds with `npm ci && npm run build`, uploads `dist/`, and deploys it through GitHub Pages Actions.

In GitHub repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The live URL should be:

<https://garrin-project-labs.github.io/project-bullet-hell-game/>

Controls:

- Move: WASD or arrow keys
- Shoot: Space
- Restart: R

# CONTEXT.md - Bullet Hell Game

This is the project glossary. Keep it short, plain, and useful. Add terms only when they help people and agents talk about the project clearly.

## Terms

- **Project Space** — this Discord-bound workspace for turning an idea into something real.
- **Quest** — a small, friendly unit of progress. Power users may treat quests as vertical-slice tasks.
- **Jam Mode** — a temporary live collaboration window where the bot can listen more actively, then return to quiet mention-gated mode.
- **Prototype** — throwaway code or mockups used to answer a question quickly before committing to a build direction.


## Starting summary

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

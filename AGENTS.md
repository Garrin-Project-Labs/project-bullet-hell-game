# AGENTS.md - Bullet Hell Game

Project-specific agent instructions.

- Use Discord task threads as source of truth for task ownership.
- Keep the new-user experience simple and fun; call tasks "quests" in chat unless the user uses technical language first.
- Hide engineering ceremony behind friendly flows. Power users may explicitly ask for PRDs, issues, TDD, diagnosis, ADRs, or architecture review.
- Require explicit bot mentions for activation unless project policy says otherwise.
- GitHub Pages is the project test surface; after `npm run build` passes, push gameplay/testing changes directly to `main` so the preview redeploys.
- Use branch-per-task only when explicitly requested or when work should not hit the live Pages preview yet.
- Durable docs/memory updates require maintainer approval.
- Keep secrets, runtime state, and assistant memory out of git.

## Friendly project shortcuts

- "catch me up" — summarize the vibe, decisions, open questions, quest board, and one tiny next step.
- "start jam mode for 30 minutes" — temporarily participate more actively, then return to quiet mention-gated mode.
- "give us quests" — propose 2-5 small, demoable vertical slices in friendly language.
- "ask us questions" — clarify the plan one question at a time before building.
- "prototype this" — create throwaway experiments to answer a UI or logic question.
- "debug this" — reproduce first, then diagnose with a feedback loop.
- "show technical details" — reveal repo/task/branch mechanics and power-user commands.

## Agent skills

### Issue tracker

Discord is the human interaction surface; `.project/tasks/*.json` is the local task tracker; GitHub repo/PR history is the backend audit trail when enabled. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical Matt Pocock state roles internally, but translate them into friendly Discord wording by default. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. Read `CONTEXT.md`; create ADRs only for hard-to-reverse, surprising trade-offs. See `docs/agents/domain.md`.

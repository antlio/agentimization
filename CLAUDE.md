# Agentimization

GEO (Generative Engine Optimization) audit CLI. One command, full report on how agent-ready and AI-discoverable your website is.

`npx agentimization https://yoursite.com`

## Structure

Bun workspace monorepo with Turbo:

- `packages/core` — Main `@agentimization/core` npm package. All audit checks, fetching, scoring.
- `packages/shared` — Shared types, schemas, rule definitions.
- `apps/cli` — `agentimization` CLI. Styled terminal output.

## Dev

```bash
bun install
bun run build
bun run typecheck
```

## Rules

Follow the coding rules in the parent CLAUDE.md at /Users/anthonylio/code/antlio/CLAUDE.md.

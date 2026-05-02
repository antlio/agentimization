# agents

guide for ai coding agents working in this repository.

## what this is

agentimization is a geo (generative engine optimization) audit cli. it samples pages of a site, runs 36 checks across 8 categories, and prints a 0 to 100 score with paste-ready fixes.

## structure

- `packages/shared` — types and schemas used by core
- `packages/core` — audit engine, all 36 checks, both remote and local mode
- `apps/cli` — ink-based interactive cli, the published `agentimization` binary
- `apps/landing` — astro static site, deployed to agentimization.com
- `skills/agentimization` — claude code skill spec

## build and test

```bash
bun install
bun run build       # build all workspaces with their respective bundlers
bun run test        # vitest across packages and apps
bun run typecheck   # tsc --noEmit across workspaces
```

## running locally

```bash
bun apps/cli/src/index.ts https://your-site.com   # run from source
node apps/cli/dist/index.js .                     # run the bundled cli
```

## conventions

- typescript strict, no `any`. use `unknown` and narrow.
- arrow functions over `function` declarations.
- comments are short, lowercase, explain *why* not *what*. no em-dashes or semicolons in comments.
- conventional commit subjects (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`).
- one-line commit messages, no co-authored-by trailer, no long description.
- color tokens authored in oklch. converted to hex at the ink boundary via `toInkColor()`.

## release flow

uses [changesets](https://github.com/changesets/changesets):

1. add a changeset with `bunx changeset` describing the change
2. commit the changeset markdown along with your code changes
3. push to `main`
4. github actions opens a "version packages" pr
5. merging that pr publishes both `agentimization` and `@agentimization/core` to npm

## styling

both the cli and the landing page follow the principles in `Design.md`. lowercase prose, narrow column, oklch tokens, animated block-character pattern as the visual centerpiece.

## published packages

- [agentimization](https://www.npmjs.com/package/agentimization) — the cli
- [@agentimization/core](https://www.npmjs.com/package/@agentimization/core) — programmatic api

## landing page

`apps/landing` deploys to [agentimization.com](https://agentimization.com). the site itself must score 100 when audited by agentimization. treat the audit grade as the landing page's success metric.

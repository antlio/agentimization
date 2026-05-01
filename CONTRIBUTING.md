# Contributing

## Setup

```bash
git clone https://github.com/antlio/agentimization
cd agentimization
bun install
```

## Common scripts

```bash
bun run build       # build all workspaces
bun run typecheck   # type-check everything
bun run test        # run vitest across the workspaces
```

To run the CLI from source without building first:

```bash
bun apps/cli/src/index.ts https://your-site.com
```

## Releasing

The repo uses [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

When you make a user-visible change, add a changeset before opening a PR:

```bash
bunx changeset
```

The CLI walks you through:
1. Which packages changed
2. The bump type (patch / minor / major)
3. A short summary that lands in the changelog

This writes a markdown file under `.changeset/`. Commit it with your code.

When the PR merges to `main`, GitHub Actions opens (or updates) a single "Version Packages" PR that consolidates all pending changesets. Merging that PR triggers:
1. Version bumps across `@agentimization/core` and `agentimization` (linked together)
2. `CHANGELOG.md` updates per package
3. Publish to npm
4. Git tag for the new version

## Code style

Follow the rules in [CLAUDE.md](./CLAUDE.md). Highlights:

- TypeScript strict mode, no `any`
- Arrow functions over `function` declarations
- Comments are short, lowercase, explain *why* not *what*
- No em-dashes or semicolons in inline comments
- Conventional commit subjects (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:`, `build:`)

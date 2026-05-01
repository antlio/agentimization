# agentimization

GEO audit for agent-ready websites and projects

## Description

Use when deploying a website, before committing docs changes, or when the user wants to check if their site is discoverable by AI agents (Claude, ChatGPT, Perplexity, etc.). Runs 35 checks across 8 categories: content discoverability, markdown availability, content structure, page size, URL stability, authentication, GEO signals, and agent protocols. Outputs a 0–100 score with actionable fix suggestions.

## Quick Start

Run `npx -y agentimization@latest .` to audit the current project locally.

If the score is below 70, fix the highest-impact failures first — prioritize content discoverability and agent protocols.

Run `npx -y agentimization@latest https://example.com --json` to audit a live site and get structured results.

```bash
# Audit local project
npx -y agentimization@latest .

# Audit a live site
npx -y agentimization@latest https://example.com

# Get JSON output for programmatic use
npx -y agentimization@latest . --json
```

## Commands and Options

| Flag | Purpose |
|------|---------|
| `.` or `./docs` | Scan a local directory |
| `https://...` | Audit a live site over HTTP |
| `--json` | Output raw JSON (for CI/piping) |
| `--md` | Output markdown report (paste into an AI agent) |
| `--category <cat>` | Only run checks in one category |
| `--sample-size <n>` | Number of pages to sample (default: 10) |

## Categories

| Category | What it checks |
|----------|---------------|
| content-discoverability | llms.txt, sitemap, robots.txt |
| markdown-availability | .md URLs, content negotiation |
| content-structure | headings, code fences, tabs |
| page-size | SSR vs CSR, HTML/MD size, boilerplate ratio |
| url-stability | status codes, redirects, caching |
| authentication | auth gates, alternative access |
| geo-signals | structured data, E-E-A-T, citations, FAQ schema |
| agent-protocols | AGENTS.md, MCP server card, API catalog, content signals, Link headers |

## Workflow

1. Run `npx -y agentimization@latest . --json` to get the audit results
2. Parse the JSON output to identify failures and warnings
3. Fix issues by category — start with `content-discoverability` (llms.txt, sitemap) and `agent-protocols` (MCP server card, API catalog) as these have the highest impact
4. For each failed check, the `suggestion` field contains the specific fix
5. Re-run the audit to verify the score improved

## Common Fixes

- **Missing llms.txt**: Create a `llms.txt` at the project root with `# Title`, `> Description`, and `## Section` headings linking to key pages
- **No sitemap**: Generate a `sitemap.xml` listing all public pages
- **No MCP server card**: Add `.well-known/mcp/server-card.json` describing your server's tools and capabilities
- **No structured data**: Add JSON-LD `<script type="application/ld+json">` with Article, WebPage, or Organization schema
- **Client-side rendering**: Use SSR or SSG so AI crawlers can read the HTML without executing JavaScript
- **Missing canonical URLs**: Add `<link rel="canonical" href="...">` to every page

## Metadata

- **name**: agentimization
- **description**: Use when deploying a website, before committing docs changes, or when the user wants to check if their site is discoverable by AI agents. Runs 35 checks across 8 categories and outputs a GEO score with fix suggestions.
- **version**: 0.1.0

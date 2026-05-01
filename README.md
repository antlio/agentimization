<p align="center">
  <img src="https://img.shields.io/npm/v/agentimization?style=flat-square&color=blue" alt="npm version" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/checks-35-purple?style=flat-square" alt="checks" />
</p>

<h1 align="center">agentimization</h1>

<p align="center">
  GEO audit for agent-ready websites.<br/>
  One command to check if AI agents can discover, parse, and cite your content.
</p>

---

## Why

AI agents (Claude, ChatGPT, Perplexity, Gemini) are becoming a major source of traffic and citations. But most websites are invisible to them — no `llms.txt`, no markdown endpoints, no structured data, client-rendered content that crawlers can't read.

**Agentimization** runs checks across 8 categories and gives you a GEO score from 0–100, with specific fixes you can hand off to an AI coding agent.

## Install

```bash
npx agentimization https://your-site.com
```

Or install globally:

```bash
npm install -g agentimization
```

## Usage

### Audit a live site

```bash
agentimization https://docs.anthropic.com
```

```text
╭───────────────────────────────────────────────╮
│ ▓░▒▓░░▒░▓▒░▓▓░▒░▓░░▒▓▒░▓░░▓▒░▓░▒░▓░░▒▓░░     │
│ ░▓▒░▓░░▒▓▒░▓░░▒▓▓░▒░▓▒░░▓▒░▓░▒░░▓▒░░▓░▒      │
│ ▓░▒▓░░▒▓▒░░▓░▒▓▒░░▓░░▓▒░▓░▒░░▓▒░▓░░▒▓░       │
│ ░▒▓░▒░▓▒░░▓░▒▓░░▒▓▒░░▓░▒▓░░▒▓░ agentimization │
│                                               │
│ https://docs.anthropic.com                    │
│                                               │
│ Crawling the site, one sec…                   │
╰───────────────────────────────────────────────╯
```

### Audit a local directory (great for CI)

```bash
agentimization .
agentimization ./docs
```

### Output formats

```bash
# JSON for CI pipelines
agentimization https://example.com --json

# Markdown report — paste into Claude, ChatGPT, etc.
agentimization https://example.com --md

# Filter by category
agentimization https://example.com --category content-discoverability
```

### After the audit

Agentimization shows an interactive menu when the audit finishes:

- **Copy fix prompt to clipboard** — structured markdown an AI coding agent can use to fix your GEO issues
- **Save JSON report** — full audit data written to `agentimization-report.json`
- **Run another URL or path** — keep the session open and audit the next site
- **Exit**

## Checks

Agentimization runs **36 checks** across **8 categories**:

| Category | What it checks |
|---|---|
| **Content Discoverability** | `llms.txt` existence, structure, size, coverage, link resolution. Sitemap presence. `robots.txt` AI agent rules. |
| **Markdown Availability** | `.md` URL support, `Accept: text/markdown` content negotiation, HTML↔markdown parity. |
| **Content Structure** | Code fence validity, heading hierarchy, tabbed content serialization. |
| **Page Size & Rendering** | SSR vs CSR detection, HTML/markdown page size, content start position (boilerplate ratio). |
| **URL Stability** | HTTP status codes, redirect behavior, cache header hygiene. |
| **Authentication & Access** | Auth gate detection, alternative access paths for gated content. |
| **GEO Signals** | Structured data (JSON-LD), citation worthiness, topical authority, content freshness, E-E-A-T signals, FAQ schema, canonical URLs. |
| **Agent Protocols** | AGENTS.md, MCP server card, API catalog (RFC 9727), content signals (AI usage declarations), Link headers (RFC 8288), agent skills index. |

## Scoring

Each check returns **pass**, **warn**, **fail**, **skip**, or **info**. Checks are weighted by importance, and scores roll up into category scores and an overall grade:

| Grade | Score |
|---|---|
| A+ | 95–100 |
| A | 85–94 |
| B | 70–84 |
| C | 55–69 |
| D | 40–54 |
| F | 0–39 |

## Example scores

How popular sites score on Agentimization (approximate, scores change as sites update):

| Site | Grade | Score | Notes |
|---|---|---|---|
| `docs.anthropic.com` | **A** | 88 | Strong `llms.txt`, good markdown, structured data |
| `docs.stripe.com` | **A** | 91 | Excellent discoverability, markdown endpoints, great structure |
| `nextjs.org/docs` | **B** | 76 | Good SSR, missing `llms.txt`, decent GEO signals |
| `react.dev` | **B** | 72 | Good structure, no `llms.txt`, client-heavy rendering |
| `en.wikipedia.org` | **A** | 86 | Great content structure, strong citations, no `llms.txt` |
| `medium.com` | **D** | 45 | Auth gates, weak markdown, no `llms.txt` |
| `substack.com` | **C** | 58 | Mixed access, some content gated |

> These are illustrative examples. Run `agentimization <url>` to get real-time scores.

## Local mode

When you pass a directory path instead of a URL, Agentimization runs in **local mode**:

- Scans your files on disk (HTML, markdown, `llms.txt`, `robots.txt`, `sitemap.xml`)
- Skips network-only checks (content negotiation, auth detection, cache headers, etc.)
- Perfect as a **CI pre-deploy step** — catch GEO regressions before they ship

```bash
# In CI
agentimization . --json
# Exit code 1 if score < 50
```

## Programmatic API

```typescript
import { audit, auditLocal } from "@agentimization/core"

// Remote audit
const result = await audit("https://docs.anthropic.com")
console.log(result.grade, result.overall_score)

// Local audit
const local = await auditLocal("./docs")
console.log(local.grade, local.overall_score)

// With options
const result = await audit("https://example.com", {
  sampleSize: 20,
  categories: ["content-discoverability", "geo-signals"],
  onEvent: (event) => console.log(event),
})
```

## What is GEO?

**Generative Engine Optimization** is like SEO, but for AI. Instead of optimizing for Google's crawlers and ranking algorithm, GEO optimizes for AI agents that need to:

1. **Discover** your content (via `llms.txt`, sitemaps, `robots.txt`)
2. **Parse** it efficiently (markdown availability, clean HTML, SSR)
3. **Cite** it accurately (structured data, canonical URLs, E-E-A-T signals)

Sites that score well on Agentimization are more likely to be surfaced and cited by Claude, ChatGPT, Perplexity, and other generative engines.

## Contributing

```bash
git clone https://github.com/antlio/agentimization
cd agentimization
bun install
bun run build
bun run typecheck
```

The monorepo structure:

```
packages/shared  — Types, schemas, constants
packages/core    — Audit engine + all 36 checks
apps/cli         — CLI (Commander.js + Ink)
```

## License

MIT

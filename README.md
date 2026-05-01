# agentimization

[![npm version](https://img.shields.io/npm/v/agentimization?style=flat-square&color=blue)](https://www.npmjs.com/package/agentimization)

```text
╭───────────────────────────────────────────────╮
│ ▓░▒▓░░▒░▓▒░▓▓░▒░▓░░▒▓▒░▓░░▓▒░▓░▒░▓░░▒▓░░      │
│ ░▓▒░▓░░▒▓▒░▓░░▒▓▓░▒░▓▒░░▓▒░▓░▒░░▓▒░░▓░▒       │
│ ▓░▒▓░░▒▓▒░░▓░▒▓▒░░▓░░▓▒░▓░▒░░▓▒░▓░░▒▓░        │
│ ░▒▓░▒░▓▒░░▓░▒▓░░▒▓▒░░▓░▒▓░░▒▓░ agentimization │
╰───────────────────────────────────────────────╯
```

geo audit for agent-ready websites and projects.

## install

```bash
npx agentimization https://your-site.com
```

## usage

audit a live site:

```bash
agentimization https://docs.your-site.com
```

audit a local directory:

```bash
agentimization .
```

pipe results to a tool or file:

```bash
agentimization https://your-site.com --json > report.json
agentimization https://your-site.com --md | pbcopy
```

## what it checks

36 checks across 8 categories. each one is a thing ai agents need to discover, parse, or cite your content.

- content discoverability: `llms.txt`, sitemap, robots
- markdown availability: `.md` urls, content negotiation
- content structure: headings, code fences, hidden tabs
- page size and rendering: ssr vs csr, boilerplate ratio
- url stability: status codes, redirects, canonicals
- authentication and access: gates, alternative paths
- geo signals: json-ld, citations, freshness, e-e-a-t
- agent protocols: mcp card, api catalog, agents.md, link headers

## how it works

it samples up to 10 pages of your site, runs 36 checks against the html, headers, and well-known files, then weights them into a 0 to 100 score. failed checks come with a suggestion you can paste into your ai coding agent.

## requirements

node 18 or newer.

## programmatic use

```typescript
import { audit } from "@agentimization/core"

const result = await audit("https://your-site.com")
console.log(result.grade, result.overall_score)
```

## license

mit

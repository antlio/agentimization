import type { APIRoute } from "astro"

const body = `# agentimization

geo audit for agent-ready websites.

one command to score how well ai agents can discover, parse, and cite your site. 36 checks, a 0 to 100 grade, and ready-to-paste fixes for whatever's broken.

## install

\`\`\`bash
npx agentimization https://your-site.com
\`\`\`

## how it works

point it at any url. it samples up to 10 pages, runs 36 checks against the html, headers, and well-known files, then weights them into a single score. every failure comes with a suggestion you can paste straight into claude code, cursor, or any ai agent that can edit your repo.

## what it checks

- content discoverability: llms.txt, sitemap, robots
- markdown availability: .md urls, content negotiation
- content structure: headings, code fences, hidden tabs
- page size and rendering: ssr vs csr, boilerplate ratio
- url stability: status codes, redirects, canonicals
- authentication and access: gates, alternative paths
- geo signals: json-ld, citations, freshness, e-e-a-t
- agent protocols: mcp card, api catalog, agents.md, link headers

## programmatic use

\`\`\`typescript
import { audit } from "@agentimization/core"

const result = await audit("https://your-site.com")
console.log(result.grade, result.overall_score)
\`\`\`

## faq

### what is geo?

generative engine optimization. the set of practices that make a website discoverable, parseable, and citable by ai agents like claude, chatgpt, perplexity, and gemini.

it overlaps with seo but the audience is different. seo optimizes for ranking algorithms. geo optimizes for systems that read your content, summarize it, and decide whether to cite you.

### does it work on local directories too?

yes. pass a path instead of a url and it audits the files on disk. useful as a ci pre-deploy step.

\`\`\`bash
agentimization . --json
\`\`\`

### how is the score computed?

each check returns pass, warn, fail, or skip. checks are weighted by impact. the weighted average becomes a 0 to 100 score, mapped to a letter grade.

a failing auth gate caps the overall score at 50, since agents that cannot reach your content cannot read it.

### what's an example fix?

if you fail llms-txt-exists, the suggestion is a copy-paste-ready markdown skeleton with your project's title, blockquote description, and section headings linking to your key pages.

### can i hide it from a category?

yes. pass \`--category content-discoverability\` to only run that one group, or set \`categories\` in the programmatic api.
`

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  })

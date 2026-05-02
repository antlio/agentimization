import type { APIRoute } from "astro"

const body = `# about agentimization

agentimization exists because most websites today are invisible to ai agents. they are designed for humans, search engines, and legacy crawlers. they are not designed for the systems that increasingly decide what to cite, summarize, and recommend.

## what changed

seo optimized for ranking algorithms. those algorithms read your title tag, your headings, your link graph, and ranked you. you could rank well while serving a single-page javascript app, because the crawler eventually rendered it.

generative engines work differently. they fetch your page, parse the html, and decide whether the content is dense, citable, dated, and authoritative enough to surface in a response. if your content is hidden behind a tab, a login, or a slow client-side render, the engine moves on. citing you isn't free for them, so they only cite content that's worth the budget.

## how the score works

agentimization samples up to 10 pages of your site, then runs 36 checks against the html, http headers, and well-known files. each check returns one of: pass, warn, fail, skip, or info. checks are weighted by how much they affect ai-readability.

the weighted average becomes a 0 to 100 score, mapped to a letter grade. a+ for 95 to 100, a for 85 to 94, b for 70 to 84, c for 55 to 69, d for 40 to 54, f for under 40. a failing auth gate caps the overall score at 50, since agents that cannot reach your content cannot read it.

## the eight categories

- content discoverability covers llms.txt, sitemap.xml, and robots.txt. without a well-formed llms.txt, generative engines have no efficient way to learn the shape of your site.
- markdown availability looks for plain .md mirrors of your html pages and proper content negotiation when the Accept header asks for markdown.
- content structure validates code fences, heading hierarchy, and tabbed content. tabs that hide content from non-javascript readers lose information for everyone.
- page size and rendering separates pages that arrive ready to read from pages that need a javascript runtime to assemble themselves.
- url stability checks redirects, canonicals, and that missing pages return a real 404.
- authentication finds gates that block crawlers and looks for alternative public access.
- geo signals covers json-ld, citation worthiness, freshness, and e-e-a-t signals.
- agent protocols probes for mcp/server-card.json, api-catalog, content signals, and rfc 8288 link headers.

## where to go next

head back home (https://agentimization.com) for the install command and the live demo, read the design notes (https://github.com/antlio/agentimization/blob/main/Design.md), or browse the source repository (https://github.com/antlio/agentimization). if you want to extend the cli, the agents guide (https://github.com/antlio/agentimization/blob/main/AGENTS.md) is the fastest path in.
`

export const GET: APIRoute = () =>
  new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  })

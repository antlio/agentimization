# Design

Principles for the agentimization landing page and any future surface that ships under this brand. The goal is a craft-feel close to the best developer tool sites, where the page itself is part of the product.

## Voice

- Headlines are one line. If a headline takes two, the second is the punchline.
- Sentences over 20 words split or get cut.
- No marketing adjectives. Drop "powerful", "intelligent", "comprehensive", "best-in-class".
- Section labels can be lowercase. They feel like notes, not chapter titles.
- Code commands are rendered as commands, not paraphrased in prose.
- The reader is a developer who already runs npm. Skip explanations of what npx does.

## Typography

Two typefaces, no more.

- Body and headings: a humanist geometric sans. Open Runde, Söhne, or similar. Warm but disciplined. Single weight pairing: medium for body, semibold for headings.
- Code and pseudo-UI: a monospace with character. JetBrains Mono or Berkeley Mono. Not Menlo or Courier.

One H1 size, one H2 size, one body size. The hierarchy comes from whitespace and weight, not size proliferation.

Line length capped at 60 to 70 characters. Tabular figures on every numeric value (scores, durations, version numbers).

## Layout

- Single narrow column, around 480px max-width on desktop, centered.
- No persistent navigation chrome. The page is the document. Anchor links if needed.
- Vertical rhythm built from a single base unit (4px). Section gaps are 40px or 80px, never 50 or 60.
- Hairlines (0.5px to 1px) between sections instead of card backgrounds. Boxes only when content needs to be copy-pasteable.
- Whitespace at section boundaries is generous. The reader should feel they have time.

## Hero

- Animated faux-browser composition built from divs. No screenshots, no video.
- Lives above the wordmark. Visual-first hierarchy.
- Slightly oversized. A subtle scale transform pushes it past the column edges. It feels confident without being loud.
- Content references the product's own output. Block-character pattern, score card, streaming check rows. The mock IS the product.
- One animation loop at most. No competing motion in the hero region.

## Color

- Off-white background, near `oklch(0.985 0 0)`.
- Cool greys for body text, around `oklch(0.55 0.02 280)` for body and `oklch(0.4 0.02 280)` for headings.
- One warm accent color. Use it sparingly: highlighted slash command, the install-card border, single CTA chip. Around `oklch(0.92 0.05 80)` background with `oklch(0.45 0.07 50)` text.
- No gradients, no hero images, no decorative shapes.
- All tokens authored in OKLCH for perceptual stability across themes.

## Components

- **Install card.** Tabbed code block. Two tabs: `cli` and `agent prompt`. Soft 14px radius, faint 1-pixel shadow, copy button on hover.
- **Slash-command pill.** Inline rounded chip with the warm accent, used to call out commands like `/audit` mid-sentence.
- **FAQ accordion.** Plain text rows separated by hairlines, expand-collapse via grid-rows transition. No JS framework component.
- **Bullets.** Custom dot column on the left, body text wraps to the right. Not native list styling.
- **Cards.** Reserved for things that need a container: install CTA, FAQ rows, MCP-style config blocks. Everything else is plain text.

## Motion

- Durations between 200ms and 400ms.
- Easing: ease-out for enters, ease-in for exits. Linear is reserved for progress indicators.
- One looping animation at any time.
- Respect `prefers-reduced-motion`. Replace loops with the static end-state, replace transitions with instant changes.

## CTAs

- Primary CTA is the install command in a copy-pasteable card. The user types one thing.
- Secondary CTA is the GitHub link with a star count.
- No "Sign up", "Get started", or modal-driven flows. The product is open and runs locally.

## Agent-readiness baseline

This is the most important section. The site must score 100 when audited by `agentimization` itself. The page is also the proof.

Required behavior:

- Statically rendered HTML. Server-side render or generate at build time. Client-only rendering disqualifies.
- `/llms.txt` listing every section and page with markdown links to their `.md` mirrors.
- `/llms-full.txt` containing the full page content as plain markdown.
- `/sitemap.xml` listing every public URL.
- `/robots.txt` allowing AI bots and declaring content signals (ai-train, ai-input directives).
- `/.well-known/mcp/server-card.json` describing the agentimization audit tool.
- `/.well-known/api-catalog` per RFC 9727 if the site exposes an API.
- `/.well-known/agent-skills/index.json` listing any installable skills.
- `AGENTS.md` in the source repository (not served, the cli skips this for remote audits).

Per page:

- One JSON-LD block. Minimum: WebSite on the home page, SoftwareApplication on product pages, FAQPage where there's a FAQ.
- A canonical `<link rel="canonical">`.
- HTTP `Link` headers per RFC 8288: at least canonical and alternate type=text/markdown.
- Content negotiation. `Accept: text/markdown` returns the page as markdown.
- A `.md` mirror at `/<slug>.md` for every HTML page.
- `Cache-Control: public, max-age=3600, must-revalidate` minimum, never `no-store`.
- Exactly one H1. No skipped heading levels.
- Code fences validly opened and closed.
- No tab UIs hiding content from non-JS readers.
- 404s return 404, not 200 with a "page not found" body.

E-E-A-T signals:

- Author byline on every post and page.
- Visible publish or update date on dated content.
- Expertise markers where relevant (years, certifications, prior work).
- A real About page linked from every page.
- Citations and outbound links to primary sources where claims are made.

If any of these slip, the score drops below 100 and the page stops being a credible demo. Treat the audit grade as the design success metric.

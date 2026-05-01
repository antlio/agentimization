import type { CheckDefinition } from "@agentimization/shared"
import { stripHtml, hasServerRenderedContent, findContentStartPosition } from "../utils/html.js"

const MAX_HTML_CHARS = 50_000
const MAX_MD_CHARS = 50_000

/** Check if pages are server-rendered */
const renderingStrategy: CheckDefinition = {
  id: "rendering-strategy",
  name: "Rendering Strategy",
  category: "page-size",
  description: "Checks if pages contain server-rendered content (vs client-side only)",
  weight: 1.0,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "rendering-strategy",
        name: "Rendering Strategy",
        category: "page-size",
        status: "skip",
        message: "No pages sampled",
      }
    }

    let ssrCount = 0
    for (const page of pages) {
      if (hasServerRenderedContent(page.html)) ssrCount++
    }

    if (ssrCount === pages.length) {
      return {
        id: "rendering-strategy",
        name: "Rendering Strategy",
        category: "page-size",
        status: "pass",
        message: `All ${pages.length} sampled pages contain server-rendered content`,
      }
    }

    const csrCount = pages.length - ssrCount

    return {
      id: "rendering-strategy",
      name: "Rendering Strategy",
      category: "page-size",
      status: csrCount > pages.length / 2 ? "fail" : "warn",
      message: `${csrCount}/${pages.length} pages appear to be client-side rendered only`,
      suggestion: "AI agents and crawlers can't execute JavaScript. Use SSR, SSG, or pre-rendering to ensure your content is in the initial HTML response.",
    }
  },
}

/** Check HTML page sizes */
const pageSizeHtml: CheckDefinition = {
  id: "page-size-html",
  name: "Page Size (HTML)",
  category: "page-size",
  description: "Checks if HTML pages convert to under 50K characters of text content",
  weight: 0.6,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "page-size-html",
        name: "Page Size (HTML)",
        category: "page-size",
        status: "skip",
        message: "No pages sampled",
      }
    }

    const sizes = pages.map((p) => {
      const textContent = stripHtml(p.html)
      const boilerplate = Math.round((1 - textContent.length / Math.max(p.html.length, 1)) * 100)
      return { url: p.url, htmlSize: p.html.length, textSize: textContent.length, boilerplate }
    })

    const overLimit = sizes.filter((s) => s.textSize > MAX_HTML_CHARS)
    const median = sizes.map((s) => s.textSize).sort((a, b) => a - b)[Math.floor(sizes.length / 2)]!
    const avgBoilerplate = Math.round(sizes.reduce((sum, s) => sum + s.boilerplate, 0) / sizes.length)

    if (overLimit.length === 0) {
      return {
        id: "page-size-html",
        name: "Page Size (HTML)",
        category: "page-size",
        status: "pass",
        message: `All ${pages.length} sampled pages convert under ${(MAX_HTML_CHARS / 1000).toFixed(0)}K chars (median ${(median / 1000).toFixed(0)}K, ${avgBoilerplate}% boilerplate)`,
        metadata: { median, avgBoilerplate },
      }
    }

    return {
      id: "page-size-html",
      name: "Page Size (HTML)",
      category: "page-size",
      status: "warn",
      message: `${overLimit.length}/${pages.length} pages exceed ${(MAX_HTML_CHARS / 1000).toFixed(0)}K chars of content`,
      suggestion: "Large pages may be truncated by AI agents. Consider splitting into smaller, focused pages or providing a table of contents.",
      metadata: { overLimit: overLimit.length, median, avgBoilerplate },
    }
  },
}

/** Check markdown page sizes */
const pageSizeMarkdown: CheckDefinition = {
  id: "page-size-markdown",
  name: "Page Size (Markdown)",
  category: "page-size",
  description: "Checks if markdown versions are under 50K characters",
  weight: 0.5,
  run: async (ctx) => {
    const pagesWithMd = ctx.sampledPages.filter((p) => p.markdown).slice(0, 10)
    if (pagesWithMd.length === 0) {
      return {
        id: "page-size-markdown",
        name: "Page Size (Markdown)",
        category: "page-size",
        status: "skip",
        message: "No markdown versions available",
      }
    }

    const sizes = pagesWithMd.map((p) => ({ url: p.url, size: p.markdown!.length }))
    const overLimit = sizes.filter((s) => s.size > MAX_MD_CHARS)
    const median = sizes.map((s) => s.size).sort((a, b) => a - b)[Math.floor(sizes.length / 2)]!
    const max = Math.max(...sizes.map((s) => s.size))

    if (overLimit.length === 0) {
      return {
        id: "page-size-markdown",
        name: "Page Size (Markdown)",
        category: "page-size",
        status: "pass",
        message: `All ${pagesWithMd.length} pages under ${(MAX_MD_CHARS / 1000).toFixed(0)}K chars (median ${(median / 1000).toFixed(0)}K, max ${(max / 1000).toFixed(0)}K)`,
        metadata: { median, max },
      }
    }

    return {
      id: "page-size-markdown",
      name: "Page Size (Markdown)",
      category: "page-size",
      status: "warn",
      message: `${overLimit.length}/${pagesWithMd.length} markdown pages exceed ${(MAX_MD_CHARS / 1000).toFixed(0)}K chars`,
      suggestion: "Split large markdown pages into smaller sections to avoid AI agent context window truncation.",
    }
  },
}

/** Check where main content starts on the page */
const contentStartPosition: CheckDefinition = {
  id: "content-start-position",
  name: "Content Start Position",
  category: "page-size",
  description: "Checks if main content starts within the first 10% of the HTML",
  weight: 0.5,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "content-start-position",
        name: "Content Start Position",
        category: "page-size",
        status: "skip",
        message: "No pages sampled",
      }
    }

    const positions = pages.map((p) => ({
      url: p.url,
      position: findContentStartPosition(p.html),
    }))

    const earlyStart = positions.filter((p) => p.position <= 0.10)
    const medianPct = Math.round(
      positions.map((p) => p.position).sort((a, b) => a - b)[Math.floor(positions.length / 2)]! * 100,
    )

    if (earlyStart.length === pages.length) {
      return {
        id: "content-start-position",
        name: "Content Start Position",
        category: "page-size",
        status: "pass",
        message: `Content starts within first 10% on all ${pages.length} sampled pages (median ${medianPct}%)`,
        metadata: { medianPct },
      }
    }

    return {
      id: "content-start-position",
      name: "Content Start Position",
      category: "page-size",
      status: "warn",
      message: `Content starts late on ${pages.length - earlyStart.length}/${pages.length} pages (median ${medianPct}%)`,
      suggestion: "Move main content higher in the HTML. AI agents may waste context window tokens on navigation, headers, and boilerplate before reaching actual content.",
      metadata: { medianPct, earlyStart: earlyStart.length },
    }
  },
}

export const pageSizeChecks: CheckDefinition[] = [
  renderingStrategy,
  pageSizeHtml,
  pageSizeMarkdown,
  contentStartPosition,
]

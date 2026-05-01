import type { CheckDefinition, CheckResult, AuditContext } from "@agentimization/shared"

/** Check if llms.txt exists */
const llmsTxtExists: CheckDefinition = {
  id: "llms-txt-exists",
  name: "llms.txt Exists",
  category: "content-discoverability",
  description: "Checks if llms.txt is present at the site root",
  weight: 1.0,
  run: async (ctx) => {
    if (ctx.llmsTxt) {
      return {
        id: "llms-txt-exists",
        name: "llms.txt Exists",
        category: "content-discoverability",
        status: "pass",
        message: ctx.mode === "local"
          ? "llms.txt found in project root"
          : `llms.txt found at ${ctx.baseUrl.origin}/llms.txt`,
      }
    }
    return {
      id: "llms-txt-exists",
      name: "llms.txt Exists",
      category: "content-discoverability",
      status: "fail",
      message: "No llms.txt found at site root",
      suggestion: "Create a /llms.txt file that describes your site for AI agents. See https://llmstxt.org for the specification.",
    }
  },
}

/** Check if llms.txt follows the proposed structure */
const llmsTxtValid: CheckDefinition = {
  id: "llms-txt-valid",
  name: "llms.txt Valid Structure",
  category: "content-discoverability",
  description: "Checks if llms.txt follows the proposed structure (H1, blockquote, heading-delimited link sections)",
  weight: 0.8,
  run: async (ctx) => {
    if (!ctx.llmsTxt) {
      return {
        id: "llms-txt-valid",
        name: "llms.txt Valid Structure",
        category: "content-discoverability",
        status: "skip",
        message: "Skipped — no llms.txt found",
      }
    }

    const issues: string[] = []
    const lines = ctx.llmsTxt.split("\n")

    const hasH1 = lines.some((l) => /^#\s+/.test(l))
    if (!hasH1) issues.push("Missing H1 title")

    const hasBlockquote = lines.some((l) => /^>\s+/.test(l))
    if (!hasBlockquote) issues.push("Missing blockquote description")

    const hasHeadingSections = lines.some((l) => /^##\s+/.test(l))
    if (!hasHeadingSections) issues.push("Missing ## section headings")

    const hasLinks = /\[.+\]\(.+\)/.test(ctx.llmsTxt)
    if (!hasLinks) issues.push("No markdown links found")

    if (issues.length === 0) {
      return {
        id: "llms-txt-valid",
        name: "llms.txt Valid Structure",
        category: "content-discoverability",
        status: "pass",
        message: "llms.txt follows the proposed structure (H1, blockquote, heading-delimited link sections)",
      }
    }

    return {
      id: "llms-txt-valid",
      name: "llms.txt Valid Structure",
      category: "content-discoverability",
      status: issues.length <= 1 ? "warn" : "fail",
      message: `llms.txt structure issues: ${issues.join(", ")}`,
      suggestion: "Follow the llms.txt spec: start with # Title, > Description, then ## Sections with [links](url).",
    }
  },
}

/** Check llms.txt file size */
const llmsTxtSize: CheckDefinition = {
  id: "llms-txt-size",
  name: "llms.txt Size",
  category: "content-discoverability",
  description: "Checks if llms.txt is under the 50,000 character threshold",
  weight: 0.5,
  run: async (ctx) => {
    if (!ctx.llmsTxt) {
      return {
        id: "llms-txt-size",
        name: "llms.txt Size",
        category: "content-discoverability",
        status: "skip",
        message: "Skipped — no llms.txt found",
      }
    }

    const size = ctx.llmsTxt.length

    if (size <= 50_000) {
      return {
        id: "llms-txt-size",
        name: "llms.txt Size",
        category: "content-discoverability",
        status: "pass",
        message: `llms.txt is ${size.toLocaleString()} characters (under 50,000 threshold)`,
        metadata: { size },
      }
    }

    return {
      id: "llms-txt-size",
      name: "llms.txt Size",
      category: "content-discoverability",
      status: "warn",
      message: `llms.txt is ${size.toLocaleString()} characters (over 50,000 threshold)`,
      suggestion: "Consider splitting into llms.txt (summary) and llms-full.txt (complete reference).",
      metadata: { size },
    }
  },
}

/** Check llms.txt coverage vs sitemap */
const llmsTxtFreshness: CheckDefinition = {
  id: "llms-txt-freshness",
  name: "llms.txt Coverage",
  category: "content-discoverability",
  description: "Checks how many sitemap pages are referenced in llms.txt",
  weight: 0.7,
  run: async (ctx) => {
    if (!ctx.llmsTxt) {
      return {
        id: "llms-txt-freshness",
        name: "llms.txt Coverage",
        category: "content-discoverability",
        status: "skip",
        message: "Skipped — no llms.txt found",
      }
    }

    if (ctx.sitemapUrls.length === 0) {
      return {
        id: "llms-txt-freshness",
        name: "llms.txt Coverage",
        category: "content-discoverability",
        status: "info",
        message: "No sitemap found to compare coverage against",
      }
    }

    // sites split llms.txt and sitemap across subdomains so we match by registrable domain
    const sharedRegistrable = (a: string, b: string): boolean => {
      if (a === b) return true
      const aParts = a.split(".")
      const bParts = b.split(".")
      const tail = (parts: string[]) => parts.slice(-2).join(".")
      return aParts.length >= 2 && bParts.length >= 2 && tail(aParts) === tail(bParts)
    }

    // returns null for cross-site or unparseable urls
    const keyFor = (raw: string): string | null => {
      try {
        const u = new URL(raw, ctx.baseUrl.origin)
        if (!sharedRegistrable(u.hostname, ctx.baseUrl.hostname)) return null
        // normalize so /page /page/ /page.md all collapse to one key
        let path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname
        path = path.replace(/\.(md|mdx|markdown)$/i, "")
        return path.toLowerCase()
      } catch {
        return null
      }
    }

    const linkRegex = /\[.+?\]\(([^)]+)\)/g
    const llmsKeys = new Set<string>()
    let match
    while ((match = linkRegex.exec(ctx.llmsTxt)) !== null) {
      const k = keyFor(match[1]!)
      if (k) llmsKeys.add(k)
    }

    const sitemapKeys = new Set<string>()
    for (const u of ctx.sitemapUrls) {
      const k = keyFor(u)
      if (k) sitemapKeys.add(k)
    }

    if (sitemapKeys.size === 0 || llmsKeys.size === 0) {
      return {
        id: "llms-txt-freshness",
        name: "llms.txt Coverage",
        category: "content-discoverability",
        status: "skip",
        message: "Not enough same-origin pages to compare llms.txt and sitemap",
      }
    }

    // freshness: are llms.txt entries still live in sitemap, coverage: are sitemap docs in llms.txt
    const llmsInSitemap = [...llmsKeys].filter((k) => sitemapKeys.has(k)).length
    const sitemapInLlms = [...sitemapKeys].filter((k) => llmsKeys.has(k)).length
    const freshnessPct = Math.round((llmsInSitemap / llmsKeys.size) * 100)
    const coveragePct = Math.round((sitemapInLlms / sitemapKeys.size) * 100)

    const message =
      `llms.txt covers ${coveragePct}% of ${sitemapKeys.size} sitemap pages` +
      `; ${freshnessPct}% of llms.txt links resolve in sitemap`

    if (coveragePct >= 70 && freshnessPct >= 90) {
      return {
        id: "llms-txt-freshness",
        name: "llms.txt Coverage",
        category: "content-discoverability",
        status: "pass",
        message,
        metadata: { coveragePct, freshnessPct, llmsCount: llmsKeys.size, sitemapCount: sitemapKeys.size },
      }
    }

    const missingFromLlms = sitemapKeys.size - sitemapInLlms
    const staleInLlms = llmsKeys.size - llmsInSitemap

    return {
      id: "llms-txt-freshness",
      name: "llms.txt Coverage",
      category: "content-discoverability",
      status: coveragePct >= 40 || freshnessPct >= 70 ? "warn" : "fail",
      message: `${message}${missingFromLlms > 0 ? ` · ${missingFromLlms} sitemap pages not in llms.txt` : ""}${staleInLlms > 0 ? ` · ${staleInLlms} llms.txt links not in sitemap` : ""}`,
      suggestion: coveragePct < freshnessPct
        ? "Add missing sitemap pages to llms.txt to improve AI agent discoverability."
        : "Some llms.txt links aren't in the sitemap — they may be stale or your sitemap may be incomplete.",
      metadata: {
        coveragePct, freshnessPct,
        llmsCount: llmsKeys.size, sitemapCount: sitemapKeys.size,
        missingFromLlms, staleInLlms,
      },
    }
  },
}

/** Check if llms.txt links resolve */
const llmsTxtLinksResolve: CheckDefinition = {
  id: "llms-txt-links-resolve",
  name: "llms.txt Links Resolve",
  category: "content-discoverability",
  description: "Checks if links in llms.txt return 200 OK",
  weight: 0.8,
  requiresNetwork: true,
  run: async (ctx) => {
    if (!ctx.llmsTxt) {
      return {
        id: "llms-txt-links-resolve",
        name: "llms.txt Links Resolve",
        category: "content-discoverability",
        status: "skip",
        message: "Skipped — no llms.txt found",
      }
    }

    const linkRegex = /\[.+?\]\(([^)]+)\)/g
    const urls: string[] = []
    let match
    while ((match = linkRegex.exec(ctx.llmsTxt)) !== null) {
      try {
        const resolved = new URL(match[1]!, ctx.baseUrl.origin)
        if (resolved.origin === ctx.baseUrl.origin) {
          urls.push(resolved.href)
        }
      } catch {
        // skip
      }
    }

    if (urls.length === 0) {
      return {
        id: "llms-txt-links-resolve",
        name: "llms.txt Links Resolve",
        category: "content-discoverability",
        status: "info",
        message: "No same-origin links found in llms.txt",
      }
    }

    const sampled = urls.slice(0, 10)
    const results = await Promise.allSettled(
      sampled.map(async (url) => {
        const resp = await fetch(url, { method: "HEAD", redirect: "follow" })
        return { url, status: resp.status }
      }),
    )

    const resolved = results.filter(
      (r) => r.status === "fulfilled" && r.value.status >= 200 && r.value.status < 400,
    ).length

    if (resolved === sampled.length) {
      return {
        id: "llms-txt-links-resolve",
        name: "llms.txt Links Resolve",
        category: "content-discoverability",
        status: "pass",
        message: `All ${resolved} sampled same-origin links resolve (${urls.length} total links)`,
        metadata: { resolved, sampled: sampled.length, total: urls.length },
      }
    }

    return {
      id: "llms-txt-links-resolve",
      name: "llms.txt Links Resolve",
      category: "content-discoverability",
      status: "fail",
      message: `${resolved}/${sampled.length} sampled links resolve — ${sampled.length - resolved} broken`,
      suggestion: "Fix broken links in llms.txt. AI agents will fail to fetch these pages.",
      metadata: { resolved, sampled: sampled.length, total: urls.length },
    }
  },
}

/** Check if llms.txt links point to markdown-friendly URLs */
const llmsTxtLinksMarkdown: CheckDefinition = {
  id: "llms-txt-links-markdown",
  name: "llms.txt Links Markdown",
  category: "content-discoverability",
  description: "Checks how many links in llms.txt point to .md URLs (or markdown-able paths)",
  weight: 0.6,
  run: async (ctx) => {
    if (!ctx.llmsTxt) {
      return {
        id: "llms-txt-links-markdown",
        name: "llms.txt Links Markdown",
        category: "content-discoverability",
        status: "skip",
        message: "Skipped — no llms.txt found",
      }
    }

    const linkRegex = /\[.+?\]\(([^)]+)\)/g
    const urls: string[] = []
    let m
    while ((m = linkRegex.exec(ctx.llmsTxt)) !== null) {
      urls.push(m[1]!)
    }

    if (urls.length === 0) {
      return {
        id: "llms-txt-links-markdown",
        name: "llms.txt Links Markdown",
        category: "content-discoverability",
        status: "info",
        message: "No links found in llms.txt",
      }
    }

    const isMd = (u: string): boolean => {
      try {
        const parsed = new URL(u, ctx.baseUrl.origin)
        const path = parsed.pathname.toLowerCase()
        return path.endsWith(".md") || path.endsWith(".mdx") || path.endsWith(".markdown")
      } catch {
        return /\.mdx?$/i.test(u)
      }
    }

    const mdLinks = urls.filter(isMd).length
    const pct = Math.round((mdLinks / urls.length) * 100)

    if (pct >= 80) {
      return {
        id: "llms-txt-links-markdown",
        name: "llms.txt Links Markdown",
        category: "content-discoverability",
        status: "pass",
        message: `${mdLinks}/${urls.length} llms.txt links point to .md URLs (${pct}%)`,
        metadata: { mdLinks, total: urls.length, pct },
      }
    }

    if (pct >= 30) {
      return {
        id: "llms-txt-links-markdown",
        name: "llms.txt Links Markdown",
        category: "content-discoverability",
        status: "warn",
        message: `${mdLinks}/${urls.length} llms.txt links point to .md URLs (${pct}%)`,
        suggestion: "Point llms.txt links to .md URLs (or markdown-able paths) so agents fetch parseable content directly instead of HTML they have to scrape.",
        metadata: { mdLinks, total: urls.length, pct },
      }
    }

    return {
      id: "llms-txt-links-markdown",
      name: "llms.txt Links Markdown",
      category: "content-discoverability",
      status: "fail",
      message: `Only ${mdLinks}/${urls.length} llms.txt links point to .md URLs (${pct}%)`,
      suggestion: "Most llms.txt links are HTML-only. Serve a markdown version at .md URLs and link to those — agents get cleaner content and fewer parse failures.",
      metadata: { mdLinks, total: urls.length, pct },
    }
  },
}

/** Check if sitemap exists */
const sitemapExists: CheckDefinition = {
  id: "sitemap-exists",
  name: "Sitemap Exists",
  category: "content-discoverability",
  description: "Checks if sitemap.xml is present",
  weight: 0.7,
  run: async (ctx) => {
    if (ctx.sitemapXml) {
      return {
        id: "sitemap-exists",
        name: "Sitemap Exists",
        category: "content-discoverability",
        status: "pass",
        message: `sitemap.xml found with ${ctx.sitemapUrls.length} URLs`,
        metadata: { urlCount: ctx.sitemapUrls.length },
      }
    }

    return {
      id: "sitemap-exists",
      name: "Sitemap Exists",
      category: "content-discoverability",
      status: "fail",
      message: "No sitemap.xml found",
      suggestion: "Create a /sitemap.xml to help AI agents discover all pages on your site.",
    }
  },
}

/** Check robots.txt for AI agent rules */
const robotsTxtAgentRules: CheckDefinition = {
  id: "robots-txt-agent-rules",
  name: "robots.txt AI Agent Rules",
  category: "content-discoverability",
  description: "Checks if robots.txt has specific rules for AI agents/crawlers",
  weight: 0.6,
  run: async (ctx) => {
    if (!ctx.robotsTxt) {
      return {
        id: "robots-txt-agent-rules",
        name: "robots.txt AI Agent Rules",
        category: "content-discoverability",
        status: "warn",
        message: "No robots.txt found",
        suggestion: "Create a /robots.txt. Without it, AI agents may not know what they're allowed to crawl.",
      }
    }

    const aiAgents = [
      "GPTBot", "ChatGPT-User", "Claude-Web", "ClaudeBot",
      "Anthropic", "Google-Extended", "PerplexityBot", "Bytespider",
      "CCBot", "cohere-ai",
    ]

    const blocked: string[] = []
    const allowed: string[] = []
    const lines = ctx.robotsTxt.split("\n")
    let currentAgent = ""

    for (const line of lines) {
      const agentMatch = line.match(/^User-agent:\s*(.+)/i)
      if (agentMatch) {
        currentAgent = agentMatch[1]!.trim()
        continue
      }

      const matchedAgent = aiAgents.find(
        (a) => currentAgent === a || currentAgent === "*",
      )
      if (!matchedAgent) continue

      if (/^Disallow:\s*\/\s*$/i.test(line) && currentAgent !== "*") {
        blocked.push(currentAgent)
      } else if (/^Allow:\s*\//i.test(line) && currentAgent !== "*") {
        allowed.push(currentAgent)
      }
    }

    if (blocked.length > 0) {
      return {
        id: "robots-txt-agent-rules",
        name: "robots.txt AI Agent Rules",
        category: "content-discoverability",
        status: "warn",
        message: `AI agents blocked: ${blocked.join(", ")}`,
        suggestion: "Consider allowing AI agents to crawl your site for better GEO visibility. Blocked agents can't index your content for AI-powered search.",
        metadata: { blocked, allowed },
      }
    }

    return {
      id: "robots-txt-agent-rules",
      name: "robots.txt AI Agent Rules",
      category: "content-discoverability",
      status: "pass",
      message: `robots.txt present. No AI agents explicitly blocked.${allowed.length > 0 ? ` Explicitly allowed: ${allowed.join(", ")}` : ""}`,
      metadata: { blocked, allowed },
    }
  },
}

export const contentDiscoverabilityChecks: CheckDefinition[] = [
  llmsTxtExists,
  llmsTxtValid,
  llmsTxtSize,
  llmsTxtFreshness,
  llmsTxtLinksResolve,
  llmsTxtLinksMarkdown,
  sitemapExists,
  robotsTxtAgentRules,
]

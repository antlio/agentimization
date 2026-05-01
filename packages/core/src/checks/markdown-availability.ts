import type { CheckDefinition, AuditContext } from "@agentimization/shared"
import { fetchWithContentNegotiation } from "../utils/fetch.js"

/** Check if pages support .md URL variants */
const markdownUrlSupport: CheckDefinition = {
  id: "markdown-url-support",
  name: "Markdown URL Support",
  category: "markdown-availability",
  description: "Checks if pages serve markdown when .md is appended to the URL",
  weight: 0.8,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "markdown-url-support",
        name: "Markdown URL Support",
        category: "markdown-availability",
        status: "skip",
        message: "No pages sampled",
      }
    }

    let supported = 0
    for (const page of pages) {
      const mdUrl = page.url.replace(/\/?$/, ".md")
      const result = await fetchWithContentNegotiation(mdUrl, "text/markdown")
      if (result && result.statusCode === 200 && result.text.length > 50) {
        supported++
      }
    }

    const pct = Math.round((supported / pages.length) * 100)

    if (supported === pages.length) {
      return {
        id: "markdown-url-support",
        name: "Markdown URL Support",
        category: "markdown-availability",
        status: "pass",
        message: `${supported}/${pages.length} sampled pages support .md URLs (${pct}%)`,
        metadata: { supported, total: pages.length },
      }
    }

    return {
      id: "markdown-url-support",
      name: "Markdown URL Support",
      category: "markdown-availability",
      status: supported > 0 ? "warn" : "fail",
      message: `${supported}/${pages.length} sampled pages support .md URLs (${pct}%)`,
      suggestion: "Serve markdown versions of pages at {url}.md — this makes content easily consumable by AI agents without HTML parsing.",
      metadata: { supported, total: pages.length },
    }
  },
}

/** Check if pages support content negotiation (Accept: text/markdown) */
const contentNegotiation: CheckDefinition = {
  id: "content-negotiation",
  name: "Content Negotiation",
  category: "markdown-availability",
  description: "Checks if pages serve markdown when Accept: text/markdown is sent",
  weight: 0.7,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "content-negotiation",
        name: "Content Negotiation",
        category: "markdown-availability",
        status: "skip",
        message: "No pages sampled",
      }
    }

    let supported = 0
    for (const page of pages) {
      const result = await fetchWithContentNegotiation(page.url, "text/markdown")
      if (
        result &&
        result.statusCode === 200 &&
        (result.contentType.includes("text/markdown") || result.contentType.includes("text/plain"))
      ) {
        supported++
      }
    }

    const pct = Math.round((supported / pages.length) * 100)

    if (supported === pages.length) {
      return {
        id: "content-negotiation",
        name: "Content Negotiation",
        category: "markdown-availability",
        status: "pass",
        message: `${supported}/${pages.length} sampled pages support content negotiation (${pct}%)`,
        metadata: { supported, total: pages.length },
      }
    }

    return {
      id: "content-negotiation",
      name: "Content Negotiation",
      category: "markdown-availability",
      status: supported > 0 ? "warn" : "info",
      message: `${supported}/${pages.length} sampled pages support content negotiation (${pct}%)`,
      suggestion: "Implement content negotiation: when an AI agent sends Accept: text/markdown, respond with a markdown version of the page.",
      metadata: { supported, total: pages.length },
    }
  },
}

/** Check if markdown content matches HTML content */
const markdownContentParity: CheckDefinition = {
  id: "markdown-content-parity",
  name: "Markdown Content Parity",
  category: "markdown-availability",
  description: "Checks if markdown versions contain equivalent content to HTML versions",
  weight: 0.6,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    const pagesWithMarkdown = pages.filter((p) => p.markdown)

    if (pagesWithMarkdown.length === 0) {
      return {
        id: "markdown-content-parity",
        name: "Markdown Content Parity",
        category: "markdown-availability",
        status: "skip",
        message: "No pages with markdown versions found",
      }
    }

    // word count is a cheap proxy for content parity
    let totalMissing = 0
    let checked = 0

    for (const page of pagesWithMarkdown) {
      if (!page.markdown) continue
      checked++

      const htmlText = page.html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      const htmlWords = new Set(htmlText.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
      const mdWords = new Set(page.markdown.toLowerCase().split(/\s+/).filter((w) => w.length > 3))

      const missingWords = [...htmlWords].filter((w) => !mdWords.has(w))
      const missingPct = htmlWords.size > 0 ? (missingWords.length / htmlWords.size) * 100 : 0
      totalMissing += missingPct
    }

    const avgMissing = checked > 0 ? Math.round(totalMissing / checked) : 0

    if (avgMissing <= 5) {
      return {
        id: "markdown-content-parity",
        name: "Markdown Content Parity",
        category: "markdown-availability",
        status: "pass",
        message: `All ${checked} pages have equivalent markdown and HTML content (avg ${avgMissing}% missing)`,
        metadata: { checked, avgMissing },
      }
    }

    return {
      id: "markdown-content-parity",
      name: "Markdown Content Parity",
      category: "markdown-availability",
      status: avgMissing <= 15 ? "warn" : "fail",
      message: `Markdown versions are missing ~${avgMissing}% of HTML content on average`,
      suggestion: "Ensure markdown versions include all meaningful content from the HTML page. Missing content means AI agents get an incomplete picture.",
      metadata: { checked, avgMissing },
    }
  },
}

export const markdownAvailabilityChecks: CheckDefinition[] = [
  markdownUrlSupport,
  contentNegotiation,
  markdownContentParity,
]

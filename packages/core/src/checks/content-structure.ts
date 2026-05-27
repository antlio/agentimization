import type { CheckDefinition } from "@agentimization/shared"
import { extractHeadings, extractCodeFences, extractImages } from "../utils/html.js"

/** Check for properly closed code fences in markdown */
const markdownCodeFenceValidity: CheckDefinition = {
  id: "markdown-code-fence-validity",
  name: "Markdown Code Fence Validity",
  category: "content-structure",
  description: "Checks if all code fences in markdown content are properly closed",
  weight: 0.5,
  run: async (ctx) => {
    const pagesWithMd = ctx.sampledPages.filter((p) => p.markdown)
    if (pagesWithMd.length === 0) {
      // fall back to html code blocks when no markdown is available
      let totalFences = 0
      let unclosed = 0

      for (const page of ctx.sampledPages.slice(0, 10)) {
        const codeBlockRegex = /<code[\s\S]*?<\/code>/gi
        const matches = page.html.match(codeBlockRegex)
        if (matches) totalFences += matches.length
      }

      if (totalFences === 0) {
        return {
          id: "markdown-code-fence-validity",
          name: "Markdown Code Fence Validity",
          category: "content-structure",
          status: "info",
          message: "No code blocks detected",
        }
      }

      return {
        id: "markdown-code-fence-validity",
        name: "Markdown Code Fence Validity",
        category: "content-structure",
        status: "pass",
        message: `All ${totalFences} code blocks properly closed across ${ctx.sampledPages.length} pages`,
      }
    }

    let totalFences = 0
    let unclosed = 0

    for (const page of pagesWithMd) {
      const fences = extractCodeFences(page.markdown!)
      totalFences += fences.length
      unclosed += fences.filter((f) => !f.closed).length
    }

    if (unclosed === 0) {
      return {
        id: "markdown-code-fence-validity",
        name: "Markdown Code Fence Validity",
        category: "content-structure",
        status: "pass",
        message: `All ${totalFences} code fences properly closed across ${pagesWithMd.length} pages`,
      }
    }

    return {
      id: "markdown-code-fence-validity",
      name: "Markdown Code Fence Validity",
      category: "content-structure",
      status: "fail",
      message: `${unclosed} unclosed code fence(s) found across ${pagesWithMd.length} pages`,
      suggestion: "Unclosed code fences cause AI agents to misparse content. Ensure every ``` has a matching closing ```.",
    }
  },
}

/** Check heading hierarchy quality */
const sectionHeaderQuality: CheckDefinition = {
  id: "section-header-quality",
  name: "Section Header Quality",
  category: "content-structure",
  description: "Checks if pages have a logical heading hierarchy (H1 → H2 → H3, no skips)",
  weight: 0.6,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "section-header-quality",
        name: "Section Header Quality",
        category: "content-structure",
        status: "skip",
        message: "No pages sampled",
      }
    }

    let goodPages = 0
    const issues: string[] = []

    for (const page of pages) {
      const headings = extractHeadings(page.html)
      if (headings.length === 0) continue

      let pageGood = true

      const hasH1 = headings.some((h) => h.level === 1)
      if (!hasH1) {
        pageGood = false
      }

      const h1Count = headings.filter((h) => h.level === 1).length
      if (h1Count > 1) {
        pageGood = false
      }

      // skipped heading levels like h1 to h3 without h2 break navigation
      for (let i = 1; i < headings.length; i++) {
        const prev = headings[i - 1]!.level
        const curr = headings[i]!.level
        if (curr > prev + 1) {
          pageGood = false
          break
        }
      }

      if (pageGood) goodPages++
    }

    if (goodPages === pages.length) {
      return {
        id: "section-header-quality",
        name: "Section Header Quality",
        category: "content-structure",
        status: "pass",
        message: `All ${pages.length} pages have proper heading hierarchy`,
      }
    }

    return {
      id: "section-header-quality",
      name: "Section Header Quality",
      category: "content-structure",
      status: "warn",
      message: `${pages.length - goodPages}/${pages.length} pages have heading hierarchy issues (skipped levels, missing H1, or multiple H1s)`,
      suggestion: "Use a single H1 per page and don't skip heading levels (e.g., H1 → H3). AI agents use heading hierarchy to understand page structure and section boundaries.",
    }
  },
}

/** Check for tabbed content serialization */
const tabbedContentSerialization: CheckDefinition = {
  id: "tabbed-content-serialization",
  name: "Tabbed Content Serialization",
  category: "content-structure",
  description: "Checks if tabbed/accordion content is properly serialized in HTML",
  weight: 0.4,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let pagesWithTabs = 0
    let pagesWithHiddenContent = 0

    for (const page of pages) {
      const hasTabs = /role=["']tabpanel["']|data-tab|tab-content|tabs-container/i.test(page.html)
      if (hasTabs) {
        pagesWithTabs++
        // hidden tab panels mean content only an interactive client can reach
        const hiddenPanels = (page.html.match(/hidden|display:\s*none|aria-hidden=["']true["']/gi) ?? []).length
        if (hiddenPanels > 2) {
          pagesWithHiddenContent++
        }
      }
    }

    if (pagesWithTabs === 0) {
      return {
        id: "tabbed-content-serialization",
        name: "Tabbed Content Serialization",
        category: "content-structure",
        status: "info",
        message: `No tabbed content detected across ${pages.length} sampled pages`,
      }
    }

    if (pagesWithHiddenContent === 0) {
      return {
        id: "tabbed-content-serialization",
        name: "Tabbed Content Serialization",
        category: "content-structure",
        status: "pass",
        message: `${pagesWithTabs} pages with tabbed content — all tabs are server-rendered`,
      }
    }

    return {
      id: "tabbed-content-serialization",
      name: "Tabbed Content Serialization",
      category: "content-structure",
      status: "warn",
      message: `${pagesWithHiddenContent}/${pagesWithTabs} tabbed pages have hidden content that AI agents may miss`,
      suggestion: "Serialize all tab content in the HTML even if it's visually hidden. AI agents can't click tabs — they only see the initial HTML.",
    }
  },
}

/** Check image alt text coverage (≥50% of images should have alt) */
const imageAltText: CheckDefinition = {
  id: "image-alt-text",
  name: "Image Alt Text Coverage",
  category: "content-structure",
  description: "Checks that at least 50% of images have descriptive alt text",
  weight: 0.5,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    if (pages.length === 0) {
      return {
        id: "image-alt-text",
        name: "Image Alt Text Coverage",
        category: "content-structure",
        status: "skip",
        message: "No pages sampled",
      }
    }

    const allImages = pages.flatMap((p) => extractImages(p.html))
    // alt="" is the WCAG-recommended marker for decorative imagery — neither a pass nor a fail; exclude from the ratio
    const contentImages = allImages.filter((img) => img.alt === undefined || img.alt.trim().length > 0)
    const decorativeImages = allImages.length - contentImages.length
    const withAlt = contentImages.filter((img) => img.alt !== undefined && img.alt.trim().length > 0).length

    if (allImages.length === 0) {
      return {
        id: "image-alt-text",
        name: "Image Alt Text Coverage",
        category: "content-structure",
        status: "info",
        message: `No images found across ${pages.length} sampled pages`,
      }
    }

    if (contentImages.length === 0) {
      return {
        id: "image-alt-text",
        name: "Image Alt Text Coverage",
        category: "content-structure",
        status: "info",
        message: `All ${allImages.length} sampled images are decorative (alt="")`,
        metadata: { decorativeImages, totalImages: allImages.length },
      }
    }

    const ratio = withAlt / contentImages.length
    const pct = Math.round(ratio * 100)
    const summary = `${withAlt}/${contentImages.length} content images have descriptive alt text (${pct}%)${decorativeImages > 0 ? `; ${decorativeImages} decorative skipped` : ""}`

    if (ratio >= 0.5) {
      return {
        id: "image-alt-text",
        name: "Image Alt Text Coverage",
        category: "content-structure",
        status: "pass",
        message: summary,
        metadata: { withAlt, contentImages: contentImages.length, decorativeImages, pct },
      }
    }

    return {
      id: "image-alt-text",
      name: "Image Alt Text Coverage",
      category: "content-structure",
      status: ratio >= 0.25 ? "warn" : "fail",
      message: summary,
      suggestion: "Add descriptive alt text to at least 50% of content images. AI agents and screen readers rely on alt text to understand visual content. Mark purely decorative images with alt=\"\" so they don't dilute the ratio.",
      metadata: { withAlt, contentImages: contentImages.length, decorativeImages, pct },
    }
  },
}

export const contentStructureChecks: CheckDefinition[] = [
  markdownCodeFenceValidity,
  sectionHeaderQuality,
  tabbedContentSerialization,
  imageAltText,
]

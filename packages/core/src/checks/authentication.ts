import type { CheckDefinition } from "@agentimization/shared"

/** Check if pages are publicly accessible (no auth gate) */
const authGateDetection: CheckDefinition = {
  id: "auth-gate-detection",
  name: "Auth Gate Detection",
  category: "authentication",
  description: "Checks if pages are publicly accessible without authentication",
  weight: 0.9,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let gated = 0
    const gatedUrls: string[] = []

    for (const page of pages) {
      const isGated =
        page.statusCode === 401 ||
        page.statusCode === 403 ||
        /login|sign.?in|authenticate/i.test(page.html.slice(0, 5000)) &&
        page.html.length < 5000 // short page with login content = likely auth gate

      if (isGated) {
        gated++
        gatedUrls.push(page.url)
      }
    }

    if (gated === 0) {
      return {
        id: "auth-gate-detection",
        name: "Auth Gate Detection",
        category: "authentication",
        status: "pass",
        message: `All ${pages.length} sampled pages are publicly accessible`,
      }
    }

    return {
      id: "auth-gate-detection",
      name: "Auth Gate Detection",
      category: "authentication",
      status: "fail",
      message: `${gated}/${pages.length} pages are behind an auth gate`,
      suggestion: "AI agents can't authenticate. Move content you want discoverable to public pages, or provide an alternative access method (API, llms.txt summary).",
      metadata: { gatedUrls },
    }
  },
}

/** Check if there's alternative access for gated content */
const authAlternativeAccess: CheckDefinition = {
  id: "auth-alternative-access",
  name: "Auth Alternative Access",
  category: "authentication",
  description: "Checks if gated content has alternative access paths for AI agents",
  weight: 0.5,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    const gated = pages.filter(
      (p) => p.statusCode === 401 || p.statusCode === 403,
    )

    if (gated.length === 0) {
      return {
        id: "auth-alternative-access",
        name: "Auth Alternative Access",
        category: "authentication",
        status: "pass",
        message: "All docs pages are publicly accessible; no alternative access paths needed",
      }
    }

    // a substantive llms.txt counts as an alternative access path
    const hasAlternative = ctx.llmsTxt && ctx.llmsTxt.length > 100

    if (hasAlternative) {
      return {
        id: "auth-alternative-access",
        name: "Auth Alternative Access",
        category: "authentication",
        status: "warn",
        message: `${gated.length} pages are gated but llms.txt provides alternative content summary`,
        suggestion: "Consider expanding llms.txt to cover all gated content with sufficient detail for AI agents.",
      }
    }

    return {
      id: "auth-alternative-access",
      name: "Auth Alternative Access",
      category: "authentication",
      status: "fail",
      message: `${gated.length} pages are gated with no alternative access for AI agents`,
      suggestion: "Provide a public llms.txt or API endpoint that summarizes gated content. AI agents need some way to understand what's behind the auth wall.",
    }
  },
}

export const authenticationChecks: CheckDefinition[] = [
  authGateDetection,
  authAlternativeAccess,
]

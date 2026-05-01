import type { CheckDefinition } from "@agentimization/shared"

// ─── MCP Server Card ────────────────────────────────────

const mcpServerCard: CheckDefinition = {
  id: "mcp-server-card",
  name: "MCP Server Card",
  category: "agent-protocols",
  description: "Checks for a Model Context Protocol server card at .well-known/mcp/server-card.json",
  weight: 0.8,
  run: async (ctx) => {
    if (!ctx.mcpServerCard) {
      return {
        id: "mcp-server-card",
        name: "MCP Server Card",
        category: "agent-protocols",
        status: "fail",
        message: "No MCP server card found at /.well-known/mcp/server-card.json",
        suggestion: "Add a server-card.json at /.well-known/mcp/server-card.json describing your MCP server's tools, authentication, and capabilities. This lets AI agents discover what they can do with your site before connecting.",
      }
    }

    try {
      const card = JSON.parse(ctx.mcpServerCard)

      const hasName = typeof card.name === "string"
      const hasTools = Array.isArray(card.tools) || Array.isArray(card.capabilities?.tools)
      const hasDescription = typeof card.description === "string"

      if (!hasName && !hasDescription) {
        return {
          id: "mcp-server-card",
          name: "MCP Server Card",
          category: "agent-protocols",
          status: "warn",
          message: "MCP server card found but missing name and description fields",
          suggestion: "Add at minimum a 'name' and 'description' to your server card so agents understand what your MCP server does.",
          metadata: { fields: Object.keys(card) },
        }
      }

      const toolCount = Array.isArray(card.tools) ? card.tools.length
        : Array.isArray(card.capabilities?.tools) ? card.capabilities.tools.length
        : 0

      return {
        id: "mcp-server-card",
        name: "MCP Server Card",
        category: "agent-protocols",
        status: "pass",
        message: `MCP server card found: "${card.name ?? "unnamed"}"${toolCount > 0 ? ` with ${toolCount} tools` : ""}`,
        metadata: { name: card.name, toolCount, hasDescription },
      }
    } catch {
      return {
        id: "mcp-server-card",
        name: "MCP Server Card",
        category: "agent-protocols",
        status: "warn",
        message: "MCP server card found but contains invalid JSON",
        suggestion: "Fix the JSON syntax in your /.well-known/mcp/server-card.json file.",
      }
    }
  },
}

// ─── API Catalog (RFC 9727) ─────────────────────────────

const apiCatalog: CheckDefinition = {
  id: "api-catalog",
  name: "API Catalog (RFC 9727)",
  category: "agent-protocols",
  description: "Checks for an API catalog at .well-known/api-catalog per RFC 9727",
  weight: 0.5,
  run: async (ctx) => {
    if (!ctx.apiCatalog) {
      return {
        id: "api-catalog",
        name: "API Catalog (RFC 9727)",
        category: "agent-protocols",
        status: "info",
        message: "No API catalog found at /.well-known/api-catalog",
        suggestion: "If your site exposes APIs, add an api-catalog at /.well-known/api-catalog (RFC 9727). This gives agents a single location to discover all your APIs, their specs, docs, and status endpoints.",
      }
    }

    try {
      const catalog = JSON.parse(ctx.apiCatalog)
      const apis = Array.isArray(catalog.apis) ? catalog.apis : []

      if (apis.length === 0) {
        return {
          id: "api-catalog",
          name: "API Catalog (RFC 9727)",
          category: "agent-protocols",
          status: "warn",
          message: "API catalog found but contains no API entries",
          suggestion: "Add API entries to your api-catalog with links to specs, documentation, and status endpoints.",
        }
      }

      return {
        id: "api-catalog",
        name: "API Catalog (RFC 9727)",
        category: "agent-protocols",
        status: "pass",
        message: `API catalog found with ${apis.length} API${apis.length === 1 ? "" : "s"} listed`,
        metadata: { apiCount: apis.length },
      }
    } catch {
      // rfc 9727 also allows link-format and html
      const hasLinks = ctx.apiCatalog.includes("http") || ctx.apiCatalog.includes("<")

      if (hasLinks) {
        return {
          id: "api-catalog",
          name: "API Catalog (RFC 9727)",
          category: "agent-protocols",
          status: "pass",
          message: "API catalog found (non-JSON format)",
        }
      }

      return {
        id: "api-catalog",
        name: "API Catalog (RFC 9727)",
        category: "agent-protocols",
        status: "warn",
        message: "API catalog found but could not parse content",
        suggestion: "Ensure your api-catalog returns valid JSON or CoRE Link Format per RFC 9727.",
      }
    }
  },
}

// ─── Content Signals ────────────────────────────────────

const contentSignals: CheckDefinition = {
  id: "content-signals",
  name: "Content Signals (AI Usage Declarations)",
  category: "agent-protocols",
  description: "Checks for AI-specific content signals in robots.txt (ai-train, ai-input, search directives)",
  weight: 0.6,
  run: async (ctx) => {
    if (!ctx.robotsTxt) {
      return {
        id: "content-signals",
        name: "Content Signals (AI Usage Declarations)",
        category: "agent-protocols",
        status: "info",
        message: "No robots.txt found — cannot check for content signals",
        suggestion: "Add a robots.txt with Content Signals directives to declare how AI agents may use your content (ai-train, ai-input, search).",
      }
    }

    const text = ctx.robotsTxt.toLowerCase()

    const signals: string[] = []
    if (/ai[-_]?train/i.test(ctx.robotsTxt)) signals.push("ai-train")
    if (/ai[-_]?input/i.test(ctx.robotsTxt)) signals.push("ai-input")
    if (/content[-_]?signals?/i.test(ctx.robotsTxt)) signals.push("content-signals")

    // granular bot rules go beyond basic allow/disallow
    const hasGPTBot = text.includes("gptbot")
    const hasClaudeBot = text.includes("claudebot") || text.includes("claude-web")
    const hasGoogleExtended = text.includes("google-extended")
    const hasPerplexityBot = text.includes("perplexitybot")
    const hasCCBot = text.includes("ccbot")
    const hasBytespider = text.includes("bytespider")

    const namedBots = [
      hasGPTBot && "GPTBot",
      hasClaudeBot && "ClaudeBot",
      hasGoogleExtended && "Google-Extended",
      hasPerplexityBot && "PerplexityBot",
      hasCCBot && "CCBot",
      hasBytespider && "Bytespider",
    ].filter(Boolean) as string[]

    if (signals.length > 0) {
      return {
        id: "content-signals",
        name: "Content Signals (AI Usage Declarations)",
        category: "agent-protocols",
        status: "pass",
        message: `Content signals found: ${signals.join(", ")}${namedBots.length > 0 ? `. AI bot rules for: ${namedBots.join(", ")}` : ""}`,
        metadata: { signals, namedBots },
      }
    }

    if (namedBots.length >= 2) {
      return {
        id: "content-signals",
        name: "Content Signals (AI Usage Declarations)",
        category: "agent-protocols",
        status: "warn",
        message: `No content signals directives, but has AI bot rules for: ${namedBots.join(", ")}`,
        suggestion: "Consider adding Content Signals directives (ai-train, ai-input) for more granular control over how AI agents use your content, beyond simple allow/disallow.",
        metadata: { signals, namedBots },
      }
    }

    return {
      id: "content-signals",
      name: "Content Signals (AI Usage Declarations)",
      category: "agent-protocols",
      status: "info",
      message: "No AI-specific content signals or bot directives found in robots.txt",
      suggestion: "Add Content Signals directives to robots.txt to explicitly declare how AI agents may use your content. This gives you granular control over training, citations, and search indexing.",
    }
  },
}

// ─── Link Headers (RFC 8288) ────────────────────────────

const linkHeaders: CheckDefinition = {
  id: "link-headers",
  name: "Link Headers (RFC 8288)",
  category: "agent-protocols",
  description: "Checks for Link HTTP headers that help agents discover related resources",
  weight: 0.4,
  requiresNetwork: true,
  run: async (ctx) => {
    const pages = ctx.sampledPages.slice(0, 10)
    let withLinkHeaders = 0
    const relTypes = new Set<string>()

    for (const page of pages) {
      const linkHeader = page.headers["link"]
      if (linkHeader) {
        withLinkHeaders++

        const relMatches = linkHeader.matchAll(/rel="([^"]+)"/gi)
        for (const match of relMatches) {
          for (const rel of match[1]!.split(/\s+/)) {
            relTypes.add(rel)
          }
        }
      }
    }

    if (withLinkHeaders === 0) {
      return {
        id: "link-headers",
        name: "Link Headers (RFC 8288)",
        category: "agent-protocols",
        status: "info",
        message: "No Link HTTP headers found on sampled pages",
        suggestion: "Add Link headers (RFC 8288) to responses with rel=alternate, rel=canonical, or rel=describedby. This lets AI agents discover alternative representations (markdown, JSON) without parsing HTML.",
      }
    }

    const hasAlternate = relTypes.has("alternate")
    const hasCanonical = relTypes.has("canonical")
    const hasDescribedBy = relTypes.has("describedby")
    const agentUseful = hasAlternate || hasDescribedBy

    if (agentUseful) {
      return {
        id: "link-headers",
        name: "Link Headers (RFC 8288)",
        category: "agent-protocols",
        status: "pass",
        message: `Link headers found on ${withLinkHeaders}/${pages.length} pages (rel types: ${[...relTypes].join(", ")})`,
        metadata: { withLinkHeaders, relTypes: [...relTypes] },
      }
    }

    return {
      id: "link-headers",
      name: "Link Headers (RFC 8288)",
      category: "agent-protocols",
      status: "warn",
      message: `Link headers found on ${withLinkHeaders}/${pages.length} pages but missing agent-useful rel types`,
      suggestion: "Add rel=alternate (to point to markdown/JSON versions) and rel=describedby Link headers. These help AI agents find the best representation of your content.",
      metadata: { withLinkHeaders, relTypes: [...relTypes] },
    }
  },
}

// ─── Agent Skills Index ─────────────────────────────────

const agentSkillsIndex: CheckDefinition = {
  id: "agent-skills-index",
  name: "Agent Skills Index",
  category: "agent-protocols",
  description: "Checks for an agent skills index at .well-known/agent-skills/index.json",
  weight: 0.4,
  run: async (ctx) => {
    if (!ctx.agentSkillsIndex) {
      return {
        id: "agent-skills-index",
        name: "Agent Skills Index",
        category: "agent-protocols",
        status: "info",
        message: "No agent skills index found at /.well-known/agent-skills/index.json",
        suggestion: "Add an agent-skills/index.json at /.well-known/ to declare what capabilities agents can use on your site. This is an emerging standard for agentic web interactions.",
      }
    }

    try {
      const skills = JSON.parse(ctx.agentSkillsIndex)
      const skillList = Array.isArray(skills) ? skills
        : Array.isArray(skills.skills) ? skills.skills
        : []

      if (skillList.length === 0) {
        return {
          id: "agent-skills-index",
          name: "Agent Skills Index",
          category: "agent-protocols",
          status: "warn",
          message: "Agent skills index found but contains no skills",
          suggestion: "Add skill definitions to your agent-skills index describing what actions agents can perform on your site.",
        }
      }

      return {
        id: "agent-skills-index",
        name: "Agent Skills Index",
        category: "agent-protocols",
        status: "pass",
        message: `Agent skills index found with ${skillList.length} skill${skillList.length === 1 ? "" : "s"} declared`,
        metadata: { skillCount: skillList.length },
      }
    } catch {
      return {
        id: "agent-skills-index",
        name: "Agent Skills Index",
        category: "agent-protocols",
        status: "warn",
        message: "Agent skills index found but contains invalid JSON",
        suggestion: "Fix the JSON syntax in your /.well-known/agent-skills/index.json file.",
      }
    }
  },
}

// ─── AGENTS.md ─────────────────────────────────────────

const agentsMd: CheckDefinition = {
  id: "agents-md",
  name: "AGENTS.md",
  category: "agent-protocols",
  description: "Checks for an AGENTS.md or AGENT.md file that guides coding agents on how to work with the project",
  weight: 0.7,
  run: async (ctx) => {
    // agents.md is a repo-root file so remote audits skip it
    if (ctx.mode === "remote") {
      return {
        id: "agents-md",
        name: "AGENTS.md",
        category: "agent-protocols",
        status: "skip",
        message: "AGENTS.md is a repo-root file (run on a local path to check it)",
      }
    }

    if (!ctx.agentsMd) {
      return {
        id: "agents-md",
        name: "AGENTS.md",
        category: "agent-protocols",
        status: "fail",
        message: "No AGENTS.md or AGENT.md found",
        suggestion: "Add an AGENTS.md at the project root. This is the universal agent configuration file — a README for AI coding agents. Include build/test commands, architecture overview, conventions, and any gotchas. Used by 60k+ open-source projects.",
      }
    }

    const content = ctx.agentsMd
    const lines = content.split("\n").filter((l) => l.trim().length > 0)
    const headings = content.match(/^#{1,3}\s+.+$/gm) ?? []

    const hasBuildInfo = /\b(build|compile|install|setup)\b/i.test(content)
    const hasTestInfo = /\b(test|spec|jest|vitest|pytest|cargo test)\b/i.test(content)
    const hasArchInfo = /\b(architecture|structure|directory|folder|module|package)\b/i.test(content)
    const hasConventions = /\b(convention|style|pattern|rule|guideline|lint)\b/i.test(content)
    const hasCodeBlocks = /```/.test(content)

    const signals = [
      hasBuildInfo && "build",
      hasTestInfo && "test",
      hasArchInfo && "architecture",
      hasConventions && "conventions",
      hasCodeBlocks && "code examples",
    ].filter(Boolean) as string[]

    if (lines.length < 5) {
      return {
        id: "agents-md",
        name: "AGENTS.md",
        category: "agent-protocols",
        status: "warn",
        message: `AGENTS.md found but very short (${lines.length} lines)`,
        suggestion: "Expand your AGENTS.md with build/test commands, architecture overview, code conventions, and common gotchas. The more context you give coding agents, the better they'll work with your project.",
        metadata: { lines: lines.length, headings: headings.length },
      }
    }

    if (signals.length < 2) {
      return {
        id: "agents-md",
        name: "AGENTS.md",
        category: "agent-protocols",
        status: "warn",
        message: `AGENTS.md found (${lines.length} lines, ${headings.length} sections) but missing key info`,
        suggestion: `Your AGENTS.md covers ${signals.length > 0 ? signals.join(", ") : "limited topics"}. Consider adding: ${[!hasBuildInfo && "build commands", !hasTestInfo && "test instructions", !hasArchInfo && "architecture overview", !hasConventions && "code conventions"].filter(Boolean).join(", ")}.`,
        metadata: { lines: lines.length, headings: headings.length, signals },
      }
    }

    return {
      id: "agents-md",
      name: "AGENTS.md",
      category: "agent-protocols",
      status: "pass",
      message: `AGENTS.md found (${lines.length} lines, ${headings.length} sections) covering: ${signals.join(", ")}`,
      metadata: { lines: lines.length, headings: headings.length, signals },
    }
  },
}

export const agentProtocolChecks: CheckDefinition[] = [
  mcpServerCard,
  apiCatalog,
  contentSignals,
  linkHeaders,
  agentSkillsIndex,
  agentsMd,
]

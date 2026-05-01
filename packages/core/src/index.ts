import type {
  AuditResult,
  AuditContext,
  AuditMode,
  AuditEvent,
  AuditEventHandler,
  AgentimizationConfig,
  CheckCategory,
  CheckResult,
} from "@agentimization/shared"
import { DEFAULT_CONFIG, CHECK_CATEGORIES } from "@agentimization/shared"
import { ALL_CHECKS } from "./checks/index.js"
import { fetchPage, fetchText, fetchMany, fetchWithContentNegotiation } from "./utils/fetch.js"
import { buildLocalContext } from "./utils/local.js"
import { parseSitemapUrls } from "./utils/html.js"

const computeGrade = (score: number): "A+" | "A" | "B" | "C" | "D" | "F" => {
  if (score >= 95) return "A+"
  if (score >= 85) return "A"
  if (score >= 70) return "B"
  if (score >= 55) return "C"
  if (score >= 40) return "D"
  return "F"
}

/** Build the audit context by fetching site metadata and sampling pages */
const buildRemoteContext = async (
  targetUrl: string,
  config: Required<AgentimizationConfig>,
): Promise<AuditContext> => {
  const emit = config.onEvent ?? (() => {})
  emit({ type: "phase", phase: "fetching" })

  const baseUrl = new URL(targetUrl)
  const origin = baseUrl.origin

  // agents.md is a repo-root file so we skip the http probe in remote mode
  const [
    robotsResult, llmsResult, llmsFullResult, sitemapResult,
    mcpCardResult, apiCatalogResult, agentSkillsResult,
  ] = await Promise.allSettled([
    fetchText(`${origin}/robots.txt`, config),
    fetchText(`${origin}/llms.txt`, config),
    fetchText(`${origin}/llms-full.txt`, config),
    fetchText(`${origin}/sitemap.xml`, config),
    fetchText(`${origin}/.well-known/mcp/server-card.json`, config),
    fetchText(`${origin}/.well-known/api-catalog`, config),
    fetchText(`${origin}/.well-known/agent-skills/index.json`, config),
  ])

  const robotsTxt = robotsResult.status === "fulfilled" && robotsResult.value?.statusCode === 200
    ? robotsResult.value.text
    : undefined

  const llmsTxt = llmsResult.status === "fulfilled" && llmsResult.value?.statusCode === 200
    ? llmsResult.value.text
    : undefined

  const llmsFullTxt = llmsFullResult.status === "fulfilled" && llmsFullResult.value?.statusCode === 200
    ? llmsFullResult.value.text
    : undefined

  const sitemapXml = sitemapResult.status === "fulfilled" && sitemapResult.value?.statusCode === 200
    ? sitemapResult.value.text
    : undefined

  const mcpServerCard = mcpCardResult.status === "fulfilled" && mcpCardResult.value?.statusCode === 200
    ? mcpCardResult.value.text
    : undefined

  const apiCatalog = apiCatalogResult.status === "fulfilled" && apiCatalogResult.value?.statusCode === 200
    ? apiCatalogResult.value.text
    : undefined

  const agentSkillsIndex = agentSkillsResult.status === "fulfilled" && agentSkillsResult.value?.statusCode === 200
    ? agentSkillsResult.value.text
    : undefined

  const agentsMd = undefined // remote mode: not applicable, the check skips itself

  const sitemapUrls = sitemapXml ? parseSitemapUrls(sitemapXml) : []

  if (!sitemapXml && robotsTxt) {
    const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i)
    if (sitemapMatch) {
      const altSitemap = await fetchText(sitemapMatch[1]!.trim(), config)
      if (altSitemap?.statusCode === 200) {
        sitemapUrls.push(...parseSitemapUrls(altSitemap.text))
      }
    }
  }

  let pagesToSample: string[] = []

  if (sitemapUrls.length > 0) {
    const shuffled = [...sitemapUrls].sort(() => Math.random() - 0.5)
    pagesToSample = shuffled.slice(0, config.sampleSize)
  } else {
    const mainPage = await fetchPage(targetUrl, config)
    const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi
    const links: string[] = []
    let match
    while ((match = linkRegex.exec(mainPage.html)) !== null) {
      try {
        const resolved = new URL(match[1]!, origin)
        if (resolved.origin === origin && !links.includes(resolved.href)) {
          links.push(resolved.href)
        }
      } catch {
        // skip
      }
    }
    pagesToSample = [targetUrl, ...links.slice(0, config.sampleSize - 1)]
  }

  if (!pagesToSample.includes(targetUrl)) {
    pagesToSample.unshift(targetUrl)
  }

  const sampledPages = await fetchMany(pagesToSample, config)

  emit({ type: "context-ready", pageCount: sampledPages.length })

  for (const page of sampledPages) {
    const mdResult = await fetchWithContentNegotiation(page.url, "text/markdown", config)
    if (
      mdResult &&
      mdResult.statusCode === 200 &&
      (mdResult.contentType.includes("text/markdown") || mdResult.contentType.includes("text/plain"))
    ) {
      page.markdown = mdResult.text
    }
  }

  return {
    mode: "remote",
    targetUrl,
    baseUrl,
    sitemapUrls,
    sampledPages,
    robotsTxt,
    llmsTxt,
    llmsFullTxt,
    sitemapXml,
    allUrls: pagesToSample,
    mcpServerCard,
    apiCatalog,
    agentSkillsIndex,
    agentsMd,
  }
}

/** Strip undefined values from a config so they don't override defaults in spread */
const stripUndefined = (obj: AgentimizationConfig): AgentimizationConfig => {
  const result: AgentimizationConfig = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

/** Shared scoring logic — runs checks against a context and computes results */
const runAudit = async (
  ctx: AuditContext,
  config: Required<AgentimizationConfig>,
  start: number,
): Promise<AuditResult> => {
  const emit = config.onEvent ?? (() => {})
  emit({ type: "phase", phase: "checking" })

  const allCategoryCount = CHECK_CATEGORIES.length
  let checks = config.categories.length < allCategoryCount
    ? ALL_CHECKS.filter((c) => config.categories.includes(c.category))
    : ALL_CHECKS

  if (ctx.mode === "local") {
    checks = checks.filter((c) => !c.requiresNetwork)
  }

  const results: CheckResult[] = []

  for (const check of checks) {
    emit({ type: "check-start", check: { id: check.id, name: check.name, category: check.category } })

    try {
      const result = await check.run(ctx)
      results.push(result)
      emit({ type: "check-complete", result })
    } catch (error) {
      const result: CheckResult = {
        id: check.id,
        name: check.name,
        category: check.category,
        status: "skip",
        message: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
      results.push(result)
      emit({ type: "check-complete", result })
    }
  }

  emit({ type: "phase", phase: "scoring" })

  const passed = results.filter((r) => r.status === "pass").length
  const warned = results.filter((r) => r.status === "warn").length
  const failed = results.filter((r) => r.status === "fail").length
  const skipped = results.filter((r) => r.status === "skip" || r.status === "info").length
  const total = results.length

  const scorable = results.filter((r) => r.status !== "skip" && r.status !== "info")
  const checkWeights = checks.reduce((acc, c) => ({ ...acc, [c.id]: c.weight }), {} as Record<string, number>)

  let weightedSum = 0
  let totalWeight = 0

  for (const result of scorable) {
    const weight = checkWeights[result.id] ?? 0.5
    const score = result.status === "pass" ? 1.0 : result.status === "warn" ? 0.5 : 0.0
    weightedSum += score * weight
    totalWeight += weight
  }

  let overallScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0

  // a fully gated site cannot earn above a d grade no matter what else passes
  const authGate = results.find((r) => r.id === "auth-gate-detection")
  if (authGate?.status === "fail" && overallScore > 50) {
    overallScore = 50
  }

  const categories: Record<string, { score: number; checks: number; passed: number }> = {}
  const activeCategories = config.categories.filter((cat) =>
    results.some((r) => r.category === cat),
  )

  for (const cat of activeCategories) {
    const catResults = results.filter((r) => r.category === cat)
    const catScorable = catResults.filter((r) => r.status !== "skip" && r.status !== "info")
    const catPassed = catResults.filter((r) => r.status === "pass").length

    let catWeightedSum = 0
    let catTotalWeight = 0

    for (const result of catScorable) {
      const weight = checkWeights[result.id] ?? 0.5
      const score = result.status === "pass" ? 1.0 : result.status === "warn" ? 0.5 : 0.0
      catWeightedSum += score * weight
      catTotalWeight += weight
    }

    categories[cat] = {
      score: catTotalWeight > 0 ? Math.round((catWeightedSum / catTotalWeight) * 100) : 0,
      checks: catResults.length,
      passed: catPassed,
    }
  }

  return {
    url: ctx.targetUrl,
    timestamp: new Date().toISOString(),
    overall_score: overallScore,
    grade: computeGrade(overallScore),
    checks: results,
    summary: { total, passed, warned, failed, skipped },
    categories,
    latency_ms: Date.now() - start,
  }
}

/** Run a full GEO audit on a URL (remote mode) */
export const audit = async (
  targetUrl: string,
  config: AgentimizationConfig = {},
): Promise<AuditResult> => {
  const start = Date.now()
  const fullConfig: Required<AgentimizationConfig> = { ...DEFAULT_CONFIG, ...stripUndefined(config) }
  const ctx = await buildRemoteContext(targetUrl, fullConfig)
  return runAudit(ctx, fullConfig, start)
}

/** Run a GEO audit on a local directory (local mode) */
export const auditLocal = async (
  dirPath: string,
  config: AgentimizationConfig = {},
): Promise<AuditResult> => {
  const start = Date.now()
  const fullConfig: Required<AgentimizationConfig> = { ...DEFAULT_CONFIG, ...stripUndefined(config) }
  const emit = fullConfig.onEvent ?? (() => {})

  emit({ type: "phase", phase: "fetching" })
  const ctx = buildLocalContext(dirPath, fullConfig)
  emit({ type: "context-ready", pageCount: ctx.sampledPages.length })

  return runAudit(ctx, fullConfig, start)
}

export { ALL_CHECKS } from "./checks/index.js"
export { buildLocalContext } from "./utils/local.js"
export type {
  AuditResult,
  AuditContext,
  AuditMode,
  AuditEvent,
  AuditEventHandler,
  AgentimizationConfig,
  CheckResult,
  CheckDefinition,
  CheckCategory,
} from "@agentimization/shared"

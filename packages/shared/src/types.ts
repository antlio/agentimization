import { z } from "zod"

// --- Check result types ---

export const CHECK_STATUSES = ["pass", "warn", "fail", "skip", "info"] as const
export type CheckStatus = (typeof CHECK_STATUSES)[number]

export const CHECK_CATEGORIES = [
  "content-discoverability",
  "markdown-availability",
  "content-structure",
  "page-size",
  "url-stability",
  "authentication",
  "geo-signals",
  "agent-protocols",
] as const
export type CheckCategory = (typeof CHECK_CATEGORIES)[number]

export const CheckResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(CHECK_CATEGORIES),
  status: z.enum(CHECK_STATUSES),
  message: z.string(),
  details: z.string().optional(),
  suggestion: z.string().optional(),
  score: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type CheckResult = z.infer<typeof CheckResultSchema>

export const AuditResultSchema = z.object({
  url: z.string(),
  timestamp: z.string(),
  overall_score: z.number().min(0).max(100),
  grade: z.enum(["A+", "A", "B", "C", "D", "F"]),
  checks: z.array(CheckResultSchema),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    warned: z.number(),
    failed: z.number(),
    skipped: z.number(),
  }),
  categories: z.record(z.object({
    score: z.number().min(0).max(100),
    checks: z.number(),
    passed: z.number(),
  })),
  latency_ms: z.number(),
})

export type AuditResult = z.infer<typeof AuditResultSchema>

// --- Check definition ---

export interface CheckDefinition {
  id: string
  name: string
  category: CheckCategory
  description: string
  /** How important this check is for scoring (0-1) */
  weight: number
  /** Whether this check requires network access (skipped in local mode) */
  requiresNetwork?: boolean
  /** The check function — receives audit context, returns result */
  run: (ctx: AuditContext) => Promise<CheckResult>
}

// --- Audit context (shared state across checks) ---

export interface PageSample {
  url: string
  html: string
  statusCode: number
  headers: Record<string, string>
  /** Extracted markdown if available */
  markdown?: string
  /** Time to fetch in ms */
  fetchTime: number
}

export type AuditMode = "remote" | "local"

export interface AuditContext {
  /** Whether this is a remote (HTTP) or local (filesystem) audit */
  mode: AuditMode
  /** The target URL being audited (or file:// path for local mode) */
  targetUrl: string
  /** Parsed base URL */
  baseUrl: URL
  /** Sitemap URLs discovered */
  sitemapUrls: string[]
  /** Sampled pages (up to 10-20 for deep checks) */
  sampledPages: PageSample[]
  /** robots.txt content */
  robotsTxt?: string
  /** llms.txt content */
  llmsTxt?: string
  /** llms-full.txt content */
  llmsFullTxt?: string
  /** Sitemap XML content */
  sitemapXml?: string
  /** All discovered page URLs */
  allUrls: string[]
  /** .well-known/mcp/server-card.json content */
  mcpServerCard?: string
  /** .well-known/api-catalog content */
  apiCatalog?: string
  /** .well-known/agent-skills/index.json content */
  agentSkillsIndex?: string
  /** AGENTS.md / AGENT.md content */
  agentsMd?: string
}

// --- Streaming ---

/** Events emitted during an audit */
export type AuditEvent =
  | { type: "context-ready"; pageCount: number }
  | { type: "check-start"; check: { id: string; name: string; category: CheckCategory } }
  | { type: "check-complete"; result: CheckResult }
  | { type: "phase"; phase: "fetching" | "checking" | "scoring" }

export type AuditEventHandler = (event: AuditEvent) => void

// --- Config ---

export interface AgentimizationConfig {
  /** Max pages to sample for deep checks (default 10) */
  sampleSize?: number
  /** Request timeout in ms (default 10000) */
  timeout?: number
  /** User-Agent string for requests */
  userAgent?: string
  /** Categories to check (default: all) */
  categories?: CheckCategory[]
  /** Concurrent requests (default 5) */
  concurrency?: number
  /** Callback for streaming progress events */
  onEvent?: AuditEventHandler
}

export const DEFAULT_CONFIG: Required<AgentimizationConfig> = {
  sampleSize: 10,
  timeout: 10_000,
  concurrency: 5,
  userAgent: "Agentimization/0.1 (GEO Audit; +https://github.com/antlio/agentimization)",
  categories: [...CHECK_CATEGORIES],
  onEvent: () => {},
}

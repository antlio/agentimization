import type { CheckCategory, CheckResult } from "@agentimization/shared"

// shared icons colors labels and cross-component types for the cli ui

export type Phase = "init" | "fetching" | "checking" | "scoring" | "done" | "error"

export interface CheckState {
  id: string
  name: string
  category: CheckCategory
  status: "pending" | "running" | "done"
  result?: CheckResult
}

export interface MenuOption {
  label: string
  value: string
  hint?: string
}


export const STATUS_ICONS: Record<string, string> = {
  pass: "▦",
  warn: "▣",
  fail: "▨",
  skip: "▢",
  info: "▩",
}

// colors authored in oklch and converted to hex via toInkColor at the ink boundary
export const STATUS_COLORS: Record<string, string> = {
  pass: "oklch(0.858 0.109 142.7)",
  warn: "oklch(0.824 0.101 52.6)",
  fail: "oklch(0.718 0.181 10.0)",
  skip: "oklch(0.550 0.034 277.1)",
  info: "oklch(0.791 0.096 228.7)",
}

export const CATEGORY_LABELS: Record<string, string> = {
  "content-discoverability": "Content Discoverability",
  "markdown-availability": "Markdown Availability",
  "content-structure": "Content Structure",
  "page-size": "Page Size & Rendering",
  "url-stability": "URL Stability",
  "authentication": "Authentication & Access",
  "geo-signals": "GEO Signals",
  "agent-protocols": "Agent Protocols",
}

export const GRADE_COLORS: Record<string, string> = {
  "A+": "oklch(0.858 0.109 142.7)",
  A: "oklch(0.858 0.109 142.7)",
  B: "oklch(0.824 0.101 52.6)",
  C: "oklch(0.824 0.101 52.6)",
  D: "oklch(0.718 0.181 10.0)",
  F: "oklch(0.718 0.181 10.0)",
}

// lavender-blue used for selected menu items
export const ACCENT_BLUE = "oklch(0.766 0.111 259.9)"

// muted tone for help lines and dim card chrome
export const TEXT_DIM = "oklch(0.550 0.034 277.1)"

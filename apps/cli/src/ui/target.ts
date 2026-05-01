import { existsSync, statSync } from "node:fs"
import { resolve } from "node:path"

export const isLocalPath = (arg: string): boolean => {
  if (arg === "." || arg === ".." || arg.startsWith("./") || arg.startsWith("../") || arg.startsWith("/")) {
    return true
  }
  try {
    const resolved = resolve(arg)
    return existsSync(resolved) && statSync(resolved).isDirectory()
  } catch {
    return false
  }
}

export const normalizeUrl = (arg: string): string => {
  const parsed = new URL(arg.startsWith("http") ? arg : `https://${arg}`)
  return parsed.href
}

export interface ResolvedTarget {
  target: string
  isLocal: boolean
}

export const resolveTarget = (input: string): ResolvedTarget | { error: string } => {
  const trimmed = input.trim()
  if (!trimmed) return { error: "Please enter a URL or path." }

  if (isLocalPath(trimmed)) {
    return { target: resolve(trimmed), isLocal: true }
  }

  try {
    return { target: normalizeUrl(trimmed), isLocal: false }
  } catch {
    return { error: `Invalid URL or path: "${trimmed}"` }
  }
}

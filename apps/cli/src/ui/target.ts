import { existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

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
  // when set, the audit was redirected from a higher-level path to this build dir
  autoDetectedFrom?: string
}

// build directories we auto-descend into when the given path has no top-level
// index. order matters — earlier entries win when several exist side by side
const BUILD_DIR_NAMES = ["dist", "build", "out", "_site", "public"] as const

const hasIndex = (dir: string): boolean =>
  ["index.html", "index.htm", "index.md"].some((name) => existsSync(join(dir, name)))

const findBuildDir = (root: string): string | undefined => {
  for (const name of BUILD_DIR_NAMES) {
    const candidate = join(root, name)
    if (existsSync(candidate) && statSync(candidate).isDirectory() && hasIndex(candidate)) {
      return candidate
    }
  }
  return undefined
}

export const resolveTarget = (input: string): ResolvedTarget | { error: string } => {
  const trimmed = input.trim()
  if (!trimmed) return { error: "Please enter a URL or path." }

  if (isLocalPath(trimmed)) {
    const requested = resolve(trimmed)

    // if the requested dir already looks like a site, audit it as-is
    if (hasIndex(requested)) {
      return { target: requested, isLocal: true }
    }

    // otherwise look for a built output one level down
    const buildDir = findBuildDir(requested)
    if (buildDir) {
      return { target: buildDir, isLocal: true, autoDetectedFrom: requested }
    }

    return { target: requested, isLocal: true }
  }

  try {
    return { target: normalizeUrl(trimmed), isLocal: false }
  } catch {
    return { error: `Invalid URL or path: "${trimmed}"` }
  }
}

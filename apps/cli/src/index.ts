#!/usr/bin/env node
import { Command } from "commander"
import { render } from "ink"
import React from "react"
import { resolve } from "node:path"
import { audit, auditLocal } from "@agentimization/core"
import type { CheckCategory } from "@agentimization/shared"
import { App } from "./ui/app.js"
import { generateAgentPrompt } from "./ui/agent-prompt.js"
import { isLocalPath, normalizeUrl as normalizeUrlOrThrow } from "./ui/target.js"


const isColorDisabled = () =>
  "NO_COLOR" in process.env ||
  process.env.TERM === "dumb" ||
  !process.stdout.isTTY

if (isColorDisabled()) {
  process.env.FORCE_COLOR = "0"
}

const handleSignal = () => {
  console.error("\n  interrupted, exiting.")
  process.exit(130) // 128 + SIGINT(2)
}

process.on("SIGINT", handleSignal)
process.on("SIGTERM", handleSignal)

const program = new Command()

program
  .exitOverride() // let us control exit codes
  .configureOutput({
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(`\n  ${str.trim()}\n`),
  })
  .name("agentimization")
  .description("GEO audit for agent-ready websites")
  .version("0.1.0", "-V, --version")
  .argument("<target>", "URL or local directory path to audit")
  .option("--json", "output raw JSON (for CI/piping)")
  .option("--md", "output markdown report (copy-paste into an AI agent)")
  .option("--no-color", "disable color output")
  .option("--category <cat>", "only run checks in this category")
  .option("--sample-size <n>", "number of pages to sample (default: 10)", parseInt)
  .addHelpText("after", `
Modes:
  Remote    Pass a URL to audit a live site over HTTP.
            Runs all checks including content negotiation, auth, cache headers.

  Local     Pass a directory path to audit files on disk.
            Skips network-only checks. Great as a CI pre-deploy step.

Categories:
  content-discoverability  llms.txt, sitemap, robots.txt
  markdown-availability    .md URLs, content negotiation
  content-structure        headings, code fences, tabs
  page-size                SSR, HTML/MD size, content position
  url-stability            status codes, redirects, caching
  authentication           auth gates, alternative access
  geo-signals              structured data, E-E-A-T, citations
  agent-protocols          MCP server card, API catalog, content signals

Examples:
  $ agentimization https://docs.example.com
  $ agentimization https://example.com --json > report.json
  $ agentimization .
  $ agentimization ./docs --category content-structure
  $ agentimization ./public --md | pbcopy`)
  .action(async (target: string, opts: {
    json?: boolean
    md?: boolean
    color?: boolean
    category?: string
    sampleSize?: number
  }) => {
    const categories = opts.category
      ? [opts.category as CheckCategory]
      : undefined

    const isLocal = isLocalPath(target)

    // json mode skips ink and prints raw output for piping
    if (opts.json) {
      try {
        const result = isLocal
          ? await auditLocal(resolve(target), { categories, sampleSize: opts.sampleSize })
          : await audit(normalizeUrl(target), { categories, sampleSize: opts.sampleSize })
        console.log(JSON.stringify(result, null, 2))
        if (result.overall_score < 50) process.exit(1)
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error"
        console.error(`Error: ${msg}`)
        process.exit(1)
      }
      return
    }

    // md mode prints the agent-fix prompt and exits
    if (opts.md) {
      try {
        const result = isLocal
          ? await auditLocal(resolve(target), { categories, sampleSize: opts.sampleSize })
          : await audit(normalizeUrl(target), { categories, sampleSize: opts.sampleSize })
        console.log(generateAgentPrompt(result, { mode: isLocal ? "local" : "remote", target }))
        if (result.overall_score < 50) process.exit(1)
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error"
        console.error(`Error: ${msg}`)
        process.exit(1)
      }
      return
    }

    const targetResolved = isLocal ? resolve(target) : normalizeUrl(target)

    render(
      React.createElement(App, {
        target: targetResolved,
        isLocal,
        categories,
        sampleSize: opts.sampleSize,
      }),
    )
  })

const normalizeUrl = (arg: string): string => {
  try {
    return normalizeUrlOrThrow(arg)
  } catch {
    console.error(`Error: Invalid URL "${arg}"`)
    process.exit(1)
  }
}

try {
  program.parse()
} catch (err: unknown) {
  const code = (err as { exitCode?: number }).exitCode
  process.exit(code === 0 ? 0 : 2)
}

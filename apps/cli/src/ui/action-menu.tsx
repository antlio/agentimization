import { useState } from "react"
import { Box, Text, useApp, useInput } from "ink"
import type { AuditResult } from "@agentimization/shared"
import { generateClipboardPrompt, copyToClipboard } from "./agent-prompt.js"
import { ACCENT_BLUE, TEXT_DIM, type MenuOption } from "./tokens.js"
import { toInkColor } from "./color.js"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const FEEDBACK_OK = "oklch(0.858 0.109 142.7)"
const FEEDBACK_ERR = "oklch(0.718 0.181 10.0)"

const MENU_OPTIONS: MenuOption[] = [
  { label: "Copy fix prompt to clipboard", value: "copy", hint: "paste into Claude, ChatGPT, etc." },
  { label: "Save JSON report", value: "json", hint: "agentimization-report.json" },
  { label: "Run another URL or path", value: "retry" },
  { label: "Exit", value: "exit" },
]

export const ActionMenu = ({
  result,
  target,
  isLocal,
  onRetry,
}: {
  result: AuditResult
  target: string
  isLocal: boolean
  onRetry: (input: string) => void
}) => {
  const { exit } = useApp()
  const [mode, setMode] = useState<"menu" | "input">("menu")
  const [selected, setSelected] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [done, setDone] = useState(false)

  const handleAction = (action: string) => {
    const promptOpts = { mode: isLocal ? "local" as const : "remote" as const, target }

    switch (action) {
      case "copy": {
        const fixPrompt = generateClipboardPrompt(result, promptOpts)
        copyToClipboard(fixPrompt).then((ok) => {
          if (ok) {
            setFeedback("✓ Copied to clipboard! Paste into your AI agent.")
          } else {
            setFeedback("✗ Clipboard not available.")
          }
        })
        break
      }
      case "json": {
        const path = resolve("agentimization-report.json")
        try {
          writeFileSync(path, JSON.stringify(result, null, 2))
          setFeedback(`✓ Saved to ${path}`)
        } catch {
          setFeedback("✗ Failed to write report file.")
        }
        break
      }
      case "retry": {
        setInput("")
        setFeedback(null)
        setMode("input")
        break
      }
      case "exit": {
        setDone(true)
        setTimeout(() => {
          exit()
          if (result.overall_score < 50) process.exit(1)
        }, 50)
        break
      }
    }
  }

  useInput((char, key) => {
    if (done) return

    if (mode === "menu") {
      if (key.upArrow) {
        setSelected((prev) => Math.max(0, prev - 1))
      } else if (key.downArrow) {
        setSelected((prev) => Math.min(MENU_OPTIONS.length - 1, prev + 1))
      } else if (key.return) {
        const option = MENU_OPTIONS[selected]!
        handleAction(option.value)
      } else if (char === "q" || key.escape) {
        setDone(true)
        setTimeout(() => exit(), 50)
      }
      return
    }

    // input mode
    if (key.escape) {
      setMode("menu")
      return
    }
    if (key.return) {
      onRetry(input)
      return
    }
    if (key.backspace || key.delete) {
      setInput((v) => v.slice(0, -1))
      return
    }
    if (char && !key.ctrl && !key.meta) {
      setInput((v) => v + char)
    }
  })

  if (done) return null

  if (mode === "input") {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color={toInkColor(TEXT_DIM)}>  Enter URL or path  (esc to go back, enter to run)</Text>
        <Box paddingLeft={2} marginTop={1}>
          <Text color={toInkColor(ACCENT_BLUE)}>▦ </Text>
          <Text>{input}</Text>
          <Text color={toInkColor(ACCENT_BLUE)}>▌</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={toInkColor(TEXT_DIM)}>  ─── What next? ─────────────────────</Text>
      <Text color={toInkColor(TEXT_DIM)}>  Use ↑↓ arrows, enter to select, q to quit</Text>
      <Box flexDirection="column" marginTop={1}>
        {MENU_OPTIONS.map((opt, i) => {
          const isSelected = i === selected
          return (
            <Box key={opt.value} paddingLeft={2}>
              <Text color={isSelected ? toInkColor(ACCENT_BLUE) : undefined}>
                {isSelected ? "▦" : " "} {opt.label}
              </Text>
              {opt.hint && isSelected ? (
                <Text dimColor> ({opt.hint})</Text>
              ) : null}
            </Box>
          )
        })}
      </Box>
      {feedback ? (
        <>
          <Box marginTop={1} paddingLeft={2}>
            <Text color={toInkColor(feedback.startsWith("✓") ? FEEDBACK_OK : FEEDBACK_ERR)}>{feedback}</Text>
          </Box>
          <Box height={1}>
            <Text> </Text>
          </Box>
        </>
      ) : null}
    </Box>
  )
}

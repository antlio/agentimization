import { useState } from "react"
import { Box, Text, useApp, useInput } from "ink"
import { ACCENT_BLUE, TEXT_DIM, type MenuOption } from "./tokens.js"
import { toInkColor } from "./color.js"

const ERROR_OPTIONS: MenuOption[] = [
  { label: "Try another URL or path", value: "retry" },
  { label: "Exit", value: "exit" },
]

export const ErrorActions = ({ onRetry }: { onRetry: (input: string) => void }) => {
  const { exit } = useApp()
  const [mode, setMode] = useState<"menu" | "input">("menu")
  const [selected, setSelected] = useState(0)
  const [input, setInput] = useState("")

  useInput((char, key) => {
    if (mode === "menu") {
      if (key.upArrow) setSelected((s) => Math.max(0, s - 1))
      else if (key.downArrow) setSelected((s) => Math.min(ERROR_OPTIONS.length - 1, s + 1))
      else if (key.return) {
        const choice = ERROR_OPTIONS[selected]!.value
        if (choice === "retry") {
          setInput("")
          setMode("input")
        } else {
          setTimeout(() => {
            exit()
            process.exit(1)
          }, 50)
        }
      } else if (char === "q") {
        setTimeout(() => {
          exit()
          process.exit(1)
        }, 50)
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
      <Text color={toInkColor(TEXT_DIM)}>  Use ↑↓ arrows, enter to select, q to quit</Text>
      <Box flexDirection="column" marginTop={1}>
        {ERROR_OPTIONS.map((opt, i) => {
          const isSelected = i === selected
          return (
            <Box key={opt.value} paddingLeft={2}>
              <Text color={isSelected ? toInkColor(ACCENT_BLUE) : undefined}>
                {isSelected ? "▦" : " "} {opt.label}
              </Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

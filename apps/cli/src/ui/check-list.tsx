import { Box, Text } from "ink"
import { MiniLoader } from "./hero-card.js"
import { STATUS_ICONS, STATUS_COLORS, CATEGORY_LABELS, type CheckState } from "./tokens.js"
import { toInkColor } from "./color.js"

const CheckLine = ({ check, loaderColor }: { check: CheckState; loaderColor?: string }) => {
  if (check.status === "running") {
    return (
      <Box paddingLeft={2}>
        <MiniLoader color={loaderColor} />
        <Text> {check.id}</Text>
      </Box>
    )
  }

  if (check.status === "done" && check.result) {
    const r = check.result
    const icon = STATUS_ICONS[r.status] ?? "?"
    const color = STATUS_COLORS[r.status] ?? "white"
    const showSuggestion = r.suggestion && (r.status === "fail" || r.status === "warn")

    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Text>
          <Text color={toInkColor(color)}>{icon}</Text>
          <Text> {r.id}</Text>
        </Text>
        <Text dimColor>    {r.message}</Text>
        {showSuggestion ? (
          <Text color={toInkColor("oklch(0.858 0.109 142.7)")}>    → {r.suggestion}</Text>
        ) : null}
      </Box>
    )
  }

  return null
}

export const CategorySection = ({
  category,
  checks,
  score,
  loaderColor,
}: {
  category: string
  checks: CheckState[]
  score?: number
  loaderColor?: string
}) => {
  const label = CATEGORY_LABELS[category] ?? category
  const hasVisibleChecks = checks.some((c) => c.status !== "pending")
  if (!hasVisibleChecks) return null

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text>{label}</Text>
        {score !== undefined ? <Text dimColor> {score}/100</Text> : null}
      </Text>
      {checks
        .filter((c) => c.status !== "pending")
        .map((c) => (
          <CheckLine key={c.id} check={c} loaderColor={loaderColor} />
        ))}
    </Box>
  )
}

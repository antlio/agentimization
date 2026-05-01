import type { CheckDefinition } from "@agentimization/shared"
import { contentDiscoverabilityChecks } from "./content-discoverability.js"
import { markdownAvailabilityChecks } from "./markdown-availability.js"
import { pageSizeChecks } from "./page-size.js"
import { contentStructureChecks } from "./content-structure.js"
import { urlStabilityChecks } from "./url-stability.js"
import { authenticationChecks } from "./authentication.js"
import { geoSignalChecks } from "./geo-signals.js"
import { agentProtocolChecks } from "./agent-protocols.js"

export const ALL_CHECKS: CheckDefinition[] = [
  ...contentDiscoverabilityChecks,
  ...markdownAvailabilityChecks,
  ...pageSizeChecks,
  ...contentStructureChecks,
  ...urlStabilityChecks,
  ...authenticationChecks,
  ...geoSignalChecks,
  ...agentProtocolChecks,
]

export {
  contentDiscoverabilityChecks,
  markdownAvailabilityChecks,
  pageSizeChecks,
  contentStructureChecks,
  urlStabilityChecks,
  authenticationChecks,
  geoSignalChecks,
  agentProtocolChecks,
}

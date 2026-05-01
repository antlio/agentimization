import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

// resolve the workspace dep to its typescript source so vitest does not need a built dist
export default defineConfig({
  resolve: {
    alias: {
      "@agentimization/shared": resolve(import.meta.dirname, "../shared/src/index.ts"),
    },
  },
})

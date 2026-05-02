import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://agentimization.com",
  output: "static",
  build: {
    format: "file",
    inlineStylesheets: "auto",
  },
  compressHTML: true,
  trailingSlash: "never",
})

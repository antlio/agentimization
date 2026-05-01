import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  // inline the workspace dep so the published package is self-contained
  noExternal: ["@agentimization/shared"],
  // keep runtime deps external so npm installs them at consumer install time
  external: ["zod"],
  dts: true,
  splitting: false,
  sourcemap: false,
})

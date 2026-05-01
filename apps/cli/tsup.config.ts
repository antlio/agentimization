import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  // bundle the workspace packages so the published cli is self-contained
  noExternal: ["@agentimization/shared", "@agentimization/core"],
  // keep runtime deps external so npm installs them on the user side
  external: ["commander", "ink", "react", "react-devtools-core"],
  splitting: false,
  sourcemap: false,
  dts: false,
})

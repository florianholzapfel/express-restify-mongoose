import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/express-restify-mongoose.ts"],
  format: ["cjs", "esm"],
  legacyOutput: true,
  sourcemap: true,
  splitting: false,
  target: "node14",
});

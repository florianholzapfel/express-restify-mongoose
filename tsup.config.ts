import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/express-restify-mongoose.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
});

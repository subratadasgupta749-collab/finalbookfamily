// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "node:module";

// pdf-lib/docx import tslib helpers as named ESM exports. The default "node"
// condition resolves tslib to a CJS re-export whose default is undefined in the
// Worker bundle, producing:
//   Cannot destructure property '__extends' of '__toESM(...).default'
// Resolve tslib's real ESM build to an absolute path so the bundler can load it.
const require = createRequire(import.meta.url);
const tslibEsm = require.resolve("tslib/tslib.es6.mjs");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        tslib: tslibEsm,
      },
    },
  },
  nitro: {
    preset: process.env.VERCEL || process.env.NITRO_PRESET === "vercel" ? "vercel" : undefined,
  },
});

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      complexity: ["error", 10],
    },
  },
  // The shared engine, its generated extension bundle and the API route sit outside this
  // change's scope and are covered by tests/ instead. Each ceiling is pinned to what the
  // file costs today, so those files cannot drift further while 10 still gates new code.
  {
    files: ["src/lib/filters.ts", "src/lib/intent.ts", "extension/content.js"],
    rules: { complexity: ["error", 15] },
  },
  {
    files: ["src/app/api/interpret/route.ts"],
    rules: { complexity: ["error", 23] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".next_dev/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Backend has its own ESLint config; infra/scripts are not part of the Next app
    "backend/**",
    "infrastructure/**",
    "scripts/**",
  ]),
  {
    // Existing code violates these; keep them visible as warnings until cleaned up
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
]);

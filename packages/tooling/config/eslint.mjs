import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const ignoredPaths = [
  "**/.git/**",
  "**/.pnpm-store/**",
  "**/.tools/**",
  "**/node_modules/**",
  "**/dist/**",
  "**/coverage/**",
  "**/.cache/**"
];

const sizeRules = {
  complexity: ["error", 3],
  "max-lines": [
    "error",
    {
      max: 350,
      skipBlankLines: false,
      skipComments: false
    }
  ],
  "max-lines-per-function": [
    "error",
    {
      IIFEs: true,
      max: 30,
      skipBlankLines: true,
      skipComments: true
    }
  ]
};

export default tseslint.config(
  { ignores: ignoredPaths },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error"
    }
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: "module"
    },
    rules: sizeRules
  },
  {
    files: ["**/*.{ts,cts,mts,tsx}"],
    rules: sizeRules
  }
);

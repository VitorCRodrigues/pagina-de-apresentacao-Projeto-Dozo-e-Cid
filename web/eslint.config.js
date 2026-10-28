import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import i18next from "eslint-plugin-i18next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "storybook-static",
      "coverage",
      "playwright-report",
      "test-results",
      "public/mockServiceWorker.js",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    // Client-facing text must come from src/i18n (web/CLAUDE.md).
    files: ["src/**/*.tsx"],
    ignores: ["src/**/*.test.tsx", "src/**/*.stories.tsx", "src/test/**"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            exclude: [
              "className",
              "style",
              "type",
              "key",
              "id",
              "width",
              "height",
              "to",
              "href",
              "role",
              "name",
              "htmlFor",
              "autoComplete",
              "inputMode",
              "lang",
              "dir",
              "scope",
              "dateTime",
              "rel",
              "target",
              "data-.*",
              "aria-(controls|describedby|labelledby|live|current|haspopup|atomic|relevant)",
              // Component enums (variant="primary", side="bottom"), never user-facing text.
              "variant",
              "tone",
              "size",
              "status",
              "side",
              "align",
              "position",
              "orientation",
              "fullWidth",
              // SVG geometry
              "viewBox",
              "d",
              "fill",
              "stroke",
              "xmlns",
              "shapeRendering",
              "strokeLinecap",
              "strokeLinejoin",
            ],
          },
        },
      ],
    },
  },
  {
    files: ["*.config.{js,ts}", "e2e/**/*.ts", ".storybook/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.node },
  },
  prettier,
);

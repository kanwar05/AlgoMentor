import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**"]
  },
  js.configs.recommended,
  {
    files: ["client/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "preserve-caught-error": "off"
    }
  },
  {
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
        fetch: "readonly",
        AbortSignal: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "preserve-caught-error": "off"
    }
  }
];

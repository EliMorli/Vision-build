import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";
import vbA11y from "./scripts/eslint-rules/a11y-touchables.js";
import vbCopy from "./scripts/eslint-rules/sentence-case.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("expo"),
  {
    ignores: ["dist/*", "node_modules/*", "supabase/functions/**/*", "web-legal/dist/**"],
  },
  {
    // Browser script shipped with the static legal site
    files: ["web-legal/assets/**/*.js"],
    languageOptions: {
      globals: { document: "readonly", window: "readonly" },
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
  },
  {
    // Accessibility guard: every Pressable/Touchable* needs a role, and icon-only
    // ones need a label. Runs in CI via `npm run lint`.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: { "vb-a11y": vbA11y },
    rules: {
      "vb-a11y/touchable-role-and-label": "error",
    },
  },
  {
    // Copy guard: UI strings use sentence case ("Delete my account", not
    // "Delete My Account"). Brand names (VisionBuild, Vi, Pros) are allowed.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: { "vb-copy": vbCopy },
    rules: {
      "vb-copy/sentence-case": "error",
    },
  },
  {
    rules: {
      // Disable react-compiler rule - produces false positives for valid React patterns
      // (e.g. "Cannot access refs during render" for useRef in components,
      // "Cannot access variable before it is declared" for hooks)
      "react-compiler/react-compiler": "off",
      
      // Downgrade react-hooks/refs and react-hooks/immutability to warnings
      // These rules flag valid patterns like accessing .current in FlatList props
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      
      // Disable import/no-unresolved for react-native-url-polyfill
      // (valid dependency that ESLint can't resolve in Expo)
      "import/no-unresolved": ["error", { ignore: ["^react-native-url-polyfill"] }],
    },
  },
];

import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("expo"),
  {
    ignores: ["dist/*", "node_modules/*", "supabase/functions/**/*"],
  },
  {
    rules: {
      // Disable react-compiler rule - produces false positives for valid React patterns
      // (e.g. "Cannot access refs during render" for useRef in components,
      // "Cannot access variable before it is declared" for hooks)
      "react-compiler/react-compiler": "off",
    },
  },
];

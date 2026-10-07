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
      "react-hooks/rules-of-hooks": "off",
      "import/no-unresolved": ["error", { ignore: ["^react-native-url-polyfill"] }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

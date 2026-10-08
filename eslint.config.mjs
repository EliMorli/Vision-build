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
      
      // Disable set-state-in-effect - flags valid patterns like async init in useEffect
      "react-hooks/set-state-in-effect": "off",
      
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

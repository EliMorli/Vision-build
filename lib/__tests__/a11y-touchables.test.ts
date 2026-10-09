/**
 * Accessibility guard tests.
 *
 * 1. Unit-tests the custom ESLint rule `vb-a11y/touchable-role-and-label`.
 * 2. Lints every screen and component with it and fails on any Pressable /
 *    Touchable* missing a role, or any icon-only one missing a label.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import path from "path";

const { RuleTester, Linter } = require("eslint");
const tsParser = require("@typescript-eslint/parser");
const plugin = require("../../scripts/eslint-rules/a11y-touchables.js");

const rule = plugin.rules["touchable-role-and-label"];
const ROOT = path.resolve(__dirname, "../..");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("vb-a11y/touchable-role-and-label", () => {
  ruleTester.run("touchable-role-and-label", rule, {
    valid: [
      // Text button with a role
      `<Pressable accessibilityRole="button" onPress={f}><Text>Save</Text></Pressable>`,
      // Icon-only button with role and label
      `<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={f}><Ionicons name="close" /></Pressable>`,
      // Web-style aria props are accepted too
      `<TouchableOpacity role="link" aria-label="Open site" onPress={f}><Ionicons name="open" /></TouchableOpacity>`,
      // Text nested inside views counts as a visible label
      `<Pressable accessibilityRole="button" onPress={f}><View><Ionicons name="mail" /><Text>Email</Text></View></Pressable>`,
      // Conditional text children
      `<Pressable accessibilityRole="button" onPress={f}>{loading ? <Spinner /> : <Text>Send</Text>}</Pressable>`,
      // Props spread from the caller are trusted
      `<Pressable {...rest}><Ionicons name="add" /></Pressable>`,
      // Tappable Text with a link role is its own label
      `<Text accessibilityRole="link" onPress={f}>Terms</Text>`,
      // Plain non-tappable Text is ignored
      `<Text>Hello</Text>`,
    ],
    invalid: [
      {
        code: `<Pressable onPress={f}><Text>Save</Text></Pressable>`,
        errors: [{ messageId: "missingRole" }],
      },
      {
        code: `<Pressable accessibilityRole="button" onPress={f}><Ionicons name="send" /></Pressable>`,
        errors: [{ messageId: "missingLabel" }],
      },
      {
        code: `<Pressable onPress={f}><Ionicons name="image-outline" /></Pressable>`,
        errors: [{ messageId: "missingRole" }, { messageId: "missingLabel" }],
      },
      {
        code: `<TouchableOpacity accessibilityRole="button" accessibilityLabel="" onPress={f}><Icon /></TouchableOpacity>`,
        errors: [{ messageId: "missingLabel" }],
      },
      {
        code: `<TouchableWithoutFeedback onPress={f}><View /></TouchableWithoutFeedback>`,
        errors: [{ messageId: "missingRole" }, { messageId: "missingLabel" }],
      },
      {
        code: `<Text onPress={f}>Contact support</Text>`,
        errors: [{ messageId: "missingRole" }],
      },
    ],
  });
});

describe("every screen and component passes the a11y guard", () => {
  // Collect app/**/*.tsx and components/**/*.tsx
  const fs = require("fs");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: any) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return /\.tsx$/.test(e.name) ? [full] : [];
    });
  const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "components"))];

  it("finds the source files", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  const linter = new Linter({ configType: "flat" });
  const config = [
    {
      files: ["**/*.tsx"],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { "vb-a11y": plugin },
      rules: { "vb-a11y/touchable-role-and-label": "error" },
    },
  ];

  it("has no tappable element without a role, and no icon-only one without a label", () => {
    const problems: string[] = [];
    for (const file of files) {
      const code = fs.readFileSync(file, "utf8");
      const messages = linter.verify(code, config, { filename: file });
      // Only this rule matters here; files also carry disable comments for other plugins
      for (const m of messages.filter((x: any) => x.ruleId === "vb-a11y/touchable-role-and-label" || x.fatal)) {
        problems.push(`${path.relative(ROOT, file)}:${m.line}:${m.column} ${m.message}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

/**
 * Copy guard: UI strings use sentence case.
 * 1. Unit-tests the custom ESLint rule `vb-copy/sentence-case`.
 * 2. Lints every screen and component and fails on any Title Case UI string.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import path from "path";

const { RuleTester, Linter } = require("eslint");
const tsParser = require("@typescript-eslint/parser");
const plugin = require("../../scripts/eslint-rules/sentence-case.js");

const rule = plugin.rules["sentence-case"];
const ROOT = path.resolve(__dirname, "../..");

const ruleTester = new RuleTester({
  languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

describe("vb-copy/sentence-case", () => {
  ruleTester.run("sentence-case", rule, {
    valid: [
      `<Text>Choose a style</Text>`,
      `<Button label="Delete my account" />`,
      // Brand names, tab names and acronyms
      `<Text>Welcome to VisionBuild, ask Vi anything</Text>`,
      `<Text>Pros waitlist</Text>`,
      `<Text>Go to Profile → Settings → Delete account</Text>`,
      `<Text>AI designs earn XP</Text>`,
      `<Text>Read our Terms of Service and Privacy Policy</Text>`,
      `<Text>Continue with Google</Text>`,
      // Every sentence may start with a capital
      `<Text>Saved. Your design is ready!</Text>`,
      // Quoted UI references keep their case
      `<Text>Tap "Not Now" to skip</Text>`,
      `const tab = { title: "Explore" }`,
    ],
    invalid: [
      { code: `<Text>Choose a Style</Text>`, output: `<Text>Choose a style</Text>`, errors: [{ messageId: "titleCase" }] },
      { code: `<Button label="Delete My Account" />`, output: `<Button label="Delete my account" />`, errors: [{ messageId: "titleCase" }] },
      { code: `<Pressable accessibilityLabel="Report or Block" />`, output: `<Pressable accessibilityLabel="Report or block" />`, errors: [{ messageId: "titleCase" }] },
      { code: `const s = { title: "Quick Tips" }`, output: `const s = { title: "Quick tips" }`, errors: [{ messageId: "titleCase" }] },
      { code: `<Text>{"Submit Report"}</Text>`, output: `<Text>{"Submit report"}</Text>`, errors: [{ messageId: "titleCase" }] },
    ],
  });
});

describe("every screen and component uses sentence case", () => {
  const fs = require("fs");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e: { name: string; isDirectory: () => boolean }) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return /\.tsx?$/.test(e.name) ? [full] : [];
    });
  const files = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "components"))];
  const linter = new Linter({ configType: "flat" });
  const config = [
    {
      files: ["**/*.ts", "**/*.tsx"],
      languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { "vb-copy": plugin },
      rules: { "vb-copy/sentence-case": "error" },
    },
  ];

  it("has no Title Case UI strings", () => {
    const problems: string[] = [];
    for (const file of files) {
      const messages = linter.verify(fs.readFileSync(file, "utf8"), config, { filename: file });
      for (const m of messages.filter((x: { ruleId: string | null; fatal?: boolean }) => x.ruleId === "vb-copy/sentence-case" || x.fatal)) {
        problems.push(`${path.relative(ROOT, file)}:${m.line} ${m.message}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

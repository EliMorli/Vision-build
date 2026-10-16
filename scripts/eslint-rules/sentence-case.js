/**
 * ESLint plugin: vb-copy
 *
 * Rule `vb-copy/sentence-case` flags Title Case UI strings ("Delete My Account")
 * in app/ and components/. VisionBuild uses sentence case everywhere
 * ("Delete my account"). Checked:
 *   - text inside JSX (<Text>Choose a style</Text>)
 *   - string values of UI props (title, label, accessibilityLabel, placeholder, ...)
 *   - string values of UI keys in objects (title:, subtitle:, label:, tabBarLabel:, ...)
 *
 * Brand and product names, screen/tab names used as places ("Profile → Settings"),
 * acronyms and the first word of each sentence may be capitalized.
 */

const UI_PROPS = new Set([
  "title", "subtitle", "label", "confirmLabel", "cancelLabel", "primaryLabel", "secondaryLabel",
  "buttonLabel", "ctaLabel", "accessibilityLabel", "accessibilityHint", "aria-label", "placeholder",
  "headerTitle", "tabBarLabel", "tabBarAccessibilityLabel", "message", "heading", "text", "description",
]);
const UI_KEYS = new Set([
  "title", "subtitle", "label", "tabBarLabel", "headerTitle", "heading", "buttonLabel", "confirmLabel",
  "cancelLabel", "ctaLabel", "accessibilityLabel", "description", "placeholder",
]);

// Words that may be capitalized anywhere
const ALLOWED_WORDS = new Set([
  // brand / product
  "VisionBuild", "Vi", "Pros", "Pro",
  // companies, platforms and services
  "Apple", "Google", "OpenRouter", "Anthropic", "Claude", "Gemini", "Vertex", "Supabase", "Resend",
  "Android", "Gmail", "Outlook", "Expo", "GitHub", "Instagram", "Pinterest",
  // screens and tabs referred to by name, and setting values
  "Home", "Explore", "Create", "Inbox", "Profile", "Settings", "Public", "Private", "Results",
  // places / languages / pronoun
  "California", "English", "I",
  // months and days
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
]);

// Proper-noun phrases removed before checking
const ALLOWED_PHRASES = [
  /Terms of Service/g,
  /Privacy Policy/g,
  /Sign in with Apple/g,
  /Sign In with Apple/g,
  /Hide My Email/g,
  /App Store/g,
  /Google Play/g,
  /Your Privacy Choices/g,
  /Global Privacy Control/g,
  /Apple ID/g,
  /Sign-In & Security/g,
  /Scandinavian|Mid-Century|Bohemian|Industrial|Coastal|Farmhouse|Japandi|Minimalist|Modern|Traditional|Contemporary|Rustic|Art Deco|Mediterranean/g,
];

function titleCaseWords(input) {
  let s = String(input);
  for (const re of ALLOWED_PHRASES) s = s.replace(re, " ");
  // Ignore URLs, emails, {placeholders} and quoted UI references ("Not now")
  s = s
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\S+@\S+/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/["“”][^"“”]*["“”]/g, " . ");
  const offenders = [];
  // Each sentence / fragment may start with a capital
  for (const segment of s.split(/[.!?:;•·—–\n→(),]|\s-\s/)) {
    const words = segment.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    words.slice(1).forEach((w) => {
      if (!/^[A-Z]/.test(w)) return;
      if (ALLOWED_WORDS.has(w.replace(/['’]s$/, ""))) return;
      if (/^[A-Z0-9'’-]{2,}$/.test(w)) return; // acronyms: AI, XP, DELETE, EXIF
      if (/[A-Z]/.test(w.slice(1))) return; // camelCase identifiers
      offenders.push(w);
    });
  }
  return offenders;
}

function check(context, node, value) {
  if (typeof value !== "string" || !/[a-z]/.test(value)) return;
  const words = titleCaseWords(value);
  if (words.length) {
    context.report({
      node,
      messageId: "titleCase",
      data: { text: value.trim().slice(0, 60), words: words.join(", ") },
      fix(fixer) {
        const src = context.sourceCode || context.getSourceCode();
        let raw = src.getText(node);
        for (const w of new Set(words)) {
          const re = new RegExp(`(?<![A-Za-z'’-])${w.replace(/[-’']/g, "\\$&")}(?![A-Za-z])`, "g");
          raw = raw.replace(re, w.charAt(0).toLowerCase() + w.slice(1));
        }
        return fixer.replaceText(node, raw);
      },
    });
  }
}

function stringValue(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === "JSXExpressionContainer") return stringValue(node.expression);
  return null;
}

const sentenceCase = {
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: { description: "UI strings must use sentence case" },
    messages: {
      titleCase: 'Use sentence case in UI text: "{{text}}" (capitalized: {{words}})',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXText(node) {
        check(context, node, node.value);
      },
      JSXExpressionContainer(node) {
        // {"Some text"} as a JSX child
        if (node.parent && node.parent.type === "JSXElement") {
          const v = stringValue(node.expression);
          if (v !== null) check(context, node, v);
        }
      },
      JSXAttribute(node) {
        const name = node.name && (node.name.name || "");
        if (!UI_PROPS.has(name)) return;
        const v = stringValue(node.value);
        if (v !== null) check(context, node, v);
      },
      Property(node) {
        const key = node.key && (node.key.name || node.key.value);
        if (!UI_KEYS.has(key)) return;
        const v = stringValue(node.value);
        if (v !== null) check(context, node, v);
      },
    };
  },
};

module.exports = {
  meta: { name: "vb-copy" },
  rules: { "sentence-case": sentenceCase },
  titleCaseWords,
};

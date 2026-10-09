/**
 * ESLint plugin: vb-a11y
 *
 * Rule `vb-a11y/touchable-role-and-label` fails when a tappable element
 * (Pressable, TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback,
 * TouchableNativeFeedback, or a Text/View/Image with onPress) is missing an
 * accessibility role, or when an
 * icon-only one (no <Text> and no text children) is missing a label.
 *
 * Screen readers otherwise announce these as a bare "button" (or nothing),
 * which Apple treats as an accessibility defect.
 *
 * Accepted role props:  accessibilityRole, role
 * Accepted label props: accessibilityLabel, aria-label, aria-labelledby
 * Elements that spread props ({...rest}) are trusted to receive them from the caller.
 */

const TOUCHABLES = new Set([
  "Pressable",
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
]);

// Host components that become tappable when given onPress
const PRESSABLE_HOSTS = new Set(["Text", "View", "Image", "Animated.View", "Animated.Text"]);

const ROLE_PROPS = new Set(["accessibilityRole", "role"]);
const LABEL_PROPS = new Set(["accessibilityLabel", "aria-label", "aria-labelledby"]);
const TEXT_COMPONENTS = new Set(["Text", "TextInput", "Animated.Text"]);

function elementName(nameNode) {
  if (!nameNode) return "";
  if (nameNode.type === "JSXIdentifier") return nameNode.name;
  if (nameNode.type === "JSXMemberExpression") {
    return `${elementName(nameNode.object)}.${elementName(nameNode.property)}`;
  }
  return "";
}

function baseName(name) {
  const parts = name.split(".");
  return parts[parts.length - 1];
}

function attrValueIsEmpty(attr) {
  if (!attr.value) return true; // <Pressable accessibilityLabel />
  if (attr.value.type === "Literal") return String(attr.value.value).trim() === "";
  if (attr.value.type === "JSXExpressionContainer") {
    const e = attr.value.expression;
    if (e.type === "JSXEmptyExpression") return true;
    if (e.type === "Literal") return e.value === null || e.value === undefined || String(e.value).trim() === "";
    if (e.type === "Identifier" && e.name === "undefined") return true;
  }
  return false;
}

/**
 * Classify the text content of a JSX subtree.
 * Returns "text" if any visible text is found, "unknown" if it contains
 * expressions we cannot see into (e.g. {label}, {renderRow()}), else "none".
 */
function textContent(children) {
  let result = "none";
  const visit = (node) => {
    if (!node || result === "text") return;
    switch (node.type) {
      case "JSXText":
        if (node.value.trim() !== "") result = "text";
        return;
      case "JSXElement": {
        const name = elementName(node.openingElement.name);
        if (TEXT_COMPONENTS.has(name)) {
          result = "text";
          return;
        }
        node.children.forEach(visit);
        return;
      }
      case "JSXFragment":
        node.children.forEach(visit);
        return;
      case "JSXExpressionContainer":
        visit(node.expression);
        return;
      case "JSXEmptyExpression":
        return;
      case "ConditionalExpression":
        visit(node.consequent);
        visit(node.alternate);
        return;
      case "LogicalExpression":
        visit(node.right);
        return;
      case "Literal":
        if (typeof node.value === "string" && node.value.trim() !== "") result = "text";
        return;
      case "TemplateLiteral":
        result = "text";
        return;
      case "ArrowFunctionExpression":
      case "FunctionExpression":
        // Render-prop children: ({ pressed }) => <...>
        if (node.body.type === "JSXElement" || node.body.type === "JSXFragment") visit(node.body);
        else if (result === "none") result = "unknown";
        return;
      default:
        if (result === "none") result = "unknown";
    }
  };
  children.forEach(visit);
  return result;
}

const touchableRoleAndLabel = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require accessibilityRole on every tappable element and accessibilityLabel on icon-only ones",
    },
    schema: [],
    messages: {
      missingRole:
        '<{{name}}> is tappable but has no accessibilityRole. Add accessibilityRole="button" (or "link", "tab", "checkbox", ...).',
      missingLabel:
        "<{{name}}> is icon-only (no visible text) and has no accessibilityLabel. Screen readers would only say \"button\".",
    },
  },
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement;
        const name = elementName(opening.name);
        const attrs = opening.attributes;
        const isTouchable = TOUCHABLES.has(baseName(name));
        const isTappableHost =
          PRESSABLE_HOSTS.has(name) &&
          attrs.some((a) => a.type === "JSXAttribute" && a.name.name === "onPress");
        if (!isTouchable && !isTappableHost) return;
        if (attrs.some((a) => a.type === "JSXSpreadAttribute")) return;

        const has = (set) =>
          attrs.some(
            (a) => a.type === "JSXAttribute" && set.has(a.name.name) && !attrValueIsEmpty(a)
          );

        if (!has(ROLE_PROPS)) {
          context.report({ node: opening, messageId: "missingRole", data: { name } });
        }
        // A tappable <Text> is its own label
        if (!TEXT_COMPONENTS.has(name) && !has(LABEL_PROPS) && textContent(node.children) === "none") {
          context.report({ node: opening, messageId: "missingLabel", data: { name } });
        }
      },
    };
  },
};

module.exports = {
  meta: { name: "vb-a11y" },
  rules: {
    "touchable-role-and-label": touchableRoleAndLabel,
  },
};

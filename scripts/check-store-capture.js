#!/usr/bin/env node
/**
 * Fails if store-capture mode could reach a shipping build:
 * - eas.json "production" (and "base") must set EXPO_PUBLIC_STORE_CAPTURE to "0"
 * - only the "store-capture" profile may set it to "1"
 * - no .env file committed with it on
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
const errors = [];
const resolve = (name, seen = new Set()) => {
  const p = eas.build[name];
  if (!p || seen.has(name)) return {};
  seen.add(name);
  return { ...(p.extends ? resolve(p.extends, seen) : {}), ...(p.env || {}) };
};
for (const name of Object.keys(eas.build)) {
  const v = resolve(name).EXPO_PUBLIC_STORE_CAPTURE;
  if (name === "store-capture") {
    if (v !== "1") errors.push(`store-capture profile must set EXPO_PUBLIC_STORE_CAPTURE=1 (got ${v})`);
  } else if (v === "1") {
    errors.push(`profile "${name}" turns on store-capture mode`);
  }
}
if (resolve("production").EXPO_PUBLIC_STORE_CAPTURE !== "0") errors.push('production must pin EXPO_PUBLIC_STORE_CAPTURE="0"');
for (const f of fs.readdirSync(root).filter((f) => f.startsWith(".env"))) {
  if (/^\s*EXPO_PUBLIC_STORE_CAPTURE\s*=\s*1/m.test(fs.readFileSync(path.join(root, f), "utf8"))) errors.push(`${f} turns on store-capture mode`);
}
if (errors.length) {
  console.error("check:store-capture failed:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("check:store-capture OK (production pinned off; only store-capture profile turns it on)");

#!/usr/bin/env node
/* global URL, AbortSignal */
/**
 * Release gates for the hosted legal pages. Runs in the release-gated CI step
 * (main / tags) next to strip-legal-drafts.js.
 *
 *   Gate 1 (base-url):       EXPO_PUBLIC_LEGAL_BASE_URL must be set and must not
 *                            be the placeholder from lib/config/legal.ts.
 *   Gate 2 (policy-version): the live <base>/privacy page must carry
 *                            <meta name="policy-version" content="N"> where N is
 *                            PRIVACY_POLICY_VERSION, the version the consent
 *                            screen records.
 *   Gate 3 (dmca-agent):     the Terms name a designated DMCA agent
 *                            ({{DMCA_AGENT_EMAIL}}). EXPO_PUBLIC_DMCA_AGENT_EMAIL,
 *                            or dmcaAgentEmail in lib/config/business.ts, must be
 *                            a real email, not the placeholder. It can be the
 *                            support email; the agent must also be registered
 *                            at dmca.copyright.gov.
 *
 * Usage:
 *   EXPO_PUBLIC_LEGAL_BASE_URL=https://example.com/legal node scripts/check-legal-release.js
 *   node scripts/check-legal-release.js --gate=base-url
 *
 * Test hooks (used by scripts/test-legal-release-gates.js with fixtures):
 *   LEGAL_CONFIG_FILE                 read versions/placeholder from this file
 *   LEGAL_RELEASE_PRIVACY_HTML_FILE   read the privacy page from a file instead of fetching
 *   LEGAL_BUSINESS_CONFIG_FILE        read dmcaAgentEmail from this file
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const gateArg = (process.argv.find((a) => a.startsWith("--gate=")) || "").slice(7);
const gates = gateArg ? gateArg.split(",") : ["base-url", "policy-version", "dmca-agent"];

function readLegalConfig() {
  const file = process.env.LEGAL_CONFIG_FILE
    ? path.resolve(process.env.LEGAL_CONFIG_FILE)
    : path.join(ROOT, "lib", "config", "legal.ts");
  const src = fs.readFileSync(file, "utf8");
  const get = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
    if (!m) throw new Error(`${name} not found in ${file}`);
    return m[1];
  };
  return { placeholder: get("LEGAL_BASE_URL_PLACEHOLDER"), privacyVersion: get("PRIVACY_POLICY_VERSION") };
}

function normalize(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function checkBaseUrl(config) {
  const base = normalize(process.env.EXPO_PUBLIC_LEGAL_BASE_URL);
  if (!base) {
    return { ok: false, base, message: "EXPO_PUBLIC_LEGAL_BASE_URL is not set. Set it to where web-legal/dist is deployed." };
  }
  if (base === normalize(config.placeholder)) {
    return { ok: false, base, message: `EXPO_PUBLIC_LEGAL_BASE_URL is still the placeholder (${config.placeholder}). Fill in the real legal site URL.` };
  }
  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    return { ok: false, base, message: `EXPO_PUBLIC_LEGAL_BASE_URL is not a valid URL: ${base}` };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, base, message: `EXPO_PUBLIC_LEGAL_BASE_URL must use https: ${base}` };
  }
  return { ok: true, base, message: `EXPO_PUBLIC_LEGAL_BASE_URL is ${base}` };
}

function checkDmcaAgent() {
  let value = (process.env.EXPO_PUBLIC_DMCA_AGENT_EMAIL || "").trim();
  let source = "EXPO_PUBLIC_DMCA_AGENT_EMAIL";
  if (!value) {
    const file = process.env.LEGAL_BUSINESS_CONFIG_FILE
      ? path.resolve(process.env.LEGAL_BUSINESS_CONFIG_FILE)
      : path.join(ROOT, "lib", "config", "business.ts");
    const m = fs.readFileSync(file, "utf8").match(/dmcaAgentEmail:\s*(?:process\.env\.\w+\s*\|\|\s*)?"([^"]*)"/);
    value = m ? m[1] : "";
    source = "dmcaAgentEmail in lib/config/business.ts";
  }
  if (!value || value.startsWith("[")) {
    return { ok: false, message: `DMCA agent email is unfilled (${value || "missing"}). Set EXPO_PUBLIC_DMCA_AGENT_EMAIL or dmcaAgentEmail; it can be the support email. Register the agent at dmca.copyright.gov.` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ok: false, message: `DMCA agent email is not a valid email: ${value}` };
  }
  return { ok: true, message: `DMCA agent email is ${value} (${source})` };
}

function readPolicyVersion(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (/\bname\s*=\s*["']policy-version["']/i.test(tag)) {
      const c = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      return c ? c[1].trim() : "";
    }
  }
  return null;
}

async function loadPrivacyHtml(base) {
  if (process.env.LEGAL_RELEASE_PRIVACY_HTML_FILE) {
    return { url: process.env.LEGAL_RELEASE_PRIVACY_HTML_FILE, html: fs.readFileSync(process.env.LEGAL_RELEASE_PRIVACY_HTML_FILE, "utf8") };
  }
  const url = `${base}/privacy`;
  const res = await fetch(url, { redirect: "follow", headers: { "cache-control": "no-cache" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`GET ${url} returned HTTP ${res.status}`);
  return { url, html: await res.text() };
}

async function checkPolicyVersion(config, base) {
  let loaded;
  try {
    loaded = await loadPrivacyHtml(base);
  } catch (e) {
    return { ok: false, message: `Could not load the live Privacy Policy: ${e.message}` };
  }
  const live = readPolicyVersion(loaded.html);
  if (live === null) {
    return { ok: false, message: `${loaded.url} has no <meta name="policy-version">. Deploy the output of npm run legal:build.` };
  }
  if (live !== config.privacyVersion) {
    return {
      ok: false,
      message: `Live Privacy Policy is version "${live}" but the consent screen records version "${config.privacyVersion}" (PRIVACY_POLICY_VERSION). Deploy the current web-legal build or fix the version.`,
    };
  }
  return { ok: true, message: `Live Privacy Policy version "${live}" matches the consent screen` };
}

async function main() {
  const config = readLegalConfig();
  let failed = false;
  const baseResult = checkBaseUrl(config);
  if (gates.includes("base-url")) {
    console.log(`${baseResult.ok ? "✅" : "❌"} [base-url] ${baseResult.message}`);
    if (!baseResult.ok) failed = true;
  }
  if (gates.includes("policy-version")) {
    if (!baseResult.base && !process.env.LEGAL_RELEASE_PRIVACY_HTML_FILE) {
      console.log("❌ [policy-version] Cannot fetch /privacy without EXPO_PUBLIC_LEGAL_BASE_URL");
      failed = true;
    } else {
      const r = await checkPolicyVersion(config, baseResult.base);
      console.log(`${r.ok ? "✅" : "❌"} [policy-version] ${r.message}`);
      if (!r.ok) failed = true;
    }
  }
  if (gates.includes("dmca-agent")) {
    const r = checkDmcaAgent();
    console.log(`${r.ok ? "✅" : "❌"} [dmca-agent] ${r.message}`);
    if (!r.ok) failed = true;
  }
  if (failed) {
    console.error("❌ Legal release gates FAILED");
    process.exit(1);
  }
  console.log("✅ Legal release gates passed");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`❌ ${e.stack || e}`);
    process.exit(1);
  });
}

module.exports = { readPolicyVersion, checkBaseUrl, checkDmcaAgent, normalize };

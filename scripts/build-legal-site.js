#!/usr/bin/env node
/**
 * Build the static legal website (web-legal/dist) that the app opens from
 * Settings → About, the sign-in screen and the AI consent screen.
 *
 *   npm run legal:build                 # draft build (draft notes highlighted)
 *   npm run legal:build -- --release    # release build: fails on DRAFT banners,
 *                                       # [NOTE]s, [CONFIRM]s and placeholders
 *
 * Sources:
 *   - Terms / Privacy text: the markdown in app/terms.tsx and app/privacy.tsx
 *     (the same text strip-legal-drafts.js validates for release).
 *   - Older policy versions: web-legal/archive/<doc>/v<N>.md (see versions.json).
 *   - Delete-account page: web-legal/content/delete-account.md, with the
 *     retention table copied from Privacy Policy section 6.
 *   - Licenses: lib/generated/licenses.ts (scripts/generate-licenses.js).
 *
 * Output paths (relative links only, so it works under any base path):
 *   /index.html  /terms/  /terms/v1/  /privacy/  /privacy/v1/  /licenses/
 *   /delete-account/  /support/
 *
 * Deployment is manual and documented in docs/HANDOFF.md. This script never
 * uploads anything.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { render, escapeHtml } = require("./web-legal/markdown");
const { groupLicenses, groupTexts, parseGeneratedLicenses } = require("./web-legal/group-licenses");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "web-legal");
const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith("--out="));
const OUT = outArg ? path.resolve(outArg.slice(6)) : path.join(SRC, "dist");
const RELEASE = args.includes("--release") || process.env.LEGAL_RELEASE === "true";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ---------------------------------------------------------------- config
function extractMarkdown(tsxPath) {
  const m = read(tsxPath).match(/const\s+\w+Markdown\s*=\s*"([\s\S]+?)";\s*export default/);
  if (!m) fail(`Could not extract markdown from ${tsxPath}`);
  return JSON.parse(`"${m[1]}"`);
}

function readBusinessConfig() {
  const src = read("lib/config/business.ts");
  const field = (name) => {
    const m = src.match(new RegExp(`${name}:\\s*(?:process\\.env\\.(\\w+)\\s*\\|\\|\\s*)?"([^"]*)"`));
    if (!m) fail(`Could not read ${name} from lib/config/business.ts`);
    return (m[1] && process.env[m[1]]) || m[2];
  };
  const address = `${field("street")}, ${field("city")}, ${field("state")} ${field("zip")}, ${field("country")}`;
  return {
    COMPANY_LEGAL_NAME: field("legalName"),
    ENTITY_TYPE: field("entityType"),
    SUPPORT_EMAIL: field("supportEmail"),
    MAILING_ADDRESS: address,
    WEBSITE_DOMAIN: field("websiteDomain"),
  };
}

function readAppVersions() {
  const src = read("lib/config/legal.ts");
  const v = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
    if (!m) fail(`Could not read ${name} from lib/config/legal.ts`);
    return m[1];
  };
  return { terms: v("TERMS_VERSION"), privacy: v("PRIVACY_POLICY_VERSION") };
}

function fillTokens(md, tokens) {
  return md.replace(/\{\{(\w+)\}\}/g, (all, key) => (key in tokens ? tokens[key] : all));
}

// ---------------------------------------------------------------- release checks
function releaseChecks() {
  console.log("🔒 Release build: validating legal text (strip-legal-drafts rules)...");
  try {
    execFileSync(process.execPath, [path.join(__dirname, "strip-legal-drafts.js")], { stdio: "inherit" });
  } catch {
    fail("Legal text is not ready for release (see strip-legal-drafts output above)");
  }
}

function releaseCheckRendered(name, md) {
  const problems = [];
  if (/DRAFT/i.test(md)) problems.push("DRAFT banner");
  const brackets = (md.match(/\[[^\]]{1,100}\](?!\()/g) || []).filter((b) => !/^\[\d+\]$/.test(b));
  if (brackets.length) problems.push(`unfilled blanks: ${[...new Set(brackets)].join(", ")}`);
  if (/\{\{\w+\}\}/.test(md)) problems.push("unreplaced {{TOKENS}}");
  if (problems.length) fail(`${name} is not ready for release: ${problems.join("; ")}`);
}

// ---------------------------------------------------------------- layout
const NAV = [
  { key: "terms", label: "Terms", href: "terms/" },
  { key: "privacy", label: "Privacy", href: "privacy/" },
  { key: "licenses", label: "Licenses", href: "licenses/" },
  { key: "delete-account", label: "Delete account", href: "delete-account/" },
];

function page({ rel, title, description, current, meta = [], body, scripts = [] }) {
  const nav = NAV.map(
    (n) => `<a href="${rel}${n.href}"${n.key === current ? ' aria-current="page"' : ""}>${n.label}</a>`
  ).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · VisionBuild</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="${RELEASE ? "index, follow" : "noindex"}">
${meta.map(([n, c]) => `<meta name="${n}" content="${escapeHtml(c)}">`).join("\n")}
<link rel="stylesheet" href="${rel}assets/site.css">
</head>
<body>
<header class="site-header"><div class="inner">
<a class="brand" href="${rel}">VisionBuild</a>
<nav class="site-nav" aria-label="Legal pages">${nav}</nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-footer"><div class="inner">© VisionBuild · <a href="${rel}support/">Support</a> · <a href="${rel}">All legal pages</a></div></footer>
${scripts.map((s) => `<script src="${rel}${s}"></script>`).join("\n")}
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// ---------------------------------------------------------------- policies
function buildPolicy(doc, cfg, tokens) {
  const versions = cfg.versions;
  const current = versions.find((v) => v.version === cfg.current);
  if (!current) fail(`versions.json: ${doc}.current "${cfg.current}" has no entry`);
  const seen = new Set();
  for (const v of versions) {
    if (seen.has(v.version)) fail(`versions.json: duplicate ${doc} version ${v.version}`);
    seen.add(v.version);
    if (!v.effectiveDate) fail(`versions.json: ${doc} v${v.version} needs an effectiveDate`);
  }
  if (current.source !== `app/${doc}.tsx`) fail(`versions.json: the current ${doc} version must come from app/${doc}.tsx`);

  for (const v of versions) {
    const isCurrent = v.version === cfg.current;
    const raw = v.source.endsWith(".tsx") ? extractMarkdown(v.source) : read(v.source);
    const outputs = isCurrent ? [`${doc}/index.html`, `${doc}/v${v.version}/index.html`] : [`${doc}/v${v.version}/index.html`];
    for (const out of outputs) {
      const depth = out.split("/").length - 1;
      const rel = "../".repeat(depth);
      let md = fillTokens(raw, { ...tokens, EFFECTIVE_DATE: v.effectiveDate });
      if (doc === "privacy") {
        md = md.replace(
          /(## 7\. Deleting your account\n)/,
          `$1\nStep-by-step instructions, and what we delete and keep: [Delete your VisionBuild account](${rel}delete-account/).\n`
        );
      }
      if (RELEASE) releaseCheckRendered(`${doc} v${v.version}`, md);
      // The page shows its own version / effective date block; drop the
      // duplicated lines from the markdown header.
      md = md.replace(/^\*\*(Effective date|Last updated):\*\*.*\n?/gm, "");
      const { html } = render(md);
      const history = versions
        .slice()
        .sort((a, b) => Number(b.version) - Number(a.version))
        .map((h) => {
          const label = `Version ${escapeHtml(h.version)}, effective ${escapeHtml(h.effectiveDate)}`;
          const href = `${rel}${doc}/v${h.version}/`;
          const tag = h.version === cfg.current ? " (current)" : "";
          return h.version === v.version && !isCurrent
            ? `<li><strong>${label}</strong> (this page)</li>`
            : `<li><a href="${href}">${label}</a>${tag}</li>`;
        })
        .join("");
      const archivedNotice = isCurrent
        ? ""
        : `<p class="notice" role="note">This is an earlier version of our ${cfg.title}. <a href="${rel}${doc}/">Read the current version</a>.</p>`;
      const body = `${archivedNotice}
<ul class="policy-meta" aria-label="Policy details">
<li data-testid="policy-version">Version ${escapeHtml(v.version)}</li>
<li data-testid="policy-effective-date">Effective ${escapeHtml(v.effectiveDate)}</li>
</ul>
<article>
${html}
</article>
<section class="history" aria-labelledby="history-title">
<h2 id="history-title">Version history</h2>
<ul>${history}</ul>
</section>`;
      write(
        out,
        page({
          rel,
          title: cfg.title,
          description: `VisionBuild ${cfg.title}, version ${v.version}, effective ${v.effectiveDate}.`,
          current: isCurrent ? doc : undefined,
          meta: [
            ["policy-version", v.version],
            ["policy-effective-date", v.effectiveDate],
          ],
          body,
        })
      );
    }
  }
  return current;
}

// ---------------------------------------------------------------- delete account
function retentionTable(privacyMd) {
  const section = privacyMd.split(/\n## 6\. [^\n]*\n/)[1];
  if (!section) fail("Could not find section 6 (retention) in the Privacy Policy");
  const lines = section.split("\n## ")[0].split("\n").filter((l) => l.startsWith("|"));
  if (lines.length < 3) fail("Could not find the retention table in Privacy Policy section 6");
  return lines.join("\n");
}

function buildDeleteAccount(tokens, privacyEffectiveDate) {
  const privacyMd = fillTokens(extractMarkdown("app/privacy.tsx"), { ...tokens, EFFECTIVE_DATE: privacyEffectiveDate });
  const rel = "../";
  let md = fillTokens(read("web-legal/content/delete-account.md"), {
    ...tokens,
    PRIVACY_URL: `${rel}privacy/#6-how-long-we-keep-information`,
    RETENTION_TABLE: retentionTable(privacyMd),
  });
  if (RELEASE) releaseCheckRendered("delete-account", md);
  write(
    "delete-account/index.html",
    page({
      rel,
      title: "Delete your account",
      description: "How to delete your VisionBuild account, what we delete and what we keep.",
      current: "delete-account",
      body: `<article>${render(md).html}</article>`,
    })
  );
}

// ---------------------------------------------------------------- support
function buildSupport(tokens) {
  const rel = "../";
  const md = fillTokens(read("web-legal/content/support.md"), {
    ...tokens,
    TERMS_URL: `${rel}terms/`,
    PRIVACY_URL: `${rel}privacy/`,
    LICENSES_URL: `${rel}licenses/`,
    DELETE_URL: `${rel}delete-account/`,
  });
  if (RELEASE) releaseCheckRendered("support", md);
  write(
    "support/index.html",
    page({ rel, title: "Support", description: "Get help with VisionBuild.", current: "support", body: `<article>${render(md).html}</article>` })
  );
}

// ---------------------------------------------------------------- licenses
function buildLicenses() {
  const { texts, licenses } = parseGeneratedLicenses(read("lib/generated/licenses.ts"));
  const groups = groupLicenses(licenses);
  const rows = groups
    .map((g) => {
      const versions = g.versions.join(", ");
      const types = g.licenseTypes.join(", ");
      const sections = groupTexts(g, texts)
        .map(
          (s, _i, all) =>
            (all.length > 1 ? `<p class="text-versions">Version${s.versions.length > 1 ? "s" : ""} ${escapeHtml(s.versions.join(", "))}</p>` : "") +
            `<pre class="license-text">${escapeHtml(s.text)}</pre>`
        )
        .join("");
      const search = `${g.name} ${types} ${versions}`.toLowerCase();
      return `<li data-package data-search="${escapeHtml(search)}"><details>
<summary><span class="pkg-name">${escapeHtml(g.name)}<span class="pkg-meta">${escapeHtml(types)} · ${g.versions.length > 1 ? "versions" : "version"} ${escapeHtml(versions)}</span></span></summary>
${sections}
</details></li>`;
    })
    .join("\n");
  const body = `<h1>Open-source licenses</h1>
<p>VisionBuild is built with these open-source packages. Tap a package to read its license. Packages installed in more than one version are listed once.</p>
<div class="search" role="search">
<label for="license-search">Search packages</label>
<input id="license-search" type="search" placeholder="Package or license name" autocomplete="off" spellcheck="false">
<p class="result-count" id="result-count" aria-live="polite">${groups.length} packages</p>
</div>
<ul class="packages">
${rows}
</ul>
<p class="no-results" id="no-results" hidden>No packages match your search.</p>`;
  write(
    "licenses/index.html",
    page({
      rel: "../",
      title: "Open-source licenses",
      description: "Open-source software used in the VisionBuild app.",
      current: "licenses",
      body,
      scripts: ["assets/licenses.js"],
    })
  );
  return { packages: groups.length, entries: licenses.length };
}

// ---------------------------------------------------------------- index + assets
function buildIndex(policies) {
  const card = (href, title, sub) => `<li><a href="${href}"><strong>${title}</strong><span>${sub}</span></a></li>`;
  const body = `${render(read("web-legal/content/index.md")).html}
<ul class="card-list">
${card("terms/", "Terms of Service", `Version ${policies.terms.version} · Effective ${escapeHtml(policies.terms.effectiveDate)}`)}
${card("privacy/", "Privacy Policy", `Version ${policies.privacy.version} · Effective ${escapeHtml(policies.privacy.effectiveDate)}`)}
${card("licenses/", "Open-source licenses", "Software VisionBuild is built with")}
${card("delete-account/", "Delete your account", "How to delete your account and what we keep")}
${card("support/", "Support", "Contact us and common questions")}
</ul>`;
  write("index.html", page({ rel: "", title: "Legal", description: "VisionBuild terms, privacy policy, licenses and account deletion.", body }));
}

function copyAssets() {
  fs.mkdirSync(path.join(OUT, "assets", "fonts"), { recursive: true });
  for (const f of ["site.css", "licenses.js"]) fs.copyFileSync(path.join(SRC, "assets", f), path.join(OUT, "assets", f));
  const fontDir = path.join(ROOT, "node_modules", "@expo-google-fonts", "nunito");
  for (const w of ["400Regular", "600SemiBold", "700Bold", "800ExtraBold"]) {
    const file = path.join(fontDir, w, `Nunito_${w}.ttf`);
    if (!fs.existsSync(file)) fail(`Missing font ${file} (run npm ci)`);
    fs.copyFileSync(file, path.join(OUT, "assets", "fonts", `Nunito_${w}.ttf`));
  }
  // Nunito is SIL OFL 1.1; ship the license next to the font files.
  const ofl = path.join(fontDir, "LICENSE_FONT");
  if (fs.existsSync(ofl)) fs.copyFileSync(ofl, path.join(OUT, "assets", "fonts", "OFL.txt"));
}

// ---------------------------------------------------------------- main
function main() {
  if (RELEASE) releaseChecks();
  const versionsCfg = JSON.parse(read("web-legal/versions.json"));
  const appVersions = readAppVersions();
  for (const doc of ["terms", "privacy"]) {
    if (versionsCfg[doc].current !== appVersions[doc]) {
      fail(
        `web-legal/versions.json ${doc}.current is "${versionsCfg[doc].current}" but lib/config/legal.ts says "${appVersions[doc]}". Bump both together.`
      );
    }
  }
  const tokens = readBusinessConfig();
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const policies = {
    terms: buildPolicy("terms", versionsCfg.terms, tokens),
    privacy: buildPolicy("privacy", versionsCfg.privacy, tokens),
  };
  buildDeleteAccount(tokens, policies.privacy.effectiveDate);
  buildSupport(tokens);
  const lic = buildLicenses();
  buildIndex(policies);
  copyAssets();
  console.log(`✅ Legal site built${RELEASE ? " (release)" : " (draft)"} → ${path.relative(ROOT, OUT) || OUT}`);
  console.log(`   terms v${policies.terms.version}, privacy v${policies.privacy.version}, ${lic.packages} packages (${lic.entries} installed versions)`);
}

main();

#!/usr/bin/env node
/**
 * Self-test for scripts/check-legal-release.js (runs on every CI build).
 * Proves each release gate fails when it should and passes when it should,
 * including the real HTTP fetch of /privacy against a local server.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const FIX = path.join(__dirname, "__fixtures__", "legal-release");
const CHECK = path.join(__dirname, "check-legal-release.js");

function run(env, args = []) {
  const clean = { ...process.env };
  delete clean.EXPO_PUBLIC_LEGAL_BASE_URL;
  delete clean.LEGAL_RELEASE_PRIVACY_HTML_FILE;
  delete clean.EXPO_PUBLIC_DMCA_AGENT_EMAIL;
  // Async spawn so the local HTTP server below keeps serving while it runs.
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CHECK, ...args], {
      env: { ...clean, LEGAL_CONFIG_FILE: path.join(FIX, "legal.ts"), LEGAL_BUSINESS_CONFIG_FILE: path.join(FIX, "business.ts"), ...env },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code, out }));
  });
}

async function main() {
  // Local server standing in for the deployed legal site.
  const routes = {
    "/good/privacy": "privacy-v7.html",
    "/stale/privacy": "privacy-v6.html",
    "/nometa/privacy": "privacy-no-meta.html",
  };
  const server = http.createServer((req, res) => {
    const file = routes[req.url.replace(/\/$/, "")];
    if (!file) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(fs.readFileSync(path.join(FIX, file)));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const local = `http://127.0.0.1:${server.address().port}`;

  const cases = [
    // Gate 1: base URL
    { name: "base-url fails when unset", env: {}, args: ["--gate=base-url"], code: 1, expect: /not set/ },
    { name: "base-url fails on the placeholder", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "https://visionbuild.app/legal/" }, args: ["--gate=base-url"], code: 1, expect: /still the placeholder/ },
    { name: "base-url fails on http", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "http://legal.example.com" }, args: ["--gate=base-url"], code: 1, expect: /must use https/ },
    { name: "base-url passes on a real https URL", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "https://legal.example.com" }, args: ["--gate=base-url"], code: 0, expect: /\[base-url\] EXPO_PUBLIC_LEGAL_BASE_URL is https:\/\/legal.example.com/ },
    // Gate 2: live policy version (file fixtures)
    { name: "policy-version passes when the meta matches", env: { LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-v7.html") }, args: ["--gate=policy-version"], code: 0, expect: /version "7" matches/ },
    { name: "policy-version fails on a stale page", env: { LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-v6.html") }, args: ["--gate=policy-version"], code: 1, expect: /version "6" but the consent screen records version "7"/ },
    { name: "policy-version fails without the meta tag", env: { LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-no-meta.html") }, args: ["--gate=policy-version"], code: 1, expect: /no <meta name="policy-version">/ },
    // Gate 2 over real HTTP
    { name: "policy-version fetch passes (HTTP)", env: { EXPO_PUBLIC_LEGAL_BASE_URL: `${local}/good` }, args: ["--gate=policy-version"], code: 0, expect: /matches/ },
    { name: "policy-version fetch fails on stale page (HTTP)", env: { EXPO_PUBLIC_LEGAL_BASE_URL: `${local}/stale/` }, args: ["--gate=policy-version"], code: 1, expect: /version "6"/ },
    { name: "policy-version fetch fails on 404 (HTTP)", env: { EXPO_PUBLIC_LEGAL_BASE_URL: `${local}/missing` }, args: ["--gate=policy-version"], code: 1, expect: /HTTP 404/ },
    // Gate 3: designated DMCA agent ({{DMCA_AGENT_EMAIL}})
    { name: "dmca-agent fails on the placeholder", env: {}, args: ["--gate=dmca-agent"], code: 1, expect: /DMCA agent email is unfilled \(\[dmca-agent@yourdomain\.com\]\)/ },
    { name: "dmca-agent fails on an invalid email", env: { EXPO_PUBLIC_DMCA_AGENT_EMAIL: "copyright-at-example" }, args: ["--gate=dmca-agent"], code: 1, expect: /not a valid email/ },
    { name: "dmca-agent passes with a real email", env: { EXPO_PUBLIC_DMCA_AGENT_EMAIL: "support@example.com" }, args: ["--gate=dmca-agent"], code: 0, expect: /\[dmca-agent\] DMCA agent email is support@example.com/ },
    // All gates together
    { name: "all gates fail on the placeholder", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "https://visionbuild.app/legal", LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-v7.html") }, args: [], code: 1, expect: /still the placeholder/ },
    { name: "all gates fail while the DMCA agent is unfilled", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "https://legal.example.com", LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-v7.html") }, args: [], code: 1, expect: /❌ \[dmca-agent\]/ },
    { name: "all gates pass with a real URL, matching page and DMCA agent", env: { EXPO_PUBLIC_LEGAL_BASE_URL: "https://legal.example.com", LEGAL_RELEASE_PRIVACY_HTML_FILE: path.join(FIX, "privacy-v7.html"), EXPO_PUBLIC_DMCA_AGENT_EMAIL: "copyright@example.com" }, args: [], code: 0, expect: /Legal release gates passed/ },
  ];

  let failures = 0;
  for (const c of cases) {
    const r = await run(c.env, c.args);
    const ok = r.code === c.code && c.expect.test(r.out);
    console.log(`${ok ? "✅" : "❌"} ${c.name} (exit ${r.code})`);
    if (!ok) {
      failures++;
      console.log(r.out.split("\n").map((l) => `     ${l}`).join("\n"));
    }
  }
  server.close();
  if (failures) {
    console.error(`❌ ${failures} of ${cases.length} legal release gate self-tests failed`);
    process.exit(1);
  }
  console.log(`✅ All ${cases.length} legal release gate self-tests passed`);
}

main();

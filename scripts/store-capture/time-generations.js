#!/usr/bin/env node
/**
 * Time N real generations (default 10) and report median and slowest, so the
 * screenshot caption only claims what the app delivers (Compliance: "in seconds"
 * needs the numbers to back it).
 *
 * STUB until the real keys exist. Runs against a deployed Supabase project with
 * the generate function and OpenRouter (ZDR) key configured:
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... TEST_USER_JWT=... TEST_PROJECT_ID=... \
 *   node scripts/store-capture/time-generations.js [--runs=10] [--style="modern style"]
 *
 * TEST_PROJECT_ID is a project of the test account whose room photo is already
 * uploaded and analyzed (do that once in the TestFlight app with a real room photo).
 *
 * TEST_USER_JWT is a session token for a test account that has accepted AI consent.
 * It is read from the environment only and never printed or written to disk.
 * Results (timings only, no images or tokens) go to stdout and
 * /workspace/visionbuild/store-shots/generation-timing.json.
 *
 * Measures wall time of one full "Generate 4 designs" request end to end, which is what
 * a user waits for on the Generating screen. This is a report, not a test: no thresholds.
 */
const fs = require("fs");
const path = require("path");

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const RUNS = Number(arg("runs", "10"));
const STYLE = arg("style", "modern style");
const FN = arg("function", "generate-design");
const OUT = arg("out", "/workspace/visionbuild/store-shots/generation-timing.json");

const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "TEST_USER_JWT", "TEST_PROJECT_ID"].filter((k) => !process.env[k]);
if (missing.length) {
  console.log(`time-generations: not run, missing ${missing.join(", ")}.`);
  console.log("Run this against the TestFlight backend once the Supabase and OpenRouter keys are in.");
  process.exit(0);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

(async () => {
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/${FN}`;
  const times = [];
  const failures = [];
  for (let i = 1; i <= RUNS; i++) {
    const t0 = process.hrtime.bigint();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.TEST_USER_JWT}`,
        },
        body: JSON.stringify({ projectId: process.env.TEST_PROJECT_ID, stylePrompt: STYLE }),
      });
      await res.arrayBuffer();
      const secs = Number(process.hrtime.bigint() - t0) / 1e9;
      if (!res.ok) { failures.push({ run: i, status: res.status }); console.log(`run ${i}: HTTP ${res.status}`); continue; }
      times.push(secs);
      console.log(`run ${i}: ${secs.toFixed(1)} s`);
    } catch (e) {
      failures.push({ run: i, error: String(e.message || e) });
      console.log(`run ${i}: failed (${e.message || e})`);
    }
  }
  const report = {
    runs: RUNS, ok: times.length, failures,
    median_s: times.length ? +median(times).toFixed(1) : null,
    max_s: times.length ? +Math.max(...times).toFixed(1) : null,
    style: STYLE, function: FN, measured_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(`median ${report.median_s} s, slowest ${report.max_s} s (${times.length}/${RUNS} ok) -> ${OUT}`);
})();

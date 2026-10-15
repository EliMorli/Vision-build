#!/usr/bin/env node
/* global document, localStorage */
/**
 * App Store screenshot capture (RN-web build in store-capture mode).
 *
 *   EXPO_PUBLIC_DEV_MOCK_SESSION=true EXPO_PUBLIC_STORE_CAPTURE=1 npx expo start --web --port 19007
 *   node scripts/store-capture/capture.js [--base=http://localhost:19007] [--out=/workspace/visionbuild/store-shots]
 *       [--photo=path/to/room.jpg] [--final]
 *
 * Slots follow brand/real/README.md (listing order; App Store search shows the first three):
 *   01-home          Home with projects (no waitlist card in frame)
 *   02-style-picker  pick a style for the room photo
 *   03-generating    the Generating screen
 *   04-results       before / after results (AI-generated label visible)
 *   05-vi            Vi, the design assistant
 *   06-profile       Profile with earned badges
 * at iPhone 6.9" (1320x2868, 440x956 @3x) and 6.5" (1284x2778, 428x926 @3x).
 *
 * Until --final is passed with a real photo, every frame is stamped
 * "PLACEHOLDER" and uses the labeled placeholder room photo: these are layout
 * proofs only. Final store assets come from the TestFlight build with real
 * generated output and go to Compliance before upload.
 *
 * The script refuses to run against a build that isn't in store-capture mode
 * (a "Join the waitlist" card on Home means the flag is off).
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("@playwright/test");

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const BASE = arg("base", process.env.CAPTURE_BASE_URL || "http://localhost:19007");
const OUT = arg("out", "/workspace/visionbuild/store-shots");
const FINAL = process.argv.includes("--final");
const PHOTO = arg("photo", path.join(__dirname, "placeholders", "placeholder-room-1.jpg"));
if (FINAL && PHOTO.includes(`${path.sep}placeholders${path.sep}`)) {
  console.error("--final needs --photo=<real room photo>; placeholders are never final.");
  process.exit(1);
}

const DEVICES = [
  { name: "iphone-6.9", width: 440, height: 956, scale: 3, expect: [1320, 2868] },
  { name: "iphone-6.5", width: 428, height: 926, scale: 3, expect: [1284, 2778] },
];

const STAMP_CSS = `
  body::after {
    content: "PLACEHOLDER: layout proof, not a store asset";
    position: fixed; top: 46%; left: -10%; width: 120%; text-align: center;
    transform: rotate(-24deg); pointer-events: none; z-index: 2147483647;
    font: 800 22px system-ui, sans-serif; color: rgba(176, 0, 32, 0.55);
    background: rgba(255, 255, 255, 0.55); padding: 8px 0; letter-spacing: 1px;
  }`;

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts && document.fonts.ready);
}

async function capture(browser, device) {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    deviceScaleFactor: device.scale,
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  await context.addInitScript(() => {
    localStorage.setItem("@visionbuild:intro_seen", "true");
    localStorage.setItem("@visionbuild:mock_session", "true");
    localStorage.setItem("@visionbuild:ai_consent", "true");
    localStorage.setItem("@visionbuild:ai_consent_version", "2026-10-07b");
    localStorage.setItem("@visionbuild:blocks", "[]");
    // Three saved rooms in three styles (one outdoor): Home has projects and
    // Profile shows First room, Style hopper and Exterior pro as earned.
    if (!localStorage.getItem("@visionbuild:mock_seed_projects")) {
      const now = new Date().toISOString();
      const p = (id, title, style, roomType) => ({
        id, user_id: "mock-user", title, status: "generated", selected_style: style, is_public: false,
        room_analysis: { roomType }, original_image_url: "mock/original.jpg",
        generated_image_urls: ["mock/gen1.jpg", "mock/gen2.jpg", "mock/gen3.jpg", "mock/gen4.jpg"],
        selected_generation_url: "mock/gen1.jpg", created_at: now, updated_at: now,
      });
      localStorage.setItem("@visionbuild:mock_seed_projects", JSON.stringify([
        p("shot-living", "Living room", "modern", "living_room"),
        p("shot-kitchen", "Kitchen", "farmhouse", "kitchen"),
        p("shot-backyard", "Backyard", "scandinavian", "backyard"),
      ]));
    }
  });
  const page = await context.newPage();
  const dir = path.join(OUT, device.name);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const shot = async (name) => {
    await settle(page);
    if (!FINAL) await page.addStyleTag({ content: STAMP_CSS });
    const file = path.join(dir, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    files.push(file);
    console.log(`  ${device.name}/${name}.png`);
  };
  const visible = (loc) => loc.first().waitFor({ state: "visible", timeout: 20000 });

  // 01 Home with projects
  await page.goto(BASE);
  await settle(page);
  await visible(page.getByTestId("home-start-new-room"));
  if (await page.getByTestId("pros-teaser").count()) {
    throw new Error(`${BASE} is not a store-capture build (waitlist card on Home). Start it with EXPO_PUBLIC_STORE_CAPTURE=1.`);
  }
  await shot("01-home");

  // 02 style picker for the room photo
  await page.getByTestId("home-start-new-room").click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /gallery/i }).click(),
  ]);
  await chooser.setFiles(PHOTO);
  await page.getByRole("button", { name: /analyze/i }).click();
  await visible(page.getByTestId("style-picker-header"));
  await page.getByText(/modern/i).first().click();
  await shot("02-style-picker");

  // 04 results (captured before 03: the live flow leaves Generating by itself)
  await page.getByRole("button", { name: /generate/i }).click();
  await visible(page.getByTestId("result-design-card"));
  await page.getByTestId("result-design-card").first().click();
  await visible(page.getByTestId("result-ai-badge"));
  await shot("04-results");

  // 03 Generating, opened straight on a saved room (it stays on the progress screen)
  await page.goto(`${BASE}/generating/shot-living`);
  await visible(page.getByTestId("generating-screen"));
  await shot("03-generating");

  // 05 Vi
  await page.goto(BASE);
  await visible(page.getByTestId("tab-vi"));
  await page.getByTestId("tab-vi").click();
  await visible(page.getByTestId("vi-input"));
  await shot("05-vi");

  // 06 Profile with earned badges
  await page.getByTestId("tab-profile").click();
  await visible(page.getByText("Style hopper"));
  await page.getByText("Style hopper").first().scrollIntoViewIfNeeded();
  await shot("06-profile");

  for (const f of ["tab-inbox", "pros-teaser", "results-waitlist-card", "project-brief-waitlist"]) {
    if (await page.getByTestId(f).count()) throw new Error(`not-live entry point "${f}" rendered in capture mode`);
  }
  await context.close();
  return files;
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  try {
    for (const d of DEVICES) {
      console.log(`${d.name} (${d.expect.join("x")})`);
      for (const f of await capture(browser, d)) all.push({ f, d });
    }
  } finally {
    await browser.close();
  }
  // Verify pixel sizes from the PNG header
  let bad = 0;
  for (const { f, d } of all) {
    const b = fs.readFileSync(f);
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    if (w !== d.expect[0] || h !== d.expect[1]) { console.error(`wrong size ${w}x${h}: ${f}`); bad++; }
  }
  if (bad) process.exit(1);
  console.log(`${all.length} shots in ${OUT}${FINAL ? "" : " (PLACEHOLDER: not for upload)"}`);
})().catch((e) => { console.error(e.message || e); process.exit(1); });

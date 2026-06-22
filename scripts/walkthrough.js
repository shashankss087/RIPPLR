// Screenshot walkthrough of the RIPPLR Orchestrator.
// Logs in as admin, captures every module, then logs in as a brand user to
// show tenant scoping.
//
// Playwright is intentionally NOT a project dependency (keeps `npm install`
// lean). To regenerate the screenshots, install it ad-hoc first:
//   npm i -D playwright && npx playwright install chromium
//   BASE=http://localhost:3000 node scripts/walkthrough.js
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:3010";
const OUT = process.env.OUT || "/home/user/RIPPLR/walkthrough";
const fs = require("fs");
fs.mkdirSync(OUT, { recursive: true });

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="username"]', email);
  await page.fill('input[autocomplete="current-password"]', "ripplr123");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

async function shoot(page, path, file, waitText) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (waitText) {
    try { await page.getByText(waitText, { exact: false }).first().waitFor({ timeout: 8000 }); } catch {}
  }
  await page.waitForTimeout(900); // let client fetches + charts settle
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log("captured", file);
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Login screen (logged out)
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/00-login.png`, fullPage: true });
  console.log("captured 00-login.png");

  // Admin tour
  await login(page, "admin@ripplr.com");
  await shoot(page, "/", "01-admin-sla-command-center.png", "SLA Command Center");
  await shoot(page, "/forecast", "02-demand-forecast.png", "Demand & Forecast");
  await shoot(page, "/channels", "03-channel-orchestration.png", "Channel Orchestration");
  await shoot(page, "/replenishment", "04-replenishment.png", "Replenishment");
  await shoot(page, "/returns", "05-reverse-logistics.png", "Reverse Logistics");
  await shoot(page, "/corridor", "06-cross-border-corridor.png", "Cross-Border Corridor");
  await shoot(page, "/deliveries", "07-deliveries.png", "Deliveries");
  await shoot(page, "/collections", "08-collections.png", "Collections");
  await shoot(page, "/inventory", "09-mfc-inventory.png", "MFC Inventory");
  await shoot(page, "/brands", "10-brands-onboarding.png", "Brands");

  // Brand-scoped view
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page2 = await ctx2.newPage();
  await login(page2, "ops@happilo.com");
  await page2.waitForTimeout(900);
  await page2.screenshot({ path: `${OUT}/11-brand-portal-happilo.png`, fullPage: true });
  console.log("captured 11-brand-portal-happilo.png");

  await browser.close();
  console.log("DONE");
})().catch((e) => { console.error(e); process.exit(1); });

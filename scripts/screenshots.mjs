import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const API = "http://localhost:3001/api";
const SCREENSHOT_DIR = "docs/screenshots";

async function apiRequest(path, { method, body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: method ?? "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json();

  if (!res.ok) {
    throw new Error(`API ${method ?? "GET"} ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function seedData(token) {
  const apps = await apiRequest("/apps", { token });
  if (apps.some((a) => a.key === "webshop")) {
    console.log("Demo data already exists, skipping seed");
    return;
  }

  console.log("Seeding demo data...");

  const webshop = await apiRequest("/apps", {
    method: "POST", token,
    body: { name: "Webshop", key: "webshop", description: "Main e-commerce platform" },
  });
  console.log(`  Created app: ${webshop.name} (${webshop.id.value})`);

  const mobile = await apiRequest("/apps", {
    method: "POST", token,
    body: { name: "Mobile App", key: "mobile-app", description: "iOS and Android application" },
  });
  console.log(`  Created app: ${mobile.name} (${mobile.id.value})`);

  const devEnv = await apiRequest(`/apps/${webshop.id.value}/environments`, {
    method: "POST", token, body: { name: "Development", key: "dev" },
  });
  const stagingEnv = await apiRequest(`/apps/${webshop.id.value}/environments`, {
    method: "POST", token, body: { name: "Staging", key: "staging" },
  });
  const prodEnv = await apiRequest(`/apps/${webshop.id.value}/environments`, {
    method: "POST", token, body: { name: "Production", key: "prod" },
  });
  console.log("  Created 3 environments for Webshop");

  await apiRequest(`/apps/${mobile.id.value}/environments`, {
    method: "POST", token, body: { name: "Development", key: "dev" },
  });
  await apiRequest(`/apps/${mobile.id.value}/environments`, {
    method: "POST", token, body: { name: "Production", key: "prod" },
  });
  console.log("  Created 2 environments for Mobile App");

  await apiRequest(`/environments/${stagingEnv.id.value}`, {
    method: "PATCH", token, body: { cacheTtlSeconds: 60 },
  });
  await apiRequest(`/environments/${prodEnv.id.value}`, {
    method: "PATCH", token, body: { cacheTtlSeconds: 300 },
  });

  const toggleDefs = [
    { name: "New Checkout", key: "newCheckout" },
    { name: "Beta Search", key: "betaSearch" },
    { name: "Dark Mode", key: "darkMode" },
    { name: "Social Login", key: "socialLogin" },
    { name: "Express Delivery", key: "expressDelivery" },
  ];

  const toggles = [];
  for (const t of toggleDefs) {
    const toggle = await apiRequest(`/apps/${webshop.id.value}/toggles`, {
      method: "POST", token, body: { ...t, type: "boolean" },
    });
    toggles.push(toggle);
  }
  console.log(`  Created ${toggles.length} boolean toggles`);

  const sv = (tid, eid, body) =>
    apiRequest(`/toggles/${tid}/environments/${eid}`, { method: "PUT", token, body });

  await sv(toggles[0].id.value, devEnv.id.value, { enabled: true });
  await sv(toggles[0].id.value, stagingEnv.id.value, { enabled: true });
  await sv(toggles[1].id.value, devEnv.id.value, { enabled: true });
  await sv(toggles[1].id.value, stagingEnv.id.value, { enabled: true });
  await sv(toggles[1].id.value, prodEnv.id.value, { enabled: true, rolloutPercentage: 50 });
  await sv(toggles[2].id.value, devEnv.id.value, { enabled: true });
  await sv(toggles[3].id.value, devEnv.id.value, { enabled: true });
  await sv(toggles[3].id.value, stagingEnv.id.value, { enabled: true });
  await sv(toggles[3].id.value, prodEnv.id.value, { enabled: true });
  console.log("  Set toggle values");

  const strDefs = [
    { name: "Banner Message", key: "bannerMessage" },
    { name: "Maintenance Note", key: "maintenanceNote" },
  ];
  for (const s of strDefs) {
    const t = await apiRequest(`/apps/${webshop.id.value}/toggles`, {
      method: "POST", token, body: { ...s, type: "string" },
    });
    const banner = s.key === "bannerMessage";
    await sv(t.id.value, devEnv.id.value, { stringValue: banner ? "Summer Sale - 20% off!" : "" });
    await sv(t.id.value, stagingEnv.id.value, { stringValue: banner ? "Summer Sale - 20% off!" : "" });
    await sv(t.id.value, prodEnv.id.value, { stringValue: banner ? "Free shipping on orders over $50" : "" });
  }
  console.log("  Created 2 string values");
  console.log("Seed complete");
}

async function screenshot(page, filename, waitFor) {
  if (waitFor) {
    await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() =>
      console.warn(`  Warning: selector "${waitFor}" not found for ${filename}`)
    );
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/${filename}` });
  console.log(`  ${filename}`);
}

async function main() {
  // Verify API is reachable
  const health = await apiRequest("/health");
  if (!health?.status) throw new Error("API not reachable");
  console.log("API is healthy");

  const loginRes = await apiRequest("/auth/login", {
    method: "POST",
    body: { email: "admin@semaforo.local", password: "admin" },
  });
  if (!loginRes?.token) throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
  const token = loginRes.token;
  console.log("Logged in");

  await seedData(token);

  // Find webshop app
  const apps = await apiRequest("/apps", { token });
  const webshop = apps.find((a) => a.key === "webshop");
  if (!webshop) throw new Error("Webshop app not found after seeding");

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login via the UI to set token properly
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', "admin@semaforo.local");
  await page.fill('input[type="password"]', "admin");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  console.log("Taking screenshots...");

  await screenshot(page, "apps.png", ".app-grid");

  await page.goto(`${BASE}/apps/${webshop.id.value}/toggles`);
  await screenshot(page, "toggles.png", "table");

  await page.goto(`${BASE}/apps/${webshop.id.value}/string-values`);
  await screenshot(page, "string-values.png", ".page");

  await page.goto(`${BASE}/apps/${webshop.id.value}/environments`);
  await screenshot(page, "environments.png", ".env-grid");

  await page.goto(`${BASE}/admin/settings`);
  await screenshot(page, "admin-settings.png", ".page");

  await page.goto(`${BASE}/admin/health`);
  await screenshot(page, "admin-health.png", ".card");

  await page.goto(`${BASE}/admin/audit-log`);
  await screenshot(page, "audit-log.png", "table");

  await browser.close();
  console.log(`\nDone! Screenshots in ${SCREENSHOT_DIR}/`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});

/**
 * UI E2E with Playwright (demo mode required: NEXT_PUBLIC_ENABLE_DEMO=true).
 * Run: node scripts/e2e-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const results = [];

function pass(name, detail = "") {
  results.push({ ok: true, name, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ ok: false, name, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  try {
    // Landing CTA
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("link", { name: /Optimize my CV/i })
      .first()
      .click();
    await page.waitForURL(/\/optimize/);
    pass("Landing CTA opens /optimize");

    // Fresh wizard
    await page.goto(BASE + "/optimize?step=1", { waitUntil: "networkidle" });
    await page.getByText(/Try with Demo Data/i).waitFor({ state: "visible" });
    pass("Demo button visible on upload step");

    await page.getByText(/Try with Demo Data/i).click();
    await page.waitForURL(/step=3/, { timeout: 15000 });
    pass("Demo data jumps to Analyze step");

    await page.getByText(/Optimize Bullets/i).waitFor({ state: "visible" });
    pass("Analyze shows Optimize Bullets CTA");

    await page.getByText(/Change Role/i).click();
    await page.waitForURL(/step=2/);
    pass("Change Role navigates to Align");

    await page.getByRole("button", { name: /^Continue$/i }).click();
    await page.waitForURL(/step=3/);
    pass("Continue from Align returns to Analyze");

    await page.getByText(/Optimize Bullets/i).click();
    await page.waitForURL(/step=4/);
    await page.getByText(/LinkedIn Improvement/i).waitFor({ state: "visible" });
    pass("Improve step shows rewrite CTAs");

    await page.getByRole("button", { name: /Proceed to Updated CV/i }).click();
    await page.waitForURL(/step=6/);
    pass("Proceed to Updated CV reaches Final Review");

    await page
      .getByRole("button", { name: /Download CV/i })
      .waitFor({ state: "visible" });
    pass("Final Review shows Download CV");

    await page.goto(BASE + "/optimize?step=4", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /LinkedIn Improvement/i }).click();
    await page.waitForURL(/step=5/);
    await page
      .getByText(/headline/i)
      .first()
      .waitFor({ state: "visible" });
    pass("LinkedIn step renders suggestions");

    const copyBtns = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-copy") });
    const copyCount = await copyBtns.count();
    if (copyCount > 0) {
      await copyBtns.first().click();
      pass("LinkedIn Copy button clickable", `${copyCount} copy controls`);
    } else {
      fail("LinkedIn Copy button clickable", "no lucide-copy buttons found");
    }

    await page.getByRole("button", { name: /Proceed to Updated CV/i }).click();
    await page.waitForURL(/step=6/);

    const downloadBtn = page.getByRole("button", { name: /Download CV/i });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      downloadBtn.click(),
    ]);
    if (download) {
      pass("Download CV triggers file", download.suggestedFilename());
    } else {
      await page.waitForTimeout(1500);
      const toastText = await page
        .locator("[data-rht-toaster]")
        .innerText()
        .catch(() => "");
      if (/downloaded/i.test(toastText))
        pass("Download CV toast success", toastText.trim());
      else fail("Download CV", `no download; toast=${toastText.slice(0, 120)}`);
    }

    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /^Reset$/i }).click();
    await page.waitForURL(/step=1/);
    await page
      .getByText(/Upload your/i)
      .first()
      .waitFor({ state: "visible" });
    pass("Reset returns to Upload step");

    const proceed = page.getByRole("button", { name: /Proceed/i });
    if (await proceed.isDisabled()) pass("Proceed disabled without file");
    else fail("Proceed disabled without file");

    // Upload real DOCX then proceed to Align (no LLM required until analyze)
    await page.setInputFiles('input[type="file"]', "/tmp/cvj-sample.docx");
    await page.getByRole("button", { name: /Proceed/i }).click();
    await page.waitForURL(/step=2/, { timeout: 30000 });
    pass("DOCX upload proceeds to Align step");
  } catch (err) {
    fail("UI flow crashed", err instanceof Error ? err.message : String(err));
    await page
      .screenshot({ path: "/tmp/cvj-e2e-fail.png", fullPage: true })
      .catch(() => {});
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} UI checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

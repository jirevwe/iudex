import { chromium } from 'playwright';

async function testDashboard(url: string, name: string): Promise<boolean> {
  console.log(`\nTesting ${name} at ${url}...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to dashboard
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    if (!response) {
      console.log(`  ✗ No response received`);
      await browser.close();
      return false;
    }
    console.log(`  ✓ HTTP Status: ${response.status()}`);

    if (response.status() !== 200) {
      console.log(`  ✗ Failed with status ${response.status()}`);
      await browser.close();
      return false;
    }

    // Get page title
    const title = await page.title();
    console.log(`  ✓ Page Title: ${title}`);

    // Wait for page to load completely
    await page.waitForLoadState('load');

    // Check for common dashboard elements
    const hasH1 = await page.$('h1');
    if (hasH1) {
      const h1Text = await page.textContent('h1');
      console.log(`  ✓ Found heading: ${h1Text}`);
    }

    // Get page text content to verify it's not just a blank page
    const bodyText = await page.textContent('body');
    if (bodyText && bodyText.length > 100) {
      console.log(`  ✓ Page has content (${bodyText.length} characters)`);

      // Take screenshot
      const screenshotPath = `/tmp/dashboard-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`  ✓ Screenshot saved: ${screenshotPath}`);
    } else {
      console.log(`  ✗ Page seems empty`);
      await browser.close();
      return false;
    }

    console.log(`  ✅ ${name} loaded successfully!`);
    await browser.close();
    return true;

  } catch (error) {
    console.log(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    await browser.close();
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Iudex Dashboards...\n');
  console.log('═'.repeat(60));

  const dashboards = [
    { url: 'http://localhost:3000/test-dashboard', name: 'Express Dashboard' },
    { url: 'http://localhost:3001/test-dashboard', name: 'Fastify Dashboard' },
    { url: 'http://localhost:8080/', name: 'Standalone Dashboard' }
  ];

  const results = [];
  for (const dashboard of dashboards) {
    const success = await testDashboard(dashboard.url, dashboard.name);
    results.push({ name: dashboard.name, success });
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Test Summary:\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    if (result.success) {
      console.log(`  ✅ ${result.name}: PASSED`);
      passed++;
    } else {
      console.log(`  ❌ ${result.name}: FAILED`);
      failed++;
    }
  }

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All dashboards are working!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} dashboard(s) failed\n`);
    process.exit(1);
  }
}

main();
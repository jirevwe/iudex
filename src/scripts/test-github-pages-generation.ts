#!/usr/bin/env node
/**
 * Test GitHub Pages Dashboard Generation
 * Verifies that the GitHub Pages reporter correctly generates a static dashboard
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitHubPagesReporter } from '../reporters/github-pages.js';
import { ResultCollector } from '../core/collector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGitHubPagesGeneration() {
  console.log('🧪 Testing GitHub Pages Dashboard Generation\n');

  try {
    // 1. Load latest test results
    console.log('1️⃣  Loading test results...');
    const latestResultsPath = path.join(__dirname, '.iudex/results/latest.json');

    if (!fs.existsSync(latestResultsPath)) {
      console.error('❌ No test results found. Run tests first.');
      process.exit(1);
    }

    const resultsData = JSON.parse(fs.readFileSync(latestResultsPath, 'utf-8'));
    console.log(`   ✅ Loaded ${resultsData.summary.total} test results\n`);

    // 2. Create a ResultCollector with the data
    console.log('2️⃣  Creating result collector...');
    const collector = new ResultCollector();

    // Populate collector with the results data
    // For testing purposes, we can use the toJSON result directly
    collector.toJSON = () => resultsData;

    console.log('   ✅ Result collector ready\n');

    // 3. Configure and run GitHub Pages reporter
    console.log('3️⃣  Generating GitHub Pages dashboard...');
    const reporter = new GitHubPagesReporter({
      outputDir: '.iudex/dashboard',
      title: 'Iudex Test Dashboard',
      includeHistorical: true,
      historicalLimit: 50
    });

    await reporter.report(collector);
    console.log('   ✅ Dashboard generated\n');

    // 4. Verify generated files
    console.log('4️⃣  Verifying generated files...');
    const dashboardDir = path.join(__dirname, '.iudex/dashboard');
    const requiredFiles = [
      'index.html',
      'config.js',
      'assets/css/dashboard.css',
      'assets/js/dashboard.js',
      'assets/js/data-loader.js',
      'assets/js/components/summary-cards.js',
      'assets/js/components/test-table.js',
      'assets/js/components/governance-panel.js',
      'assets/js/components/security-panel.js',
      'assets/js/components/analytics-overview.js',
      'assets/js/components/flaky-tests-table.js',
      'assets/js/components/regressions-panel.js',
      'assets/js/components/trend-chart.js',
      'assets/js/components/endpoint-rates-table.js',
      'data/runs.json'
    ];

    let allFilesPresent = true;
    for (const file of requiredFiles) {
      const filePath = path.join(dashboardDir, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   ✅ ${file} (${stats.size} bytes)`);
      } else {
        console.log(`   ❌ ${file} - MISSING`);
        allFilesPresent = false;
      }
    }

    if (!allFilesPresent) {
      console.error('\n❌ Some files are missing!');
      process.exit(1);
    }

    console.log('\n5️⃣  Verifying data files...');

    // Check runs.json
    const runsJsonPath = path.join(dashboardDir, 'data/runs.json');
    const runsData = JSON.parse(fs.readFileSync(runsJsonPath, 'utf-8'));
    console.log(`   ✅ runs.json: ${runsData.runs.length} runs indexed`);
    console.log(`   ✅ Latest run: ${runsData.latest}`);

    // Check that run data files exist
    for (const run of runsData.runs) {
      const runFilePath = path.join(dashboardDir, 'data', `${run.id}.json`);
      if (fs.existsSync(runFilePath)) {
        console.log(`   ✅ ${run.id}.json`);
      } else {
        console.log(`   ❌ ${run.id}.json - MISSING`);
      }
    }

    console.log('\n6️⃣  Verifying config.js...');
    const configJsPath = path.join(dashboardDir, 'config.js');
    const configContent = fs.readFileSync(configJsPath, 'utf-8');

    if (configContent.includes('window.DASHBOARD_CONFIG')) {
      console.log('   ✅ Config object present');
    } else {
      console.log('   ❌ Config object missing');
    }

    if (configContent.includes('"mode": "static"')) {
      console.log('   ✅ Static mode configured');
    } else {
      console.log('   ❌ Mode not set to static');
    }

    console.log('\n7️⃣  Checking index.html configuration...');
    const indexPath = path.join(dashboardDir, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    if (indexContent.includes('window.IUDEX_CONFIG')) {
      console.log('   ✅ IUDEX_CONFIG injected');
    } else {
      console.log('   ⚠️  IUDEX_CONFIG not found (may be okay if using external config)');
    }

    if (indexContent.includes('<base href="./"')) {
      console.log('   ✅ Base URL set for static mode');
    } else {
      console.log('   ⚠️  Base URL may not be set correctly');
    }

    // 8. Summary
    console.log('\n✅ SUCCESS! GitHub Pages dashboard generated successfully!\n');
    console.log('📂 Dashboard location:', path.resolve(dashboardDir));
    console.log('\n📝 To view the dashboard locally:');
    console.log(`   cd ${dashboardDir}`);
    console.log('   python3 -m http.server 8000');
    console.log('   # Then open: http://localhost:8000\n');
    console.log('🚀 To deploy to GitHub Pages:');
    console.log('   1. Commit the dashboard files to your repo');
    console.log('   2. Push to a gh-pages branch, or');
    console.log('   3. Configure GitHub Pages to serve from /docs if output is docs/\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

// Run the test
testGitHubPagesGeneration();

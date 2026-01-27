import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GitHub Pages Reporter
 * Generates a standalone static dashboard for deployment to GitHub Pages
 */
export class GitHubPagesReporter {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || '.iudex/dashboard',
      title: config.title || 'Iudex Test Dashboard',
      includeHistorical: config.includeHistorical !== false,
      historicalLimit: config.historicalLimit || 50,
      apiEndpoint: config.apiEndpoint || null,
      ...config
    };

    this.templatesDir = path.join(__dirname, '..', 'templates', 'dashboard');
  }

  /**
   * Report test results by generating static dashboard
   * @param {Object} collector - Test result collector
   */
  async report(collector) {
    try {
      console.log('📊 Generating GitHub Pages dashboard...');

      // 1. Ensure output directory structure
      await this.ensureDirectories();

      // 2. Copy template assets (HTML, CSS, JS)
      await this.copyTemplateAssets();

      // 3. Copy latest test results
      await this.copyLatestResults(collector);

      // 4. Build runs index from historical data
      if (this.config.includeHistorical) {
        await this.buildRunsIndex();
      } else {
        await this.buildSingleRunIndex(collector);
      }

      // 5. Generate config.js with settings
      await this.generateConfig();

      // 6. Log success
      this.logOutput();
    } catch (error) {
      console.error('Failed to generate GitHub Pages dashboard:', error);
      throw error;
    }
  }

  /**
   * Ensure all required directories exist
   */
  async ensureDirectories() {
    const dirs = [
      this.config.outputDir,
      path.join(this.config.outputDir, 'assets'),
      path.join(this.config.outputDir, 'assets', 'css'),
      path.join(this.config.outputDir, 'assets', 'js'),
      path.join(this.config.outputDir, 'assets', 'js', 'components'),
      path.join(this.config.outputDir, 'data')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Copy template assets to output directory
   */
  async copyTemplateAssets() {
    // Copy index.html
    const indexSource = path.join(this.templatesDir, 'index.html');
    const indexDest = path.join(this.config.outputDir, 'index.html');

    if (fs.existsSync(indexSource)) {
      let html = fs.readFileSync(indexSource, 'utf-8');
      // Replace {{BASE_URL}} placeholder with empty string for static (root-relative)
      html = html.replace(/\{\{BASE_URL\}\}/g, '.');
      // Inject static config
      html = this.injectStaticConfig(html);
      fs.writeFileSync(indexDest, html);
    }

    // Copy CSS
    const cssSource = path.join(this.templatesDir, 'assets', 'css', 'dashboard.css');
    const cssDest = path.join(this.config.outputDir, 'assets', 'css', 'dashboard.css');

    if (fs.existsSync(cssSource)) {
      fs.copyFileSync(cssSource, cssDest);
    }

    // Copy JavaScript files
    const jsFiles = [
      'data-loader.js',
      'dashboard.js',
      'components/summary-cards.js',
      'components/test-table.js',
      'components/governance-panel.js',
      'components/security-panel.js'
    ];

    for (const file of jsFiles) {
      const source = path.join(this.templatesDir, 'assets', 'js', file);
      const dest = path.join(this.config.outputDir, 'assets', 'js', file);

      if (fs.existsSync(source)) {
        // Ensure parent directory exists
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(source, dest);
      }
    }
  }

  /**
   * Inject static mode configuration into HTML
   */
  injectStaticConfig(html) {
    const config = {
      mode: 'static',
      baseUrl: '',
      title: this.config.title,
      theme: 'light'
    };

    const configScript = `
    <script>
      window.IUDEX_CONFIG = ${JSON.stringify(config, null, 2)};
    </script>`;

    return html.replace('</head>', `${configScript}\n</head>`);
  }

  /**
   * Copy latest test results to data directory
   */
  async copyLatestResults(collector) {
    const results = collector.toJSON();
    const runId = this.generateRunId(results);

    const resultPath = path.join(this.config.outputDir, 'data', `${runId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

    return runId;
  }

  /**
   * Build runs index from .iudex/results/ directory
   */
  async buildRunsIndex() {
    const resultsDir = path.resolve('.iudex/results');

    if (!fs.existsSync(resultsDir)) {
      console.warn('No .iudex/results directory found, creating single-run index');
      return;
    }

    const files = fs.readdirSync(resultsDir);
    const jsonFiles = files
      .filter(f => f.startsWith('run-') && f.endsWith('.json'))
      .slice(0, this.config.historicalLimit);

    // Copy each file to data/ and extract metadata
    const runs = [];
    for (const file of jsonFiles) {
      try {
        const sourcePath = path.join(resultsDir, file);
        const destPath = path.join(this.config.outputDir, 'data', file);

        // Copy file
        fs.copyFileSync(sourcePath, destPath);

        // Extract metadata
        const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
        runs.push({
          id: file.replace('.json', ''),
          timestamp: data.metadata?.startTime || new Date(0).toISOString(),
          summary: data.summary || {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
          },
          gitInfo: data.metadata?.gitInfo || null,
          governance: {
            violationCount: data.governance?.violations?.length || 0,
            warningCount: data.governance?.warnings?.length || 0
          },
          security: {
            findingCount: data.security?.findings?.length || 0,
            criticalCount: data.security?.findings?.filter(f => f.severity === 'critical').length || 0
          }
        });
      } catch (error) {
        console.warn(`Failed to process ${file}:`, error.message);
      }
    }

    // Sort by timestamp descending
    runs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Write index
    const index = {
      runs,
      latest: runs[0]?.id || null,
      generated: new Date().toISOString()
    };

    const indexPath = path.join(this.config.outputDir, 'data', 'runs.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`📋 Indexed ${runs.length} test runs`);
  }

  /**
   * Build single-run index (when historical data not available)
   */
  async buildSingleRunIndex(collector) {
    const results = collector.toJSON();
    const runId = this.generateRunId(results);

    const index = {
      runs: [{
        id: runId,
        timestamp: results.metadata?.startTime || new Date().toISOString(),
        summary: results.summary || {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0
        },
        gitInfo: results.metadata?.gitInfo || null,
        governance: {
          violationCount: results.governance?.violations?.length || 0,
          warningCount: results.governance?.warnings?.length || 0
        },
        security: {
          findingCount: results.security?.findings?.length || 0,
          criticalCount: results.security?.findings?.filter(f => f.severity === 'critical').length || 0
        }
      }],
      latest: runId,
      generated: new Date().toISOString()
    };

    const indexPath = path.join(this.config.outputDir, 'data', 'runs.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * Generate config.js with dashboard settings
   */
  async generateConfig() {
    const config = {
      title: this.config.title,
      mode: 'static',
      apiEndpoint: this.config.apiEndpoint,
      generated: new Date().toISOString()
    };

    const configContent = `// Generated by Iudex GitHubPagesReporter
window.DASHBOARD_CONFIG = ${JSON.stringify(config, null, 2)};
`;

    const configPath = path.join(this.config.outputDir, 'config.js');
    fs.writeFileSync(configPath, configContent);
  }

  /**
   * Generate run ID from results
   */
  generateRunId(results) {
    const timestamp = results.metadata?.startTime || new Date().toISOString();
    const date = new Date(timestamp);
    const formatted = date.toISOString()
      .replace(/[:.]/g, '-')
      .replace(/T/, 'T')
      .substring(0, 19);
    return `run-${formatted}`;
  }

  /**
   * Log output location
   */
  logOutput() {
    const absolutePath = path.resolve(this.config.outputDir);
    console.log('\n✅ GitHub Pages dashboard generated!');
    console.log(`   Location: ${absolutePath}`);
    console.log(`   Files: index.html, assets/, data/`);
    console.log('\nDeployment options:');
    console.log('  1. GitHub Pages: Push to gh-pages branch');
    console.log('  2. Local preview: python3 -m http.server 8000');
    console.log('  3. Netlify/Vercel: Drag and drop the folder\n');
  }
}

/**
 * Factory function for use in reporters array
 */
export default function createGitHubPagesReporter(config) {
  return new GitHubPagesReporter(config);
}

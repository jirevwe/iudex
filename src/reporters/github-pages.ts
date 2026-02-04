/**
 * Iudex - GitHub Pages Reporter
 * Generates a standalone static dashboard for deployment to GitHub Pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ResultCollector } from '../core/collector.js';
import type { SecurityFinding } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** GitHub Pages reporter configuration */
export interface GitHubPagesReporterConfig {
  outputDir?: string;
  title?: string;
  includeHistorical?: boolean;
  historicalLimit?: number;
  apiEndpoint?: string | null;
}

/** Test result metadata */
interface ResultMetadata {
  startTime?: string;
  gitInfo?: GitInfo | null;
}

/** Git information */
interface GitInfo {
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
}

/** Results summary */
interface ResultSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  todo?: number;
  duration: number;
}

/** Governance results */
interface GovernanceResults {
  violations?: unknown[];
  warnings?: unknown[];
}

/** Security results */
interface SecurityResults {
  findings?: SecurityFinding[];
}

/** Collected results with metadata */
interface CollectedResults {
  metadata?: ResultMetadata;
  summary?: ResultSummary;
  governance?: GovernanceResults;
  security?: SecurityResults;
}

/** Run metadata for index */
interface RunMetadata {
  id: string;
  timestamp: string;
  summary: ResultSummary;
  gitInfo: GitInfo | null;
  governance: {
    violationCount: number;
    warningCount: number;
  };
  security: {
    findingCount: number;
    criticalCount: number;
  };
}

/** Runs index */
interface RunsIndex {
  runs: RunMetadata[];
  latest: string | null;
  generated: string;
}

/**
 * GitHub Pages Reporter
 * Generates a standalone static dashboard for deployment to GitHub Pages
 */
export class GitHubPagesReporter {
  private config: Required<Pick<GitHubPagesReporterConfig, 'outputDir' | 'title' | 'includeHistorical' | 'historicalLimit'>> & { apiEndpoint: string | null };
  private templatesDir: string;

  constructor(config: GitHubPagesReporterConfig = {}) {
    this.config = {
      outputDir: config.outputDir || '.iudex/dashboard',
      title: config.title || 'Iudex Test Dashboard',
      includeHistorical: config.includeHistorical !== false,
      historicalLimit: config.historicalLimit || 50,
      apiEndpoint: config.apiEndpoint || null
    };

    this.templatesDir = path.join(__dirname, '..', '..', 'templates', 'dashboard');
  }

  /**
   * Report test results by generating static dashboard
   */
  async report(collector: ResultCollector): Promise<void> {
    try {
      console.log('Generating GitHub Pages dashboard...');

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
  private async ensureDirectories(): Promise<void> {
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
  private async copyTemplateAssets(): Promise<void> {
    // Copy index.html
    const indexSource = path.join(this.templatesDir, 'index.html');
    const indexDest = path.join(this.config.outputDir, 'index.html');

    if (fs.existsSync(indexSource)) {
      let html = fs.readFileSync(indexSource, 'utf-8');
      html = html.replace(/\{\{BASE_URL\}\}/g, '.');
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
      'components/security-panel.js',
      'components/analytics-overview.js',
      'components/flaky-tests-table.js',
      'components/regressions-panel.js',
      'components/trend-chart.js',
      'components/endpoint-rates-table.js'
    ];

    for (const file of jsFiles) {
      const source = path.join(this.templatesDir, 'assets', 'js', file);
      const dest = path.join(this.config.outputDir, 'assets', 'js', file);

      if (fs.existsSync(source)) {
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
  private injectStaticConfig(html: string): string {
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
  private async copyLatestResults(collector: ResultCollector): Promise<string> {
    const results = collector.toJSON() as CollectedResults;
    const runId = this.generateRunId(results);

    const resultPath = path.join(this.config.outputDir, 'data', `${runId}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));

    return runId;
  }

  /**
   * Build runs index from .iudex/results/ directory
   */
  private async buildRunsIndex(): Promise<void> {
    const resultsDir = path.resolve('.iudex/results');

    if (!fs.existsSync(resultsDir)) {
      console.warn('No .iudex/results directory found, creating single-run index');
      return;
    }

    const files = fs.readdirSync(resultsDir);
    const jsonFiles = files
      .filter(f => f.startsWith('run-') && f.endsWith('.json'))
      .slice(0, this.config.historicalLimit);

    const runs: RunMetadata[] = [];
    for (const file of jsonFiles) {
      try {
        const sourcePath = path.join(resultsDir, file);
        const destPath = path.join(this.config.outputDir, 'data', file);

        fs.copyFileSync(sourcePath, destPath);

        const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8')) as CollectedResults;
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
        const err = error as Error;
        console.warn(`Failed to process ${file}:`, err.message);
      }
    }

    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const index: RunsIndex = {
      runs,
      latest: runs[0]?.id || null,
      generated: new Date().toISOString()
    };

    const indexPath = path.join(this.config.outputDir, 'data', 'runs.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

    console.log(`Indexed ${runs.length} test runs`);
  }

  /**
   * Build single-run index (when historical data not available)
   */
  private async buildSingleRunIndex(collector: ResultCollector): Promise<void> {
    const results = collector.toJSON() as CollectedResults;
    const runId = this.generateRunId(results);

    const index: RunsIndex = {
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
  private async generateConfig(): Promise<void> {
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
  private generateRunId(results: CollectedResults): string {
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
  private logOutput(): void {
    const absolutePath = path.resolve(this.config.outputDir);
    console.log('\nGitHub Pages dashboard generated!');
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
export function createGitHubPagesReporter(config: GitHubPagesReporterConfig): GitHubPagesReporter {
  return new GitHubPagesReporter(config);
}

export default createGitHubPagesReporter;

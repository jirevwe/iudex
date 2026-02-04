/**
 * Iudex - Dashboard Server
 * Core dashboard server implementation - framework-agnostic
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAnalytics } from './api/analytics.js';
import type { QueryClient, AnalyticsOptions } from './api/analytics.js';
import type { TestRepository } from '../database/repository.js';
import type { SecurityFinding } from '../types/index.js';
import type { IncomingMessage, ServerResponse } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Dashboard server configuration */
export interface DashboardServerConfig {
  resultsDir?: string;
  title?: string;
  apiEndpoint?: string | null;
  basePath?: string;
  theme?: string;
  historicalLimit?: number;
  repository?: TestRepository;
}

/** Git information */
interface GitInfo {
  branch?: string;
  commit?: string;
  commitSha?: string;
  message?: string;
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
  violationCount?: number;
  warningCount?: number;
}

/** Security results */
interface SecurityResults {
  findings?: SecurityFinding[];
  findingCount?: number;
  criticalCount?: number;
}

/** Run metadata */
interface RunMetadata {
  id: string;
  timestamp: string;
  summary: ResultSummary;
  gitInfo: GitInfo | null;
  governance: GovernanceResults;
  security: SecurityResults;
}

/** Paginated runs response */
interface PaginatedRunsResponse {
  runs: RunMetadata[];
  latest: string | null;
  nextCursor?: string | null;
  hasMore: boolean;
  count?: number;
}

/** Test result in a suite */
interface TestResult {
  id: string;
  name: string;
  status: string;
  duration: number;
  error: string | null;
  errorStack?: string | null;
  deletedAt?: Date | null;
}

/** Suite with tests */
interface Suite {
  name: string;
  tests: TestResult[];
}

/** Full run details */
interface RunDetails {
  id: string;
  timestamp: string;
  summary: ResultSummary;
  suites: Suite[];
  metadata: {
    startedAt: string;
    completedAt: string;
    environment: string;
    gitInfo: GitInfo | null;
  };
  governance: GovernanceResults;
  security: SecurityResults;
}

/** Stored result file data */
interface StoredResultData {
  metadata?: {
    startTime?: string;
    gitInfo?: GitInfo | null;
  };
  summary?: ResultSummary & { startTime?: string };
  governance?: GovernanceResults;
  security?: SecurityResults;
}

/** Minimal request interface */
interface MinimalRequest {
  url: string;
  method?: string;
  headers: Record<string, string | string[] | undefined> & {
    host?: string;
  };
}

/** Minimal response interface */
interface MinimalResponse {
  writeHead: (statusCode: number, headers?: Record<string, string>) => MinimalResponse;
  end: (data?: string | Buffer) => void;
}

/**
 * Core dashboard server implementation
 * Framework-agnostic server that can be wrapped by Express, Fastify, or raw HTTP
 */
export class DashboardServer {
  private config: Required<Pick<DashboardServerConfig, 'resultsDir' | 'title' | 'basePath' | 'theme' | 'historicalLimit'>> & { apiEndpoint: string | null; repository: TestRepository | null };
  private templatesDir: string;

  constructor(config: DashboardServerConfig = {}) {
    this.config = {
      resultsDir: config.resultsDir || '.iudex/results',
      title: config.title || 'Iudex Test Dashboard',
      apiEndpoint: config.apiEndpoint || null,
      basePath: config.basePath || '/',
      theme: config.theme || 'light',
      historicalLimit: config.historicalLimit || 50,
      repository: config.repository || null
    };

    this.templatesDir = path.join(__dirname, '..', '..', 'templates', 'dashboard');
  }

  /**
   * Main request handler - framework-agnostic
   */
  async handleRequest(req: MinimalRequest | IncomingMessage, res: MinimalResponse | ServerResponse): Promise<void> {
    const reqUrl = (req as MinimalRequest).url || (req as IncomingMessage).url || '/';
    const host = (req.headers as Record<string, string | undefined>).host || 'localhost';
    const url = new URL(reqUrl, `http://${host}`);
    const pathname = url.pathname;

    try {
      // Route to appropriate handler
      if (pathname === '/' || pathname === '/index.html') {
        return await this.serveIndex(res as MinimalResponse);
      }

      if (pathname.startsWith('/assets/')) {
        return await this.serveAsset(pathname, res as MinimalResponse);
      }

      if (pathname === '/api/runs') {
        return await this.listRuns(url.searchParams, res as MinimalResponse);
      }

      if (pathname.startsWith('/api/run/')) {
        const runId = pathname.split('/').pop() || '';
        return await this.getRunDetails(runId, res as MinimalResponse);
      }

      if (pathname === '/api/analytics') {
        return await this.getAnalytics(url.searchParams, res as MinimalResponse);
      }

      return this.serve404(res as MinimalResponse);
    } catch (error) {
      console.error('Dashboard error:', error);
      return this.serve500(res as MinimalResponse, error as Error);
    }
  }

  /**
   * Serve main dashboard HTML with injected configuration
   */
  async serveIndex(res: MinimalResponse): Promise<void> {
    const templatePath = path.join(this.templatesDir, 'index.html');

    if (!fs.existsSync(templatePath)) {
      return this.serve500(res, new Error('Dashboard template not found'));
    }

    const template = fs.readFileSync(templatePath, 'utf-8');
    const html = this.injectConfig(template);

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });
    res.end(html);
  }

  /**
   * Inject configuration into HTML template
   */
  injectConfig(template: string): string {
    const config = {
      mode: 'server',
      baseUrl: this.config.basePath,
      title: this.config.title,
      theme: this.config.theme,
      apiEndpoint: this.config.apiEndpoint
    };

    const configScript = `
    <script>
      window.IUDEX_CONFIG = ${JSON.stringify(config, null, 2)};
    </script>`;

    // Replace {{BASE_URL}} placeholder with actual base URL
    let html = template.replace(/\{\{BASE_URL\}\}/g, this.config.basePath);

    // Inject config before closing </head> tag
    return html.replace('</head>', `${configScript}\n</head>`);
  }

  /**
   * Serve static assets (CSS, JS)
   */
  async serveAsset(pathname: string, res: MinimalResponse): Promise<void> {
    // Remove leading '/assets/' to get relative path
    const assetPath = pathname.replace(/^\/assets\//, '');
    const fullPath = path.join(this.templatesDir, 'assets', assetPath);

    // Security check: ensure path is within templates directory
    const resolvedPath = path.resolve(fullPath);
    const templatesResolved = path.resolve(this.templatesDir);

    if (!resolvedPath.startsWith(templatesResolved)) {
      return this.serve404(res);
    }

    if (!fs.existsSync(fullPath)) {
      return this.serve404(res);
    }

    const content = fs.readFileSync(fullPath);
    const contentType = this.getContentType(pathname);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    res.end(content);
  }

  /**
   * Get content type from file extension
   */
  getContentType(pathname: string): string {
    const ext = path.extname(pathname).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * API: List available test runs with cursor pagination
   */
  async listRuns(searchParams: URLSearchParams, res: MinimalResponse): Promise<void> {
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');

    // Use database if repository is provided, otherwise read from files
    const result = this.config.repository
      ? await this.listRunsFromDatabase(limit, cursor)
      : await this.scanResultsDirectoryPaginated(limit, cursor);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(result, null, 2));
  }

  /**
   * List runs from database
   */
  async listRunsFromDatabase(limit: number, _cursor: string | null): Promise<PaginatedRunsResponse> {
    const query = `
      SELECT
        tr.id,
        tr.started_at as timestamp,
        tr.total_tests,
        tr.passed_tests,
        tr.failed_tests,
        tr.skipped_tests,
        tr.todo_tests,
        tr.duration_ms,
        tr.branch,
        tr.commit_sha
      FROM test_runs tr
      ORDER BY tr.started_at DESC
      LIMIT $1
    `;

    const result = await this.config.repository!.db.query(query, [limit]);
    const runs: RunMetadata[] = result.rows.map(row => ({
      id: String(row.id),
      timestamp: row.timestamp as string,
      summary: {
        total: row.total_tests as number,
        passed: row.passed_tests as number,
        failed: row.failed_tests as number,
        skipped: row.skipped_tests as number,
        todo: row.todo_tests as number,
        duration: row.duration_ms as number
      },
      gitInfo: {
        branch: row.branch as string,
        commit: row.commit_sha as string
      },
      governance: { violationCount: 0, warningCount: 0 },
      security: { findingCount: 0, criticalCount: 0 }
    }));

    return {
      runs,
      latest: runs.length > 0 ? runs[0].id : null,
      count: runs.length,
      hasMore: runs.length >= limit
    };
  }

  /**
   * Scan results directory and return paginated runs
   */
  async scanResultsDirectoryPaginated(limit: number, cursorToken: string | null): Promise<PaginatedRunsResponse> {
    const allRuns = await this.scanResultsDirectory();

    // Handle cursor pagination
    let startIndex = 0;
    if (cursorToken) {
      try {
        const cursor = JSON.parse(Buffer.from(cursorToken, 'base64').toString('utf-8')) as { timestamp: string; id: string };
        const foundIndex = allRuns.findIndex(run =>
          run.timestamp === cursor.timestamp && run.id === cursor.id
        );
        startIndex = foundIndex >= 0 ? foundIndex + 1 : 0;
      } catch (error) {
        console.warn('Invalid cursor token:', error);
      }
    }

    const runs = allRuns.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allRuns.length;

    let nextCursor: string | null = null;
    if (hasMore && runs.length > 0) {
      const lastRun = runs[runs.length - 1];
      const cursorData = {
        timestamp: lastRun.timestamp,
        id: lastRun.id
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    return {
      runs,
      latest: allRuns[0]?.id || null,
      nextCursor,
      hasMore
    };
  }

  /**
   * Scan results directory and extract run metadata
   */
  async scanResultsDirectory(): Promise<RunMetadata[]> {
    const resultsPath = path.resolve(this.config.resultsDir);

    if (!fs.existsSync(resultsPath)) {
      return [];
    }

    const files = fs.readdirSync(resultsPath);
    const jsonFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));

    // Extract metadata from each file
    const runs: RunMetadata[] = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(resultsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content) as StoredResultData;

        // Extract timestamp - try metadata.startTime, then summary.startTime, then fallback to epoch
        let timestamp: string;
        if (data.metadata?.startTime) {
          timestamp = data.metadata.startTime;
        } else if (data.summary?.startTime) {
          timestamp = new Date(data.summary.startTime).toISOString();
        } else {
          timestamp = new Date(0).toISOString();
        }

        runs.push({
          id: file.replace('.json', ''),
          timestamp,
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
        console.warn(`Failed to read run file ${file}:`, err.message);
      }
    }

    // Sort by timestamp descending (newest first)
    runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return runs;
  }

  /**
   * API: Get specific run details
   */
  async getRunDetails(runId: string, res: MinimalResponse): Promise<void> {
    try {
      // Use database if repository is provided, otherwise read from files
      const data = this.config.repository
        ? await this.getRunDetailsFromDatabase(runId)
        : await this.getRunDetailsFromFile(runId);

      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Run not found' }));
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(JSON.stringify(data, null, 2));
    } catch (error) {
      return this.serve500(res, error as Error);
    }
  }

  /**
   * Get run details from file system
   */
  async getRunDetailsFromFile(runId: string): Promise<StoredResultData | null> {
    const runPath = path.join(path.resolve(this.config.resultsDir), `${runId}.json`);

    if (!fs.existsSync(runPath)) {
      return null;
    }

    const content = fs.readFileSync(runPath, 'utf-8');
    return JSON.parse(content) as StoredResultData;
  }

  /**
   * Get run details from database
   */
  async getRunDetailsFromDatabase(runId: string): Promise<RunDetails | null> {
    // Get run metadata including deleted test IDs
    const runQuery = `
      SELECT
        tr.id,
        tr.started_at,
        tr.completed_at,
        tr.total_tests,
        tr.passed_tests,
        tr.failed_tests,
        tr.skipped_tests,
        tr.todo_tests,
        tr.duration_ms,
        tr.branch,
        tr.commit_sha,
        tr.commit_message,
        tr.environment,
        tr.deleted_test_ids,
        ts.name as suite_name
      FROM test_runs tr
      LEFT JOIN test_suites ts ON tr.suite_id = ts.id
      WHERE tr.id = $1
    `;

    const runResult = await this.config.repository!.db.query(runQuery, [parseInt(runId)]);

    if (runResult.rows.length === 0) {
      return null;
    }

    const run = runResult.rows[0];

    // Get test results for this run with total duration
    const testsQuery = `
      SELECT
        t.id as test_id,
        t.test_slug as id,
        t.current_name as name,
        t.suite_name,
        tr.status,
        tr.duration_ms as duration,
        tr.error_message as error,
        tr.stack_trace,
        tr.deleted_at,
        (SELECT COALESCE(SUM(duration_ms), 0) FROM test_results WHERE run_id = $1) as total_duration
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE tr.run_id = $1
      ORDER BY t.suite_name, t.current_name
    `;

    const testsResult = await this.config.repository!.db.query(testsQuery, [parseInt(runId)]);

    // Get total duration from first row
    const totalDuration = testsResult.rows.length > 0 ? (testsResult.rows[0].total_duration as number) : 0;

    // Group tests by suite
    const suiteMap = new Map<string, Suite>();

    testsResult.rows.forEach(test => {
      const suiteName = (test.suite_name as string) || 'Default Suite';

      if (!suiteMap.has(suiteName)) {
        suiteMap.set(suiteName, {
          name: suiteName,
          tests: []
        });
      }

      suiteMap.get(suiteName)!.tests.push({
        id: test.id as string,
        name: test.name as string,
        status: test.status as string,
        duration: (test.duration as number) || 0,
        error: (test.error as string) || null,
        errorStack: (test.stack_trace as string) || null,
        deletedAt: test.deleted_at as Date | null
      });
    });

    const suites = Array.from(suiteMap.values());

    return {
      id: String(run.id),
      timestamp: run.started_at as string,
      summary: {
        total: run.total_tests as number,
        passed: run.passed_tests as number,
        failed: run.failed_tests as number,
        skipped: run.skipped_tests as number,
        todo: run.todo_tests as number,
        duration: totalDuration || (run.duration_ms as number) || 0
      },
      suites,
      metadata: {
        startedAt: run.started_at as string,
        completedAt: run.completed_at as string,
        environment: run.environment as string,
        gitInfo: {
          branch: run.branch as string,
          commit: run.commit_sha as string,
          message: run.commit_message as string
        }
      },
      governance: {
        violations: [],
        warnings: []
      },
      security: {
        findings: []
      }
    };
  }

  /**
   * API: Get PostgreSQL analytics (optional)
   */
  async getAnalytics(searchParams: URLSearchParams, res: MinimalResponse): Promise<void> {
    if (!this.config.repository) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        available: false,
        error: 'Analytics not configured - database repository required'
      }));
      return;
    }

    const type = searchParams.get('type') || 'flaky-tests';
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');

    try {
      const analytics = await this.fetchAnalyticsData(type, { limit, days });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      });
      res.end(JSON.stringify(analytics, null, 2));
    } catch (error) {
      const err = error as Error;
      console.warn('Analytics fetch failed:', err);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        available: false,
        error: err.message
      }));
    }
  }

  /**
   * Fetch analytics from PostgreSQL using repository
   */
  async fetchAnalyticsData(type: string, options: AnalyticsOptions): Promise<unknown> {
    if (!this.config.repository) {
      return {
        available: false,
        error: 'Database repository not configured'
      };
    }

    // Create a client wrapper for the analytics API
    const client: QueryClient = {
      query: async (sql: string, params?: unknown[]) => {
        return await this.config.repository!.db.query(sql, params);
      }
    };

    return await fetchAnalytics(client, type as 'flaky-tests' | 'regressions' | 'health-scores' | 'daily-stats' | 'endpoint-rates', options);
  }

  /**
   * Serve 404 error
   */
  serve404(res: MinimalResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Serve 500 error
   */
  serve500(res: MinimalResponse, error: Error): void {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }));
  }
}

export default DashboardServer;

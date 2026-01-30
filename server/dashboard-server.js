import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAnalytics } from './api/analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Core dashboard server implementation
 * Framework-agnostic server that can be wrapped by Express, Fastify, or raw HTTP
 */
export class DashboardServer {
  constructor(config = {}) {
    this.config = {
      resultsDir: config.resultsDir || '.iudex/results',
      title: config.title || 'Iudex Test Dashboard',
      apiEndpoint: config.apiEndpoint || null, // PostgreSQL API endpoint
      basePath: config.basePath || '/',
      theme: config.theme || 'light',
      historicalLimit: config.historicalLimit || 50,
      ...config
    };

    // Optional database repository for analytics
    this.repository = config.repository || null;

    // Resolve template directory
    this.templatesDir = path.join(__dirname, '..', 'templates', 'dashboard');
  }

  /**
   * Main request handler - framework-agnostic
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    try {
      // Route to appropriate handler
      if (pathname === '/' || pathname === '/index.html') {
        return await this.serveIndex(res);
      }

      if (pathname.startsWith('/assets/')) {
        return await this.serveAsset(pathname, res);
      }

      if (pathname === '/api/runs') {
        return await this.listRuns(url.searchParams, res);
      }

      if (pathname.startsWith('/api/run/')) {
        const runId = pathname.split('/').pop();
        return await this.getRunDetails(runId, res);
      }

      if (pathname === '/api/analytics') {
        return await this.getAnalytics(url.searchParams, res);
      }

      return this.serve404(res);
    } catch (error) {
      console.error('Dashboard error:', error);
      return this.serve500(res, error);
    }
  }

  /**
   * Serve main dashboard HTML with injected configuration
   */
  async serveIndex(res) {
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
  injectConfig(template) {
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
  async serveAsset(pathname, res) {
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
  getContentType(pathname) {
    const ext = path.extname(pathname).toLowerCase();
    const types = {
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
  async listRuns(searchParams, res) {
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor');

    // Use database if repository is provided, otherwise read from files
    const result = this.repository
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
  async listRunsFromDatabase(limit, cursor) {
    const query = `
      SELECT
        tr.id,
        tr.started_at as timestamp,
        tr.total_tests,
        tr.passed_tests,
        tr.failed_tests,
        tr.skipped_tests,
        tr.duration_ms,
        tr.branch,
        tr.commit_sha
      FROM test_runs tr
      ORDER BY tr.started_at DESC
      LIMIT $1
    `;

    const result = await this.repository.db.query(query, [limit]);
    const runs = result.rows.map(row => ({
      id: row.id.toString(),
      timestamp: row.timestamp,
      summary: {
        total: row.total_tests,
        passed: row.passed_tests,
        failed: row.failed_tests,
        skipped: row.skipped_tests,
        duration: row.duration_ms
      },
      gitInfo: {
        branch: row.branch,
        commit: row.commit_sha
      }
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
  async scanResultsDirectoryPaginated(limit, cursorToken) {
    const allRuns = await this.scanResultsDirectory();

    // Handle cursor pagination
    let startIndex = 0;
    if (cursorToken) {
      try {
        const cursor = JSON.parse(Buffer.from(cursorToken, 'base64').toString('utf-8'));
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

    let nextCursor = null;
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
  async scanResultsDirectory() {
    const resultsPath = path.resolve(this.config.resultsDir);

    if (!fs.existsSync(resultsPath)) {
      return [];
    }

    const files = fs.readdirSync(resultsPath);
    const jsonFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));

    // Extract metadata from each file
    const runs = [];
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(resultsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Extract timestamp - try metadata.startTime, then summary.startTime, then fallback to epoch
        let timestamp;
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
        console.warn(`Failed to read run file ${file}:`, error.message);
      }
    }

    // Sort by timestamp descending (newest first)
    runs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return runs;
  }

  /**
   * API: Get specific run details
   */
  async getRunDetails(runId, res) {
    try {
      // Use database if repository is provided, otherwise read from files
      const data = this.repository
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
      return this.serve500(res, error);
    }
  }

  /**
   * Get run details from file system
   */
  async getRunDetailsFromFile(runId) {
    const runPath = path.join(path.resolve(this.config.resultsDir), `${runId}.json`);

    if (!fs.existsSync(runPath)) {
      return null;
    }

    const content = fs.readFileSync(runPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Get run details from database
   */
  async getRunDetailsFromDatabase(runId) {
    // Get run metadata
    const runQuery = `
      SELECT
        tr.id,
        tr.started_at,
        tr.completed_at,
        tr.total_tests,
        tr.passed_tests,
        tr.failed_tests,
        tr.skipped_tests,
        tr.duration_ms,
        tr.branch,
        tr.commit_sha,
        tr.commit_message,
        tr.environment,
        ts.name as suite_name
      FROM test_runs tr
      LEFT JOIN test_suites ts ON tr.suite_id = ts.id
      WHERE tr.id = $1
    `;

    const runResult = await this.repository.db.query(runQuery, [parseInt(runId)]);

    if (runResult.rows.length === 0) {
      return null;
    }

    const run = runResult.rows[0];

    // Get test results for this run with total duration
    const testsQuery = `
      SELECT
        t.test_slug as id,
        t.current_name as name,
        t.suite_name,
        tr.status,
        tr.duration_ms as duration,
        tr.error_message as error,
        tr.stack_trace,
        t.deleted_at,
        (SELECT COALESCE(SUM(duration_ms), 0) FROM test_results WHERE run_id = $1) as total_duration
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE tr.run_id = $1

      UNION ALL

      -- Include tests that were deleted before or during this run
      SELECT
        t.test_slug as id,
        t.current_name as name,
        t.suite_name,
        'deleted' as status,
        0 as duration,
        NULL as error,
        NULL as stack_trace,
        t.deleted_at,
        (SELECT COALESCE(SUM(duration_ms), 0) FROM test_results WHERE run_id = $1) as total_duration
      FROM tests t
      WHERE t.deleted_at IS NOT NULL
        AND t.deleted_at <= (SELECT started_at FROM test_runs WHERE id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM test_results tr2 WHERE tr2.run_id = $1 AND tr2.test_id = t.id
        )

      ORDER BY suite_name, name
    `;

    const testsResult = await this.repository.db.query(testsQuery, [parseInt(runId)]);

    // Get total duration from first row
    const totalDuration = testsResult.rows.length > 0 ? testsResult.rows[0].total_duration : 0;

    // Group tests by suite
    const suiteMap = new Map();

    testsResult.rows.forEach(test => {
      const suiteName = test.suite_name || 'Default Suite';

      if (!suiteMap.has(suiteName)) {
        suiteMap.set(suiteName, {
          name: suiteName,
          tests: []
        });
      }

      suiteMap.get(suiteName).tests.push({
        id: test.id,
        name: test.name,
        status: test.status,
        duration: test.duration || 0,
        error: test.error || null,
        errorStack: test.stack_trace || null,
        deletedAt: test.deleted_at || null
      });
    });

    const suites = Array.from(suiteMap.values());

    return {
      id: run.id.toString(),
      timestamp: run.started_at,
      summary: {
        total: run.total_tests,
        passed: run.passed_tests,
        failed: run.failed_tests,
        skipped: run.skipped_tests,
        duration: totalDuration || run.duration_ms || 0
      },
      suites,
      metadata: {
        startedAt: run.started_at,
        completedAt: run.completed_at,
        environment: run.environment,
        gitInfo: {
          branch: run.branch,
          commit: run.commit_sha,
          message: run.commit_message
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
  async getAnalytics(searchParams, res) {
    if (!this.repository) {
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
      const analytics = await this.fetchAnalytics(type, { limit, days });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      });
      res.end(JSON.stringify(analytics, null, 2));
    } catch (error) {
      console.warn('Analytics fetch failed:', error);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        available: false,
        error: error.message
      }));
    }
  }

  /**
   * Fetch analytics from PostgreSQL using repository
   */
  async fetchAnalytics(type, options) {
    if (!this.repository) {
      return {
        available: false,
        error: 'Database repository not configured'
      };
    }

    // Create a client wrapper for the analytics API
    const client = {
      query: async (sql, params) => {
        return await this.repository.db.query(sql, params);
      }
    };

    return await fetchAnalytics(client, type, options);
  }

  /**
   * Serve 404 error
   */
  serve404(res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Serve 500 error
   */
  serve500(res, error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }));
  }
}

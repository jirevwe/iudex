import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

    const result = await this.scanResultsDirectoryPaginated(limit, cursor);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(result, null, 2));
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
    const runPath = path.join(path.resolve(this.config.resultsDir), `${runId}.json`);

    if (!fs.existsSync(runPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Run not found' }));
      return;
    }

    try {
      const content = fs.readFileSync(runPath, 'utf-8');
      const data = JSON.parse(content);

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
   * API: Get PostgreSQL analytics (optional)
   */
  async getAnalytics(searchParams, res) {
    if (!this.config.apiEndpoint) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        available: false,
        error: 'Analytics not configured'
      }));
      return;
    }

    const type = searchParams.get('type') || 'flaky-tests';
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');

    try {
      // This will be implemented in analytics.js
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
   * Fetch analytics from PostgreSQL API
   * This is a placeholder - will be implemented in analytics.js
   */
  async fetchAnalytics(type, options) {
    // TODO: Implement in Phase 5
    return {
      available: false,
      message: 'Analytics not yet implemented'
    };
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

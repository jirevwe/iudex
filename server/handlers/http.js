import { DashboardServer } from '../dashboard-server.js';
import http from 'http';

/**
 * Create raw Node.js HTTP handler for the Iudex dashboard
 *
 * @param {Object} config - Dashboard configuration
 * @param {string} [config.resultsDir='.iudex/results'] - Directory containing test results
 * @param {string} [config.title='Iudex Test Dashboard'] - Dashboard title
 * @param {string} [config.apiEndpoint] - Optional PostgreSQL analytics API endpoint
 * @param {string} [config.theme='light'] - Dashboard theme
 * @returns {Function} HTTP request handler
 *
 * @example
 * import http from 'http';
 * import { createHttpDashboard } from 'iudex/server/http';
 *
 * const handler = createHttpDashboard({
 *   resultsDir: '.iudex/results'
 * });
 *
 * const server = http.createServer(handler);
 * server.listen(8080);
 */
export function createHttpDashboard(config = {}) {
  const dashboard = new DashboardServer(config);

  return async (req, res) => {
    try {
      await dashboard.handleRequest(req, res);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }));
    }
  };
}

/**
 * Create standalone dashboard HTTP server
 *
 * @param {Object} config - Dashboard configuration
 * @returns {http.Server} HTTP server instance
 *
 * @example
 * import { createStandaloneDashboardServer } from 'iudex/server/http';
 *
 * const server = createStandaloneDashboardServer({
 *   resultsDir: '.iudex/results',
 *   title: 'Test Dashboard'
 * });
 *
 * server.listen(8080, () => {
 *   console.log('Dashboard at http://localhost:8080');
 * });
 */
export function createStandaloneDashboardServer(config = {}) {
  const handler = createHttpDashboard(config);
  return http.createServer(handler);
}

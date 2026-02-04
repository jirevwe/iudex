/**
 * Iudex - HTTP Handler
 * Raw Node.js HTTP handler for the Iudex dashboard
 */

import http, { IncomingMessage, ServerResponse, Server } from 'http';
import { DashboardServer } from '../dashboard-server.js';
import type { DashboardServerConfig } from '../dashboard-server.js';

/**
 * Create raw Node.js HTTP handler for the Iudex dashboard
 *
 * @param config - Dashboard configuration
 * @returns HTTP request handler
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
export function createHttpDashboard(
  config: DashboardServerConfig = {}
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const dashboard = new DashboardServer(config);

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await dashboard.handleRequest(req, res);
    } catch (error) {
      const err = error as Error;
      console.error('Dashboard error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: err.message
      }));
    }
  };
}

/**
 * Create standalone dashboard HTTP server
 *
 * @param config - Dashboard configuration
 * @returns HTTP server instance
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
export function createStandaloneDashboardServer(config: DashboardServerConfig = {}): Server {
  const handler = createHttpDashboard(config);
  return http.createServer(handler);
}

export default { createHttpDashboard, createStandaloneDashboardServer };

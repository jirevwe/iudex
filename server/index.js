/**
 * Iudex Dashboard Server
 *
 * Provides server-side handlers for mounting the Iudex test dashboard
 * on Express, Fastify, or raw Node.js HTTP servers.
 *
 * @module iudex/server
 */

export { DashboardServer } from './dashboard-server.js';
export { createExpressDashboard } from './handlers/express.js';
export { createFastifyDashboard } from './handlers/fastify.js';
export {
  createHttpDashboard,
  createStandaloneDashboardServer
} from './handlers/http.js';

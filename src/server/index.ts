/**
 * Iudex Dashboard Server
 *
 * Provides server-side handlers for mounting the Iudex test dashboard
 * on Express, Fastify, or raw Node.js HTTP servers.
 *
 * @module iudex/server
 */

export { DashboardServer } from './dashboard-server.js';
export type { DashboardServerConfig } from './dashboard-server.js';

export { createExpressDashboard } from './handlers/express.js';
export type { ExpressDashboardConfig } from './handlers/express.js';

export { createFastifyDashboard } from './handlers/fastify.js';
export type { FastifyDashboardOptions } from './handlers/fastify.js';

export {
  createHttpDashboard,
  createStandaloneDashboardServer
} from './handlers/http.js';

export { fetchAnalytics, createAnalyticsClient } from './api/analytics.js';
export type {
  QueryClient,
  AnalyticsOptions,
  FlakyTest,
  Regression,
  HealthScore,
  DailyStat,
  EndpointRate,
  AnalyticsResult
} from './api/analytics.js';

/**
 * Iudex - Server Handlers
 * Framework-specific handlers for the dashboard
 */

export { createExpressDashboard } from './express.js';
export type { ExpressDashboardConfig } from './express.js';

export { createFastifyDashboard } from './fastify.js';
export type { FastifyDashboardOptions } from './fastify.js';

export { createHttpDashboard, createStandaloneDashboardServer } from './http.js';

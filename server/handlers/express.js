import { DashboardServer } from '../dashboard-server.js';

/**
 * Create Express middleware for the Iudex dashboard
 *
 * @param {Object} config - Dashboard configuration
 * @param {string} [config.resultsDir='.iudex/results'] - Directory containing test results
 * @param {string} [config.title='Iudex Test Dashboard'] - Dashboard title
 * @param {Object} [config.repository] - Optional database repository for analytics
 * @param {string} [config.theme='light'] - Dashboard theme
 * @returns {Function} Express middleware
 *
 * @example
 * import express from 'express';
 * import { createExpressDashboard } from 'iudex/server/express';
 * import { DatabaseRepository } from 'iudex/database/repository';
 *
 * const repository = new DatabaseRepository(dbConfig);
 * const app = express();
 * app.use('/test-dashboard', createExpressDashboard({
 *   resultsDir: '.iudex/results',
 *   title: 'API Test Dashboard',
 *   repository // Enable analytics
 * }));
 */
export function createExpressDashboard(config = {}) {
  return async (req, res, next) => {
    try {
      // Set basePath from Express mount point if not explicitly configured
      const basePath = config.basePath || req.baseUrl || '/';
      const dashboardConfig = { ...config, basePath };

      const dashboard = new DashboardServer(dashboardConfig);
      await dashboard.handleRequest(req, res);
    } catch (error) {
      next(error);
    }
  };
}

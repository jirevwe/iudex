import express from 'express';
import { DashboardServer } from '../dashboard-server.js';

/**
 * Create Express router for the Iudex dashboard
 *
 * @param {Object} config - Dashboard configuration
 * @param {string} [config.resultsDir='.iudex/results'] - Directory containing test results
 * @param {string} [config.title='Iudex Test Dashboard'] - Dashboard title
 * @param {Object} [config.repository] - Optional TestRepository for analytics
 * @param {string} [config.theme='light'] - Dashboard theme
 * @returns {express.Router} Express router with dashboard and analytics endpoints
 *
 * @example
 * import express from 'express';
 * import { createExpressDashboard } from 'iudex/server/express';
 * import { DatabaseClient } from 'iudex/database/client';
 * import { TestRepository } from 'iudex/database/repository';
 *
 * const dbClient = new DatabaseClient(dbConfig);
 * await dbClient.connect();
 * const repository = new TestRepository(dbClient);
 *
 * const app = express();
 * app.use('/test-dashboard', createExpressDashboard({
 *   resultsDir: '.iudex/results',
 *   title: 'API Test Dashboard',
 *   repository // Auto-mounts analytics endpoints
 * }));
 */
export function createExpressDashboard(config = {}) {
  const router = express.Router();
  const repository = config.repository;

  // Auto-mount analytics endpoints FIRST if repository provided
  if (repository) {
    mountAnalyticsEndpoints(router, repository);
    console.log('✅ Analytics endpoints auto-mounted at /api/analytics/*');
  }

  // Main dashboard handler (delegates to DashboardServer for HTML, assets, and basic API)
  // This is a catch-all and must come LAST
  router.use(async (req, res, next) => {
    try {
      // Skip analytics requests if repository is provided (already handled above)
      if (repository && req.path.startsWith('/api/analytics')) {
        return next();
      }

      // Set basePath from Express mount point if not explicitly configured
      const basePath = config.basePath || req.baseUrl || '/';
      const dashboardConfig = { ...config, basePath };

      const dashboard = new DashboardServer(dashboardConfig);
      await dashboard.handleRequest(req, res);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

/**
 * Mount analytics endpoints on the router
 * @param {express.Router} router - Express router
 * @param {TestRepository} repository - Database repository
 */
function mountAnalyticsEndpoints(router, repository) {
  // Flaky tests - tests with inconsistent pass/fail rates
  router.get('/api/analytics/flaky-tests', async (req, res) => {
    try {
      const minRuns = parseInt(req.query.minRuns || '5');
      const flakyTests = await repository.getFlakyTests(minRuns);
      res.json({ flakyTests, count: flakyTests.length });
    } catch (error) {
      console.error('Flaky tests error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Regressions - tests that were passing but now failing
  router.get('/api/analytics/regressions', async (req, res) => {
    try {
      const regressions = await repository.getRecentRegressions();
      res.json({ regressions, count: regressions.length });
    } catch (error) {
      console.error('Regressions error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Health scores - test health metrics
  router.get('/api/analytics/health-scores', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '20');
      const healthScores = await repository.getTestHealthScores(limit);
      res.json({ healthScores, count: healthScores.length });
    } catch (error) {
      console.error('Health scores error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Deleted tests - recently deleted tests
  router.get('/api/analytics/deleted-tests', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '10');
      const deletedTests = await repository.getDeletedTests(limit);
      res.json({ deletedTests, count: deletedTests.length });
    } catch (error) {
      console.error('Deleted tests error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Daily stats - aggregated daily statistics
  router.get('/api/analytics/daily-stats', async (req, res) => {
    try {
      const days = parseInt(req.query.days || '30');
      const dailyStats = await repository.getDailyStats(days);
      res.json({ dailyStats, count: dailyStats.length });
    } catch (error) {
      console.error('Daily stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint rates - success rates by endpoint
  router.get('/api/analytics/endpoint-rates', async (req, res) => {
    try {
      const endpointRates = await repository.getEndpointSuccessRates();
      res.json({ endpointRates, count: endpointRates.length });
    } catch (error) {
      console.error('Endpoint rates error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Database health check
  router.get('/api/db-health', async (req, res) => {
    try {
      const isHealthy = await repository.db.healthCheck();
      const stats = repository.db.getPoolStats();
      res.json({
        healthy: isHealthy,
        stats: {
          totalConnections: stats.totalCount,
          idleConnections: stats.idleCount,
          waitingClients: stats.waitingCount
        }
      });
    } catch (error) {
      console.error('DB health check error:', error);
      res.status(500).json({ error: error.message, healthy: false });
    }
  });
}

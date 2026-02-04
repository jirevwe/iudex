/**
 * Iudex - Express Handler
 * Express router for the Iudex dashboard
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { DashboardServer } from '../dashboard-server.js';
import type { DashboardServerConfig } from '../dashboard-server.js';
import type { TestRepository } from '../../database/repository.js';

/** Express dashboard configuration */
export interface ExpressDashboardConfig extends DashboardServerConfig {
  repository?: TestRepository;
}

/**
 * Create Express router for the Iudex dashboard
 *
 * @param config - Dashboard configuration
 * @returns Express router with dashboard and analytics endpoints
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
export function createExpressDashboard(config: ExpressDashboardConfig = {}): Router {
  const router = express.Router();
  const repository = config.repository;

  // Auto-mount analytics endpoints FIRST if repository provided
  if (repository) {
    mountAnalyticsEndpoints(router, repository);
    console.log('Analytics endpoints auto-mounted at /api/analytics/*');
  }

  // Main dashboard handler (delegates to DashboardServer for HTML, assets, and basic API)
  // This is a catch-all and must come LAST
  router.use(async (req: Request, res: Response, next: NextFunction) => {
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
 */
function mountAnalyticsEndpoints(router: Router, repository: TestRepository): void {
  // Flaky tests - tests with inconsistent pass/fail rates
  router.get('/api/analytics/flaky-tests', async (req: Request, res: Response) => {
    try {
      const minRuns = parseInt((req.query.minRuns as string) || '5');
      const flakyTests = await repository.getFlakyTests(minRuns);
      res.json({ flakyTests, count: flakyTests.length });
    } catch (error) {
      const err = error as Error;
      console.error('Flaky tests error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Regressions - tests that were passing but now failing
  router.get('/api/analytics/regressions', async (_req: Request, res: Response) => {
    try {
      const regressions = await repository.getRecentRegressions();
      res.json({ regressions, count: regressions.length });
    } catch (error) {
      const err = error as Error;
      console.error('Regressions error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Health scores - test health metrics
  router.get('/api/analytics/health-scores', async (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || '20');
      const healthScores = await repository.getTestHealthScores(limit);
      res.json({ healthScores, count: healthScores.length });
    } catch (error) {
      const err = error as Error;
      console.error('Health scores error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Deleted tests - recently deleted tests
  router.get('/api/analytics/deleted-tests', async (req: Request, res: Response) => {
    try {
      const limit = parseInt((req.query.limit as string) || '10');
      const deletedTests = await repository.getDeletedTests(limit);
      res.json({ deletedTests, count: deletedTests.length });
    } catch (error) {
      const err = error as Error;
      console.error('Deleted tests error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Daily stats - aggregated daily statistics
  router.get('/api/analytics/daily-stats', async (req: Request, res: Response) => {
    try {
      const days = parseInt((req.query.days as string) || '30');
      const dailyStats = await repository.getDailyStats(days);
      res.json({ dailyStats, count: dailyStats.length });
    } catch (error) {
      const err = error as Error;
      console.error('Daily stats error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Endpoint rates - success rates by endpoint
  router.get('/api/analytics/endpoint-rates', async (_req: Request, res: Response) => {
    try {
      const endpointRates = await repository.getEndpointSuccessRates();
      res.json({ endpointRates, count: endpointRates.length });
    } catch (error) {
      const err = error as Error;
      console.error('Endpoint rates error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Database health check
  router.get('/api/db-health', async (_req: Request, res: Response) => {
    try {
      const isHealthy = await repository.db.healthCheck();
      const stats = repository.db.getPoolStats();
      res.json({
        healthy: isHealthy,
        stats: stats ? {
          totalConnections: stats.pool.total,
          idleConnections: stats.pool.idle,
          waitingClients: stats.pool.waiting
        } : null
      });
    } catch (error) {
      const err = error as Error;
      console.error('DB health check error:', err);
      res.status(500).json({ error: err.message, healthy: false });
    }
  });
}

export default createExpressDashboard;

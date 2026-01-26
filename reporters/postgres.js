// Iudex - PostgreSQL Reporter
// Persists test results to PostgreSQL with evolution tracking

import { DatabaseClient } from '../database/client.js';
import { TestRepository } from '../database/repository.js';
import { execSync } from 'child_process';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ module: 'postgres-reporter' });

export class PostgresReporter {
  constructor(config = {}) {
    this.config = config;
    this.dbClient = null;
    this.repository = null;
    // Default to disabled - must be explicitly enabled
    this.enabled = config.enabled === true;
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    if (!this.enabled) {
      return;
    }

    this.dbClient = new DatabaseClient(this.config);
    await this.dbClient.connect();
    this.repository = new TestRepository(this.dbClient);
  }

  /**
   * Get git metadata for the current environment
   * @returns {Object} Git metadata
   */
  getGitMetadata() {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();

      return { branch, commitSha, commitMessage };
    } catch (error) {
      // Not a git repository or git not available
      return {
        branch: null,
        commitSha: null,
        commitMessage: null
      };
    }
  }

  /**
   * Report test results to PostgreSQL
   * @param {Object} collector - Result collector instance
   */
  async report(collector) {
    if (!this.enabled) {
      return;
    }

    try {
      await this.initialize();

      const summary = collector.getSummary();
      const metadata = collector.getMetadata();
      const gitInfo = this.getGitMetadata();

      // Get or create a test suite
      const suiteId = await this.repository.createOrGetSuite(
        metadata.suiteName || 'Default Suite',
        metadata.description
      );

      // Prepare test run data
      const runData = {
        environment: metadata.environment || process.env.NODE_ENV || 'development',
        branch: gitInfo.branch,
        commitSha: gitInfo.commitSha,
        commitMessage: gitInfo.commitMessage,
        status: summary.failed > 0 ? 'failed' : 'passed',
        totalTests: summary.total,
        passedTests: summary.passed,
        failedTests: summary.failed,
        skippedTests: summary.skipped || 0,
        durationMs: metadata.duration || 0,
        startedAt: metadata.startTime || new Date(),
        completedAt: metadata.endTime || new Date(),
        triggeredBy: process.env.GITHUB_ACTOR || process.env.USER || 'unknown',
        runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : null
      };

      // Create test run
      const runId = await this.repository.createTestRun(suiteId, runData);

      // Insert individual test results
      const testResults = collector.getAllResults();
      for (const result of testResults) {
        const testData = {
          testName: result.test || result.name,
          testDescription: result.description || null,
          testSlug: result.testId || null,  // NEW: Pass test slug
          suiteName: result.suite || metadata.suiteName,
          testFile: result.file || null,
          endpoint: result.endpoint || null,
          httpMethod: result.method || result.httpMethod || null,
          status: result.status,
          durationMs: result.duration || 0,
          responseTimeMs: result.responseTime || null,
          statusCode: result.statusCode || null,
          errorMessage: result.error || null,
          errorType: result.errorType || null,
          stackTrace: result.stack || null,
          assertionsPassed: result.assertionsPassed || null,
          assertionsFailed: result.assertionsFailed || null,
          requestBody: result.requestBody ? JSON.stringify(result.requestBody) : null,
          responseBody: result.responseBody ? JSON.stringify(result.responseBody) : null
        };

        await this.repository.createTestResult(runId, testData);
      }

      // Track deletion: collect current test slugs and suite names
      const currentTestSlugs = testResults
        .map(r => r.testId)
        .filter(slug => slug != null);

      // Collect suite names from both test results AND the suites list
      // This ensures we include suites that were executed but have no tests
      const results = collector.getResults();
      const allSuites = results.suites || [];
      const suiteNamesFromTests = testResults
        .map(r => r.suite || metadata.suiteName)
        .filter(suite => suite != null);
      const suiteNamesFromSuites = allSuites.map(s => s.name).filter(name => name != null);
      const suiteNames = [...new Set([...suiteNamesFromTests, ...suiteNamesFromSuites])];

      // Mark tests as deleted if they didn't appear in this run
      if (suiteNames.length > 0) {
        const deletedTests = await this.repository.markDeletedTests(
          runId,
          currentTestSlugs,
          suiteNames
        );

        if (deletedTests.length > 0) {
          logger.info({ count: deletedTests.length, tests: deletedTests.map(t => ({ name: t.current_name, slug: t.test_slug })) }, `\n🗑️  Deleted tests detected: ${deletedTests.length}`);
          deletedTests.forEach(test => {
            logger.info(`   - ${test.current_name} (${test.test_slug})`);
          });
        }
      }

      logger.info({ runId }, `\n✓ Test results persisted to database (run_id: ${runId})`);

      // Show analytics if available
      await this.showAnalytics();

    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, '\n✗ Failed to persist results to database');
      if (this.config.throwOnError) {
        throw error;
      }
    } finally {
      if (this.dbClient) {
        await this.dbClient.close();
      }
    }
  }

  /**
   * Show quick analytics after reporting
   */
  async showAnalytics() {
    try {
      // Get flaky tests
      const flakyTests = await this.repository.getFlakyTests(5);
      if (flakyTests.length > 0) {
        logger.info({ count: flakyTests.length }, `\n⚠️  Flaky tests detected: ${flakyTests.length}`);
        flakyTests.slice(0, 3).forEach(test => {
          logger.info(`   - ${test.current_name} (${test.failure_rate}% failure rate)`);
        });
      }

      // Get regressions
      const regressions = await this.repository.getRecentRegressions();
      if (regressions.length > 0) {
        logger.info({ count: regressions.length }, `\n🔴 Recent regressions: ${regressions.length}`);
        regressions.slice(0, 3).forEach(test => {
          logger.info(`   - ${test.current_name} (${test.endpoint || 'N/A'})`);
        });
      }

      // Get unhealthy tests
      const healthScores = await this.repository.getTestHealthScores(5);
      const unhealthy = healthScores.filter(t => t.overall_health_score < 70);
      if (unhealthy.length > 0) {
        logger.info({ count: unhealthy.length }, `\n⚕️  Unhealthy tests (score < 70): ${unhealthy.length}`);
        unhealthy.slice(0, 3).forEach(test => {
          logger.info(`   - ${test.current_name} (score: ${test.overall_health_score})`);
        });
      }

      // Get recently deleted tests
      const deletedTests = await this.repository.getDeletedTests(5);
      if (deletedTests.length > 0) {
        logger.info({ count: deletedTests.length }, `\n🗑️  Recently deleted tests: ${deletedTests.length}`);
        deletedTests.slice(0, 3).forEach(test => {
          const lastSeenDate = new Date(test.last_seen_at).toLocaleDateString();
          logger.info(`   - ${test.current_name} (last seen: ${lastSeenDate})`);
        });
      }

    } catch (error) {
      // Silently fail analytics - don't block main reporting
    }
  }

  /**
   * Query analytics from the database
   * @param {string} queryType - Type of analytics query
   * @param {Object} options - Query options
   * @returns {Array} Query results
   */
  async getAnalytics(queryType, options = {}) {
    if (!this.enabled) {
      throw new Error('PostgreSQL reporter is not enabled');
    }

    await this.initialize();

    try {
      switch (queryType) {
        case 'latest_runs':
          return await this.repository.getLatestRuns(options.environment, options.limit);

        case 'endpoint_success_rates':
          return await this.repository.getEndpointSuccessRates();

        case 'flaky_tests':
          return await this.repository.getFlakyTests(options.minRuns);

        case 'regressions':
          return await this.repository.getRecentRegressions();

        case 'health_scores':
          return await this.repository.getTestHealthScores(options.limit);

        case 'daily_stats':
          return await this.repository.getDailyStats(options.days);

        case 'deleted_tests':
          return await this.repository.getDeletedTests(options.limit || 10);

        case 'search':
          if (!options.searchTerm) {
            throw new Error('searchTerm is required for search query');
          }
          return await this.repository.searchTests(options.searchTerm, options.limit);

        default:
          throw new Error(`Unknown analytics query type: ${queryType}`);
      }
    } finally {
      if (this.dbClient) {
        await this.dbClient.close();
      }
    }
  }
}

/**
 * Create a PostgreSQL reporter
 * @param {Object} config - Reporter configuration
 * @returns {PostgresReporter}
 */
export function createReporter(config) {
  return new PostgresReporter(config);
}

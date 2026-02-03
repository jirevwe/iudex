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
    // Batching configuration for large reports
    this.batchSize = config.batchSize || 100;
    this.enableBatching = config.enableBatching !== false; // Enabled by default
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

    // Check if migrations are needed
    const needsMigration = await this.checkMigrationsNeeded();
    if (needsMigration) {
      if (this.config.autoMigrate === true) {
        logger.info('Database not initialized. Running migrations automatically...');
        await this.runMigrations();
        logger.info('✅ Database migrations completed');
      } else {
        throw new Error(
          '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '  Database not initialized. Migrations required.\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '  Run migrations:\n' +
          '    npx iudex db:migrate\n\n' +
          '  Or enable auto-migration in iudex.config.js:\n' +
          '    database: {\n' +
          '      autoMigrate: true,  // ⚠️  Not recommended for production\n' +
          '      // ... other config\n' +
          '    }\n\n' +
          '  Check migration status:\n' +
          '    npx iudex db:migrate --status\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
        );
      }
    }

    this.repository = new TestRepository(this.dbClient);
  }

  /**
   * Check if database migrations are needed
   * @returns {Promise<boolean>}
   */
  async checkMigrationsNeeded() {
    try {
      // Check if migrations table exists
      const result = await this.dbClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'migrations'
        ) as exists;
      `);

      if (!result.rows[0].exists) {
        return true; // No migration table = needs migration
      }

      // Check if test_runs table exists (main indicator)
      const tableResult = await this.dbClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'test_runs'
        ) as exists;
      `);

      return !tableResult.rows[0].exists;
    } catch (error) {
      logger.debug({ error: error.message }, 'Error checking migration status');
      return true; // Assume needs migration on error
    }
  }

  /**
   * Run database migrations
   * @returns {Promise<void>}
   */
  async runMigrations() {
    const { runner } = await import('node-pg-migrate');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsDir = join(__dirname, '../database/migrations');

    // Build database URL
    const databaseUrl = this.config.connectionString ||
      `postgresql://${this.config.user}:${this.config.password}@${this.config.host || 'localhost'}:${this.config.port || 5432}/${this.config.database}`;

    await runner({
      databaseUrl,
      dir: migrationsDir,
      direction: 'up',
      migrationsTable: 'migrations',
      verbose: false,
      log: (msg) => logger.debug(msg)
    });
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
   * Split an array into batches of specified size
   * @param {Array} array - Array to split
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array>} Array of batches
   * @private
   */
  _splitIntoBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
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
      const testResults = collector.getAllResults();

      // Decide between single-transaction mode (full atomicity) and batched mode (scalability)
      const shouldBatch = this.enableBatching && testResults.length > this.batchSize;

      if (shouldBatch) {
        logger.info({
          totalResults: testResults.length,
          batchSize: this.batchSize
        }, `Using batched mode for large report`);
        return await this._reportBatched(testResults, summary, metadata, gitInfo, collector);
      }

      // Single transaction mode for full atomicity (small reports)
      const runId = await this.dbClient.transaction(async (client) => {
        // Create or get suite (inline query with transaction client)
        const suiteResult = await client.query(
          `INSERT INTO test_suites (name, description)
           VALUES ($1, $2)
           ON CONFLICT (name)
           DO UPDATE SET updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [metadata.suiteName || 'Default Suite', metadata.description || '']
        );
        const suiteId = suiteResult.rows[0].id;

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
          todoTests: summary.todo || 0,
          durationMs: metadata.duration || 0,
          startedAt: metadata.startTime || new Date(),
          completedAt: metadata.endTime || new Date(),
          triggeredBy: process.env.GITHUB_ACTOR || process.env.USER || 'unknown',
          runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
            ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
            : null
        };

        // Create test run (inline query with transaction client)
        const runResult = await client.query(
          `INSERT INTO test_runs (
            suite_id, environment, branch, commit_sha, commit_message,
            status, total_tests, passed_tests, failed_tests, skipped_tests, todo_tests,
            duration_ms, started_at, completed_at, triggered_by, run_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id`,
          [
            suiteId,
            runData.environment,
            runData.branch,
            runData.commitSha,
            runData.commitMessage,
            runData.status,
            runData.totalTests,
            runData.passedTests,
            runData.failedTests,
            runData.skippedTests,
            runData.todoTests,
            runData.durationMs != null ? Math.round(runData.durationMs) : 0,
            runData.startedAt,
            runData.completedAt,
            runData.triggeredBy,
            runData.runUrl
          ]
        );
        const runId = runResult.rows[0].id;

        // Insert all test results atomically within transaction
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

          // Pass transaction client for nested transaction support
          await this.repository.createTestResult(runId, testData, client);
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

        // Mark tests as deleted if they didn't appear in this run (pass client)
        if (suiteNames.length > 0) {
          const deletedTests = await this.repository.markDeletedTests(
            runId,
            currentTestSlugs,
            suiteNames,
            client  // Pass transaction client
          );

          if (deletedTests.length > 0) {
            // Insert synthetic test_results for deleted tests
            for (const deletedTest of deletedTests) {
              await this.repository.createTestResult(runId, {
                testName: deletedTest.current_name,
                testDescription: null,
                testSlug: deletedTest.test_slug,
                suiteName: deletedTest.suite_name,
                testFile: null,
                endpoint: null,
                httpMethod: null,
                status: 'deleted',
                durationMs: 0,
                responseTimeMs: null,
                statusCode: null,
                errorMessage: null,
                errorType: null,
                stackTrace: null,
                assertionsPassed: null,
                assertionsFailed: null,
                requestBody: null,
                responseBody: null,
                deletedAt: new Date()
              }, client);
            }

            // Update the run record with deleted test IDs (for backward compatibility)
            const deletedTestIds = deletedTests.map(t => t.id);
            await client.query(
              `UPDATE test_runs
               SET deleted_test_ids = $1::jsonb
               WHERE id = $2`,
              [JSON.stringify(deletedTestIds), runId]
            );

            logger.info({ count: deletedTests.length, tests: deletedTests.map(t => ({ name: t.current_name, slug: t.test_slug })) }, `\n🗑️  Deleted tests detected: ${deletedTests.length}`);
            deletedTests.forEach(test => {
              logger.info(`   - ${test.current_name} (${test.test_slug})`);
            });
          }
        }

        return runId;
      });

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
   * Report test results using batched transactions for scalability
   * Used for large reports (> batchSize results)
   * @param {Array} testResults - All test results
   * @param {Object} summary - Test summary
   * @param {Object} metadata - Test metadata
   * @param {Object} gitInfo - Git information
   * @param {Object} collector - Result collector
   * @returns {number} Run ID
   * @private
   */
  async _reportBatched(testResults, summary, metadata, gitInfo, collector) {
    // Step 1: Create suite and run in a transaction
    const { suiteId, runId } = await this.dbClient.transaction(async (client) => {
      const suiteResult = await client.query(
        `INSERT INTO test_suites (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name)
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [metadata.suiteName || 'Default Suite', metadata.description || '']
      );
      const suiteId = suiteResult.rows[0].id;

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
        todoTests: summary.todo || 0,
        durationMs: metadata.duration || 0,
        startedAt: metadata.startTime || new Date(),
        completedAt: metadata.endTime || new Date(),
        triggeredBy: process.env.GITHUB_ACTOR || process.env.USER || 'unknown',
        runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
          ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
          : null
      };

      const runResult = await client.query(
        `INSERT INTO test_runs (
          suite_id, environment, branch, commit_sha, commit_message,
          status, total_tests, passed_tests, failed_tests, skipped_tests, todo_tests,
          duration_ms, started_at, completed_at, triggered_by, run_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          suiteId,
          runData.environment,
          runData.branch,
          runData.commitSha,
          runData.commitMessage,
          runData.status,
          runData.totalTests,
          runData.passedTests,
          runData.failedTests,
          runData.skippedTests,
          runData.todoTests,
          runData.durationMs != null ? Math.round(runData.durationMs) : 0,
          runData.startedAt,
          runData.completedAt,
          runData.triggeredBy,
          runData.runUrl
        ]
      );

      return { suiteId, runId: runResult.rows[0].id };
    });

    logger.info({ runId, suiteId }, 'Created test suite and run');

    // Step 2: Process test results in batches
    const batches = this._splitIntoBatches(testResults, this.batchSize);
    let processedCount = 0;
    let failedBatches = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        await this.dbClient.transaction(async (client) => {
          for (const result of batch) {
            const testData = {
              testName: result.test || result.name,
              testDescription: result.description || null,
              testSlug: result.testId || null,
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

            await this.repository.createTestResult(runId, testData, client);
          }
        });

        processedCount += batch.length;
        logger.debug({
          batch: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
          processed: processedCount,
          total: testResults.length
        }, `Processed batch ${i + 1}/${batches.length}`);
      } catch (error) {
        failedBatches++;
        logger.error({
          batch: i + 1,
          batchSize: batch.length,
          error: error.message
        }, `Failed to process batch ${i + 1}`);

        if (this.config.throwOnError) {
          throw error;
        }
      }
    }

    if (failedBatches > 0) {
      logger.warn({
        failedBatches,
        totalBatches: batches.length,
        processedCount,
        total: testResults.length
      }, `Completed with ${failedBatches} failed batches`);
    }

    // Step 3: Mark deleted tests in a final transaction
    try {
      await this.dbClient.transaction(async (client) => {
        const currentTestSlugs = testResults
          .map(r => r.testId)
          .filter(slug => slug != null);

        const results = collector.getResults();
        const allSuites = results.suites || [];
        const suiteNamesFromTests = testResults
          .map(r => r.suite || metadata.suiteName)
          .filter(suite => suite != null);
        const suiteNamesFromSuites = allSuites.map(s => s.name).filter(name => name != null);
        const suiteNames = [...new Set([...suiteNamesFromTests, ...suiteNamesFromSuites])];

        if (suiteNames.length > 0) {
          const deletedTests = await this.repository.markDeletedTests(
            runId,
            currentTestSlugs,
            suiteNames,
            client
          );

          if (deletedTests.length > 0) {
            // Insert synthetic test_results for deleted tests
            for (const deletedTest of deletedTests) {
              await this.repository.createTestResult(runId, {
                testName: deletedTest.current_name,
                testDescription: null,
                testSlug: deletedTest.test_slug,
                suiteName: deletedTest.suite_name,
                testFile: null,
                endpoint: null,
                httpMethod: null,
                status: 'deleted',
                durationMs: 0,
                responseTimeMs: null,
                statusCode: null,
                errorMessage: null,
                errorType: null,
                stackTrace: null,
                assertionsPassed: null,
                assertionsFailed: null,
                requestBody: null,
                responseBody: null,
                deletedAt: new Date()
              }, client);
            }

            // Update the run record with deleted test IDs (for backward compatibility)
            const deletedTestIds = deletedTests.map(t => t.id);
            await client.query(
              `UPDATE test_runs
               SET deleted_test_ids = $1::jsonb
               WHERE id = $2`,
              [JSON.stringify(deletedTestIds), runId]
            );

            logger.info({ count: deletedTests.length, tests: deletedTests.map(t => ({ name: t.current_name, slug: t.test_slug })) }, `\n🗑️  Deleted tests detected: ${deletedTests.length}`);
            deletedTests.forEach(test => {
              logger.info(`   - ${test.current_name} (${test.test_slug})`);
            });
          }
        }
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to mark deleted tests');
      if (this.config.throwOnError) {
        throw error;
      }
    }

    return runId;
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

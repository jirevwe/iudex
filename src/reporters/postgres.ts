/**
 * Iudex - PostgreSQL Reporter
 * Persists test results to PostgreSQL with evolution tracking
 */

import { DatabaseClient } from '../database/client.js';
import { TestRepository } from '../database/repository.js';
import { execSync } from 'child_process';
import { getLogger } from '../core/logger.js';
import type { Logger, DatabaseConfig, TestStatus } from '../types/index.js';
import type { ResultCollector } from '../core/collector.js';
import type pg from 'pg';

type PoolClient = pg.PoolClient;

/** PostgreSQL reporter configuration */
export interface PostgresReporterConfig extends DatabaseConfig {
  enabled?: boolean;
  batchSize?: number;
  enableBatching?: boolean;
  autoMigrate?: boolean;
  throwOnError?: boolean;
  connectionString?: string;
}

/** Git metadata */
interface GitMetadata {
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
}

/** Test result from collector */
interface CollectedTestResult {
  test?: string;
  name?: string;
  description?: string | null;
  testId?: string | null;
  suite?: string;
  file?: string | null;
  endpoint?: string | null;
  method?: string | null;
  httpMethod?: string | null;
  status: TestStatus;
  duration?: number;
  responseTime?: number | null;
  statusCode?: number | null;
  error?: string | null;
  errorType?: string | null;
  stack?: string | null;
  assertionsPassed?: number | null;
  assertionsFailed?: number | null;
  requestBody?: unknown;
  responseBody?: unknown;
}

/** Test metadata */
interface TestMetadata {
  suiteName?: string;
  description?: string;
  environment?: string;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
}

/** Summary statistics */
interface Summary {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  todo?: number;
}

/** Suite from results */
interface SuiteResult {
  name: string;
  tests: CollectedTestResult[];
}

/** Results from collector */
interface CollectedResults {
  suites: SuiteResult[];
  summary: Summary;
}

/** Deleted test record */
interface DeletedTestRecord {
  id: number;
  test_slug: string;
  current_name: string;
  suite_name?: string;
}


let logger: Logger;
function getLoggerInstance(): Logger {
  if (!logger) {
    logger = getLogger().child({ module: 'postgres-reporter' });
  }
  return logger;
}

/**
 * PostgreSQL Reporter
 * Persists test results to PostgreSQL with evolution tracking
 */
export class PostgresReporter {
  public config: PostgresReporterConfig;
  public dbClient: DatabaseClient | null = null;
  public repository: TestRepository | null = null;
  public enabled: boolean;
  public batchSize: number;
  public enableBatching: boolean;

  constructor(config: PostgresReporterConfig = {}) {
    this.config = config;
    this.enabled = config.enabled === true;
    this.batchSize = config.batchSize || 100;
    this.enableBatching = config.enableBatching !== false;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    this.dbClient = new DatabaseClient(this.config);
    await this.dbClient.connect();

    // Check if migrations are needed
    const needsMigration = await this.checkMigrationsNeeded();
    if (needsMigration) {
      if (this.config.autoMigrate === true) {
        getLoggerInstance().info('Database not initialized. Running migrations automatically...');
        await this.runMigrations();
        getLoggerInstance().info('Database migrations completed');
      } else {
        throw new Error(
          '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '  Database not initialized. Migrations required.\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '  Run migrations:\n' +
          '    npx iudex db:migrate\n\n' +
          '  Or enable auto-migration in iudex.config.js:\n' +
          '    database: {\n' +
          '      autoMigrate: true,  // Not recommended for production\n' +
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
   */
  async checkMigrationsNeeded(): Promise<boolean> {
    try {
      // Check if migrations table exists
      const result = await this.dbClient!.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'migrations'
        ) as exists;
      `);

      if (!result.rows[0].exists) {
        return true;
      }

      // Check if test_runs table exists (main indicator)
      const tableResult = await this.dbClient!.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'test_runs'
        ) as exists;
      `);

      return !tableResult.rows[0].exists;
    } catch (error) {
      const err = error as Error;
      getLoggerInstance().debug('Error checking migration status', { error: err.message });
      return true;
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations(): Promise<void> {
    const { default: pg } = await import('pg');
    const { runner } = await import('node-pg-migrate');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsDir = join(__dirname, '../../database/migrations');

    // Create a pg Client with SSL config for migrations
    // Use environment variables for SSL configuration
    const dbSsl = process.env.DB_SSL?.toLowerCase();
    const rejectUnauthorizedEnv = process.env.DB_SSL_REJECT_UNAUTHORIZED?.toLowerCase();
    const caCert = process.env.DB_CA_CERT;
    const caCertFile = process.env.DB_CA_CERT_FILE;

    let sslConfig: boolean | { rejectUnauthorized: boolean; ca?: string } | undefined = false;

    if (dbSsl === 'true' || dbSsl === 'require' || caCert || caCertFile) {
      let rejectUnauthorized: boolean;
      if (rejectUnauthorizedEnv !== undefined) {
        rejectUnauthorized = rejectUnauthorizedEnv !== 'false';
      } else if (dbSsl === 'require') {
        rejectUnauthorized = false;
      } else {
        rejectUnauthorized = true;
      }

      sslConfig = { rejectUnauthorized };

      // Load CA cert if file path is provided
      if (caCertFile) {
        const fs = await import('fs');
        try {
          sslConfig.ca = fs.readFileSync(caCertFile, 'utf-8');
        } catch {
          getLoggerInstance().warn('Failed to read CA certificate file for migrations', { file: caCertFile });
        }
      } else if (caCert) {
        sslConfig.ca = caCert.replace(/\\n/g, '\n');
      }
    }

    const client = new pg.Client({
      host: this.config.host || process.env.DB_HOST || 'localhost',
      port: this.config.port || parseInt(process.env.DB_PORT || '5432', 10),
      database: this.config.database || process.env.DB_NAME,
      user: this.config.user || process.env.DB_USER,
      password: this.config.password || process.env.DB_PASSWORD,
      ssl: sslConfig
    });

    await client.connect();

    try {
      await runner({
        dbClient: client,
        dir: migrationsDir,
        direction: 'up',
        migrationsTable: 'migrations',
        verbose: false,
        log: (msg: string) => getLoggerInstance().debug(msg)
      });
    } finally {
      await client.end();
    }
  }

  /**
   * Get git metadata for the current environment
   */
  getGitMetadata(): GitMetadata {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
      const commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();

      return { branch, commitSha, commitMessage };
    } catch {
      return {
        branch: null,
        commitSha: null,
        commitMessage: null
      };
    }
  }

  /**
   * Split an array into batches of specified size
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Report test results to PostgreSQL
   */
  async report(collector: ResultCollector): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await this.initialize();

      const summary = collector.getSummary();
      const metadata = collector.getMetadata() as TestMetadata;
      const gitInfo = this.getGitMetadata();
      const testResults = collector.getAllResults() as CollectedTestResult[];

      // Decide between single-transaction mode (full atomicity) and batched mode (scalability)
      const shouldBatch = this.enableBatching && testResults.length > this.batchSize;

      if (shouldBatch) {
        getLoggerInstance().info(`Using batched mode for large report`, {
          totalResults: testResults.length,
          batchSize: this.batchSize
        });
        await this.reportBatched(testResults, summary, metadata, gitInfo, collector);
        return;
      }

      // Single transaction mode for full atomicity (small reports)
      const runId = await this.dbClient!.transaction(async (client: PoolClient) => {
        // Create or get suite
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

        // Create test run
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
            testName: result.test || result.name || '',
            testDescription: result.description || null,
            testSlug: result.testId || '',
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

          await this.repository!.createTestResult(runId, testData, client);
        }

        // Track deletion
        const currentTestSlugs = testResults
          .map(r => r.testId)
          .filter((slug): slug is string => slug != null);

        const results = collector.getResults() as CollectedResults;
        const allSuites = results.suites || [];
        const suiteNamesFromTests = testResults
          .map(r => r.suite || metadata.suiteName)
          .filter((suite): suite is string => suite != null);
        const suiteNamesFromSuites = allSuites.map(s => s.name).filter((name): name is string => name != null);
        const suiteNames = [...new Set([...suiteNamesFromTests, ...suiteNamesFromSuites])];

        if (suiteNames.length > 0) {
          const deletedTests = await this.repository!.markDeletedTests(
            runId,
            currentTestSlugs,
            suiteNames,
            client
          );

          if (deletedTests.length > 0) {
            for (const deletedTest of deletedTests as DeletedTestRecord[]) {
              await this.repository!.createTestResult(runId, {
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

            const deletedTestIds = deletedTests.map(t => t.id);
            await client.query(
              `UPDATE test_runs
               SET deleted_test_ids = $1::jsonb
               WHERE id = $2`,
              [JSON.stringify(deletedTestIds), runId]
            );

            getLoggerInstance().info(`Deleted tests detected: ${deletedTests.length}`, {
              count: deletedTests.length,
              tests: deletedTests.map(t => ({ name: t.current_name, slug: t.test_slug }))
            });
          }
        }

        return runId;
      });

      getLoggerInstance().info(`Test results persisted to database (run_id: ${runId})`, { runId });
      await this.showAnalytics();

    } catch (error) {
      const err = error as Error;
      getLoggerInstance().error('Failed to persist results to database', { error: err.message, stack: err.stack });
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
   */
  private async reportBatched(
    testResults: CollectedTestResult[],
    summary: Summary,
    metadata: TestMetadata,
    gitInfo: GitMetadata,
    collector: ResultCollector
  ): Promise<number> {
    // Step 1: Create suite and run in a transaction
    const { suiteId, runId } = await this.dbClient!.transaction(async (client: PoolClient) => {
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

    getLoggerInstance().info('Created test suite and run', { runId, suiteId });

    // Step 2: Process test results in batches
    const batches = this.splitIntoBatches(testResults, this.batchSize);
    let processedCount = 0;
    let failedBatches = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        await this.dbClient!.transaction(async (client: PoolClient) => {
          for (const result of batch) {
            const testData = {
              testName: result.test || result.name || '',
              testDescription: result.description || null,
              testSlug: result.testId || '',
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

            await this.repository!.createTestResult(runId, testData, client);
          }
        });

        processedCount += batch.length;
        getLoggerInstance().debug(`Processed batch ${i + 1}/${batches.length}`, {
          batch: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length,
          processed: processedCount,
          total: testResults.length
        });
      } catch (error) {
        failedBatches++;
        const err = error as Error;
        getLoggerInstance().error(`Failed to process batch ${i + 1}`, {
          batch: i + 1,
          batchSize: batch.length,
          error: err.message
        });

        if (this.config.throwOnError) {
          throw error;
        }
      }
    }

    if (failedBatches > 0) {
      getLoggerInstance().warn(`Completed with ${failedBatches} failed batches`, {
        failedBatches,
        totalBatches: batches.length,
        processedCount,
        total: testResults.length
      });
    }

    // Step 3: Mark deleted tests
    try {
      await this.dbClient!.transaction(async (client: PoolClient) => {
        const currentTestSlugs = testResults
          .map(r => r.testId)
          .filter((slug): slug is string => slug != null);

        const results = collector.getResults() as CollectedResults;
        const allSuites = results.suites || [];
        const suiteNamesFromTests = testResults
          .map(r => r.suite || metadata.suiteName)
          .filter((suite): suite is string => suite != null);
        const suiteNamesFromSuites = allSuites.map(s => s.name).filter((name): name is string => name != null);
        const suiteNames = [...new Set([...suiteNamesFromTests, ...suiteNamesFromSuites])];

        if (suiteNames.length > 0) {
          const deletedTests = await this.repository!.markDeletedTests(
            runId,
            currentTestSlugs,
            suiteNames,
            client
          );

          if (deletedTests.length > 0) {
            for (const deletedTest of deletedTests as DeletedTestRecord[]) {
              await this.repository!.createTestResult(runId, {
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

            const deletedTestIds = deletedTests.map(t => t.id);
            await client.query(
              `UPDATE test_runs
               SET deleted_test_ids = $1::jsonb
               WHERE id = $2`,
              [JSON.stringify(deletedTestIds), runId]
            );

            getLoggerInstance().info(`Deleted tests detected: ${deletedTests.length}`, {
              count: deletedTests.length,
              tests: deletedTests.map(t => ({ name: t.current_name, slug: t.test_slug }))
            });
          }
        }
      });
    } catch (error) {
      const err = error as Error;
      getLoggerInstance().error('Failed to mark deleted tests', { error: err.message });
      if (this.config.throwOnError) {
        throw error;
      }
    }

    return runId;
  }

  /**
   * Show quick analytics after reporting
   */
  async showAnalytics(): Promise<void> {
    try {
      // Get flaky tests
      const flakyTests = await this.repository!.getFlakyTests(5);
      if (flakyTests.length > 0) {
        getLoggerInstance().info(`Flaky tests detected: ${flakyTests.length}`, { count: flakyTests.length });
        flakyTests.slice(0, 3).forEach(test => {
          getLoggerInstance().info(`   - ${test.test_name} (${test.failure_rate}% failure rate)`);
        });
      }

      // Get regressions
      const regressions = await this.repository!.getRecentRegressions();
      if (regressions.length > 0) {
        getLoggerInstance().info(`Recent regressions: ${regressions.length}`, { count: regressions.length });
        regressions.slice(0, 3).forEach(test => {
          getLoggerInstance().info(`   - ${test.test_name} (N/A)`);
        });
      }

      // Get unhealthy tests
      const healthScores = await this.repository!.getTestHealthScores(5);
      const unhealthy = healthScores.filter(t => t.overall_health_score < 70);
      if (unhealthy.length > 0) {
        getLoggerInstance().info(`Unhealthy tests (score < 70): ${unhealthy.length}`, { count: unhealthy.length });
        unhealthy.slice(0, 3).forEach(test => {
          getLoggerInstance().info(`   - ${test.test_name} (score: ${test.overall_health_score})`);
        });
      }

      // Get recently deleted tests
      const deletedTests = await this.repository!.getDeletedTests(5);
      if (deletedTests.length > 0) {
        getLoggerInstance().info(`Recently deleted tests: ${deletedTests.length}`, { count: deletedTests.length });
        deletedTests.slice(0, 3).forEach(test => {
          const lastSeenDate = test.last_seen_at ? new Date(test.last_seen_at).toLocaleDateString() : 'Unknown';
          getLoggerInstance().info(`   - ${test.current_name} (last seen: ${lastSeenDate})`);
        });
      }

    } catch {
      // Silently fail analytics
    }
  }

  /**
   * Query analytics from the database
   */
  async getAnalytics(queryType: string, options: Record<string, unknown> = {}): Promise<unknown[]> {
    if (!this.enabled) {
      throw new Error('PostgreSQL reporter is not enabled');
    }

    await this.initialize();

    try {
      switch (queryType) {
        case 'latest_runs':
          return await this.repository!.getLatestRuns(
            options.environment as string | null,
            options.limit as number
          );

        case 'endpoint_success_rates':
          return await this.repository!.getEndpointSuccessRates();

        case 'flaky_tests':
          return await this.repository!.getFlakyTests(options.minRuns as number);

        case 'regressions':
          return await this.repository!.getRecentRegressions();

        case 'health_scores':
          return await this.repository!.getTestHealthScores(options.limit as number);

        case 'daily_stats':
          return await this.repository!.getDailyStats(options.days as number);

        case 'deleted_tests':
          return await this.repository!.getDeletedTests((options.limit as number) || 10);

        case 'search':
          if (!options.searchTerm) {
            throw new Error('searchTerm is required for search query');
          }
          return await this.repository!.searchTests(
            options.searchTerm as string,
            options.limit as number
          );

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
 */
export function createReporter(config: PostgresReporterConfig): PostgresReporter {
  return new PostgresReporter(config);
}

export default { PostgresReporter, createReporter };

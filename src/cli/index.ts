#!/usr/bin/env node

/**
 * Iudex - CLI
 * Command-line interface for running API tests with governance and security checks
 */

import { Command } from 'commander';
import { pathToFileURL } from 'url';
import { existsSync, writeFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { TestRunner } from '../core/runner.js';
import { ConsoleReporter } from '../reporters/console.js';
import { JsonReporter } from '../reporters/json.js';
import { PostgresReporter } from '../reporters/postgres.js';
import { GitHubPagesReporter } from '../reporters/github-pages.js';
import { getLogger } from '../core/logger.js';
import type { ResultCollector } from '../core/collector.js';
import type { DatabaseConfig, Logger, HttpClientConfig, GovernanceConfig, SecurityConfig } from '../types/index.js';

const logger: Logger = getLogger().child({ module: 'cli' });

/** CLI options for run command */
interface RunOptions {
  config: string;
  timeout?: string;
  retries?: string;
  bail?: boolean;
  verbose?: boolean;
  colors?: boolean;
}

/** CLI options for db:migrate command */
interface MigrateOptions {
  config: string;
  down?: boolean;
  status?: boolean;
  create?: string;
}

/** Reporter config types for CLI */
type CLIReporterConfig = string | [string, Record<string, unknown>] | { reporter: string; config?: Record<string, unknown> };

/** CLI config - independent from IudexConfig to avoid type conflicts */
interface CLIConfig {
  testMatch?: string[];
  timeout?: number;
  retries?: number;
  bail?: boolean;
  http?: HttpClientConfig;
  database?: DatabaseConfig;
  governance?: GovernanceConfig;
  security?: SecurityConfig;
  reporters?: CLIReporterConfig[];
  thresholds?: {
    governanceViolations?: {
      error?: number;
      warning?: number;
    };
    securityFindings?: {
      critical?: number;
      high?: number;
      medium?: number;
      low?: number;
    };
    testPassRate?: number;
  };
}

/** Reporter instance type */
type Reporter = ConsoleReporter | JsonReporter | PostgresReporter | GitHubPagesReporter;

const program = new Command();

program
  .name('iudex')
  .description('API testing framework with built-in governance and security')
  .version('0.1.0');

/**
 * Run command - Execute tests
 */
program
  .command('run [patterns...]')
  .description('Run API tests')
  .option('-c, --config <path>', 'Path to config file', 'iudex.config.js')
  .option('-t, --timeout <ms>', 'Test timeout in milliseconds')
  .option('-r, --retries <count>', 'Number of retries for failed tests')
  .option('--bail', 'Stop after first failure')
  .option('--verbose', 'Verbose output')
  .option('--no-colors', 'Disable colored output')
  .action(async (patterns: string[], options: RunOptions) => {
    try {
      // Load configuration
      const config = await loadConfig(options.config);

      // Override with CLI options
      if (options.timeout) config.timeout = parseInt(options.timeout);
      if (options.retries) config.retries = parseInt(options.retries);
      if (options.bail) config.bail = true;

      // Load test files
      // If patterns provided (could be shell-expanded files or glob patterns), use them
      // Otherwise fall back to config.testMatch
      const testPatterns = patterns && patterns.length > 0 ? patterns : config.testMatch;
      const testFiles = await loadTestFiles(testPatterns || []);

      if (testFiles.length === 0) {
        logger.error('No test files found');
        process.exit(1);
      }

      // Import test files to register tests
      for (const testFile of testFiles) {
        await import(pathToFileURL(testFile).href);
      }

      // Initialize components
      // Extract runner-relevant config (excluding reporters and thresholds which are handled separately by CLI)
      const { reporters: _reporters, thresholds: _thresholds, testMatch: _testMatch, ...runnerConfig } = config;
      const runner = new TestRunner(runnerConfig);

      // Initialize reporters from config
      const reporters = await loadReporters(config, options);

      // Run tests (runner has its own collector with governance/security results)
      await runner.run();
      const collector = runner.getCollector();

      // Report results to all reporters
      for (const reporter of reporters) {
        // ConsoleReporter expects results object
        // JsonReporter, PostgresReporter, and GitHubPagesReporter expect collector
        if (reporter instanceof ConsoleReporter) {
          // Use type assertion since the structures are compatible
          reporter.report(collector.getResults() as unknown as Parameters<typeof reporter.report>[0]);
        } else if (reporter instanceof JsonReporter || reporter instanceof PostgresReporter || reporter instanceof GitHubPagesReporter) {
          await reporter.report(collector);
        }
      }

      // Check thresholds (governance and security)
      const thresholdsPassed = checkThresholds(collector, config);

      // Exit with the appropriate error code
      if (!thresholdsPassed) {
        process.exit(1);
      }

      process.exit(collector.hasFailures() ? 1 : 0);
    } catch (error) {
      const err = error as Error;
      logger.error('Error running tests', {
        error: err.message,
        stack: options.verbose ? err.stack : undefined
      });
      process.exit(1);
    }
  });

/**
 * Report command - Generate reports (placeholder for Week 3)
 */
program
  .command('report')
  .description('Generate test report')
  .option('-f, --format <format>', 'Report format (json, junit, github-pages)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action((options: { format: string; output?: string }) => {
    console.log('Report generation will be implemented in Week 3');
    console.log(`Format: ${options.format}`);
    if (options.output) {
      console.log(`Output: ${options.output}`);
    }
  });

/**
 * Validate command - Validate API spec (placeholder for Week 4)
 */
program
  .command('validate')
  .description('Validate API specification')
  .option('--spec <path>', 'Path to OpenAPI specification')
  .action((options: { spec?: string }) => {
    console.log('API validation will be implemented in Week 4');
    if (options.spec) {
      console.log(`Spec: ${options.spec}`);
    }
  });

/**
 * Init command - Initialize configuration
 */
program
  .command('init')
  .description('Initialize iudex.config.js')
  .action(() => {
    console.log('Configuration initialization will be implemented soon');
    console.log('For now, create iudex.config.js manually');
  });

/**
 * Database migration command
 */
program
  .command('db:migrate')
  .description('Run database migrations')
  .option('-c, --config <path>', 'Path to config file', 'iudex.config.js')
  .option('--down', 'Rollback last migration')
  .option('--status', 'Show migration status')
  .option('--create <name>', 'Create new migration file')
  .action(async (options: MigrateOptions) => {
    try {
      // Create new migration file doesn't require config
      if (options.create) {
        await createMigration(options.create);
        return;
      }

      // Load configuration for migration operations
      const config = await loadConfig(options.config);

      if (!config.database) {
        logger.error('Database not configured. Add database config to iudex.config.js:');
        console.log('\nexport default {');
        console.log('  database: {');
        console.log('    host: "localhost",');
        console.log('    port: 5432,');
        console.log('    database: "my_test_results",');
        console.log('    user: "myuser",');
        console.log('    password: "mypass"');
        console.log('  }');
        console.log('}\n');
        process.exit(1);
      }

      // Run migrations
      await runMigrations(config.database, {
        direction: options.down ? 'down' : 'up',
        status: options.status
      });

      if (options.status) {
        console.log('\nMigration status check complete');
      } else if (options.down) {
        console.log('\nMigration rolled back successfully');
      } else {
        console.log('\nMigrations completed successfully');
      }
    } catch (error) {
      const err = error as Error;
      logger.error('Migration failed', {
        error: err.message,
        stack: err.stack
      });
      process.exit(1);
    }
  });

/**
 * Load configuration file
 */
async function loadConfig(configPath: string): Promise<CLIConfig> {
  const fullPath = resolve(process.cwd(), configPath);

  if (!existsSync(fullPath)) {
    // Return default configuration
    return {
      testMatch: ['tests/**/*.test.js', 'examples/**/*.test.js'],
      timeout: 30000,
      retries: 0,
      bail: false,
      http: {}
    };
  }

  try {
    const configModule = await import(pathToFileURL(fullPath).href);
    return configModule.default || configModule;
  } catch (error) {
    const err = error as Error;
    logger.warn('Failed to load config', { error: err.message, configPath });
    return {
      testMatch: ['tests/**/*.test.js', 'examples/**/*.test.js'],
      timeout: 30000,
      retries: 0,
      bail: false,
      http: {}
    };
  }
}

/**
 * Load and initialize reporters from config
 */
async function loadReporters(config: CLIConfig, options: RunOptions): Promise<Reporter[]> {
  const reporters: Reporter[] = [];
  const reporterConfigs = config.reporters || ['console'];

  for (const reporterConfig of reporterConfigs) {
    let reporterName: string;
    let reporterOptions: Record<string, unknown>;

    // Handle string, array, and object formats
    if (typeof reporterConfig === 'string') {
      reporterName = reporterConfig;
      reporterOptions = {};
    } else if (Array.isArray(reporterConfig)) {
      [reporterName, reporterOptions] = reporterConfig;
    } else if (typeof reporterConfig === 'object' && reporterConfig.reporter) {
      // Handle {reporter: 'name', config: {...}} format
      reporterName = reporterConfig.reporter;
      reporterOptions = reporterConfig.config || {};
    } else {
      continue;
    }

    try {
      let reporter: Reporter | undefined;

      switch (reporterName) {
        case 'console':
          reporter = new ConsoleReporter({
            verbose: options.verbose,
            colors: options.colors !== false,
            showPassed: options.verbose,
            ...reporterOptions
          });
          break;

        case 'json':
          reporter = new JsonReporter(reporterOptions as { outputDir?: string; includeTimestamp?: boolean; writeLatest?: boolean; throwOnError?: boolean });
          break;

        case 'postgres':
        case 'postgresql':
          // Enable PostgreSQL reporter with provided config
          reporter = new PostgresReporter({
            ...reporterOptions,
            enabled: true
          });
          break;

        case 'github-pages':
          reporter = new GitHubPagesReporter(reporterOptions as { outputDir?: string; title?: string; includeHistorical?: boolean; historicalLimit?: number; apiEndpoint?: string | null });
          break;

        case 'backend':
          // Placeholder for Week 4
          logger.info('Reporter not yet implemented', { reporterName });
          break;

        default:
          logger.warn('Unknown reporter', { reporterName });
      }

      if (reporter) {
        reporters.push(reporter);
      }
    } catch (error) {
      const err = error as Error;
      logger.warn('Failed to load reporter', { error: err.message, reporterName });
    }
  }

  // Always include the console reporter if none were loaded
  if (reporters.length === 0) {
    reporters.push(new ConsoleReporter({
      verbose: options.verbose,
      colors: options.colors !== false,
      showPassed: options.verbose
    }));
  }

  return reporters;
}

/**
 * Load test files based on pattern
 */
async function loadTestFiles(patterns: string | string[]): Promise<string[]> {
  // Simple implementation - just use glob pattern matching
  // For now, we'll accept a directory path or pattern
  if (typeof patterns === 'string') {
    patterns = [patterns];
  }

  const { glob } = await import('glob');
  const files: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/coverage/**'],
      absolute: true
    });
    files.push(...matches);
  }

  return [...new Set(files)]; // Remove duplicates
}

/**
 * Check governance and security thresholds
 * @returns true if thresholds passed, false if exceeded
 */
function checkThresholds(collector: ResultCollector, config: CLIConfig): boolean {
  const thresholds = config.thresholds || {};
  const results = collector.getResults();

  let failed = false;

  // Check governance violations
  if (thresholds.governanceViolations) {
    const violations = results.governance.violations || [];
    const warnings = results.governance.warnings || [];

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length +
                        warnings.filter(w => w.severity === 'warning').length;

    const errorThreshold = thresholds.governanceViolations.error;
    const warningThreshold = thresholds.governanceViolations.warning;

    if (errorThreshold !== undefined && errorCount > errorThreshold) {
      logger.error(
        `Governance error threshold exceeded: ${errorCount} errors (threshold: ${errorThreshold})`
      );
      failed = true;
    }

    if (warningThreshold !== undefined && warningCount > warningThreshold) {
      logger.warn(
        `Governance warning threshold exceeded: ${warningCount} warnings (threshold: ${warningThreshold})`
      );
      failed = true;
    }
  }

  // Check security findings
  if (thresholds.securityFindings) {
    const findings = results.security.findings || [];

    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const mediumCount = findings.filter(f => f.severity === 'medium').length;
    const lowCount = findings.filter(f => f.severity === 'low').length;

    const criticalThreshold = thresholds.securityFindings.critical;
    const highThreshold = thresholds.securityFindings.high;
    const mediumThreshold = thresholds.securityFindings.medium;
    const lowThreshold = thresholds.securityFindings.low;

    if (criticalThreshold !== undefined && criticalCount > criticalThreshold) {
      logger.error(
        `Critical security findings threshold exceeded: ${criticalCount} findings (threshold: ${criticalThreshold})`
      );
      failed = true;
    }

    if (highThreshold !== undefined && highCount > highThreshold) {
      logger.error(
        `High security findings threshold exceeded: ${highCount} findings (threshold: ${highThreshold})`
      );
      failed = true;
    }

    if (mediumThreshold !== undefined && mediumCount > mediumThreshold) {
      logger.warn(
        `Medium security findings threshold exceeded: ${mediumCount} findings (threshold: ${mediumThreshold})`
      );
      failed = true;
    }

    if (lowThreshold !== undefined && lowCount > lowThreshold) {
      logger.warn(
        `Low security findings threshold exceeded: ${lowCount} findings (threshold: ${lowThreshold})`
      );
      failed = true;
    }
  }

  // Check test pass rate
  if (thresholds.testPassRate !== undefined) {
    const passRate = collector.getSuccessRate();

    if (passRate < thresholds.testPassRate) {
      logger.error(
        `Test pass rate below threshold: ${passRate.toFixed(1)}% (threshold: ${thresholds.testPassRate}%)`
      );
      failed = true;
    }
  }

  if (failed) {
    logger.error('Thresholds exceeded');
  }

  return !failed;
}

/**
 * Run database migrations
 */
async function runMigrations(
  dbConfig: DatabaseConfig,
  options: { direction?: string; status?: boolean } = {}
): Promise<void> {
  const { runner } = await import('node-pg-migrate');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const migrationsDir = join(__dirname, '../database/migrations');

  // Build database URL
  const databaseUrl = dbConfig.connectionString ||
    `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host || 'localhost'}:${dbConfig.port || 5432}/${dbConfig.database}`;

  logger.info('Running migrations', { migrationsDir });

  const migrationOptions: {
    databaseUrl: string;
    dir: string;
    direction: 'up' | 'down';
    migrationsTable: string;
    verbose: boolean;
    log: (msg: string) => void;
    dryRun?: boolean;
    count?: number;
  } = {
    databaseUrl,
    dir: migrationsDir,
    direction: (options.direction || 'up') as 'up' | 'down',
    migrationsTable: 'pgmigrations',
    verbose: true,
    log: (msg: string) => console.log(msg)
  };

  // For status check, use dry-run
  if (options.status) {
    migrationOptions.dryRun = true;
    console.log('\nMigration Status:\n');
  } else if (options.direction === 'down') {
    console.log('\nRolling back last migration...\n');
    migrationOptions.count = 1; // Only rollback one migration
  } else {
    console.log('\nRunning migrations...\n');
  }

  await runner(migrationOptions);
}

/**
 * Create new migration file
 */
async function createMigration(name: string): Promise<void> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const migrationsDir = join(__dirname, '../database/migrations');

  const timestamp = Date.now();
  const fileName = `${timestamp}_${name.replace(/\s+/g, '-').toLowerCase()}.js`;
  const filePath = join(migrationsDir, fileName);

  const template = `/* eslint-disable camelcase */

/**
 * Migration: ${name}
 *
 * Description: Add your migration description here
 */

export const shorthands = undefined;

export const up = (pgm) => {
  // Add your migration logic here
  // Examples:
  //
  // Add column:
  // pgm.addColumn('table_name', {
  //   column_name: { type: 'varchar(255)', notNull: true }
  // });
  //
  // Create table:
  // pgm.createTable('table_name', {
  //   id: 'id',
  //   name: { type: 'varchar(255)', notNull: true },
  //   created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  // });
  //
  // Create index:
  // pgm.createIndex('table_name', 'column_name');
};

export const down = (pgm) => {
  // Add your rollback logic here (optional - auto-inferred for most operations)
};
`;

  writeFileSync(filePath, template, 'utf8');

  console.log(`\nMigration created: ${fileName}`);
  console.log(`\nEdit the file at:`);
  console.log(`  ${filePath}\n`);
  console.log('Then run migrations with:');
  console.log('  npx iudex db:migrate\n');
}

// Parse command line arguments
program.parse();

export { program };
export default program;

#!/usr/bin/env node

// Iudex - CLI
import { Command } from 'commander';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { TestRunner } from '../core/runner.js';
import { ResultCollector } from '../core/collector.js';
import { ConsoleReporter } from '../reporters/console.js';
import { JsonReporter } from '../reporters/json.js';
import { PostgresReporter } from '../reporters/postgres.js';
import { GitHubPagesReporter } from '../reporters/github-pages.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ module: 'cli' });

const program = new Command();

program
    .name('iudex')
    .description('API testing framework with built-in governance and security')
    .version('0.1.0');

/**
 * Run command - Execute tests
 */
program
    .command('run [pattern]')
    .description('Run API tests')
    .option('-c, --config <path>', 'Path to config file', 'iudex.config.js')
    .option('-t, --timeout <ms>', 'Test timeout in milliseconds')
    .option('-r, --retries <count>', 'Number of retries for failed tests')
    .option('--bail', 'Stop after first failure')
    .option('--verbose', 'Verbose output')
    .option('--no-colors', 'Disable colored output')
    .action(async (pattern, options) => {
        try {
            // Load configuration
            const config = await loadConfig(options.config);

            // Override with CLI options
            if (options.timeout) config.timeout = parseInt(options.timeout);
            if (options.retries) config.retries = parseInt(options.retries);
            if (options.bail) config.bail = true;

            // Load test files
            const testFiles = await loadTestFiles(pattern || config.testMatch);

            if (testFiles.length === 0) {
                logger.error('No test files found');
                process.exit(1);
            }

            // Import test files to register tests
            for (const testFile of testFiles) {
                await import(pathToFileURL(testFile).href);
            }

            // Initialize components
            const runner = new TestRunner(config);

            // Initialize reporters from config
            const reporters = await loadReporters(config, options);

            // Run tests (runner has its own collector with governance/security results)
            const results = await runner.run();
            const collector = runner.getCollector();

            // Report results to all reporters
            for (const reporter of reporters) {
                // ConsoleReporter expects results object
                // JsonReporter, PostgresReporter, and GitHubPagesReporter expect collector
                if (reporter instanceof ConsoleReporter) {
                    reporter.report(collector.getResults());
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
            logger.error({
                error: error.message,
                stack: options.verbose ? error.stack : undefined
            }, 'Error running tests');
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
    .action((options) => {
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
    .action((options) => {
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
 * Load configuration file
 */
async function loadConfig(configPath) {
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
        logger.warn({ error: error.message, configPath }, 'Failed to load config');
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
async function loadReporters(config, options) {
    const reporters = [];
    const reporterConfigs = config.reporters || ['console'];

    for (const reporterConfig of reporterConfigs) {
        let reporterName, reporterOptions;

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
            let reporter;

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
                    reporter = new JsonReporter(reporterOptions);
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
                    reporter = new GitHubPagesReporter(reporterOptions);
                    break;

                case 'backend':
                    // Placeholder for Week 4
                    logger.info({ reporterName }, 'Reporter not yet implemented');
                    break;

                default:
                    logger.warn({ reporterName }, 'Unknown reporter');
            }

            if (reporter) {
                reporters.push(reporter);
            }
        } catch (error) {
            logger.warn({ error: error.message, reporterName }, 'Failed to load reporter');
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
async function loadTestFiles(patterns) {
    // Simple implementation - just use glob pattern matching
    // For now, we'll accept a directory path or pattern
    if (typeof patterns === 'string') {
        patterns = [patterns];
    }

    const { glob } = await import('glob');
    const files = [];

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
 * @returns {boolean} - true if thresholds passed, false if exceeded
 */
function checkThresholds(collector, config) {
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
        logger.error('❌ Thresholds exceeded');
    }

    return !failed;
}

// Parse command line arguments
program.parse();

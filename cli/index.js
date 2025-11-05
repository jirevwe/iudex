#!/usr/bin/env node

// Iudex - CLI
import { Command } from 'commander';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import { TestRunner } from '../core/runner.js';
import { ResultCollector } from '../core/collector.js';
import { ConsoleReporter } from '../reporters/console.js';
import { PostgresReporter } from '../reporters/postgres.js';

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
                console.error('No test files found');
                process.exit(1);
            }

            // Import test files to register tests
            for (const testFile of testFiles) {
                await import(pathToFileURL(testFile).href);
            }

            // Initialize components
            const collector = new ResultCollector();
            const runner = new TestRunner(config);

            // Initialize reporters from config
            const reporters = await loadReporters(config, options);

            // Run tests
            collector.start();
            const results = await runner.run();
            collector.addResults(results);
            collector.end();

            // Report results to all reporters
            for (const reporter of reporters) {
                // ConsoleReporter expects results object, PostgresReporter expects collector
                if (reporter instanceof ConsoleReporter) {
                    reporter.report(collector.getResults());
                } else if (reporter instanceof PostgresReporter) {
                    await reporter.report(collector);
                }
            }

            // Exit with the appropriate error code
            process.exit(collector.hasFailures() ? 1 : 0);

        } catch (error) {
            console.error('Error running tests:', error.message);
            if (options.verbose) {
                console.error(error.stack);
            }
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
        console.warn(`Failed to load config from ${configPath}:`, error.message);
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

        // Handle both string and array formats
        if (typeof reporterConfig === 'string') {
            reporterName = reporterConfig;
            reporterOptions = {};
        } else if (Array.isArray(reporterConfig)) {
            [reporterName, reporterOptions] = reporterConfig;
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

                case 'postgres':
                case 'postgresql':
                    if (config.database && config.database.enabled !== false) {
                        reporter = new PostgresReporter(config.database);
                    }
                    break;

                case 'github-pages':
                case 'backend':
                    // Placeholder for Week 3 reporters
                    console.log(`Reporter '${reporterName}' not yet implemented`);
                    break;

                default:
                    console.warn(`Unknown reporter: ${reporterName}`);
            }

            if (reporter) {
                reporters.push(reporter);
            }
        } catch (error) {
            console.warn(`Failed to load reporter '${reporterName}':`, error.message);
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

// Parse command line arguments
program.parse();

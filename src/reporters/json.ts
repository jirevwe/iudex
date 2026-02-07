/**
 * Iudex - JSON File Reporter
 * Persists test results to local JSON files for offline analysis
 */

import fs from 'fs/promises';
import path from 'path';
import { getLogger } from '../core/logger.js';
import type { Logger } from '../types/index.js';
import type { ResultCollector } from '../core/collector.js';

/** JSON reporter configuration */
export interface JsonReporterConfig {
  outputDir?: string;
  includeTimestamp?: boolean;
  writeLatest?: boolean;
  throwOnError?: boolean;
}

/** Results summary */
interface ResultSummary {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  todo?: number;
  duration?: number;
}

/** Collected results */
interface CollectedResults {
  summary: ResultSummary;
  [key: string]: unknown;
}

let logger: Logger;
function getLoggerInstance(): Logger {
  if (!logger) {
    logger = getLogger().child({ module: 'json-reporter' });
  }
  return logger;
}

/**
 * JSON Reporter
 * Persists test results to local JSON files for offline analysis
 */
export class JsonReporter {
  config: Required<JsonReporterConfig>;

  constructor(config: JsonReporterConfig = {}) {
    this.config = {
      outputDir: config.outputDir || '.iudex/results',
      includeTimestamp: config.includeTimestamp !== false,
      writeLatest: config.writeLatest !== false,
      throwOnError: config.throwOnError || false
    };
  }

  /**
   * Ensure output directory exists
   */
  async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Generate filename for the test run
   */
  getFilename(timestamp: Date = new Date()): string {
    if (!this.config.includeTimestamp) {
      return 'results.json';
    }

    const iso = timestamp.toISOString();
    const formatted = iso
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19); // YYYY-MM-DDTHH-MM-SS

    return `run-${formatted}.json`;
  }

  /**
   * Report test results to JSON file
   */
  async report(collector: ResultCollector): Promise<void> {
    try {
      await this.ensureDirectory();

      const results = collector.getResults();
      const timestamp = new Date();
      const filename = this.getFilename(timestamp);
      const filepath = path.join(this.config.outputDir, filename);

      // Write timestamped file
      await fs.writeFile(
        filepath,
        JSON.stringify(results, null, 2),
        'utf-8'
      );

      getLoggerInstance().info(`Test results saved to ${filepath}`, { filepath });

      // Also write/update latest.json for easy access
      if (this.config.writeLatest) {
        const latestPath = path.join(this.config.outputDir, 'latest.json');
        await fs.writeFile(
          latestPath,
          JSON.stringify(results, null, 2),
          'utf-8'
        );
      }

      // Show quick summary
      const summary = results.summary;
      getLoggerInstance().info(
        `Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped || 0}`,
        { summary }
      );

    } catch (error) {
      const err = error as Error;
      getLoggerInstance().error('Failed to write JSON results', { error: err.message, stack: err.stack });
      if (this.config.throwOnError) {
        throw error;
      }
    }
  }

  /**
   * Read the latest test results
   */
  async readLatest(): Promise<CollectedResults> {
    const latestPath = path.join(this.config.outputDir, 'latest.json');

    try {
      const content = await fs.readFile(latestPath, 'utf-8');
      return JSON.parse(content) as CollectedResults;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new Error('No test results found. Run tests first.');
      }
      throw error;
    }
  }

  /**
   * List all test run files
   */
  async listRuns(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.outputDir);
      return files
        .filter(f => f.startsWith('run-') && f.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Read a specific test run
   */
  async readRun(filename: string): Promise<CollectedResults> {
    const filepath = path.join(this.config.outputDir, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content) as CollectedResults;
  }

  /**
   * Clean old test run files, keeping only the most recent N runs
   */
  async cleanOldRuns(keepCount: number = 10): Promise<void> {
    const runs = await this.listRuns();

    if (runs.length <= keepCount) {
      return;
    }

    const toDelete = runs.slice(keepCount);
    const deletePromises = toDelete.map(filename => {
      const filepath = path.join(this.config.outputDir, filename);
      return fs.unlink(filepath);
    });

    await Promise.all(deletePromises);
    getLoggerInstance().info(`Cleaned up ${toDelete.length} old test run(s)`, { count: toDelete.length });
  }
}

/**
 * Create a JSON reporter
 */
export function createReporter(config: JsonReporterConfig): JsonReporter {
  return new JsonReporter(config);
}

export default { JsonReporter, createReporter };

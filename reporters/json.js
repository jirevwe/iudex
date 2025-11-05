// Iudex - JSON File Reporter
// Persists test results to local JSON files for offline analysis

import fs from 'fs/promises';
import path from 'path';

export class JsonReporter {
  constructor(config = {}) {
    this.config = {
      outputDir: config.outputDir || '.iudex/results',
      includeTimestamp: config.includeTimestamp !== false,
      writeLatest: config.writeLatest !== false,
      ...config
    };
  }

  /**
   * Ensure output directory exists
   */
  async ensureDirectory() {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Generate filename for the test run
   */
  getFilename(timestamp = new Date()) {
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
   * @param {Object} collector - Result collector instance
   */
  async report(collector) {
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

      console.log(`\n✓ Test results saved to ${filepath}`);

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
      console.log(`   Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Skipped: ${summary.skipped || 0}`);

    } catch (error) {
      console.error('\n✗ Failed to write JSON results:', error.message);
      if (this.config.throwOnError) {
        throw error;
      }
    }
  }

  /**
   * Read the latest test results
   * @returns {Promise<Object>} Latest test results
   */
  async readLatest() {
    const latestPath = path.join(this.config.outputDir, 'latest.json');

    try {
      const content = await fs.readFile(latestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('No test results found. Run tests first.');
      }
      throw error;
    }
  }

  /**
   * List all test run files
   * @returns {Promise<Array>} Array of filenames
   */
  async listRuns() {
    try {
      const files = await fs.readdir(this.config.outputDir);
      return files
        .filter(f => f.startsWith('run-') && f.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Read a specific test run
   * @param {string} filename - Filename to read
   * @returns {Promise<Object>} Test results
   */
  async readRun(filename) {
    const filepath = path.join(this.config.outputDir, filename);
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Clean old test run files, keeping only the most recent N runs
   * @param {number} keepCount - Number of runs to keep
   */
  async cleanOldRuns(keepCount = 10) {
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
    console.log(`\n🧹 Cleaned up ${toDelete.length} old test run(s)`);
  }
}

/**
 * Create a JSON reporter
 * @param {Object} config - Reporter configuration
 * @returns {JsonReporter}
 */
export function createReporter(config) {
  return new JsonReporter(config);
}

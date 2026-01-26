// Unit tests for JSON File Reporter
import { jest } from '@jest/globals';
import { JsonReporter, createReporter } from './json.js';
import { resetLogger } from '../core/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('JsonReporter', () => {
  let reporter;
  let mockCollector;
  let testOutputDir;
  let originalLogAdapter;

  beforeEach(async () => {
    // Use console adapter for testing so console spies work
    originalLogAdapter = process.env.LOG_ADAPTER;
    process.env.LOG_ADAPTER = 'console';
    resetLogger(); // Reset logger to pick up new LOG_ADAPTER
    // Use a real temporary directory for testing
    testOutputDir = path.join(__dirname, '.test-output', `test-${Date.now()}`);

    // Mock collector
    mockCollector = {
      getResults: jest.fn(() => ({
        suites: [
          {
            name: 'API Tests',
            tests: [
              { name: 'test 1', status: 'passed', duration: 100 },
              { name: 'test 2', status: 'failed', duration: 50 }
            ]
          }
        ],
        summary: {
          total: 10,
          passed: 8,
          failed: 2,
          skipped: 0,
          duration: 5000
        },
        metadata: {
          framework: 'Iudex',
          version: '1.0.0'
        }
      }))
    };

    reporter = new JsonReporter({ outputDir: testOutputDir });
  });

  afterEach(async () => {
    // Restore LOG_ADAPTER
    if (originalLogAdapter) {
      process.env.LOG_ADAPTER = originalLogAdapter;
    } else {
      delete process.env.LOG_ADAPTER;
    }

    // Clean up test directory
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Constructor', () => {
    test('should initialize with default config', () => {
      const r = new JsonReporter();
      expect(r.config.outputDir).toBe('.iudex/results');
      expect(r.config.includeTimestamp).toBe(true);
      expect(r.config.writeLatest).toBe(true);
    });

    test('should accept custom output directory', () => {
      const r = new JsonReporter({ outputDir: 'custom/path' });
      expect(r.config.outputDir).toBe('custom/path');
    });

    test('should respect includeTimestamp option', () => {
      const r = new JsonReporter({ includeTimestamp: false });
      expect(r.config.includeTimestamp).toBe(false);
    });

    test('should respect writeLatest option', () => {
      const r = new JsonReporter({ writeLatest: false });
      expect(r.config.writeLatest).toBe(false);
    });
  });

  describe('ensureDirectory()', () => {
    test('should create output directory if it does not exist', async () => {
      await reporter.ensureDirectory();

      // Verify directory was created
      const stats = await fs.stat(testOutputDir);
      expect(stats.isDirectory()).toBe(true);
    });

    test('should not throw if directory already exists', async () => {
      // Create directory first
      await reporter.ensureDirectory();

      // Should not throw when called again
      await expect(reporter.ensureDirectory()).resolves.not.toThrow();
    });
  });

  describe('getFilename()', () => {
    test('should generate timestamped filename', () => {
      const timestamp = new Date('2024-01-15T10:30:45.123Z');
      const filename = reporter.getFilename(timestamp);

      expect(filename).toBe('run-2024-01-15T10-30-45.json');
    });

    test('should return static filename when timestamps disabled', () => {
      reporter = new JsonReporter({ includeTimestamp: false });
      const filename = reporter.getFilename();

      expect(filename).toBe('results.json');
    });

    test('should handle different timestamps correctly', () => {
      const timestamp = new Date('2024-12-31T23:59:59.999Z');
      const filename = reporter.getFilename(timestamp);

      expect(filename).toBe('run-2024-12-31T23-59-59.json');
    });
  });

  describe('report()', () => {
    test('should write test results to file', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.report(mockCollector);

      // Verify directory was created
      const stats = await fs.stat(testOutputDir);
      expect(stats.isDirectory()).toBe(true);

      // Verify a run file was created
      const files = await fs.readdir(testOutputDir);
      const runFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));
      expect(runFiles.length).toBe(1);

      // Verify file contents
      const content = await fs.readFile(path.join(testOutputDir, runFiles[0]), 'utf-8');
      const data = JSON.parse(content);
      expect(data.summary.total).toBe(10);
      expect(data.summary.passed).toBe(8);
      expect(data.summary.failed).toBe(2);

      consoleSpy.mockRestore();
    });

    test('should write latest.json when writeLatest is true', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.report(mockCollector);

      // Verify latest.json exists
      const latestPath = path.join(testOutputDir, 'latest.json');
      const stats = await fs.stat(latestPath);
      expect(stats.isFile()).toBe(true);

      // Verify contents match
      const content = await fs.readFile(latestPath, 'utf-8');
      const data = JSON.parse(content);
      expect(data.summary.total).toBe(10);

      consoleSpy.mockRestore();
    });

    test('should not write latest.json when writeLatest is false', async () => {
      reporter = new JsonReporter({ outputDir: testOutputDir, writeLatest: false });
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.report(mockCollector);

      // Verify latest.json does NOT exist
      const files = await fs.readdir(testOutputDir);
      expect(files.includes('latest.json')).toBe(false);

      consoleSpy.mockRestore();
    });

    test('should write files successfully', async () => {
      await reporter.report(mockCollector);

      // Verify files were written
      const files = await fs.readdir(testOutputDir);
      const runFiles = files.filter(f => f.startsWith('run-'));
      expect(runFiles.length).toBeGreaterThan(0);
      expect(files.includes('latest.json')).toBe(true);
    });

    test('should handle write errors gracefully by default', async () => {
      // Use an invalid path to trigger an error
      reporter = new JsonReporter({ outputDir: '/invalid/path/that/cannot/exist' });

      // Should not throw even when write fails
      await expect(reporter.report(mockCollector)).resolves.not.toThrow();
    });

    test('should throw error when throwOnError is enabled', async () => {
      reporter = new JsonReporter({
        outputDir: '/invalid/path/that/cannot/exist',
        throwOnError: true
      });

      await expect(reporter.report(mockCollector)).rejects.toThrow();
    });

    test('should format JSON with proper indentation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.report(mockCollector);

      // Read the file and check formatting
      const files = await fs.readdir(testOutputDir);
      const runFiles = files.filter(f => f.startsWith('run-') && f.endsWith('.json'));
      const content = await fs.readFile(path.join(testOutputDir, runFiles[0]), 'utf-8');

      // Check that JSON is formatted (has newlines and indentation)
      expect(content).toContain('\n');
      expect(content).toContain('  ');

      consoleSpy.mockRestore();
    });
  });

  describe('readLatest()', () => {
    test('should read and parse latest.json', async () => {
      const testData = { summary: { total: 15, passed: 12 } };

      // Write a test file first
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(
        path.join(testOutputDir, 'latest.json'),
        JSON.stringify(testData),
        'utf-8'
      );

      const result = await reporter.readLatest();
      expect(result).toEqual(testData);
    });

    test('should throw helpful error when no results found', async () => {
      // Don't create any files - latest.json won't exist
      await expect(reporter.readLatest()).rejects.toThrow(
        'No test results found. Run tests first.'
      );
    });

    test('should propagate other read errors', async () => {
      // Create directory but with invalid JSON
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(
        path.join(testOutputDir, 'latest.json'),
        'invalid json{',
        'utf-8'
      );

      await expect(reporter.readLatest()).rejects.toThrow();
    });
  });

  describe('listRuns()', () => {
    test('should return list of run files sorted by date (newest first)', async () => {
      // Create test files
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-15T10-30-00.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-15T09-15-00.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-16T08-00-00.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'latest.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'other-file.txt'), '', 'utf-8');

      const runs = await reporter.listRuns();

      expect(runs).toEqual([
        'run-2024-01-16T08-00-00.json',
        'run-2024-01-15T10-30-00.json',
        'run-2024-01-15T09-15-00.json'
      ]);
    });

    test('should return empty array when directory does not exist', async () => {
      // Don't create directory
      const runs = await reporter.listRuns();
      expect(runs).toEqual([]);
    });

    test('should propagate other readdir errors', async () => {
      // Create a file instead of directory to cause an error
      await fs.mkdir(path.dirname(testOutputDir), { recursive: true });
      await fs.writeFile(testOutputDir, 'not a directory', 'utf-8');

      await expect(reporter.listRuns()).rejects.toThrow();
    });
  });

  describe('readRun()', () => {
    test('should read and parse specific run file', async () => {
      const testData = { summary: { total: 20 } };

      // Create test file
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(
        path.join(testOutputDir, 'run-2024-01-15T10-30-00.json'),
        JSON.stringify(testData),
        'utf-8'
      );

      const result = await reporter.readRun('run-2024-01-15T10-30-00.json');
      expect(result).toEqual(testData);
    });
  });

  describe('cleanOldRuns()', () => {
    test('should delete old runs keeping only specified count', async () => {
      // Create test files
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-16.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-15.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-14.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-13.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-12.json'), '{}', 'utf-8');

      await reporter.cleanOldRuns(3);

      // Verify oldest 2 files were deleted
      const remainingFiles = await fs.readdir(testOutputDir);
      expect(remainingFiles).toContain('run-2024-01-16.json');
      expect(remainingFiles).toContain('run-2024-01-15.json');
      expect(remainingFiles).toContain('run-2024-01-14.json');
      expect(remainingFiles).not.toContain('run-2024-01-13.json');
      expect(remainingFiles).not.toContain('run-2024-01-12.json');
    });

    test('should not delete anything if runs are within keep count', async () => {
      // Create test files
      await fs.mkdir(testOutputDir, { recursive: true });
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-15.json'), '{}', 'utf-8');
      await fs.writeFile(path.join(testOutputDir, 'run-2024-01-14.json'), '{}', 'utf-8');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.cleanOldRuns(10);

      // Verify both files still exist
      const files = await fs.readdir(testOutputDir);
      expect(files).toContain('run-2024-01-15.json');
      expect(files).toContain('run-2024-01-14.json');

      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should use default keep count of 10', async () => {
      // Create 15 run files
      await fs.mkdir(testOutputDir, { recursive: true });
      const runs = Array.from({ length: 15 }, (_, i) =>
        `run-2024-01-${String(i + 1).padStart(2, '0')}.json`
      );

      for (const run of runs) {
        await fs.writeFile(path.join(testOutputDir, run), '{}', 'utf-8');
      }

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.cleanOldRuns();

      // Should have deleted 5 files (15 - 10 = 5)
      const remainingFiles = await fs.readdir(testOutputDir);
      const runFiles = remainingFiles.filter(f => f.startsWith('run-'));
      expect(runFiles.length).toBe(10);

      consoleSpy.mockRestore();
    });
  });

  describe('createReporter()', () => {
    test('should create JsonReporter instance', () => {
      const config = { outputDir: 'custom/path' };
      const instance = createReporter(config);

      expect(instance).toBeInstanceOf(JsonReporter);
      expect(instance.config.outputDir).toBe('custom/path');
    });
  });
});

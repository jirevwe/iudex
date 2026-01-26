// Unit tests for PostgreSQL Reporter
import { jest } from '@jest/globals';
import { PostgresReporter, createReporter } from './postgres.js';

describe('PostgresReporter', () => {
  let reporter;
  let mockCollector;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock collector
    mockCollector = {
      getSummary: jest.fn(() => ({
        total: 10,
        passed: 8,
        failed: 2,
        skipped: 0,
        duration: 5000,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:05Z')
      })),
      getMetadata: jest.fn(() => ({
        framework: 'Iudex',
        version: '1.0.0',
        environment: 'test',
        suiteName: 'API Tests',
        description: 'Testing API endpoints',
        duration: 5000,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T10:00:05Z')
      })),
      getAllResults: jest.fn(() => [
        {
          name: 'test 1',
          suite: 'API Tests',
          status: 'passed',
          duration: 100,
          testId: 'api.test1',
          endpoint: '/api/users',
          method: 'GET'
        },
        {
          name: 'test 2',
          suite: 'API Tests',
          status: 'failed',
          duration: 50,
          testId: 'api.test2',
          error: 'Assertion failed',
          errorType: 'AssertionError',
          stack: 'Error stack trace'
        }
      ])
    };

    reporter = new PostgresReporter({ enabled: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with default config', () => {
      const r = new PostgresReporter();
      expect(r.config).toEqual({});
      expect(r.enabled).toBe(false);
      expect(r.dbClient).toBeNull();
      expect(r.repository).toBeNull();
    });

    test('should accept custom config', () => {
      const config = {
        host: 'localhost',
        database: 'test_db',
        enabled: true
      };
      const r = new PostgresReporter(config);
      expect(r.config).toEqual(config);
      expect(r.enabled).toBe(true);
    });

    test('should respect enabled flag', () => {
      const r = new PostgresReporter({ enabled: false });
      expect(r.enabled).toBe(false);
    });
  });

  describe('getGitMetadata()', () => {
    test('should return git metadata object with correct structure', () => {
      const metadata = reporter.getGitMetadata();

      // Should have all required fields
      expect(metadata).toHaveProperty('branch');
      expect(metadata).toHaveProperty('commitSha');
      expect(metadata).toHaveProperty('commitMessage');

      // Values should be strings or null (depending on git availability)
      expect(typeof metadata.branch === 'string' || metadata.branch === null).toBe(true);
      expect(typeof metadata.commitSha === 'string' || metadata.commitSha === null).toBe(true);
      expect(typeof metadata.commitMessage === 'string' || metadata.commitMessage === null).toBe(true);
    });

    test('should trim whitespace from git values', () => {
      const metadata = reporter.getGitMetadata();

      if (metadata.branch) {
        expect(metadata.branch).toBe(metadata.branch.trim());
      }
      if (metadata.commitSha) {
        expect(metadata.commitSha).toBe(metadata.commitSha.trim());
      }
      if (metadata.commitMessage) {
        expect(metadata.commitMessage).toBe(metadata.commitMessage.trim());
      }
    });
  });

  describe('initialize()', () => {
    test('should skip initialization when disabled', async () => {
      reporter = new PostgresReporter({ enabled: false });

      await reporter.initialize();

      expect(reporter.dbClient).toBeNull();
      expect(reporter.repository).toBeNull();
    });
  });

  describe('report() - disabled', () => {
    test('should skip reporting when disabled', async () => {
      reporter = new PostgresReporter({ enabled: false });
      const initSpy = jest.spyOn(reporter, 'initialize');

      await reporter.report(mockCollector);

      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('report() - errors', () => {
    test('should handle errors gracefully without throwing by default', async () => {
      jest.spyOn(reporter, 'initialize').mockRejectedValue(new Error('Connection failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(reporter.report(mockCollector)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist results to database'),
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });

    test('should throw error when throwOnError is enabled', async () => {
      reporter = new PostgresReporter({ enabled: true, throwOnError: true });
      jest.spyOn(reporter, 'initialize').mockRejectedValue(new Error('Connection failed'));

      await expect(reporter.report(mockCollector)).rejects.toThrow('Connection failed');
    });
  });

  describe('showAnalytics() - mocked repository', () => {
    let mockRepository;

    beforeEach(() => {
      mockRepository = {
        getFlakyTests: jest.fn().mockResolvedValue([]),
        getRecentRegressions: jest.fn().mockResolvedValue([]),
        getTestHealthScores: jest.fn().mockResolvedValue([]),
        getDeletedTests: jest.fn().mockResolvedValue([])
      };
      reporter.repository = mockRepository;
    });

    test('should display flaky tests when found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getFlakyTests.mockResolvedValue([
        { current_name: 'Flaky Test 1', failure_rate: 25 },
        { current_name: 'Flaky Test 2', failure_rate: 30 }
      ]);

      await reporter.showAnalytics();

      expect(mockRepository.getFlakyTests).toHaveBeenCalledWith(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Flaky tests detected: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Flaky Test 1'));

      consoleSpy.mockRestore();
    });

    test('should display regressions when found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getRecentRegressions.mockResolvedValue([
        { current_name: 'Regressed Test', endpoint: '/api/users' }
      ]);

      await reporter.showAnalytics();

      expect(mockRepository.getRecentRegressions).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recent regressions: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Regressed Test'));

      consoleSpy.mockRestore();
    });

    test('should display unhealthy tests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getTestHealthScores.mockResolvedValue([
        { current_name: 'Unhealthy Test', overall_health_score: 45 },
        { current_name: 'Healthy Test', overall_health_score: 95 }
      ]);

      await reporter.showAnalytics();

      expect(mockRepository.getTestHealthScores).toHaveBeenCalledWith(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unhealthy tests'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unhealthy Test'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('score: 45'));

      consoleSpy.mockRestore();
    });

    test('should not display analytics sections when no data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await reporter.showAnalytics();

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Flaky tests'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('regressions'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Unhealthy'));

      consoleSpy.mockRestore();
    });

    test('should silently fail on analytics errors', async () => {
      mockRepository.getFlakyTests.mockRejectedValue(new Error('Query failed'));

      await expect(reporter.showAnalytics()).resolves.not.toThrow();
    });

    test('should limit displayed items to 3', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getFlakyTests.mockResolvedValue([
        { current_name: 'Test 1', failure_rate: 25 },
        { current_name: 'Test 2', failure_rate: 30 },
        { current_name: 'Test 3', failure_rate: 35 },
        { current_name: 'Test 4', failure_rate: 40 },
        { current_name: 'Test 5', failure_rate: 45 }
      ]);

      await reporter.showAnalytics();

      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const testCalls = calls.filter(call => call && call.includes('Test '));

      expect(testCalls).toHaveLength(3);

      consoleSpy.mockRestore();
    });

    test('should display deleted tests when found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getDeletedTests.mockResolvedValue([
        {
          current_name: 'Deleted Test 1',
          last_seen_at: new Date('2026-01-20T10:00:00Z')
        },
        {
          current_name: 'Deleted Test 2',
          last_seen_at: new Date('2026-01-19T10:00:00Z')
        }
      ]);

      await reporter.showAnalytics();

      expect(mockRepository.getDeletedTests).toHaveBeenCalledWith(5);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Recently deleted tests: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Deleted Test 1'));

      consoleSpy.mockRestore();
    });

    test('should not display deleted tests section when none found', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getDeletedTests.mockResolvedValue([]);

      await reporter.showAnalytics();

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('deleted tests'));

      consoleSpy.mockRestore();
    });

    test('should format deleted test timestamps correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRepository.getDeletedTests.mockResolvedValue([
        {
          current_name: 'Test with date',
          last_seen_at: new Date('2026-01-26T10:00:00Z')
        }
      ]);

      await reporter.showAnalytics();

      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const dateCall = calls.find(call => call && call.includes('last seen:'));

      expect(dateCall).toBeDefined();
      expect(dateCall).toMatch(/last seen: \d{1,2}\/\d{1,2}\/\d{4}/);

      consoleSpy.mockRestore();
    });
  });

  describe('getAnalytics()', () => {
    test('should throw error when disabled', async () => {
      reporter = new PostgresReporter({ enabled: false });

      await expect(reporter.getAnalytics('latest_runs')).rejects.toThrow(
        'PostgreSQL reporter is not enabled'
      );
    });

    test('should throw error for search without searchTerm', async () => {
      // Mock initialization
      const mockDbClient = { connect: jest.fn(), close: jest.fn() };
      const mockRepo = { searchTests: jest.fn() };

      reporter.dbClient = mockDbClient;
      reporter.repository = mockRepo;

      await expect(reporter.getAnalytics('search', { limit: 10 })).rejects.toThrow(
        'searchTerm is required for search query'
      );
    });

    test('should throw error for unknown query type', async () => {
      // Mock initialization
      const mockDbClient = { connect: jest.fn(), close: jest.fn() };
      const mockRepo = {};

      reporter.dbClient = mockDbClient;
      reporter.repository = mockRepo;

      await expect(reporter.getAnalytics('unknown_type')).rejects.toThrow(
        'Unknown analytics query type: unknown_type'
      );
    });

    test('should support deleted_tests query type', async () => {
      const mockDbClient = { connect: jest.fn(), close: jest.fn() };
      const mockRepo = {
        getDeletedTests: jest.fn().mockResolvedValue([
          { test_slug: 'test.deleted1', current_name: 'Deleted Test' }
        ])
      };

      jest.spyOn(reporter, 'initialize').mockResolvedValue();
      reporter.dbClient = mockDbClient;
      reporter.repository = mockRepo;

      const result = await reporter.getAnalytics('deleted_tests', { limit: 10 });

      expect(mockRepo.getDeletedTests).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
      expect(result[0].test_slug).toBe('test.deleted1');
    });

    test('should use default limit for deleted_tests when not specified', async () => {
      const mockDbClient = { connect: jest.fn(), close: jest.fn() };
      const mockRepo = {
        getDeletedTests: jest.fn().mockResolvedValue([])
      };

      jest.spyOn(reporter, 'initialize').mockResolvedValue();
      reporter.dbClient = mockDbClient;
      reporter.repository = mockRepo;

      await reporter.getAnalytics('deleted_tests', {});

      expect(mockRepo.getDeletedTests).toHaveBeenCalledWith(10);
    });
  });

  describe('createReporter()', () => {
    test('should create PostgresReporter instance', () => {
      const config = { host: 'localhost', database: 'test' };
      const instance = createReporter(config);

      expect(instance).toBeInstanceOf(PostgresReporter);
      expect(instance.config).toEqual(config);
    });
  });
});

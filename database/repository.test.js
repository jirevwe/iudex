// Unit tests for Test Repository - Deletion Detection & Suite Tracking
import { jest } from '@jest/globals';
import { TestRepository } from './repository.js';

describe('TestRepository - Deletion Detection & Suite Tracking', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    // Mock database client
    mockDb = {
      query: jest.fn()
    };
    repository = new TestRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('markDeletedTests()', () => {
    test('should mark tests as deleted when they do not appear in current run', async () => {
      const runId = 1;
      const currentTestSlugs = ['suite.test1', 'suite.test2'];
      const suiteNames = ['Test Suite'];

      const deletedTests = [
        {
          id: 3,
          test_slug: 'suite.test3',
          current_name: 'deleted test',
          suite_name: 'Test Suite'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: deletedTests });

      const result = await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tests'),
        expect.arrayContaining([suiteNames, 'suite.test1', 'suite.test2', runId])
      );
      expect(result).toEqual(deletedTests);
    });

    test('should handle empty test slugs array (all tests deleted)', async () => {
      const runId = 2;
      const currentTestSlugs = [];
      const suiteNames = ['Empty Suite'];

      const deletedTests = [
        { id: 1, test_slug: 'empty.test1', current_name: 'test 1', suite_name: 'Empty Suite' },
        { id: 2, test_slug: 'empty.test2', current_name: 'test 2', suite_name: 'Empty Suite' }
      ];

      mockDb.query.mockResolvedValue({ rows: deletedTests });

      const result = await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tests'),
        expect.arrayContaining([suiteNames, runId])
      );
      expect(result).toEqual(deletedTests);
      expect(result).toHaveLength(2);
    });

    test('should only mark tests from specified suites', async () => {
      const runId = 3;
      const currentTestSlugs = ['suite-a.test1'];
      const suiteNames = ['Suite A']; // Only Suite A, not Suite B

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('suite_name = ANY($1)');
      expect(mockDb.query.mock.calls[0][1][0]).toEqual(['Suite A']);
    });

    test('should not mark already deleted tests', async () => {
      const runId = 4;
      const currentTestSlugs = ['suite.test1'];
      const suiteNames = ['Test Suite'];

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('deleted_at IS NULL');
    });

    test('should only mark tests seen before the current run', async () => {
      const runId = 5;
      const currentTestSlugs = ['suite.test1'];
      const suiteNames = ['Test Suite'];

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('last_seen_at <');
      expect(query).toContain('SELECT started_at FROM test_runs WHERE id =');
    });

    test('should handle multiple suites', async () => {
      const runId = 6;
      const currentTestSlugs = ['suite-a.test1', 'suite-b.test1'];
      const suiteNames = ['Suite A', 'Suite B'];

      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      expect(mockDb.query.mock.calls[0][1][0]).toEqual(['Suite A', 'Suite B']);
    });

    test('should return deleted test information', async () => {
      const runId = 7;
      const currentTestSlugs = ['suite.test1'];
      const suiteNames = ['Test Suite'];

      const deletedTests = [
        {
          id: 2,
          test_slug: 'suite.test2',
          current_name: 'Deleted Test 2',
          suite_name: 'Test Suite'
        },
        {
          id: 3,
          test_slug: 'suite.test3',
          current_name: 'Deleted Test 3',
          suite_name: 'Test Suite'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: deletedTests });

      const result = await repository.markDeletedTests(runId, currentTestSlugs, suiteNames);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('test_slug', 'suite.test2');
      expect(result[1]).toHaveProperty('test_slug', 'suite.test3');
    });
  });

  describe('getDeletedTests()', () => {
    test('should retrieve deleted tests with default limit', async () => {
      const deletedTests = [
        {
          id: 1,
          test_slug: 'suite.deleted1',
          current_name: 'Deleted Test 1',
          suite_name: 'Test Suite',
          last_seen_at: '2026-01-26T10:00:00Z',
          deleted_at: '2026-01-26T11:00:00Z',
          total_runs: 5
        }
      ];

      mockDb.query.mockResolvedValue({ rows: deletedTests });

      const result = await repository.getDeletedTests();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE deleted_at IS NOT NULL'),
        [10] // default limit
      );
      expect(result).toEqual(deletedTests);
    });

    test('should accept custom limit', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getDeletedTests(25);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [25]
      );
    });

    test('should order by deleted_at DESC', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      await repository.getDeletedTests();

      const query = mockDb.query.mock.calls[0][0];
      expect(query).toContain('ORDER BY deleted_at DESC');
    });

    test('should return all required fields', async () => {
      const deletedTest = {
        id: 1,
        test_slug: 'suite.test',
        current_name: 'Test',
        suite_name: 'Suite',
        last_seen_at: '2026-01-26T10:00:00Z',
        deleted_at: '2026-01-26T11:00:00Z',
        total_runs: 10
      };

      mockDb.query.mockResolvedValue({ rows: [deletedTest] });

      const result = await repository.getDeletedTests();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('test_slug');
      expect(result[0]).toHaveProperty('current_name');
      expect(result[0]).toHaveProperty('suite_name');
      expect(result[0]).toHaveProperty('last_seen_at');
      expect(result[0]).toHaveProperty('deleted_at');
      expect(result[0]).toHaveProperty('total_runs');
    });
  });

  describe('findOrCreateTest() - Suite Tracking & Resurrection', () => {
    test('should update suite_name when test moves to different suite', async () => {
      const testData = {
        name: 'Test 1',
        description: 'Description',
        testSlug: 'test.test1',
        suiteName: 'New Suite', // Different from current
        testFile: '/path/to/test.js',
        endpoint: '/api/test',
        httpMethod: 'GET'
      };

      // Mock: test already exists
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT by slug
        .mockResolvedValueOnce({ rows: [] }) // UPDATE tests
        .mockResolvedValueOnce({ rows: [] }); // SELECT test_history

      await repository.findOrCreateTest(testData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tests'),
        expect.arrayContaining([
          testData.name,
          testData.description,
          expect.any(String), // testHash
          'New Suite', // suite_name should be updated
          testData.testFile,
          testData.endpoint,
          testData.httpMethod,
          1 // testId
        ])
      );
    });

    test('should clear deleted_at when test reappears (resurrection)', async () => {
      const testData = {
        name: 'Resurrected Test',
        description: null,
        testSlug: 'test.resurrected',
        suiteName: 'Test Suite',
        testFile: '/path/to/test.js'
      };

      // Mock: test exists but was deleted
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // SELECT by slug
        .mockResolvedValueOnce({ rows: [] }) // UPDATE tests
        .mockResolvedValueOnce({ rows: [] }); // SELECT test_history

      await repository.findOrCreateTest(testData);

      const updateQuery = mockDb.query.mock.calls[1][0];
      expect(updateQuery).toContain('deleted_at = NULL');
    });

    test('should update test_file when test moves to different file', async () => {
      const testData = {
        name: 'Test 1',
        description: null,
        testSlug: 'test.test1',
        suiteName: 'Test Suite',
        testFile: '/new/path/to/test.js', // Different file
        endpoint: null,
        httpMethod: null
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.findOrCreateTest(testData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tests'),
        expect.arrayContaining([
          testData.name,
          testData.description,
          expect.any(String),
          testData.suiteName,
          '/new/path/to/test.js', // test_file should be updated
          null,
          null,
          1
        ])
      );
    });

    test('should increment total_runs on each test execution', async () => {
      const testData = {
        name: 'Test',
        description: null,
        testSlug: 'test.test',
        suiteName: 'Suite'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.findOrCreateTest(testData);

      const updateQuery = mockDb.query.mock.calls[1][0];
      expect(updateQuery).toContain('total_runs = total_runs + 1');
    });

    test('should update last_seen_at to current timestamp', async () => {
      const testData = {
        name: 'Test',
        description: null,
        testSlug: 'test.test',
        suiteName: 'Suite'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await repository.findOrCreateTest(testData);

      const updateQuery = mockDb.query.mock.calls[1][0];
      expect(updateQuery).toContain('last_seen_at = CURRENT_TIMESTAMP');
    });

    test('should handle test creation with suite_name', async () => {
      const testData = {
        name: 'New Test',
        description: 'Description',
        testSlug: 'test.new',
        suiteName: 'New Suite',
        testFile: '/path/to/test.js',
        endpoint: '/api/test',
        httpMethod: 'POST'
      };

      // Mock: test doesn't exist, will be created
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // SELECT by slug (not found)
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // INSERT new test
        .mockResolvedValueOnce({ rows: [] }); // INSERT test_history

      await repository.findOrCreateTest(testData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO tests'),
        expect.arrayContaining([
          expect.any(String), // testHash
          testData.testSlug,
          testData.name,
          testData.description,
          'New Suite', // suite_name should be set on creation
          testData.testFile,
          testData.endpoint,
          testData.httpMethod
        ])
      );
    });
  });

  describe('Error handling', () => {
    test('markDeletedTests should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        repository.markDeletedTests(1, ['test.test1'], ['Suite'])
      ).rejects.toThrow('Database connection failed');
    });

    test('getDeletedTests should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Query failed'));

      await expect(repository.getDeletedTests()).rejects.toThrow('Query failed');
    });

    test('findOrCreateTest should throw when testSlug is missing', async () => {
      const testData = {
        name: 'Test without slug',
        description: null
        // testSlug is missing
      };

      await expect(repository.findOrCreateTest(testData)).rejects.toThrow(
        'testSlug is required for test identification'
      );
    });
  });
});

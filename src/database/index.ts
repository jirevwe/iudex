/**
 * Database Module Index
 */

export { DatabaseClient, createClient } from './client.js';
export { TestRepository } from './repository.js';
export type {
  TestRunData,
  TestData,
  TestResultData,
  TestRunRecord,
  EndpointSuccessRate,
  FlakyTest,
  TestHealthScore,
  DailyTestStats,
  TestSearchResult,
  DeletedTest,
  RegressionRecord
} from './repository.js';

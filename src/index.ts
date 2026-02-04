/**
 * Iudex - API Testing Framework
 * Main entry point with all public exports
 */

// ============================================================================
// Core Testing DSL
// ============================================================================

export {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  getTestSuites,
  clearTestSuites
} from './core/dsl.js';

// ============================================================================
// Standard Library Utilities
// ============================================================================

export { createStdObject } from './core/utils/index.js';
export * as stdUtils from './core/utils/index.js';

// ============================================================================
// HTTP Client
// ============================================================================

export { HttpClient } from './core/http-client.js';

// ============================================================================
// Test Runner
// ============================================================================

export { TestRunner, runTests } from './core/runner.js';
export type {
  TestContext,
  TestRunResult,
  SuiteResult,
  SummaryStats,
  RunResults,
  RunnerConfig
} from './core/runner.js';

// ============================================================================
// Result Collector
// ============================================================================

export { ResultCollector } from './core/collector.js';

// ============================================================================
// Logger
// ============================================================================

export { getLogger, createLogger } from './core/logger.js';
export type { LogLevel } from './core/logger.js';

// ============================================================================
// Governance
// ============================================================================

export { GovernanceEngine } from './governance/engine.js';

// ============================================================================
// Security
// ============================================================================

export { SecurityScanner } from './security/scanner.js';

// ============================================================================
// Database
// ============================================================================

export { DatabaseClient } from './database/client.js';
export { TestRepository } from './database/repository.js';
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
} from './database/repository.js';

// ============================================================================
// Reporters
// ============================================================================

export { ConsoleReporter } from './reporters/console.js';
export type { ConsoleReporterOptions } from './reporters/console.js';

export { JsonReporter, createReporter as createJsonReporter } from './reporters/json.js';
export type { JsonReporterConfig } from './reporters/json.js';

export { PostgresReporter, createReporter as createPostgresReporter } from './reporters/postgres.js';
export type { PostgresReporterConfig } from './reporters/postgres.js';

export { GitHubPagesReporter, createGitHubPagesReporter } from './reporters/github-pages.js';
export type { GitHubPagesReporterConfig } from './reporters/github-pages.js';

// ============================================================================
// Server / Dashboard
// ============================================================================

export { DashboardServer } from './server/dashboard-server.js';
export type { DashboardServerConfig } from './server/dashboard-server.js';

export { createExpressDashboard } from './server/handlers/express.js';
export type { ExpressDashboardConfig } from './server/handlers/express.js';

export { createFastifyDashboard } from './server/handlers/fastify.js';
export type { FastifyDashboardOptions } from './server/handlers/fastify.js';

export { createHttpDashboard, createStandaloneDashboardServer } from './server/handlers/http.js';

export { fetchAnalytics, createAnalyticsClient } from './server/api/analytics.js';
export type {
  QueryClient,
  AnalyticsOptions,
  FlakyTest as AnalyticsFlakyTest,
  Regression,
  HealthScore,
  DailyStat,
  EndpointRate,
  AnalyticsResult
} from './server/api/analytics.js';

// ============================================================================
// Types
// ============================================================================

export type {
  TestStatus,
  TestOptions,
  TestError,
  TestResult,
  HttpMethod,
  GovernanceSeverity,
  GovernanceViolation,
  GovernanceConfig,
  GovernanceRule,
  SecuritySeverity,
  SecurityFinding,
  SecurityConfig,
  SecurityCheck,
  DatabaseConfig,
  TestRunRecord as TypeTestRunRecord,
  TestResultRecord,
  ReporterFormat,
  ReporterConfig,
  AggregatedResults,
  Reporter,
  IudexConfig,
  HookFn,
  Logger
} from './types/index.js';

// ============================================================================
// Default export
// ============================================================================

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll
} from './core/dsl.js';
import { TestRunner, runTests } from './core/runner.js';
import { createStdObject } from './core/utils/index.js';
import { DatabaseClient } from './database/client.js';
import { TestRepository } from './database/repository.js';
import { ConsoleReporter } from './reporters/console.js';
import { JsonReporter } from './reporters/json.js';
import { PostgresReporter } from './reporters/postgres.js';
import { GitHubPagesReporter } from './reporters/github-pages.js';
import { DashboardServer } from './server/dashboard-server.js';
import { createExpressDashboard } from './server/handlers/express.js';
import { createHttpDashboard, createStandaloneDashboardServer } from './server/handlers/http.js';

export default {
  // DSL
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,

  // Runner
  TestRunner,
  runTests,

  // Utilities
  createStdObject,

  // Database
  DatabaseClient,
  TestRepository,

  // Reporters
  ConsoleReporter,
  JsonReporter,
  PostgresReporter,
  GitHubPagesReporter,

  // Server
  DashboardServer,
  createExpressDashboard,
  createHttpDashboard,
  createStandaloneDashboardServer
};

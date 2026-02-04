/**
 * Core Type Definitions for Iudex
 * API Testing Framework with Governance and Security
 */

// ============================================================================
// Test DSL Types
// ============================================================================

/**
 * Options for configuring individual tests
 */
export interface TestOptions {
  /** Test timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts on failure */
  retry?: number;
  /** Skip this test */
  skip?: boolean;
  /** Run only this test (exclusive mode) */
  only?: boolean;
  /** Mark as stub/unimplemented test */
  stub?: boolean;
  /** Tags for filtering and categorization */
  tags?: string[];
  /** Unique identifier for the test */
  id?: string;
}

/**
 * Options for configuring test suites
 */
export interface SuiteOptions {
  /** Prefix for all test names in this suite */
  prefix?: string;
  /** Tags applied to all tests in this suite */
  tags?: string[];
  /** Skip all tests in this suite */
  skip?: boolean;
  /** Run only tests in this suite */
  only?: boolean;
}

/**
 * Status of a test execution
 */
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'todo' | 'deleted';

/**
 * Error information from a failed test
 */
export interface TestError {
  message: string;
  stack?: string;
  expected?: unknown;
  actual?: unknown;
  operator?: string;
  timeout?: boolean;  // True if test timed out
}

/**
 * Result of a single test execution
 */
export interface TestResult {
  /** Test name */
  name: string;
  /** Unique test identifier */
  id: string;
  /** Execution status */
  status: TestStatus;
  /** Duration in milliseconds */
  duration: number;
  /** Error details if failed */
  error: TestError | null;
  /** Tags associated with the test */
  tags: string[];
  /** Number of retry attempts used */
  retries: number;
  /** Timestamp of execution */
  timestamp: Date;
}

/**
 * Test function signature
 */
export type TestFn = () => void | Promise<void>;

/**
 * Lifecycle hook function signature
 * Context is passed to beforeEach/afterEach hooks
 */
export type HookFn = (context?: unknown) => void | Promise<void>;

/**
 * Test definition stored internally
 */
export interface TestDefinition {
  name: string;
  id: string;
  fn: TestFn | null;  // null for stub tests
  options: TestOptions;
  suite: string;
}

/**
 * Suite definition stored internally
 */
export interface SuiteDefinition {
  name: string;
  tests: TestDefinition[];
  beforeAll: HookFn[];
  afterAll: HookFn[];
  beforeEach: HookFn[];
  afterEach: HookFn[];
  options: SuiteOptions;
}

// ============================================================================
// HTTP Client Types
// ============================================================================

/**
 * HTTP methods supported by the framework
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTTP request configuration
 */
export interface HttpRequestConfig {
  /** Request URL (can be relative if baseURL is set) */
  url: string;
  /** HTTP method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** URL parameters (query string) */
  params?: Record<string, string | number | boolean>;
  /** Request body data */
  data?: unknown;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Authentication configuration */
  auth?: {
    username: string;
    password: string;
  };
  /** Whether to validate SSL certificates */
  validateStatus?: (status: number) => boolean;
}

/**
 * HTTP response from a request
 */
export interface HttpResponse<T = unknown> {
  /** HTTP status code */
  status: number;
  /** Status text (e.g., "OK", "Not Found") */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body data */
  body: T;
  /** Response time in milliseconds */
  responseTime: number;
  /** Original request configuration */
  request: HttpRequestConfig;
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /** Base URL for all requests */
  baseURL?: string;
  /** Default headers for all requests */
  headers?: Record<string, string>;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Default authentication */
  auth?: {
    username: string;
    password: string;
  };
  /** Maximum number of redirects to follow */
  maxRedirects?: number;
}

/**
 * Request history entry
 */
export interface RequestHistoryEntry {
  request: HttpRequestConfig;
  response: HttpResponse;
  timestamp: Date;
}

// ============================================================================
// Governance Types
// ============================================================================

/**
 * Severity levels for governance violations
 */
export type GovernanceSeverity = 'error' | 'warning' | 'info';

/**
 * A single governance rule violation
 */
export interface GovernanceViolation {
  /** Rule identifier */
  rule: string;
  /** Category of the violation */
  category?: string;
  /** Severity of the violation */
  severity: GovernanceSeverity;
  /** Human-readable message */
  message: string;
  /** Affected endpoint */
  endpoint: string;
  /** HTTP method of the request */
  method: HttpMethod;
  /** Suggested fix */
  suggestion?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Result from running governance checks
 */
export interface GovernanceResult {
  /** List of violations found */
  violations: GovernanceViolation[];
  /** Number of rules checked */
  rulesChecked: number;
  /** Execution time in milliseconds */
  duration: number;
}

/**
 * Configuration for a governance rule
 */
export interface GovernanceRuleConfig {
  /** Whether this rule is enabled */
  enabled?: boolean;
  /** Severity level for violations */
  severity?: GovernanceSeverity;
  /** Rule-specific options */
  options?: Record<string, unknown>;
}

/**
 * Interface for governance rule implementations
 */
export interface GovernanceRule {
  /** Rule name/identifier */
  name: string;
  /** Rule description */
  description: string;
  /** Check function */
  check: (request: HttpRequestConfig, response: HttpResponse, config?: GovernanceRuleConfig) => GovernanceViolation[];
}

/**
 * Governance engine configuration
 */
export interface GovernanceConfig {
  /** Whether governance is enabled */
  enabled?: boolean;
  /** Rules configuration */
  rules?: Record<string, GovernanceRuleConfig>;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Severity levels for security findings
 */
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * A single security finding
 */
export interface SecurityFinding {
  /** Check identifier */
  check: string;
  /** Finding type/category for backwards compatibility */
  type?: string;
  /** Suite name for backwards compatibility */
  suite?: string;
  /** Test name for backwards compatibility */
  test?: string;
  /** Severity of the finding */
  severity: SecuritySeverity;
  /** Title of the finding */
  title: string;
  /** Detailed description */
  description: string;
  /** Affected endpoint */
  endpoint: string;
  /** HTTP method */
  method: HttpMethod;
  /** Remediation advice */
  remediation?: string;
  /** Reference links */
  references?: string[];
  /** Additional evidence */
  evidence?: Record<string, unknown>;
}

/**
 * Result from running security checks
 */
export interface SecurityResult {
  /** List of findings */
  findings: SecurityFinding[];
  /** Number of checks performed */
  checksPerformed: number;
  /** Execution time in milliseconds */
  duration: number;
}

/**
 * Configuration for a security check
 */
export interface SecurityCheckConfig {
  /** Whether this check is enabled */
  enabled?: boolean;
  /** Severity override */
  severity?: SecuritySeverity;
  /** Check-specific options */
  options?: Record<string, unknown>;
}

/**
 * Interface for security check implementations
 */
export interface SecurityCheck {
  /** Check name/identifier */
  name: string;
  /** Check description */
  description: string;
  /** Check function */
  check: (request: HttpRequestConfig, response: HttpResponse, config?: SecurityCheckConfig) => SecurityFinding[];
}

/**
 * Security scanner configuration
 */
export interface SecurityConfig {
  /** Whether security scanning is enabled */
  enabled?: boolean;
  /** Checks configuration */
  checks?: Record<string, SecurityCheckConfig>;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database host */
  host?: string;
  /** Database port */
  port?: number;
  /** Database name */
  database?: string;
  /** Database user */
  user?: string;
  /** Database password */
  password?: string;
  /** Use SSL connection */
  ssl?: boolean | { rejectUnauthorized: boolean };
  /** Connection pool size */
  max?: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMillis?: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMillis?: number;
  /** Full connection string (overrides individual parameters) */
  connectionString?: string;
}

/**
 * Test run record stored in database
 */
export interface TestRunRecord {
  id: number;
  name: string;
  startedAt: Date;
  completedAt: Date | null;
  status: 'running' | 'completed' | 'failed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  todoTests: number;
  deletedTests: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

/**
 * Test result record stored in database
 */
export interface TestResultRecord {
  id: number;
  runId: number;
  testId: string;
  name: string;
  status: TestStatus;
  duration: number;
  error: TestError | null;
  tags: string[];
  retries: number;
  createdAt: Date;
  deletedAt: Date | null;
}

// ============================================================================
// Reporter Types
// ============================================================================

/**
 * Reporter output formats
 */
export type ReporterFormat = 'console' | 'json' | 'postgres' | 'github-pages';

/**
 * Configuration for a reporter
 */
export interface ReporterConfig {
  /** Reporter type */
  type: ReporterFormat;
  /** Reporter-specific options */
  options?: Record<string, unknown>;
}

/**
 * Aggregated results for reporting
 */
export interface AggregatedResults {
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    todo: number;
    deleted: number;
    duration: number;
  };
  /** Individual test results */
  tests: TestResult[];
  /** Governance violations */
  governance: GovernanceViolation[];
  /** Security findings */
  security: SecurityFinding[];
  /** Metadata */
  metadata: {
    startTime: Date;
    endTime: Date;
    environment?: string;
    version?: string;
  };
}

/**
 * Interface for reporter implementations
 */
export interface Reporter {
  /** Reporter name */
  name: string;
  /** Report generation function */
  report: (results: AggregatedResults, config?: ReporterConfig) => void | Promise<void>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Main Iudex configuration
 */
export interface IudexConfig {
  /** Test file patterns to match */
  testMatch?: string[];
  /** Files/directories to ignore */
  testIgnore?: string[];
  /** Default test timeout in milliseconds */
  timeout?: number;
  /** Default retry count */
  retries?: number;
  /** Stop on first failure */
  bail?: boolean;
  /** Run tests in parallel */
  parallel?: boolean;
  /** Maximum parallel workers */
  maxWorkers?: number;
  /** HTTP client configuration */
  http?: HttpClientConfig;
  /** Governance configuration */
  governance?: GovernanceConfig;
  /** Security configuration */
  security?: SecurityConfig;
  /** Database configuration */
  database?: DatabaseConfig;
  /** Reporters configuration */
  reporters?: ReporterConfig[];
  /** Thresholds for pass/fail */
  thresholds?: {
    /** Maximum allowed governance violations */
    maxViolations?: number;
    /** Maximum allowed security findings */
    maxFindings?: number;
    /** Minimum pass rate (0-100) */
    minPassRate?: number;
  };
}

// ============================================================================
// Runner Types
// ============================================================================

/**
 * Options for the test runner
 */
export interface RunnerOptions {
  /** Configuration override */
  config?: Partial<IudexConfig>;
  /** Filter by tags */
  tags?: string[];
  /** Filter by test pattern */
  pattern?: string;
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Result from a test run
 */
export interface RunResult {
  /** Whether all tests passed */
  success: boolean;
  /** Exit code (0 for success) */
  exitCode: number;
  /** Aggregated results */
  results: AggregatedResults;
}

// ============================================================================
// Logger Types
// ============================================================================

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
  child: (bindings: Record<string, unknown>) => Logger;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level */
  level?: LogLevel;
  /** Whether to pretty print */
  pretty?: boolean;
  /** Custom transport */
  transport?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Async or sync function return type
 */
export type MaybePromise<T> = T | Promise<T>;

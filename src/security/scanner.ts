/**
 * Security Scanner - Coordinates all security checks
 */

import { SensitiveDataCheck } from './checks/sensitive-data.js';
import { AuthenticationCheck } from './checks/authentication.js';
import { AuthorizationCheck } from './checks/authorization.js';
import { RateLimitingCheck } from './checks/rate-limiting.js';
import { SslTlsCheck } from './checks/ssl-tls.js';
import { HeadersCheck } from './checks/headers.js';
import type { SecurityFinding, SecurityConfig, SecurityCheckConfig } from '../types/index.js';

/** Check instance interface */
interface CheckInstance {
  name: string;
  severity?: string;
  execute: (
    request: Request,
    response: Response,
    endpoint: string | Endpoint
  ) => Promise<CheckResult>;
}

/** Request object */
interface Request {
  method: string;
  url?: string;
  headers?: Record<string, string>;
}

/** Response object */
interface Response {
  body?: unknown;
  status?: number;
  headers?: Record<string, string>;
}

/** Endpoint info */
interface Endpoint {
  url?: string;
}

/** Check result */
interface CheckResult {
  passed?: boolean;
  findings?: Array<{
    type?: string;
    severity?: string;
    title?: string;
    description?: string;
    location?: string;
    evidence?: string;
    cwe?: string;
    remediation?: string;
  }>;
}

/** Test context */
interface TestContext {
  suite?: string;
  test?: string;
}

/** Loaded check */
interface LoadedCheck {
  name: string;
  instance: CheckInstance;
}

/** Scanner configuration */
interface ScannerConfig {
  security?: SecurityConfig & {
    checks?: Record<string, SecurityCheckConfig>;
  };
}

/** CWE mapping */
const CWE_MAP: Record<string, string> = {
  'password': 'CWE-200: Exposure of Sensitive Information',
  'apiKey': 'CWE-200: Exposure of Sensitive Information',
  'creditCard': 'CWE-359: Exposure of Private Personal Information',
  'ssn': 'CWE-359: Exposure of Private Personal Information',
  'jwt': 'CWE-200: Exposure of Sensitive Information',
  'missing-authentication': 'CWE-306: Missing Authentication',
  'weak-authentication': 'CWE-287: Improper Authentication',
  'missing-authorization': 'CWE-862: Missing Authorization',
  'idor': 'CWE-639: Insecure Direct Object References',
  'missing-rate-limiting': 'CWE-770: Allocation of Resources Without Limits',
  'http-usage': 'CWE-319: Cleartext Transmission of Sensitive Information',
  'insecure-cookies': 'CWE-614: Sensitive Cookie Without Secure Attribute',
  'missing-security-header': 'CWE-693: Protection Mechanism Failure'
};

/**
 * Security Scanner
 * Coordinates and executes security checks against API requests/responses
 */
export class SecurityScanner {
  private config: SecurityConfig & { checks?: Record<string, SecurityCheckConfig> };
  private enabled: boolean;
  private checks: LoadedCheck[];

  constructor(config: ScannerConfig = {}) {
    this.config = config.security || {};
    this.enabled = this.config.enabled === true;
    this.checks = [];

    if (this.enabled) {
      this.loadChecks();
    }
  }

  /**
   * Load and initialize enabled security checks
   */
  private loadChecks(): void {
    const checksConfig = this.config.checks || {};

    if ('sensitive-data' in checksConfig && checksConfig['sensitive-data']?.enabled !== false) {
      this.checks.push({
        name: 'sensitive-data',
        instance: new SensitiveDataCheck(checksConfig['sensitive-data'] || {})
      });
    }

    if ('authentication' in checksConfig && checksConfig['authentication']?.enabled !== false) {
      this.checks.push({
        name: 'authentication',
        instance: new AuthenticationCheck(checksConfig['authentication'] || {})
      });
    }

    if ('authorization' in checksConfig && checksConfig['authorization']?.enabled !== false) {
      this.checks.push({
        name: 'authorization',
        instance: new AuthorizationCheck(checksConfig['authorization'] || {})
      });
    }

    if ('rate-limiting' in checksConfig && checksConfig['rate-limiting']?.enabled !== false) {
      this.checks.push({
        name: 'rate-limiting',
        instance: new RateLimitingCheck(checksConfig['rate-limiting'] || {})
      });
    }

    if ('ssl-tls' in checksConfig && checksConfig['ssl-tls']?.enabled !== false) {
      this.checks.push({
        name: 'ssl-tls',
        instance: new SslTlsCheck(checksConfig['ssl-tls'] || {})
      });
    }

    if ('headers' in checksConfig && checksConfig['headers']?.enabled !== false) {
      this.checks.push({
        name: 'headers',
        instance: new HeadersCheck(checksConfig['headers'] || {})
      });
    }
  }

  /**
   * Dynamically add a check
   */
  addCheck(name: string, checkInstance: CheckInstance): void {
    this.checks.push({ name, instance: checkInstance });
  }

  /**
   * Generate a human-readable title from finding type
   */
  private generateTitle(type?: string, checkName?: string): string {
    if (type) {
      return type.split(/[-_]/).map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
    return `${checkName} finding`;
  }

  /**
   * Get CWE reference for finding type
   */
  private getCWE(type?: string): string {
    return CWE_MAP[type || ''] || 'CWE-1000: Research Concepts';
  }

  /**
   * Scan request/response against all enabled security checks
   */
  async scan(
    request: Request,
    response: Response,
    endpoint: string | Endpoint,
    testContext: TestContext = {}
  ): Promise<SecurityFinding[]> {
    if (!this.enabled || this.checks.length === 0) {
      return [];
    }

    const allFindings: SecurityFinding[] = [];

    for (const check of this.checks) {
      try {
        const result = await check.instance.execute(request, response, endpoint);

        if (result?.findings && result.findings.length > 0) {
          const normalizedFindings = result.findings.map(f => ({
            check: check.name,
            type: f.type,  // Top-level for backwards compat
            suite: testContext.suite,  // Top-level for backwards compat
            test: testContext.test,  // Top-level for backwards compat
            location: f.location || 'response',  // Top-level for backwards compat
            cwe: this.getCWE(f.type),  // Top-level for backwards compat
            severity: (f.severity || 'medium') as SecurityFinding['severity'],
            title: f.title || this.generateTitle(f.type, check.name),
            description: f.description || 'Security issue detected',
            endpoint: typeof endpoint === 'string' ? endpoint : (endpoint.url || request.url || ''),
            method: request.method.toUpperCase() as SecurityFinding['method'],
            remediation: f.remediation || 'Review and address the security finding',
            references: [this.getCWE(f.type)],
            evidence: {
              location: f.location || 'response',
              evidence: f.evidence,
              suite: testContext.suite,
              test: testContext.test,
              type: f.type
            }
          }));

          allFindings.push(...normalizedFindings);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Security check '${check.name}' failed:`, message);
      }
    }

    return allFindings;
  }

  /**
   * Get list of enabled check names
   */
  getCheckNames(): string[] {
    return this.checks.map(c => c.name);
  }

  /**
   * Check if security scanning is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get total number of loaded checks
   */
  getCheckCount(): number {
    return this.checks.length;
  }
}

export default SecurityScanner;

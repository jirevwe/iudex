/**
 * Governance Engine - Coordinates all governance rules
 */

import { RestStandardsRule } from './rules/rest-standards.js';
import { VersioningRule } from './rules/versioning.js';
import { NamingConventionsRule } from './rules/naming-conventions.js';
import { HttpMethodsRule } from './rules/http-methods.js';
import { PaginationRule } from './rules/pagination.js';
import type { GovernanceViolation, GovernanceConfig, GovernanceRuleConfig } from '../types/index.js';

/** Rule instance interface */
interface RuleInstance {
  name: string;
  severity?: string;
  validate: (
    request: Request,
    response: Response,
    endpoint: string | Endpoint
  ) => Promise<ValidationResult>;
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

/** Validation result from a rule */
interface ValidationResult {
  passed?: boolean;
  violations?: Array<{
    rule?: string;
    category?: string;
    severity?: string;
    message?: string;
    location?: string;
    remediation?: string;
  }>;
}

/** Test context */
interface TestContext {
  suite?: string;
  test?: string;
}

/** Loaded rule */
interface LoadedRule {
  name: string;
  instance: RuleInstance;
}

/** Engine configuration */
interface EngineConfig {
  governance?: GovernanceConfig & {
    rules?: Record<string, GovernanceRuleConfig>;
  };
}

/**
 * Governance Engine
 * Coordinates and executes governance rules against API requests/responses
 */
export class GovernanceEngine {
  private config: GovernanceConfig & { rules?: Record<string, GovernanceRuleConfig> };
  private enabled: boolean;
  private rules: LoadedRule[];

  constructor(config: EngineConfig = {}) {
    this.config = config.governance || {};
    this.enabled = this.config.enabled === true;
    this.rules = [];

    if (this.enabled) {
      this.loadRules();
    }
  }

  /**
   * Load and initialize enabled governance rules
   */
  private loadRules(): void {
    const rulesConfig = this.config.rules || {};

    if ('rest-standards' in rulesConfig && rulesConfig['rest-standards']?.enabled !== false) {
      this.rules.push({
        name: 'rest-standards',
        instance: new RestStandardsRule(rulesConfig['rest-standards'] || {})
      });
    }

    if ('versioning' in rulesConfig && rulesConfig['versioning']?.enabled !== false) {
      this.rules.push({
        name: 'versioning',
        instance: new VersioningRule(rulesConfig['versioning'] || {})
      });
    }

    if ('naming-conventions' in rulesConfig && rulesConfig['naming-conventions']?.enabled !== false) {
      this.rules.push({
        name: 'naming-conventions',
        instance: new NamingConventionsRule(rulesConfig['naming-conventions'] || {})
      });
    }

    if ('http-methods' in rulesConfig && rulesConfig['http-methods']?.enabled !== false) {
      this.rules.push({
        name: 'http-methods',
        instance: new HttpMethodsRule(rulesConfig['http-methods'] || {})
      });
    }

    if ('pagination' in rulesConfig && rulesConfig['pagination']?.enabled !== false) {
      this.rules.push({
        name: 'pagination',
        instance: new PaginationRule(rulesConfig['pagination'] || {})
      });
    }
  }

  /**
   * Dynamically add a rule
   */
  addRule(name: string, ruleInstance: RuleInstance): void {
    this.rules.push({ name, instance: ruleInstance });
  }

  /**
   * Check request/response against all enabled governance rules
   */
  async check(
    request: Request,
    response: Response,
    endpoint: string | Endpoint,
    testContext: TestContext = {}
  ): Promise<GovernanceViolation[]> {
    if (!this.enabled || this.rules.length === 0) {
      return [];
    }

    const allViolations: GovernanceViolation[] = [];

    for (const rule of this.rules) {
      try {
        const result = await rule.instance.validate(request, response, endpoint);

        if (result?.violations && result.violations.length > 0) {
          const normalizedViolations = result.violations.map(v => ({
            rule: rule.name,
            category: v.rule || v.category || 'unknown',  // Top-level category for backwards compat
            severity: (v.severity || rule.instance.severity || 'warning') as GovernanceViolation['severity'],
            message: v.message || 'Governance violation detected',
            endpoint: typeof endpoint === 'string' ? endpoint : (endpoint.url || request.url || ''),
            method: request.method.toUpperCase() as GovernanceViolation['method'],
            suggestion: v.remediation || 'Review and fix the violation',
            location: v.location || 'response',  // Top-level for backwards compat
            remediation: v.remediation || 'Review and fix the violation',  // Top-level for backwards compat
            suite: testContext.suite,  // Top-level for backwards compat
            test: testContext.test,  // Top-level for backwards compat
            context: {
              suite: testContext.suite,
              test: testContext.test,
              category: v.rule || v.category || 'unknown',
              location: v.location || 'response'
            }
          }));

          allViolations.push(...normalizedViolations);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Governance rule '${rule.name}' failed:`, message);
      }
    }

    return allViolations;
  }

  /**
   * Get list of enabled rule names
   */
  getRuleNames(): string[] {
    return this.rules.map(r => r.name);
  }

  /**
   * Check if governance is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get total number of loaded rules
   */
  getRuleCount(): number {
    return this.rules.length;
  }
}

export default GovernanceEngine;

/**
 * REST Standards Governance Rule
 */

import type { GovernanceSeverity } from '../../types/index.js';

/** Rule configuration */
export interface RestStandardsConfig {
  severity?: GovernanceSeverity;
  enabled?: boolean;
}

/** Request object for validation */
interface Request {
  method: string;
  url?: string;
}

/** Response object for validation */
interface Response {
  body?: unknown;
  status?: number;
}

/** Endpoint info */
interface Endpoint {
  url?: string;
}

/** Validation result */
interface ValidationResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: GovernanceSeverity;
  }>;
}

/**
 * REST Standards Rule
 * Validates API responses against REST best practices
 */
export class RestStandardsRule {
  name = 'rest-standards';
  severity: GovernanceSeverity;
  enabled: boolean;

  constructor(config: RestStandardsConfig = {}) {
    this.severity = config.severity || 'error';
    this.enabled = config.enabled !== false;
  }

  async validate(
    request: Request,
    response: Response,
    endpoint: string | Endpoint
  ): Promise<ValidationResult> {
    const violations: ValidationResult['violations'] = [];

    // Check HTTP methods
    const method = request.method.toUpperCase();
    const body = response.body as Record<string, unknown> | undefined;

    if (method === 'POST' && body?.id && response.status === 200) {
      violations.push({
        rule: 'creation-status-code',
        message: 'POST for resource creation should return 201',
        severity: 'warning'
      });
    }

    // Check resource naming (plural)
    const path = typeof endpoint === 'string' ? endpoint : (endpoint.url || '');
    const segments = path.split('/').filter(s => s && !s.match(/^\d+$/));
    for (const segment of segments) {
      if (!segment.endsWith('s') && !this.isException(segment)) {
        violations.push({
          rule: 'resource-naming',
          message: `Resource '${segment}' should be plural`,
          severity: 'warning'
        });
      }
    }

    // Check pagination for large arrays
    if (Array.isArray(response.body) && response.body.length > 50) {
      violations.push({
        rule: 'pagination-required',
        message: 'Large collections should use pagination',
        severity: 'warning'
      });
    }

    return { passed: violations.length === 0, violations };
  }

  private isException(segment: string): boolean {
    const exceptions = ['api', 'v1', 'v2', 'v3', 'auth', 'login', 'logout'];
    return exceptions.includes(segment.toLowerCase());
  }
}

export default RestStandardsRule;

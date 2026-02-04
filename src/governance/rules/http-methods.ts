/**
 * HTTP Methods Governance Rule
 */

import type { GovernanceSeverity } from '../../types/index.js';

export interface HttpMethodsConfig {
  severity?: GovernanceSeverity;
  enabled?: boolean;
}

interface ValidationResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: GovernanceSeverity;
  }>;
}

export class HttpMethodsRule {
  name = 'http-methods';
  severity: GovernanceSeverity;
  enabled: boolean;

  constructor(config: HttpMethodsConfig = {}) {
    this.severity = config.severity || 'error';
    this.enabled = config.enabled !== false;
  }

  async validate(
    request: { method: string },
    response: { status?: number; body?: unknown },
    _endpoint: string | { url?: string }
  ): Promise<ValidationResult> {
    const violations: ValidationResult['violations'] = [];
    const method = request.method.toUpperCase();

    // Check DELETE returns 204 or 200
    if (method === 'DELETE' && response.status && ![200, 204, 404].includes(response.status)) {
      violations.push({
        rule: 'delete-status-code',
        message: 'DELETE should return 200, 204, or 404',
        severity: this.severity
      });
    }

    // Check PUT is idempotent
    if (method === 'PUT' && response.status === 201) {
      violations.push({
        rule: 'put-idempotent',
        message: 'PUT should be idempotent; use POST for creation',
        severity: 'warning'
      });
    }

    return { passed: violations.length === 0, violations };
  }
}

export default HttpMethodsRule;

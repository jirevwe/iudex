/**
 * Pagination Governance Rule
 */

import type { GovernanceSeverity } from '../../types/index.js';

export interface PaginationConfig {
  severity?: GovernanceSeverity;
  enabled?: boolean;
  threshold?: number;
}

interface ValidationResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: GovernanceSeverity;
  }>;
}

export class PaginationRule {
  name = 'pagination';
  severity: GovernanceSeverity;
  enabled: boolean;
  threshold: number;

  constructor(config: PaginationConfig = {}) {
    this.severity = config.severity || 'warning';
    this.enabled = config.enabled !== false;
    this.threshold = config.threshold || 50;
  }

  async validate(
    _request: { method: string },
    response: { body?: unknown; headers?: Record<string, string> },
    _endpoint: string | { url?: string }
  ): Promise<ValidationResult> {
    const violations: ValidationResult['violations'] = [];

    if (Array.isArray(response.body) && response.body.length > this.threshold) {
      const hasPaginationHeaders = response.headers &&
        (response.headers['x-total-count'] || response.headers['link']);

      if (!hasPaginationHeaders) {
        violations.push({
          rule: 'missing-pagination',
          message: `Collections with >${this.threshold} items should use pagination`,
          severity: this.severity
        });
      }
    }

    return { passed: violations.length === 0, violations };
  }
}

export default PaginationRule;

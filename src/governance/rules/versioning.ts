/**
 * Versioning Governance Rule
 */

import type { GovernanceSeverity } from '../../types/index.js';

export interface VersioningConfig {
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

export class VersioningRule {
  name = 'versioning';
  severity: GovernanceSeverity;
  enabled: boolean;

  constructor(config: VersioningConfig = {}) {
    this.severity = config.severity || 'warning';
    this.enabled = config.enabled !== false;
  }

  async validate(
    request: { method: string; url?: string; headers?: Record<string, string> },
    _response: { headers?: Record<string, string> },
    endpoint: string | { url?: string }
  ): Promise<ValidationResult> {
    const violations: ValidationResult['violations'] = [];
    const path = typeof endpoint === 'string' ? endpoint : (endpoint.url || '');

    // Check for version in URL
    const hasUrlVersion = /\/v\d+\//.test(path);
    const hasHeaderVersion = request.headers?.['api-version'] || request.headers?.['x-api-version'];

    if (!hasUrlVersion && !hasHeaderVersion) {
      violations.push({
        rule: 'missing-version',
        message: 'API endpoint should include version (URL or header)',
        severity: this.severity
      });
    }

    return { passed: violations.length === 0, violations };
  }
}

export default VersioningRule;

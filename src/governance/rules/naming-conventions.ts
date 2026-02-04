/**
 * Naming Conventions Governance Rule
 */

import type { GovernanceSeverity } from '../../types/index.js';

export interface NamingConventionsConfig {
  severity?: GovernanceSeverity;
  enabled?: boolean;
  style?: 'kebab-case' | 'snake_case' | 'camelCase';
}

interface ValidationResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    message: string;
    severity: GovernanceSeverity;
  }>;
}

export class NamingConventionsRule {
  name = 'naming-conventions';
  severity: GovernanceSeverity;
  enabled: boolean;
  style: string;

  constructor(config: NamingConventionsConfig = {}) {
    this.severity = config.severity || 'warning';
    this.enabled = config.enabled !== false;
    this.style = config.style || 'kebab-case';
  }

  async validate(
    _request: { method: string; url?: string },
    _response: unknown,
    endpoint: string | { url?: string }
  ): Promise<ValidationResult> {
    const violations: ValidationResult['violations'] = [];
    const path = typeof endpoint === 'string' ? endpoint : (endpoint.url || '');
    const segments = path.split('/').filter(s => s && !s.match(/^[v\d]+$/) && !s.match(/^\d+$/));

    for (const segment of segments) {
      if (this.style === 'kebab-case' && segment.includes('_')) {
        violations.push({
          rule: 'naming-style',
          message: `Resource '${segment}' should use kebab-case, not snake_case`,
          severity: this.severity
        });
      }
    }

    return { passed: violations.length === 0, violations };
  }
}

export default NamingConventionsRule;

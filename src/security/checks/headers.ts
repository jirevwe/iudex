/**
 * Security Headers Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface HeadersConfig {
  severity?: SecuritySeverity;
  enabled?: boolean;
}

interface Finding {
  type: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: string;
}

interface CheckResult {
  passed: boolean;
  findings: Finding[];
}

export class HeadersCheck {
  name = 'headers';
  severity: SecuritySeverity;
  enabled: boolean;

  private requiredHeaders = [
    { name: 'x-content-type-options', value: 'nosniff' },
    { name: 'x-frame-options', value: null },
    { name: 'strict-transport-security', value: null },
    { name: 'content-security-policy', value: null }
  ];

  constructor(config: HeadersConfig = {}) {
    this.severity = config.severity || 'medium';
    this.enabled = config.enabled !== false;
  }

  async execute(
    _request: { method: string },
    response: { headers?: Record<string, string> },
    _endpoint: string | { url?: string }
  ): Promise<CheckResult> {
    const findings: Finding[] = [];
    const headers = response.headers || {};
    const headerNames = Object.keys(headers).map(h => h.toLowerCase());

    for (const required of this.requiredHeaders) {
      if (!headerNames.includes(required.name)) {
        findings.push({
          type: 'missing-security-header',
          severity: this.severity,
          title: `Missing ${required.name} header`,
          description: `Security header ${required.name} should be present`,
          location: 'response.headers'
        });
      }
    }

    return { passed: findings.length === 0, findings };
  }
}

export default HeadersCheck;

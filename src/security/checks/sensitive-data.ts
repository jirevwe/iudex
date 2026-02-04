/**
 * Sensitive Data Security Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface SensitiveDataConfig {
  severity?: SecuritySeverity;
  enabled?: boolean;
}

interface Finding {
  type: string;
  severity: SecuritySeverity;
  title: string;
  description: string;
  location: string;
  evidence?: string;
}

interface CheckResult {
  passed: boolean;
  findings: Finding[];
}

export class SensitiveDataCheck {
  name = 'sensitive-data';
  severity: SecuritySeverity;
  enabled: boolean;

  private patterns = {
    password: /password|passwd|secret|credential/i,
    apiKey: /api[_-]?key|apikey|access[_-]?token/i,
    creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
    jwt: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/
  };

  constructor(config: SensitiveDataConfig = {}) {
    this.severity = config.severity || 'high';
    this.enabled = config.enabled !== false;
  }

  async execute(
    _request: { method: string },
    response: { body?: unknown },
    _endpoint: string | { url?: string }
  ): Promise<CheckResult> {
    const findings: Finding[] = [];
    const bodyStr = JSON.stringify(response.body || {});

    for (const [type, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(bodyStr)) {
        findings.push({
          type,
          severity: this.severity,
          title: `Potential ${type} exposure`,
          description: `Response may contain sensitive ${type} data`,
          location: 'response.body',
          evidence: `Pattern matched: ${pattern.toString()}`
        });
      }
    }

    return { passed: findings.length === 0, findings };
  }
}

export default SensitiveDataCheck;

/**
 * Authorization Security Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface AuthorizationConfig {
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

export class AuthorizationCheck {
  name = 'authorization';
  severity: SecuritySeverity;
  enabled: boolean;

  constructor(config: AuthorizationConfig = {}) {
    this.severity = config.severity || 'high';
    this.enabled = config.enabled !== false;
  }

  async execute(
    request: { method: string; url?: string },
    response: { status?: number; body?: unknown },
    endpoint: string | { url?: string }
  ): Promise<CheckResult> {
    const findings: Finding[] = [];
    const path = typeof endpoint === 'string' ? endpoint : (endpoint.url || request.url || '');

    // Check for potential IDOR (Insecure Direct Object References)
    const hasNumericId = /\/\d+/.test(path);
    if (hasNumericId && response.status === 200) {
      findings.push({
        type: 'idor',
        severity: 'info',
        title: 'Potential IDOR endpoint detected',
        description: 'Endpoint uses numeric IDs - verify proper authorization checks',
        location: 'request.url'
      });
    }

    return { passed: findings.length === 0, findings };
  }
}

export default AuthorizationCheck;

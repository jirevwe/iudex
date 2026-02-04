/**
 * Authentication Security Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface AuthenticationConfig {
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

export class AuthenticationCheck {
  name = 'authentication';
  severity: SecuritySeverity;
  enabled: boolean;

  constructor(config: AuthenticationConfig = {}) {
    this.severity = config.severity || 'high';
    this.enabled = config.enabled !== false;
  }

  async execute(
    request: { method: string; headers?: Record<string, string> },
    response: { status?: number },
    _endpoint: string | { url?: string }
  ): Promise<CheckResult> {
    const findings: Finding[] = [];

    // Check for missing authentication on protected endpoints
    const hasAuth = request.headers?.authorization || request.headers?.['x-api-key'];

    if (!hasAuth && response.status === 200) {
      findings.push({
        type: 'missing-authentication',
        severity: 'medium',
        title: 'Endpoint accessible without authentication',
        description: 'This endpoint returned 200 without any authentication headers',
        location: 'request.headers'
      });
    }

    // Check for basic auth (weak)
    const authHeader = request.headers?.authorization || '';
    if (authHeader.toLowerCase().startsWith('basic ')) {
      findings.push({
        type: 'weak-authentication',
        severity: 'medium',
        title: 'Basic authentication detected',
        description: 'Basic authentication is less secure than token-based auth',
        location: 'request.headers.authorization'
      });
    }

    return { passed: findings.length === 0, findings };
  }
}

export default AuthenticationCheck;

/**
 * SSL/TLS Security Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface SslTlsConfig {
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

export class SslTlsCheck {
  name = 'ssl-tls';
  severity: SecuritySeverity;
  enabled: boolean;

  constructor(config: SslTlsConfig = {}) {
    this.severity = config.severity || 'critical';
    this.enabled = config.enabled !== false;
  }

  async execute(
    request: { method: string; url?: string },
    _response: unknown,
    endpoint: string | { url?: string }
  ): Promise<CheckResult> {
    const findings: Finding[] = [];
    const url = typeof endpoint === 'string' ? endpoint : (endpoint.url || request.url || '');

    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      findings.push({
        type: 'http-usage',
        severity: this.severity,
        title: 'Insecure HTTP connection',
        description: 'API should use HTTPS for secure data transmission',
        location: 'request.url'
      });
    }

    return { passed: findings.length === 0, findings };
  }
}

export default SslTlsCheck;

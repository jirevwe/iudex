/**
 * Rate Limiting Security Check
 */

import type { SecuritySeverity } from '../../types/index.js';

export interface RateLimitingConfig {
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

export class RateLimitingCheck {
  name = 'rate-limiting';
  severity: SecuritySeverity;
  enabled: boolean;

  constructor(config: RateLimitingConfig = {}) {
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

    const rateLimitHeaders = [
      'x-ratelimit-limit',
      'x-rate-limit-limit',
      'ratelimit-limit',
      'x-ratelimit-remaining'
    ];

    const hasRateLimiting = rateLimitHeaders.some(h =>
      Object.keys(headers).some(k => k.toLowerCase() === h)
    );

    if (!hasRateLimiting) {
      findings.push({
        type: 'missing-rate-limiting',
        severity: this.severity,
        title: 'No rate limiting headers detected',
        description: 'API should implement rate limiting to prevent abuse',
        location: 'response.headers'
      });
    }

    return { passed: findings.length === 0, findings };
  }
}

export default RateLimitingCheck;

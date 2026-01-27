// Rate Limiting Detection Security Check
export class RateLimitingCheck {
    constructor(config = {}) {
        this.name = 'rate-limiting';
        this.enabled = config.enabled !== false;
        this.requireRateLimiting = config.requireRateLimiting !== false;
        this.publicEndpoints = config.publicEndpoints || ['/api/**'];
        this.expectedHeaders = config.expectedHeaders || ['X-RateLimit-Limit', 'X-RateLimit-Remaining'];
        this.warnOnAggressiveLimits = config.warnOnAggressiveLimits !== false;
        this.minReasonableLimit = config.minReasonableLimit || 10; // Requests per window
    }

    async execute(request, response, endpoint) {
        const findings = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = response.headers || {};
        const status = response.status;

        // Check if endpoint should have rate limiting
        const shouldHaveRateLimiting = this.isPublicEndpoint(url);

        // Detect rate limit headers
        const rateLimitHeaders = this.detectRateLimitHeaders(headers);

        // Missing rate limiting
        if (this.requireRateLimiting && shouldHaveRateLimiting && rateLimitHeaders.length === 0) {
            findings.push({
                type: 'missing-rate-limiting',
                severity: 'medium',
                title: 'Missing Rate Limiting',
                description: 'Public endpoint does not include rate limit headers',
                location: 'response.headers',
                evidence: `No rate limit headers found for ${url}`,
                cwe: 'CWE-770: Allocation of Resources Without Limits or Throttling',
                remediation: 'Implement rate limiting to prevent abuse. Include headers like X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset'
            });
        }

        // Incomplete rate limit headers
        if (rateLimitHeaders.length > 0 && rateLimitHeaders.length < this.expectedHeaders.length) {
            const missing = this.expectedHeaders.filter(h =>
                !rateLimitHeaders.some(rl => rl.name.toLowerCase() === h.toLowerCase())
            );

            findings.push({
                type: 'incomplete-rate-limit-headers',
                severity: 'low',
                title: 'Incomplete Rate Limit Headers',
                description: `Missing some rate limit headers: ${missing.join(', ')}`,
                location: 'response.headers',
                evidence: `Present: ${rateLimitHeaders.map(h => h.name).join(', ')}`,
                remediation: `Add missing rate limit headers: ${missing.join(', ')}`
            });
        }

        // Validate rate limit values
        if (rateLimitHeaders.length > 0) {
            const validationFindings = this.validateRateLimitValues(rateLimitHeaders);
            findings.push(...validationFindings);
        }

        // Check for aggressive rate limiting
        if (this.warnOnAggressiveLimits && rateLimitHeaders.length > 0) {
            const aggressiveFindings = this.checkAggressiveLimits(rateLimitHeaders);
            findings.push(...aggressiveFindings);
        }

        // Check if rate limit exceeded
        if (status === 429) {
            const retryAfter = headers['retry-after'] || headers['Retry-After'];

            if (!retryAfter) {
                findings.push({
                    type: 'missing-retry-after',
                    severity: 'low',
                    title: 'Missing Retry-After Header',
                    description: '429 status without Retry-After header',
                    location: 'response.headers',
                    evidence: 'Status 429 but no Retry-After header',
                    remediation: 'Include Retry-After header to indicate when client can retry'
                });
            }

            findings.push({
                type: 'rate-limit-exceeded',
                severity: 'info',
                title: 'Rate Limit Exceeded',
                description: 'API rate limit was exceeded during test',
                location: 'response.status',
                evidence: `Status: 429, Retry-After: ${retryAfter || 'not specified'}`,
                remediation: 'Reduce request rate or increase rate limit threshold'
            });
        }

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    /**
     * Check if endpoint should have rate limiting (public endpoint)
     */
    isPublicEndpoint(url) {
        for (const pattern of this.publicEndpoints) {
            if (pattern.includes('**')) {
                // Match any sub-path
                const prefix = pattern.replace('**', '');
                if (url.startsWith(prefix)) {
                    return true;
                }
            } else if (pattern.includes('*')) {
                // Wildcard matching
                const regex = new RegExp('^' + pattern.replace(/\*/g, '[^/]*') + '$');
                if (regex.test(url)) {
                    return true;
                }
            } else {
                // Exact match
                if (url.includes(pattern)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detect rate limit headers
     */
    detectRateLimitHeaders(headers) {
        const rateLimitHeaders = [];

        // Common rate limit header patterns
        const patterns = [
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
            'x-ratelimit-reset',
            'x-rate-limit-limit',
            'x-rate-limit-remaining',
            'x-rate-limit-reset',
            'ratelimit-limit',
            'ratelimit-remaining',
            'ratelimit-reset',
            'retry-after'
        ];

        for (const [key, value] of Object.entries(headers)) {
            const keyLower = key.toLowerCase();
            if (patterns.some(pattern => keyLower.includes(pattern))) {
                rateLimitHeaders.push({ name: key, value });
            }
        }

        return rateLimitHeaders;
    }

    /**
     * Validate rate limit values
     */
    validateRateLimitValues(rateLimitHeaders) {
        const findings = [];

        for (const header of rateLimitHeaders) {
            const value = header.value;
            const nameLower = header.name.toLowerCase();

            // Check for numeric values
            if (nameLower.includes('limit') || nameLower.includes('remaining')) {
                const numValue = parseInt(value, 10);

                if (isNaN(numValue)) {
                    findings.push({
                        type: 'invalid-rate-limit-value',
                        severity: 'medium',
                        title: 'Invalid Rate Limit Value',
                        description: `Rate limit header ${header.name} has non-numeric value`,
                        location: `response.headers.${header.name}`,
                        evidence: `Value: ${value}`,
                        remediation: 'Ensure rate limit headers contain valid numeric values'
                    });
                } else if (numValue < 0) {
                    findings.push({
                        type: 'invalid-rate-limit-value',
                        severity: 'medium',
                        title: 'Negative Rate Limit Value',
                        description: `Rate limit header ${header.name} has negative value`,
                        location: `response.headers.${header.name}`,
                        evidence: `Value: ${numValue}`,
                        remediation: 'Rate limit values should be non-negative'
                    });
                }
            }

            // Check reset timestamp
            if (nameLower.includes('reset')) {
                const numValue = parseInt(value, 10);

                if (isNaN(numValue)) {
                    findings.push({
                        type: 'invalid-rate-limit-value',
                        severity: 'low',
                        title: 'Invalid Reset Timestamp',
                        description: `Rate limit reset header ${header.name} has non-numeric value`,
                        location: `response.headers.${header.name}`,
                        evidence: `Value: ${value}`,
                        remediation: 'Use Unix timestamp (seconds since epoch) for reset time'
                    });
                }
            }
        }

        return findings;
    }

    /**
     * Check for aggressive rate limits
     */
    checkAggressiveLimits(rateLimitHeaders) {
        const findings = [];

        // Find limit header
        const limitHeader = rateLimitHeaders.find(h =>
            h.name.toLowerCase().includes('limit') && !h.name.toLowerCase().includes('remaining')
        );

        if (limitHeader) {
            const limit = parseInt(limitHeader.value, 10);

            if (!isNaN(limit) && limit < this.minReasonableLimit) {
                findings.push({
                    type: 'aggressive-rate-limiting',
                    severity: 'info',
                    title: 'Very Low Rate Limit',
                    description: `Rate limit of ${limit} is very restrictive`,
                    location: `response.headers.${limitHeader.name}`,
                    evidence: `Limit: ${limit} (minimum recommended: ${this.minReasonableLimit})`,
                    remediation: 'Consider increasing rate limit to balance security and usability'
                });
            }
        }

        // Check remaining vs limit
        const remainingHeader = rateLimitHeaders.find(h => h.name.toLowerCase().includes('remaining'));
        const limitValue = limitHeader ? parseInt(limitHeader.value, 10) : null;
        const remainingValue = remainingHeader ? parseInt(remainingHeader.value, 10) : null;

        if (limitValue && remainingValue !== null && remainingValue > limitValue) {
            findings.push({
                type: 'invalid-rate-limit-value',
                severity: 'medium',
                title: 'Remaining Exceeds Limit',
                description: 'Rate limit remaining value exceeds limit',
                location: 'response.headers',
                evidence: `Limit: ${limitValue}, Remaining: ${remainingValue}`,
                remediation: 'Ensure remaining value does not exceed limit'
            });
        }

        return findings;
    }

    /**
     * Create summary statistics
     */
    createSummary(findings) {
        return {
            total: findings.length,
            bySeverity: {
                critical: findings.filter(f => f.severity === 'critical').length,
                high: findings.filter(f => f.severity === 'high').length,
                medium: findings.filter(f => f.severity === 'medium').length,
                low: findings.filter(f => f.severity === 'low').length
            }
        };
    }
}

export default RateLimitingCheck;

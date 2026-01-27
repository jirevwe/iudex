// Security Headers Security Check
export class HeadersCheck {
    constructor(config = {}) {
        this.name = 'headers';
        this.enabled = config.enabled !== false;
        this.requiredHeaders = config.requiredHeaders || [
            'Strict-Transport-Security',
            'X-Content-Type-Options',
            'X-Frame-Options'
        ];
        this.recommendedHeaders = config.recommendedHeaders || [
            'Content-Security-Policy',
            'Referrer-Policy',
            'Permissions-Policy'
        ];
        this.validateCORS = config.validateCORS !== false;
        this.allowMissingHeaders = config.allowMissingHeaders || false;
    }

    async execute(request, response, endpoint) {
        const findings = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = response.headers || {};

        // Check required security headers
        const requiredFindings = this.checkRequiredHeaders(headers, url);
        findings.push(...requiredFindings);

        // Check recommended security headers
        const recommendedFindings = this.checkRecommendedHeaders(headers);
        findings.push(...recommendedFindings);

        // Validate specific headers
        const validationFindings = this.validateSecurityHeaders(headers, url);
        findings.push(...validationFindings);

        // Check CORS configuration
        if (this.validateCORS) {
            const corsFindings = this.checkCORS(headers);
            findings.push(...corsFindings);
        }

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    /**
     * Check required security headers
     */
    checkRequiredHeaders(headers, url) {
        const findings = [];
        const isHttps = url.startsWith('https://');

        for (const headerName of this.requiredHeaders) {
            const headerValue = this.getHeader(headers, headerName);

            if (!headerValue) {
                // Special case: HSTS only required for HTTPS
                if (headerName === 'Strict-Transport-Security' && !isHttps) {
                    continue;
                }

                const severity = this.allowMissingHeaders ? 'low' : 'medium';

                findings.push({
                    type: 'missing-security-header',
                    severity,
                    title: `Missing ${headerName} Header`,
                    description: `Required security header ${headerName} is not present`,
                    location: 'response.headers',
                    evidence: `Header not found: ${headerName}`,
                    cwe: 'CWE-693: Protection Mechanism Failure',
                    remediation: this.getHeaderRemediation(headerName)
                });
            }
        }

        return findings;
    }

    /**
     * Check recommended security headers
     */
    checkRecommendedHeaders(headers) {
        const findings = [];

        for (const headerName of this.recommendedHeaders) {
            const headerValue = this.getHeader(headers, headerName);

            if (!headerValue) {
                findings.push({
                    type: 'missing-recommended-header',
                    severity: 'info',
                    title: `Missing ${headerName} Header`,
                    description: `Recommended security header ${headerName} is not present`,
                    location: 'response.headers',
                    evidence: `Header not found: ${headerName}`,
                    remediation: this.getHeaderRemediation(headerName)
                });
            }
        }

        return findings;
    }

    /**
     * Validate specific security headers
     */
    validateSecurityHeaders(headers, url) {
        const findings = [];

        // Validate HSTS
        const hsts = this.getHeader(headers, 'Strict-Transport-Security');
        if (hsts) {
            const hstsFindings = this.validateHSTS(hsts, url);
            findings.push(...hstsFindings);
        }

        // Validate X-Content-Type-Options
        const contentType = this.getHeader(headers, 'X-Content-Type-Options');
        if (contentType && contentType.toLowerCase() !== 'nosniff') {
            findings.push({
                type: 'misconfigured-header',
                severity: 'low',
                title: 'Incorrect X-Content-Type-Options Value',
                description: 'X-Content-Type-Options should be set to "nosniff"',
                location: 'response.headers.X-Content-Type-Options',
                evidence: `Current value: ${contentType}`,
                remediation: 'Set X-Content-Type-Options: nosniff'
            });
        }

        // Validate X-Frame-Options
        const frameOptions = this.getHeader(headers, 'X-Frame-Options');
        if (frameOptions) {
            const validValues = ['DENY', 'SAMEORIGIN'];
            if (!validValues.includes(frameOptions.toUpperCase())) {
                findings.push({
                    type: 'misconfigured-header',
                    severity: 'medium',
                    title: 'Incorrect X-Frame-Options Value',
                    description: 'X-Frame-Options should be DENY or SAMEORIGIN',
                    location: 'response.headers.X-Frame-Options',
                    evidence: `Current value: ${frameOptions}`,
                    remediation: 'Set X-Frame-Options to DENY or SAMEORIGIN to prevent clickjacking'
                });
            }
        }

        // Validate CSP
        const csp = this.getHeader(headers, 'Content-Security-Policy');
        if (csp) {
            const cspFindings = this.validateCSP(csp);
            findings.push(...cspFindings);
        }

        return findings;
    }

    /**
     * Validate HSTS header
     */
    validateHSTS(hsts, url) {
        const findings = [];

        // Only check if HTTPS
        if (!url.startsWith('https://')) {
            return findings;
        }

        // Check max-age
        const maxAgeMatch = hsts.match(/max-age=(\d+)/);
        if (!maxAgeMatch) {
            findings.push({
                type: 'misconfigured-header',
                severity: 'medium',
                title: 'HSTS Missing max-age',
                description: 'Strict-Transport-Security header missing max-age directive',
                location: 'response.headers.Strict-Transport-Security',
                evidence: hsts,
                remediation: 'Add max-age directive: Strict-Transport-Security: max-age=31536000'
            });
        } else {
            const maxAge = parseInt(maxAgeMatch[1], 10);
            const oneYear = 31536000; // seconds

            if (maxAge < oneYear) {
                findings.push({
                    type: 'misconfigured-header',
                    severity: 'low',
                    title: 'HSTS max-age Too Short',
                    description: `HSTS max-age is ${maxAge} seconds (recommended: at least 1 year)`,
                    location: 'response.headers.Strict-Transport-Security',
                    evidence: hsts,
                    remediation: `Increase max-age to at least ${oneYear} (1 year): Strict-Transport-Security: max-age=${oneYear}; includeSubDomains`
                });
            }
        }

        // Recommend includeSubDomains
        if (!hsts.includes('includeSubDomains')) {
            findings.push({
                type: 'missing-hsts-subdomain',
                severity: 'info',
                title: 'HSTS Missing includeSubDomains',
                description: 'HSTS should include subdomains for complete protection',
                location: 'response.headers.Strict-Transport-Security',
                evidence: hsts,
                remediation: 'Add includeSubDomains: Strict-Transport-Security: max-age=31536000; includeSubDomains'
            });
        }

        return findings;
    }

    /**
     * Validate Content-Security-Policy
     */
    validateCSP(csp) {
        const findings = [];

        // Check for overly permissive CSP
        if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
            findings.push({
                type: 'weak-csp',
                severity: 'medium',
                title: 'Weak Content Security Policy',
                description: 'CSP allows unsafe-inline or unsafe-eval, reducing protection',
                location: 'response.headers.Content-Security-Policy',
                evidence: csp,
                cwe: 'CWE-1021: Improper Restriction of Rendered UI Layers',
                remediation: 'Remove unsafe-inline and unsafe-eval from CSP. Use nonces or hashes for inline scripts.'
            });
        }

        // Check for wildcard in default-src
        if (csp.includes('default-src *') || csp.includes('default-src: *')) {
            findings.push({
                type: 'weak-csp',
                severity: 'high',
                title: 'Permissive CSP Wildcard',
                description: 'CSP default-src allows all sources (*)',
                location: 'response.headers.Content-Security-Policy',
                evidence: csp,
                remediation: 'Restrict default-src to specific origins instead of wildcard'
            });
        }

        return findings;
    }

    /**
     * Check CORS configuration
     */
    checkCORS(headers) {
        const findings = [];

        const allowOrigin = this.getHeader(headers, 'Access-Control-Allow-Origin');
        const allowCredentials = this.getHeader(headers, 'Access-Control-Allow-Credentials');

        if (!allowOrigin) {
            // No CORS headers - this is fine for same-origin APIs
            return findings;
        }

        // Check for permissive CORS
        if (allowOrigin === '*') {
            const severity = allowCredentials === 'true' ? 'critical' : 'medium';

            findings.push({
                type: 'permissive-cors',
                severity,
                title: 'Permissive CORS Policy',
                description: 'CORS allows all origins (*)',
                location: 'response.headers.Access-Control-Allow-Origin',
                evidence: `Access-Control-Allow-Origin: ${allowOrigin}`,
                cwe: 'CWE-942: Overly Permissive Cross-domain Whitelist',
                remediation: 'Restrict CORS to specific trusted origins instead of wildcard (*)'
            });

            // Wildcard with credentials is especially dangerous
            if (allowCredentials === 'true') {
                findings.push({
                    type: 'cors-misconfiguration',
                    severity: 'critical',
                    title: 'CORS Wildcard with Credentials',
                    description: 'CORS allows credentials with wildcard origin (invalid and dangerous)',
                    location: 'response.headers',
                    evidence: `Access-Control-Allow-Origin: *, Access-Control-Allow-Credentials: true`,
                    cwe: 'CWE-942: Overly Permissive Cross-domain Whitelist',
                    remediation: 'Either remove wildcard or disable credentials. Browsers will reject this combination.'
                });
            }
        }

        // Check for multiple origins in single header (incorrect)
        if (allowOrigin && allowOrigin.includes(',')) {
            findings.push({
                type: 'cors-misconfiguration',
                severity: 'high',
                title: 'Multiple Origins in CORS Header',
                description: 'Access-Control-Allow-Origin contains multiple origins (invalid)',
                location: 'response.headers.Access-Control-Allow-Origin',
                evidence: allowOrigin,
                remediation: 'Return single origin based on request Origin header, not multiple comma-separated origins'
            });
        }

        return findings;
    }

    /**
     * Get header value (case-insensitive)
     */
    getHeader(headers, headerName) {
        if (!headers) return null;

        // Direct match
        if (headers[headerName]) {
            return headers[headerName];
        }

        // Case-insensitive match
        const lowerName = headerName.toLowerCase();
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }

        return null;
    }

    /**
     * Get remediation guidance for specific header
     */
    getHeaderRemediation(headerName) {
        const remediation = {
            'Strict-Transport-Security': 'Add HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
            'X-Content-Type-Options': 'Add header: X-Content-Type-Options: nosniff',
            'X-Frame-Options': 'Add header: X-Frame-Options: DENY or SAMEORIGIN',
            'Content-Security-Policy': 'Add CSP header: Content-Security-Policy: default-src \'self\'',
            'Referrer-Policy': 'Add header: Referrer-Policy: strict-origin-when-cross-origin',
            'Permissions-Policy': 'Add header: Permissions-Policy: geolocation=(), camera=(), microphone=()'
        };

        return remediation[headerName] || `Add ${headerName} header for improved security`;
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

export default HeadersCheck;

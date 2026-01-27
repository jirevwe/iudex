// SSL/TLS Validation Security Check
export class SslTlsCheck {
    constructor(config = {}) {
        this.name = 'ssl-tls';
        this.enabled = config.enabled !== false;
        this.requireHTTPS = config.requireHTTPS !== false;
        this.minTLSVersion = config.minTLSVersion || '1.2';
        this.requireSecureCookies = config.requireSecureCookies !== false;
        this.allowLocalhost = config.allowLocalhost !== false;
    }

    async execute(request, response, endpoint) {
        const findings = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = response.headers || {};

        // Check protocol (HTTP vs HTTPS)
        if (this.requireHTTPS) {
            const protocolFindings = this.checkProtocol(url);
            findings.push(...protocolFindings);
        }

        // Check for secure cookie flags
        if (this.requireSecureCookies) {
            const cookieFindings = this.checkSecureCookies(headers, url);
            findings.push(...cookieFindings);
        }

        // Check for mixed content (HTTPS loading HTTP resources)
        const mixedContentFindings = this.checkMixedContent(url, response.body);
        findings.push(...mixedContentFindings);

        // Note: TLS version checking requires low-level socket access
        // This is difficult to implement in a high-level HTTP client
        // We can only detect it if the server sends TLS version in headers (rare)

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    /**
     * Check protocol (HTTP vs HTTPS)
     */
    checkProtocol(url) {
        const findings = [];

        // Check if URL uses HTTP
        if (url.startsWith('http://')) {
            // Allow localhost/127.0.0.1 if configured
            if (this.allowLocalhost && (url.includes('localhost') || url.includes('127.0.0.1'))) {
                return findings;
            }

            findings.push({
                type: 'http-usage',
                severity: 'critical',
                title: 'Unencrypted HTTP Connection',
                description: 'API endpoint uses HTTP instead of HTTPS',
                location: 'request.url',
                evidence: `URL: ${url}`,
                cwe: 'CWE-319: Cleartext Transmission of Sensitive Information',
                remediation: 'Use HTTPS for all API endpoints to encrypt data in transit. HTTP transmits data in plaintext, exposing it to interception.'
            });
        }

        return findings;
    }

    /**
     * Check for secure cookie flags
     */
    checkSecureCookies(headers, url) {
        const findings = [];

        // Get Set-Cookie headers
        const setCookieHeaders = this.getSetCookieHeaders(headers);

        if (setCookieHeaders.length === 0) {
            // No cookies set, nothing to check
            return findings;
        }

        const isHttps = url.startsWith('https://');

        for (const cookieHeader of setCookieHeaders) {
            const cookie = this.parseCookie(cookieHeader);

            // Check Secure flag
            if (isHttps && !cookie.secure) {
                findings.push({
                    type: 'insecure-cookies',
                    severity: 'high',
                    title: 'Cookie Missing Secure Flag',
                    description: 'Cookie set without Secure flag on HTTPS endpoint',
                    location: 'response.headers.Set-Cookie',
                    evidence: `Cookie: ${cookie.name}`,
                    cwe: 'CWE-614: Sensitive Cookie Without Secure Attribute',
                    remediation: 'Add Secure flag to cookies: Set-Cookie: name=value; Secure. This prevents cookies from being sent over HTTP.'
                });
            }

            // Check HttpOnly flag (for session cookies)
            if (!cookie.httpOnly && this.isSessionCookie(cookie.name)) {
                findings.push({
                    type: 'insecure-cookies',
                    severity: 'high',
                    title: 'Cookie Missing HttpOnly Flag',
                    description: 'Session cookie set without HttpOnly flag',
                    location: 'response.headers.Set-Cookie',
                    evidence: `Cookie: ${cookie.name}`,
                    cwe: 'CWE-1004: Sensitive Cookie Without HttpOnly Flag',
                    remediation: 'Add HttpOnly flag to session cookies: Set-Cookie: name=value; HttpOnly. This prevents JavaScript access to cookies.'
                });
            }

            // Check SameSite flag
            if (!cookie.sameSite) {
                findings.push({
                    type: 'insecure-cookies',
                    severity: 'medium',
                    title: 'Cookie Missing SameSite Flag',
                    description: 'Cookie set without SameSite attribute',
                    location: 'response.headers.Set-Cookie',
                    evidence: `Cookie: ${cookie.name}`,
                    cwe: 'CWE-352: Cross-Site Request Forgery (CSRF)',
                    remediation: 'Add SameSite flag to cookies: Set-Cookie: name=value; SameSite=Strict or Lax. This prevents CSRF attacks.'
                });
            }
        }

        return findings;
    }

    /**
     * Check for mixed content (HTTPS loading HTTP resources)
     */
    checkMixedContent(url, body) {
        const findings = [];

        // Only check if main URL is HTTPS
        if (!url.startsWith('https://')) {
            return findings;
        }

        // Check response body for HTTP URLs
        if (body && typeof body === 'object') {
            const bodyStr = JSON.stringify(body);
            const httpMatches = bodyStr.match(/http:\/\/[^\s"']+/g);

            if (httpMatches && httpMatches.length > 0) {
                // Filter out localhost
                const externalHttp = httpMatches.filter(m =>
                    !m.includes('localhost') && !m.includes('127.0.0.1')
                );

                if (externalHttp.length > 0) {
                    findings.push({
                        type: 'mixed-content',
                        severity: 'medium',
                        title: 'Mixed Content Detected',
                        description: 'HTTPS response contains HTTP URLs',
                        location: 'response.body',
                        evidence: `Found ${externalHttp.length} HTTP URLs in response`,
                        cwe: 'CWE-311: Missing Encryption of Sensitive Data',
                        remediation: 'Use HTTPS URLs for all resources. Mixed content (HTTP on HTTPS page) is blocked by modern browsers.'
                    });
                }
            }
        }

        return findings;
    }

    /**
     * Get Set-Cookie headers (may be array or single value)
     */
    getSetCookieHeaders(headers) {
        const setCookie = headers['set-cookie'] || headers['Set-Cookie'];

        if (!setCookie) {
            return [];
        }

        return Array.isArray(setCookie) ? setCookie : [setCookie];
    }

    /**
     * Parse cookie string to extract flags
     */
    parseCookie(cookieHeader) {
        const parts = cookieHeader.split(';').map(p => p.trim());
        const nameValue = parts[0].split('=');

        return {
            name: nameValue[0],
            value: nameValue[1],
            secure: parts.some(p => p.toLowerCase() === 'secure'),
            httpOnly: parts.some(p => p.toLowerCase() === 'httponly'),
            sameSite: parts.find(p => p.toLowerCase().startsWith('samesite'))?.split('=')[1]
        };
    }

    /**
     * Check if cookie name suggests it's a session cookie
     */
    isSessionCookie(name) {
        const sessionNames = [
            'session', 'sessid', 'sid', 'jsessionid', 'phpsessid',
            'asp.net_sessionid', 'auth', 'token', 'jwt', 'access_token'
        ];

        const nameLower = name.toLowerCase();
        return sessionNames.some(s => nameLower.includes(s));
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

export default SslTlsCheck;

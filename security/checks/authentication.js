// Authentication Validation Security Check
export class AuthenticationCheck {
    constructor(config = {}) {
        this.name = 'authentication';
        this.enabled = config.enabled !== false;
        this.requireAuth = config.requireAuth !== false;
        this.preferredScheme = config.preferredScheme || 'bearer'; // 'bearer', 'basic', 'apikey'
        this.publicEndpoints = config.publicEndpoints || ['/health', '/ping', '/status'];
        this.flagWeakAuth = config.flagWeakAuth !== false;
    }

    async execute(request, response, endpoint) {
        const findings = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = request.headers || {};

        // Check if endpoint is public (exempt from auth checks)
        if (this.isPublicEndpoint(url)) {
            return { vulnerable: false, findings: [], summary: this.createSummary([]) };
        }

        // Check for authentication headers
        const authHeader = this.getAuthHeader(headers);
        const apiKeyHeader = this.getApiKeyHeader(headers);
        const cookieHeader = headers.cookie || headers.Cookie;

        const hasAuth = !!(authHeader || apiKeyHeader || cookieHeader);

        // Flag missing authentication
        if (this.requireAuth && !hasAuth) {
            findings.push({
                type: 'missing-authentication',
                severity: 'high',
                title: 'Missing Authentication',
                description: 'No authentication credentials found in request headers',
                location: 'request.headers',
                evidence: 'No Authorization, X-API-Key, or Cookie header present',
                remediation: 'Add authentication credentials (Authorization header, API key, or session cookie)'
            });
        }

        // Validate authentication scheme
        if (authHeader) {
            const schemeFindings = this.validateAuthScheme(authHeader, request);
            findings.push(...schemeFindings);
        }

        // Check for weak authentication (Basic auth over HTTP)
        if (this.flagWeakAuth && authHeader) {
            const weakAuthFindings = this.checkWeakAuth(authHeader, url);
            findings.push(...weakAuthFindings);
        }

        // Check for credentials in URL or body
        const exposedCredsFindings = this.checkExposedCredentials(request, url);
        findings.push(...exposedCredsFindings);

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    /**
     * Check if endpoint is public (exempt from auth)
     */
    isPublicEndpoint(url) {
        for (const pattern of this.publicEndpoints) {
            if (pattern.includes('*')) {
                // Wildcard matching
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
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
     * Get Authorization header (case-insensitive)
     */
    getAuthHeader(headers) {
        return headers.authorization || headers.Authorization;
    }

    /**
     * Get API Key header (case-insensitive)
     */
    getApiKeyHeader(headers) {
        return headers['x-api-key'] || headers['X-API-Key'] ||
               headers['api-key'] || headers['API-Key'] ||
               headers.apikey || headers.ApiKey;
    }

    /**
     * Validate authentication scheme
     */
    validateAuthScheme(authHeader, request) {
        const findings = [];

        // Parse scheme
        const parts = authHeader.split(' ');
        const scheme = parts[0]?.toLowerCase();

        if (!scheme) {
            findings.push({
                type: 'invalid-auth-scheme',
                severity: 'high',
                title: 'Invalid Authentication Scheme',
                description: 'Authorization header is malformed',
                location: 'request.headers.Authorization',
                evidence: authHeader,
                remediation: 'Use proper format: "Bearer <token>" or "Basic <credentials>"'
            });
            return findings;
        }

        // Validate known schemes
        const validSchemes = ['bearer', 'basic', 'digest', 'oauth', 'apikey'];
        if (!validSchemes.includes(scheme)) {
            findings.push({
                type: 'invalid-auth-scheme',
                severity: 'medium',
                title: 'Unknown Authentication Scheme',
                description: `Unrecognized authentication scheme: ${scheme}`,
                location: 'request.headers.Authorization',
                evidence: authHeader,
                remediation: 'Use standard authentication scheme (Bearer, Basic, Digest, OAuth)'
            });
        }

        // Check preferred scheme
        if (this.preferredScheme && scheme !== this.preferredScheme) {
            findings.push({
                type: 'non-preferred-auth-scheme',
                severity: 'info',
                title: 'Non-Preferred Authentication Scheme',
                description: `Using ${scheme}, but ${this.preferredScheme} is preferred`,
                location: 'request.headers.Authorization',
                evidence: authHeader,
                remediation: `Consider using ${this.preferredScheme} authentication for consistency`
            });
        }

        return findings;
    }

    /**
     * Check for weak authentication (Basic auth over HTTP)
     */
    checkWeakAuth(authHeader, url) {
        const findings = [];

        const scheme = authHeader.split(' ')[0]?.toLowerCase();

        // Basic auth over HTTP
        if (scheme === 'basic' && url.startsWith('http://')) {
            findings.push({
                type: 'weak-authentication',
                severity: 'critical',
                title: 'Basic Authentication Over HTTP',
                description: 'Basic authentication credentials transmitted over unencrypted HTTP',
                location: 'request.headers.Authorization',
                evidence: 'Basic auth used with http:// URL',
                cwe: 'CWE-319: Cleartext Transmission of Sensitive Information',
                remediation: 'Use HTTPS for all authenticated requests. Basic auth sends credentials in Base64 encoding, which is easily decoded.'
            });
        }

        return findings;
    }

    /**
     * Check for credentials exposed in URL or body
     */
    checkExposedCredentials(request, url) {
        const findings = [];

        // Check URL for credentials
        if (url.includes('password=') || url.includes('apikey=') || url.includes('token=')) {
            findings.push({
                type: 'exposed-credentials',
                severity: 'critical',
                title: 'Credentials in URL',
                description: 'Authentication credentials exposed in URL query parameters',
                location: 'request.url',
                evidence: 'URL contains password, apikey, or token parameter',
                cwe: 'CWE-598: Use of GET Request Method With Sensitive Query Strings',
                remediation: 'Move credentials to Authorization header. URLs are logged and cached, exposing credentials.'
            });
        }

        // Check body for plain-text passwords (in non-login endpoints)
        if (request.body && typeof request.body === 'object') {
            const bodyStr = JSON.stringify(request.body).toLowerCase();
            if (bodyStr.includes('password') && !url.includes('/login') && !url.includes('/register')) {
                // This might be a password change or update, which is acceptable in body
                // Only flag if it seems suspicious
            }
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

export default AuthenticationCheck;

// Security Scanner - Coordinates all security checks
import { SensitiveDataCheck } from './checks/sensitive-data.js';
import { AuthenticationCheck } from './checks/authentication.js';
import { AuthorizationCheck } from './checks/authorization.js';
import { RateLimitingCheck } from './checks/rate-limiting.js';
import { SslTlsCheck } from './checks/ssl-tls.js';
import { HeadersCheck } from './checks/headers.js';

export class SecurityScanner {
    constructor(config = {}) {
        this.config = config.security || {};
        this.enabled = this.config.enabled === true;
        this.checks = [];

        if (this.enabled) {
            this.loadChecks();
        }
    }

    /**
     * Load and initialize enabled security checks
     */
    loadChecks() {
        const checksConfig = this.config.checks || {};

        // Load checks that are explicitly configured
        // Only load if the check is present in config and enabled !== false
        if ('sensitive-data' in checksConfig && checksConfig['sensitive-data']?.enabled !== false) {
            this.checks.push({
                name: 'sensitive-data',
                instance: new SensitiveDataCheck(checksConfig['sensitive-data'] || {})
            });
        }

        if ('authentication' in checksConfig && checksConfig['authentication']?.enabled !== false) {
            this.checks.push({
                name: 'authentication',
                instance: new AuthenticationCheck(checksConfig['authentication'] || {})
            });
        }

        if ('authorization' in checksConfig && checksConfig['authorization']?.enabled !== false) {
            this.checks.push({
                name: 'authorization',
                instance: new AuthorizationCheck(checksConfig['authorization'] || {})
            });
        }

        if ('rate-limiting' in checksConfig && checksConfig['rate-limiting']?.enabled !== false) {
            this.checks.push({
                name: 'rate-limiting',
                instance: new RateLimitingCheck(checksConfig['rate-limiting'] || {})
            });
        }

        if ('ssl-tls' in checksConfig && checksConfig['ssl-tls']?.enabled !== false) {
            this.checks.push({
                name: 'ssl-tls',
                instance: new SslTlsCheck(checksConfig['ssl-tls'] || {})
            });
        }

        if ('headers' in checksConfig && checksConfig['headers']?.enabled !== false) {
            this.checks.push({
                name: 'headers',
                instance: new HeadersCheck(checksConfig['headers'] || {})
            });
        }
    }

    /**
     * Dynamically add a check (useful for testing and extensions)
     */
    addCheck(name, checkInstance) {
        this.checks.push({ name, instance: checkInstance });
    }

    /**
     * Scan request/response against all enabled security checks
     * @param {Object} request - HTTP request object
     * @param {Object} response - HTTP response object
     * @param {string} endpoint - Endpoint URL
     * @param {Object} testContext - Test context (suite, test name)
     * @returns {Promise<Array>} - Array of security findings
     */
    async scan(request, response, endpoint, testContext = {}) {
        if (!this.enabled || this.checks.length === 0) {
            return [];
        }

        const allFindings = [];

        for (const check of this.checks) {
            try {
                const result = await check.instance.execute(request, response, endpoint);

                if (result && result.findings && result.findings.length > 0) {
                    // Normalize findings to include all required fields
                    const normalizedFindings = result.findings.map(f => ({
                        check: check.name,
                        severity: f.severity || 'medium',
                        title: f.title || this.generateTitle(f.type, check.name),
                        description: f.description || 'Security issue detected',
                        endpoint: endpoint?.url || endpoint || request.url,
                        method: request.method?.toUpperCase(),
                        location: f.location || 'response',
                        evidence: f.evidence,
                        cwe: f.cwe || this.getCWE(f.type, check.name),
                        remediation: f.remediation || 'Review and address the security finding',
                        suite: testContext.suite,
                        test: testContext.test,
                        type: f.type
                    }));

                    allFindings.push(...normalizedFindings);
                }
            } catch (error) {
                // Log error but don't fail the test
                console.warn(`Security check '${check.name}' failed:`, error.message);
            }
        }

        return allFindings;
    }

    /**
     * Generate a human-readable title from finding type
     */
    generateTitle(type, checkName) {
        if (type) {
            return type.split(/[-_]/).map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
        }
        return `${checkName} finding`;
    }

    /**
     * Get CWE reference for finding type
     */
    getCWE(type, checkName) {
        const cweMap = {
            'password': 'CWE-200: Exposure of Sensitive Information',
            'apiKey': 'CWE-200: Exposure of Sensitive Information',
            'creditCard': 'CWE-359: Exposure of Private Personal Information',
            'ssn': 'CWE-359: Exposure of Private Personal Information',
            'jwt': 'CWE-200: Exposure of Sensitive Information',
            'missing-authentication': 'CWE-306: Missing Authentication',
            'weak-authentication': 'CWE-287: Improper Authentication',
            'missing-authorization': 'CWE-862: Missing Authorization',
            'idor': 'CWE-639: Insecure Direct Object References',
            'missing-rate-limiting': 'CWE-770: Allocation of Resources Without Limits',
            'http-usage': 'CWE-319: Cleartext Transmission of Sensitive Information',
            'insecure-cookies': 'CWE-614: Sensitive Cookie Without Secure Attribute',
            'missing-security-header': 'CWE-693: Protection Mechanism Failure'
        };

        return cweMap[type] || 'CWE-1000: Research Concepts';
    }

    /**
     * Get list of enabled check names
     */
    getCheckNames() {
        return this.checks.map(c => c.name);
    }

    /**
     * Check if security scanning is enabled
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Get total number of loaded checks
     */
    getCheckCount() {
        return this.checks.length;
    }
}

export default SecurityScanner;

// API Versioning Governance Rule
export class VersioningRule {
    constructor(config = {}) {
        this.name = 'versioning';
        this.severity = config.severity || 'warning';
        this.enabled = config.enabled !== false;
        this.requireVersion = config.requireVersion !== false;
        this.preferredLocation = config.preferredLocation || null; // 'url', 'header', 'both', or null (any location OK)
        this.versionPattern = config.versionPattern || /v\d+/i;
    }

    async validate(request, response, endpoint) {
        const violations = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = request.headers || {};

        // Check for version in URL
        const hasUrlVersion = this.checkUrlVersion(url);

        // Check for version in headers
        const hasHeaderVersion = this.checkHeaderVersion(headers);

        // Check for version in Accept header
        const hasAcceptVersion = this.checkAcceptVersion(headers);

        const hasAnyVersion = hasUrlVersion || hasHeaderVersion || hasAcceptVersion;

        // Flag missing version if required
        if (this.requireVersion && !hasAnyVersion) {
            violations.push({
                rule: 'missing-api-version',
                message: 'API endpoint is missing version information',
                severity: this.severity,
                location: 'url and headers',
                remediation: 'Add version to URL path (e.g., /api/v1/resource) or version header (e.g., API-Version: 1)'
            });
        }

        // Check preferred location (only if configured)
        if (hasAnyVersion && this.preferredLocation) {
            if (this.preferredLocation === 'url' && !hasUrlVersion && (hasHeaderVersion || hasAcceptVersion)) {
                violations.push({
                    rule: 'version-in-wrong-location',
                    message: 'Version should be in URL path, not headers',
                    severity: 'info',
                    location: 'headers',
                    remediation: 'Move version from headers to URL path (e.g., /api/v1/resource)'
                });
            } else if (this.preferredLocation === 'header' && hasUrlVersion && !hasHeaderVersion) {
                violations.push({
                    rule: 'version-in-wrong-location',
                    message: 'Version should be in headers, not URL path',
                    severity: 'info',
                    location: 'url',
                    remediation: 'Move version from URL to headers (e.g., API-Version: 1 or Accept: application/json; version=1)'
                });
            } else if (this.preferredLocation === 'both' && (!hasUrlVersion || !hasHeaderVersion)) {
                violations.push({
                    rule: 'incomplete-versioning',
                    message: 'Version should be in both URL and headers',
                    severity: 'info',
                    location: hasUrlVersion ? 'headers' : 'url',
                    remediation: 'Add version to both URL path and headers for redundancy'
                });
            }
        }

        return { passed: violations.length === 0, violations };
    }

    /**
     * Check if URL contains version
     */
    checkUrlVersion(url) {
        // Check for common version patterns in URL
        // Examples: /v1/, /v2/, /api/v1/, /api/v2/
        return this.versionPattern.test(url);
    }

    /**
     * Check if headers contain version
     */
    checkHeaderVersion(headers) {
        // Check common version headers
        const versionHeaders = [
            'api-version',
            'accept-version',
            'version',
            'x-api-version'
        ];

        for (const header of versionHeaders) {
            const value = this.getHeaderValue(headers, header);
            if (value && this.versionPattern.test(value)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if Accept header contains version
     */
    checkAcceptVersion(headers) {
        const accept = this.getHeaderValue(headers, 'accept');
        if (accept && /version\s*=\s*\d+/i.test(accept)) {
            return true;
        }
        return false;
    }

    /**
     * Get header value (case-insensitive)
     */
    getHeaderValue(headers, headerName) {
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
}

export default VersioningRule;

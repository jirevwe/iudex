// Resource Naming Conventions Governance Rule
export class NamingConventionsRule {
    constructor(config = {}) {
        this.name = 'naming-conventions';
        this.severity = config.severity || 'info';
        this.enabled = config.enabled !== false;
        this.convention = config.convention || 'kebab-case'; // 'kebab-case', 'snake_case', 'camelCase'
        this.requirePlural = config.requirePlural !== false;
        this.allowAbbreviations = config.allowAbbreviations || false;
        this.customExceptions = config.customExceptions || ['api', 'auth', 'oauth', 'v1', 'v2', 'v3'];
    }

    async validate(request, response, endpoint) {
        const violations = [];
        const url = endpoint?.url || endpoint || request.url || '';

        // Parse URL segments (exclude IDs and query parameters)
        const segments = this.parseUrlSegments(url);

        // Check each segment for naming convention violations
        for (const segment of segments) {
            // Skip exceptions
            if (this.customExceptions.includes(segment.toLowerCase())) {
                continue;
            }

            // Check naming convention consistency
            const conventionViolation = this.checkConvention(segment);
            if (conventionViolation) {
                violations.push({
                    rule: 'inconsistent-naming',
                    message: `Resource '${segment}' does not follow ${this.convention} convention: ${conventionViolation}`,
                    severity: this.severity,
                    location: `url.path.${segment}`,
                    remediation: `Rename '${segment}' to follow ${this.convention} convention`
                });
            }

            // Check for plural resource names
            if (this.requirePlural && !this.isPlural(segment)) {
                violations.push({
                    rule: 'singular-resource',
                    message: `Resource '${segment}' should be plural`,
                    severity: 'info',
                    location: `url.path.${segment}`,
                    remediation: `Change '${segment}' to its plural form (e.g., '${segment}s')`
                });
            }

            // Check for abbreviations (if not allowed)
            if (!this.allowAbbreviations && this.isAbbreviation(segment)) {
                violations.push({
                    rule: 'unclear-naming',
                    message: `Resource '${segment}' appears to be an abbreviation`,
                    severity: 'info',
                    location: `url.path.${segment}`,
                    remediation: `Use full word instead of abbreviation for clarity`
                });
            }
        }

        // Check RESTful hierarchy (parent/child relationships)
        // Pass the original URL so hierarchy checker can see IDs
        const hierarchyViolations = this.checkHierarchy(url);
        violations.push(...hierarchyViolations);

        return { passed: violations.length === 0, violations };
    }

    /**
     * Parse URL into segments, excluding IDs, versions, and query params
     */
    parseUrlSegments(url) {
        // Remove query parameters
        const pathOnly = url.split('?')[0];

        // Split by '/' and filter out empty, numeric IDs, and UUIDs
        return pathOnly
            .split('/')
            .filter(s => s.length > 0)
            .filter(s => !this.isId(s));
    }

    /**
     * Check if segment is likely an ID (numeric or UUID)
     */
    isId(segment) {
        // Numeric ID
        if (/^\d+$/.test(segment)) {
            return true;
        }

        // UUID
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment)) {
            return true;
        }

        // Short hex ID
        return /^[a-f0-9]{24}$/i.test(segment);
    }

    /**
     * Check if segment follows the configured naming convention
     */
    checkConvention(segment) {
        switch (this.convention) {
            case 'kebab-case':
                // Should be lowercase with hyphens
                if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment)) {
                    return 'should be lowercase with hyphens (e.g., user-profiles)';
                }
                break;

            case 'snake_case':
                // Should be lowercase with underscores
                if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(segment)) {
                    return 'should be lowercase with underscores (e.g., user_profiles)';
                }
                break;

            case 'camelCase':
                // Should be camelCase (first letter lowercase)
                if (!/^[a-z][a-zA-Z0-9]*$/.test(segment)) {
                    return 'should be camelCase (e.g., userProfiles)';
                }
                break;

            case 'PascalCase':
                // Should be PascalCase (first letter uppercase)
                if (!/^[A-Z][a-zA-Z0-9]*$/.test(segment)) {
                    return 'should be PascalCase (e.g., UserProfiles)';
                }
                break;
        }

        return null;
    }

    /**
     * Check if segment is plural
     */
    isPlural(segment) {
        // Simple plural check (ends with 's')
        // This is basic and won't catch all cases (e.g., 'children', 'people')
        const word = segment.split(/[-_]/).pop(); // Get last word in multi-word names

        // Already ends with 's'
        if (word.endsWith('s')) {
            return true;
        }

        // Common exceptions that are valid singular resource names
        const singularExceptions = [
            'auth', 'login', 'logout', 'oauth',
            'me', 'profile', 'settings', 'config',
            'status', 'health', 'ping', 'metrics'
        ];

        return singularExceptions.includes(word.toLowerCase());
    }

    /**
     * Check if segment is an abbreviation
     */
    isAbbreviation(segment) {
        const word = segment.split(/[-_]/).pop().toLowerCase();

        // Very short (2-3 chars) and all consonants might be abbreviation
        if (word.length <= 3 && !/[aeiou]/.test(word)) {
            return true;
        }

        // Common abbreviations
        const commonAbbreviations = [
            'usr', 'pwd', 'msg', 'svc', 'cfg', 'mgr',
            'addr', 'num', 'qty', 'amt', 'desc'
        ];

        return commonAbbreviations.includes(word);
    }

    /**
     * Check RESTful hierarchy (parent/child relationships)
     */
    checkHierarchy(url) {
        const violations = [];

        // Parse URL including IDs so we can check the hierarchy pattern
        const pathOnly = url.split('?')[0];
        const allSegments = pathOnly
            .split('/')
            .filter(s => s.length > 0);

        // Check for alternating collection/resource pattern
        // Valid: /users/{id}/posts/{id}
        // Invalid: /users/posts (should be /users/{id}/posts)
        for (let i = 0; i < allSegments.length - 1; i++) {
            const current = allSegments[i];
            const next = allSegments[i + 1];

            // Skip if current or next is an exception
            if (this.customExceptions.includes(current.toLowerCase()) ||
                this.customExceptions.includes(next.toLowerCase())) {
                continue;
            }

            // Both plural (potential issue - missing ID between collections)
            // But only if there's NO ID between them
            if (this.isPlural(current) && this.isPlural(next) && !this.isId(current) && !this.isId(next)) {
                violations.push({
                    rule: 'non-restful-hierarchy',
                    message: `Invalid hierarchy: '${current}/${next}' - missing resource ID between collections`,
                    severity: 'warning',
                    location: `url.path.${current}/${next}`,
                    remediation: `Add resource ID between collections: /${current}/{id}/${next}`
                });
            }
        }

        return violations;
    }
}

export default NamingConventionsRule;

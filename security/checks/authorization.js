// Authorization Security Check
export class AuthorizationCheck {
    constructor(config = {}) {
        this.name = 'authorization';
        this.enabled = config.enabled !== false;
        this.checkIDOR = config.checkIDOR !== false;
        this.requireRoleHeader = config.requireRoleHeader || false;
        this.flagPrivilegeEscalation = config.flagPrivilegeEscalation !== false;
        this.sensitiveResources = config.sensitiveResources || ['admin', 'users', 'accounts', 'settings'];
    }

    async execute(request, response, endpoint) {
        const findings = [];
        const url = endpoint?.url || endpoint || request.url || '';
        const headers = request.headers || {};
        const method = (request.method || '').toUpperCase();

        // Check for IDOR vulnerabilities
        if (this.checkIDOR) {
            const idorFindings = this.checkIDORVulnerability(url, method, headers, response);
            findings.push(...idorFindings);
        }

        // Check for missing authorization
        const authFindings = this.checkMissingAuthorization(url, headers, method);
        findings.push(...authFindings);

        // Check for privilege escalation attempts
        if (this.flagPrivilegeEscalation) {
            const escalationFindings = this.checkPrivilegeEscalation(url, headers, method);
            findings.push(...escalationFindings);
        }

        // Check for role-based access control
        if (this.requireRoleHeader) {
            const rbacFindings = this.checkRBAC(headers);
            findings.push(...rbacFindings);
        }

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    /**
     * Check for IDOR (Insecure Direct Object Reference) vulnerabilities
     */
    checkIDORVulnerability(url, method, headers, response) {
        const findings = [];

        // Look for resource IDs in URL
        const resourceIds = this.extractResourceIds(url);

        if (resourceIds.length > 0) {
            // Check if there's proper authorization for accessing these resources
            const hasAuthz = this.hasAuthorizationHeader(headers);

            // For sensitive resources, flag if no authorization is present
            if (!hasAuthz && this.isSensitiveResource(url)) {
                findings.push({
                    type: 'potential-idor',
                    severity: 'high',
                    title: 'Potential IDOR Vulnerability',
                    description: `Resource ID in URL (${resourceIds.join(', ')}) without proper authorization checks`,
                    location: 'request.url',
                    evidence: `URL: ${url}, Resource IDs: ${resourceIds.join(', ')}`,
                    cwe: 'CWE-639: Insecure Direct Object References',
                    remediation: 'Implement authorization checks to verify user has permission to access this specific resource. Validate resource ownership before returning data.'
                });
            }

            // Check if response contains data from different user/resource
            if (response.body && response.status === 200) {
                const responseIds = this.extractIdsFromResponse(response.body);

                // If response contains IDs that don't match request, might be IDOR
                if (responseIds.length > 0 && !this.idsMatch(resourceIds, responseIds)) {
                    // This is a weak indicator, but worth flagging
                    findings.push({
                        type: 'potential-idor',
                        severity: 'medium',
                        title: 'Resource ID Mismatch',
                        description: 'Response contains different resource IDs than requested',
                        location: 'response.body',
                        evidence: `Request IDs: ${resourceIds.join(', ')}, Response IDs: ${responseIds.join(', ')}`,
                        remediation: 'Verify that authorization checks are properly implemented'
                    });
                }
            }
        }

        return findings;
    }

    /**
     * Check for missing authorization
     */
    checkMissingAuthorization(url, headers, method) {
        const findings = [];

        // Sensitive resources should have authorization
        if (this.isSensitiveResource(url)) {
            const hasAuth = this.hasAuthorizationHeader(headers);

            if (!hasAuth && method !== 'OPTIONS') {
                findings.push({
                    type: 'missing-authorization',
                    severity: 'high',
                    title: 'Missing Authorization',
                    description: 'Sensitive resource accessed without authorization header',
                    location: 'request.headers',
                    evidence: `Accessing ${url} without authorization`,
                    cwe: 'CWE-862: Missing Authorization',
                    remediation: 'Add authorization checks to verify user permissions before allowing access to sensitive resources'
                });
            }
        }

        return findings;
    }

    /**
     * Check for privilege escalation attempts
     */
    checkPrivilegeEscalation(url, headers, method) {
        const findings = [];

        // Check for admin/privileged endpoints
        const adminPatterns = ['/admin', '/superuser', '/root', '/system'];
        const isAdminEndpoint = adminPatterns.some(pattern => url.toLowerCase().includes(pattern));

        if (isAdminEndpoint) {
            // Check if there's a role header indicating privilege level (case-insensitive)
            const roleHeader = headers['x-user-role'] || headers['X-User-Role'] ||
                             headers['x-role'] || headers['X-Role'] ||
                             headers.role || headers.Role;

            if (!roleHeader || roleHeader.toLowerCase() !== 'admin') {
                findings.push({
                    type: 'privilege-escalation',
                    severity: 'critical',
                    title: 'Potential Privilege Escalation',
                    description: 'Accessing admin endpoint without proper role verification',
                    location: 'request.url',
                    evidence: `Accessing ${url} without admin role header`,
                    cwe: 'CWE-269: Improper Privilege Management',
                    remediation: 'Implement role-based access control (RBAC) and verify user role before allowing access to privileged endpoints'
                });
            }
        }

        // Check for modifying other users' resources
        const userIdInUrl = this.extractUserId(url);
        const userIdInToken = this.extractUserIdFromToken(headers);

        if (userIdInUrl && userIdInToken && userIdInUrl !== userIdInToken) {
            if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
                findings.push({
                    type: 'privilege-escalation',
                    severity: 'high',
                    title: 'Modifying Another User\'s Resource',
                    description: 'Attempting to modify resource belonging to a different user',
                    location: 'request.url',
                    evidence: `Token user ID: ${userIdInToken}, Resource user ID: ${userIdInUrl}`,
                    cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key',
                    remediation: 'Verify user ownership of resource before allowing modifications'
                });
            }
        }

        return findings;
    }

    /**
     * Check for role-based access control
     */
    checkRBAC(headers) {
        const findings = [];

        const roleHeader = headers['x-user-role'] || headers['x-role'] || headers.role;

        if (!roleHeader) {
            findings.push({
                type: 'missing-role-header',
                severity: 'medium',
                title: 'Missing Role Header',
                description: 'Request missing role header for RBAC',
                location: 'request.headers',
                evidence: 'No X-User-Role header present',
                remediation: 'Include user role in request headers (e.g., X-User-Role: user|admin)'
            });
        }

        return findings;
    }

    /**
     * Extract resource IDs from URL
     */
    extractResourceIds(url) {
        const ids = [];

        // Match numeric IDs
        const numericMatches = url.match(/\/(\d+)(?:\/|$|\?)/g);
        if (numericMatches) {
            ids.push(...numericMatches.map(m => m.replace(/\//g, '')));
        }

        // Match UUIDs
        const uuidMatches = url.match(/\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$|\?)/gi);
        if (uuidMatches) {
            ids.push(...uuidMatches.map(m => m.replace(/\//g, '')));
        }

        return ids;
    }

    /**
     * Extract IDs from response body
     */
    extractIdsFromResponse(body) {
        const ids = [];

        if (body && typeof body === 'object') {
            if (body.id) ids.push(String(body.id));
            if (body.user_id) ids.push(String(body.user_id));
            if (body.userId) ids.push(String(body.userId));
        }

        return ids;
    }

    /**
     * Check if IDs match
     */
    idsMatch(requestIds, responseIds) {
        for (const reqId of requestIds) {
            if (responseIds.includes(reqId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Extract user ID from URL
     */
    extractUserId(url) {
        const match = url.match(/\/users?\/(\d+|[a-f0-9-]+)/i);
        return match ? match[1] : null;
    }

    /**
     * Extract user ID from JWT token (very basic)
     */
    extractUserIdFromToken(headers) {
        const authHeader = headers.authorization || headers.Authorization;
        if (!authHeader) return null;

        // Very basic JWT parsing (in real implementation, use proper JWT library)
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
            try {
                const token = parts[1];
                const payload = token.split('.')[1];
                if (payload) {
                    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
                    return decoded.sub || decoded.user_id || decoded.userId;
                }
            } catch (e) {
                // Invalid token, ignore
            }
        }

        return null;
    }

    /**
     * Check if URL is for a sensitive resource
     */
    isSensitiveResource(url) {
        const urlLower = url.toLowerCase();
        return this.sensitiveResources.some(resource => urlLower.includes(resource));
    }

    /**
     * Check if authorization header is present
     */
    hasAuthorizationHeader(headers) {
        return !!(headers.authorization || headers.Authorization ||
                 headers['x-api-key'] || headers['X-API-Key']);
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

export default AuthorizationCheck;

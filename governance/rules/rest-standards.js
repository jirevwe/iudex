// REST Standards Governance Rule
export class RestStandardsRule {
    constructor(config = {}) {
        this.name = 'rest-standards';
        this.severity = config.severity || 'error';
        this.enabled = config.enabled !== false;
    }

    async validate(request, response, endpoint) {
        const violations = [];

        // Check HTTP methods
        const method = request.method.toUpperCase();
        if (method === 'POST' && response.body?.id && response.status === 200) {
            violations.push({
                rule: 'creation-status-code',
                message: 'POST for resource creation should return 201',
                severity: 'warning'
            });
        }

        // Check resource naming (plural)
        const path = endpoint.url || endpoint;
        const segments = path.split('/').filter(s => s && !s.match(/^\d+$/));
        for (const segment of segments) {
            if (!segment.endsWith('s') && !this.isException(segment)) {
                violations.push({
                    rule: 'resource-naming',
                    message: `Resource '${segment}' should be plural`,
                    severity: 'warning'
                });
            }
        }

        // Check pagination for large arrays
        if (Array.isArray(response.body) && response.body.length > 50) {
            violations.push({
                rule: 'pagination-required',
                message: 'Large collections should use pagination',
                severity: 'warning'
            });
        }

        return {passed: violations.length === 0, violations};
    }

    isException(segment) {
        const exceptions = ['api', 'v1', 'v2', 'v3', 'auth', 'login', 'logout'];
        return exceptions.includes(segment.toLowerCase());
    }
}

export default RestStandardsRule;

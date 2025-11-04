// Sensitive Data Security Check
export class SensitiveDataCheck {
    constructor(config = {}) {
        this.name = 'sensitive-data-exposure';
        this.enabled = config.enabled !== false;

        this.patterns = {
            password: {regex: /password|passwd|pwd/i, severity: 'critical'},
            apiKey: {regex: /(api[_-]?key|apikey|secret)/i, severity: 'critical'},
            creditCard: {regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, severity: 'critical'},
            ssn: {regex: /\b\d{3}-\d{2}-\d{4}\b/, severity: 'critical'},
            jwt: {regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*/, severity: 'high'}
        };
    }

    async execute(request, response, endpoint) {
        const findings = [];

        if (response.body) {
            findings.push(...this.scanObject(response.body, 'response.body'));
        }

        return {
            vulnerable: findings.length > 0,
            findings,
            summary: this.createSummary(findings)
        };
    }

    scanObject(obj, path = '') {
        const findings = [];

        if (typeof obj === 'string') {
            findings.push(...this.scanString(obj, path));
        } else if (Array.isArray(obj)) {
            obj.forEach((item, i) => {
                findings.push(...this.scanObject(item, `${path}[${i}]`));
            });
        } else if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                findings.push(...this.scanKey(key, currentPath));
                findings.push(...this.scanObject(value, currentPath));
            }
        }

        return findings;
    }

    scanKey(key, path) {
        const findings = [];
        for (const [type, pattern] of Object.entries(this.patterns)) {
            if (pattern.regex.test(key)) {
                findings.push({
                    type,
                    severity: pattern.severity,
                    location: path,
                    description: `Sensitive field name: '${key}'`,
                    remediation: 'Remove or exclude sensitive fields from response'
                });
            }
        }
        return findings;
    }

    scanString(str, path) {
        const findings = [];
        for (const [type, pattern] of Object.entries(this.patterns)) {
            if (pattern.regex.test(str)) {
                findings.push({
                    type,
                    severity: pattern.severity,
                    location: path,
                    description: `Sensitive data pattern detected`,
                    remediation: 'Mask or remove sensitive data'
                });
            }
        }
        return findings;
    }

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

export default SensitiveDataCheck;

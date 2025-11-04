// API Guardian Configuration
export default {
    // Test execution
    testMatch: ['tests/**/*.test.js', 'examples/**/*.test.js'],
    parallel: true,
    timeout: 30000,

    // HTTP client
    http: {
        baseURL: process.env.API_BASE_URL || 'https://api-dev.example.com',
        timeout: 5000,
        headers: {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'application/json'
        }
    },

    // Governance rules
    governance: {
        enabled: true,
        rules: {
            'rest-standards': {enabled: true, severity: 'error'},
            'versioning': {enabled: true, severity: 'warning'},
            'naming-conventions': {enabled: true, severity: 'info'}
        }
    },

    // Security checks
    security: {
        enabled: true,
        checks: {
            'sensitive-data': {enabled: true},
            'authentication': {enabled: true},
            'rate-limiting': {enabled: true},
            'ssl-tls': {enabled: true}
        }
    },

    // Reporters
    reporters: [
        'console',
        ['github-pages', {output: 'docs/'}],
        ['backend', {url: process.env.BACKEND_URL}]
    ],

    // Fail thresholds
    thresholds: {
        governanceViolations: {
            error: 0,
            warning: 10
        },
        securityFindings: {
            critical: 0,
            high: 0
        },
        testPassRate: 95
    }
};

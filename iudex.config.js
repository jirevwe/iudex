// Iudex Configuration
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

    // Reporters (local-first approach)
    reporters: [
        'console',  // Always show results in the terminal
        'json',     // Default: save results locally to .iudex/results/

        // Optional: PostgreSQL reporter (CI/team tracking)
        // Uncomment or set DB_ENABLED=true to enable
        ...(process.env.CI === 'true' || process.env.DB_ENABLED === 'true' ? [{
            reporter: 'postgres',
            config: {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5432,
                database: process.env.DB_NAME || 'iudex',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                ssl: process.env.DB_SSL === 'true' || false,
                poolSize: parseInt(process.env.DB_POOL_SIZE) || 10
            }
        }] : [])
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

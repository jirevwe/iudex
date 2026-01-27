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

    // Governance rules - Enforce API best practices
    governance: {
        enabled: true,
        rules: {
            // REST Standards: HTTP method validation, status codes, resource naming
            'rest-standards': {
                enabled: true,
                severity: 'error'
            },

            // API Versioning: Detect and validate API versioning
            'versioning': {
                enabled: true,
                severity: 'warning',
                requireVersion: true,           // Flag missing versions
                preferredLocation: 'url',       // 'url', 'header', 'both'
                versionPattern: /v\d+/         // Regex for version format
            },

            // Naming Conventions: Validate resource naming consistency
            'naming-conventions': {
                enabled: true,
                severity: 'info',
                convention: 'kebab-case',       // 'kebab-case', 'snake_case', 'camelCase'
                requirePlural: true,            // Enforce plural resource names
                allowAbbreviations: false       // Flag abbreviated names
            },

            // HTTP Methods: Validate HTTP method semantics and status codes
            'http-methods': {
                enabled: true,
                severity: 'error',
                enforceSemantics: true,         // Enforce HTTP method semantics
                enforceIdempotency: true,       // Flag idempotency violations
                strictStatusCodes: true         // Enforce correct status codes
            },

            // Pagination: Detect and validate pagination in large collections
            'pagination': {
                enabled: true,
                severity: 'warning',
                threshold: 100,                 // Items before pagination required
                preferredStyle: 'cursor',       // 'offset', 'cursor', 'link'
                requireMetadata: true           // Require pagination metadata
            }
        }
    },

    // Security checks - Detect vulnerabilities and misconfigurations
    security: {
        enabled: true,
        checks: {
            // Sensitive Data: Detect exposed passwords, API keys, PII
            'sensitive-data': {
                enabled: true
            },

            // Authentication: Validate authentication headers and schemes
            'authentication': {
                enabled: true,
                requireAuth: true,              // Flag missing authentication
                preferredScheme: 'bearer',      // 'bearer', 'basic', 'apikey'
                publicEndpoints: ['/health', '/ping'], // Exceptions
                flagWeakAuth: true              // Flag basic auth over HTTP
            },

            // Authorization: Check for IDOR, missing authorization, privilege escalation
            'authorization': {
                enabled: true,
                checkIDOR: true,                // Check for IDOR vulnerabilities
                requireRoleHeader: false,       // Require X-User-Role header
                flagPrivilegeEscalation: true,  // Detect privilege escalation
                sensitiveResources: ['admin', 'users', 'accounts']
            },

            // Rate Limiting: Detect rate limit headers and enforcement
            'rate-limiting': {
                enabled: true,
                requireRateLimiting: true,      // Flag missing rate limits
                publicEndpoints: ['/api/**'],   // Endpoints that need limits
                warnOnAggressiveLimits: true    // Flag very low limits
            },

            // SSL/TLS: Validate HTTPS usage and secure cookie flags
            'ssl-tls': {
                enabled: true,
                requireHTTPS: true,             // Flag HTTP usage
                minTLSVersion: '1.2',           // Minimum TLS version
                requireSecureCookies: true,     // Flag insecure cookies
                allowLocalhost: true            // Allow HTTP on localhost
            },

            // Security Headers: Validate presence of security headers
            'headers': {
                enabled: true,
                requiredHeaders: [
                    'Strict-Transport-Security',
                    'X-Content-Type-Options',
                    'X-Frame-Options'
                ],
                recommendedHeaders: [
                    'Content-Security-Policy',
                    'Referrer-Policy'
                ],
                validateCORS: true              // Check CORS configuration
            }
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

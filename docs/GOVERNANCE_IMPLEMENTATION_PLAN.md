# Governance & Security Implementation Plan

**Goal**: Implement comprehensive governance and security checking for the Iudex API testing framework

**Status**: Week 2, Days 9-13 (Governance & Security Scanner)

**Timeline**: 5 days (40 hours)

---

## Executive Summary

Implement a governance engine and security scanner that automatically validates API best practices and detects vulnerabilities during test execution. The framework already has the foundation (collector structure, reporter rendering, config schema), but needs the engines, rules, checks, and runner integration.

---

## Requirements

### 1. Governance Engine

**Purpose**: Enforce API best practices automatically

**Core Requirements**:
- Central `GovernanceEngine` class to coordinate all governance rules
- Rule-based validation system with configurable severity levels
- Support for enabling/disabling individual rules
- Integration with test execution flow
- Violation collection and reporting

**Governance Rules to Implement**:

1. **REST Standards** ✅ (Already exists - `rest-standards.js`)
   - HTTP method validation (POST → 201, PUT → 200, DELETE → 204)
   - Status code appropriateness
   - Resource naming (plural conventions)
   - Pagination detection for large collections

2. **API Versioning** (NEW - `versioning.js`)
   - Detect version in URL path (`/api/v1/`, `/v2/`)
   - Detect version in headers (`Accept: application/vnd.api+json; version=1`)
   - Flag missing versioning on public APIs
   - Enforce consistent versioning scheme across endpoints

3. **Resource Naming Conventions** (NEW - `naming-conventions.js`)
   - Enforce kebab-case, snake_case, or camelCase consistency
   - Validate plural resource names
   - Check for RESTful resource hierarchies
   - Flag non-standard naming patterns

4. **HTTP Method Standards** (NEW - `http-methods.js`)
   - Validate method semantics (GET = read-only, POST = create, PUT = replace, PATCH = partial update)
   - Check for idempotency violations (POST multiple times shouldn't be idempotent)
   - Validate safe method guarantees (GET/HEAD have no side effects)
   - Flag inappropriate method usage

5. **Pagination Standards** (NEW - `pagination.js`)
   - Detect pagination in large collections
   - Validate pagination metadata (total, limit, offset, next/prev links)
   - Check for cursor-based vs offset-based consistency
   - Flag missing pagination on endpoints returning >100 items

### 2. Security Scanner

**Purpose**: Detect security vulnerabilities and misconfigurations

**Core Requirements**:
- Central `SecurityScanner` class to coordinate all security checks
- Severity-based finding classification (critical, high, medium, low)
- Configurable check enablement
- Integration with test execution flow
- Finding collection and reporting with remediation guidance

**Security Checks to Implement**:

1. **Sensitive Data Exposure** ✅ (Already exists - `sensitive-data.js`)
   - Pattern matching for passwords, API keys, secrets, tokens
   - Credit card, SSN, PII detection
   - JWT token exposure in response bodies
   - Currently scans recursively through nested objects/arrays

2. **Authentication Validation** (NEW - `authentication.js`)
   - Detect missing authentication on protected endpoints
   - Validate authentication scheme (Bearer, Basic, API Key)
   - Check for authentication header requirements
   - Flag endpoints accepting requests without credentials

3. **Authorization Checks** (NEW - `authorization.js`)
   - Detect insufficient authorization (IDOR vulnerabilities)
   - Validate role-based access control
   - Check for privilege escalation attempts
   - Flag missing authorization headers

4. **Rate Limiting Detection** (NEW - `rate-limiting.js`)
   - Detect presence of rate limit headers (`X-RateLimit-*`, `Retry-After`)
   - Validate rate limit enforcement
   - Check for missing rate limiting on public endpoints
   - Suggest rate limit thresholds

5. **SSL/TLS Validation** (NEW - `ssl-tls.js`)
   - Enforce HTTPS usage (flag HTTP endpoints)
   - Validate TLS version (TLS 1.2+)
   - Check for secure cookie flags (`Secure`, `HttpOnly`, `SameSite`)
   - Flag insecure protocols

6. **Security Headers Check** (NEW - `headers.js`)
   - Validate presence of security headers:
     - `Strict-Transport-Security` (HSTS)
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`
     - `Content-Security-Policy`
     - `X-XSS-Protection`
   - Check CORS configuration (`Access-Control-Allow-Origin`)
   - Flag missing or misconfigured headers

### 3. Runner Integration

**Requirements**:
- Capture HTTP request/response during test execution
- Store request/response in test result objects
- Invoke governance engine after test completes
- Invoke security scanner after test completes
- Pass violations/findings to collector
- No impact on test pass/fail status (governance/security are advisory)

### 4. Threshold Enforcement

**Requirements**:
- Fail test runs based on governance violation counts
- Fail test runs based on security finding severity
- Configurable thresholds per severity level
- Exit code control (0 for pass, 1 for fail)
- Clear reporting of threshold breaches

---

## Success Criteria

### Functional Success

1. **Governance Engine Works**
   - ✅ All 5 governance rules implemented and functional
   - ✅ Rules can be enabled/disabled via config
   - ✅ Violations collected with severity, message, location
   - ✅ Rules execute without impacting test execution time significantly (<10% overhead)

2. **Security Scanner Works**
   - ✅ All 6 security checks implemented and functional
   - ✅ Checks can be enabled/disabled via config
   - ✅ Findings collected with severity, description, remediation
   - ✅ Scanner executes without impacting test execution time significantly (<10% overhead)

3. **Integration Complete**
   - ✅ HTTP client captures request/response automatically
   - ✅ Runner invokes governance/security after each test
   - ✅ Collector aggregates violations and findings
   - ✅ Console reporter displays governance/security sections
   - ✅ PostgreSQL reporter persists governance/security data

4. **Threshold Enforcement**
   - ✅ CLI fails with exit code 1 when thresholds exceeded
   - ✅ Clear messaging about which thresholds were breached
   - ✅ Configurable thresholds work as expected

### Quality Success

1. **Test Coverage**
   - ✅ Unit tests for each governance rule (5 test files)
   - ✅ Unit tests for each security check (6 test files)
   - ✅ Unit tests for GovernanceEngine (1 test file)
   - ✅ Unit tests for SecurityScanner (1 test file)
   - ✅ Integration tests for runner integration (1 test file)
   - **Target**: 95%+ coverage for new governance/security code

2. **Performance**
   - ✅ Test execution time increases by <10% with all rules/checks enabled
   - ✅ No memory leaks during long test runs
   - ✅ Parallel test execution not impacted

3. **Documentation**
   - ✅ Each rule/check documented with examples
   - ✅ Configuration guide updated
   - ✅ README updated with governance/security features
   - ✅ Example tests demonstrating violations/findings

### User Experience Success

1. **Clear Output**
   - ✅ Console reporter shows violations/findings in organized format
   - ✅ Severity-based color coding (red=critical/high, yellow=medium, gray=low)
   - ✅ Actionable remediation guidance for each finding
   - ✅ Summary counts (e.g., "5 violations, 3 critical findings")

2. **Easy Configuration**
   - ✅ Simple enable/disable toggles per rule/check
   - ✅ Severity configuration per rule
   - ✅ Threshold configuration clear and intuitive
   - ✅ Sensible defaults work out-of-the-box

3. **Developer Workflow**
   - ✅ Violations don't fail tests (unless threshold exceeded)
   - ✅ Gradual adoption possible (start with warnings, increase strictness)
   - ✅ Fast feedback during development
   - ✅ CI/CD integration straightforward

---

## Implementation Plan

### Phase 1: Core Infrastructure (Day 9 - 8 hours)

**Goal**: Create governance engine and security scanner coordinator classes

#### 1.1 GovernanceEngine (`governance/engine.js`) - 2 hours

**Responsibilities**:
- Load and initialize enabled governance rules from config
- Coordinate execution of all rules against request/response
- Aggregate violations from all rules
- Return structured violation list

**Interface**:
```javascript
export class GovernanceEngine {
    constructor(config) {
        // Load rules from config.governance.rules
        // Instantiate enabled rules only
    }

    async check(request, response, endpoint, testContext) {
        // Execute all enabled rules
        // Aggregate violations
        // Return array of violations
    }

    getRuleNames() {
        // Return list of enabled rule names
    }
}
```

**Implementation Details**:
- Load rule classes dynamically from `governance/rules/` directory
- Filter rules based on `config.governance.rules[ruleName].enabled`
- Pass severity from config to each rule constructor
- Handle errors gracefully (log, but don't crash test run)
- Return violations in standard format:
  ```javascript
  {
      rule: 'rest-standards',
      category: 'creation-status-code',
      severity: 'warning',
      message: 'POST for resource creation should return 201, got 200',
      endpoint: '/api/users',
      method: 'POST',
      location: 'response.status',
      remediation: 'Change response status to 201 for POST requests that create resources'
  }
  ```

#### 1.2 SecurityScanner (`security/scanner.js`) - 2 hours

**Responsibilities**:
- Load and initialize enabled security checks from config
- Coordinate execution of all checks against request/response
- Aggregate findings from all checks
- Return structured finding list

**Interface**:
```javascript
export class SecurityScanner {
    constructor(config) {
        // Load checks from config.security.checks
        // Instantiate enabled checks only
    }

    async scan(request, response, endpoint, testContext) {
        // Execute all enabled checks
        // Aggregate findings
        // Return array of findings
    }

    getCheckNames() {
        // Return list of enabled check names
    }
}
```

**Implementation Details**:
- Load check classes dynamically from `security/checks/` directory
- Filter checks based on `config.security.checks[checkName].enabled`
- Handle errors gracefully (log, but don't crash test run)
- Return findings in standard format:
  ```javascript
  {
      check: 'sensitive-data',
      severity: 'critical',
      title: 'Password Exposed in Response',
      description: 'Password field detected in API response body',
      endpoint: '/api/users/1',
      method: 'GET',
      location: 'response.body.password',
      evidence: 'mySecretPassword123',
      cwe: 'CWE-200: Exposure of Sensitive Information',
      remediation: 'Remove password field from API response. Use separate endpoint for password changes.'
  }
  ```

#### 1.3 HTTP Client Enhancement (`core/http-client.js`) - 1 hour

**Changes**:
- Store last request/response objects
- Provide getter methods for request/response
- No breaking changes to existing API

**Implementation**:
```javascript
export class HttpClient {
    constructor(config) {
        // ... existing code
        this.lastRequest = null;
        this.lastResponse = null;
    }

    async request(method, url, options = {}) {
        // ... existing request logic

        // Capture request
        this.lastRequest = {
            method,
            url,
            headers: options.headers,
            body: options.body,
            timestamp: new Date()
        };

        // Make request
        const response = await axios.request(axiosConfig);

        // Capture response
        this.lastResponse = {
            status: response.status,
            headers: response.headers,
            body: response.data,
            timestamp: new Date()
        };

        return response;
    }

    getLastRequest() { return this.lastRequest; }
    getLastResponse() { return this.lastResponse; }
}
```

#### 1.4 Unit Tests - 3 hours

- `governance/engine.test.js` - Test GovernanceEngine coordinator
- `security/scanner.test.js` - Test SecurityScanner coordinator
- `core/http-client.test.js` - Update with request/response capture tests

### Phase 2: Governance Rules (Day 10-11 - 16 hours)

**Goal**: Implement 4 new governance rules (1 already exists)

#### 2.1 API Versioning Rule (`governance/rules/versioning.js`) - 4 hours

**Validation Logic**:
1. Check URL path for version patterns (`/v1/`, `/v2/`, `/api/v1/`)
2. Check headers for version (`Accept-Version`, `API-Version`)
3. Check accept header for version (`Accept: application/vnd.api+json; version=1`)
4. Flag if no versioning detected on non-development endpoints

**Configuration**:
```javascript
governance: {
    rules: {
        'versioning': {
            enabled: true,
            severity: 'warning',
            requireVersion: true,           // Flag missing versions
            preferredLocation: 'url',       // 'url', 'header', 'both'
            versionPattern: /v\d+/         // Regex for version format
        }
    }
}
```

**Violations**:
- `missing-api-version`: No version detected
- `inconsistent-versioning`: Some endpoints versioned, others not
- `version-in-wrong-location`: Version in header but config prefers URL

**Test File**: `governance/rules/versioning.test.js` (10-15 test cases)

#### 2.2 Resource Naming Conventions Rule (`governance/rules/naming-conventions.js`) - 4 hours

**Validation Logic**:
1. Parse URL path segments
2. Validate naming convention consistency (kebab-case, snake_case, camelCase)
3. Check for plural resource names
4. Validate RESTful hierarchy (parent/child relationships)
5. Flag non-standard patterns (abbreviations, unclear names)

**Configuration**:
```javascript
governance: {
    rules: {
        'naming-conventions': {
            enabled: true,
            severity: 'info',
            convention: 'kebab-case',       // 'kebab-case', 'snake_case', 'camelCase'
            requirePlural: true,            // Enforce plural resource names
            allowAbbreviations: false,      // Flag abbreviated names
            customExceptions: ['api', 'auth', 'oauth']
        }
    }
}
```

**Violations**:
- `inconsistent-naming`: Mixed naming conventions
- `singular-resource`: Resource should be plural
- `unclear-naming`: Resource name too vague or abbreviated
- `non-restful-hierarchy`: Invalid parent/child relationship

**Test File**: `governance/rules/naming-conventions.test.js` (10-15 test cases)

#### 2.3 HTTP Method Standards Rule (`governance/rules/http-methods.js`) - 4 hours

**Validation Logic**:
1. Validate method semantics based on status code
   - GET → 200, 404
   - POST → 201, 400
   - PUT → 200, 204, 404
   - PATCH → 200, 404
   - DELETE → 204, 404
2. Check for idempotency violations
3. Validate safe method guarantees (GET/HEAD no side effects)
4. Flag inappropriate method usage

**Configuration**:
```javascript
governance: {
    rules: {
        'http-methods': {
            enabled: true,
            severity: 'error',
            enforceSemantics: true,         // Enforce HTTP method semantics
            enforceIdempotency: true,       // Flag idempotency violations
            strictStatusCodes: true         // Enforce correct status codes
        }
    }
}
```

**Violations**:
- `wrong-status-code`: Status code doesn't match HTTP method
- `idempotency-violation`: POST request should not be idempotent
- `unsafe-method`: GET/HEAD should have no side effects
- `wrong-method`: Incorrect HTTP method for operation

**Test File**: `governance/rules/http-methods.test.js` (10-15 test cases)

#### 2.4 Pagination Standards Rule (`governance/rules/pagination.js`) - 4 hours

**Validation Logic**:
1. Detect large array responses (>100 items default)
2. Check for pagination metadata:
   - Offset-based: `total`, `limit`, `offset`, `page`
   - Cursor-based: `cursor`, `next`, `previous`, `has_more`
   - Link-based: `Link` header with `rel=next/prev`
3. Validate pagination consistency across endpoints
4. Flag missing pagination on large collections

**Configuration**:
```javascript
governance: {
    rules: {
        'pagination': {
            enabled: true,
            severity: 'warning',
            threshold: 100,                 // Items before pagination required
            preferredStyle: 'cursor',       // 'offset', 'cursor', 'link'
            requireMetadata: true,          // Require total count, etc.
            allowNoPagination: false        // Allow unpaginated large responses
        }
    }
}
```

**Violations**:
- `missing-pagination`: Large collection without pagination
- `incomplete-pagination-metadata`: Missing pagination fields
- `inconsistent-pagination-style`: Mixed pagination approaches
- `invalid-pagination-values`: Negative offset, invalid cursor

**Test File**: `governance/rules/pagination.test.js` (10-15 test cases)

### Phase 3: Security Checks (Day 11-12 - 16 hours)

**Goal**: Implement 5 new security checks (1 already exists)

#### 3.1 Authentication Validation Check (`security/checks/authentication.js`) - 3 hours

**Detection Logic**:
1. Check for authentication headers (`Authorization`, `X-API-Key`, `Cookie`)
2. Validate authentication scheme (Bearer, Basic, API Key, OAuth)
3. Detect missing authentication on protected endpoints
4. Flag weak authentication (Basic auth over HTTP)

**Configuration**:
```javascript
security: {
    checks: {
        'authentication': {
            enabled: true,
            requireAuth: true,              // Flag missing auth
            preferredScheme: 'bearer',      // 'bearer', 'basic', 'apikey'
            publicEndpoints: ['/health', '/ping'],  // Exceptions
            flagWeakAuth: true              // Flag basic auth over HTTP
        }
    }
}
```

**Findings**:
- `missing-authentication`: No auth header on protected endpoint
- `weak-authentication`: Basic auth over HTTP
- `invalid-auth-scheme`: Unsupported authentication scheme
- `exposed-credentials`: Credentials in URL or body

**Test File**: `security/checks/authentication.test.js` (10-15 test cases)

#### 3.2 Authorization Checks (`security/checks/authorization.js`) - 3 hours

**Detection Logic**:
1. Analyze URL patterns for resource IDs
2. Check for IDOR vulnerability indicators
3. Validate role-based access control headers
4. Detect missing authorization headers
5. Flag privilege escalation attempts

**Configuration**:
```javascript
security: {
    checks: {
        'authorization': {
            enabled: true,
            checkIDOR: true,                // Check for IDOR vulnerabilities
            requireRoleHeader: false,       // Require X-User-Role header
            flagPrivilegeEscalation: true,  // Detect privilege escalation
            sensitiveResources: ['admin', 'users', 'accounts']
        }
    }
}
```

**Findings**:
- `potential-idor`: Resource ID in URL without authorization check
- `missing-authorization`: Authorization header missing
- `privilege-escalation`: Attempt to access privileged resource
- `insufficient-access-control`: Weak authorization mechanism

**Test File**: `security/checks/authorization.test.js` (10-15 test cases)

#### 3.3 Rate Limiting Detection (`security/checks/rate-limiting.js`) - 3 hours

**Detection Logic**:
1. Check for rate limit headers in response:
   - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
   - `Retry-After`
   - `X-Rate-Limit` (various formats)
2. Detect missing rate limiting on public endpoints
3. Validate rate limit values are reasonable
4. Flag aggressive rate limits (potential DoS)

**Configuration**:
```javascript
security: {
    checks: {
        'rate-limiting': {
            enabled: true,
            requireRateLimiting: true,      // Flag missing rate limits
            publicEndpoints: ['/api/**'],   // Endpoints that need limits
            expectedHeaders: ['X-RateLimit-Limit'],
            warnOnAggressiveLimits: true    // Flag very low limits
        }
    }
}
```

**Findings**:
- `missing-rate-limiting`: No rate limit headers on public endpoint
- `incomplete-rate-limit-headers`: Missing rate limit metadata
- `aggressive-rate-limiting`: Rate limit too restrictive
- `rate-limit-exceeded`: Rate limit exceeded during test

**Test File**: `security/checks/rate-limiting.test.js` (10-15 test cases)

#### 3.4 SSL/TLS Validation (`security/checks/ssl-tls.js`) - 3 hours

**Detection Logic**:
1. Check protocol (HTTP vs HTTPS)
2. Validate TLS version (TLS 1.2+)
3. Check for secure cookie flags (`Secure`, `HttpOnly`, `SameSite`)
4. Detect mixed content (HTTPS page loading HTTP resources)
5. Flag insecure protocols

**Configuration**:
```javascript
security: {
    checks: {
        'ssl-tls': {
            enabled: true,
            requireHTTPS: true,             // Flag HTTP usage
            minTLSVersion: '1.2',           // Minimum TLS version
            requireSecureCookies: true,     // Flag insecure cookies
            allowLocalhost: true            // Allow HTTP on localhost
        }
    }
}
```

**Findings**:
- `http-usage`: HTTP used instead of HTTPS
- `outdated-tls`: TLS version too old
- `insecure-cookies`: Cookies without Secure/HttpOnly flags
- `mixed-content`: HTTPS page loading HTTP resources

**Test File**: `security/checks/ssl-tls.test.js` (10-15 test cases)

#### 3.5 Security Headers Check (`security/checks/headers.js`) - 4 hours

**Detection Logic**:
1. Check for security headers in response:
   - `Strict-Transport-Security` (HSTS)
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY/SAMEORIGIN`
   - `Content-Security-Policy`
   - `X-XSS-Protection`
   - `Referrer-Policy`
2. Validate CORS configuration
3. Flag missing or misconfigured headers
4. Suggest best practices

**Configuration**:
```javascript
security: {
    checks: {
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
            validateCORS: true,             // Check CORS configuration
            allowMissingHeaders: false      // Fail on missing headers
        }
    }
}
```

**Findings**:
- `missing-security-header`: Required security header missing
- `misconfigured-header`: Header present but value incorrect
- `weak-csp`: Content Security Policy too permissive
- `permissive-cors`: CORS allows all origins
- `missing-hsts`: HSTS header missing on HTTPS endpoint

**Test File**: `security/checks/headers.test.js` (10-15 test cases)

### Phase 4: Runner Integration (Day 12 - 8 hours)

**Goal**: Integrate governance and security checks into test execution flow

#### 4.1 Test Runner Enhancement (`core/runner.js`) - 3 hours

**Changes**:
- Initialize GovernanceEngine and SecurityScanner
- After each test completes, invoke checks
- Pass violations/findings to collector
- Handle errors gracefully

**Implementation**:
```javascript
import { GovernanceEngine } from '../governance/engine.js';
import { SecurityScanner } from '../security/scanner.js';

export class TestRunner {
    constructor(config) {
        // ... existing code
        this.governanceEngine = new GovernanceEngine(config);
        this.securityScanner = new SecurityScanner(config);
    }

    async runTest(suite, test) {
        const client = createClient(this.config.http);

        try {
            // ... existing test execution

            // After test completes, run governance and security checks
            if (this.config.governance?.enabled) {
                await this.runGovernanceChecks(client, test, result);
            }

            if (this.config.security?.enabled) {
                await this.runSecurityChecks(client, test, result);
            }

        } catch (error) {
            // ... existing error handling
        }
    }

    async runGovernanceChecks(client, test, result) {
        try {
            const request = client.getLastRequest();
            const response = client.getLastResponse();

            if (request && response) {
                const violations = await this.governanceEngine.check(
                    request,
                    response,
                    test.endpoint || request.url,
                    { suite: test.suite, test: test.name }
                );

                violations.forEach(v => this.collector.addGovernanceViolation(v));
            }
        } catch (error) {
            this.logger.warn('Governance check failed:', error.message);
        }
    }

    async runSecurityChecks(client, test, result) {
        try {
            const request = client.getLastRequest();
            const response = client.getLastResponse();

            if (request && response) {
                const findings = await this.securityScanner.scan(
                    request,
                    response,
                    test.endpoint || request.url,
                    { suite: test.suite, test: test.name }
                );

                findings.forEach(f => this.collector.addSecurityFinding(f));
            }
        } catch (error) {
            this.logger.warn('Security scan failed:', error.message);
        }
    }
}
```

#### 4.2 CLI Enhancement (`cli/index.js`) - 1 hour

**Changes**:
- Check thresholds after test run completes
- Fail with exit code 1 if thresholds exceeded
- Display threshold breach messages

**Implementation**:
```javascript
async function runTests(pattern, config) {
    const runner = new TestRunner(config);
    const results = await runner.run(pattern);

    // Existing reporters
    await reporter.report(runner.collector);

    // Check thresholds
    const thresholdsPassed = checkThresholds(runner.collector, config);

    if (!thresholdsPassed) {
        console.log(chalk.red('\n❌ Thresholds exceeded'));
        process.exit(1);
    }

    // Existing exit logic
    process.exit(results.hasFailures() ? 1 : 0);
}

function checkThresholds(collector, config) {
    const thresholds = config.thresholds || {};
    const results = collector.getResults();

    // Governance violations
    const errorViolations = results.governance.violations
        .filter(v => v.severity === 'error').length;
    const warningViolations = results.governance.violations
        .filter(v => v.severity === 'warning').length;

    if (errorViolations > (thresholds.governanceViolations?.error || 0)) {
        console.log(chalk.red(`Governance errors: ${errorViolations} (threshold: ${thresholds.governanceViolations.error})`));
        return false;
    }

    if (warningViolations > (thresholds.governanceViolations?.warning || Infinity)) {
        console.log(chalk.yellow(`Governance warnings: ${warningViolations} (threshold: ${thresholds.governanceViolations.warning})`));
        return false;
    }

    // Security findings
    const criticalFindings = results.security.findings
        .filter(f => f.severity === 'critical').length;
    const highFindings = results.security.findings
        .filter(f => f.severity === 'high').length;

    if (criticalFindings > (thresholds.securityFindings?.critical || 0)) {
        console.log(chalk.red(`Critical security findings: ${criticalFindings} (threshold: ${thresholds.securityFindings.critical})`));
        return false;
    }

    if (highFindings > (thresholds.securityFindings?.high || 0)) {
        console.log(chalk.red(`High security findings: ${highFindings} (threshold: ${thresholds.securityFindings.high})`));
        return false;
    }

    return true;
}
```

#### 4.3 Integration Tests - 2 hours

**Test File**: `tests/integration/governance-security.integration.test.js`

**Test Scenarios**:
1. Full test run with governance violations captured
2. Full test run with security findings captured
3. Threshold enforcement (pass and fail scenarios)
4. Multiple rules/checks running simultaneously
5. Performance impact measurement

#### 4.4 Update Unit Tests - 2 hours

- `core/runner.test.js` - Update with governance/security integration tests
- `cli/index.test.js` - Add threshold checking tests

### Phase 5: Testing & Documentation (Day 13 - 8 hours)

**Goal**: Comprehensive testing and documentation

#### 5.1 Example Tests - 2 hours

**Create**: `examples/governance-demo.test.js`

**Demonstrate**:
- Tests that trigger various governance violations
- Tests that trigger various security findings
- Examples of proper API design
- How to configure rules/checks

**Content**:
```javascript
describe('Governance & Security Demo', { prefix: 'demo' }, () => {
    // Violation: POST returns 200 instead of 201
    test('Create user (wrong status)', async ({ request }) => {
        const response = await request.post('/users', {
            body: { name: 'John' }
        });
        expect(response.status).toBe(200); // Should be 201
    });

    // Violation: Missing API version
    test('Get users (no version)', async ({ request }) => {
        const response = await request.get('/users');
        expect(response.status).toBe(200);
    });

    // Security Finding: Password in response
    test('Get user details (sensitive data)', async ({ request }) => {
        const response = await request.get('/users/1');
        expect(response.body).toHaveProperty('password'); // Should not expose
    });

    // Good: Proper versioning and status code
    test('Create user (correct)', async ({ request }) => {
        const response = await request.post('/api/v1/users', {
            body: { name: 'Jane' }
        });
        expect(response.status).toBe(201);
    });
});
```

#### 5.2 Documentation - 4 hours

**Files to Create/Update**:

1. **README.md** - Add Governance & Security section:
   - Overview of features
   - Quick examples
   - Configuration snippet
   - Links to detailed docs

2. **docs/GOVERNANCE.md** (NEW):
   - Complete governance rules reference
   - Configuration guide for each rule
   - Best practices for API design
   - Violation remediation guide
   - Examples for each rule

3. **docs/SECURITY.md** (NEW):
   - Complete security checks reference
   - Configuration guide for each check
   - Security best practices
   - Finding remediation guide
   - Examples for each check

4. **docs/IMPLEMENTATION.md**:
   - Mark Week 2 (Days 9-13) as complete
   - Update progress tracking
   - Add governance/security milestones

5. **iudex.config.js**:
   - Add comprehensive comments for all governance/security options
   - Provide sensible defaults
   - Include examples for common configurations

#### 5.3 Final Testing & Bug Fixes - 2 hours

**Activities**:
- Run full test suite
- Fix any failing tests
- Address edge cases discovered during testing
- Performance validation
- Manual testing of all features

---

## Files to Create/Modify

### New Files (11 total)

**Governance** (5 files):
- `governance/engine.js` - Central governance coordinator
- `governance/rules/versioning.js` - API versioning rule
- `governance/rules/naming-conventions.js` - Resource naming rule
- `governance/rules/http-methods.js` - HTTP method standards rule
- `governance/rules/pagination.js` - Pagination standards rule

**Security** (6 files):
- `security/scanner.js` - Central security coordinator
- `security/checks/authentication.js` - Authentication validation
- `security/checks/authorization.js` - Authorization checks
- `security/checks/rate-limiting.js` - Rate limiting detection
- `security/checks/ssl-tls.js` - SSL/TLS validation
- `security/checks/headers.js` - Security headers check

### Modified Files (5 total)

**Core**:
- `core/http-client.js` - Add request/response capture
- `core/runner.js` - Add governance/security invocation
- `cli/index.js` - Add threshold checking

**Documentation**:
- `README.md` - Add governance/security documentation
- `docs/IMPLEMENTATION.md` - Mark Week 2 complete

### Test Files (12 new + 1 updated)

**Unit Tests** (12 new):
- `governance/engine.test.js`
- `governance/rules/versioning.test.js`
- `governance/rules/naming-conventions.test.js`
- `governance/rules/http-methods.test.js`
- `governance/rules/pagination.test.js`
- `security/scanner.test.js`
- `security/checks/authentication.test.js`
- `security/checks/authorization.test.js`
- `security/checks/rate-limiting.test.js`
- `security/checks/ssl-tls.test.js`
- `security/checks/headers.test.js`
- `core/http-client.test.js` (update)

**Integration Tests** (1 new):
- `tests/integration/governance-security.integration.test.js`

**Examples** (1 new):
- `examples/governance-demo.test.js`

### Documentation Files (2 new)

- `docs/GOVERNANCE.md`
- `docs/SECURITY.md`

---

## Configuration Reference

### Complete Config Example

```javascript
export default {
    // ... existing config

    governance: {
        enabled: true,
        rules: {
            'rest-standards': {
                enabled: true,
                severity: 'error'
            },
            'versioning': {
                enabled: true,
                severity: 'warning',
                requireVersion: true,
                preferredLocation: 'url',
                versionPattern: /v\d+/
            },
            'naming-conventions': {
                enabled: true,
                severity: 'info',
                convention: 'kebab-case',
                requirePlural: true,
                allowAbbreviations: false,
                customExceptions: ['api', 'auth', 'oauth']
            },
            'http-methods': {
                enabled: true,
                severity: 'error',
                enforceSemantics: true,
                enforceIdempotency: true,
                strictStatusCodes: true
            },
            'pagination': {
                enabled: true,
                severity: 'warning',
                threshold: 100,
                preferredStyle: 'cursor',
                requireMetadata: true,
                allowNoPagination: false
            }
        }
    },

    security: {
        enabled: true,
        checks: {
            'sensitive-data': {
                enabled: true
            },
            'authentication': {
                enabled: true,
                requireAuth: true,
                preferredScheme: 'bearer',
                publicEndpoints: ['/health', '/ping'],
                flagWeakAuth: true
            },
            'authorization': {
                enabled: true,
                checkIDOR: true,
                requireRoleHeader: false,
                flagPrivilegeEscalation: true,
                sensitiveResources: ['admin', 'users', 'accounts']
            },
            'rate-limiting': {
                enabled: true,
                requireRateLimiting: true,
                publicEndpoints: ['/api/**'],
                expectedHeaders: ['X-RateLimit-Limit'],
                warnOnAggressiveLimits: true
            },
            'ssl-tls': {
                enabled: true,
                requireHTTPS: true,
                minTLSVersion: '1.2',
                requireSecureCookies: true,
                allowLocalhost: true
            },
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
                validateCORS: true,
                allowMissingHeaders: false
            }
        }
    },

    thresholds: {
        governanceViolations: {
            error: 0,      // Fail on any error
            warning: 10    // Allow up to 10 warnings
        },
        securityFindings: {
            critical: 0,   // Fail on any critical
            high: 0,       // Fail on any high
            medium: 5,     // Allow up to 5 medium
            low: Infinity  // Allow any number of low
        },
        testPassRate: 95
    }
};
```

---

## Verification Steps

### 1. Unit Tests Pass
```bash
npm run test:unit
# Expect: All governance and security tests pass
# Target: 95%+ coverage for new code
```

### 2. Integration Tests Pass
```bash
npm test
# Expect: Governance violations collected
# Expect: Security findings collected
# Expect: Thresholds enforced
```

### 3. Manual Testing

**Test Governance Rules**:
```bash
# Run example with governance violations
node cli/index.js run examples/governance-demo.test.js

# Expected output:
# ⚠️  Governance Violations
#   [ERROR] rest-standards: POST should return 201, not 200
#   [WARNING] versioning: Missing API version
#   [INFO] naming-conventions: Resource should be plural
```

**Test Security Checks**:
```bash
# Run example with security findings
node cli/index.js run examples/governance-demo.test.js

# Expected output:
# 🔒 Security Findings
#   [CRITICAL] sensitive-data: Password exposed in response
#   [HIGH] authentication: Missing authentication on protected endpoint
#   [MEDIUM] headers: Missing security headers
```

**Test Threshold Enforcement**:
```bash
# Run with strict thresholds
node cli/index.js run examples/governance-demo.test.js

# Expected: Exit code 1 if thresholds exceeded
echo $?  # Should be 1
```

### 4. Performance Validation

```bash
# Run tests without governance/security
time node cli/index.js run examples/httpbin.test.js

# Run tests with governance/security
time node cli/index.js run examples/httpbin.test.js

# Expected: <10% time increase
```

### 5. Configuration Testing

```bash
# Test with governance disabled
node cli/index.js run examples/governance-demo.test.js
# Expected: No governance violations reported

# Test with security disabled
node cli/index.js run examples/governance-demo.test.js
# Expected: No security findings reported

# Test with custom thresholds
node cli/index.js run examples/governance-demo.test.js
# Expected: Thresholds enforced according to config
```

---

## Timeline

**Day 9** (8 hours):
- GovernanceEngine (2h)
- SecurityScanner (2h)
- HTTP Client enhancement (1h)
- Unit tests for engines (3h)

**Day 10** (8 hours):
- Versioning rule + tests (4h)
- Naming conventions rule + tests (4h)

**Day 11** (8 hours):
- HTTP methods rule + tests (4h)
- Pagination rule + tests (4h)

**Day 12** (8 hours):
- Authentication check + tests (3h)
- Authorization check + tests (3h)
- Runner integration + CLI updates (2h)

**Day 13** (8 hours):
- Rate limiting check + tests (2h)
- SSL/TLS check + tests (2h)
- Security headers check + tests (2h)
- Documentation + example tests (2h)

**Total**: 40 hours over 5 days

---

## Success Metrics

**Quantitative**:
- 11 new files created (5 governance, 6 security)
- 13 new test files created
- 95%+ test coverage for new code
- <10% performance overhead
- 0 regression bugs

**Qualitative**:
- Clear, actionable violation/finding messages
- Easy configuration
- Positive developer feedback
- Useful in real-world testing scenarios

---

## Risk Mitigation

### Performance Impact
- **Risk**: Governance/security checks slow down tests significantly
- **Mitigation**: Profile and optimize, run checks in parallel where possible
- **Monitoring**: Track execution time in integration tests

### False Positives
- **Risk**: Rules/checks flag valid patterns as violations
- **Mitigation**: Extensive testing, configurable exception lists
- **Solution**: Easy disable per rule/check, severity tuning

### Integration Complexity
- **Risk**: Request/response capture interferes with test execution
- **Mitigation**: Non-invasive capture, error handling
- **Fallback**: Graceful degradation if capture fails

---

## Next Steps After Completion

**Week 3: Advanced Reporting**
- GitHub Pages dashboard showing governance/security trends
- Historical violation/finding tracking
- Remediation progress tracking

**Week 4: Ecosystem**
- Import governance rules from OpenAPI specs
- Export governance reports for compliance
- Integration with security scanning tools

---

## Conclusion

This plan provides a comprehensive roadmap for implementing governance and security features in the Iudex framework. The implementation leverages existing architecture patterns (collector structure, reporter rendering) and adds the missing pieces (engines, rules, checks, runner integration) to create a complete API governance and security solution.

**Key deliverables**:
- 5 governance rules (REST, versioning, naming, HTTP methods, pagination)
- 6 security checks (sensitive data, auth, authz, rate limiting, SSL/TLS, headers)
- Full integration with test execution flow
- Threshold-based enforcement
- Comprehensive testing and documentation

**Success looks like**:
- Tests run with governance/security checks automatically
- Clear, actionable violations and findings reported
- Configurable enforcement via thresholds
- <10% performance overhead
- Developers can easily adopt incrementally

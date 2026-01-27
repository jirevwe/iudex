# Security Scanning Guide

**Version**: 1.0.0
**Last Updated**: January 27, 2026

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Security Checks](#security-checks)
  - [Sensitive Data Exposure](#sensitive-data-exposure)
  - [Authentication](#authentication)
  - [Authorization](#authorization)
  - [Rate Limiting](#rate-limiting)
  - [SSL/TLS](#ssltls)
  - [Security Headers](#security-headers)
- [Configuration](#configuration)
- [Finding Reference](#finding-reference)
- [Remediation Guide](#remediation-guide)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Overview

The Iudex security scanner automatically detects common security vulnerabilities and misconfigurations during API testing. It provides:

- **Automatic vulnerability detection** across 6 security categories
- **CWE mappings** for every finding
- **Severity classification** (critical, high, medium, low)
- **Actionable remediation** guidance
- **Zero test impact** - findings don't fail tests unless thresholds exceeded

### Key Features

- ✅ **6 security checks** covering authentication, authorization, data exposure, and more
- ✅ **Opt-in by design** - explicitly enable via configuration
- ✅ **Independent control** - enable/disable security and governance separately
- ✅ **CWE references** for compliance and reporting
- ✅ **Threshold enforcement** for CI/CD integration
- ✅ **Real-time detection** during test execution
- ✅ **Historical tracking** via PostgreSQL (optional)

---

## Quick Start

> **Note**: Security checks are **opt-in** and must be explicitly enabled in your configuration. They will not run unless `enabled: true` is set.

### 1. Enable Security Scanner

Edit `iudex.config.js` to explicitly enable security checks:

```javascript
export default {
    security: {
        enabled: true,
        checks: {
            'sensitive-data': { enabled: true },
            'authentication': { enabled: true },
            'authorization': { enabled: true },
            'rate-limiting': { enabled: true },
            'ssl-tls': { enabled: true },
            'headers': { enabled: true }
        }
    }
};
```

### 2. Run Your Tests

```bash
node cli/index.js run tests/**/*.test.js
```

### 3. View Results

```
Security:
  🔴 2 critical findings
  🟠 5 high findings
  🟡 8 medium findings

[ERROR] Critical security findings threshold exceeded: 2 findings (threshold: 0)
```

Detailed findings are saved to `.iudex/results/run-{timestamp}.json`.

---

## Security Checks

### Sensitive Data Exposure

**Check ID**: `sensitive-data`
**CWE**: CWE-200, CWE-312, CWE-359

Detects exposure of sensitive information in API responses.

#### What It Detects

🔒 **Credentials**
- Passwords, API keys, secrets, tokens
- Private keys, certificates

🔒 **Personal Information (PII)**
- Social Security Numbers (SSN)
- Credit card numbers
- Email addresses in large datasets
- Phone numbers

🔒 **Authentication Tokens**
- JWT tokens in response bodies
- Session tokens, refresh tokens
- OAuth tokens

#### Configuration

```javascript
{
    'sensitive-data': {
        enabled: true,
        checkPatterns: {
            password: true,
            apiKey: true,
            token: true,
            ssn: true,
            creditCard: true
        }
    }
}
```

#### Examples

**🔴 Critical Finding**:
```javascript
// Password exposed in response
const response = await request.post('/api/users', userData);
// response.body = {
//     id: 123,
//     name: 'John',
//     password: 'secret123'  // ❌ Password in response!
// }
```

**✅ Secure**:
```javascript
// Password not included in response
const response = await request.post('/api/users', userData);
// response.body = {
//     id: 123,
//     name: 'John',
//     email: 'john@example.com'
//     // No password field
// }
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `password-exposure` | critical | CWE-200 | Password field in response |
| `api-key-exposure` | critical | CWE-200 | API key or secret in response |
| `token-exposure` | high | CWE-200 | Authentication token in response body |
| `ssn-exposure` | critical | CWE-359 | Social Security Number detected |
| `credit-card-exposure` | critical | CWE-359 | Credit card number detected |

---

### Authentication

**Check ID**: `authentication`
**CWE**: CWE-287, CWE-306, CWE-319

Validates authentication mechanisms and enforcement.

#### What It Detects

🔒 **Missing Authentication**
- Protected endpoints without auth headers
- Sensitive resources accessible without credentials

🔒 **Weak Authentication**
- Basic auth over HTTP (not HTTPS)
- Credentials in URL query parameters
- Insecure authentication schemes

🔒 **Authentication Bypass**
- Endpoints that should require auth but don't

#### Configuration

```javascript
{
    'authentication': {
        enabled: true,
        requireAuth: true,              // Flag missing auth
        preferredScheme: 'bearer',      // 'bearer', 'basic', 'apikey'
        publicEndpoints: ['/health', '/ping'],  // Exceptions
        flagWeakAuth: true              // Flag basic auth over HTTP
    }
}
```

#### Examples

**🔴 Critical Finding**:
```javascript
// Basic auth over HTTP (insecure!)
const response = await request.get('http://api.example.com/users', {
    headers: { 'Authorization': 'Basic dXNlcjpwYXNz' }
});
```

**🟠 High Finding**:
```javascript
// No authentication on protected endpoint
const response = await request.get('https://api.example.com/admin/users');
// No Authorization header - should require auth!
```

**✅ Secure**:
```javascript
// Bearer token over HTTPS
const response = await request.get('https://api.example.com/users', {
    headers: { 'Authorization': 'Bearer eyJhbGc...' }
});
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `missing-authentication` | high | CWE-306 | No auth header on protected endpoint |
| `weak-authentication` | critical | CWE-319 | Basic auth over HTTP |
| `invalid-auth-scheme` | medium | CWE-287 | Unsupported authentication scheme |
| `exposed-credentials` | critical | CWE-598 | Credentials in URL or body |

---

### Authorization

**Check ID**: `authorization`
**CWE**: CWE-639, CWE-862, CWE-269

Detects authorization issues including IDOR and privilege escalation.

#### What It Detects

🔒 **IDOR (Insecure Direct Object References)**
- Accessing resources by ID without authorization
- Resource ID in URL without auth checks

🔒 **Missing Authorization**
- Sensitive resources without authorization headers
- Role-based access control missing

🔒 **Privilege Escalation**
- Admin endpoints without role verification
- Modifying other users' resources

#### Configuration

```javascript
{
    'authorization': {
        enabled: true,
        checkIDOR: true,                // Check for IDOR vulnerabilities
        requireRoleHeader: false,       // Require X-User-Role header
        flagPrivilegeEscalation: true,  // Detect privilege escalation
        sensitiveResources: ['admin', 'users', 'accounts', 'settings']
    }
}
```

#### Examples

**🟠 High Finding (IDOR)**:
```javascript
// Accessing user resource by ID without authorization
const response = await request.get('https://api.example.com/users/123');
// No Authorization header - any user can access any user's data!
```

**🔴 Critical Finding (Privilege Escalation)**:
```javascript
// Accessing admin endpoint without admin role
const response = await request.get('https://api.example.com/admin/users', {
    headers: { 'Authorization': 'Bearer user-token' }
    // Token doesn't have admin role!
});
```

**✅ Secure**:
```javascript
// Authorization header with proper role
const response = await request.get('https://api.example.com/admin/users', {
    headers: {
        'Authorization': 'Bearer admin-token',
        'X-User-Role': 'admin'
    }
});
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `potential-idor` | high | CWE-639 | Resource ID in URL without authorization |
| `missing-authorization` | high | CWE-862 | Authorization header missing |
| `privilege-escalation` | critical | CWE-269 | Accessing privileged resource |
| `missing-role-header` | medium | - | Role header required but missing |

---

### Rate Limiting

**Check ID**: `rate-limiting`
**CWE**: CWE-770, CWE-307

Validates presence and configuration of rate limiting.

#### What It Detects

🔒 **Missing Rate Limiting**
- No rate limit headers on public endpoints
- API vulnerable to abuse/DoS

🔒 **Incomplete Rate Limit Headers**
- Missing `X-RateLimit-Remaining` or `X-RateLimit-Reset`

🔒 **Aggressive Rate Limiting**
- Rate limits too restrictive for normal use

#### Configuration

```javascript
{
    'rate-limiting': {
        enabled: true,
        requireRateLimiting: true,      // Flag missing rate limits
        publicEndpoints: ['/api/**'],   // Endpoints that need limits
        expectedHeaders: ['X-RateLimit-Limit'],
        warnOnAggressiveLimits: true    // Flag very low limits
    }
}
```

#### Examples

**🟡 Medium Finding**:
```javascript
// No rate limiting headers
const response = await request.get('https://api.example.com/search');
// response.headers has no X-RateLimit-* headers
```

**✅ Secure**:
```javascript
const response = await request.get('https://api.example.com/search');
// response.headers = {
//     'X-RateLimit-Limit': '1000',
//     'X-RateLimit-Remaining': '999',
//     'X-RateLimit-Reset': '1643723400'
// }
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `missing-rate-limiting` | medium | CWE-770 | No rate limit headers |
| `incomplete-rate-limit-headers` | low | CWE-770 | Missing rate limit metadata |
| `aggressive-rate-limiting` | low | - | Rate limit too restrictive |
| `rate-limit-exceeded` | info | CWE-770 | Rate limit exceeded during test |

---

### SSL/TLS

**Check ID**: `ssl-tls`
**CWE**: CWE-319, CWE-614, CWE-326

Enforces HTTPS usage and secure cookie settings.

#### What It Detects

🔒 **HTTP Usage**
- API endpoints using HTTP instead of HTTPS
- Insecure communication

🔒 **Insecure Cookies**
- Cookies without `Secure` flag
- Cookies without `HttpOnly` flag
- Cookies without `SameSite` attribute

🔒 **Mixed Content**
- HTTPS pages loading HTTP resources

#### Configuration

```javascript
{
    'ssl-tls': {
        enabled: true,
        requireHTTPS: true,             // Flag HTTP usage
        minTLSVersion: '1.2',           // Minimum TLS version
        requireSecureCookies: true,     // Flag insecure cookies
        allowLocalhost: true            // Allow HTTP on localhost
    }
}
```

#### Examples

**🔴 Critical Finding**:
```javascript
// Using HTTP instead of HTTPS
const response = await request.get('http://api.example.com/users');
```

**🟠 High Finding**:
```javascript
// Cookie without Secure flag
const response = await request.get('https://api.example.com/login');
// response.headers['set-cookie'] = 'session=abc123; Path=/'
// Missing: Secure, HttpOnly, SameSite
```

**✅ Secure**:
```javascript
// HTTPS with secure cookies
const response = await request.get('https://api.example.com/login');
// response.headers['set-cookie'] = 'session=abc123; Secure; HttpOnly; SameSite=Strict; Path=/'
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `http-usage` | critical | CWE-319 | HTTP used instead of HTTPS |
| `outdated-tls` | high | CWE-326 | TLS version too old |
| `insecure-cookies` | high | CWE-614 | Cookies without Secure/HttpOnly flags |
| `mixed-content` | medium | CWE-319 | HTTPS page loading HTTP resources |

---

### Security Headers

**Check ID**: `headers`
**CWE**: CWE-693, CWE-1021, CWE-942

Validates presence and configuration of security headers.

#### What It Detects

🔒 **Missing Security Headers**
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY/SAMEORIGIN`
- `Content-Security-Policy`
- `Referrer-Policy`

🔒 **Misconfigured Headers**
- Weak CSP policies
- Permissive CORS configuration

🔒 **CORS Issues**
- `Access-Control-Allow-Origin: *` (allowing all origins)

#### Configuration

```javascript
{
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
```

#### Examples

**🟠 High Finding**:
```javascript
// Missing security headers
const response = await request.get('https://api.example.com/users');
// response.headers has no security headers
```

**🟡 Medium Finding**:
```javascript
// Weak CSP policy
const response = await request.get('https://api.example.com/users');
// response.headers['content-security-policy'] = "default-src *"
// Too permissive!
```

**✅ Secure**:
```javascript
const response = await request.get('https://api.example.com/users');
// response.headers = {
//     'strict-transport-security': 'max-age=31536000; includeSubDomains',
//     'x-content-type-options': 'nosniff',
//     'x-frame-options': 'DENY',
//     'content-security-policy': "default-src 'self'",
//     'referrer-policy': 'no-referrer'
// }
```

#### Findings

| Type | Severity | CWE | Description |
|------|----------|-----|-------------|
| `missing-security-header` | high | CWE-693 | Required security header missing |
| `misconfigured-header` | medium | CWE-693 | Header present but value incorrect |
| `weak-csp` | medium | CWE-1021 | Content Security Policy too permissive |
| `permissive-cors` | high | CWE-942 | CORS allows all origins |
| `missing-hsts` | high | CWE-319 | HSTS header missing on HTTPS endpoint |

---

## Configuration

### Complete Configuration Example

```javascript
export default {
    security: {
        enabled: true,
        checks: {
            'sensitive-data': {
                enabled: true,
                checkPatterns: {
                    password: true,
                    apiKey: true,
                    token: true,
                    ssn: true,
                    creditCard: true
                }
            },
            'authentication': {
                enabled: true,
                requireAuth: true,
                preferredScheme: 'bearer',
                publicEndpoints: ['/health', '/ping', '/docs'],
                flagWeakAuth: true
            },
            'authorization': {
                enabled: true,
                checkIDOR: true,
                requireRoleHeader: false,
                flagPrivilegeEscalation: true,
                sensitiveResources: ['admin', 'users', 'accounts', 'settings']
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

    // Threshold enforcement
    thresholds: {
        securityFindings: {
            critical: 0,   // Fail on any critical findings
            high: 0,       // Fail on any high findings
            medium: 5,     // Allow up to 5 medium findings
            low: Infinity  // Allow any number of low findings
        }
    }
};
```

### Severity Levels

- **critical**: Immediate security risk, requires urgent attention
- **high**: Significant security issue, should be fixed soon
- **medium**: Moderate security concern, plan to address
- **low**: Minor security suggestion, can be addressed later

### Threshold Enforcement

Configure thresholds to fail builds in CI/CD:

```javascript
thresholds: {
    securityFindings: {
        critical: 0,   // Block deployment with any critical findings
        high: 0        // Block deployment with any high findings
    }
}
```

When thresholds are exceeded, the test run exits with code 1.

---

## Finding Reference

### Viewing Findings

**Console Output**:
```
Security:
  🔴 2 critical findings
  🟠 5 high findings
  🟡 3 medium findings
```

**JSON Output** (`.iudex/results/run-{timestamp}.json`):
```json
{
    "security": {
        "findings": [
            {
                "check": "sensitive-data",
                "type": "password-exposure",
                "severity": "critical",
                "title": "Password Exposed in Response",
                "description": "Password field detected in API response body",
                "endpoint": "/api/users",
                "method": "POST",
                "location": "response.body.password",
                "evidence": "***",
                "cwe": "CWE-200: Exposure of Sensitive Information",
                "remediation": "Remove password field from API response. Use separate endpoint for password changes.",
                "suite": "User API Tests",
                "test": "Create user"
            }
        ]
    }
}
```

### Finding Structure

Every finding includes:

- **check**: Which security check detected it
- **type**: Specific finding type
- **severity**: critical, high, medium, or low
- **title**: Short description
- **description**: Detailed explanation
- **endpoint**: API endpoint where finding occurred
- **method**: HTTP method used
- **location**: Where in request/response the issue is
- **evidence**: Sample of the problematic data (sanitized)
- **cwe**: Common Weakness Enumeration reference
- **remediation**: How to fix the issue
- **suite/test**: Test context (optional)

---

## Remediation Guide

### Quick Remediation Checklist

#### Sensitive Data Exposure
- [ ] Remove password fields from API responses
- [ ] Use separate endpoints for sensitive operations
- [ ] Implement field filtering in API responses
- [ ] Review logging to ensure no sensitive data is logged

#### Authentication
- [ ] Require authentication on all protected endpoints
- [ ] Use HTTPS for all API communication
- [ ] Implement bearer token authentication (preferred)
- [ ] Never send credentials in URL query parameters

#### Authorization
- [ ] Implement resource ownership checks
- [ ] Verify user permissions before allowing access
- [ ] Use role-based access control (RBAC)
- [ ] Implement proper IDOR prevention

#### Rate Limiting
- [ ] Add rate limiting to all public endpoints
- [ ] Include rate limit headers in responses
- [ ] Implement different limits for authenticated vs unauthenticated users
- [ ] Monitor and adjust limits based on usage patterns

#### SSL/TLS
- [ ] Use HTTPS for all API endpoints
- [ ] Set `Secure` flag on all cookies
- [ ] Set `HttpOnly` flag on session cookies
- [ ] Set `SameSite` attribute on cookies
- [ ] Use TLS 1.2 or higher

#### Security Headers
- [ ] Add `Strict-Transport-Security` header (HSTS)
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-Frame-Options: DENY` or `SAMEORIGIN`
- [ ] Implement Content Security Policy (CSP)
- [ ] Configure CORS properly (avoid `*` for credentials)

### Common Remediation Patterns

#### Remove Sensitive Fields from Response

```javascript
// Before
app.post('/api/users', (req, res) => {
    const user = createUser(req.body);
    res.json(user);  // Includes password!
});

// After
app.post('/api/users', (req, res) => {
    const user = createUser(req.body);
    const { password, ...safeUser } = user;  // Exclude password
    res.json(safeUser);
});
```

#### Add Authentication

```javascript
// Before
app.get('/api/users/:id', (req, res) => {
    const user = getUserById(req.params.id);
    res.json(user);
});

// After
app.get('/api/users/:id', authenticate, (req, res) => {
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const user = getUserById(req.params.id);
    res.json(user);
});
```

#### Add Security Headers

```javascript
// Express.js middleware
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
});
```

#### Add Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false
});

app.use('/api/', limiter);
```

---

## Best Practices

### 1. Defense in Depth

Don't rely on a single security measure. Implement multiple layers:

```javascript
// Multiple security layers
app.use(helmet());              // Security headers
app.use(rateLimiter);           // Rate limiting
app.use(authenticate);          // Authentication
app.use(authorize);             // Authorization
app.use(validateInput);         // Input validation
app.use(sanitizeOutput);        // Output sanitization
```

### 2. Principle of Least Privilege

Only grant minimum necessary permissions:

```javascript
// Check specific permissions
if (!user.hasPermission('users:read')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
}
```

### 3. Fail Securely

When errors occur, fail to a secure state:

```javascript
try {
    const user = await getUserById(id);
    if (!user) {
        // Don't reveal whether user exists
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(user);
} catch (error) {
    // Don't leak error details
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
}
```

### 4. Security in CI/CD

Integrate security checks into your pipeline:

```yaml
# GitHub Actions example
- name: Run API Tests with Security Checks
  run: node cli/index.js run tests/**/*.test.js
  env:
    SECURITY_ENABLED: true
    FAIL_ON_CRITICAL: true
```

### 5. Regular Security Audits

- Review findings weekly
- Track trends over time
- Update security configurations as threats evolve
- Keep dependencies updated

### 6. Educate Your Team

- Share security findings in team meetings
- Document common vulnerabilities
- Conduct security training sessions
- Encourage security-first thinking

---

## FAQ

### Do security checks affect test results?

Security findings **do not fail tests** unless thresholds are exceeded. Tests can pass even with findings.

### What's the difference between critical and high severity?

- **Critical**: Immediate risk of data breach or system compromise (e.g., password exposure)
- **High**: Significant risk that should be addressed urgently (e.g., missing authentication)

### Can I disable specific checks temporarily?

Yes, set `enabled: false`:

```javascript
{
    'sensitive-data': { enabled: false }
}
```

### How do I exclude false positives?

Configure check-specific options to exclude known false positives:

```javascript
{
    'authentication': {
        publicEndpoints: ['/health', '/metrics', '/docs']
    }
}
```

### What's the performance impact?

Security checks add <5% overhead to test execution time. They run after tests complete.

### How do I create custom security checks?

Use the `addCheck()` API:

```javascript
const customCheck = {
    name: 'my-custom-check',
    async execute(request, response, endpoint) {
        const findings = [];
        // Your detection logic
        return { vulnerable: findings.length > 0, findings };
    }
};

scanner.addCheck('my-custom-check', customCheck);
```

### Can I export security reports for compliance?

Yes, findings are saved in JSON format with CWE references for compliance reporting.

### How do findings get reported?

1. **Console**: Summary counts at end of test run
2. **JSON**: Full details in `.iudex/results/run-*.json` with CWE mappings
3. **PostgreSQL**: Historical tracking (if database enabled)

---

## CWE Reference

Common Weakness Enumerations mapped by Iudex security checks:

| CWE | Description | Check |
|-----|-------------|-------|
| CWE-200 | Exposure of Sensitive Information | sensitive-data |
| CWE-287 | Improper Authentication | authentication |
| CWE-306 | Missing Authentication | authentication |
| CWE-312 | Cleartext Storage of Sensitive Information | sensitive-data |
| CWE-319 | Cleartext Transmission of Sensitive Information | ssl-tls |
| CWE-326 | Inadequate Encryption Strength | ssl-tls |
| CWE-359 | Exposure of Private Information | sensitive-data |
| CWE-598 | Information Exposure Through Query Strings | authentication |
| CWE-614 | Sensitive Cookie in HTTPS Session Without 'Secure' Attribute | ssl-tls |
| CWE-639 | Authorization Bypass Through User-Controlled Key (IDOR) | authorization |
| CWE-693 | Protection Mechanism Failure | headers |
| CWE-770 | Allocation of Resources Without Limits or Throttling | rate-limiting |
| CWE-862 | Missing Authorization | authorization |
| CWE-942 | Overly Permissive Cross-domain Whitelist | headers |
| CWE-1021 | Improper Restriction of Rendered UI Layers | headers |

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE List](https://cwe.mitre.org/data/index.html)
- [Governance Documentation](./GOVERNANCE.md)
- [Example Tests](../examples/governance-security-demo.test.js)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

**Questions or Issues?**
File an issue at: https://github.com/anthropics/iudex/issues

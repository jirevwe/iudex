# API Governance Guide

**Version**: 1.0.0
**Last Updated**: January 27, 2026

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Governance Rules](#governance-rules)
  - [REST Standards](#rest-standards)
  - [API Versioning](#api-versioning)
  - [Naming Conventions](#naming-conventions)
  - [HTTP Methods](#http-methods)
  - [Pagination](#pagination)
- [Configuration](#configuration)
- [Violation Reference](#violation-reference)
- [Best Practices](#best-practices)
- [FAQ](#faq)

---

## Overview

The Iudex governance framework automatically validates API design best practices during test execution. It helps teams:

- **Enforce consistency** across API endpoints
- **Catch design issues** early in development
- **Improve API quality** with actionable feedback
- **Maintain standards** without manual code review

### Key Features

- ✅ **5 governance rules** covering REST, versioning, naming, HTTP methods, and pagination
- ✅ **Opt-in by design** - explicitly enable via configuration
- ✅ **Independent control** - enable/disable governance and security separately
- ✅ **Configurable severity levels** (error, warning, info)
- ✅ **Threshold enforcement** for CI/CD integration
- ✅ **Zero test impact** - violations don't fail tests unless thresholds exceeded
- ✅ **Actionable remediation** guidance for every violation

---

## Quick Start

> **Note**: Governance checks are **opt-in** and must be explicitly enabled in your configuration. They will not run unless `enabled: true` is set.

### 1. Enable Governance

Edit `iudex.config.js` to explicitly enable governance:

```javascript
export default {
    governance: {
        enabled: true,
        rules: {
            'rest-standards': { enabled: true, severity: 'error' },
            'versioning': { enabled: true, severity: 'warning' },
            'naming-conventions': { enabled: true, severity: 'info' },
            'http-methods': { enabled: true, severity: 'error' },
            'pagination': { enabled: true, severity: 'warning' }
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
Governance:
  ⚠ 15 warnings
  ✗ 3 errors

[ERROR] Governance error threshold exceeded: 3 errors (threshold: 0)
```

Detailed violations are saved to `.iudex/results/run-{timestamp}.json`.

---

## Governance Rules

### REST Standards

**Rule ID**: `rest-standards`

Validates REST API best practices including HTTP status codes, resource naming, and pagination.

#### What It Checks

✅ **Status Code Correctness**
- POST for creation → 201 Created (not 200 OK)
- PUT for update → 200 OK or 204 No Content
- DELETE → 204 No Content or 200 OK with body
- GET → 200 OK, 404 Not Found

✅ **Resource Naming**
- Resources should use plural nouns (`/users`, not `/user`)
- Hierarchical relationships should be clear (`/users/{id}/posts`)

✅ **Pagination Detection**
- Large collections should include pagination metadata

#### Configuration

```javascript
{
    'rest-standards': {
        enabled: true,
        severity: 'error'  // 'error', 'warning', 'info'
    }
}
```

#### Examples

**❌ Violation**:
```javascript
// POST returning 200 instead of 201
const response = await request.post('/api/users', {
    name: 'John Doe'
});
// response.status === 200 (should be 201)
```

**✅ Correct**:
```javascript
const response = await request.post('/api/users', {
    name: 'John Doe'
});
// response.status === 201
```

#### Violations

| Rule | Severity | Description |
|------|----------|-------------|
| `wrong-status-code` | warning | Status code doesn't match HTTP method semantics |
| `plural-resources` | info | Resource name should be plural |
| `missing-pagination` | warning | Large collection without pagination metadata |

---

### API Versioning

**Rule ID**: `versioning`

Ensures APIs include version information for backwards compatibility.

#### What It Checks

✅ **Version in URL**
- `/api/v1/users`
- `/v2/products`

✅ **Version in Headers**
- `API-Version: v1`
- `Accept-Version: 2`

✅ **Version in Accept Header**
- `Accept: application/json; version=1`

#### Configuration

```javascript
{
    'versioning': {
        enabled: true,
        severity: 'warning',
        requireVersion: true,           // Flag missing versions
        preferredLocation: null,        // 'url', 'header', 'both', or null (any OK)
        versionPattern: /v\d+/i        // Regex for version format
    }
}
```

#### Examples

**❌ Violation**:
```javascript
// No version information
const response = await request.get('/api/users');
```

**✅ Correct** (URL versioning):
```javascript
const response = await request.get('/api/v1/users');
```

**✅ Correct** (Header versioning):
```javascript
const response = await request.get('/api/users', {
    headers: { 'API-Version': 'v1' }
});
```

#### Violations

| Rule | Severity | Description |
|------|----------|-------------|
| `missing-api-version` | warning | No version information found |
| `version-in-wrong-location` | info | Version in non-preferred location |
| `incomplete-versioning` | info | Version not in both URL and headers (when both required) |

---

### Naming Conventions

**Rule ID**: `naming-conventions`

Enforces consistent resource naming across the API.

#### What It Checks

✅ **Convention Consistency**
- kebab-case: `user-profiles`
- snake_case: `user_profiles`
- camelCase: `userProfiles`

✅ **Plural Resources**
- `/users` not `/user`
- `/products` not `/product`

✅ **Abbreviations**
- Flags unclear abbreviations like `/usr`, `/pwd`

✅ **RESTful Hierarchy**
- `/users/{id}/posts` (proper hierarchy)
- `/users/posts` ❌ (missing ID between collections)

#### Configuration

```javascript
{
    'naming-conventions': {
        enabled: true,
        severity: 'info',
        convention: 'kebab-case',       // 'kebab-case', 'snake_case', 'camelCase'
        requirePlural: true,            // Enforce plural resource names
        allowAbbreviations: false,      // Flag abbreviations
        customExceptions: ['api', 'auth', 'oauth', 'v1', 'v2']
    }
}
```

#### Examples

**❌ Violations**:
```javascript
// Inconsistent naming (mixing kebab-case and camelCase)
await request.get('/api/user-profiles');  // kebab-case
await request.get('/api/userSettings');   // camelCase

// Singular resource
await request.get('/api/user');

// Missing ID in hierarchy
await request.get('/api/users/posts');  // Should be /users/{id}/posts

// Abbreviation
await request.get('/api/usr');
```

**✅ Correct**:
```javascript
// Consistent kebab-case
await request.get('/api/user-profiles');
await request.get('/api/user-settings');

// Plural resources
await request.get('/api/users');

// Proper hierarchy
await request.get('/api/users/123/posts');

// Clear naming
await request.get('/api/users');
```

#### Violations

| Rule | Severity | Description |
|------|----------|-------------|
| `inconsistent-naming` | info | Resource doesn't follow configured convention |
| `singular-resource` | info | Resource should be plural |
| `unclear-naming` | info | Resource name is abbreviated or unclear |
| `non-restful-hierarchy` | warning | Invalid parent/child relationship |

---

### HTTP Methods

**Rule ID**: `http-methods`

Validates proper HTTP method semantics and usage.

#### What It Checks

✅ **Method Semantics**
- GET/HEAD are read-only (no side effects)
- POST creates resources
- PUT replaces entire resource
- PATCH updates partial resource
- DELETE removes resource

✅ **Status Code Correctness**
- POST → 201 Created
- PUT → 200 OK or 204 No Content
- PATCH → 200 OK or 204 No Content
- DELETE → 204 No Content or 200 OK
- GET → 200 OK or 404 Not Found

✅ **PUT vs PATCH Validation**
- PUT should include full resource representation
- PATCH should include only changed fields

#### Configuration

```javascript
{
    'http-methods': {
        enabled: true,
        severity: 'error',
        enforceSemantics: true,         // Enforce method semantics
        strictStatusCodes: true         // Enforce correct status codes
    }
}
```

#### Examples

**❌ Violations**:
```javascript
// GET with side effects
const response = await request.get('/api/users/123/activate');
// Response body shows { activated: true } (side effect!)

// POST returning 200 instead of 201
const response = await request.post('/api/users', userData);
// response.status === 200 (should be 201)

// PUT with partial update (should use PATCH)
const response = await request.put('/api/users/123', {
    name: 'New Name'  // Only updating one field
});

// PATCH with full resource (should use PUT)
const response = await request.patch('/api/users/123', {
    name: 'John',
    email: 'john@example.com',
    role: 'admin',
    active: true  // All fields included
});
```

**✅ Correct**:
```javascript
// GET is read-only
const response = await request.get('/api/users/123');
// No side effects, just returns data

// POST returns 201
const response = await request.post('/api/users', userData);
// response.status === 201

// PUT replaces entire resource
const response = await request.put('/api/users/123', {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    active: true
});

// PATCH updates specific fields
const response = await request.patch('/api/users/123', {
    name: 'New Name'
});
```

#### Violations

| Rule | Severity | Description |
|------|----------|-------------|
| `unsafe-method` | error | GET/HEAD has side effects |
| `wrong-status-code` | warning | Status code doesn't match method |
| `wrong-method` | info | Wrong method for operation (PUT vs PATCH) |
| `unexpected-response` | warning | Response doesn't match request expectations |
| `unknown-method` | error | Unrecognized HTTP method |

---

### Pagination

**Rule ID**: `pagination`

Ensures large collections include proper pagination metadata.

#### What It Checks

✅ **Pagination Metadata**
- Offset-based: `total`, `limit`, `offset`, `page`
- Cursor-based: `cursor`, `next`, `previous`, `has_more`
- Link-based: `Link` header with `rel=next/prev`

✅ **Large Collections**
- Collections with >100 items (configurable) should include pagination

✅ **Pagination Consistency**
- Same pagination style across all endpoints

#### Configuration

```javascript
{
    'pagination': {
        enabled: true,
        severity: 'warning',
        threshold: 100,                 // Items before pagination required
        preferredStyle: null,           // 'offset', 'cursor', 'link', or null (any OK)
        requireMetadata: true,          // Require total count, etc.
        allowNoPagination: false        // Allow unpaginated large responses
    }
}
```

#### Examples

**❌ Violation**:
```javascript
// Large collection without pagination
const response = await request.get('/api/users');
// response.body = [... 500 users ...] (no pagination metadata)
```

**✅ Correct** (Offset pagination):
```javascript
const response = await request.get('/api/users?limit=20&offset=0');
// response.body = {
//     data: [... 20 users ...],
//     total: 500,
//     limit: 20,
//     offset: 0,
//     page: 1
// }
```

**✅ Correct** (Cursor pagination):
```javascript
const response = await request.get('/api/users?cursor=abc123&limit=20');
// response.body = {
//     data: [... 20 users ...],
//     cursor: 'abc123',
//     next_cursor: 'def456',
//     has_more: true
// }
```

**✅ Correct** (Link header):
```javascript
const response = await request.get('/api/users?page=1');
// response.headers.link = '</api/users?page=2>; rel="next", </api/users?page=10>; rel="last"'
```

#### Violations

| Rule | Severity | Description |
|------|----------|-------------|
| `missing-pagination` | warning | Large collection without pagination |
| `incomplete-pagination-metadata` | info | Missing pagination fields |
| `inconsistent-pagination-style` | info | Mixed pagination approaches |
| `invalid-pagination-values` | error | Negative offset, invalid cursor |

---

## Configuration

### Complete Configuration Example

```javascript
export default {
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
                preferredLocation: null,  // null = any location OK
                versionPattern: /v\d+/i
            },
            'naming-conventions': {
                enabled: true,
                severity: 'info',
                convention: 'kebab-case',
                requirePlural: true,
                allowAbbreviations: false,
                customExceptions: ['api', 'auth', 'oauth', 'v1', 'v2', 'v3']
            },
            'http-methods': {
                enabled: true,
                severity: 'error',
                enforceSemantics: true,
                strictStatusCodes: true
            },
            'pagination': {
                enabled: true,
                severity: 'warning',
                threshold: 100,
                preferredStyle: null,  // null = any style OK
                requireMetadata: true,
                allowNoPagination: false
            }
        }
    },

    // Threshold enforcement
    thresholds: {
        governanceViolations: {
            error: 0,       // Fail on any error-level violations
            warning: 10,    // Allow up to 10 warnings
            info: Infinity  // Allow any number of info violations
        }
    }
};
```

### Severity Levels

- **error**: Critical issues that should block deployment
- **warning**: Important issues that should be addressed soon
- **info**: Minor suggestions for improvement

### Threshold Enforcement

Configure thresholds to fail builds in CI/CD:

```javascript
thresholds: {
    governanceViolations: {
        error: 0,      // Fail on any errors
        warning: 10    // Allow up to 10 warnings
    }
}
```

When thresholds are exceeded, the test run exits with code 1.

---

## Violation Reference

### Viewing Violations

**Console Output**:
```
Governance:
  ⚠ 15 warnings
  ✗ 3 errors
```

**JSON Output** (`.iudex/results/run-{timestamp}.json`):
```json
{
    "governance": {
        "violations": [
            {
                "rule": "rest-standards",
                "category": "wrong-status-code",
                "severity": "warning",
                "message": "POST for resource creation should return 201 Created, not 200 OK",
                "endpoint": "/api/users",
                "method": "POST",
                "location": "response.status",
                "suite": "User API Tests",
                "test": "Create user",
                "remediation": "Change response status to 201 for successful resource creation"
            }
        ]
    }
}
```

### Violation Structure

Every violation includes:

- **rule**: Which governance rule detected it
- **category**: Specific violation type
- **severity**: error, warning, or info
- **message**: Human-readable description
- **endpoint**: API endpoint where violation occurred
- **method**: HTTP method used
- **location**: Where in request/response the issue is
- **remediation**: How to fix the violation
- **suite/test**: Test context (optional)

---

## Best Practices

### 1. Start with Warnings

Don't enable all rules with `severity: 'error'` immediately. Start with warnings to understand your API's current state:

```javascript
governance: {
    rules: {
        'rest-standards': { enabled: true, severity: 'warning' },
        'versioning': { enabled: true, severity: 'warning' },
        'naming-conventions': { enabled: true, severity: 'info' }
    }
}
```

### 2. Gradual Adoption

Enable rules one at a time:

1. **Week 1**: Enable with `severity: 'info'`, review violations
2. **Week 2**: Fix critical violations, upgrade to `severity: 'warning'`
3. **Week 3**: Fix remaining violations, upgrade to `severity: 'error'`
4. **Week 4**: Enable thresholds for CI/CD

### 3. Use Custom Exceptions

Exclude known legacy endpoints or special cases:

```javascript
{
    'naming-conventions': {
        customExceptions: ['api', 'auth', 'legacy', 'v1', 'internal']
    }
}
```

### 4. CI/CD Integration

Configure thresholds for CI/CD pipelines:

```javascript
thresholds: {
    governanceViolations: {
        error: 0,      // Block merges with any errors
        warning: 5     // Allow up to 5 warnings (temporary)
    }
}
```

### 5. Monitor Trends

Track governance violations over time:

```bash
# View historical results
ls .iudex/results/
cat .iudex/results/run-2026-01-27T10-00-00.json | jq '.governance.violations | length'
```

### 6. Team Education

Use violations as teaching moments:

1. Review violations in code review
2. Share remediation guidance with team
3. Update team wiki with examples
4. Discuss patterns in team meetings

---

## FAQ

### How do governance checks affect test results?

Governance violations **do not fail tests** unless thresholds are exceeded. Tests can pass even with violations.

### Can I disable specific rules temporarily?

Yes, set `enabled: false`:

```javascript
{
    'naming-conventions': { enabled: false }
}
```

### How do I exclude specific endpoints?

Use `customExceptions` in individual rules or skip governance for specific tests (feature coming soon).

### What's the performance impact?

Governance checks add <5% overhead to test execution time. They run after tests complete and don't block execution.

### Can I create custom rules?

Yes! Use the `addRule()` API:

```javascript
import { GovernanceEngine } from './governance/engine.js';

const customRule = {
    name: 'my-custom-rule',
    async validate(request, response, endpoint) {
        const violations = [];
        // Your validation logic
        return { passed: violations.length === 0, violations };
    }
};

engine.addRule('my-custom-rule', customRule);
```

### How do violations get reported?

1. **Console**: Summary counts at end of test run
2. **JSON**: Full details in `.iudex/results/run-*.json`
3. **PostgreSQL**: Historical tracking (if database enabled)

### Can I use governance without Iudex tests?

The governance engine can be used standalone, but it's designed to work with Iudex's HTTP client and test runner.

---

## Additional Resources

- [Security Documentation](./SECURITY.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Example Tests](../examples/governance-security-demo.test.js)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

---

**Questions or Issues?**
File an issue at: https://github.com/anthropics/iudex/issues

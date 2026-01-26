# Test ID Proposal - Human-Readable Slugs

## Problem Statement
Current test identity relies on SHA256 hash of `(name + description)`. When you rename a test, it creates a new identity and loses historical tracking.

## Proposed Solution
Add optional **human-readable slugs** as stable test identifiers that persist across renames.

---

## API Design

### Option 1: Test-Level ID (Simple)

```javascript
import { describe, test, expect } from 'iudex';

describe('SaaS User Onboarding', () => {

  test('should accept terms and conditions', async (context) => {
    // Test implementation
  }, {
    id: 'saas.users.onboarding.accept_terms_and_conditions'
  });

  test('should verify email address', async (context) => {
    // Test implementation
  }, {
    id: 'saas.users.onboarding.verify_email'
  });

});

describe('SaaS Notifications', () => {

  test('should set notification channels', async (context) => {
    // Test implementation
  }, {
    id: 'saas.notifications.set_notification_channels'
  });

  test('should mute specific channels', async (context) => {
    // Test implementation
  }, {
    id: 'saas.notifications.mute_channels'
  });

});
```

**Benefits:**
- ✅ Simple, explicit test IDs
- ✅ Opt-in (tests without IDs use hash)
- ✅ Hierarchical namespace
- ✅ Easy to search and filter

**Tradeoffs:**
- ⚠️ Requires manual ID assignment
- ⚠️ Need to ensure uniqueness
- ⚠️ More verbose

---

### Option 2: Suite-Level Prefix (DRY)

```javascript
import { describe, test, expect } from 'iudex';

describe('SaaS User Onboarding', {
  prefix: 'saas.users.onboarding'
}, () => {

  test('should accept terms and conditions', async (context) => {
    // Test implementation
  }, {
    id: 'accept_terms_and_conditions'  // → saas.users.onboarding.accept_terms_and_conditions
  });

  test('should verify email address', async (context) => {
    // Test implementation
  }, {
    id: 'verify_email'  // → saas.users.onboarding.verify_email
  });

});

describe('SaaS Notifications', {
  prefix: 'saas.notifications'
}, () => {

  test('should set notification channels', async (context) => {
    // Test implementation
  }, {
    id: 'set_notification_channels'  // → saas.notifications.set_notification_channels
  });

});
```

**Benefits:**
- ✅ Less repetition (DRY)
- ✅ Clear hierarchy
- ✅ Shorter test IDs

**Tradeoffs:**
- ⚠️ Need to track prefix context
- ⚠️ Slightly more complex implementation

---

### Option 3: Auto-Generated from Name (Hybrid)

```javascript
import { describe, test, expect } from 'iudex';

describe('SaaS User Onboarding', {
  prefix: 'saas.users.onboarding'
}, () => {

  // Auto-generates ID from name if not provided
  test('should accept terms and conditions', async (context) => {
    // ID: saas.users.onboarding.should_accept_terms_and_conditions
  });

  // Or provide explicit ID
  test('should verify email address', async (context) => {
    // ID: saas.users.onboarding.verify_email
  }, {
    id: 'verify_email'
  });

});
```

**Benefits:**
- ✅ Works without manual IDs
- ✅ Can override when needed
- ✅ Best of both worlds

**Tradeoffs:**
- ⚠️ Auto-generated IDs change if test name changes
- ⚠️ Less control over naming

---

### Option 4: File-Based Auto-Prefix (Zero Config)

```javascript
// File: tests/saas/users/onboarding.test.js
import { describe, test, expect } from 'iudex';

// Auto-prefix from file path: saas.users.onboarding

describe('User Onboarding', () => {

  test('should accept terms and conditions', async (context) => {
    // ID: saas.users.onboarding.should_accept_terms_and_conditions
  }, {
    id: 'accept_terms'  // → saas.users.onboarding.accept_terms
  });

});
```

**Benefits:**
- ✅ Zero configuration needed
- ✅ IDs match file structure
- ✅ Natural organization

**Tradeoffs:**
- ⚠️ File renames break test IDs
- ⚠️ Less explicit

---

## Recommended Approach: **Option 1 + Option 2 Hybrid**

```javascript
import { describe, test, expect } from 'iudex';

describe('SaaS User Onboarding', {
  prefix: 'saas.users.onboarding'  // Optional prefix
}, () => {

  // Explicit ID (recommended for stable tests)
  test('should accept terms and conditions', async (context) => {
    const response = await context.request.post('/api/users/accept-terms', {
      userId: 123,
      accepted: true
    });
    expect(response.status).toBe(200);
  }, {
    id: 'accept_terms',  // → saas.users.onboarding.accept_terms
    tags: ['onboarding', 'critical'],
    timeout: 5000
  });

  // Without ID - falls back to hash (for quick tests)
  test('should validate email format', async (context) => {
    // Uses hash-based identity
  });

});

// Without prefix - use full path
describe('Payment Gateway', () => {

  test('should process credit card payment', async (context) => {
    // ...
  }, {
    id: 'payments.gateway.process_credit_card'
  });

});
```

---

## Schema Changes

### Updated `tests` Table

```sql
ALTER TABLE tests ADD COLUMN test_slug VARCHAR(255);
CREATE UNIQUE INDEX idx_tests_slug ON tests(test_slug) WHERE test_slug IS NOT NULL;

-- Now we have TWO ways to identify tests:
-- 1. test_hash (auto-generated, always present)
-- 2. test_slug (optional, human-readable, stable)
```

### Test Identity Resolution Logic

```javascript
// Priority order for test identity:
// 1. If test_slug provided → use it (stable across renames)
// 2. Else → use test_hash (name + description)

async findOrCreateTest(testData) {
  const { name, description, testId, suiteName } = testData;

  // Try to find by slug first (if provided)
  if (testId) {
    let result = await this.db.query(
      `SELECT id FROM tests WHERE test_slug = $1`,
      [testId]
    );

    if (result.rows.length > 0) {
      const testDbId = result.rows[0].id;

      // Update test name if changed
      await this.db.query(
        `UPDATE tests
         SET current_name = $1,
             current_description = $2,
             last_seen_at = CURRENT_TIMESTAMP,
             total_runs = total_runs + 1
         WHERE id = $3`,
        [name, description, testDbId]
      );

      return testDbId;
    }
  }

  // Fall back to hash-based identity
  const testHash = this.generateTestHash(name, description);

  // ... existing logic ...
}
```

---

## Example Usage Patterns

### Pattern 1: Critical User Flows
```javascript
describe('Core User Flows', { prefix: 'core' }, () => {

  test('User can sign up', async (context) => {
    // ...
  }, { id: 'signup', tags: ['critical'] });

  test('User can login', async (context) => {
    // ...
  }, { id: 'login', tags: ['critical'] });

  test('User can reset password', async (context) => {
    // ...
  }, { id: 'password_reset', tags: ['critical'] });

});
```

### Pattern 2: Feature Modules
```javascript
describe('Shopping Cart', { prefix: 'cart' }, () => {

  test('Add item to cart', async (context) => {
    // ...
  }, { id: 'add_item' });

  test('Remove item from cart', async (context) => {
    // ...
  }, { id: 'remove_item' });

  test('Update item quantity', async (context) => {
    // ...
  }, { id: 'update_quantity' });

  test('Apply discount code', async (context) => {
    // ...
  }, { id: 'apply_discount' });

});
```

### Pattern 3: API Endpoint Testing
```javascript
describe('User API', { prefix: 'api.users' }, () => {

  test('GET /api/users', async (context) => {
    // ...
  }, {
    id: 'list',
    endpoint: '/api/users',
    method: 'GET'
  });

  test('POST /api/users', async (context) => {
    // ...
  }, {
    id: 'create',
    endpoint: '/api/users',
    method: 'POST'
  });

  test('GET /api/users/:id', async (context) => {
    // ...
  }, {
    id: 'get_by_id',
    endpoint: '/api/users/:id',
    method: 'GET'
  });

});
```

### Pattern 4: Multi-Environment Tests
```javascript
describe('Authentication', { prefix: 'auth' }, () => {

  test('OAuth flow completes successfully', async (context) => {
    // ...
  }, {
    id: 'oauth_flow',
    environments: ['staging', 'production']
  });

});
```

---

## Benefits of This Approach

### 1. Stable Test Identity
```javascript
// Original test
test('should accept terms and conditions', async (context) => {
  // ...
}, { id: 'saas.users.onboarding.accept_terms' });

// Renamed test - SAME ID!
test('should accept user terms of service', async (context) => {
  // ...
}, { id: 'saas.users.onboarding.accept_terms' });

// Database sees this as the SAME test
// Historical data preserved
```

### 2. Easy Filtering & Search
```javascript
// Get all onboarding tests
SELECT * FROM tests WHERE test_slug LIKE 'saas.users.onboarding.%';

// Get all notification tests
SELECT * FROM tests WHERE test_slug LIKE 'saas.notifications.%';

// Get specific test history
SELECT * FROM test_results
WHERE test_id = (SELECT id FROM tests WHERE test_slug = 'saas.users.onboarding.accept_terms')
ORDER BY created_at DESC;
```

### 3. Dashboard Organization
```javascript
// Group by namespace in dashboard
{
  "saas.users.onboarding": [
    { id: "accept_terms", status: "passed", duration: 120 },
    { id: "verify_email", status: "passed", duration: 340 }
  ],
  "saas.notifications": [
    { id: "set_channels", status: "passed", duration: 89 },
    { id: "mute_channels", status: "failed", duration: 156 }
  ]
}
```

### 4. Test Evolution Tracking
```sql
-- Track test across name changes
SELECT
  tr.test_name,
  tr.status,
  tr.created_at,
  tr.duration_ms
FROM test_results tr
JOIN tests t ON tr.test_id = t.id
WHERE t.test_slug = 'saas.users.onboarding.accept_terms'
ORDER BY tr.created_at;

-- Result shows ALL historical runs even if name changed:
-- "should accept terms and conditions"    passed  2025-11-01
-- "should accept terms and conditions"    passed  2025-11-02
-- "should accept user terms of service"   passed  2025-11-03
-- "should accept user ToS agreement"      passed  2025-11-04
```

---

## Migration Strategy

### Phase 1: Add Optional Support
```javascript
// Add test_slug column (optional)
ALTER TABLE tests ADD COLUMN test_slug VARCHAR(255);

// Both systems work:
// 1. Tests with IDs use slugs
// 2. Tests without IDs use hashes
```

### Phase 2: Update DSL
```javascript
// Update test() function signature
export function test(name, fn, options = {}) {
  const testDef = {
    name,
    fn,
    skip: false,
    only: false,
    timeout: options.timeout,
    retries: options.retries,
    tags: options.tags || [],
    testId: options.id,  // NEW: Optional test ID
    endpoint: options.endpoint,
    method: options.method,
    environments: options.environments
  };

  currentSuite.tests.push(testDef);
  return testDef;
}

// Update describe() function signature
export function describe(name, optionsOrFn, fn) {
  let options = {};
  let suiteFn = fn;

  // Handle both describe(name, fn) and describe(name, options, fn)
  if (typeof optionsOrFn === 'function') {
    suiteFn = optionsOrFn;
  } else {
    options = optionsOrFn || {};
    suiteFn = fn;
  }

  const suite = {
    name,
    tests: [],
    hooks: { beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] },
    prefix: options.prefix  // NEW: Optional prefix for test IDs
  };

  // ... rest of implementation
}
```

### Phase 3: Update Repository
```javascript
// Add slug-based lookup before hash lookup
async findOrCreateTest(testData) {
  // 1. Try slug first (if provided)
  if (testData.testId) {
    const bySlug = await this.findBySlug(testData.testId);
    if (bySlug) return bySlug;
  }

  // 2. Fall back to hash
  const hash = this.generateTestHash(testData.name, testData.description);
  return await this.findByHash(hash);
}
```

### Phase 4: Gradual Adoption
```javascript
// Developers can add IDs gradually
// Priority: Critical tests first

// High priority - add ID
test('User can purchase product', async (context) => {
  // ...
}, { id: 'core.purchase', tags: ['critical'] });

// Low priority - no ID needed
test('Footer links are clickable', async (context) => {
  // ...
});
```

---

## Naming Conventions

### Recommended Structure
```
<domain>.<module>.<submodule>.<action>

Examples:
- saas.users.onboarding.accept_terms
- saas.users.onboarding.verify_email
- saas.users.profile.update_avatar
- saas.users.profile.change_password
- saas.billing.subscriptions.create
- saas.billing.subscriptions.cancel
- saas.billing.subscriptions.upgrade
- saas.notifications.email.send
- saas.notifications.sms.send
- api.v1.users.list
- api.v1.users.create
- api.v1.users.update
- api.v1.users.delete
```

### Best Practices
- ✅ Use lowercase
- ✅ Use underscores for spaces
- ✅ Use dots for hierarchy
- ✅ Be descriptive but concise
- ✅ Group related tests
- ❌ Don't use special characters
- ❌ Don't make them too long (< 80 chars)
- ❌ Don't duplicate action in name

---

## Implementation Checklist

- [ ] Update `tests` table schema with `test_slug` column
- [ ] Add unique index on `test_slug`
- [ ] Update `test()` function to accept `id` option
- [ ] Update `describe()` function to accept `idPrefix` option
- [ ] Modify `findOrCreateTest()` to prioritize slug over hash
- [ ] Update `test_results` insert to include slug reference
- [ ] Add slug-based queries to repository
- [ ] Update console reporter to show test IDs
- [ ] Add slug search to analytics queries
- [ ] Document naming conventions
- [ ] Create migration guide for existing tests

---

## Conclusion

**Human-readable test slugs solve the evolution tracking problem** while providing:

✅ Stable test identity across renames
✅ Hierarchical organization
✅ Easy filtering and search
✅ Dashboard-friendly grouping
✅ Optional (backward compatible)
✅ Clear naming conventions

**Recommended:** Start with Option 1 + 2 Hybrid approach, allowing both explicit IDs and suite prefixes.

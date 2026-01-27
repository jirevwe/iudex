# Dashboard API Reference

This document describes the HTTP API endpoints provided by the Iudex Dashboard Server.

## Base URL

When mounted on a server, all endpoints are relative to the dashboard mount path:

```
http://localhost:3000/dashboard/api/...
```

For standalone servers:

```
http://localhost:8080/api/...
```

---

## Endpoints

### List Test Runs

Get a paginated list of available test runs with summary metadata.

**Endpoint:** `GET /api/runs`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 50 | Max number of runs to return (max: 100) |
| `cursor` | string | No | null | Opaque pagination cursor from previous response |

**Response:**

```json
{
  "runs": [
    {
      "id": "run-2026-01-27T12-30-00",
      "timestamp": "2026-01-27T12:30:00Z",
      "summary": {
        "total": 120,
        "passed": 115,
        "failed": 5,
        "skipped": 0,
        "duration": 3441
      },
      "gitInfo": {
        "branch": "main",
        "commitSha": "e10b1c3",
        "commitMessage": "Add feature X"
      },
      "governance": {
        "violationCount": 112,
        "warningCount": 45
      },
      "security": {
        "findingCount": 99,
        "criticalCount": 12
      }
    }
  ],
  "latest": "run-2026-01-27T12-30-00",
  "nextCursor": "eyJ0aW1lc3RhbXAiOiIyMDI2LTAxLTI2VDEwOjE1OjAwWiJ9",
  "hasMore": true
}
```

**Fields:**

- `runs`: Array of test run summaries
  - `id`: Unique run identifier
  - `timestamp`: ISO 8601 timestamp of test run
  - `summary`: Test result summary (total, passed, failed, skipped, duration in ms)
  - `gitInfo`: Git metadata (branch, commit SHA, commit message)
  - `governance`: Governance check summary
  - `security`: Security check summary
- `latest`: ID of the most recent test run
- `nextCursor`: Opaque cursor for next page (null if no more results)
- `hasMore`: Boolean indicating if more results are available

**Pagination Example:**

```javascript
// First page
const response1 = await fetch('/api/runs?limit=50');
const data1 = await response1.json();

// Next page
if (data1.hasMore) {
  const response2 = await fetch(`/api/runs?limit=50&cursor=${data1.nextCursor}`);
  const data2 = await response2.json();
}
```

**Status Codes:**

- `200 OK`: Success
- `500 Internal Server Error`: Server error

---

### Get Run Details

Get complete details for a specific test run.

**Endpoint:** `GET /api/run/:id`

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Test run identifier (e.g., `run-2026-01-27T12-30-00`) |

**Response:**

Returns the complete test results JSON (same format as `.iudex/results/run-*.json`):

```json
{
  "suites": [
    {
      "name": "User API Tests",
      "tests": [
        {
          "name": "GET /users returns 200",
          "status": "passed",
          "duration": 145,
          "request": {
            "method": "GET",
            "url": "http://api.example.com/users",
            "headers": {}
          },
          "response": {
            "status": 200,
            "headers": {},
            "body": {}
          }
        }
      ]
    }
  ],
  "summary": {
    "total": 120,
    "passed": 115,
    "failed": 5,
    "skipped": 0,
    "duration": 3441
  },
  "governance": {
    "violations": [
      {
        "rule": "response-time-limit",
        "message": "Response time exceeded 2000ms",
        "testName": "Slow endpoint test",
        "endpoint": "/api/slow",
        "severity": "violation"
      }
    ],
    "warnings": []
  },
  "security": {
    "findings": [
      {
        "type": "missing-security-headers",
        "severity": "medium",
        "message": "Missing X-Content-Type-Options header",
        "testName": "Security headers test",
        "endpoint": "/api/data"
      }
    ]
  },
  "metadata": {
    "startTime": "2026-01-27T12:30:00Z",
    "endTime": "2026-01-27T12:30:03Z",
    "gitInfo": {
      "branch": "main",
      "commitSha": "e10b1c34567890abcdef",
      "commitMessage": "Add feature X"
    }
  }
}
```

**Status Codes:**

- `200 OK`: Success
- `404 Not Found`: Run not found
- `500 Internal Server Error`: Server error

---

### Get Analytics

Get PostgreSQL-backed analytics data (optional feature).

**Endpoint:** `GET /api/analytics`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | No | `flaky-tests` | Analytics type (see types below) |
| `limit` | integer | No | 20 | Max results to return |
| `days` | integer | No | 30 | Historical window in days |

**Analytics Types:**

- `flaky-tests`: Tests with inconsistent pass/fail rates
- `regressions`: Tests that recently started failing
- `health-scores`: Overall test suite health metrics
- `daily-stats`: Aggregated daily statistics
- `endpoint-rates`: API endpoint success rates

**Response (flaky-tests):**

```json
{
  "available": true,
  "data": [
    {
      "testName": "Authentication test",
      "testSlug": "api.auth.basic",
      "totalRuns": 50,
      "failures": 12,
      "failureRate": 0.24,
      "lastFailure": "2026-01-27T11:30:00Z"
    }
  ]
}
```

**Response (regressions):**

```json
{
  "available": true,
  "data": [
    {
      "testName": "User creation test",
      "testSlug": "api.users.create",
      "failureTimestamp": "2026-01-27T10:00:00Z",
      "runId": "run-2026-01-27T10-00-00",
      "previousPasses": 25
    }
  ]
}
```

**Response (health-scores):**

```json
{
  "available": true,
  "data": [
    {
      "date": "2026-01-27T00:00:00Z",
      "totalTests": 120,
      "passed": 115,
      "failed": 5,
      "passRate": 95.83,
      "avgDuration": 3441
    }
  ]
}
```

**Response (daily-stats):**

```json
{
  "available": true,
  "data": [
    {
      "date": "2026-01-27T00:00:00Z",
      "totalRuns": 10,
      "totalTests": 1200,
      "passed": 1150,
      "failed": 50,
      "skipped": 0,
      "avgDuration": 3500
    }
  ]
}
```

**Response (endpoint-rates):**

```json
{
  "available": true,
  "data": [
    {
      "endpoint": "/api/users",
      "method": "GET",
      "totalCalls": 50,
      "successful": 48,
      "failed": 2,
      "successRate": 96.0,
      "avgDuration": 145
    }
  ]
}
```

**Response (unavailable):**

```json
{
  "available": false,
  "error": "Analytics not configured"
}
```

**Status Codes:**

- `200 OK`: Success
- `404 Not Found`: Analytics not configured
- `503 Service Unavailable`: Analytics temporarily unavailable

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Errors:**

- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Unexpected server error
- `503 Service Unavailable`: Service temporarily unavailable

---

## Rate Limiting

The dashboard server does not implement rate limiting by default. Consider adding rate limiting middleware if exposing publicly:

**Express Example:**

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/dashboard', limiter, createExpressDashboard(config));
```

---

## CORS

CORS is not enabled by default. Enable if needed:

**Express Example:**

```javascript
import cors from 'cors';

app.use('/dashboard', cors({
  origin: 'https://app.example.com',
  credentials: true
}));
```

---

## Caching

### Recommended Cache Headers

- `/api/runs`: `Cache-Control: no-cache` (always fresh)
- `/api/run/:id`: `Cache-Control: public, max-age=3600` (1 hour)
- `/api/analytics`: `Cache-Control: public, max-age=300` (5 minutes)
- Static assets: `Cache-Control: public, max-age=3600` (1 hour)

### Custom Caching

Override cache headers if needed:

```javascript
app.use('/dashboard', createExpressDashboard(config));

// Override cache headers
app.use('/dashboard/api/runs', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
});
```

---

## Integration Examples

### Fetch Runs in JavaScript

```javascript
async function loadRuns() {
  const response = await fetch('/dashboard/api/runs?limit=10');
  const data = await response.json();

  console.log(`Found ${data.runs.length} runs`);
  console.log(`Latest: ${data.latest}`);

  return data;
}
```

### Load Specific Run

```javascript
async function loadRun(runId) {
  const response = await fetch(`/dashboard/api/run/${runId}`);
  if (!response.ok) {
    throw new Error(`Failed to load run: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Tests: ${data.summary.total}`);
  console.log(`Passed: ${data.summary.passed}`);

  return data;
}
```

### Check Analytics Availability

```javascript
async function checkAnalytics() {
  const response = await fetch('/dashboard/api/analytics?type=flaky-tests');
  const data = await response.json();

  if (data.available) {
    console.log(`Flaky tests: ${data.data.length}`);
  } else {
    console.log('Analytics not available');
  }

  return data;
}
```

---

## Cursor-Based Pagination

The `/api/runs` endpoint uses cursor-based pagination for efficient traversal of large result sets.

### How It Works

1. **First Request:** No cursor needed
   ```javascript
   GET /api/runs?limit=50
   ```

2. **Response:** Contains `nextCursor` and `hasMore`
   ```json
   {
     "runs": [...],
     "nextCursor": "eyJ0aW1lc3RhbXAi...",
     "hasMore": true
   }
   ```

3. **Next Request:** Use `nextCursor` from previous response
   ```javascript
   GET /api/runs?limit=50&cursor=eyJ0aW1lc3RhbXAi...
   ```

4. **Last Page:** `hasMore` is `false` and `nextCursor` is `null`

### Cursor Format

Cursors are base64-encoded JSON objects containing pagination state. **Do not** parse or modify cursors - treat them as opaque tokens.

### Example: Load All Runs

```javascript
async function loadAllRuns() {
  const allRuns = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const url = cursor
      ? `/api/runs?limit=50&cursor=${cursor}`
      : '/api/runs?limit=50';

    const response = await fetch(url);
    const data = await response.json();

    allRuns.push(...data.runs);
    cursor = data.nextCursor;
    hasMore = data.hasMore;
  }

  return allRuns;
}
```

---

## PostgreSQL Analytics Setup

Analytics endpoints require PostgreSQL with the appropriate schema.

### Prerequisites

1. PostgreSQL database with test results
2. Schema matching Iudex's test results table
3. Database connection string

### Configuration

```javascript
createExpressDashboard({
  resultsDir: '.iudex/results',
  apiEndpoint: process.env.DATABASE_URL
});
```

### Schema Requirements

The analytics queries expect these columns:

```sql
test_results (
  test_name TEXT,
  test_slug TEXT,
  status TEXT,
  timestamp TIMESTAMP,
  duration INTEGER,
  run_id TEXT,
  endpoint TEXT,
  method TEXT
)
```

See [POSTGRES_INTEGRATION.md](./POSTGRES_INTEGRATION.md) for full setup instructions.

---

## Support

- **Issues:** https://github.com/anthropics/iudex/issues
- **Documentation:** https://github.com/anthropics/iudex/docs

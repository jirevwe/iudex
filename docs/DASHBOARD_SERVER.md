# Dashboard Server Guide

The Iudex Dashboard Server provides a web interface for visualizing test results, governance violations, and security findings. This guide shows you how to mount the dashboard on your application server or generate a static version for GitHub Pages.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Express Integration](#express-integration)
4. [Fastify Integration](#fastify-integration)
5. [Raw Node.js HTTP](#raw-nodejs-http)
6. [Static Generation (GitHub Pages)](#static-generation-github-pages)
7. [Configuration Options](#configuration-options)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Iudex Dashboard can run in two modes:

### Server Mode
Mount the dashboard on your Express, Fastify, or raw Node.js HTTP server. The dashboard serves test results from the `.iudex/results/` directory through API endpoints.

**Benefits:**
- Real-time data (no rebuild needed)
- Works with existing authentication
- Can integrate with PostgreSQL analytics

### Static Mode
Generate a standalone HTML/CSS/JS dashboard that can be deployed to GitHub Pages, Netlify, or any static hosting.

**Benefits:**
- No server required
- Fast CDN delivery
- Version control friendly

---

## Quick Start

### Express Server

```javascript
import express from 'express';
import { createExpressDashboard } from 'iudex/server/express';

const app = express();

// Your API routes
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

// Mount Iudex dashboard
app.use('/test-dashboard', createExpressDashboard({
  resultsDir: '.iudex/results',
  title: 'My API Tests'
}));

app.listen(3000, () => {
  console.log('Server: http://localhost:3000');
  console.log('Dashboard: http://localhost:3000/test-dashboard');
});
```

---

## Express Integration

### Installation

The dashboard is included with Iudex. No additional installation needed.

### Basic Setup

```javascript
import express from 'express';
import { createExpressDashboard } from 'iudex/server/express';

const app = express();

app.use('/dashboard', createExpressDashboard({
  resultsDir: '.iudex/results',
  title: 'Test Dashboard',
  theme: 'light'
}));
```

### With Authentication

```javascript
import { createExpressDashboard } from 'iudex/server/express';
import { authenticate } from './auth.js';

// Protect dashboard with authentication
app.use('/dashboard',
  authenticate,
  createExpressDashboard({
    resultsDir: '.iudex/results'
  })
);
```

### With CORS

```javascript
import cors from 'cors';
import { createExpressDashboard } from 'iudex/server/express';

// Enable CORS for dashboard
app.use('/dashboard',
  cors({
    origin: 'https://app.example.com',
    credentials: true
  }),
  createExpressDashboard({
    resultsDir: '.iudex/results'
  })
);
```

---

## Fastify Integration

### Basic Setup

```javascript
import Fastify from 'fastify';
import { createFastifyDashboard } from 'iudex/server/fastify';

const fastify = Fastify({ logger: true });

// Your API routes
fastify.get('/api/users', async (request, reply) => {
  return { users: [] };
});

// Register Iudex dashboard
await fastify.register(createFastifyDashboard, {
  prefix: '/test-dashboard',
  resultsDir: '.iudex/results',
  title: 'API Test Dashboard'
});

await fastify.listen({ port: 3000 });
console.log('Dashboard at http://localhost:3000/test-dashboard');
```

### With Authentication Hook

```javascript
import { createFastifyDashboard } from 'iudex/server/fastify';

// Register dashboard with authentication
await fastify.register(async (instance) => {
  // Add authentication hook
  instance.addHook('onRequest', async (request, reply) => {
    await authenticate(request, reply);
  });

  // Register dashboard
  await instance.register(createFastifyDashboard, {
    prefix: '/dashboard',
    resultsDir: '.iudex/results'
  });
});
```

---

## Raw Node.js HTTP

### Standalone Server

```javascript
import { createStandaloneDashboardServer } from 'iudex/server/http';

const server = createStandaloneDashboardServer({
  resultsDir: '.iudex/results',
  title: 'Test Dashboard'
});

server.listen(8080, () => {
  console.log('Dashboard server running on http://localhost:8080');
});
```

### As Request Handler

```javascript
import http from 'http';
import { createHttpDashboard } from 'iudex/server/http';

const dashboardHandler = createHttpDashboard({
  resultsDir: '.iudex/results'
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/dashboard')) {
    // Strip /dashboard prefix
    req.url = req.url.replace('/dashboard', '');
    return dashboardHandler(req, res);
  }

  // Your other routes
  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000);
```

---

## Static Generation (GitHub Pages)

### Configuration

Add the GitHub Pages reporter to your `iudex.config.js`:

```javascript
export default {
  reporters: [
    'console',
    'json',
    {
      reporter: 'github-pages',
      config: {
        outputDir: 'docs/test-reports',
        title: 'API Test Dashboard',
        includeHistorical: true,
        historicalLimit: 100
      }
    }
  ]
};
```

### Generate Dashboard

Run your tests to generate the static dashboard:

```bash
npm run test:integration
```

The dashboard will be generated in `docs/test-reports/`.

### Deploy to GitHub Pages

#### Option 1: Docs Directory

1. Set `outputDir: 'docs'` in config
2. Push to GitHub
3. Enable GitHub Pages from Settings → Pages
4. Select "Deploy from branch" → `main` → `/docs`

#### Option 2: gh-pages Branch

```bash
# Generate dashboard
npm run test:integration

# Deploy to gh-pages branch
git add .iudex/dashboard
git commit -m "Update dashboard"
git subtree push --prefix .iudex/dashboard origin gh-pages
```

### Local Preview

```bash
# Python
cd docs/test-reports
python3 -m http.server 8000

# Node.js
npx http-server docs/test-reports -p 8000
```

Visit `http://localhost:8000`

---

## Configuration Options

### Common Options

All handlers accept these configuration options:

```javascript
{
  // Required
  resultsDir: '.iudex/results',  // Path to test results directory

  // Optional
  title: 'Iudex Test Dashboard',  // Dashboard title
  theme: 'light',                  // Theme: 'light' or 'dark'
  apiEndpoint: null,               // PostgreSQL analytics API (optional)
  historicalLimit: 50              // Max historical runs to show
}
```

### GitHub Pages Reporter Options

```javascript
{
  reporter: 'github-pages',
  config: {
    outputDir: '.iudex/dashboard',   // Output directory
    title: 'Test Dashboard',          // Dashboard title
    includeHistorical: true,          // Include historical runs
    historicalLimit: 50,              // Max runs to include
    apiEndpoint: null                 // Optional analytics API
  }
}
```

---

## Security Considerations

### Authentication

The dashboard does **not** include built-in authentication. Always add your own:

**Express:**
```javascript
app.use('/dashboard', authenticate, createExpressDashboard(config));
```

**Fastify:**
```javascript
instance.addHook('onRequest', authenticate);
await instance.register(createFastifyDashboard, config);
```

### Network Restrictions

Restrict dashboard access to internal networks:

```javascript
// Express example
app.use('/dashboard', (req, res, next) => {
  const allowedIPs = ['10.0.0.0/8', '192.168.0.0/16'];
  if (!isAllowedIP(req.ip, allowedIPs)) {
    return res.status(403).send('Forbidden');
  }
  next();
});
```

### Sensitive Data

Test results may contain sensitive data (tokens, passwords, PII). Consider:

1. **Redact sensitive fields** in test output
2. **Use authentication** to restrict access
3. **Deploy internally** rather than publicly
4. **Review test data** before deploying to GitHub Pages

---

## Troubleshooting

### Dashboard Shows 404

**Problem:** Dashboard returns 404 at the mounted path.

**Solutions:**
- Verify the mount path: `http://localhost:3000/dashboard` (no trailing slash)
- Check server logs for errors
- Ensure `.iudex/results/` directory exists

### No Test Runs Displayed

**Problem:** Dashboard loads but shows "No test runs found".

**Solutions:**
- Run tests first: `npm run test:integration`
- Check `.iudex/results/` contains JSON files
- Verify `resultsDir` config points to correct directory

### CSS/JS Not Loading

**Problem:** Dashboard loads but has no styling or functionality.

**Solutions:**
- Check browser console for 404 errors
- Verify template files exist in `node_modules/iudex/templates/dashboard/`
- Clear browser cache

### Analytics Unavailable

**Problem:** "Analytics not configured" message.

**Solutions:**
- Analytics requires PostgreSQL setup (optional feature)
- Add `apiEndpoint` config if you want analytics
- Analytics gracefully degrades if not configured

### Static Dashboard Not Working

**Problem:** Static dashboard shows errors or blank page.

**Solutions:**
- Ensure `data/runs.json` exists in output directory
- Check browser console for CORS errors
- Serve from HTTP server, not `file://` protocol

---

## API Reference

See [DASHBOARD_API.md](./DASHBOARD_API.md) for detailed API endpoint documentation.

---

## Support

- **Issues:** https://github.com/anthropics/iudex/issues
- **Documentation:** https://github.com/anthropics/iudex/docs
- **Examples:** https://github.com/anthropics/iudex/examples

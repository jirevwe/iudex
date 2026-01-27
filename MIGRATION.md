# Dashboard Examples Migration

## Overview

Dashboard examples have been moved to a separate repository for better organization and clearer dependency management.

## Old Location

```
iudex/
└── examples/dashboard/
    ├── express-server.js
    ├── fastify-server.js
    ├── standalone-server.js
    └── ...
```

## New Location

```
iudex-examples/
└── dashboard/
    ├── express-server.js
    ├── fastify-server.js
    ├── standalone-server.js
    └── ...
```

**Repository:** `/Users/rtukpe/Documents/dev/gotech/iudex-examples`

## Why This Change?

1. **Cleaner dependencies** - Express and Fastify are only in examples repo, not main library
2. **Better separation** - Examples use Iudex as a real dependency
3. **Easier testing** - Can test integration without conflating library and examples
4. **Clearer structure** - Main repo focuses on library code

## Using Examples

### Setup

```bash
cd /Users/rtukpe/Documents/dev/gotech/iudex-examples
npm install
```

### Run Examples

```bash
# Using npm
npm run express
npm run fastify
npm run standalone

# Using mise (recommended)
mise run express
mise run fastify
mise run standalone
```

### Test Examples

```bash
mise run test:api
mise run test:browser
```

## Development Workflow

Examples use Iudex as a **local file dependency**:

```json
{
  "dependencies": {
    "iudex": "file:../iudex"
  }
}
```

This means:

1. Changes to Iudex code are immediately available in examples
2. No manual linking or copying needed
3. Test examples to verify Iudex changes work

### Making Changes to Dashboard

1. Edit Iudex code: `iudex/server/`, `iudex/templates/dashboard/`
2. Test in examples: `cd ../iudex-examples && mise run express`
3. Visit: http://localhost:3000/test-dashboard

## Files Removed from Main Repo

- `examples/` directory
- `test-static-generator.js`
- `test-static-browser.js`
- `EXAMPLE_TEST_RESULTS.md`

These files are now in `iudex-examples/dashboard/`.

## Documentation

- **Examples README:** `iudex-examples/README.md`
- **Dashboard Guide:** `iudex/docs/DASHBOARD_SERVER.md`
- **API Reference:** `iudex/docs/DASHBOARD_API.md`
- **Claude Context:** Both repos have `.claude.md` files

## Migration Checklist

- [x] Create iudex-examples repository
- [x] Move examples to new repo
- [x] Update import paths to use package imports
- [x] Set up mise configuration
- [x] Create .claude.md in both repos
- [x] Add iudex as file: dependency
- [x] Test examples work with dependency
- [x] Delete examples from main repo
- [x] Document migration

## For Contributors

When contributing examples:

1. Clone both repositories
2. Ensure they're siblings: `dev/gotech/iudex` and `dev/gotech/iudex-examples`
3. Make changes in examples repo
4. Examples automatically use latest Iudex code
5. Submit PR to iudex-examples repo

## For Users

To use dashboard in your app:

```bash
npm install iudex
```

Then follow examples in `iudex-examples` repository or see `docs/DASHBOARD_SERVER.md`.

---

**Date:** January 27, 2026
**Migration completed successfully** ✅

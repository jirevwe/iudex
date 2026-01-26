# Skill: dev

Start development server with file watching and auto-reload.

## Metadata

- **Name**: dev
- **Category**: Development
- **Dependencies**: None
- **Requires**: Node.js

## Description

Runs the Iudex CLI in watch mode with automatic restart on file changes. Perfect for active development:
- Automatically restarts on code changes
- Shows console output immediately
- Fast feedback loop
- No need to manually restart

## Commands

```bash
# Start dev server
npm run dev

# Alternative: Use mise
# mise run dev

# Or manually:
# node --watch cli/index.js run
```

## Expected Behavior

### Startup

```
🚀 Starting Iudex in development mode...
👀 Watching for file changes...

Iudex CLI ready
> Awaiting commands...
```

### On File Change

```
🔄 File changed: core/runner.js
♻️  Restarting...
✅ Restarted successfully
```

## Usage Examples

### Basic Development
```bash
/dev
```

### Run Examples Automatically
```bash
# In watch mode, tests re-run on save
/dev
```

### Development with Tests
```bash
# Terminal 1: Dev server
/dev

# Terminal 2: Test watcher
/test-watch
```

### Development with Database
```bash
# Terminal 1: Ensure DB is ready
/db-status

# Terminal 2: Dev mode
/dev
```

## Watched Files

The dev mode watches:
- `core/**/*.js`
- `database/**/*.js`
- `reporters/**/*.js`
- `cli/**/*.js`
- `governance/**/*.js`
- `security/**/*.js`

Does NOT watch:
- `node_modules/`
- `tests/` and `*.test.js`
- `coverage/`
- `.git/`

## Features

### Auto-Restart

Files are watched for changes. When a file is saved:
1. Current process is terminated
2. New process starts with updated code
3. State is reset (no hot reload)

### Console Output

All console.log and logger output is displayed in real-time.

### Error Handling

If code has errors:
```
❌ Error loading module: SyntaxError
📝 Fix the error and save to retry
👀 Still watching...
```

The watcher continues running even if there are errors.

## Development Workflow

### Typical Session

```bash
# 1. Setup (one time)
/db-setup

# 2. Start dev mode
/dev

# 3. Make code changes
# ... edit files ...

# 4. Save file - auto restart

# 5. Test manually or watch tests in another terminal
/test-watch  # in separate terminal

# 6. Iterate

# 7. When done, validate
/validate
```

### TDD Workflow

```bash
# Terminal 1: Test watcher
/test-watch

# Terminal 2: Dev server
/dev

# Terminal 3: Your editor
```

Edit code → Tests auto-run → See results instantly

## Performance

- **Startup**: ~1-2 seconds
- **Restart**: ~0.5-1 second
- **Memory**: ~50-100 MB

## Troubleshooting

### Too Many Restarts

If files are restarting constantly:
- Check for auto-save settings in editor
- Verify you're not watching build output
- Exclude generated files

### Not Restarting

If changes don't trigger restart:
- Ensure file is in watched directories
- Check file permissions
- Verify Node.js `--watch` support (Node 18+)

### Port Already in Use

If running examples that use HTTP:
```bash
# Kill process on port
lsof -ti:3000 | xargs kill -9
```

### Out of Memory

```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## Alternative: nodemon

If Node.js `--watch` isn't available:

```bash
# Install nodemon
npm install -D nodemon

# Run with nodemon
npx nodemon cli/index.js run
```

## Related Skills

- `/test-watch` - Auto-run tests on changes
- `/examples` - Run example tests
- `/lint` - Check code quality
- `/validate` - Full validation

## Tips

1. **Split Terminal**
   - One for dev mode
   - One for test watcher
   - One for commands

2. **Save Often**
   - Changes trigger restart
   - Fast feedback loop

3. **Check Console**
   - Watch for errors
   - Monitor output
   - Debug in real-time

4. **Combine with Linting**
   - Set up editor linting
   - Catch errors before save
   - Reduce restart cycles

## Environment Variables

Dev mode respects environment settings:

```bash
# Development mode
NODE_ENV=development npm run dev

# Enable debug logging
DEBUG=* npm run dev

# Database settings
DB_ENABLED=true npm run dev
```

## CI/CD Note

This skill is for local development only. Do not use in CI:
- CI should run tests once, not watch
- Use `/test` or `/validate` instead

## Next Steps

While in dev mode:
- Make code changes
- Watch console for errors
- Run manual tests
- Check `/db-status` for data
- Use `/examples` to test manually

When done developing:
- Stop dev mode (Ctrl+C)
- Run `/validate` to ensure quality
- Commit changes

## See Also

- `package.json` - Dev script configuration
- `mise.toml` - Development environment
- `docs/IMPLEMENTATION.md` - Development guide

# Skills Verification Guide

How to verify that all skill commands work correctly.

## Automated Verification

### Run Complete Verification

```bash
./skills/verify-skills.sh
```

This script checks:
- ✅ Core dependencies (Node.js, npm, Docker, PostgreSQL)
- ✅ Project structure (files and directories)
- ✅ Test commands (npm test, test:unit)
- ✅ Database tasks (mise db_setup, db_reset, db_status)
- ✅ Code quality tools (ESLint)
- ✅ Development tools (Node.js watch mode)
- ✅ Skill definition files

### Expected Output

```
🔍 Verifying Iudex Skills...

📋 1. Core Dependencies
  Checking: Node.js installed... ✅
  Checking: npm installed... ✅
  Checking: Docker installed... ✅
  Checking: PostgreSQL client... ✅

...

📈 Summary
Total Checks:    28
Passed:          28
Failed:          0
Warnings:        0

Pass Rate:       100%

✅ All critical checks passed!
```

## Manual Verification

If you prefer to verify manually or troubleshoot specific skills:

### 1. Test Skills

```bash
# Verify npm test works
npm test

# Verify unit tests
npm run test:unit

# Verify integration tests
npm run test:integration

# Check test scripts exist
grep "test" package.json
```

**Expected**: All tests pass, scripts are defined in package.json

### 2. Database Skills

```bash
# Check mise is installed
mise --version

# List all mise tasks
mise tasks

# Verify db tasks exist
mise tasks | grep db

# Try database status (safe, read-only)
mise run db_status
```

**Expected**: Tasks listed, db_status shows connection info

### 3. Lint Skills

```bash
# Check ESLint is installed
npx eslint --version

# Run lint
npm run lint

# Check eslintrc exists
ls -la .eslintrc.js
```

**Expected**: ESLint runs, shows results

### 4. Development Skills

```bash
# Check Node.js watch support
node --help | grep watch

# Verify CLI exists
ls -la cli/index.js

# Check package.json dev script
grep "dev" package.json
```

**Expected**: Watch flag available, files exist

### 5. Skill Definitions

```bash
# List all skill definitions
ls -la skills/definitions/

# Check README exists
cat skills/README.md

# Count skills
ls skills/definitions/*.md | wc -l
```

**Expected**: 8+ skill definition files

## Verify Individual Skills

### Test a Specific Skill

```bash
# 1. Read the skill definition
cat skills/definitions/test.md

# 2. Find the "Commands" section

# 3. Run the command manually
npm test

# 4. Verify expected behavior matches
```

### Skill Verification Checklist

For each skill, verify:

- [ ] **Commands exist** - All referenced commands are available
- [ ] **Commands execute** - Commands run without errors
- [ ] **Expected output** - Output matches documentation
- [ ] **Prerequisites met** - Required dependencies installed
- [ ] **Error handling** - Graceful failures with clear messages

## Common Issues & Solutions

### Issue: "Command not found"

**Symptom**: `bash: command: command not found`

**Solutions**:
```bash
# For npm scripts
npm install

# For mise tasks
brew install mise  # macOS
# or: curl https://mise.run | sh

# For Docker
brew install docker  # macOS
# or install Docker Desktop

# For PostgreSQL
brew install postgresql  # macOS
```

### Issue: "Permission denied"

**Symptom**: `Permission denied: ./skills/verify-skills.sh`

**Solution**:
```bash
chmod +x skills/verify-skills.sh
chmod +x .mise-tasks/*
```

### Issue: "Module not found"

**Symptom**: `Cannot find module 'eslint'`

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Docker not running"

**Symptom**: `Cannot connect to Docker daemon`

**Solution**:
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker ps
```

### Issue: "Database connection failed"

**Symptom**: `Connection refused - localhost:5432`

**Solution**:
```bash
# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Check status
mise run db_status
```

## Continuous Verification

### Pre-Commit Hook

Add verification to git pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Verifying skills..."
./skills/verify-skills.sh

if [ $? -ne 0 ]; then
  echo "❌ Skill verification failed"
  exit 1
fi

echo "✅ Skills verified"
```

### CI Integration

Add to CI pipeline:

```yaml
# .github/workflows/verify-skills.yml
name: Verify Skills

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - name: Install Dependencies
        run: npm install

      - name: Verify Skills
        run: ./skills/verify-skills.sh
```

### Scheduled Verification

Run verification periodically:

```bash
# Add to crontab (daily at 9am)
0 9 * * * cd /path/to/iudex && ./skills/verify-skills.sh
```

## Testing New Skills

When adding a new skill:

### 1. Create Definition

```bash
# Create skill file
touch skills/definitions/my-new-skill.md

# Follow template structure
cat skills/definitions/test.md  # Use as reference
```

### 2. Add to Verification Script

```bash
# Edit verify-skills.sh
nano skills/verify-skills.sh

# Add check for new skill
check_file_exists "my-skill" "skills/definitions/my-new-skill.md" "my-new-skill definition"
```

### 3. Test Commands

```bash
# Extract commands from skill definition
grep "^\`\`\`bash" -A 10 skills/definitions/my-new-skill.md

# Run each command manually
# Verify they work as documented
```

### 4. Run Full Verification

```bash
./skills/verify-skills.sh
```

### 5. Document in Catalog

```bash
# Update catalog
nano skills/SKILL_CATALOG.md

# Add to quick reference table
# Add to category section
# Add to workflows if applicable
```

## Verification Levels

### Level 1: Syntax Check (Fast)
```bash
# Just check files and commands exist
./skills/verify-skills.sh
```
**Time**: ~1 second

### Level 2: Command Execution (Medium)
```bash
# Run help/version commands
npm test --help
mise tasks
npx eslint --version
```
**Time**: ~5 seconds

### Level 3: Full Execution (Slow)
```bash
# Actually run the skills
npm run lint
npm run test:unit
mise run db_status
```
**Time**: ~30 seconds

### Level 4: Integration (Complete)
```bash
# Full validation including integration tests
npm test
./skills/verify-skills.sh
```
**Time**: ~2 minutes

## Verification Matrix

| Skill | File Exists | Command Exists | Command Runs | Output Correct | Notes |
|-------|-------------|----------------|--------------|----------------|-------|
| test | ✅ | ✅ | ✅ | ✅ | Requires Docker |
| test-unit | ✅ | ✅ | ✅ | ✅ | Fast |
| lint | ✅ | ✅ | ✅ | ✅ | - |
| db-setup | ✅ | ✅ | ⚠️ | ⚠️ | Needs PostgreSQL |
| db-reset | ✅ | ✅ | ⚠️ | ⚠️ | Destructive |
| dev | ✅ | ✅ | ✅ | ✅ | Continuous |
| examples | ✅ | ✅ | ✅ | ✅ | Needs internet |
| validate | ✅ | ✅ | ✅ | ✅ | Slow |

Legend:
- ✅ Verified working
- ⚠️ Requires manual setup
- ❌ Not working / needs fix

## Troubleshooting Verification

### Verification Script Fails

1. **Check prerequisites**
   ```bash
   node --version    # Should be 18+
   npm --version
   docker --version
   mise --version
   ```

2. **Check file structure**
   ```bash
   ls -R skills/
   ```

3. **Run in verbose mode**
   ```bash
   bash -x ./skills/verify-skills.sh
   ```

4. **Check permissions**
   ```bash
   ls -la skills/verify-skills.sh
   chmod +x skills/verify-skills.sh
   ```

### Skill Commands Fail

1. **Read error message carefully**
2. **Check skill definition prerequisites**
3. **Verify environment variables**
   ```bash
   env | grep -E "DB_|NODE_"
   ```
4. **Check working directory**
   ```bash
   pwd  # Should be project root
   ```

## Best Practices

1. **Run verification after**:
   - Installing dependencies
   - Updating Node.js version
   - Adding new skills
   - Modifying existing skills
   - System updates

2. **Keep verification fast**:
   - Use `--help` and `--version` flags
   - Avoid running full test suites
   - Cache results when possible

3. **Document failures**:
   - Note which checks failed
   - Document prerequisites
   - Update skill definitions

4. **Automate verification**:
   - Add to CI pipeline
   - Run in pre-commit hooks
   - Schedule periodic checks

## Quick Verification Commands

```bash
# Fast check (1 second)
./skills/verify-skills.sh

# Medium check (10 seconds)
npm run lint && npm run test:unit

# Full check (2 minutes)
npm test && mise run db_status

# Complete validation (3 minutes)
./skills/verify-skills.sh && npm test
```

## Verification Schedule

Recommended verification frequency:

- **Every commit**: Level 1 (syntax)
- **Before push**: Level 2 (execution)
- **Before PR**: Level 3 (full)
- **Before release**: Level 4 (integration)
- **Weekly**: Complete verification
- **After updates**: Full verification

## Getting Help

If verification fails and you can't resolve:

1. **Check documentation**:
   - `skills/README.md`
   - `skills/SKILL_CATALOG.md`
   - Individual skill definitions

2. **Check prerequisites**:
   - Node.js version
   - Dependencies installed
   - External services running

3. **File an issue**:
   - Include verification output
   - Note system details
   - Describe steps to reproduce

---

**Verification Script**: `skills/verify-skills.sh`
**Last Updated**: 2026-01-26
**Current Status**: ✅ All checks passing (28/28)

# Skill: lint

Run ESLint to check code quality and style.

## Metadata

- **Name**: lint
- **Category**: Code Quality
- **Dependencies**: None
- **Requires**: Node.js, ESLint

## Description

Analyzes JavaScript code for:
- Style consistency
- Potential bugs
- Best practice violations
- Code smells
- Common mistakes

Fast feedback (2-3 seconds) on code quality without running tests.

## Commands

```bash
# Check for linting issues
npm run lint

# Or directly:
# npx eslint .

# Alternative: Use mise
# mise run lint
```

## Expected Behavior

### Success (Clean Code)

```
✨ All files passed linting
0 errors, 0 warnings
```

### With Warnings

```
⚠️  2 warnings found

/path/to/file.js
  12:5  warning  'unusedVar' is defined but never used  no-unused-vars

✨ 0 errors, 2 warnings
```

### With Errors

```
❌ Linting failed

/path/to/file.js
  15:10  error  Unexpected console statement  no-console
  23:1   error  Missing semicolon             semi

❌ 2 errors, 0 warnings
```

## Linting Rules

Current ESLint configuration checks:

### Errors (Must Fix)
- Syntax errors
- Undeclared variables
- Missing imports
- Duplicate declarations
- Unsafe patterns

### Warnings (Should Fix)
- Unused variables
- Console statements (in production code)
- Debugger statements
- Complex code patterns

### Disabled
- Line length (flexible)
- Max parameters
- Certain stylistic preferences

See `.eslintrc.js` for full configuration.

## Usage Examples

### Basic Check
```bash
/lint
```

### Check Specific Files
```bash
npx eslint core/runner.js
```

### Check Specific Directory
```bash
npx eslint database/
```

### Output Format Options
```bash
# Compact format
npx eslint . --format compact

# JSON format (for CI)
npx eslint . --format json > lint-results.json
```

## Auto-Fix

Many issues can be fixed automatically:

```bash
/lint-fix
# or
npm run lint -- --fix
```

Auto-fixable issues:
- Missing semicolons
- Extra whitespace
- Quote style
- Indentation
- Import ordering

## Related Skills

- `/lint-fix` - Auto-fix linting issues
- `/validate` - Run lint + tests + build
- `/pre-commit` - Quick pre-commit checks

## Integration

### Editor Integration

Most editors support ESLint:

**VS Code**
```json
{
  "eslint.enable": true,
  "eslint.autoFixOnSave": true
}
```

**WebStorm/IntelliJ**
- Settings → Languages → JavaScript → Code Quality Tools → ESLint
- Enable "Run eslint --fix on save"

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Commit aborted."
  exit 1
fi
```

### CI/CD

```yaml
# GitHub Actions
- name: Lint
  run: npm run lint
```

## Ignored Files

ESLint ignores:
- `node_modules/`
- `coverage/`
- `*.min.js`
- Build output directories

See `.eslintignore` for full list.

## Performance

- **Small codebase**: ~1-2 seconds
- **Medium codebase**: ~2-4 seconds
- **Large codebase**: ~5-10 seconds

Faster than running tests, perfect for quick feedback.

## Common Issues

### "Module not found"

**Error**: `Cannot find module 'eslint'`

**Solution**: Install dependencies
```bash
npm install
```

### Too Many Errors

Start with auto-fix:
```bash
/lint-fix
```

Then manually fix remaining issues.

### Conflicting Rules

If a rule conflicts with your code style:
1. Review if the rule is beneficial
2. If not, disable in `.eslintrc.js`
3. Document why disabled

```javascript
// .eslintrc.js
rules: {
  'no-console': 'off', // We use console for CLI output
}
```

## Troubleshooting

### Cache Issues

If linting seems wrong:
```bash
# Clear cache
rm -rf node_modules/.cache/eslint

# Re-run
npm run lint
```

### File Not Being Linted

Check:
1. Is file in `.eslintignore`?
2. Is file path correct?
3. Is file JavaScript (.js extension)?

### Performance Issues

For large projects:
```bash
# Lint only changed files
git diff --name-only --diff-filter=d | grep '\.js$' | xargs eslint
```

## Best Practices

1. **Lint Early, Lint Often**
   - Lint before committing
   - Set up editor integration
   - Run in CI

2. **Fix Warnings Too**
   - Don't ignore warnings
   - Warnings indicate code smells
   - Keep warning count at zero

3. **Consistent Style**
   - Follow project conventions
   - Use auto-fix for consistency
   - Document exceptions

4. **Don't Disable Rules Without Reason**
   - Each rule has a purpose
   - Document why disabled
   - Consider alternatives first

## Exit Codes

- `0` - No errors ✅
- `1` - Errors found ❌
- `2` - Configuration error ❌

## Development Workflow

```bash
# 1. Make code changes

# 2. Quick lint check
/lint

# 3. Auto-fix simple issues
/lint-fix

# 4. Manually fix remaining issues

# 5. Verify
/lint

# 6. Continue with tests
/test-unit
```

## Statistics

View linting statistics:

```bash
npx eslint . --format json | jq '
  [.[] | {file: .filePath, errors: (.messages | length)}] |
  map(select(.errors > 0)) |
  sort_by(.errors) |
  reverse
'
```

## Configuration

### Extending Rules

Add custom rules in `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'your-custom-rule': 'error'
  }
};
```

### Per-File Overrides

```javascript
overrides: [
  {
    files: ['*.test.js'],
    rules: {
      'no-console': 'off' // Allow console in tests
    }
  }
]
```

## Next Steps

After linting:
- ✅ No errors: Continue with `/test`
- ❌ Errors found: Fix and re-lint
- ⚠️  Warnings: Consider fixing before commit

## See Also

- `.eslintrc.js` - Configuration file
- `.eslintignore` - Ignored files
- `docs/IMPLEMENTATION.md` - Development guide

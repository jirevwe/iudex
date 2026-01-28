# Error Display Fix

## Issue

Dashboard was showing `"[object Object]"` instead of actual error details when tests failed.

## Root Cause

In `templates/dashboard/assets/js/components/test-table.js`, the error object was being converted directly to a string:

```javascript
// Before (line 72)
<pre>${escapeHtml(test.error)}</pre>
// When test.error is an object, this displays "[object Object]"
```

## Error Object Structure

Test errors are stored as objects with the following structure:

```json
{
  "message": "Cannot read properties of undefined (reading 'body')",
  "stack": "TypeError: Cannot read properties of undefined (reading 'body')\n    at ...",
  "timeout": false
}
```

## Solution

Added helper functions to properly format error objects:

### 1. `formatErrorMessage(error)`

Extracts the error message from:
- String errors (returns as-is)
- Object errors (returns `error.message`)
- Other types (converts to string)

```javascript
function formatErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error.message || JSON.stringify(error);
  }
  return String(error);
}
```

### 2. `formatErrorStack(error)`

Displays the stack trace in a collapsible section:
- Only shows if `error.stack` exists
- Returns nested `<details>` for collapsible stack trace
- Includes scrolling for long stack traces

```javascript
function formatErrorStack(error) {
  if (typeof error === 'object' && error !== null && error.stack) {
    return `
      <details>
        <summary>Show Stack Trace</summary>
        <pre>${escapeHtml(error.stack)}</pre>
      </details>
    `;
  }
  return '';
}
```

### 3. Updated Error Display

Now errors are displayed with:
- **Bold error message** in red at the top
- **Collapsible stack trace** below (if available)

```javascript
<details>
  <summary>View Error</summary>
  <div>
    <div style="font-weight: 600; color: var(--color-error);">
      ${escapeHtml(formatErrorMessage(test.error))}
    </div>
    ${formatErrorStack(test.error)}
  </div>
</details>
```

## Result

### Before
```
View Error = [object Object]
```

### After
```
View Error ▼
  Cannot read properties of undefined (reading 'body')

  Show Stack Trace ▼
    TypeError: Cannot read properties of undefined (reading 'body')
        at Expect.toHaveProperty (file:///.../dsl.js:170:33)
        at test.id (file:///.../tests/api.test.js:20:27)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
```

## Backward Compatibility

The fix maintains backward compatibility:
- **String errors:** Displayed directly as message
- **Object errors:** Extract `message` and `stack` properties
- **Other types:** Convert to string with `String(error)`

## Updated Files

1. **`templates/dashboard/assets/js/components/test-table.js`**
   - Added `formatErrorMessage()` function
   - Added `formatErrorStack()` function
   - Updated error display HTML structure
   - Enhanced `escapeHtml()` to handle null/undefined

## Testing

Verified with:
- **GitHub Pages example** - 10 failed tests showing proper error messages
- **HTTPBin tests** - Various error types (TypeError, network errors)
- **Dashboard regeneration** - Confirmed fix applies to generated dashboards

## Other Components

Checked other components for similar issues:
- ✅ **governance-panel.js** - Uses `issue.message` (string property)
- ✅ **security-panel.js** - Uses `finding.message` and `finding.details` (string properties)
- ✅ **No other components affected**

## Visual Improvements

The new error display:
- **Clear hierarchy** - Message first, stack trace optional
- **Collapsible sections** - Doesn't clutter the table
- **Color coding** - Red for error messages
- **Scrollable** - Long stack traces don't break layout
- **Max height** - Stack traces limited to 300px with scroll

## Deployment

The fix is automatically included in:
- ✅ Static dashboards (GitHub Pages)
- ✅ Server-mounted dashboards (Express/Fastify)
- ✅ All generated dashboards going forward

No configuration changes needed - the fix works automatically.

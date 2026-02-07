# Plan: Spreadsheet-Style Test Results View

## Summary
Add a view toggle within the Test Results tab allowing users to switch between the current grouped/collapsible view and a flat spreadsheet view with sortable columns, column filters, column visibility controls, and CSV export.

## Approach
- Add view toggle buttons within the existing Test Results tab (not a new tab)
- Both views share the same data and respect the same search/status filters
- Spreadsheet view shows all tests in a flat table with more columns visible

## Files Modified

### 1. `/templates/dashboard/index.html`
Added to the `#tab-tests` panel header:
- View toggle buttons (grouped/spreadsheet icons)
- Column visibility dropdown (spreadsheet only)
- Export CSV button (spreadsheet only)
- New `#spreadsheet-container` div for the spreadsheet table

### 2. `/templates/dashboard/assets/js/dashboard.js`
- Import new `spreadsheet-table.js` component
- Add `currentView` state variable ('grouped' | 'spreadsheet')
- Cache `currentSuitesData` for view switching without re-fetching
- Add `switchView(view)` function to toggle containers and controls
- Update `loadRun()` to render both views (spreadsheet hidden by CSS)
- Wire search/filter inputs to apply to active view

### 3. `/templates/dashboard/assets/css/dashboard.css`
Added styles for:
- View toggle buttons
- Column visibility dropdown
- Spreadsheet table (sticky header, sortable columns, column filters)
- Cell-specific styling (status badges, method badges, error preview)
- Responsive handling (hide spreadsheet on mobile)

## New File Created

### `/templates/dashboard/assets/js/components/spreadsheet-table.js`

**Exports:**
- `renderSpreadsheetTable(suites, deletedTestSlugs)` - main render function
- `applyGlobalFilter(query, statusFilter)` - apply search/filter
- `exportToCSV()` - download visible data
- `toggleColumn(columnId)` - toggle column visibility
- `getVisibleColumns()` - get current visible columns
- `getColumns()` - get all column definitions

**Columns:**
| Column | Sortable | Filterable | Default Visible |
|--------|----------|------------|-----------------|
| Status | Yes | Yes | Yes |
| Test Name | Yes | Yes | Yes |
| Suite | Yes | Yes | Yes |
| Duration | Yes | No | Yes |
| Error | No | Yes | Yes |
| Endpoint | Yes | Yes | No |
| Method | Yes | Yes | No |
| Status Code | Yes | Yes | No |
| Response Time | Yes | No | No |
| File | Yes | Yes | No |

**Features:**
- Click column header to sort (asc/desc toggle)
- Per-column filter inputs in header
- Column visibility checkboxes in dropdown
- CSV export of visible data/columns

## Implementation Details

### View Toggle
- Two buttons in a button group with SVG icons
- Active state indicated by green highlight
- Switching view shows/hides appropriate containers and controls

### Column Sorting
- Click header to sort ascending
- Click again to sort descending
- Sort indicator shows ↑ (asc), ↓ (desc), or ⇅ (unsorted)

### Column Filtering
- Each filterable column has an input in the filter row
- Filters apply in real-time as user types
- Filters stack with global search/status filter

### Column Visibility
- Dropdown menu with checkboxes for each column
- Changes apply immediately
- State preserved during session

### CSV Export
- Exports currently visible/filtered data
- Only includes visible columns
- Proper CSV escaping for special characters

## Bug Fixes (Post-Implementation)

### Fix 1: Horizontal Scrolling
**Problem:** When additional columns were enabled, table content overflowed without scrolling.

**Solution:** Updated `.spreadsheet-table` CSS:
```css
.spreadsheet-table {
  width: max-content;      /* Allow table to expand beyond container */
  min-width: 100%;         /* At minimum, fill container width */
}
```

### Fix 2: File Column Not Populated
**Problem:** File column showed "-" for all tests because the SQL query didn't include `test_file`.

**Solution:** Updated `/src/server/dashboard-server.ts`:
1. Added `file?: string | null` to `TestResult` interface
2. Added `t.test_file` to SQL SELECT query in `getRunDetailsFromDatabase()`
3. Added `file: (test.test_file as string) || null` to test result mapping

### Fix 3: Redundant "Test Results" Header
**Problem:** Both the tab button and panel header showed "Test Results".

**Solution:** Removed `<h2>Test Results</h2>` from panel header in `/templates/dashboard/index.html`.

### Fix 4: Text Wrapping in Cells
**Problem:** Status, Suite, and File columns wrapped text onto multiple lines.

**Solution:** Added `white-space: nowrap` to cell classes in `/templates/dashboard/assets/css/dashboard.css`:
```css
.spreadsheet-table .cell-status {
  width: 100px;
  white-space: nowrap;
}

.spreadsheet-table .cell-suite {
  min-width: 150px;
  white-space: nowrap;
}

.spreadsheet-table .suite-cell {
  white-space: nowrap;
}

.spreadsheet-table .endpoint-cell,
.spreadsheet-table .file-cell {
  white-space: nowrap;  /* Changed from word-break: break-all */
}
```

---

## Verification Results

All features tested and working:
- View toggle switches correctly between grouped and spreadsheet views
- Column sorting works (both directions)
- Column filters narrow results correctly
- Column visibility toggles show/hide columns
- CSV export downloads valid file
- Search/status filters apply to spreadsheet view
- Horizontal scrolling works when many columns enabled
- File column shows file paths (e.g., `tests/httpbin.test.js`)
- No text wrapping in Status, Suite, or File columns
- No console errors (verified via F12)
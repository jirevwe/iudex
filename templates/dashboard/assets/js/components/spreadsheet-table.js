/**
 * Spreadsheet Table Component
 * Renders test results in a flat, sortable, filterable spreadsheet view
 */

// Column definitions with metadata
const COLUMNS = [
  { id: 'status', label: 'Status', sortable: true, filterable: true, defaultVisible: true, width: '100px' },
  { id: 'name', label: 'Test Name', sortable: true, filterable: true, defaultVisible: true, width: 'auto' },
  { id: 'suite', label: 'Suite', sortable: true, filterable: true, defaultVisible: true, width: '180px' },
  { id: 'duration', label: 'Duration', sortable: true, filterable: false, defaultVisible: true, width: '100px' },
  { id: 'error', label: 'Error', sortable: false, filterable: true, defaultVisible: true, width: '250px' },
  { id: 'endpoint', label: 'Endpoint', sortable: true, filterable: true, defaultVisible: false, width: '200px' },
  { id: 'method', label: 'Method', sortable: true, filterable: true, defaultVisible: false, width: '80px' },
  { id: 'statusCode', label: 'Status Code', sortable: true, filterable: true, defaultVisible: false, width: '100px' },
  { id: 'responseTime', label: 'Response Time', sortable: true, filterable: false, defaultVisible: false, width: '120px' },
  { id: 'file', label: 'File', sortable: true, filterable: true, defaultVisible: false, width: '200px' }
];

// Module state
let flatTests = [];
let filteredTests = [];
let deletedTestSlugs = new Set();
let visibleColumns = new Set();
let sortColumn = null;
let sortDirection = 'asc';
let columnFilters = {};

/**
 * Initialize visible columns from defaults
 */
function initVisibleColumns() {
  visibleColumns = new Set(
    COLUMNS.filter(col => col.defaultVisible).map(col => col.id)
  );
}

/**
 * Flatten suites into a flat array of tests
 * @param {Array} suites - Test suites data
 * @returns {Array} - Flat array of tests with suite info
 */
function flattenSuites(suites) {
  const tests = [];

  if (!suites || !Array.isArray(suites)) {
    return tests;
  }

  suites.forEach(suite => {
    const suiteName = suite.name || 'Default Suite';
    const suiteTests = suite.tests || [];

    suiteTests.forEach(test => {
      tests.push({
        ...test,
        suite: suiteName,
        isDeleted: test.status === 'deleted' || test.deletedAt ||
          (test.id && deletedTestSlugs.has(test.id))
      });
    });
  });

  return tests;
}

/**
 * Render spreadsheet table
 * @param {Array} suites - Test suites data
 * @param {Array} deletedTests - Optional array of deleted tests
 */
export function renderSpreadsheetTable(suites, deletedTests = []) {
  // Build set of deleted test slugs
  deletedTestSlugs = new Set(
    deletedTests.map(t => t.test_slug).filter(Boolean)
  );

  // Initialize visible columns if not done
  if (visibleColumns.size === 0) {
    initVisibleColumns();
  }

  // Flatten suites into flat array
  flatTests = flattenSuites(suites);
  filteredTests = [...flatTests];

  // Reset sort and filters
  sortColumn = null;
  sortDirection = 'asc';
  columnFilters = {};

  renderTable();
  setupEventListeners();
}

/**
 * Render the table
 */
function renderTable() {
  const container = document.getElementById('spreadsheet-table-body');
  if (!container) return;

  // Update header
  renderHeader();

  // Render body
  if (filteredTests.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="${visibleColumns.size}" class="spreadsheet-empty">
          No tests match the current filters
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredTests.forEach((test, index) => {
    html += renderRow(test, index);
  });

  container.innerHTML = html;
}

/**
 * Render table header with sort indicators and column filters
 */
function renderHeader() {
  const thead = document.getElementById('spreadsheet-table-head');
  if (!thead) return;

  let headerRow = '<tr>';
  let filterRow = '<tr class="filter-row">';

  COLUMNS.forEach(col => {
    if (!visibleColumns.has(col.id)) return;

    const sortIndicator = getSortIndicator(col.id);
    const sortableClass = col.sortable ? 'sortable' : '';

    headerRow += `
      <th class="${sortableClass}" data-column="${col.id}" style="width: ${col.width}">
        <span class="header-content">
          ${escapeHtml(col.label)}
          ${col.sortable ? `<span class="sort-indicator">${sortIndicator}</span>` : ''}
        </span>
      </th>
    `;

    if (col.filterable) {
      filterRow += `
        <th class="filter-cell">
          <input type="text"
                 class="column-filter"
                 data-column="${col.id}"
                 placeholder="Filter..."
                 value="${escapeHtml(columnFilters[col.id] || '')}">
        </th>
      `;
    } else {
      filterRow += '<th class="filter-cell"></th>';
    }
  });

  headerRow += '</tr>';
  filterRow += '</tr>';

  thead.innerHTML = headerRow + filterRow;

  // Attach sort handlers
  thead.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column;
      handleSort(column);
    });
  });

  // Attach filter handlers
  thead.querySelectorAll('.column-filter').forEach(input => {
    input.addEventListener('input', (e) => {
      const column = e.target.dataset.column;
      columnFilters[column] = e.target.value;
      applyFiltersAndSort();
    });
  });
}

/**
 * Get sort indicator for column
 * @param {string} columnId - Column identifier
 * @returns {string} - Sort indicator character
 */
function getSortIndicator(columnId) {
  if (sortColumn !== columnId) return '⇅';
  return sortDirection === 'asc' ? '↑' : '↓';
}

/**
 * Render a single row
 * @param {Object} test - Test data
 * @param {number} index - Row index
 * @returns {string} - Row HTML
 */
function renderRow(test, index) {
  const deletedClass = test.isDeleted ? 'deleted-test' : '';
  const todoClass = test.status === 'todo' ? 'todo-test' : '';

  let cells = '';

  COLUMNS.forEach(col => {
    if (!visibleColumns.has(col.id)) return;
    cells += `<td class="cell-${col.id}">${renderCell(col.id, test)}</td>`;
  });

  return `<tr class="spreadsheet-row ${deletedClass} ${todoClass}" data-index="${index}">${cells}</tr>`;
}

/**
 * Render cell content based on column type
 * @param {string} columnId - Column identifier
 * @param {Object} test - Test data
 * @returns {string} - Cell HTML
 */
function renderCell(columnId, test) {
  switch (columnId) {
    case 'status':
      const displayStatus = test.isDeleted ? 'deleted' : test.status;
      return `
        <span class="status-badge ${displayStatus}">
          ${getStatusIcon(displayStatus)} ${displayStatus.toUpperCase()}
        </span>
      `;

    case 'name':
      const deletedLabel = test.isDeleted ? ' <span class="deleted-label">(deleted)</span>' : '';
      return `<span class="test-name-cell">${escapeHtml(test.name)}${deletedLabel}</span>`;

    case 'suite':
      return `<span class="suite-cell">${escapeHtml(test.suite)}</span>`;

    case 'duration':
      return `<span class="duration-cell">${formatDuration(test.duration)}</span>`;

    case 'error':
      if (test.error) {
        const errorMsg = formatErrorMessage(test.error);
        const truncated = errorMsg.length > 80 ? errorMsg.substring(0, 80) + '...' : errorMsg;
        return `<span class="error-cell" title="${escapeHtml(errorMsg)}">${escapeHtml(truncated)}</span>`;
      }
      return '<span class="no-error">-</span>';

    case 'endpoint':
      return test.endpoint ? `<code class="endpoint-cell">${escapeHtml(test.endpoint)}</code>` : '-';

    case 'method':
      if (test.method) {
        const method = test.method.toUpperCase();
        return `<span class="method-badge ${method.toLowerCase()}">${method}</span>`;
      }
      return '-';

    case 'statusCode':
      if (test.statusCode) {
        const codeClass = test.statusCode >= 400 ? 'error-code' :
                         test.statusCode >= 300 ? 'redirect-code' : 'success-code';
        return `<span class="status-code ${codeClass}">${test.statusCode}</span>`;
      }
      return '-';

    case 'responseTime':
      return test.responseTime ? formatDuration(test.responseTime) : '-';

    case 'file':
      return test.file ? `<code class="file-cell">${escapeHtml(test.file)}</code>` : '-';

    default:
      return '-';
  }
}

/**
 * Handle column sort click
 * @param {string} column - Column to sort by
 */
function handleSort(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn = column;
    sortDirection = 'asc';
  }
  applyFiltersAndSort();
}

/**
 * Apply column filters and sort
 */
function applyFiltersAndSort() {
  // Start with all tests
  filteredTests = [...flatTests];

  // Apply column filters
  Object.keys(columnFilters).forEach(colId => {
    const filterValue = columnFilters[colId]?.toLowerCase();
    if (!filterValue) return;

    filteredTests = filteredTests.filter(test => {
      const cellValue = getCellValue(colId, test);
      return cellValue.toLowerCase().includes(filterValue);
    });
  });

  // Apply sort
  if (sortColumn) {
    filteredTests.sort((a, b) => {
      const aVal = getSortValue(sortColumn, a);
      const bVal = getSortValue(sortColumn, b);

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  renderTable();
}

/**
 * Get raw cell value for filtering
 * @param {string} columnId - Column identifier
 * @param {Object} test - Test data
 * @returns {string} - Cell value as string
 */
function getCellValue(columnId, test) {
  switch (columnId) {
    case 'status':
      return test.status || '';
    case 'name':
      return test.name || '';
    case 'suite':
      return test.suite || '';
    case 'error':
      return formatErrorMessage(test.error) || '';
    case 'endpoint':
      return test.endpoint || '';
    case 'method':
      return test.method || '';
    case 'statusCode':
      return String(test.statusCode || '');
    case 'file':
      return test.file || '';
    default:
      return '';
  }
}

/**
 * Get sortable value for column
 * @param {string} columnId - Column identifier
 * @param {Object} test - Test data
 * @returns {*} - Sortable value
 */
function getSortValue(columnId, test) {
  switch (columnId) {
    case 'duration':
      return test.duration || 0;
    case 'responseTime':
      return test.responseTime || 0;
    case 'statusCode':
      return test.statusCode || 0;
    default:
      return getCellValue(columnId, test);
  }
}

/**
 * Apply global filter from main search/status controls
 * @param {string} query - Search query
 * @param {string} statusFilter - Status filter value
 */
export function applyGlobalFilter(query, statusFilter) {
  filteredTests = flatTests.filter(test => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'deleted') {
        if (!test.isDeleted) return false;
      } else if (statusFilter === 'todo') {
        if (test.status !== 'todo') return false;
      } else {
        if (test.isDeleted || test.status !== statusFilter) return false;
      }
    }

    // Search filter
    if (query) {
      const searchLower = query.toLowerCase();
      return (
        test.name.toLowerCase().includes(searchLower) ||
        test.suite.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Re-apply column filters and sort
  Object.keys(columnFilters).forEach(colId => {
    const filterValue = columnFilters[colId]?.toLowerCase();
    if (!filterValue) return;

    filteredTests = filteredTests.filter(test => {
      const cellValue = getCellValue(colId, test);
      return cellValue.toLowerCase().includes(filterValue);
    });
  });

  if (sortColumn) {
    filteredTests.sort((a, b) => {
      const aVal = getSortValue(sortColumn, a);
      const bVal = getSortValue(sortColumn, b);

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  renderTable();
}

/**
 * Toggle column visibility
 * @param {string} columnId - Column to toggle
 */
export function toggleColumn(columnId) {
  if (visibleColumns.has(columnId)) {
    visibleColumns.delete(columnId);
  } else {
    visibleColumns.add(columnId);
  }
  renderTable();
}

/**
 * Get visible column state
 * @returns {Set} - Set of visible column IDs
 */
export function getVisibleColumns() {
  return new Set(visibleColumns);
}

/**
 * Get all column definitions
 * @returns {Array} - Column definitions
 */
export function getColumns() {
  return COLUMNS;
}

/**
 * Export visible data to CSV
 */
export function exportToCSV() {
  const visibleCols = COLUMNS.filter(col => visibleColumns.has(col.id));

  // Header row
  let csv = visibleCols.map(col => `"${col.label}"`).join(',') + '\n';

  // Data rows
  filteredTests.forEach(test => {
    const row = visibleCols.map(col => {
      let value = '';
      switch (col.id) {
        case 'status':
          value = test.status || '';
          break;
        case 'name':
          value = test.name || '';
          break;
        case 'suite':
          value = test.suite || '';
          break;
        case 'duration':
          value = test.duration ? formatDuration(test.duration) : '';
          break;
        case 'error':
          value = formatErrorMessage(test.error) || '';
          break;
        case 'endpoint':
          value = test.endpoint || '';
          break;
        case 'method':
          value = test.method || '';
          break;
        case 'statusCode':
          value = test.statusCode || '';
          break;
        case 'responseTime':
          value = test.responseTime ? formatDuration(test.responseTime) : '';
          break;
        case 'file':
          value = test.file || '';
          break;
      }
      // Escape quotes and wrap in quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csv += row.join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `test-results-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Event listeners are attached in renderHeader
}

/**
 * Get status icon
 * @param {string} status - Test status
 * @returns {string} - Icon character
 */
function getStatusIcon(status) {
  const icons = {
    passed: '✅',
    failed: '❌',
    skipped: '⏭️',
    todo: '📝',
    deleted: '🗑️'
  };
  return icons[status] || '';
}

/**
 * Format duration in milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format error message from error object or string
 * @param {*} error - Error object or string
 * @returns {string} - Formatted error message
 */
function formatErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error.message || JSON.stringify(error);
  }
  return String(error);
}

/**
 * Escape HTML to prevent XSS
 * @param {*} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

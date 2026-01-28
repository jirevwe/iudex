/**
 * Test Table Component
 * Renders test results in a sortable, filterable table
 */

let allTests = [];
let filteredTests = [];

/**
 * Render test results table
 * @param {Array} suites - Test suites data
 */
export function renderTestTable(suites) {
  if (!suites || !Array.isArray(suites)) {
    showEmptyState('No test results available');
    return;
  }

  // Flatten suites into individual tests
  allTests = [];
  suites.forEach(suite => {
    if (suite.tests && Array.isArray(suite.tests)) {
      suite.tests.forEach(test => {
        allTests.push({
          ...test,
          suiteName: suite.name
        });
      });
    }
  });

  filteredTests = [...allTests];
  renderTable();
  setupEventListeners();
}

/**
 * Render the table with current filtered tests
 */
function renderTable() {
  const tbody = document.getElementById('test-table-body');

  if (filteredTests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
          No tests match the current filter
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredTests.map((test, index) => {
    const hasError = test.status === 'failed' && test.error;
    const rowClass = hasError ? 'expandable-row' : '';

    return `
      <tr class="${rowClass}" data-test-index="${index}">
        <td>
          <span class="status-badge ${test.status}">
            ${getStatusIcon(test.status)} ${test.status}
          </span>
        </td>
        <td>
          <div class="test-name">
            ${hasError ? '<span class="expand-icon">▶</span> ' : ''}
            ${escapeHtml(test.name)}
          </div>
        </td>
        <td>
          <div class="test-suite">${escapeHtml(test.suiteName)}</div>
        </td>
        <td>${formatDuration(test.duration)}</td>
      </tr>
      ${hasError ? `
        <tr class="error-detail-row" data-test-index="${index}" style="display: none;">
          <td colspan="4" class="error-detail-cell">
            <div class="error-detail-content">
              <div class="error-message">
                <strong>Error:</strong> ${escapeHtml(formatErrorMessage(test.error))}
              </div>
              ${formatErrorStack(test.error)}
            </div>
          </td>
        </tr>
      ` : ''}
    `;
  }).join('');

  // Add click handlers for expandable rows
  setupExpandHandlers();
}

/**
 * Setup event listeners for search and filter
 */
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById('test-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTests(e.target.value, document.getElementById('test-filter').value);
    });
  }

  // Filter select
  const filterSelect = document.getElementById('test-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      filterTests(document.getElementById('test-search').value, e.target.value);
    });
  }
}

/**
 * Setup click handlers for expandable rows
 */
function setupExpandHandlers() {
  const expandableRows = document.querySelectorAll('.expandable-row');

  expandableRows.forEach(row => {
    row.style.cursor = 'pointer';

    row.addEventListener('click', (e) => {
      // Don't trigger if clicking on a link or button
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
        return;
      }

      const testIndex = row.dataset.testIndex;
      const errorRow = document.querySelector(`.error-detail-row[data-test-index="${testIndex}"]`);
      const expandIcon = row.querySelector('.expand-icon');

      if (errorRow) {
        const isExpanded = errorRow.style.display !== 'none';

        if (isExpanded) {
          // Collapse
          errorRow.style.display = 'none';
          if (expandIcon) expandIcon.textContent = '▶';
          row.classList.remove('expanded');
        } else {
          // Expand
          errorRow.style.display = 'table-row';
          if (expandIcon) expandIcon.textContent = '▼';
          row.classList.add('expanded');
        }
      }
    });
  });
}

/**
 * Filter tests by search query and status
 * @param {string} query - Search query
 * @param {string} status - Status filter ('all', 'passed', 'failed', 'skipped')
 */
function filterTests(query, status) {
  filteredTests = allTests.filter(test => {
    // Status filter
    if (status !== 'all' && test.status !== status) {
      return false;
    }

    // Search filter
    if (query) {
      const searchLower = query.toLowerCase();
      return (
        test.name.toLowerCase().includes(searchLower) ||
        test.suiteName.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  renderTable();
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
  const icons = {
    passed: '✓',
    failed: '✗',
    skipped: '⊘'
  };
  return icons[status] || '';
}

/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format error message from error object or string
 */
function formatErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error.message || JSON.stringify(error);
  }
  return String(error);
}

/**
 * Format error stack trace
 */
function formatErrorStack(error) {
  if (typeof error === 'object' && error !== null && error.stack) {
    return `
      <details class="stack-trace-details" open>
        <summary class="stack-trace-summary">Stack Trace</summary>
        <pre class="stack-trace-pre">${escapeHtml(error.stack)}</pre>
      </details>
    `;
  }
  return '';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Show empty state
 */
function showEmptyState(message) {
  const tbody = document.getElementById('test-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; padding: 3rem;">
        <div class="empty-state-icon">📋</div>
        <div style="color: var(--color-text-secondary);">${message}</div>
      </td>
    </tr>
  `;
}

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
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
          No tests match the current filter
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredTests.map(test => `
    <tr>
      <td>
        <span class="status-badge ${test.status}">
          ${getStatusIcon(test.status)} ${test.status}
        </span>
      </td>
      <td>
        <div class="test-name">${escapeHtml(test.name)}</div>
      </td>
      <td>
        <div class="test-suite">${escapeHtml(test.suiteName)}</div>
      </td>
      <td>${formatDuration(test.duration)}</td>
      <td>
        ${test.status === 'failed' && test.error ? `
          <details>
            <summary style="cursor: pointer; color: var(--color-primary);">View Error</summary>
            <div style="margin-top: 0.5rem;">
              <div style="font-weight: 600; color: var(--color-error); margin-bottom: 0.5rem;">
                ${escapeHtml(formatErrorMessage(test.error))}
              </div>
              ${formatErrorStack(test.error)}
            </div>
          </details>
        ` : '-'}
      </td>
    </tr>
  `).join('');
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
      <details style="margin-top: 0.5rem;">
        <summary style="cursor: pointer; color: var(--color-text-secondary); font-size: 0.875rem;">
          Show Stack Trace
        </summary>
        <pre style="margin-top: 0.5rem; padding: 0.5rem; background: var(--color-bg-secondary); border-radius: var(--radius-sm); font-size: 0.75rem; overflow-x: auto; max-height: 300px; overflow-y: auto;">${escapeHtml(error.stack)}</pre>
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

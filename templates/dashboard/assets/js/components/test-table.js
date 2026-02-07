/**
 * Test Table Component
 * Renders test results grouped by suite with collapse/expand functionality
 */

let allSuites = [];      // Array of suite objects (not flattened)
let filteredSuites = []; // Filtered suite objects
let deletedTestSlugs = new Set(); // Set of deleted test slugs

/**
 * Render test results table grouped by suite
 * @param {Array} suites - Test suites data
 * @param {Array} deletedTests - Optional array of deleted tests from database
 */
export function renderTestTable(suites, deletedTests = []) {
  // Build set of deleted test slugs for quick lookup
  deletedTestSlugs = new Set(
    deletedTests.map(t => t.test_slug).filter(Boolean)
  );
  if (!suites || !Array.isArray(suites)) {
    showEmptyState('No test results available');
    return;
  }

  // Store suites with expand state and calculate statistics
  allSuites = suites.map((suite, index) => {
    const tests = suite.tests || [];
    const passed = tests.filter(t => t.status === 'passed').length;
    const failed = tests.filter(t => t.status === 'failed').length;
    const skipped = tests.filter(t => t.status === 'skipped').length;
    const todo = tests.filter(t => t.status === 'todo').length;
    const duration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);

    return {
      ...suite,
      name: suite.name || 'Default Suite',  // Use 'Default Suite' if no name provided
      suiteIndex: index,
      isExpanded: shouldExpandByDefault(suite, failed),
      tests: tests,
      passed,
      failed,
      skipped,
      todo,
      duration
    };
  });

  // If suites array is empty but we might have tests, create a default suite
  if (allSuites.length === 0) {
    allSuites = [{
      name: 'Default Suite',
      suiteIndex: 0,
      isExpanded: false,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    }];
  }

  filteredSuites = [...allSuites];
  renderTable();
  setupEventListeners();
}

/**
 * All suites collapsed by default (per user requirement)
 * @param {Object} suite - Suite object
 * @param {number} failedCount - Number of failed tests
 * @returns {boolean} - Whether suite should be expanded by default
 */
function shouldExpandByDefault(suite, failedCount) {
  return false; // ALL suites collapsed by default
}

/**
 * Render grouped table with collapse/expand
 */
function renderTable() {
  const tbody = document.getElementById('test-table-body');

  if (filteredSuites.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 2rem; color: var(--color-text-secondary);">
          No tests match the current filter
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  let globalTestIndex = 0;

  filteredSuites.forEach((suite, suiteIndex) => {
    const suiteStatusClass = getSuiteStatusClass(suite);
    const expandedClass = suite.isExpanded ? 'expanded' : 'collapsed';
    const icon = suite.isExpanded ? '▼' : '▶';

    // Suite Header Row
    html += `
      <tr class="suite-header-row ${suiteStatusClass} ${expandedClass}"
          data-suite-index="${suiteIndex}">
        <td colspan="3">
          <div class="suite-header">
            <span class="suite-expand-icon">${icon}</span>
            <span class="suite-name">${escapeHtml(suite.name)}</span>
            <div class="suite-stats">
              ${suite.passed > 0 ? `<span class="suite-stat passed">${suite.passed} passed</span>` : ''}
              ${suite.failed > 0 ? `<span class="suite-stat failed">${suite.failed} failed</span>` : ''}
              ${suite.skipped > 0 ? `<span class="suite-stat skipped">${suite.skipped} skipped</span>` : ''}
              ${suite.todo > 0 ? `<span class="suite-stat todo">${suite.todo} todo</span>` : ''}
              <span class="suite-stat-duration">${formatDuration(suite.duration)}</span>
            </div>
          </div>
        </td>
      </tr>
    `;

    // Test Rows
    if (suite.tests && Array.isArray(suite.tests)) {
      suite.tests.forEach((test) => {
        const hasError = test.status === 'failed' && test.error;
        const rowClass = hasError ? 'expandable-row' : '';
        const hiddenClass = suite.isExpanded ? '' : 'suite-collapsed';

        // Check if test is deleted (either status='deleted' or has deletedAt timestamp)
        const isDeleted = test.status === 'deleted' || test.deletedAt || (test.id && deletedTestSlugs.has(test.id));
        const deletedClass = isDeleted ? 'deleted-test' : '';
        const deletedLabel = isDeleted ? ' <span class="deleted-label">(deleted)</span>' : '';

        // Check if test is todo
        const isUnimplemented = test.status === 'todo';
        const todoClass = isUnimplemented ? 'todo-test' : '';

        // Show 'deleted' status if test is deleted
        const displayStatus = isDeleted ? 'deleted' : test.status;

        html += `
          <tr class="test-row ${rowClass} ${hiddenClass} ${deletedClass} ${todoClass}"
              data-suite-index="${suiteIndex}"
              data-test-index="${globalTestIndex}">
            <td>
              <span class="status-badge ${displayStatus}">
                ${getStatusIcon(displayStatus)} ${displayStatus.toUpperCase()}
              </span>
            </td>
            <td>
              <div class="test-name">
                ${hasError ? '<span class="expand-icon">▶</span> ' : ''}
                ${escapeHtml(test.name)}${deletedLabel}
              </div>
            </td>
            <td>${formatDuration(test.duration)}</td>
          </tr>
        `;

        // Error Detail Row
        if (hasError) {
          html += `
            <tr class="error-detail-row ${hiddenClass}"
                data-suite-index="${suiteIndex}"
                data-test-index="${globalTestIndex}"
                style="display: none;">
              <td colspan="3" class="error-detail-cell">
                <div class="error-detail-content">
                  <div class="error-message">
                    <strong>Error:</strong> ${escapeHtml(formatErrorMessage(test.error))}
                  </div>
                  ${formatErrorStack(test.error)}
                </div>
              </td>
            </tr>
          `;
        }

        globalTestIndex++;
      });
    }
  });

  tbody.innerHTML = html;

  setupSuiteExpandHandlers();
  setupTestExpandHandlers();
}

/**
 * Get suite status class for left border indicator
 * @param {Object} suite - Suite object
 * @returns {string} - CSS class name
 */
function getSuiteStatusClass(suite) {
  if (suite.failed > 0) return 'suite-has-failures';
  if (suite.passed > 0 && suite.failed === 0 && suite.skipped === 0) return 'suite-all-passed';
  return 'suite-mixed';
}

/**
 * Setup event listeners for search, filter, and control buttons
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

  // Expand All button
  const expandAllBtn = document.getElementById('expand-all-btn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      expandAllSuites();
    });
  }

  // Collapse All button
  const collapseAllBtn = document.getElementById('collapse-all-btn');
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      collapseAllSuites();
    });
  }
}

/**
 * Setup suite header click handlers
 */
function setupSuiteExpandHandlers() {
  const suiteHeaders = document.querySelectorAll('.suite-header-row');

  suiteHeaders.forEach(row => {
    row.addEventListener('click', (e) => {
      const suiteIndex = parseInt(row.dataset.suiteIndex);
      toggleSuite(suiteIndex);
    });
  });
}

/**
 * Toggle individual suite expand/collapse
 * @param {number} suiteIndex - Index of suite in filteredSuites
 */
function toggleSuite(suiteIndex) {
  const suite = filteredSuites[suiteIndex];
  suite.isExpanded = !suite.isExpanded;

  const row = document.querySelector(`.suite-header-row[data-suite-index="${suiteIndex}"]`);
  const icon = row.querySelector('.suite-expand-icon');

  row.classList.toggle('expanded', suite.isExpanded);
  row.classList.toggle('collapsed', !suite.isExpanded);
  icon.textContent = suite.isExpanded ? '▼' : '▶';

  // Toggle visibility of test rows
  const testRows = document.querySelectorAll(`tr.test-row[data-suite-index="${suiteIndex}"]`);
  const errorRows = document.querySelectorAll(`tr.error-detail-row[data-suite-index="${suiteIndex}"]`);

  testRows.forEach(testRow => {
    testRow.classList.toggle('suite-collapsed', !suite.isExpanded);
  });

  errorRows.forEach(errorRow => {
    errorRow.classList.toggle('suite-collapsed', !suite.isExpanded);
    // If suite is collapsed, also collapse error details
    if (!suite.isExpanded) {
      errorRow.style.display = 'none';
      const testIndex = errorRow.dataset.testIndex;
      const parentRow = document.querySelector(`tr.test-row[data-test-index="${testIndex}"]`);
      if (parentRow) {
        const expandIcon = parentRow.querySelector('.expand-icon');
        if (expandIcon) expandIcon.textContent = '▶';
        parentRow.classList.remove('expanded');
      }
    }
  });
}

/**
 * Expand all suites
 */
function expandAllSuites() {
  filteredSuites.forEach((suite, index) => {
    suite.isExpanded = true;
  });
  renderTable();
}

/**
 * Collapse all suites
 */
function collapseAllSuites() {
  filteredSuites.forEach((suite, index) => {
    suite.isExpanded = false;
  });
  renderTable();
}

/**
 * Setup test row expand handlers (for error details)
 */
function setupTestExpandHandlers() {
  const expandableRows = document.querySelectorAll('.test-row.expandable-row');

  expandableRows.forEach(row => {
    row.style.cursor = 'pointer';

    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
        return;
      }

      const testIndex = row.dataset.testIndex;
      const errorRow = document.querySelector(`.error-detail-row[data-test-index="${testIndex}"]`);
      const expandIcon = row.querySelector('.expand-icon');

      if (errorRow) {
        const isExpanded = errorRow.style.display !== 'none';

        if (isExpanded) {
          errorRow.style.display = 'none';
          if (expandIcon) expandIcon.textContent = '▶';
          row.classList.remove('expanded');
        } else {
          errorRow.style.display = 'table-row';
          if (expandIcon) expandIcon.textContent = '▼';
          row.classList.add('expanded');
        }
      }
    });
  });
}

/**
 * Filter tests and show results with suite headers
 * Per user requirement: "When a user searches it should show the results with their suite headers"
 * @param {string} query - Search query
 * @param {string} status - Status filter ('all', 'passed', 'failed', 'skipped', 'todo', 'deleted')
 */
function filterTests(query, status) {
  filteredSuites = allSuites.map(suite => {
    const filteredTests = suite.tests.filter(test => {
      // Check if test is deleted
      const isDeleted = test.status === 'deleted' || test.deletedAt ||
        (test.id && deletedTestSlugs.has(test.id));

      // Status filter
      if (status !== 'all') {
        if (status === 'deleted') {
          // Filter for deleted tests
          if (!isDeleted) return false;
        } else if (status === 'todo') {
          // Filter for todo tests
          if (test.status !== 'todo') return false;
        } else {
          // Filter for other statuses (passed, failed, skipped)
          // Don't show deleted tests in other filters
          if (isDeleted || test.status !== status) return false;
        }
      }

      // Search filter
      if (query) {
        const searchLower = query.toLowerCase();
        // Match on test name OR suite name
        return (
          test.name.toLowerCase().includes(searchLower) ||
          suite.name.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // If suite has matching tests, show it with its tests
    // Suite header is ALWAYS shown when tests match (per user requirement)
    const hasMatches = filteredTests.length > 0;

    return {
      ...suite,
      tests: filteredTests,
      isExpanded: hasMatches && query, // Auto-expand when searching
      passed: filteredTests.filter(t => t.status === 'passed').length,
      failed: filteredTests.filter(t => t.status === 'failed').length,
      skipped: filteredTests.filter(t => t.status === 'skipped').length,
      todo: filteredTests.filter(t => t.status === 'todo').length,
      duration: filteredTests.reduce((sum, t) => sum + (t.duration || 0), 0)
    };
  }).filter(suite => suite.tests.length > 0); // Only show suites with matching tests

  renderTable();
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
 * @param {*} error - Error object
 * @returns {string} - Formatted stack trace HTML
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

/**
 * Show empty state
 * @param {string} message - Empty state message
 */
function showEmptyState(message) {
  const tbody = document.getElementById('test-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="3" style="text-align: center; padding: 3rem;">
        <div style="color: var(--color-text-secondary);">${message}</div>
      </td>
    </tr>
  `;
}

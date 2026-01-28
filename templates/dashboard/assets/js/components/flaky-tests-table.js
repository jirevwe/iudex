/**
 * Flaky Tests Table Component
 * Displays tests with intermittent failures
 */

/**
 * Render flaky tests table
 * @param {Array} flakyTests - Array of flaky test data
 */
export function renderFlakyTestsTable(flakyTests) {
  const container = document.getElementById('flaky-tests-container');
  if (!container) return;

  if (!flakyTests || flakyTests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>No Flaky Tests Detected</h3>
        <p>All tests are consistently passing or failing.</p>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table class="analytics-table flaky-tests-table">
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Failure Rate</th>
          <th>Total Runs</th>
          <th>Failures</th>
          <th>Last Failure</th>
        </tr>
      </thead>
      <tbody>
        ${flakyTests.map(test => renderFlakyTestRow(test)).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

/**
 * Render a single flaky test row
 */
function renderFlakyTestRow(test) {
  const failureRate = Math.round(test.failureRate * 100);
  const severityClass = getSeverityClass(failureRate);
  const lastFailure = test.lastFailure
    ? new Date(test.lastFailure).toLocaleString()
    : 'N/A';

  return `
    <tr class="flaky-test-row ${severityClass}">
      <td class="test-name">
        <div class="test-name-main">${escapeHtml(test.testName)}</div>
        ${test.testSlug ? `<div class="test-slug">${escapeHtml(test.testSlug)}</div>` : ''}
      </td>
      <td class="failure-rate">
        <div class="rate-bar-container">
          <div class="rate-bar ${severityClass}" style="width: ${failureRate}%"></div>
          <span class="rate-label">${failureRate}%</span>
        </div>
      </td>
      <td class="total-runs">${test.totalRuns}</td>
      <td class="failures">${test.failures}</td>
      <td class="last-failure">${lastFailure}</td>
    </tr>
  `;
}

/**
 * Get severity class based on failure rate
 */
function getSeverityClass(failureRate) {
  if (failureRate >= 50) return 'severity-high';
  if (failureRate >= 25) return 'severity-medium';
  return 'severity-low';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

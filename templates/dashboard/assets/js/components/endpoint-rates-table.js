/**
 * Endpoint Success Rates Table Component
 * Displays API endpoint reliability metrics
 */

/**
 * Render endpoint rates table
 * @param {Array} endpointRates - Array of endpoint rate data
 */
export function renderEndpointRatesTable(endpointRates) {
  const container = document.getElementById('endpoint-rates-container');
  if (!container) return;

  if (!endpointRates || endpointRates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔗</div>
        <h3>No Endpoint Data Available</h3>
        <p>Endpoint metrics will appear once tests with endpoint information are run.</p>
      </div>
    `;
    return;
  }

  const tableHTML = `
    <table class="analytics-table endpoint-rates-table">
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Method</th>
          <th>Success Rate</th>
          <th>Total Calls</th>
          <th>Failed</th>
          <th>Avg Duration</th>
        </tr>
      </thead>
      <tbody>
        ${endpointRates.map(endpoint => renderEndpointRow(endpoint)).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

/**
 * Render a single endpoint row
 */
function renderEndpointRow(endpoint) {
  const successRate = Math.round(endpoint.successRate);
  const healthClass = getHealthClass(successRate);
  const avgDuration = formatDuration(endpoint.avgDuration);

  return `
    <tr class="endpoint-row ${healthClass}">
      <td class="endpoint-path">
        <code>${escapeHtml(endpoint.endpoint)}</code>
      </td>
      <td class="endpoint-method">
        <span class="method-badge ${endpoint.method?.toLowerCase()}">${escapeHtml(endpoint.method || 'N/A')}</span>
      </td>
      <td class="endpoint-success-rate">
        <div class="rate-bar-container">
          <div class="rate-bar ${healthClass}" style="width: ${successRate}%"></div>
          <span class="rate-label">${successRate}%</span>
        </div>
      </td>
      <td class="endpoint-total">${endpoint.totalCalls}</td>
      <td class="endpoint-failed">
        ${endpoint.failed > 0 ? `<span class="failed-count">${endpoint.failed}</span>` : '0'}
      </td>
      <td class="endpoint-duration">${avgDuration}</td>
    </tr>
  `;
}

/**
 * Get health class based on success rate
 */
function getHealthClass(successRate) {
  if (successRate >= 95) return 'health-excellent';
  if (successRate >= 90) return 'health-good';
  if (successRate >= 75) return 'health-fair';
  return 'health-poor';
}

/**
 * Format duration in ms to readable string
 */
function formatDuration(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
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

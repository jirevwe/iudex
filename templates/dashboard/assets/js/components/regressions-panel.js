/**
 * Regressions Panel Component
 * Displays tests that recently started failing
 */

/**
 * Render regressions panel
 * @param {Array} regressions - Array of regression data
 */
export function renderRegressionsPanel(regressions) {
  const container = document.getElementById('regressions-container');
  if (!container) return;

  if (!regressions || regressions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>No Recent Regressions</h3>
        <p>No tests have regressed in the last 7 days.</p>
      </div>
    `;
    return;
  }

  const listHTML = `
    <div class="regressions-list">
      ${regressions.map(regression => renderRegressionCard(regression)).join('')}
    </div>
  `;

  container.innerHTML = listHTML;
}

/**
 * Render a single regression card
 */
function renderRegressionCard(regression) {
  const failureTime = new Date(regression.failureTimestamp).toLocaleString();
  const previousPasses = regression.previousPasses || 0;

  return `
    <div class="regression-card">
      <div class="regression-header">
        <span class="regression-icon">🔴</span>
        <div class="regression-title">
          <div class="regression-test-name">${escapeHtml(regression.testName)}</div>
          ${regression.testSlug ? `<div class="regression-slug">${escapeHtml(regression.testSlug)}</div>` : ''}
        </div>
      </div>
      <div class="regression-details">
        <div class="regression-detail">
          <span class="detail-label">Failed:</span>
          <span class="detail-value">${failureTime}</span>
        </div>
        <div class="regression-detail">
          <span class="detail-label">Previous passes:</span>
          <span class="detail-value">${previousPasses}</span>
        </div>
        ${regression.runId ? `
          <div class="regression-detail">
            <span class="detail-label">Run ID:</span>
            <span class="detail-value">${escapeHtml(regression.runId)}</span>
          </div>
        ` : ''}
      </div>
      <div class="regression-status">
        Previously passing test now failing
      </div>
    </div>
  `;
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

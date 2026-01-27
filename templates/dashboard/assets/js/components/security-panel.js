/**
 * Security Panel Component
 * Renders security findings with severity filtering
 */

let allFindings = [];
let filteredFindings = [];

/**
 * Render security panel
 * @param {Object} security - Security data with findings
 */
export function renderSecurityPanel(security) {
  const container = document.getElementById('security-panel-container');
  const badge = document.getElementById('security-badge');

  if (!security) {
    showEmptyState(container, 'No security data available');
    badge.textContent = '0';
    return;
  }

  allFindings = security.findings || [];
  badge.textContent = allFindings.length;

  if (allFindings.length === 0) {
    showEmptyState(container, '✅ No security findings detected!');
    return;
  }

  filteredFindings = [...allFindings];
  renderPanel();
  setupEventListeners();
}

/**
 * Render the panel with current filtered findings
 */
function renderPanel() {
  const container = document.getElementById('security-panel-container');

  if (filteredFindings.length === 0) {
    showEmptyState(container, 'No findings match the current filter');
    return;
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filteredFindings].sort((a, b) => {
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  container.innerHTML = sorted.map(finding => `
    <div class="finding-card ${finding.severity}">
      <div class="card-header">
        <div class="card-title">${escapeHtml(finding.type || 'Unknown Type')}</div>
        <span class="severity-badge ${finding.severity}">${finding.severity}</span>
      </div>
      <div class="card-description">
        ${escapeHtml(finding.message || 'No description provided')}
      </div>
      <div class="card-meta">
        ${finding.testName ? `
          <div class="meta-item">
            <span class="meta-label">Test:</span>
            <span>${escapeHtml(finding.testName)}</span>
          </div>
        ` : ''}
        ${finding.endpoint ? `
          <div class="meta-item">
            <span class="meta-label">Endpoint:</span>
            <span>${escapeHtml(finding.endpoint)}</span>
          </div>
        ` : ''}
        ${finding.method ? `
          <div class="meta-item">
            <span class="meta-label">Method:</span>
            <span>${escapeHtml(finding.method)}</span>
          </div>
        ` : ''}
        ${finding.details ? `
          <div class="meta-item">
            <span class="meta-label">Details:</span>
            <span>${escapeHtml(finding.details)}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Setup event listeners for filtering
 */
function setupEventListeners() {
  const filterSelect = document.getElementById('security-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      filterFindings(e.target.value);
    });
  }
}

/**
 * Filter findings by severity
 * @param {string} severity - Severity filter ('all', 'critical', 'high', 'medium', 'low')
 */
function filterFindings(severity) {
  if (severity === 'all') {
    filteredFindings = [...allFindings];
  } else {
    filteredFindings = allFindings.filter(f => f.severity === severity);
  }

  renderPanel();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show empty state
 */
function showEmptyState(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🔒</div>
      <div>${message}</div>
    </div>
  `;
}

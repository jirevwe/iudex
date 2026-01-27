/**
 * Governance Panel Component
 * Renders governance violations and warnings
 */

let allViolations = [];
let allWarnings = [];
let filteredIssues = [];

/**
 * Render governance panel
 * @param {Object} governance - Governance data with violations and warnings
 */
export function renderGovernancePanel(governance) {
  const container = document.getElementById('governance-panel-container');
  const badge = document.getElementById('governance-badge');

  if (!governance) {
    showEmptyState(container, 'No governance data available');
    badge.textContent = '0';
    return;
  }

  allViolations = governance.violations || [];
  allWarnings = governance.warnings || [];

  const totalIssues = allViolations.length + allWarnings.length;
  badge.textContent = totalIssues;

  if (totalIssues === 0) {
    showEmptyState(container, '✅ No governance violations found!');
    return;
  }

  // Combine and mark type
  filteredIssues = [
    ...allViolations.map(v => ({ ...v, type: 'violation' })),
    ...allWarnings.map(w => ({ ...w, type: 'warning' }))
  ];

  renderPanel();
  setupEventListeners();
}

/**
 * Render the panel with current filtered issues
 */
function renderPanel() {
  const container = document.getElementById('governance-panel-container');

  if (filteredIssues.length === 0) {
    showEmptyState(container, 'No issues match the current filter');
    return;
  }

  container.innerHTML = filteredIssues.map(issue => `
    <div class="violation-card ${issue.type}">
      <div class="card-header">
        <div class="card-title">${escapeHtml(issue.rule || 'Unknown Rule')}</div>
        <span class="severity-badge ${issue.type}">${issue.type}</span>
      </div>
      <div class="card-description">
        ${escapeHtml(issue.message || 'No description provided')}
      </div>
      <div class="card-meta">
        ${issue.testName ? `
          <div class="meta-item">
            <span class="meta-label">Test:</span>
            <span>${escapeHtml(issue.testName)}</span>
          </div>
        ` : ''}
        ${issue.endpoint ? `
          <div class="meta-item">
            <span class="meta-label">Endpoint:</span>
            <span>${escapeHtml(issue.endpoint)}</span>
          </div>
        ` : ''}
        ${issue.method ? `
          <div class="meta-item">
            <span class="meta-label">Method:</span>
            <span>${escapeHtml(issue.method)}</span>
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
  const filterSelect = document.getElementById('governance-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      filterIssues(e.target.value);
    });
  }
}

/**
 * Filter issues by type
 * @param {string} type - Filter type ('all', 'violation', 'warning')
 */
function filterIssues(type) {
  if (type === 'all') {
    filteredIssues = [
      ...allViolations.map(v => ({ ...v, type: 'violation' })),
      ...allWarnings.map(w => ({ ...w, type: 'warning' }))
    ];
  } else if (type === 'violation') {
    filteredIssues = allViolations.map(v => ({ ...v, type: 'violation' }));
  } else if (type === 'warning') {
    filteredIssues = allWarnings.map(w => ({ ...w, type: 'warning' }));
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
      <div class="empty-state-icon">📋</div>
      <div>${message}</div>
    </div>
  `;
}

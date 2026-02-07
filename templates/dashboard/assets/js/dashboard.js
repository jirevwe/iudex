/**
 * Main Dashboard Application
 * Initializes and coordinates all dashboard components
 */

import { createDataLoader } from './data-loader.js';
import { renderSummaryCards } from './components/summary-cards.js';
import { renderTestTable } from './components/test-table.js';
import { renderSpreadsheetTable, applyGlobalFilter, toggleColumn, getVisibleColumns, getColumns, exportToCSV } from './components/spreadsheet-table.js';
import { renderGovernancePanel } from './components/governance-panel.js';
import { renderSecurityPanel } from './components/security-panel.js';
import { renderAnalyticsOverview, showAnalyticsLoading, showAnalyticsUnavailable } from './components/analytics-overview.js';
import { renderFlakyTestsTable } from './components/flaky-tests-table.js';
import { renderRegressionsPanel } from './components/regressions-panel.js';
import { renderTrendChart } from './components/trend-chart.js';
import { renderEndpointRatesTable } from './components/endpoint-rates-table.js';

let dataLoader;
let currentRunId = null;
let runsIndex = null;
let currentView = 'grouped'; // 'grouped' | 'spreadsheet'
let currentSuitesData = null;
let currentDeletedTests = [];

/**
 * Initialize dashboard
 */
async function initDashboard() {
  try {
    // Initialize data loader from global config
    dataLoader = createDataLoader();

    // Set dashboard title if configured
    const config = window.IUDEX_CONFIG || {};
    if (config.title) {
      document.querySelector('.dashboard-title').textContent = config.title;
      document.title = config.title;
    }

    // Load runs index
    runsIndex = await dataLoader.loadRuns();
    renderRunSelector(runsIndex);

    // Load latest run
    if (runsIndex.latest) {
      await loadRun(runsIndex.latest);
    } else {
      showError('No test runs found');
    }

    // Setup event listeners
    setupEventListeners();

    // Hide loading, show content
    hideLoading();
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showError(error.message);
  }
}

/**
 * Load and render a specific test run
 * @param {string} runId - Run identifier
 */
async function loadRun(runId) {
  try {
    showLoading();

    const runData = await dataLoader.loadRun(runId);
    currentRunId = runId;

    // Fetch deleted tests if in server mode (for marking deleted tests in UI)
    let deletedTests = [];
    const config = window.IUDEX_CONFIG || {};
    if (config.mode === 'server') {
      try {
        const deletedData = await dataLoader.loadAnalytics('deleted-tests', { limit: 1000 });
        if (deletedData.available && deletedData.data) {
          deletedTests = deletedData.data;
        }
      } catch (err) {
        console.warn('Could not fetch deleted tests:', err);
      }
    }

    // Cache data for view switching
    currentSuitesData = runData.suites;
    currentDeletedTests = deletedTests;

    // Render all components
    renderSummaryCards(runData.summary);
    renderTestTable(runData.suites, deletedTests);
    renderSpreadsheetTable(runData.suites, deletedTests);
    renderGovernancePanel(runData.governance);
    renderSecurityPanel(runData.security);
    renderGitInfo(runData.metadata?.gitInfo);

    // Render column visibility menu
    renderColumnVisibilityMenu();

    hideLoading();
  } catch (error) {
    console.error(`Failed to load run ${runId}:`, error);
    showError(error.message);
  }
}

/**
 * Render run selector dropdown
 * @param {Object} runsIndex - Runs index data
 */
function renderRunSelector(runsIndex) {
  const selector = document.getElementById('run-selector');

  if (!runsIndex.runs || runsIndex.runs.length === 0) {
    selector.innerHTML = '<option value="">No runs available</option>';
    return;
  }

  selector.innerHTML = runsIndex.runs.map(run => {
    const date = new Date(run.timestamp);
    const label = `${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${run.summary.total} tests`;
    return `<option value="${run.id}">${label}</option>`;
  }).join('');

  // Select latest run
  if (runsIndex.latest) {
    selector.value = runsIndex.latest;
  }
}

/**
 * Render git information
 * @param {Object} gitInfo - Git metadata
 */
function renderGitInfo(gitInfo) {
  const section = document.getElementById('git-info-section');

  if (!gitInfo || !gitInfo.branch) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  document.getElementById('git-branch').textContent = gitInfo.branch || 'N/A';

  // Handle both 'commit' and 'commitSha' field names
  const commitHash = gitInfo.commit || gitInfo.commitSha;
  document.getElementById('git-commit').textContent = commitHash?.substring(0, 7) || 'N/A';

  // Handle both 'message' and 'commitMessage' field names
  const commitMessage = gitInfo.message || gitInfo.commitMessage;
  document.getElementById('git-message').textContent = commitMessage || 'N/A';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Run selector
  const runSelector = document.getElementById('run-selector');
  if (runSelector) {
    runSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        loadRun(e.target.value);
      }
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      if (currentRunId) {
        await loadRun(currentRunId);
      }
    });
  }

  // Retry button (error state)
  const retryBtn = document.getElementById('retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      location.reload();
    });
  }

  // Tab navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);

      // Load analytics when tab is clicked
      if (tabName === 'analytics') {
        await loadAnalytics();
      }
    });
  });

  // Analytics refresh button
  const refreshAnalyticsBtn = document.getElementById('refresh-analytics-btn');
  if (refreshAnalyticsBtn) {
    refreshAnalyticsBtn.addEventListener('click', async () => {
      await loadAnalytics();
    });
  }

  // View toggle buttons
  const viewGroupedBtn = document.getElementById('view-grouped-btn');
  const viewSpreadsheetBtn = document.getElementById('view-spreadsheet-btn');

  if (viewGroupedBtn) {
    viewGroupedBtn.addEventListener('click', () => switchView('grouped'));
  }
  if (viewSpreadsheetBtn) {
    viewSpreadsheetBtn.addEventListener('click', () => switchView('spreadsheet'));
  }

  // Column visibility dropdown toggle
  const columnVisibilityBtn = document.getElementById('column-visibility-btn');
  const columnVisibilityMenu = document.getElementById('column-visibility-menu');

  if (columnVisibilityBtn && columnVisibilityMenu) {
    columnVisibilityBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      columnVisibilityMenu.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!columnVisibilityMenu.contains(e.target) && e.target !== columnVisibilityBtn) {
        columnVisibilityMenu.classList.remove('open');
      }
    });
  }

  // Export CSV button
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportToCSV();
    });
  }

  // Wire search/filter to both views
  const searchInput = document.getElementById('test-search');
  const filterSelect = document.getElementById('test-filter');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (currentView === 'spreadsheet') {
        applyGlobalFilter(searchInput.value, filterSelect?.value || 'all');
      }
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      if (currentView === 'spreadsheet') {
        applyGlobalFilter(searchInput?.value || '', filterSelect.value);
      }
    });
  }
}

/**
 * Switch active tab
 * @param {string} tabName - Tab identifier
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

/**
 * Switch between grouped and spreadsheet views
 * @param {string} view - 'grouped' | 'spreadsheet'
 */
function switchView(view) {
  currentView = view;

  // Update toggle buttons
  document.getElementById('view-grouped-btn')?.classList.toggle('active', view === 'grouped');
  document.getElementById('view-spreadsheet-btn')?.classList.toggle('active', view === 'spreadsheet');

  // Show/hide view containers
  const groupedContainer = document.getElementById('test-table-container');
  const spreadsheetContainer = document.getElementById('spreadsheet-container');
  const groupedControls = document.getElementById('grouped-controls');
  const spreadsheetControls = document.getElementById('spreadsheet-controls');

  if (groupedContainer) groupedContainer.style.display = view === 'grouped' ? 'block' : 'none';
  if (spreadsheetContainer) spreadsheetContainer.style.display = view === 'spreadsheet' ? 'block' : 'none';
  if (groupedControls) groupedControls.style.display = view === 'grouped' ? 'flex' : 'none';
  if (spreadsheetControls) spreadsheetControls.style.display = view === 'spreadsheet' ? 'flex' : 'none';

  // Apply current filters to spreadsheet view when switching to it
  if (view === 'spreadsheet') {
    const searchInput = document.getElementById('test-search');
    const filterSelect = document.getElementById('test-filter');
    applyGlobalFilter(searchInput?.value || '', filterSelect?.value || 'all');
  }
}

/**
 * Render column visibility menu
 */
function renderColumnVisibilityMenu() {
  const menu = document.getElementById('column-visibility-menu');
  if (!menu) return;

  const columns = getColumns();
  const visibleColumns = getVisibleColumns();

  let html = '';
  columns.forEach(col => {
    const checked = visibleColumns.has(col.id) ? 'checked' : '';
    html += `
      <label class="column-visibility-item">
        <input type="checkbox" data-column="${col.id}" ${checked}>
        <span>${col.label}</span>
      </label>
    `;
  });

  menu.innerHTML = html;

  // Attach change handlers
  menu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      toggleColumn(e.target.dataset.column);
      // Update checkbox state after toggle (in case it's enforced)
      const newVisibleColumns = getVisibleColumns();
      e.target.checked = newVisibleColumns.has(e.target.dataset.column);
    });
  });
}

/**
 * Show loading state
 */
function showLoading() {
  document.getElementById('loading-state').style.display = 'flex';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('dashboard-content').style.display = 'none';
}

/**
 * Hide loading state
 */
function hideLoading() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('dashboard-content').style.display = 'block';
}

/**
 * Show error state
 * @param {string} message - Error message
 */
function showError(message) {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('dashboard-content').style.display = 'none';
  document.getElementById('error-message').textContent = message;
}

/**
 * Load and render analytics data
 */
async function loadAnalytics() {
  try {
    showAnalyticsLoading();

    // Load all analytics types in parallel
    const [flakyTests, regressions, dailyStats, endpointRates] = await Promise.all([
      dataLoader.loadAnalytics('flaky-tests', { limit: 20, days: 30 }),
      dataLoader.loadAnalytics('regressions', { limit: 20, days: 7 }),
      dataLoader.loadAnalytics('daily-stats', { days: 30 }),
      dataLoader.loadAnalytics('endpoint-rates', { limit: 20, days: 30 })
    ]);

    // Check if analytics are available
    if (!flakyTests.available && !regressions.available && !dailyStats.available && !endpointRates.available) {
      showAnalyticsUnavailable();
      return;
    }

    // Render all analytics components
    const analyticsData = {
      flakyTests,
      regressions,
      dailyStats,
      endpointRates
    };

    renderAnalyticsOverview(analyticsData);
    renderFlakyTestsTable(flakyTests.data || []);
    renderRegressionsPanel(regressions.data || []);
    renderTrendChart(dailyStats.data || []);
    renderEndpointRatesTable(endpointRates.data || []);
  } catch (error) {
    console.error('Failed to load analytics:', error);
    showAnalyticsUnavailable();
  }
}

// Start dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

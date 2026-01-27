/**
 * Main Dashboard Application
 * Initializes and coordinates all dashboard components
 */

import { createDataLoader } from './data-loader.js';
import { renderSummaryCards } from './components/summary-cards.js';
import { renderTestTable } from './components/test-table.js';
import { renderGovernancePanel } from './components/governance-panel.js';
import { renderSecurityPanel } from './components/security-panel.js';

let dataLoader;
let currentRunId = null;
let runsIndex = null;

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

    // Render all components
    renderSummaryCards(runData.summary);
    renderTestTable(runData.suites);
    renderGovernancePanel(runData.governance);
    renderSecurityPanel(runData.security);
    renderGitInfo(runData.metadata?.gitInfo);

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
  document.getElementById('git-branch').textContent = gitInfo.branch;
  document.getElementById('git-commit').textContent = gitInfo.commitSha?.substring(0, 7) || 'N/A';
  document.getElementById('git-message').textContent = gitInfo.commitMessage || 'N/A';
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
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
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

// Start dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

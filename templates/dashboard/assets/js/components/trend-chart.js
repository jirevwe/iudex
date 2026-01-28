/**
 * Trend Chart Component
 * Displays daily test statistics in a simple bar chart
 */

/**
 * Render trend chart
 * @param {Array} dailyStats - Array of daily statistics
 */
export function renderTrendChart(dailyStats) {
  const container = document.getElementById('trend-chart-container');
  if (!container) return;

  if (!dailyStats || dailyStats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No Trend Data Available</h3>
        <p>Historical data will appear here once tests are run over multiple days.</p>
      </div>
    `;
    return;
  }

  // Reverse to show oldest first (left to right)
  const sortedStats = [...dailyStats].reverse();

  // Find max values for scaling
  const maxTests = Math.max(...sortedStats.map(s => s.totalTests));
  const maxDuration = Math.max(...sortedStats.map(s => s.avgDuration || 0));

  const chartHTML = `
    <div class="trend-chart">
      <div class="chart-header">
        <h3>Daily Test Trends</h3>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-color passed"></span> Passed</span>
          <span class="legend-item"><span class="legend-color failed"></span> Failed</span>
          <span class="legend-item"><span class="legend-color skipped"></span> Skipped</span>
        </div>
      </div>
      <div class="chart-bars">
        ${sortedStats.map(stat => renderDayBar(stat, maxTests)).join('')}
      </div>
      <div class="chart-metrics">
        <div class="metric">
          <span class="metric-label">Average Pass Rate:</span>
          <span class="metric-value">${calculateAvgPassRate(sortedStats)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Total Runs:</span>
          <span class="metric-value">${sortedStats.reduce((sum, s) => sum + s.totalRuns, 0)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Avg Duration:</span>
          <span class="metric-value">${formatDuration(Math.round(sortedStats.reduce((sum, s) => sum + (s.avgDuration || 0), 0) / sortedStats.length))}</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = chartHTML;
}

/**
 * Render a single day bar
 */
function renderDayBar(stat, maxTests) {
  const date = new Date(stat.date);
  const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const total = stat.totalTests;
  const passed = stat.passed || 0;
  const failed = stat.failed || 0;
  const skipped = stat.skipped || 0;

  const passedHeight = (passed / maxTests) * 100;
  const failedHeight = (failed / maxTests) * 100;
  const skippedHeight = (skipped / maxTests) * 100;

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return `
    <div class="chart-bar-group" title="${dateLabel}: ${total} tests, ${passRate}% pass rate">
      <div class="chart-bar-stack">
        ${failed > 0 ? `<div class="bar-segment failed" style="height: ${failedHeight}%"></div>` : ''}
        ${skipped > 0 ? `<div class="bar-segment skipped" style="height: ${skippedHeight}%"></div>` : ''}
        ${passed > 0 ? `<div class="bar-segment passed" style="height: ${passedHeight}%"></div>` : ''}
      </div>
      <div class="chart-bar-label">${dateLabel}</div>
      <div class="chart-bar-count">${total}</div>
    </div>
  `;
}

/**
 * Calculate average pass rate
 */
function calculateAvgPassRate(stats) {
  if (stats.length === 0) return 0;

  const totalTests = stats.reduce((sum, s) => sum + s.totalTests, 0);
  const totalPassed = stats.reduce((sum, s) => sum + (s.passed || 0), 0);

  return totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
}

/**
 * Format duration in ms to readable string
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

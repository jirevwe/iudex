/**
 * Analytics Overview Component
 * Displays key analytics metrics in card format
 */

/**
 * Render analytics overview cards
 * @param {Object} data - Analytics data
 */
export function renderAnalyticsOverview(data) {
  const container = document.getElementById('analytics-overview');
  if (!container) return;

  // Calculate overview metrics
  const metrics = calculateOverviewMetrics(data);

  container.innerHTML = `
    <div class="analytics-cards">
      <div class="analytics-card flaky">
        <div class="card-icon">⚠️</div>
        <div class="card-content">
          <div class="card-value">${metrics.flakyCount}</div>
          <div class="card-label">Flaky Tests</div>
          <div class="card-detail">${metrics.flakyRate}% failure rate</div>
        </div>
      </div>

      <div class="analytics-card regressions">
        <div class="card-icon">📉</div>
        <div class="card-content">
          <div class="card-value">${metrics.regressionCount}</div>
          <div class="card-label">Recent Regressions</div>
          <div class="card-detail">Last ${metrics.regressionDays} days</div>
        </div>
      </div>

      <div class="analytics-card health">
        <div class="card-icon">💚</div>
        <div class="card-content">
          <div class="card-value">${metrics.avgPassRate}%</div>
          <div class="card-label">Average Pass Rate</div>
          <div class="card-detail">Last ${metrics.trendDays} days</div>
        </div>
      </div>

      <div class="analytics-card endpoints">
        <div class="card-icon">🔗</div>
        <div class="card-content">
          <div class="card-value">${metrics.endpointCount}</div>
          <div class="card-label">Monitored Endpoints</div>
          <div class="card-detail">${metrics.failingEndpoints} with issues</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate overview metrics from analytics data
 */
function calculateOverviewMetrics(data) {
  const flakyTests = data.flakyTests?.data || [];
  const regressions = data.regressions?.data || [];
  const dailyStats = data.dailyStats?.data || [];
  const endpointRates = data.endpointRates?.data || [];

  // Calculate average pass rate
  let avgPassRate = 0;
  if (dailyStats.length > 0) {
    const totalPassRate = dailyStats.reduce((sum, day) => sum + day.passRate, 0);
    avgPassRate = Math.round(totalPassRate / dailyStats.length);
  }

  // Count failing endpoints (< 90% success rate)
  const failingEndpoints = endpointRates.filter(ep => ep.successRate < 90).length;

  return {
    flakyCount: flakyTests.length,
    flakyRate: flakyTests.length > 0
      ? Math.round(flakyTests[0].failureRate * 100)
      : 0,
    regressionCount: regressions.length,
    regressionDays: 7,
    avgPassRate,
    trendDays: dailyStats.length,
    endpointCount: endpointRates.length,
    failingEndpoints
  };
}

/**
 * Show loading state
 */
export function showAnalyticsLoading() {
  const container = document.getElementById('analytics-overview');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading analytics...</p>
    </div>
  `;
}

/**
 * Show error state
 */
export function showAnalyticsError(message) {
  const container = document.getElementById('analytics-overview');
  if (!container) return;

  container.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Show empty state when analytics not available
 */
export function showAnalyticsUnavailable() {
  const container = document.getElementById('analytics-overview');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📊</div>
      <h3>Analytics Not Available</h3>
      <p>Database analytics require PostgreSQL persistence to be enabled.</p>
      <p class="empty-hint">Configure a database repository to enable advanced analytics.</p>
    </div>
  `;
}

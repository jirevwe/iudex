/**
 * Summary Cards Component
 * Renders test summary statistics
 */

/**
 * Render summary cards with test statistics
 * @param {Object} summary - Test summary data
 */
export function renderSummaryCards(summary) {
  if (!summary) return;

  // Update card values
  document.getElementById('summary-total').textContent = summary.total || 0;
  document.getElementById('summary-passed').textContent = summary.passed || 0;
  document.getElementById('summary-failed').textContent = summary.failed || 0;
  document.getElementById('summary-skipped').textContent = summary.skipped || 0;

  // Format duration
  const durationSeconds = Math.round((summary.duration || 0) / 1000);
  document.getElementById('summary-duration').textContent = formatDuration(durationSeconds);
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

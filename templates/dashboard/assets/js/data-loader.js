/**
 * Data Loader
 * Abstracts data loading - works with both mounted server API and static JSON files
 */
export class DataLoader {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || '';
    this.mode = config.mode || 'server'; // 'server' or 'static'
  }

  /**
   * Load list of available test runs
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Runs index with pagination
   */
  async loadRuns(options = {}) {
    const { limit = 50, cursor = null } = options;

    if (this.mode === 'server') {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (cursor) params.append('cursor', cursor);

      const response = await fetch(`${this.baseUrl}/api/runs?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to load runs: ${response.statusText}`);
      }
      return await response.json();
    } else {
      // Static mode: read from generated runs.json
      const response = await fetch('./data/runs.json');
      if (!response.ok) {
        throw new Error(`Failed to load runs: ${response.statusText}`);
      }
      return await response.json();
    }
  }

  /**
   * Load specific run details
   * @param {string} runId - Run identifier
   * @returns {Promise<Object>} Full test run data
   */
  async loadRun(runId) {
    if (this.mode === 'server') {
      const response = await fetch(`${this.baseUrl}/api/run/${runId}`);
      if (!response.ok) {
        throw new Error(`Failed to load run ${runId}: ${response.statusText}`);
      }
      return await response.json();
    } else {
      // Static mode: read from data/ directory
      const response = await fetch(`./data/${runId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load run ${runId}: ${response.statusText}`);
      }
      return await response.json();
    }
  }

  /**
   * Load analytics data (optional, PostgreSQL-backed)
   * @param {string} type - Analytics type ('flaky-tests', 'regressions', etc.)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics data or unavailable status
   */
  async loadAnalytics(type = 'flaky-tests', options = {}) {
    // Analytics only available in server mode
    if (this.mode !== 'server') {
      return { available: false };
    }

    try {
      const params = new URLSearchParams({ type, ...options });
      const response = await fetch(`${this.baseUrl}/api/analytics?${params}`);

      if (!response.ok) {
        console.warn('Analytics not available:', response.statusText);
        return { available: false };
      }

      return await response.json();
    } catch (error) {
      console.warn('Analytics unavailable:', error);
      return { available: false };
    }
  }
}

/**
 * Create data loader from global config
 */
export function createDataLoader() {
  const config = window.IUDEX_CONFIG || {};
  return new DataLoader({
    mode: config.mode || 'static',
    baseUrl: config.baseUrl || ''
  });
}

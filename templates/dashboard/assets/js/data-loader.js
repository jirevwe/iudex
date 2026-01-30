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
      // Try new endpoint format first: /api/analytics/flaky-tests
      const params = new URLSearchParams(options);
      let response = await fetch(`${this.baseUrl}/api/analytics/${type}?${params}`);

      // Fallback to old format if new format not found: /api/analytics?type=flaky-tests
      if (!response.ok && response.status === 404) {
        const oldParams = new URLSearchParams({ type, ...options });
        response = await fetch(`${this.baseUrl}/api/analytics?${oldParams}`);
      }

      if (!response.ok) {
        console.warn('Analytics not available:', response.statusText);
        return { available: false };
      }

      const result = await response.json();

      // Transform response to expected format { available: true, data: [...] }
      // API returns: { flakyTests: [...], count: N } or { regressions: [...], count: N }
      // Dashboard expects: { available: true, data: [...] }
      const dataKey = this.getDataKeyForType(type);
      const data = result[dataKey] || [];

      return {
        available: true,
        data: data,
        count: result.count || data.length
      };
    } catch (error) {
      console.warn('Analytics unavailable:', error);
      return { available: false };
    }
  }

  /**
   * Get the data key name for each analytics type
   * @param {string} type - Analytics type
   * @returns {string} Data key name
   */
  getDataKeyForType(type) {
    const keyMap = {
      'flaky-tests': 'flakyTests',
      'regressions': 'regressions',
      'daily-stats': 'dailyStats',
      'endpoint-rates': 'endpointRates',
      'health-scores': 'healthScores',
      'deleted-tests': 'deletedTests'
    };
    return keyMap[type] || type;
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

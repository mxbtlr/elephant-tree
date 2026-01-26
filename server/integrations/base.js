/**
 * Base integration class for all data source integrations
 */
class BaseIntegration {
  constructor(config) {
    this.config = config || {};
    this.name = 'Base';
  }

  /**
   * Validate configuration
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateConfig() {
    return { valid: true };
  }

  /**
   * Test connection to the service
   * @returns {Promise<Object>} { success: boolean, message?: string }
   */
  async testConnection() {
    throw new Error('testConnection must be implemented by subclass');
  }

  /**
   * Fetch data from the service
   * @param {Object} options - Fetch options (date range, filters, etc.)
   * @returns {Promise<Array>} Array of data points
   */
  async fetchData(options = {}) {
    throw new Error('fetchData must be implemented by subclass');
  }

  /**
   * Get available metrics/fields for this integration
   * @returns {Array} Array of available metric definitions
   */
  getAvailableMetrics() {
    return [];
  }
}

module.exports = BaseIntegration;






const axios = require('axios');
const BaseIntegration = require('./base');

/**
 * Microsoft Clarity Integration
 * Fetches website analytics data from Microsoft Clarity API
 */
class MicrosoftClarityIntegration extends BaseIntegration {
  constructor(config) {
    super(config);
    this.name = 'Microsoft Clarity';
    this.apiBaseUrl = 'https://www.clarity.ms/api';
  }

  validateConfig() {
    const { projectId, apiKey } = this.config;
    if (!projectId) {
      return { valid: false, error: 'Project ID is required' };
    }
    if (!apiKey) {
      return { valid: false, error: 'API Key is required' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      const { projectId, apiKey } = this.config;
      // Test API connection
      const response = await axios.get(`${this.apiBaseUrl}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Connection failed' 
      };
    }
  }

  async fetchData(options = {}) {
    const { projectId, apiKey } = this.config;
    const { startDate, endDate } = options;
    
    try {
      const dataPoints = [];
      
      // Fetch summary metrics
      const summaryResponse = await axios.get(
        `${this.apiBaseUrl}/projects/${projectId}/summary`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          params: {
            startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: endDate || new Date().toISOString().split('T')[0]
          },
          timeout: 30000
        }
      );

      const summary = summaryResponse.data;

      // Create data points from Clarity metrics
      if (summary.visitors !== undefined) {
        dataPoints.push({
          name: 'Total Visitors',
          value: summary.visitors,
          unit: 'visitors',
          metadata: {
            dateRange: { startDate, endDate },
            source: 'microsoft-clarity'
          }
        });
      }

      if (summary.sessions !== undefined) {
        dataPoints.push({
          name: 'Total Sessions',
          value: summary.sessions,
          unit: 'sessions',
          metadata: {
            dateRange: { startDate, endDate },
            source: 'microsoft-clarity'
          }
        });
      }

      if (summary.pageViews !== undefined) {
        dataPoints.push({
          name: 'Page Views',
          value: summary.pageViews,
          unit: 'views',
          metadata: {
            dateRange: { startDate, endDate },
            source: 'microsoft-clarity'
          }
        });
      }

      if (summary.bounceRate !== undefined) {
        dataPoints.push({
          name: 'Bounce Rate',
          value: summary.bounceRate,
          unit: '%',
          metadata: {
            dateRange: { startDate, endDate },
            source: 'microsoft-clarity'
          }
        });
      }

      if (summary.avgSessionDuration !== undefined) {
        dataPoints.push({
          name: 'Avg Session Duration',
          value: Math.round(summary.avgSessionDuration / 60), // Convert to minutes
          unit: 'minutes',
          metadata: {
            dateRange: { startDate, endDate },
            source: 'microsoft-clarity'
          }
        });
      }

      // Fetch top pages if available
      try {
        const pagesResponse = await axios.get(
          `${this.apiBaseUrl}/projects/${projectId}/pages`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            params: {
              startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: endDate || new Date().toISOString().split('T')[0],
              limit: 10
            },
            timeout: 30000
          }
        );

        if (pagesResponse.data && pagesResponse.data.pages) {
          pagesResponse.data.pages.forEach((page, index) => {
            dataPoints.push({
              name: `Page Views: ${page.path || page.url || 'Unknown'}`,
              value: page.views || 0,
              unit: 'views',
              metadata: {
                pagePath: page.path || page.url,
                rank: index + 1,
                dateRange: { startDate, endDate },
                source: 'microsoft-clarity'
              }
            });
          });
        }
      } catch (pagesError) {
        console.warn('Could not fetch page data from Clarity:', pagesError.message);
      }

      return dataPoints;
    } catch (error) {
      console.error('Error fetching Clarity data:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch data from Microsoft Clarity'
      );
    }
  }

  getAvailableMetrics() {
    return [
      { name: 'Total Visitors', unit: 'visitors', description: 'Total number of unique visitors' },
      { name: 'Total Sessions', unit: 'sessions', description: 'Total number of sessions' },
      { name: 'Page Views', unit: 'views', description: 'Total page views' },
      { name: 'Bounce Rate', unit: '%', description: 'Percentage of single-page sessions' },
      { name: 'Avg Session Duration', unit: 'minutes', description: 'Average session duration in minutes' },
      { name: 'Top Pages', unit: 'views', description: 'Page views by page path' }
    ];
  }
}

module.exports = MicrosoftClarityIntegration;






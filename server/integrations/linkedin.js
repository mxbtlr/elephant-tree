const axios = require('axios');
const BaseIntegration = require('./base');

/**
 * LinkedIn Integration
 * Fetches analytics data from LinkedIn Marketing API
 */
class LinkedInIntegration extends BaseIntegration {
  constructor(config) {
    super(config);
    this.name = 'LinkedIn';
    this.apiBaseUrl = 'https://api.linkedin.com/v2';
    this.analyticsBaseUrl = 'https://api.linkedin.com/v2/analytics';
  }

  validateConfig() {
    const { accessToken, organizationId } = this.config;
    if (!accessToken) {
      return { valid: false, error: 'Access Token is required' };
    }
    if (!organizationId) {
      return { valid: false, error: 'Organization ID (URN) is required' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      const { accessToken, organizationId } = this.config;
      const response = await axios.get(
        `${this.apiBaseUrl}/organizations/${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || error.message || 'Connection failed' 
      };
    }
  }

  async fetchData(options = {}) {
    const { accessToken, organizationId } = this.config;
    const { startDate, endDate, pageId } = options;
    
    try {
      const dataPoints = [];
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // Fetch page analytics
      if (pageId) {
        const pageStats = await this.fetchPageStats(accessToken, pageId, start, end);
        dataPoints.push(...pageStats);
      }

      // Fetch organization follower statistics
      try {
        const followerResponse = await axios.get(
          `${this.analyticsBaseUrl}/organizationFollowerStatistics`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              q: 'organization',
              organization: organizationId,
              timeGranularity: 'DAY',
              startTime: Math.floor(new Date(start).getTime() / 1000),
              endTime: Math.floor(new Date(end).getTime() / 1000)
            },
            timeout: 30000
          }
        );

        if (followerResponse.data && followerResponse.data.elements) {
          const stats = followerResponse.data.elements[0];
          if (stats.followerCounts) {
            dataPoints.push({
              name: 'LinkedIn Followers',
              value: stats.followerCounts.organicFollowerCount || 0,
              unit: 'followers',
              metadata: {
                dateRange: { startDate: start, endDate: end },
                source: 'linkedin',
                type: 'followers'
              }
            });
          }
        }
      } catch (followerError) {
        console.warn('Could not fetch follower stats:', followerError.message);
      }

      // Fetch share statistics
      try {
        const shareResponse = await axios.get(
          `${this.analyticsBaseUrl}/shareStatistics`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            params: {
              q: 'owners',
              owners: organizationId,
              timeGranularity: 'DAY',
              startTime: Math.floor(new Date(start).getTime() / 1000),
              endTime: Math.floor(new Date(end).getTime() / 1000)
            },
            timeout: 30000
          }
        );

        if (shareResponse.data && shareResponse.data.elements) {
          const stats = shareResponse.data.elements[0];
          
          if (stats.shareStatistics) {
            const shareStats = stats.shareStatistics;
            
            dataPoints.push({
              name: 'LinkedIn Impressions',
              value: shareStats.impressionCount || 0,
              unit: 'impressions',
              metadata: {
                dateRange: { startDate: start, endDate: end },
                source: 'linkedin',
                type: 'shares'
              }
            });

            dataPoints.push({
              name: 'LinkedIn Clicks',
              value: shareStats.clickCount || 0,
              unit: 'clicks',
              metadata: {
                dateRange: { startDate: start, endDate: end },
                source: 'linkedin',
                type: 'shares'
              }
            });

            if (shareStats.impressionCount && shareStats.clickCount) {
              const ctr = (shareStats.clickCount / shareStats.impressionCount) * 100;
              dataPoints.push({
                name: 'LinkedIn CTR',
                value: parseFloat(ctr.toFixed(2)),
                unit: '%',
                metadata: {
                  dateRange: { startDate: start, endDate: end },
                  source: 'linkedin',
                  type: 'shares'
                }
              });
            }

            dataPoints.push({
              name: 'LinkedIn Engagement',
              value: shareStats.engagementCount || 0,
              unit: 'engagements',
              metadata: {
                dateRange: { startDate: start, endDate: end },
                source: 'linkedin',
                type: 'shares'
              }
            });
          }
        }
      } catch (shareError) {
        console.warn('Could not fetch share stats:', shareError.message);
      }

      return dataPoints;
    } catch (error) {
      console.error('Error fetching LinkedIn data:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch data from LinkedIn'
      );
    }
  }

  async fetchPageStats(accessToken, pageId, startDate, endDate) {
    const dataPoints = [];
    // Implementation for page-specific stats
    // This would require additional API calls
    return dataPoints;
  }

  getAvailableMetrics() {
    return [
      { name: 'LinkedIn Followers', unit: 'followers', description: 'Total organization followers' },
      { name: 'LinkedIn Impressions', unit: 'impressions', description: 'Total post impressions' },
      { name: 'LinkedIn Clicks', unit: 'clicks', description: 'Total clicks on posts' },
      { name: 'LinkedIn CTR', unit: '%', description: 'Click-through rate' },
      { name: 'LinkedIn Engagement', unit: 'engagements', description: 'Total engagements (likes, comments, shares)' }
    ];
  }
}

module.exports = LinkedInIntegration;






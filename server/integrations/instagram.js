const axios = require('axios');
const BaseIntegration = require('./base');

/**
 * Instagram Integration
 * Fetches analytics data from Instagram Graph API
 */
class InstagramIntegration extends BaseIntegration {
  constructor(config) {
    super(config);
    this.name = 'Instagram';
    this.apiBaseUrl = 'https://graph.facebook.com/v18.0';
  }

  validateConfig() {
    const { accessToken, businessAccountId } = this.config;
    if (!accessToken) {
      return { valid: false, error: 'Access Token is required' };
    }
    if (!businessAccountId) {
      return { valid: false, error: 'Business Account ID is required' };
    }
    return { valid: true };
  }

  async testConnection() {
    try {
      const { accessToken, businessAccountId } = this.config;
      const response = await axios.get(
        `${this.apiBaseUrl}/${businessAccountId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,username'
          },
          timeout: 10000
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error?.message || error.message || 'Connection failed' 
      };
    }
  }

  async fetchData(options = {}) {
    const { accessToken, businessAccountId } = this.config;
    const { startDate, endDate } = options;
    
    try {
      const dataPoints = [];
      const start = startDate || Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const end = endDate || Math.floor(Date.now() / 1000);

      // Fetch insights for the business account
      const insightsResponse = await axios.get(
        `${this.apiBaseUrl}/${businessAccountId}/insights`,
        {
          params: {
            access_token: accessToken,
            metric: 'impressions,reach,profile_views,website_clicks',
            period: 'day',
            since: start,
            until: end
          },
          timeout: 30000
        }
      );

      if (insightsResponse.data && insightsResponse.data.data) {
        insightsResponse.data.data.forEach(metric => {
          if (metric.values && metric.values.length > 0) {
            // Sum up all values for the period
            const total = metric.values.reduce((sum, val) => sum + (parseInt(val.value) || 0), 0);
            
            let name = '';
            let unit = '';
            
            switch (metric.name) {
              case 'impressions':
                name = 'Instagram Impressions';
                unit = 'impressions';
                break;
              case 'reach':
                name = 'Instagram Reach';
                unit = 'users';
                break;
              case 'profile_views':
                name = 'Instagram Profile Views';
                unit = 'views';
                break;
              case 'website_clicks':
                name = 'Instagram Website Clicks';
                unit = 'clicks';
                break;
              default:
                name = `Instagram ${metric.name}`;
                unit = 'count';
            }

            dataPoints.push({
              name,
              value: total,
              unit,
              metadata: {
                dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
                source: 'instagram',
                metric: metric.name
              }
            });
          }
        });
      }

      // Fetch media insights (posts)
      try {
        const mediaResponse = await axios.get(
          `${this.apiBaseUrl}/${businessAccountId}/media`,
          {
            params: {
              access_token: accessToken,
              fields: 'id,media_type,timestamp',
              limit: 25
            },
            timeout: 30000
          }
        );

        if (mediaResponse.data && mediaResponse.data.data) {
          const mediaIds = mediaResponse.data.data
            .filter(media => {
              const mediaTime = new Date(media.timestamp).getTime() / 1000;
              return mediaTime >= start && mediaTime <= end;
            })
            .map(media => media.id);

          if (mediaIds.length > 0) {
            // Fetch insights for each media item
            const mediaInsightsPromises = mediaIds.slice(0, 10).map(async (mediaId) => {
              try {
                const insights = await axios.get(
                  `${this.apiBaseUrl}/${mediaId}/insights`,
                  {
                    params: {
                      access_token: accessToken,
                      metric: 'impressions,reach,engagement,likes,comments,shares,saved'
                    },
                    timeout: 10000
                  }
                );
                return insights.data;
              } catch (err) {
                return null;
              }
            });

            const mediaInsights = await Promise.all(mediaInsightsPromises);
            
            // Aggregate media insights
            const aggregated = {
              impressions: 0,
              reach: 0,
              engagement: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saved: 0
            };

            mediaInsights.forEach(insight => {
              if (insight && insight.data) {
                insight.data.forEach(metric => {
                  if (metric.values && metric.values.length > 0) {
                    const value = parseInt(metric.values[0].value) || 0;
                    if (aggregated.hasOwnProperty(metric.name)) {
                      aggregated[metric.name] += value;
                    }
                  }
                });
              }
            });

            if (aggregated.impressions > 0) {
              dataPoints.push({
                name: 'Instagram Post Impressions',
                value: aggregated.impressions,
                unit: 'impressions',
                metadata: {
                  dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
                  source: 'instagram',
                  type: 'posts'
                }
              });
            }

            if (aggregated.engagement > 0) {
              dataPoints.push({
                name: 'Instagram Post Engagement',
                value: aggregated.engagement,
                unit: 'engagements',
                metadata: {
                  dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
                  source: 'instagram',
                  type: 'posts'
                }
              });
            }

            if (aggregated.likes > 0) {
              dataPoints.push({
                name: 'Instagram Post Likes',
                value: aggregated.likes,
                unit: 'likes',
                metadata: {
                  dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
                  source: 'instagram',
                  type: 'posts'
                }
              });
            }
          }
        }
      } catch (mediaError) {
        console.warn('Could not fetch media insights:', mediaError.message);
      }

      return dataPoints;
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      throw new Error(
        error.response?.data?.error?.message || 
        error.message || 
        'Failed to fetch data from Instagram'
      );
    }
  }

  getAvailableMetrics() {
    return [
      { name: 'Instagram Impressions', unit: 'impressions', description: 'Total account impressions' },
      { name: 'Instagram Reach', unit: 'users', description: 'Total unique users reached' },
      { name: 'Instagram Profile Views', unit: 'views', description: 'Total profile views' },
      { name: 'Instagram Website Clicks', unit: 'clicks', description: 'Total website clicks from profile' },
      { name: 'Instagram Post Impressions', unit: 'impressions', description: 'Total post impressions' },
      { name: 'Instagram Post Engagement', unit: 'engagements', description: 'Total post engagements' },
      { name: 'Instagram Post Likes', unit: 'likes', description: 'Total post likes' }
    ];
  }
}

module.exports = InstagramIntegration;






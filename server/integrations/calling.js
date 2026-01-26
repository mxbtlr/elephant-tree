const axios = require('axios');
const BaseIntegration = require('./base');

/**
 * Calling Insights Integration
 * Fetches call analytics data from various calling platforms
 * Supports: Twilio, RingCentral, Aircall, custom webhooks
 */
class CallingIntegration extends BaseIntegration {
  constructor(config) {
    super(config);
    this.name = 'Calling Insights';
    // Platform is stored in config.platform
    this.platform = config.platform || 'custom'; // twilio, ringcentral, aircall, custom
  }

  validateConfig() {
    const { platform } = this.config;
    
    switch (platform) {
      case 'twilio':
        if (!this.config.accountSid || !this.config.authToken) {
          return { valid: false, error: 'Twilio Account SID and Auth Token are required' };
        }
        break;
      case 'ringcentral':
        if (!this.config.clientId || !this.config.clientSecret || !this.config.accessToken) {
          return { valid: false, error: 'RingCentral credentials are required' };
        }
        break;
      case 'aircall':
        if (!this.config.apiId || !this.config.apiToken) {
          return { valid: false, error: 'Aircall API ID and Token are required' };
        }
        break;
      case 'custom':
        if (!this.config.webhookUrl && !this.config.apiUrl) {
          return { valid: false, error: 'Custom API URL or Webhook URL is required' };
        }
        break;
      default:
        return { valid: false, error: 'Invalid platform. Must be: twilio, ringcentral, aircall, or custom' };
    }
    
    return { valid: true };
  }

  async testConnection() {
    try {
      switch (this.config.platform) {
        case 'twilio':
          return await this.testTwilio();
        case 'ringcentral':
          return await this.testRingCentral();
        case 'aircall':
          return await this.testAircall();
        case 'custom':
          return await this.testCustom();
        default:
          return { success: false, message: 'Unknown platform' };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Connection failed' 
      };
    }
  }

  async testTwilio() {
    const { accountSid, authToken } = this.config;
    try {
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          auth: {
            username: accountSid,
            password: authToken
          },
          timeout: 10000
        }
      );
      return { success: true, message: 'Twilio connection successful' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async testRingCentral() {
    const { accessToken } = this.config;
    try {
      const response = await axios.get(
        'https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      return { success: true, message: 'RingCentral connection successful' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async testAircall() {
    const { apiId, apiToken } = this.config;
    try {
      const response = await axios.get(
        'https://api.aircall.io/v1/company',
        {
          auth: {
            username: apiId,
            password: apiToken
          },
          timeout: 10000
        }
      );
      return { success: true, message: 'Aircall connection successful' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async testCustom() {
    const { apiUrl, webhookUrl } = this.config;
    const url = apiUrl || webhookUrl;
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true // Accept any status for custom endpoints
      });
      return { success: true, message: 'Custom endpoint accessible' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async fetchData(options = {}) {
    const { startDate, endDate } = options;
    
    try {
      switch (this.config.platform) {
        case 'twilio':
          return await this.fetchTwilioData(startDate, endDate);
        case 'ringcentral':
          return await this.fetchRingCentralData(startDate, endDate);
        case 'aircall':
          return await this.fetchAircallData(startDate, endDate);
        case 'custom':
          return await this.fetchCustomData(startDate, endDate);
        default:
          throw new Error('Unknown platform');
      }
    } catch (error) {
      console.error('Error fetching calling data:', error);
      throw new Error(error.message || 'Failed to fetch calling data');
    }
  }

  async fetchTwilioData(startDate, endDate) {
    const { accountSid, authToken } = this.config;
    const dataPoints = [];
    
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      // Fetch call records
      const callsResponse = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          auth: {
            username: accountSid,
            password: authToken
          },
          params: {
            StartTime: new Date(start).toISOString(),
            EndTime: new Date(end).toISOString()
          },
          timeout: 30000
        }
      );

      if (callsResponse.data && callsResponse.data.calls) {
        const calls = callsResponse.data.calls;
        const totalCalls = calls.length;
        const answeredCalls = calls.filter(c => c.status === 'completed').length;
        const missedCalls = calls.filter(c => c.status === 'no-answer' || c.status === 'busy').length;
        const totalDuration = calls
          .filter(c => c.duration)
          .reduce((sum, c) => sum + parseInt(c.duration), 0);

        dataPoints.push({
          name: 'Total Calls',
          value: totalCalls,
          unit: 'calls',
          metadata: {
            dateRange: { startDate: start, endDate: end },
            source: 'calling',
            platform: 'twilio'
          }
        });

        dataPoints.push({
          name: 'Answered Calls',
          value: answeredCalls,
          unit: 'calls',
          metadata: {
            dateRange: { startDate: start, endDate: end },
            source: 'calling',
            platform: 'twilio'
          }
        });

        dataPoints.push({
          name: 'Missed Calls',
          value: missedCalls,
          unit: 'calls',
          metadata: {
            dateRange: { startDate: start, endDate: end },
            source: 'calling',
            platform: 'twilio'
          }
        });

        if (answeredCalls > 0) {
          dataPoints.push({
            name: 'Answer Rate',
            value: parseFloat(((answeredCalls / totalCalls) * 100).toFixed(2)),
            unit: '%',
            metadata: {
              dateRange: { startDate: start, endDate: end },
              source: 'calling',
              platform: 'twilio'
            }
          });
        }

        if (totalDuration > 0) {
          dataPoints.push({
            name: 'Total Call Duration',
            value: Math.round(totalDuration / 60), // Convert to minutes
            unit: 'minutes',
            metadata: {
              dateRange: { startDate: start, endDate: end },
              source: 'calling',
              platform: 'twilio'
            }
          });

          dataPoints.push({
            name: 'Avg Call Duration',
            value: Math.round((totalDuration / answeredCalls) / 60),
            unit: 'minutes',
            metadata: {
              dateRange: { startDate: start, endDate: end },
              source: 'calling',
              platform: 'twilio'
            }
          });
        }
      }

      return dataPoints;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch Twilio data');
    }
  }

  async fetchRingCentralData(startDate, endDate) {
    const { accessToken } = this.config;
    const dataPoints = [];
    
    // Similar implementation for RingCentral
    // This would use RingCentral's Call Log API
    return dataPoints;
  }

  async fetchAircallData(startDate, endDate) {
    const { apiId, apiToken } = this.config;
    const dataPoints = [];
    
    try {
      const start = startDate || Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const end = endDate || Math.floor(Date.now() / 1000);

      const callsResponse = await axios.get(
        'https://api.aircall.io/v1/calls',
        {
          auth: {
            username: apiId,
            password: apiToken
          },
          params: {
            from: start,
            to: end
          },
          timeout: 30000
        }
      );

      if (callsResponse.data && callsResponse.data.calls) {
        const calls = callsResponse.data.calls;
        const totalCalls = calls.length;
        const answeredCalls = calls.filter(c => c.status === 'done').length;

        dataPoints.push({
          name: 'Total Calls',
          value: totalCalls,
          unit: 'calls',
          metadata: {
            dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
            source: 'calling',
            platform: 'aircall'
          }
        });

        dataPoints.push({
          name: 'Answered Calls',
          value: answeredCalls,
          unit: 'calls',
          metadata: {
            dateRange: { startDate: new Date(start * 1000).toISOString(), endDate: new Date(end * 1000).toISOString() },
            source: 'calling',
            platform: 'aircall'
          }
        });
      }

      return dataPoints;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch Aircall data');
    }
  }

  async fetchCustomData(startDate, endDate) {
    const { apiUrl, webhookUrl } = this.config;
    const url = apiUrl || webhookUrl;
    const dataPoints = [];
    
    try {
      const response = await axios.get(url, {
        params: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString()
        },
        timeout: 30000,
        validateStatus: () => true
      });

      // Expect custom API to return data in format:
      // { dataPoints: [{ name, value, unit, metadata }] }
      if (response.data && response.data.dataPoints) {
        return response.data.dataPoints;
      }

      // Or expect array format
      if (Array.isArray(response.data)) {
        return response.data;
      }

      return dataPoints;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch data from custom endpoint');
    }
  }

  getAvailableMetrics() {
    const baseMetrics = [
      { name: 'Total Calls', unit: 'calls', description: 'Total number of calls' },
      { name: 'Answered Calls', unit: 'calls', description: 'Number of answered calls' },
      { name: 'Missed Calls', unit: 'calls', description: 'Number of missed calls' },
      { name: 'Answer Rate', unit: '%', description: 'Percentage of calls answered' },
      { name: 'Total Call Duration', unit: 'minutes', description: 'Total duration of all calls' },
      { name: 'Avg Call Duration', unit: 'minutes', description: 'Average call duration' }
    ];

    return baseMetrics;
  }
}

module.exports = CallingIntegration;


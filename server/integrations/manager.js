const MicrosoftClarityIntegration = require('./microsoftClarity');
const LinkedInIntegration = require('./linkedin');
const InstagramIntegration = require('./instagram');
const CallingIntegration = require('./calling');

/**
 * Integration Manager
 * Factory for creating integration instances based on type
 */
class IntegrationManager {
  static createIntegration(type, config) {
    switch (type) {
      case 'microsoft-clarity':
        return new MicrosoftClarityIntegration(config);
      case 'linkedin':
        return new LinkedInIntegration(config);
      case 'instagram':
        return new InstagramIntegration(config);
      case 'calling':
        return new CallingIntegration(config);
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }

  static getIntegrationTypes() {
    return [
      {
        type: 'microsoft-clarity',
        name: 'Microsoft Clarity',
        description: 'Website analytics and user behavior tracking',
        requiredFields: ['projectId', 'apiKey'],
        optionalFields: []
      },
      {
        type: 'linkedin',
        name: 'LinkedIn',
        description: 'LinkedIn Marketing API for analytics',
        requiredFields: ['accessToken', 'organizationId'],
        optionalFields: ['pageId']
      },
      {
        type: 'instagram',
        name: 'Instagram',
        description: 'Instagram Graph API for business account analytics',
        requiredFields: ['accessToken', 'businessAccountId'],
        optionalFields: []
      },
      {
        type: 'calling',
        name: 'Calling Insights',
        description: 'Call analytics from Twilio, RingCentral, Aircall, or custom',
        requiredFields: ['platform'],
        optionalFields: ['accountSid', 'authToken', 'clientId', 'clientSecret', 'apiId', 'apiToken', 'apiUrl', 'webhookUrl']
      }
    ];
  }
}

module.exports = IntegrationManager;






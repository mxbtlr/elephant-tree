# API Integrations Implementation

## Overview

The Data Inflow Center now includes real API integrations for fetching data from external platforms. Each integration is a fully functional service that connects to the platform's API and retrieves actual metrics.

## Implemented Integrations

### 1. Microsoft Clarity 📞
**File**: `server/integrations/microsoftClarity.js`

**Configuration Required:**
- `projectId`: Your Clarity project ID
- `apiKey`: Clarity API key

**Metrics Fetched:**
- Total Visitors
- Total Sessions
- Page Views
- Bounce Rate
- Average Session Duration
- Top Pages (with view counts)

**API Endpoint**: `https://www.clarity.ms/api`

### 2. LinkedIn 💼
**File**: `server/integrations/linkedin.js`

**Configuration Required:**
- `accessToken`: LinkedIn OAuth access token
- `organizationId`: LinkedIn organization URN (e.g., `urn:li:organization:123456`)
- `pageId` (optional): LinkedIn page ID for page-specific metrics

**Metrics Fetched:**
- LinkedIn Followers
- LinkedIn Impressions
- LinkedIn Clicks
- LinkedIn CTR (Click-Through Rate)
- LinkedIn Engagement

**API Endpoint**: `https://api.linkedin.com/v2`

### 3. Instagram 📷
**File**: `server/integrations/instagram.js`

**Configuration Required:**
- `accessToken`: Instagram Graph API access token
- `businessAccountId`: Instagram Business Account ID

**Metrics Fetched:**
- Instagram Impressions
- Instagram Reach
- Instagram Profile Views
- Instagram Website Clicks
- Instagram Post Impressions
- Instagram Post Engagement
- Instagram Post Likes

**API Endpoint**: `https://graph.facebook.com/v18.0`

### 4. Calling Insights 📞
**File**: `server/integrations/calling.js`

**Supported Platforms:**
- **Twilio**: Requires `accountSid` and `authToken`
- **RingCentral**: Requires `clientId`, `clientSecret`, and `accessToken`
- **Aircall**: Requires `apiId` and `apiToken`
- **Custom**: Requires `apiUrl` or `webhookUrl`

**Metrics Fetched:**
- Total Calls
- Answered Calls
- Missed Calls
- Answer Rate
- Total Call Duration
- Average Call Duration

## API Endpoints

### Integration Management
- `GET /api/integrations/types` - Get all available integration types
- `GET /api/integrations/:type/metrics` - Get available metrics for an integration type
- `POST /api/integrations/:type/validate` - Validate integration configuration

### Data Source Operations
- `POST /api/data-sources/:id/test` - Test connection to data source
- `POST /api/data-sources/:id/fetch` - Fetch data from data source API

**Fetch Endpoint Parameters:**
```json
{
  "startDate": "2025-01-01T00:00:00Z",  // Optional
  "endDate": "2025-01-31T23:59:59Z",    // Optional
  "autoCreate": false,                   // Auto-create data points
  "linkToTests": ["test-id-1"]          // Optional: link to tests
}
```

## How to Use

### 1. Create a Data Source with API Integration

1. Go to **Data Inflow** tab
2. Click **"Add Data Source"**
3. Select integration type (Microsoft Clarity, LinkedIn, Instagram, or Calling)
4. Fill in the **API Configuration** fields:
   - For Microsoft Clarity: Project ID and API Key
   - For LinkedIn: Access Token and Organization ID
   - For Instagram: Access Token and Business Account ID
   - For Calling: Select platform and enter credentials
5. Click **"Create Source"**

### 2. Test Connection

1. Select the data source from the sidebar
2. Click **"Test"** button
3. System will verify API credentials and connection
4. Success/error message will be displayed

### 3. Fetch Data from API

1. Select the data source
2. Click **"Fetch"** button
3. System will connect to the API and retrieve metrics
4. Review fetched data points in the dialog
5. Click **"Create All Data Points"** to save them

### 4. Auto-Create Data Points

When fetching, you can optionally:
- Auto-create data points immediately
- Link them to specific tests
- Set date ranges for data retrieval

## Getting API Credentials

### Microsoft Clarity
1. Go to https://clarity.microsoft.com
2. Navigate to your project settings
3. Generate API key
4. Copy Project ID from project URL

### LinkedIn
1. Create LinkedIn App at https://www.linkedin.com/developers/apps
2. Request Marketing API access
3. Generate OAuth token
4. Get Organization URN from your LinkedIn company page

### Instagram
1. Create Facebook App at https://developers.facebook.com
2. Add Instagram Graph API product
3. Connect Instagram Business Account
4. Generate access token with required permissions
5. Get Business Account ID from Graph API Explorer

### Calling Platforms

**Twilio:**
- Sign up at https://www.twilio.com
- Get Account SID and Auth Token from dashboard

**RingCentral:**
- Sign up at https://www.ringcentral.com
- Create app in developer portal
- Get OAuth credentials

**Aircall:**
- Sign up at https://aircall.io
- Generate API credentials from settings

## Integration Architecture

### Base Integration Class
All integrations extend `BaseIntegration` which provides:
- Configuration validation
- Connection testing
- Data fetching interface
- Metrics definition

### Integration Manager
The `IntegrationManager` factory:
- Creates integration instances based on type
- Provides integration type metadata
- Handles integration discovery

### Error Handling
- All API calls include timeout protection (10-30 seconds)
- Errors are caught and returned with descriptive messages
- Connection failures don't crash the application

## Data Flow

1. **User creates data source** → Configuration stored in `dataSources`
2. **User clicks "Fetch"** → Integration service called
3. **API request made** → Real data retrieved from platform
4. **Data points returned** → User reviews in dialog
5. **User confirms** → Data points created and stored
6. **Data points linked** → Can be linked to tests

## Security

- API keys/tokens stored in `config` field (encrypted in production)
- Only source creator or admin can test/fetch
- Credentials never exposed in API responses
- All API calls use HTTPS

## Future Enhancements

- Scheduled automatic data fetching
- Webhook support for real-time updates
- Data point aggregation and trends
- Custom metric definitions
- Multi-account support
- OAuth flow integration (no manual token entry)

## Troubleshooting

**Connection Test Fails:**
- Verify API credentials are correct
- Check token expiration
- Ensure API access is enabled
- Verify network connectivity

**Fetch Returns No Data:**
- Check date range (some APIs require recent dates)
- Verify account has data for the period
- Check API rate limits
- Review API permissions

**Data Points Not Created:**
- Review fetched data dialog
- Check for validation errors
- Ensure source is active






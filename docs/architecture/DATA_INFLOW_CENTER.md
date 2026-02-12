# Data Inflow Center

## Overview

The Data Inflow Center is a sophisticated system for aggregating metrics and insights from multiple data sources and linking them to tests in your Opportunity Solutions Tree. This allows you to track real-world data from various platforms and connect it directly to your test hypotheses.

## Features

### 1. Data Source Management
- Create and manage multiple data sources
- Support for different source types:
  - **Calling Insights** 📞 - Track insights from sales calls
  - **Microsoft Clarity** 👁️ - Website analytics and user behavior
  - **LinkedIn** 💼 - LinkedIn metrics and engagement
  - **Instagram** 📷 - Instagram analytics
  - **Custom** 📊 - Custom data sources

### 2. Data Point Creation
- Create individual data points from any source
- Store values, units, and metadata
- Organize by data source
- Track creation and update timestamps

### 3. Test Linking
- Link data points to specific tests
- One data point can be linked to multiple tests
- View all linked data points when viewing a test
- Easy linking/unlinking interface

### 4. Centralized Dashboard
- View all data sources in a sidebar
- Filter data points by source
- See data point counts per source
- Quick access to create new sources and points

## Data Model

### Data Source
```json
{
  "id": "uuid",
  "name": "LinkedIn Analytics",
  "type": "linkedin",
  "description": "LinkedIn engagement metrics",
  "config": {
    "apiKey": "...",
    "connectionSettings": {}
  },
  "createdBy": "user-id",
  "isActive": true,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

### Data Point
```json
{
  "id": "uuid",
  "sourceId": "source-uuid",
  "name": "Page Views",
  "value": 1234,
  "unit": "views",
  "metadata": {
    "date": "2025-01-15",
    "campaign": "Q1 Campaign"
  },
  "linkedTests": ["test-id-1", "test-id-2"],
  "createdBy": "user-id",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## API Endpoints

### Data Sources
- `GET /api/data-sources` - Get all data sources
- `GET /api/data-sources/:id` - Get specific data source
- `POST /api/data-sources` - Create data source
- `PUT /api/data-sources/:id` - Update data source
- `DELETE /api/data-sources/:id` - Delete data source

### Data Points
- `GET /api/data-points` - Get all data points (with optional filters)
  - Query params: `sourceId`, `testId`
- `GET /api/data-points/:id` - Get specific data point
- `POST /api/data-points` - Create data point
- `PUT /api/data-points/:id` - Update data point
- `DELETE /api/data-points/:id` - Delete data point
- `POST /api/data-points/:id/link-test` - Link data point to test
- `POST /api/data-points/:id/unlink-test` - Unlink data point from test
- `GET /api/tests/:testId/data-points` - Get all data points for a test

## Usage

### Creating a Data Source

1. Go to **"Data Inflow"** tab
2. Click **"Add Data Source"**
3. Fill in:
   - **Name**: Descriptive name (e.g., "LinkedIn Analytics")
   - **Type**: Select from dropdown (Calling, Microsoft Clarity, LinkedIn, Instagram, Custom)
   - **Description**: Optional description
4. Click **"Create Source"**

### Creating Data Points

1. Select a data source from the sidebar
2. Click **"Add Data Point"**
3. Fill in:
   - **Name**: Data point name (e.g., "Page Views", "Engagement Rate")
   - **Value**: Numeric value (optional)
   - **Unit**: Unit of measurement (e.g., "views", "clicks", "%")
4. Click **"Create Data Point"**

### Linking Data Points to Tests

1. Find the data point you want to link
2. Click the **"Link"** button
3. Select the test from the list
4. The data point is now linked and will appear in the test view

### Viewing Linked Data Points

- In the **OST Tree** tab, expand any test
- Linked data points appear in a dedicated section above KPIs
- Shows: name, value, unit, and source

## Integration Points

The system is designed to support integrations with:

1. **Calling Insights**: Connect to call tracking systems
2. **Microsoft Clarity**: Use Clarity API for website analytics
3. **LinkedIn**: LinkedIn Analytics API integration
4. **Instagram**: Instagram Graph API for metrics

### Future Integration Steps

To add actual API integrations:

1. Create integration service files (e.g., `integrations/linkedin.js`)
2. Add scheduled jobs or webhooks to fetch data
3. Use the `config` field in data sources to store API keys
4. Create data points automatically from API responses

## Example Use Cases

### Use Case 1: LinkedIn Campaign Tracking
1. Create "LinkedIn Campaign Q1" data source
2. Create data points: "Impressions", "Clicks", "Engagement Rate"
3. Link to test: "LinkedIn Content Strategy Test"
4. View metrics directly in the test

### Use Case 2: Website Analytics
1. Create "Microsoft Clarity" data source
2. Create data points: "Page Views", "Bounce Rate", "Session Duration"
3. Link to test: "Website Redesign Test"
4. Track performance over time

### Use Case 3: Sales Call Insights
1. Create "Sales Calls Q1" data source
2. Create data points: "Calls Made", "Conversion Rate", "Avg Call Duration"
3. Link to test: "Cold Calling Strategy Test"
4. Monitor call performance

## Permissions

- **Create**: Any authenticated user can create data sources and points
- **Update/Delete**: Only the creator or admin can update/delete
- **View**: All authenticated users can view all data sources and points

## Best Practices

1. **Organize by Campaign**: Create separate data sources for different campaigns or time periods
2. **Consistent Naming**: Use clear, consistent names for data points
3. **Regular Updates**: Update data point values regularly to track trends
4. **Link Strategically**: Link data points to tests that are directly related
5. **Use Metadata**: Store additional context in the metadata field

## Next Steps

Potential enhancements:
- Automated data fetching from APIs
- Data visualization/charts
- Time-series tracking
- Data point templates
- Export functionality
- Data point alerts/thresholds






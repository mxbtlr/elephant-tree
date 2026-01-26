# Opportunity Solutions Tree (OST) WebApp

A collaborative web application for managing Opportunity Solutions Trees. This tool allows teams to define outcomes, track opportunities, develop solutions, run tests, and monitor KPIs in a hierarchical tree structure.

## Features

- **Tree Structure**: Visualize your OST with a collapsible tree view
- **Full CRUD Operations**: Create, read, update, and delete outcomes, opportunities, solutions, tests, and KPIs
- **KPI Tracking**: Add and monitor KPIs for each test with progress visualization
- **Collaborative**: Multiple users can access and work on the same tree
- **Modern UI**: Beautiful, responsive interface with intuitive controls
- **Expand/Collapse**: Full control over tree visibility for maximum overview

## Project Structure

```
OST/
├── server/          # Backend API (Node.js/Express)
│   ├── index.js     # Main server file
│   └── data.json    # Data storage (created automatically)
├── client/          # Frontend (React)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/   # API service layer
│   │   └── App.js      # Main app component
│   └── public/
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. **Install all dependencies** (root, server, and client):
   ```bash
   npm run install-all
   ```

   Or install manually:
   ```bash
   npm install
   cd server && npm install && cd ..
   cd client && npm install && cd ..
   ```

## Running the Application

### Development Mode

Run both server and client concurrently:
```bash
npm run dev
```

Or run them separately:

**Terminal 1 - Backend Server:**
```bash
npm run server
```
Server will run on `http://localhost:3001`

**Terminal 2 - Frontend Client:**
```bash
npm run client
```
Client will run on `http://localhost:3000` and open automatically in your browser.

### Production Build

Build the React app for production:
```bash
npm run build
```

The built files will be in `client/build/`.

## Usage

1. **Start the application** using `npm run dev`
2. **Enter your name** when prompted to identify yourself in the collaborative workspace
3. **Create an Outcome** by clicking the "Add Outcome" button
4. **Expand nodes** by clicking on them to see their children
5. **Add children** using the "+" button on any node:
   - Outcomes → Opportunities
   - Opportunities → Solutions
   - Solutions → Tests
   - Tests → KPIs
6. **Edit items** by clicking the edit icon
7. **Delete items** by clicking the trash icon (with confirmation)
8. **Track KPIs** by adding KPIs to tests and monitoring progress

## API Endpoints

The backend provides RESTful API endpoints:

- `GET /api/outcomes` - Get all outcomes
- `POST /api/outcomes` - Create outcome
- `PUT /api/outcomes/:id` - Update outcome
- `DELETE /api/outcomes/:id` - Delete outcome
- `POST /api/outcomes/:outcomeId/opportunities` - Add opportunity
- `PUT /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity
- `POST /api/opportunities/:opportunityId/solutions` - Add solution
- `PUT /api/solutions/:id` - Update solution
- `DELETE /api/solutions/:id` - Delete solution
- `POST /api/solutions/:solutionId/tests` - Add test
- `PUT /api/tests/:id` - Update test
- `DELETE /api/tests/:id` - Delete test
- `POST /api/tests/:testId/kpis` - Add KPI
- `PUT /api/kpis/:id` - Update KPI
- `DELETE /api/kpis/:id` - Delete KPI
- `POST /api/users` - Create/get user

## Data Storage

Currently, data is stored in `server/data.json`. This is suitable for development and small teams. For production use, consider migrating to a proper database (PostgreSQL, MongoDB, etc.).

## Technology Stack

- **Frontend**: React 18, Axios, React Icons
- **Backend**: Node.js, Express, CORS
- **Storage**: JSON file (easily replaceable with a database)

## Future Enhancements

- Real-time collaboration with WebSockets
- User authentication and authorization
- Database integration (PostgreSQL/MongoDB)
- Export/import functionality
- Search and filtering
- Drag-and-drop reordering
- Comments and notes on items
- Activity history/audit log

## License

MIT







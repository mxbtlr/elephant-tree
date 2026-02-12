# TreeFlow — Opportunity Solutions Tree

A collaborative web app for managing Opportunity Solutions Trees: outcomes, opportunities, solutions, tests, and todos in a hierarchical tree with workspaces and Supabase backend.

## Quick start

```bash
npm run install-all
cp client/.env.example client/.env   # then set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY
npm run dev
```

- **Client:** http://localhost:3000  
- **Server:** http://localhost:3001  
- **Health:** http://localhost:3001/api/health  

## Project structure

```
├── client/                 # React frontend (CRA)
│   ├── public/
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── lib/            # Tree logic, types, confidence
│   │   ├── services/       # Supabase & API
│   │   └── store/          # Global state (useOstStore)
│   └── .env.example
├── server/                  # Express API (optional legacy routes)
│   ├── index.js
│   ├── api/                 # Test suites
│   └── integrations/
├── supabase/                # Database
│   ├── migrations/
│   └── *.sql
├── docs/                    # All documentation
│   ├── setup/
│   ├── deployment/
│   ├── troubleshooting/
│   └── architecture/
├── scripts/
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run client + server in development |
| `npm run build` | Production build (client) |
| `npm test` | Run client and server tests |
| `npm run test:client` | Client unit tests only |
| `npm run test:server` | Server unit tests only |
| `npm run test:supabase` | Check Supabase connection |

## Testing

Before deployment, run the full test suite:

```bash
npm test
```

- **Client:** Jest + React Testing Library — `src/lib/*.test.js`, `src/components/**/*.test.jsx`
- **Server:** Jest + Supertest — `server/api/*.test.js`, health and API tests

## Production

1. **Environment:** Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` (build-time or via `window.__ENV__`).
2. **Build:** `npm run build` → serve `client/build` (e.g. static host or Express `express.static`).
3. **Database:** Run Supabase migrations; see [docs/deployment](./docs/deployment/) and [docs/setup](./docs/setup/).
4. **Health:** Use `GET /api/health` (or `GET /health`) for load balancers and monitoring.

See **[docs/deployment/PRODUCTION_CHECKLIST.md](./docs/deployment/PRODUCTION_CHECKLIST.md)** for a full pre-launch checklist.

## Documentation

- **[docs/README.md](./docs/README.md)** — Index of all docs  
- **[docs/setup/](./docs/setup/)** — Supabase, migrations, quick start  
- **[docs/deployment/](./docs/deployment/)** — Deploy, self-hosted, production  
- **[docs/troubleshooting/](./docs/troubleshooting/)** — Auth, RLS, connection issues  
- **[docs/architecture/](./docs/architecture/)** — Teams, API, performance  

## Tech stack

- **Frontend:** React 18, React Flow, Supabase JS  
- **Backend:** Node.js, Express (optional), Supabase (PostgreSQL + Auth)  
- **Tests:** Jest, React Testing Library, Supertest  

## License

MIT

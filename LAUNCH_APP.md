# Running TreeFlow

## How the app is built

- **Client** (`client/`): React app. It talks **directly to Supabase** for almost everything: auth, outcomes, opportunities, workspaces, etc. No Express server is involved for normal usage.
- **Server** (`server/`): Express app on port **3001**. In the current setup it is **only used for the Feedback feature** (sending feedback to Slack and storing thread state in Supabase). The rest of the app does not call it.

So you can use TreeFlow with only the client + Supabase. The server is optional unless you want the Feedback widget to work.

## Running everything (client + feedback server)

From the **repo root**:

```bash
# One-time: install root, server, and client deps
npm run install-all

# Start both client (port 3000) and server (port 3001)
npm run dev
```

- **Client**: http://localhost:3000  
- **Server**: http://localhost:3001 (only needed for Feedback)

If the server doesn’t start:

1. **Install deps**: From root run `npm run install-all`, or at least `npm install` (root) and `cd server && npm install`.
2. **Port 3001**: Make sure nothing else is using port 3001.
3. **Server .env**: In `server/.env` you need `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` (same as client) for feedback; see `server/.env.example`.

## Running only the client (no Feedback server)

If you don’t need the Feedback feature:

```bash
cd client
npm install
npm start
```

App runs at http://localhost:3000. Login, tree, workspaces, etc. all work via Supabase. Only the Feedback button will fail with “Cannot reach server” if you submit.

## Summary

| What                    | Needs server? |
|-------------------------|----------------|
| Login, tree, outcomes   | No (Supabase)  |
| Workspaces, decision spaces | No (Supabase)  |
| **Feedback widget**     | Yes (Express on 3001) |

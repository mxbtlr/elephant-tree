# TreeFlow - Supabase Backend Setup

This version of TreeFlow uses Supabase as the backend instead of Express.js.

## Quick Start

1. **Set up Supabase** (see `SUPABASE_SETUP.md`)
2. **Configure environment variables**:
   ```bash
   cd client
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```
3. **Install dependencies**:
   ```bash
   npm run install-all
   ```
4. **Start development server**:
   ```bash
   cd client
   npm start
   ```

## Environment Variables

Create `client/.env`:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## Key Differences from Express Version

1. **No Express server needed** - Supabase handles all backend operations
2. **Authentication** - Uses Supabase Auth (email/password, OAuth, etc.)
3. **Database** - PostgreSQL with Row Level Security
4. **Real-time** - Can enable real-time updates (optional)
5. **Storage** - Can use Supabase Storage for files (optional)

## Documentation

- **SUPABASE_SETUP.md** - Complete Supabase setup guide
- **DEPLOYMENT.md** - Production deployment to Strato Server
- **MIGRATION_GUIDE.md** - Migrating from Express/JSON backend

## Architecture

```
┌─────────────┐
│   React     │
│   Frontend  │
└──────┬──────┘
       │
       │ @supabase/supabase-js
       │
┌──────▼──────┐
│   Supabase  │
│             │
│  - Auth     │
│  - Database │
│  - Storage  │
│  - RLS      │
└─────────────┘
```

## Features

- ✅ User authentication (email/password)
- ✅ Role-based access control (user/admin)
- ✅ Team management with roles (lead/member/viewer)
- ✅ Full CRUD for OST entities
- ✅ Row Level Security policies
- ✅ KPI templates
- ✅ Data sources and points
- ✅ Interview notes
- ✅ Comments

## Next Steps

1. Read `SUPABASE_SETUP.md` for detailed setup
2. Run database migrations
3. Configure authentication
4. Test the application
5. Deploy using `DEPLOYMENT.md`


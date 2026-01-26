# Launching TreeFlow Application

## Quick Start

### 1. Install Dependencies (if not already done)
```bash
cd client
npm install
```

### 2. Start the Development Server
```bash
cd client
npm start
```

The app will automatically open in your browser at `http://localhost:3000`

## What to Expect

1. **Login/Register Screen**: 
   - If you don't have an account, click "Register" to create one
   - If you already have an account, enter your email and password

2. **After Login**:
   - You'll see the TreeFlow dashboard
   - You can create outcomes, opportunities, solutions, tests, and KPIs
   - You can manage teams and collaborate

## First Time Setup

### Create Your First Admin User

1. **Register a new user** through the app
2. **Make them admin** by running this in Supabase Studio SQL Editor:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-email@example.com';
   ```

### Run Migrations (if not done yet)

If you see errors about missing tables, run the migrations:
1. Go to Supabase Studio: `http://87.106.6.59:8000`
2. Open SQL Editor
3. Run the files in `supabase/migrations/` in order

## Troubleshooting

### Port 3000 Already in Use
```bash
# Use a different port
PORT=3001 npm start
```

### Connection Errors
- Check that `client/.env` has correct Supabase URL and key
- Verify Supabase instance is running
- Check browser console for specific errors

### Authentication Errors
- Verify migrations have been run
- Check Supabase Studio > Authentication > Settings
- Ensure Site URL is set to `http://localhost:3000`

### Module Not Found Errors
```bash
# Reinstall dependencies
cd client
rm -rf node_modules package-lock.json
npm install
```

## Development Commands

```bash
# Start development server
cd client && npm start

# Build for production
cd client && npm run build

# Run tests
cd client && npm test
```

## Production Build

To build for production:
```bash
cd client
npm run build
```

The built files will be in `client/build/` directory, ready to deploy.


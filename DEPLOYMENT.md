# Deployment Guide: TreeFlow on Strato Server with Supabase

This guide will help you deploy TreeFlow to a Strato Server with Supabase as the backend.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Strato Server Access**: SSH access to your Strato server
3. **Domain Name**: (Optional) Domain name for your application
4. **Node.js**: Version 18+ installed on Strato server

## Step 1: Set Up Supabase

### 1.1 Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key from Settings > API

### 1.2 Run Database Migrations

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Run migrations:
   ```bash
   supabase db push
   ```

   Or manually run the SQL files in `supabase/migrations/` in order:
   - `001_initial_schema.sql`
   - `002_row_level_security.sql`
   - `003_handle_new_user.sql`

### 1.3 Configure Authentication

1. Go to Authentication > Settings in Supabase dashboard
2. Configure email settings:
   - Enable email confirmations (optional for development)
   - Set up email templates
3. Configure OAuth providers (optional)

### 1.4 Set Up First Admin User

After creating your first user account, you can make them admin by running:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

## Step 2: Prepare the Application

### 2.1 Install Dependencies

```bash
cd /path/to/OST
npm run install-all
```

### 2.2 Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Supabase credentials:
   ```
   REACT_APP_SUPABASE_URL=https://your-project.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2.3 Build the Application

```bash
cd client
npm run build
```

This creates a `build` folder with production-ready files.

## Step 3: Deploy to Strato Server

### 3.1 Server Setup

1. SSH into your Strato server:
   ```bash
   ssh user@your-strato-server.com
   ```

2. Create application directory:
   ```bash
   mkdir -p /var/www/treeflow
   cd /var/www/treeflow
   ```

3. Upload your built files:
   ```bash
   # From your local machine
   scp -r client/build/* user@your-strato-server.com:/var/www/treeflow/
   ```

### 3.2 Configure Web Server (Nginx)

Create or edit Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/treeflow;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### 3.3 Set Up SSL (Let's Encrypt)

```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3.4 Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/treeflow
sudo chmod -R 755 /var/www/treeflow
```

### 3.5 Restart Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

## Step 4: Configure Supabase for Production

### 4.1 Update CORS Settings

1. Go to Supabase Dashboard > Settings > API
2. Add your domain to allowed CORS origins:
   - `https://your-domain.com`
   - `https://www.your-domain.com`

### 4.2 Set Up Row Level Security

The migrations already include RLS policies, but verify they're active:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 4.3 Configure Email Templates (Optional)

1. Go to Authentication > Email Templates
2. Customize templates for:
   - Confirm signup
   - Reset password
   - Magic link

## Step 5: Advanced Configuration

### 5.1 Environment-Specific Builds

For different environments, you can create separate `.env` files:

```bash
# .env.production
REACT_APP_SUPABASE_URL=https://your-prod-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-prod-anon-key

# .env.staging
REACT_APP_SUPABASE_URL=https://your-staging-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-staging-anon-key
```

Build with specific env:
```bash
REACT_APP_SUPABASE_URL=... npm run build
```

### 5.2 Set Up CI/CD (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Strato

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install-all
      
      - name: Build
        run: |
          cd client
          npm run build
        env:
          REACT_APP_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          REACT_APP_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to server
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "client/build/*"
          target: "/var/www/treeflow"
```

### 5.3 Monitoring and Logs

Set up monitoring:

```bash
# Install PM2 for process management (if needed)
npm install -g pm2

# Set up log rotation
sudo logrotate -d /etc/logrotate.d/nginx
```

## Step 6: Post-Deployment Checklist

- [ ] Verify application loads at your domain
- [ ] Test user registration and login
- [ ] Verify database connections
- [ ] Test CRUD operations
- [ ] Check RLS policies are working
- [ ] Verify SSL certificate is valid
- [ ] Test on mobile devices
- [ ] Set up backup strategy for Supabase
- [ ] Configure error monitoring (e.g., Sentry)

## Troubleshooting

### Application not loading
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify file permissions
- Check if port 80/443 is open

### Supabase connection errors
- Verify CORS settings in Supabase dashboard
- Check environment variables are set correctly
- Verify RLS policies allow your operations

### Build errors
- Clear build cache: `rm -rf client/build client/node_modules/.cache`
- Check Node.js version: `node --version` (should be 18+)
- Verify all dependencies are installed

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use environment variables** for all sensitive data
3. **Enable RLS** on all Supabase tables
4. **Regularly update dependencies**: `npm audit fix`
5. **Set up firewall rules** on your server
6. **Use strong passwords** for database and server access
7. **Enable 2FA** on Supabase account
8. **Regular backups** of Supabase database

## Support

For issues:
- Check Supabase logs in dashboard
- Review Nginx access/error logs
- Check browser console for client errors
- Review application logs if using PM2


# Mediator Production Deployment

This guide will help you deploy the Mediator app to production on your server.

## Prerequisites

- Node.js 18+ installed on the server
- PM2 installed globally: `npm install -g pm2`
- Apache or Nginx installed on the server
- SSH access to your server
- Git repository set up on the server

## Deployment via Git (Recommended)

1. **First time setup - Initialize git repo on server:**

   ```bash
   ssh -p 2200 field2@199.167.200.160
   cd /home/field2/public_html
   git clone <your-git-repo-url> mediator.field2.com
   cd mediator.field2.com
   ```

2. **Configure environment variables (first time only):**
   Create a `server/.env` file with your actual values:

   ```bash
   nano server/.env
   ```

   Add:
   - `JWT_SECRET`: A secure random string
   - `OMDB_API_KEY`: Your OMDB API key
   - `GOOGLE_BOOKS_API_KEY`: Your Google Books API key
   - `NODE_ENV=production`
   - `PORT=3003`

3. **Make deploy script executable:**
   ```bash
   chmod +x deploy-server.sh
   ```

4. **Deploy updates:**

   ```bash
   # On your local machine - commit and push changes
   git add .
   git commit -m "Your changes"
   git push

   # On the server - pull and deploy
   ssh -p 2200 field2@199.167.200.160
   cd /home/field2/public_html/mediator.field2.com
   git pull
   ./deploy-server.sh
   ```

5. **Set up domain document root in cPanel:**
   - Log into cPanel
   - Go to Domains → Manage
   - Edit mediator.field2.com
   - Set Document Root to: `/home/field2/public_html/mediator.field2.com/client/dist`
   - Save

6. **Configure API proxy with .htaccess:**
   
   Create `/home/field2/public_html/mediator.field2.com/client/dist/.htaccess` (this is created automatically by deploy-server.sh)
   
   If proxy doesn't work, you may need to create a subdomain `api.mediator.field2.com` or use a different approach for API routing.

## Alternative: Zip File Deployment

If you prefer not to use git:

1. **Build locally:**

   ```bash
   ./build.sh
   ```

2. **Upload and extract:**
   ```bash
   scp -P 2200 mediator-deploy.zip field2@199.167.200.160:/home/field2/public_html/
   ssh -p 2200 field2@199.167.200.160
   cd /home/field2/public_html
   unzip -o mediator-deploy.zip -d mediator.field2.com
   cd mediator.field2.com
   npm install --production
   ./start.sh
   ```

## Apache Configuration (Recommended for shared hosting)

If you're running Apache for other sites, use Apache as the reverse proxy:

1. **Enable required Apache modules:**

   ```bash
   sudo a2enmod proxy proxy_http rewrite headers ssl
   sudo systemctl restart apache2
   ```

2. **Copy Apache config:**

   ```bash
   sudo cp apache.conf /etc/apache2/sites-available/mediator.field2.com.conf
   ```

3. **Enable the site:**

   ```bash
   sudo a2ensite mediator.field2.com.conf
   sudo apachectl configtest
   sudo systemctl reload apache2
   ```

4. **SSL Setup (Let's Encrypt with Apache):**
   ```bash
   sudo apt install certbot python3-certbot-apache
   sudo certbot --apache -d mediator.field2.com
   ```

## Nginx Configuration (Alternative)

If you prefer nginx or don't have Apache running:

1. **Copy nginx config:**

   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/mediator.field2.com
   ```

2. **Enable the site:**

   ```bash
   sudo ln -s /etc/nginx/sites-available/mediator.field2.com /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **SSL Setup (Let's Encrypt with Nginx):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d mediator.field2.com
   ```

## Monitoring

- Check PM2 status: `pm2 status`
- View logs: `pm2 logs mediator-server`
- Restart app: `pm2 restart mediator-server`

## Troubleshooting

- **Port issues:** Make sure port 3003 is not blocked by firewall
- **Permission issues:** Ensure the user has write access to the directory
- **Database issues:** Check file permissions on `mediator.db`
- **API not responding:** Check PM2 logs and nginx error logs

## Security Checklist

- [ ] Change default JWT secret
- [ ] Set up HTTPS/SSL
- [ ] Configure firewall (allow 80, 443, deny others)
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Disable root SSH access
- [ ] Set up log rotation
- [ ] Configure backups for the database
- [ ] Monitor disk space and memory usage

# Mediator Production Deployment

This guide will help you deploy the Mediator app to production on your server.

## Prerequisites

- Node.js 18+ installed on the server
- PM2 installed globally: `npm install -g pm2`
- Nginx installed on the server
- SSH access to your server

## Local Build

1. Run the build script:

   ```bash
   ./build.sh
   ```

   This will create a `mediator-deploy.zip` file with all necessary files.

## Server Setup

1. **Upload zip file to server:**

   ```bash
   scp -P 2200 mediator-deploy.zip field2@199.167.200.160:/home/field2/public_html/
   ```

2. **SSH to server and extract:**

   ```bash
   ssh -p 2200 field2@199.167.200.160
   cd /home/field2/public_html
   rm -rf mediator.field2.com/*  # Remove existing files
   unzip mediator-deploy.zip -d mediator.field2.com
   cd mediator.field2.com
   ```

3. **Install dependencies:**

   ```bash
   npm install --production
   ```

4. **Configure environment variables:**
   Edit the `.env` file with your actual values:

   ```bash
   nano .env
   ```

   Make sure to set:

   - `JWT_SECRET`: A secure random string
   - `OMDB_API_KEY`: Your OMDB API key

5. **Start the application:**
   ```bash
   ./start.sh
   ```

## Nginx Configuration

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

## SSL Setup (Let's Encrypt)

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

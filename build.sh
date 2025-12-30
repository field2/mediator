#!/bin/bash

# Build script for Mediator production deployment

echo "Building Mediator for production..."

# Build the client
echo "Building client..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "Client build failed!"
    exit 1
fi
cd ..

# Build the server
echo "Building server..."
cd server
npm run build
if [ $? -ne 0 ]; then
    echo "Server build failed!"
    exit 1
fi
cd ..

# Create deployment directory
echo "Creating deployment package..."
DEPLOY_DIR="deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy server files
cp -r server/dist $DEPLOY_DIR/
cp -r server/node_modules $DEPLOY_DIR/
cp server/package.json $DEPLOY_DIR/
cp server/ecosystem.config.js $DEPLOY_DIR/
cp server/.env.production $DEPLOY_DIR/.env

# Create public directory and copy client build files
mkdir -p $DEPLOY_DIR/public
cp -r client/dist/* $DEPLOY_DIR/public/

# Create server startup script
cat > $DEPLOY_DIR/start.sh << 'EOF'
#!/bin/bash
# Start the Mediator server with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
EOF

chmod +x $DEPLOY_DIR/start.sh

# Create nginx configuration
cat > $DEPLOY_DIR/nginx.conf << 'EOF'
server {
    listen 80;
    server_name mediator.field2.com;

    root /home/field2/public_html/mediator.field2.com/public;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the Node.js server
    location /api {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_For;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Create deployment zip
echo "Creating deployment zip..."
cd $DEPLOY_DIR
zip -r ../mediator-deploy.zip .
cd ..

echo "Deployment package created!"
echo "Zip file: mediator-deploy.zip"
echo "Unzipped directory: $DEPLOY_DIR/"
echo ""
echo "To deploy:"
echo "1. Upload the zip file to server:"
echo "   scp -P 2200 mediator-deploy.zip field2@199.167.200.160:/home/field2/public_html/"
echo ""
echo "2. SSH to server and extract:"
echo "   ssh -p 2200 field2@199.167.200.160"
echo "   cd /home/field2/public_html"
echo "   rm -rf mediator.field2.com/*  # Remove existing files"
echo "   unzip mediator-deploy.zip -d mediator.field2.com"
echo "   cd mediator.field2.com"
echo ""
echo "3. Configure and start:"
echo "   npm install --production"
echo "   nano .env  # Update with your actual secrets"
echo "   ./start.sh"
echo ""
echo "4. Configure nginx:"
echo "   sudo cp nginx.conf /etc/nginx/sites-available/mediator.field2.com"
echo "   sudo ln -s /etc/nginx/sites-available/mediator.field2.com /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "5. Set up SSL:"
echo "   sudo certbot --nginx -d mediator.field2.com"
#!/bin/bash
# Start the Mediator server with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

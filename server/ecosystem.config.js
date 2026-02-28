const path = require('path');

module.exports = {
  apps: [
    {
      name: "mediator-server",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
        DB_PATH: path.join(__dirname, 'mediator.db'),
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3003,
        DB_PATH: path.join(__dirname, 'mediator.db'),
      },
    },
  ],
};

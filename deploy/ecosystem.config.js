module.exports = {
  apps: [
    {
      name: "mediator-server",
      // The build output lives in `server/dist` after building the backend
      script: "server/dist/index.js",
      // ensure PM2 runs with the project root as cwd
      cwd: "/home/field2/public_html/mediator.field2.com",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3003,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3003,
      },
    },
  ],
};

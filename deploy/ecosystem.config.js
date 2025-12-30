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
        JWT_SECRET:
          "322af1da984c2f6bcb1059c7cbd99f8d743ed08d8c6e62135fe91155315761e6",
        TMDB_API_KEY: "335d79503affa8843717efbe47cf9c1f",
        DATABASE_URL: "./mediator.db",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3003,
        JWT_SECRET:
          "322af1da984c2f6bcb1059c7cbd99f8d743ed08d8c6e62135fe91155315761e6",
        TMDB_API_KEY: "335d79503affa8843717efbe47cf9c1f",
        DATABASE_URL: "./mediator.db",
      },
    },
  ],
};

/* proxies Vite dev server and reloads browser when built files change */
const bs = require("browser-sync").create();
const path = require("path");

const clientDir = path.resolve(__dirname, "..", "client");
const vitePort = process.env.VITE_PORT || 3001;
const proxyTarget = `http://localhost:${vitePort}`;

bs.init(
  {
    proxy: proxyTarget,
    port: 3002,
    ui: false,
    open: false,
    notify: false,
    files: [
      path.join(clientDir, "dist", "**", "*.*"),
      path.join(clientDir, "index.html"),
      path.join(clientDir, "src", "**", "*.{css,scss,js,ts,tsx,html}"),
    ],
  },
  () => {
    console.log(`BrowserSync proxying ${proxyTarget} on http://localhost:3002`);
  }
);

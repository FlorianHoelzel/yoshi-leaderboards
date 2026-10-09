// Zero-dependency local server. Only public assets and the generated fixture are served.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {publicRoot, mockAsset, publicAssets, readMockAsset} = require('./lib/assets');
const types = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png'};

function createServer() {
  let assets = new Set(publicAssets());
  return http.createServer((req, res) => {
    const asset = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    // New public files can appear while the development server is running.
    // Refresh the allowlist on a miss, keeping private workspace files excluded.
    if (asset !== mockAsset && !assets.has(asset)) assets = new Set(publicAssets());
    if (asset !== mockAsset && !assets.has(asset)) {
      res.writeHead(404); res.end('Not found'); return;
    }
    try {
      const data = asset === mockAsset ? readMockAsset() : fs.readFileSync(path.join(publicRoot, asset));
      res.writeHead(200, {'Content-Type':types[path.extname(asset)] || 'application/octet-stream', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      res.end(data);
    } catch {
      res.writeHead(500); res.end('Could not read asset');
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`Yoshi prototype: http://127.0.0.1:${server.address().port}`));
}
module.exports = {createServer};

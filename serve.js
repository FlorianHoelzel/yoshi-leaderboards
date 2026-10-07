// Zero-dependency development server. Binds locally; serves only prototype assets.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assets = {'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/theme.js':'theme.js','/island.svg':'island.svg'};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const file=assets[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);res.end('Not found');return;}
  fs.readFile(path.join(__dirname,file),(err,data)=>{
    if(err){res.writeHead(500);res.end('Could not read asset');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  });
});
server.listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`Yoshi prototype: http://127.0.0.1:${server.address().port}`));

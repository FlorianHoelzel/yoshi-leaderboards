const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {createServer}=require('../scripts/serve');
const {publicRoot}=require('../scripts/lib/assets');

test('running local server discovers newly added public scripts and excludes private files',()=>{
  // Capture the request handler without opening a port or starting a server.
  const originalCreate=http.createServer, originalRead=fs.readdirSync;
  let handler;
  try {
    http.createServer=callback=>{handler=callback;return {};};
    // Simulate a startup asset inventory from before ratings.js existed.
    fs.readdirSync=(directory,options)=>{
      const entries=originalRead(directory,options);
      return path.resolve(directory)===path.join(publicRoot,'assets/js/domain')
        ? entries.filter(entry=>entry.name!=='ratings.js') : entries;
    };
    createServer();
  } finally {
    http.createServer=originalCreate;fs.readdirSync=originalRead;
  }
  function request(url){
    const response={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=String(body);}};
    handler({url},response);return response;
  }
  const script=request('/assets/js/domain/ratings.js');
  assert.equal(script.status,200);
  assert.match(script.body,/function cachedOverallRatings/);
  assert.equal(script.headers['Content-Type'],'text/javascript; charset=utf-8');
  assert.equal(script.headers['Cache-Control'],'no-store');
  for(const url of ['/data/mock-runs.json','/.env','/scripts/serve.js','/assets/js/domain/missing.js','/assets/%2e%2e/%2e%2e/.env']) {
    assert.equal(request(url).status,404,url);
  }
  assert.equal(request('/').status,200);
  assert.equal(request('/assets/js/domain/ratings.js?version=1').status,200);
});

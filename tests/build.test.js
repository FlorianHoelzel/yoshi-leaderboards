const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {build} = require('../scripts/build');
const {root, mockAsset, publicAssets, readMockAsset} = require('../scripts/lib/assets');

test('build includes referenced assets, removes stale output, and excludes private source', () => {
  const output = path.join(root, 'dist');
  fs.mkdirSync(output, {recursive:true});
  fs.writeFileSync(path.join(output, 'stale.js'), 'old output');
  build();
  assert.equal(fs.existsSync(path.join(output, 'stale.js')), false);
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  for (const [, asset] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png|svg))"/g)) {
    assert.equal(fs.existsSync(path.join(output, asset)), true, asset);
  }
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(output, mockAsset), 'utf8'), context);
  const sourcePath = path.join(root, 'data/mock-runs.json');
  const source = fs.existsSync(sourcePath) ? JSON.parse(fs.readFileSync(sourcePath, 'utf8')) : {enabled:false, runs:[]};
  assert.equal(JSON.stringify(context.YOSHI_MOCK_DATA), JSON.stringify(source));
  for (const privatePath of ['data/mock-runs.json', 'scripts', 'tests', 'docs', '.git', '.env', '.openai']) {
    assert.equal(fs.existsSync(path.join(output, privatePath)), false, privatePath);
  }
  assert.equal(publicAssets().includes('index.html'), true);
});

test('mock asset supports disabled and missing JSON without changing stored submissions', () => {
  // Exercise the filesystem boundary without moving or editing the real dataset.
  const exists = fs.existsSync;
  const read = fs.readFileSync;
  const mockPath = path.join(root, 'data/mock-runs.json');
  try {
    fs.existsSync = file => file === mockPath ? false : exists(file);
    const missing = vm.createContext({});
    vm.runInContext(readMockAsset(), missing);
    assert.equal(missing.YOSHI_MOCK_DATA.enabled, false);
    assert.equal(missing.YOSHI_MOCK_DATA.runs.length, 0);
    fs.existsSync = exists;
    fs.readFileSync = (file, ...args) => file === mockPath ? JSON.stringify({enabled:false, runs:[{id:'kept'}]}) : read(file, ...args);
    const disabled = vm.createContext({});
    vm.runInContext(readMockAsset(), disabled);
    assert.equal(disabled.YOSHI_MOCK_DATA.enabled, false);
    assert.equal(disabled.YOSHI_MOCK_DATA.runs[0].id, 'kept');
  } finally {
    fs.existsSync = exists;
    fs.readFileSync = read;
  }
});

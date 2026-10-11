// Shared public asset list for builds and the optional local server.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const publicRoot = path.join(root, 'public');
const mockDataPath = path.join(root, 'data/mock-runs.json');
const mockAsset = 'assets/data/mock-data.js';

function publicAssets(directory = publicRoot) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? publicAssets(file) : [path.relative(publicRoot, file).split(path.sep).join('/')];
  });
}

function readMockAsset() {
  const data = fs.existsSync(mockDataPath)
    ? JSON.parse(fs.readFileSync(mockDataPath, 'utf8'))
    : {enabled:false, runs:[]};
  const worldPath = path.join(root, 'data/individual-worlds.json');
  const worlds = fs.existsSync(worldPath) ? JSON.parse(fs.readFileSync(worldPath, 'utf8')) : {runs:[]};
  return `globalThis.YOSHI_MOCK_DATA = ${JSON.stringify(data)};\nglobalThis.YOSHI_WORLD_DATA = ${JSON.stringify(worlds)};\n`;
}

module.exports = {root, publicRoot, mockAsset, publicAssets, readMockAsset};

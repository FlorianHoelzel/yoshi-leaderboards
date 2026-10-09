const fs = require('node:fs');
const path = require('node:path');
const {root, publicRoot, mockAsset, publicAssets, readMockAsset} = require('./lib/assets');

function build() {
  const output = path.resolve(root, 'dist');
  if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
    throw new Error('Build output must be the workspace dist directory');
  }
  // Only this generated output directory is replaced; source data stays separate.
  fs.rmSync(output, {recursive:true, force:true});
  const assets = publicAssets();
  for (const asset of assets) {
    const target = path.join(output, asset);
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.copyFileSync(path.join(publicRoot, asset), target);
  }
  fs.mkdirSync(path.dirname(path.join(output, mockAsset)), {recursive:true});
  fs.writeFileSync(path.join(output, mockAsset), readMockAsset());
  return assets.length + 1;
}

if (require.main === module) console.log(`Built ${build()} public assets in dist/`);
module.exports = {build};

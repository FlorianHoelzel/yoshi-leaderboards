// Copy only public assets; source, environment files, and Git metadata stay out.
const fs = require('node:fs');
const path = require('node:path');
const assets = ['index.html', 'styles.css', 'app.js', 'levels.js', 'theme.js', 'island.svg'];
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const asset of assets) fs.copyFileSync(path.join(__dirname, asset), path.join(output, asset));
console.log(`Built ${assets.length} public assets in dist/`);

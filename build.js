// Copy only public assets; source, environment files, and Git metadata stay out.
const fs = require('node:fs');
const path = require('node:path');
const assets = ['index.html', 'styles.css', 'app.js', 'levels.js', 'theme.js', 'island.svg', 'logo.png'];
if (fs.existsSync(path.join(__dirname, 'mock-data.js'))) assets.push('mock-data.js');
const output = path.join(__dirname, 'dist');
fs.mkdirSync(output, { recursive: true });
// Remove the previous fixture from builds after deleting the source fixture.
fs.rmSync(path.join(output, 'mock-data.js'), {force:true});
for (const asset of assets) fs.copyFileSync(path.join(__dirname, asset), path.join(output, asset));
console.log(`Built ${assets.length} public assets in dist/`);

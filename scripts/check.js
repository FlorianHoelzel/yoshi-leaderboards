const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {root} = require('./lib/assets');

function scripts(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? scripts(file) : file.endsWith('.js') ? [file] : [];
  });
}

for (const directory of ['public/assets/js', 'scripts', 'tests']) {
  for (const file of scripts(path.join(root, directory))) {
    const result = spawnSync(process.execPath, ['--check', file], {stdio:'inherit'});
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

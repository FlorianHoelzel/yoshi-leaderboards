// Convert a user-supplied CSV to a disposable browser fixture. Never changes local submissions.
const fs = require('node:fs');
const path = require('node:path');

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field); field = '';
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else field += char;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, ''));
  return rows.map(values => Object.fromEntries(headers.map((header, i) => [header, values[i] || ''])));
}

// Only legacy categories with an unambiguous meaning can be mapped without API values.
const fullGameMapping = {Warps:'warps', 'Reverse Boss Order':'reverse-boss-order'};
const runTypes = {
  zd37zv2n:{variable:'onvxxw58', values:{q75pnjy1:'warpless',qke5rjyq:'warps','1gn5jvnl':'magical-journey'}},
  '9d8gzlkn':{variable:'yn2kk2jn', values:{'1w49mp5q':'100-percent',qox9yp2q:'100-percent-no-restrictions'}},
  z27qx5k0:{variable:'jlz0r082', values:{jq6v2ro1:'credits-warp',jqz7g9gl:'beat-bowser',klr3ydwl:'no-ace','21dk3ngl':'magical-journey',lmopxk41:'reverse-boss-order'}},
};
const regions = {'JPN / NTSC':'NTSC-J', 'USA / NTSC':'NTSC-U', 'EUR / PAL':'PAL'};
function convertRows(rows, {apiRuns = {}} = {}) {
  const runs = [], skipped = []; const ids = new Set();
  for (const row of rows) {
    const level = row.level.match(/^([1-6]-[1-8E]):/i)?.[1].toUpperCase();
    const mode = {'Any%':'any', '100%':'100'}[row.category];
    const apiRun = apiRuns[row.run_id];
    const definition = runTypes[apiRun?.category || row.category_id];
    const category = row.level ? (level && mode ? `il-${level}-${mode}` : null) :
      definition ? definition.values[apiRun?.values?.[definition.variable]] : fullGameMapping[row.category];
    const timeMs = Math.round(Number(row.primary_time_seconds) * 1000);
    if (!category || !row.run_id || !row.players || !Number.isSafeInteger(timeMs) || timeMs <= 0 || ids.has(row.run_id) || !['new','verified','rejected'].includes(row.status)) {
      skipped.push(row.run_id); continue;
    }
    ids.add(row.run_id);
    runs.push({
      id:`mock-src-${row.run_id}`, runner:row.players, category, timeMs,
      date:/^\d{4}-\d{2}-\d{2}$/.test(row.run_date) ? row.run_date : '',
      platform:apiRun?.values?.yn2jx2e8 === '21g5jw8l' ? 'VC' : row.emulated.toLowerCase() === 'true' ? 'Emulator' : row.platform === 'Super Nintendo' ? 'SNES' : row.platform || 'Unknown',
      region:regions[row.region] || 'Unknown', video:row.video_link, comment:'',
      status:row.status === 'new' ? 'pending' : row.status, reviewer:row.examiner,
      submittedAt:row.submitted_date, verifiedAt:row.verified_date,
      sample:true, source:'yi_all_runs.csv', sourceRunId:row.run_id, sourceUrl:row.weblink,
      sourceCategory:row.category, sourcePlatform:row.platform, sourceValues:apiRun?.values || {},
    });
  }
  return {runs, skipped};
}

async function fetchApiRuns() {
  const runs = {};
  let url = 'https://www.speedrun.com/api/v1/runs?game=o6gnxo12&max=200';
  while (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`speedrun.com returned ${response.status}`);
    const result = await response.json();
    for (const run of result.data) runs[run.id] = {category:run.category, values:run.values};
    console.log(`Resolved ${Object.keys(runs).length} API runs`);
    url = result.pagination.links.find(link => link.rel === 'next')?.uri;
    if (url) await new Promise(resolve => setTimeout(resolve, 700));
  }
  return runs;
}
async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: node scripts/import-mock-data.js <CSV path> [--resolve]');
  const apiRuns = process.argv.includes('--resolve') ? await fetchApiRuns() : {};
  const {runs, skipped} = convertRows(parseCsv(fs.readFileSync(input, 'utf8')), {apiRuns});
  const output = JSON.stringify({enabled:true, runs}, null, 2) + '\n';
  fs.mkdirSync(path.join(__dirname, '..', 'data'), {recursive:true});
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'mock-runs.json'), output);
  console.log(`Imported ${runs.length} mock runs; skipped ${skipped.length}.`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = {parseCsv, convertRows};

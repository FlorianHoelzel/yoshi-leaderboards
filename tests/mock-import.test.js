const test = require('node:test');
const assert = require('node:assert/strict');
const {parseCsv, convertRows} = require('../scripts/import-mock-data');

test('CSV parser handles quoted commas, newlines, escaped quotes and BOM', () => {
  const rows = parseCsv('\uFEFFid,players,comment\r\n1,"runner,team","line one\nline ""two"""\r\n');
  assert.deepEqual(rows, [{id:'1',players:'runner,team',comment:'line one\nline "two"'}]);
  assert.throws(() => parseCsv('id\n"unfinished'), /Unclosed/);
});

test('import never guesses missing Run Type and preserves status, date and milliseconds', () => {
  const row = {run_id:'test',players:'testfern',level:'',category:'Any%',category_id:'z27qx5k0',primary_time_seconds:'123.456',run_date:'',emulated:'False',platform:'Switch',status:'new',video_link:'',weblink:'',examiner:'',region:''};
  assert.equal(convertRows([row]).runs.length, 0);
  const {runs} = convertRows([row], {apiRuns:{test:{category:'z27qx5k0',values:{jlz0r082:'klr3ydwl',yn2jx2e8:'21g5jw8l'}}}});
  assert.equal(runs[0].category, 'no-ace');
  assert.equal(runs[0].platform, 'VC');
  assert.equal(runs[0].timeMs, 123456);
  assert.equal(runs[0].status, 'pending');
  assert.equal(runs[0].date, '');
  const level = convertRows([{...row,run_id:'level',level:'2-E: Hit That Switch!!',category:'100%',status:'rejected'}]).runs[0];
  assert.equal(level.category, 'il-2-E-100');
  assert.equal(level.status, 'rejected');
});

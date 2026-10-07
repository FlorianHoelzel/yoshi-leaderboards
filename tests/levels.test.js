const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function prototype(runs = []) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: '', textContent: '', addEventListener() {},
      classList: {toggle() {}, add() {}, remove() {}},
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    document: {querySelector: element, querySelectorAll: () => [], addEventListener() {}},
    localStorage: {getItem: () => JSON.stringify({runs, viewer: 'testfern'})},
    location: {hash: '#levels/1/1-1/any'},
    window: {scrollTo() {}, addEventListener() {}},
  });
  for (const file of ['levels.js', 'app.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return {read: code => vm.runInContext(code, context), element};
}

test('all 54 stages have independent Any% and 100% boards and working routes', () => {
  const app = prototype();
  assert.equal(app.read('levels.length'), 54);
  assert.equal(app.read('new Set(levels.map(level=>level.slug)).size'), 54);
  assert.equal(app.read('levelBoards.length'), 108);
  assert.equal(app.read('new Set(boards.map(board=>board.slug)).size'), app.read('boards.length'));
  for (let world = 1; world <= 6; world++) {
    assert.equal(app.read(`levels.filter(level=>level.world===${world}).length`), 9);
    for (const stage of ['1','2','3','4','5','6','7','8','E']) {
      for (const mode of ['any', '100']) {
        app.read(`location.hash='#levels/${world}/${world}-${stage}/${mode}';route()`);
        assert.equal(app.read('currentCategory().slug'), `il-${world}-${stage}-${mode}`);
        assert.match(app.element('main').innerHTML, new RegExp(`${world}-${stage}:`));
        assert.equal(app.read('bestRuns(currentCategory().slug).length'), 4);
        assert.deepEqual(Array.from(app.read('bestRuns(currentCategory().slug).map(run=>run.rank)')), [1,1,3,4]);
      }
    }
  }
  app.read("location.hash='#leaderboard/warpless';route()");
  assert.equal(app.read('currentCategory().slug'), 'warpless');
  assert.equal(app.read('bestRuns(currentCategory().slug).length'), 12);
});

test('level submissions survive reload, stay isolated, and only verified PBs rank', () => {
  const run = {id:'level-pb',runner:'testfern',category:'il-2-E-100',timeMs:20123,date:'2026-10-07',platform:'Emulator',region:'NTSC-U',status:'verified',submittedAt:'2026-10-07T12:00:00Z'};
  const app = prototype([
    run,
    {...run,id:'older',timeMs:25123,date:'2026-10-06'},
    {...run,id:'pending',timeMs:10000,status:'pending'},
    {...run,id:'rejected',timeMs:9000,status:'rejected'},
    {...run,id:'unknown',category:'missing'},
  ]);
  assert.equal(app.read('saved.runs.length'), 4);
  assert.equal(app.read("bestRuns('il-2-E-100')[0].id"), 'level-pb');
  assert.equal(app.read("bestRuns('il-2-E-100').filter(run=>run.runner==='testfern').length"), 1);
  assert.equal(app.read("bestRuns('il-2-E-any').some(run=>run.runner==='testfern')"), false);
  assert.equal(app.read("bestRuns('il-2-8-100').some(run=>run.runner==='testfern')"), false);
  assert.equal(app.read("bestRuns('il-2-E-100','NTSC-J').some(run=>run.runner==='testfern')"), false);
  assert.equal(app.read("parseTime('0:20.123')"), 20123);
  assert.equal(app.read("boardHref(boards.find(board=>board.slug==='il-2-E-100'))"), '#levels/2/2-E/100');
  app.read("location.hash='#levels/99/invalid/invalid';route()");
  assert.equal(app.read('currentCategory().slug'), 'il-1-1-any');
});

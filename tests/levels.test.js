const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function prototype(runs = [], mockFile = 'tests/fixtures/sample-data.js', enabled = true) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: '', textContent: '', addEventListener() {}, querySelectorAll: () => [],
      classList: {toggle() {}, add() {}, remove() {}}, showModal() {},
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    URL, URLSearchParams,
    document: {querySelector: element, querySelectorAll: () => [], addEventListener() {}},
    localStorage: {getItem: () => JSON.stringify({runs, viewer: 'testfern'})},
    location: {hash: '#levels/1/1-1/any'},
    window: {scrollTo() { this.scrollResets=(this.scrollResets||0)+1; }, addEventListener() {}},
  });
  for (const file of ['levels.js', mockFile, 'app.js'].filter(Boolean)) {
    if (file === 'app.js' && !enabled) vm.runInContext('globalThis.YOSHI_MOCK_DATA.enabled=false', context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  return {read: code => vm.runInContext(code, context), element};
}

test('CSV mock fixture resolves subcategories and VC and renders all boards and stats', {skip:!fs.existsSync(path.join(__dirname, '..', 'mock-data.js'))}, () => {
  const app = prototype([], 'mock-data.js');
  assert.equal(app.read('sampleRuns.length'), 2441);
  assert.equal(app.read("sampleRuns.filter(run=>run.platform==='VC').length"), 156);
  assert.equal(app.read("sampleRuns.find(run=>run.sourceRunId==='pm3dw56z').category"), 'magical-journey');
  assert.equal(app.read('sampleRuns.every(run=>Number.isSafeInteger(run.timeMs)&&run.timeMs>0&&run.sample)'), true);
  assert.equal(app.read('new Set(sampleRuns.map(run=>run.id)).size'), 2441);
  assert.equal(app.read('sampleRuns.every(run=>boards.some(board=>board.slug===run.category))'), true);
  for (const slug of Array.from(app.read('categories.map(category=>category.slug)'))) {
    app.read(`location.hash='#leaderboard/${slug}';route()`);
    assert.doesNotMatch(app.element('main').innerHTML, /Invalid Date|NaN|undefined/);
    assert.equal(app.read(`bestRuns('${slug}').every(run=>run.status==='verified')`), true);
    app.read(`state.statsBoard='${slug}';renderStats()`);
    assert.doesNotMatch(app.element('main').innerHTML, /Invalid Date|NaN|undefined/);
  }
  assert.equal(app.read("dateLabel('')"), 'Unknown date');
  assert.equal(app.read("recordProgression('warpless').every(run=>!!run.date)"), true);
  const videoRun = app.read('sampleRuns.find(run=>run.video).id');
  app.read(`runDetails('${videoRun}')`);
  assert.match(app.element('#modal-content').innerHTML, /Mock run/);
  assert.doesNotMatch(app.element('#modal-content').innerHTML, /Sample run · No video/);
});

test('disabling or removing mock data retains local submissions and empty boards work', () => {
  const local = {id:'demo-kept',runner:'testfern',category:'warpless',timeMs:60000,date:'2026-10-01',status:'verified',platform:'VC'};
  for (const [file, enabled] of [['tests/fixtures/sample-data.js', false], [null, true]]) {
    const app = prototype([local], file, enabled);
    assert.equal(app.read('sampleRuns.length'), 0);
    assert.equal(app.read('allRuns().length'), 1);
    assert.equal(app.read("bestRuns('warpless')[0].id"), 'demo-kept');
    assert.equal(app.read("bestRuns('warpless')[0].platform"), 'VC');
    app.read("location.hash='#leaderboard/warps';route()");
    assert.match(app.element('main').innerHTML, /No verified runs yet/);
    app.read('renderStats()');
    assert.doesNotMatch(app.element('main').innerHTML, /NaN|undefined/);
  }
});

test('category switches preserve sidebar nodes and scroll position', () => {
  const app = prototype();
  const nav = app.element('#category-nav');
  const markup = nav.innerHTML;
  Object.defineProperty(nav, 'innerHTML', {
    get: () => markup,
    set: () => { throw new Error('Sidebar must not be rebuilt on navigation'); },
  });
  app.read("location.hash='#leaderboard/no-ace';route()");
  const resets = app.read('window.scrollResets');
  app.read("location.hash='#leaderboard/reverse-boss-order';route()");
  assert.equal(app.read('currentCategory().slug'), 'reverse-boss-order');
  assert.equal(app.read('window.scrollResets'), resets);
  app.read("location.hash='#runners';route()");
  assert.equal(app.read('window.scrollResets'), resets + 1);
});

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
        assert.deepEqual(Array.from(app.read('bestRuns(currentCategory().slug).map(run=>run.rank)')), [1,2,3,4]);
      }
    }
  }
  app.read("location.hash='#leaderboard/warpless';route()");
  assert.equal(app.read('currentCategory().slug'), 'warpless');
  assert.equal(app.read('bestRuns(currentCategory().slug).length'), 12);
  for (const slug of Array.from(app.read('categories.map(category=>category.slug)'))) {
    const times = Array.from(app.read(`bestRuns('${slug}').map(run=>run.timeMs)`));
    assert.equal(new Set(times).size, times.length);
  }
  app.read("sampleRuns.push({...sampleRuns[0],id:'equal-submission',runner:'tiedrunner'})");
  assert.deepEqual(Array.from(app.read("bestRuns('100-percent').slice(0,3).map(run=>run.rank)")), [1,1,3]);
});

test('stats count verified histories and sum integer RTA across full-game and level runs', () => {
  const app = prototype();
  app.read(`globalThis.statsRuns=[
    {category:'warpless',runner:'fern',timeMs:86400001,status:'verified'},
    {category:'warpless',runner:'fern',timeMs:3600002,status:'verified'},
    {category:'il-1-1-any',runner:'moss',timeMs:60003,status:'verified'},
    {category:'warpless',runner:'pendingrunner',timeMs:1000,status:'pending'},
    {category:'il-1-1-any',runner:'rejectedrunner',timeMs:2000,status:'rejected'}
  ]`);
  assert.deepEqual(JSON.parse(app.read('JSON.stringify(speedrunStats(statsRuns))')), {total:3,fullGame:2,levels:1,players:2,timeMs:90060006});
  assert.equal(app.read('totalRunTime(90060006)'), '1d 1h 1m 0s 6ms');
  assert.equal(app.read('speedrunStats([]).total'), 0);
  assert.equal(app.read('totalRunTime(0)'), '0d 0h 0m 0s 0ms');
});

test('record progression ignores pending, rejected, tied and slower runs, and picks the fastest per day', () => {
  const app = prototype();
  app.read(`globalThis.history=[
    {id:'last',category:'warpless',date:'2026-09-04',timeMs:800,runner:'moss',status:'verified',platform:'Emulator'},
    {id:'same-day-slower',category:'warpless',date:'2026-09-02',timeMs:950,status:'verified'},
    {id:'first',category:'warpless',date:'2026-09-01',timeMs:1000,status:'verified'},
    {id:'same-day-fastest',category:'warpless',date:'2026-09-02',timeMs:900,status:'verified'},
    {id:'tie',category:'warpless',date:'2026-09-03',timeMs:900,status:'verified'},
    {id:'pending',category:'warpless',date:'2026-09-03',timeMs:700,status:'pending'},
    {id:'rejected',category:'warpless',date:'2026-09-03',timeMs:600,status:'rejected'},
    {id:'other-board',category:'warps',date:'2026-09-03',timeMs:500,status:'verified'},
    {id:'slower',category:'warpless',date:'2026-09-05',timeMs:1100,status:'verified'}
  ]`);
  assert.deepEqual(Array.from(app.read("recordProgression('warpless',history).map(run=>run.id)")), ['first','same-day-fastest','last']);
  assert.equal(app.read("recordProgression('no-ace',history).length"), 0);
  assert.match(app.read('recordChart([])'), /No verified runs yet/);
});

test('stats routes render charts and lists for full-game and individual-level boards', () => {
  const app = prototype();
  app.read("location.hash='#stats/warpless';route()");
  assert.equal(app.read('state.page'), 'stats');
  assert.match(app.element('main').innerHTML, /Total players/);
  assert.match(app.element('main').innerHTML, /record-chart-title/);
  assert.doesNotMatch(app.element('main').innerHTML, /NaN|Infinity/);
  app.read("location.hash='#stats/il-1-1-any';route()");
  assert.equal(app.read('state.statsBoard'), 'il-1-1-any');
  app.read("state.statsView='list';renderStats()");
  assert.match(app.element('main').innerHTML, /IMPROVEMENT/);
  assert.match(app.element('main').innerHTML, /world record progression, oldest first/i);
  app.read("sampleRuns.length=0;state.statsView='chart';renderStats()");
  assert.match(app.element('main').innerHTML, /No verified runs yet/);
  assert.match(app.element('main').innerHTML, /id="stats-csv" disabled/);
});

test('seconds-only times normalize without rounding or accepting invalid seconds', () => {
  const app = prototype();
  for (const [input, expected] of [['24.123',24123],['9.5',9500],['0.001',1],['59.999',59999],['0:24.123',24123],['2:06:31.420',7591420]]) {
    assert.equal(app.read(`parseTime(${JSON.stringify(input)})`), expected);
  }
  assert.equal(app.read("normalizeTime(' 24.123 ')"), '0:24.123');
  assert.equal(app.read("normalizeTime('9.5')"), '0:09.5');
  for (const input of ['60.123','24.1234','-1.000','0.000','1:60.000']) {
    assert.equal(app.read(`parseTime(${JSON.stringify(input)})`), null);
  }
});

test('video embeds use recognized recording URLs and the current Twitch parent domain', () => {
  const app = prototype();
  for (const value of ['https://www.youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE','https://www.youtube.com/shorts/M7lc1UVf-VE']) {
    assert.equal(app.read(`videoEmbedUrl(${JSON.stringify(value)},'yoshi.sumof.best')`), 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?autoplay=0');
  }
  const vod = new URL(app.read("videoEmbedUrl('https://www.twitch.tv/videos/40464143','yoshi.sumof.best')"));
  assert.equal(vod.hostname, 'player.twitch.tv');
  assert.equal(vod.searchParams.get('video'), 'v40464143');
  assert.equal(vod.searchParams.get('parent'), 'yoshi.sumof.best');
  assert.equal(vod.searchParams.get('autoplay'), 'false');
  for (const value of ['https://clips.twitch.tv/TestClip','https://www.twitch.tv/runner/clip/TestClip']) {
    assert.equal(new URL(app.read(`videoEmbedUrl(${JSON.stringify(value)},'yoshi.sumof.best')`)).searchParams.get('clip'), 'TestClip');
  }
  for (const value of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://www.youtube.com/','https://www.twitch.tv/runner','http://youtu.be/M7lc1UVf-VE']) {
    assert.equal(app.read(`videoEmbedUrl(${JSON.stringify(value)},'yoshi.sumof.best')`), null);
  }
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

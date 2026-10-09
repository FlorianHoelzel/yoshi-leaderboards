const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('history chart zoom clamps date ranges, pans and resets', () => {
  const app=prototype();
  app.read('globalThis.zoomBounds={start:0,end:86400000*16};globalThis.zoomView={...zoomBounds}');
  app.read("zoomView=chartViewport(zoomBounds,zoomView,'in')");
  assert.equal(app.read('zoomView.end-zoomView.start'),86400000*8);
  app.read("zoomView=chartViewport(zoomBounds,zoomView,'earlier')");
  assert.equal(app.read('zoomView.start'),0);
  app.read("zoomView=chartViewport(zoomBounds,zoomView,'earlier')");
  assert.equal(app.read('zoomView.start'),0);
  for(let i=0;i<6;i++)app.read("zoomView=chartViewport(zoomBounds,zoomView,'in')");
  assert.equal(app.read('zoomView.end-zoomView.start'),86400000*7);
  for(let i=0;i<40;i++)app.read("zoomView=chartViewport(zoomBounds,zoomView,'later')");
  assert.equal(app.read('zoomView.end'),86400000*16);
  app.read("zoomView=chartViewport(zoomBounds,zoomView,'out')");
  assert.equal(app.read('zoomView.end-zoomView.start'),86400000*14);
  app.read("zoomView=chartViewport(zoomBounds,zoomView,'reset')");
  assert.equal(app.read('zoomView.start'),0);
  assert.equal(app.read('zoomView.end'),86400000*16);
});

test('history zoom caps long histories and preserves short histories', () => {
  const app=prototype();
  app.read('globalThis.bounds={start:0,end:86400000*10000};globalThis.view={...bounds}');
  for(let i=0;i<30;i++)app.read("view=chartViewport(bounds,view,'zoom',.1,.25)");
  assert.equal(app.read('(bounds.end-bounds.start)/(view.end-view.start)'),100);
  const capped=app.read('JSON.stringify(view)');
  app.read("view=chartViewport(bounds,view,'in')");
  assert.equal(app.read('JSON.stringify(view)'),capped);
  app.read("view=chartViewport(bounds,view,'pan',1,.5,86400000*100000)");
  assert.equal(app.read('view.end'),app.read('bounds.end'));
  app.read('bounds={start:0,end:86400000*3};view={...bounds}');
  app.read("view=chartViewport(bounds,view,'zoom',.001,1)");
  assert.equal(app.read('view.start'),0);
  assert.equal(app.read('view.end'),86400000*3);
});

test('zoomed history preserves the preceding record and distinct runner colors', () => {
  const app=prototype();
  app.read(`globalThis.chartRuns=[
    {id:'first',runner:'Fern',date:'2026-01-01',timeMs:100001},
    {id:'second',runner:'Birch',date:'2026-01-10',timeMs:90002},
    {id:'third',runner:'Fern',date:'2026-01-20',timeMs:80003}
  ]`);
  const fern=app.read("chartRunnerStyle('Fern')");
  assert.notEqual(fern,app.read("chartRunnerStyle('Birch')"));
  assert.equal(fern,app.read("chartRunnerStyle('Fern')"));
  const chart=app.read("recordChart(chartRuns,'History','2026-01-30',{start:Date.parse('2026-01-12T00:00:00Z'),end:Date.parse('2026-01-16T00:00:00Z')})");
  assert.doesNotMatch(chart,/NaN|Infinity|data-record=/);
  assert.match(chart,/class="chart-line"/);
  assert.doesNotMatch(chart,/class="chart-line" style=/);
  assert.match(chart,/Scroll to zoom/);
  assert.match(chart,/aria-label="Runners"/);
  assert.match(chart,/Fern/);
  assert.match(chart,/Birch/);
  const single=app.read("recordChart([chartRuns[0]],'History','2026-01-01')");
  assert.doesNotMatch(single,/NaN|Infinity/);
  assert.doesNotMatch(single,/data-chart-action/);
});

test('wheel zoom anchors the cursor and drag pan clamps at the history edges', () => {
  const app=prototype();
  app.read('globalThis.bounds={start:0,end:86400000*16};globalThis.view={...bounds}');
  app.read("view=chartViewport(bounds,view,'zoom',.5,.25)");
  assert.equal(app.read('view.end-view.start'),86400000*8);
  assert.equal(app.read('view.start+(view.end-view.start)*.25'),86400000*4);
  app.read("view=chartViewport(bounds,view,'pan',1,.5,86400000)");
  assert.equal(app.read('view.start'),86400000*3);
  app.read("view=chartViewport(bounds,view,'pan',1,.5,-86400000*100)");
  assert.equal(app.read('view.start'),0);
  app.read("view=chartViewport(bounds,view,'pan',1,.5,86400000*100)");
  assert.equal(app.read('view.end'),86400000*16);
  app.read("view=chartViewport(bounds,view,'zoom',100,.8)");
  assert.equal(app.read('view.start'),0);
  assert.equal(app.read('view.end'),86400000*16);
});

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
  for (const file of ['public/assets/js/domain/levels.js', 'public/assets/js/domain/catalog.js', 'public/assets/js/domain/time.js', 'public/assets/js/domain/runs.js', mockFile, 'public/assets/js/data/store.js', 'public/assets/js/app.js'].filter(Boolean)) {
    if (file === 'public/assets/js/data/store.js' && !enabled) vm.runInContext('globalThis.YOSHI_MOCK_DATA.enabled=false', context);
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    vm.runInContext(file.endsWith('.json') ? `globalThis.YOSHI_MOCK_DATA=${source}` : source, context);
  }
  return {read: code => vm.runInContext(code, context), element};
}

test('runner directory counts PBs separately from histories, preserves tied #1s and groups emulator with SNES', () => {
  const app=prototype([],null);
  app.read(`globalThis.directoryRuns=[
    {id:'a',runner:'Fern',category:'warpless',platform:'SNES',timeMs:60000,date:'2026-01-01',status:'verified'},
    {id:'b',runner:'Fern',category:'warpless',platform:'Emulator',timeMs:50000,date:'2026-02-01',status:'verified'},
    {id:'c',runner:'Birch',category:'warpless',platform:'SNES',timeMs:50000,date:'2026-03-01',status:'verified'},
    {id:'d',runner:'Fern',category:'warpless',platform:'VC',timeMs:70000,date:'2026-04-01',status:'verified'},
    {id:'e',runner:'Birch',category:'il-1-1-any',platform:'Emulator',timeMs:20000,date:'',status:'verified'},
    {id:'f',runner:'Pending',category:'warpless',platform:'SNES',timeMs:10000,date:'2026-05-01',status:'pending'}
  ]`);
  const read=options=>JSON.parse(app.read(`JSON.stringify(runnerDirectory(directoryRuns,boards,${JSON.stringify(options)}))`));
  const entries=read({});
  assert.deepEqual(entries.map(entry=>[entry.name,entry.runs,entry.pbs,entry.firsts]),[['Birch',2,2,2],['Fern',3,2,2]]);
  assert.equal(entries[1].latest.id,'d');
  assert.deepEqual(read({type:'full',platform:'snes'}).map(entry=>[entry.name,entry.runs,entry.pbs,entry.firsts]),[['Birch',1,1,1],['Fern',2,1,1]]);
  assert.deepEqual(read({type:'levels'}).map(entry=>entry.name),['Birch']);
  assert.deepEqual(read({platform:'vc'}).map(entry=>entry.name),['Fern']);
  assert.deepEqual(read({search:' FERN '}).map(entry=>entry.name),['Fern']);
  assert.deepEqual(read({sort:'latest'}).map(entry=>entry.name),['Fern','Birch']);
  assert.deepEqual(read({sort:'runs'}).map(entry=>entry.name),['Fern','Birch']);
});

test('runner directory renders filtered counts, profile and run links without avatars', () => {
  const app=prototype();
  app.read('renderRunners()');
  assert.match(app.element('main').innerHTML,/Board type/);
  assert.match(app.element('main').innerHTML,/SNES \/ Emulator/);
  assert.equal(app.element('#runner-count').textContent,'12 runners');
  const markup=app.element('#runner-results').innerHTML;
  assert.match(markup,/PERSONAL BESTS/);
  assert.match(markup,/data-profile="aura"/);
  assert.match(markup,/data-run="sample-0-0"/);
  assert.doesNotMatch(markup,/avatar|runner-card|NaN|undefined/);
  assert.ok(markup.indexOf('data-profile="aura"')<markup.indexOf('data-profile="puddles"'));
  app.read("state.runnerType='levels';state.runnerSearch=' ORBIT ';renderRunnerResults()");
  assert.equal(app.element('#runner-count').textContent,'1 runner');
  assert.match(app.element('#runner-results').innerHTML,/data-profile="orbit"/);
  app.read("state.runnerPlatform='vc';renderRunnerResults()");
  assert.equal(app.element('#runner-count').textContent,'0 runners');
  assert.match(app.element('#runner-results').innerHTML,/No runners match these filters/);
});

test('runner directory paginates large lists and clamps stale pages for empty results', () => {
  const app=prototype([],null);
  app.read(`saved.runs=Array.from({length:28},(_,i)=>({id:'directory-'+i,runner:'Runner '+String(i).padStart(2,'0'),category:'warpless',platform:'SNES',timeMs:60000+i,date:'',status:'verified'}));renderRunners()`);
  assert.equal((app.element('#runner-results').innerHTML.match(/data-profile=/g)||[]).length,25);
  assert.match(app.element('#runner-results').innerHTML,/1–25 of 28 runners/);
  app.read('state.runnerPage=1;renderRunnerResults()');
  assert.equal((app.element('#runner-results').innerHTML.match(/data-profile=/g)||[]).length,3);
  assert.match(app.element('#runner-results').innerHTML,/26–28 of 28 runners/);
  assert.doesNotMatch(app.element('#runner-results').innerHTML,/Invalid Date/);
  app.read("state.runnerSearch='missing';renderRunnerResults()");
  assert.equal(app.read('state.runnerPage'),0);
  assert.match(app.element('#runner-results').innerHTML,/No runners match/);
  const empty=prototype([],null);
  empty.read('renderRunners()');
  assert.match(empty.element('#runner-results').innerHTML,/No verified runners yet/);
});

test('CSV mock fixture resolves subcategories and VC and renders all boards and stats', {skip:!fs.existsSync(path.join(__dirname, '..', 'data/mock-runs.json'))}, () => {
  const app = prototype([], 'data/mock-runs.json');
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
  assert.match(app.read('levelSelector(levelBoards[0])'), />1-E<\/a>/);
  assert.doesNotMatch(app.read('levelSelector(levelBoards[0])'), /· Extra/);
  assert.equal(app.read("recordProgression('warpless').every(run=>!!run.date)"), true);
  const videoRun = app.read('sampleRuns.find(run=>run.video).id');
  app.read(`runDetails('${videoRun}')`);
  assert.doesNotMatch(app.element('#modal-content').innerHTML, /Mock run/);
  assert.doesNotMatch(app.element('#modal-content').innerHTML, /Sample run · No video/);
});

test('disabling or removing mock data retains local submissions and empty boards work', () => {
  const local = {id:'demo-kept',runner:'testfern',category:'warpless',timeMs:60000,date:'2026-10-01',status:'verified',platform:'VC'};
  for (const [file, enabled] of [['tests/fixtures/sample-data.js', false], [null, true]]) {
    const app = prototype([local], file, enabled);
    assert.equal(app.read('sampleRuns.length'), 0);
    assert.equal(app.read('allRuns().length'), 1);
    assert.equal(app.read("bestRuns('warpless','all','vc')[0].id"), 'demo-kept');
    assert.equal(app.read("bestRuns('warpless','all','vc')[0].platform"), 'VC');
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
  assert.doesNotMatch(app.element('main').innerHTML, /stats-csv|Download CSV/);
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

test('time display hides only zero milliseconds and dates include the year', () => {
  const app = prototype();
  for (const [ms, text] of [[0,'0:00'],[24123,'0:24.123'],[60000,'1:00'],[6124000,'1:42:04'],[6124001,'1:42:04.001'],[6124100,'1:42:04.100']]) {
    assert.equal(app.read(`formatTime(${ms})`), text);
  }
  assert.equal(app.read("dateLabel('2019-03-04')"), 'Mar 4, 2019');
  assert.equal(app.read("dateLabel('')"), 'Unknown date');
  assert.doesNotMatch(app.read("profileButton('testfern')"), /Community runner|runner-location/);
  app.read("runners.push({name:'testfern',country:'Canada'})");
  assert.match(app.read("profileButton('testfern')"), /Canada/);
});

test('VC has independent ranks, PBs, record history and shareable full-game/level routes', () => {
  const base = {runner:'testfern',category:'warpless',timeMs:60000,date:'2026-10-01',status:'verified'};
  const app = prototype([
    {...base,id:'snes-pb',platform:'SNES'},
    {...base,id:'emulator-tie',runner:'testmoss',platform:'Emulator'},
    {...base,id:'snes-third',runner:'testorbit',platform:'SNES',timeMs:70000},
    {...base,id:'vc-pb',platform:'VC',timeMs:50000},
    {...base,id:'vc-tie',runner:'testmoss',platform:'VC',timeMs:50000},
    {...base,id:'vc-third',runner:'testorbit',platform:'VC',timeMs:55000},
    {...base,id:'vc-level',category:'il-1-1-any',platform:'VC',timeMs:1000},
  ], null);
  assert.deepEqual(Array.from(app.read("bestRuns('warpless').map(run=>run.rank)")), [1,1,3]);
  app.read("location.hash='#leaderboard/warpless?platform=vc';route()");
  assert.equal(app.read('state.platform'), 'vc');
  assert.deepEqual(Array.from(app.read("bestRuns('warpless').map(run=>run.rank)")), [1,1,3]);
  assert.equal(app.read("bestRuns('warpless')[0].id"), 'vc-pb');
  assert.match(app.element('main').innerHTML, /data-platform="vc" aria-pressed="true"/);
  assert.doesNotMatch(app.element('main').innerHTML, /snes-pb|emulator-tie/);
  app.read("location.hash='#stats/warpless?platform=vc';route()");
  assert.deepEqual(Array.from(app.read("recordProgression('warpless').map(run=>run.id)")), ['vc-pb']);
  app.read("profile('testfern')");
  assert.match(app.element('#profile-content').innerHTML, /warpless:|Warpless/);
  assert.match(app.element('#profile-content').innerHTML, /snes-pb/);
  assert.match(app.element('#profile-content').innerHTML, /vc-pb/);
  assert.doesNotMatch(app.element('#modal-content').innerHTML, /Community runner/);
  app.read("runDetails('snes-pb')");
  assert.match(app.element('#modal-content').innerHTML, /<dd>#1<\/dd>/);
  app.read("location.hash='#levels/1/1-1/any?platform=vc';route()");
  assert.equal(app.read("bestRuns('il-1-1-any')[0].id"), 'vc-level');
  assert.match(app.read('levelSelector(currentCategory())'), /#levels\/1\/1-1\/100\?platform=vc/);
  assert.equal(app.read('boardHref(currentCategory())'), '#levels/1/1-1/any?platform=vc');
  app.read("location.hash='#leaderboard/warpless';route()");
  assert.equal(app.read('state.platform'), 'snes');
  assert.equal(app.read("bestRuns('warpless').find(run=>run.runner==='testfern').id"), 'snes-pb');
});

test('profiles separate boards and platforms, paginate history and exclude undated runs from progression', () => {
  const base={runner:'testfern',category:'warpless',platform:'SNES',status:'verified',date:'2026-09-01',timeMs:60000};
  const runs=Array.from({length:12},(_,index)=>({...base,id:`history-${index}`,date:`2026-09-${String(index+1).padStart(2,'0')}`,timeMs:60000-index*1000}));
  runs.push({...base,id:'vc-run',platform:'VC',timeMs:40000}, {...base,id:'il-run',category:'il-1-1-any',timeMs:1000}, {...base,id:'undated',date:'',timeMs:30000}, {...base,id:'pending',status:'pending',timeMs:100});
  const app=prototype(runs,null);
  app.read("profile('testfern')");
  assert.match(app.element('#modal-content').innerHTML, /<dd>15<\/dd>/);
  assert.match(app.element('#profile-content').innerHTML, /undated/);
  assert.match(app.element('#profile-content').innerHTML, /vc-run/);
  app.read("profileState.type='levels';renderProfileContent()");
  assert.match(app.element('#profile-content').innerHTML, /il-run/);
  assert.doesNotMatch(app.element('#profile-content').innerHTML, /vc-run|undated/);
  app.read("profileState.type='full';profileState.platform='snes';profileState.view='history';renderProfileContent()");
  assert.equal((app.element('#profile-content').innerHTML.match(/data-run=/g)||[]).length,10);
  assert.match(app.element('#profile-content').innerHTML, /1-10 of 13 runs/);
  app.read('profileState.page=1;renderProfileContent()');
  assert.equal((app.element('#profile-content').innerHTML.match(/data-run=/g)||[]).length,3);
  assert.match(app.element('#profile-content').innerHTML, /Unknown date/);
  app.read("profileState.view='progress';renderProfileContent()");
  assert.match(app.element('#profile-content').innerHTML, /Personal best progression/);
  assert.doesNotMatch(app.element('#profile-content').innerHTML, /data-run="undated"|NaN|Invalid Date/);
  assert.equal(app.read("profileProgression(profileData('testfern').runs,'warpless','snes').length"),12);
  app.read("profile('emptyrunner')");
  assert.match(app.element('#profile-content').innerHTML, /No verified PBs/);
});

test('personal progression ignores ties, slower runs and slower same-day entries', () => {
  const app=prototype([],null);
  app.read(`globalThis.profileRuns=[
    {id:'slow-first-day',category:'warpless',platform:'SNES',date:'2026-09-01',timeMs:1200},
    {id:'first',category:'warpless',platform:'Emulator',date:'2026-09-01',timeMs:1000},
    {id:'tie',category:'warpless',platform:'SNES',date:'2026-09-02',timeMs:1000},
    {id:'slower',category:'warpless',platform:'SNES',date:'2026-09-03',timeMs:1100},
    {id:'better',category:'warpless',platform:'SNES',date:'2026-09-04',timeMs:900},
    {id:'vc',category:'warpless',platform:'VC',date:'2026-09-05',timeMs:800}
  ]`);
  assert.deepEqual(Array.from(app.read("profileProgression(profileRuns,'warpless','snes').map(run=>run.id)")),['first','better']);
});

test('large PB collections are paginated and profile return preserves filters and page', () => {
  const runs=Array.from({length:14},(_,index)=>({id:`pb-${index}`,runner:'testfern',category:`il-1-${Math.floor(index/2)+1}-${index%2?'100':'any'}`,platform:'SNES',status:'verified',date:'2026-09-01',timeMs:1000+index}));
  const app=prototype(runs,null);
  app.read("profile('testfern')");
  assert.equal((app.element('#profile-content').innerHTML.match(/data-run=/g)||[]).length,12);
  assert.match(app.element('#profile-content').innerHTML,/1-12 of 14 PBs/);
  app.read("profileState.page=1;profileState.type='levels';profileState.platform='snes';renderProfileContent()");
  app.element('#modal').open=true;
  app.read("runDetails('pb-13')");
  assert.match(app.element('#modal-content').innerHTML,/Back to profile/);
  app.read("profile('testfern',true)");
  assert.match(app.element('#profile-content').innerHTML,/13-14 of 14 PBs/);
  assert.equal(app.element('#profile-type').value,'levels');
  assert.equal(app.element('#profile-platform').value,'snes');
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

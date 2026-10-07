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
    URL, URLSearchParams,
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

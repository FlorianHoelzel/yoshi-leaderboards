const test=require('node:test');
const assert=require('node:assert/strict');
const {convertWorldRuns}=require('../scripts/import-individual-worlds');
const game={platforms:{data:[{id:'snes',name:'Super Nintendo'},{id:'switch',name:'Switch'}]},regions:{data:[{id:'jpn',name:'JPN / NTSC'}]}};
const record={id:'source1',game:'j1ll43z1',category:'n2y53v8k',values:{'9l7x40pn':'gq7prvnq',ylpve4rl:'zqomzp21'},players:{data:[{id:'runner1',names:{international:'Fern'}}]},times:{realtime_t:60.123,primary_t:100},date:null,submitted:'2026-01-01T00:00:00Z',status:{status:'verified',examiner:'runner1'},system:{platform:'snes',emulated:false,region:'jpn'},videos:{links:[{uri:'https://youtu.be/abcdefghijk'}]},weblink:'https://www.speedrun.com/yiext/runs/source1'};

test('world importer uses RTA and source values, preserves provenance and never invents dates',()=>{
  const {runs,skipped}=convertWorldRuns([record],game);
  assert.deepEqual(skipped,[]);
  assert.equal(runs[0].timeMs,60123);
  assert.equal(runs[0].category,'iw-1-warpless');
  assert.equal(runs[0].date,'');
  assert.equal(runs[0].platform,'SNES');
  assert.equal(runs[0].region,'NTSC-J');
  assert.equal(runs[0].reviewer,'Fern');
  assert.equal(runs[0].sourceUrl,record.weblink);
  assert.deepEqual(runs[0].sourceValues,record.values);
  assert.equal(runs[0].video,record.videos.links[0].uri);
});

test('world importer handles Extras, guest runners, emulator and original Switch platform',()=>{
  const extras={...record,id:'extras',date:'2026-01-02',players:{data:[{name:'Birch'}]},values:{'9l7x40pn':'jqz9xrk1',ylpve4rl:'013wz83q'},system:{platform:'snes',emulated:true}};
  const switched={...record,id:'switch',system:{platform:'switch',emulated:false}};
  const {runs}=convertWorldRuns([extras,switched],game);
  assert.equal(runs[0].category,'iw-extras-100');
  assert.equal(runs[0].runner,'Birch');
  assert.equal(runs[0].platform,'Emulator');
  assert.equal(runs[0].region,'Unknown');
  assert.equal(runs[1].platform,'Switch');
});

test('world importer skips duplicate, wrong-game, ambiguous and missing RTA records',()=>{
  const {runs,skipped}=convertWorldRuns([record,record,{...record,id:'wrong',game:'other'},{...record,id:'ambiguous',values:{}},{...record,id:'invalid',times:{primary_t:10}}],game);
  assert.equal(runs.length,1);
  assert.deepEqual(skipped,['source1','wrong','ambiguous','invalid']);
});

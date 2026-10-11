// Refresh the public Individual Worlds snapshot without touching local submissions.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const categoryId = 'n2y53v8k';
const gameId = 'j1ll43z1';
function catalog() {
  const context = vm.createContext({});
  for (const file of ['levels.js','catalog.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/assets/js/domain',file),'utf8'),context);
  return JSON.parse(vm.runInContext('JSON.stringify({worlds,worldCategories})',context));
}
function convertWorldRuns(records, game) {
  const {worlds,worldCategories} = catalog();
  const platforms = new Map(game.platforms.data.map(item=>[item.id,item.name]));
  const regions = new Map(game.regions.data.map(item=>[item.id,{'USA / NTSC':'NTSC-U','JPN / NTSC':'NTSC-J','EUR / PAL':'PAL'}[item.name]||item.name]));
  const users = new Map(records.flatMap(run=>run.players?.data||[]).map(player=>[player.id,player.names?.international||player.name]));
  const seen = new Set(), runs = [], skipped = [];
  for (const run of records) {
    const world = worlds.find(world=>world.sourceValue===run.values?.['9l7x40pn']);
    const mode = worldCategories.find(mode=>mode.sourceValue===run.values?.ylpve4rl);
    const players = run.players?.data||[];
    const runner = players.map(player=>player.names?.international||player.name).filter(Boolean).join(' & ');
    const timeMs = Math.round(run.times?.realtime_t*1000);
    if (run.game!==gameId||run.category!==categoryId||!world||!mode||!runner||!run.id||seen.has(run.id)||!Number.isSafeInteger(timeMs)||timeMs<=0||!['new','verified','rejected'].includes(run.status?.status)) {
      skipped.push(run.id); continue;
    }
    seen.add(run.id);
    const sourcePlatform = platforms.get(run.system?.platform)||'Unknown';
    runs.push({
      id:`src-iw-${run.id}`,runner,category:`iw-${world.slug}-${mode.slug}`,timeMs,
      date:/^\d{4}-\d{2}-\d{2}$/.test(run.date)?run.date:'',
      platform:run.system?.emulated?'Emulator':sourcePlatform==='Super Nintendo'?'SNES':sourcePlatform,
      region:regions.get(run.system?.region)||'Unknown',status:run.status.status==='new'?'pending':run.status.status,
      video:run.videos?.links?.[0]?.uri||'',comment:run.comment||'',
      reviewer:users.get(run.status.examiner)||run.status.examiner||'',
      submittedAt:run.submitted||'',verifiedAt:run.status['verify-date']||'',
      source:'speedrun.com/yiext',sourceRunId:run.id,sourceUrl:run.weblink,
      sourceCategory:'Individual Worlds',sourceWorld:world.name,sourcePlatform,sourceValues:run.values,
    });
  }
  return {runs,skipped};
}
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`speedrun.com returned ${response.status}`);
  return response.json();
}
async function main() {
  let records,game,category,variables;
  if (process.argv[2]==='--from') {
    const read = name=>JSON.parse(fs.readFileSync(`${process.argv[3]}-${name}.json`,'utf8'));
    const result = read('runs');
    if (result.pagination.links.some(link=>link.rel==='next')) throw new Error('Offline input must contain all run pages');
    records=result.data;game=read('game').data;category=read('category').data;variables=read('variables').data;
  } else {
    game=(await fetchJson(`https://www.speedrun.com/api/v1/games/${gameId}?embed=platforms,regions`)).data;
    category=(await fetchJson(`https://www.speedrun.com/api/v1/categories/${categoryId}`)).data;
    variables=(await fetchJson(`https://www.speedrun.com/api/v1/categories/${categoryId}/variables`)).data;
    records=[];
    let url=`https://www.speedrun.com/api/v1/runs?category=${categoryId}&max=200&embed=players`;
    while(url){
      const result=await fetchJson(url);records.push(...result.data);
      url=result.pagination.links.find(link=>link.rel==='next')?.uri;
    }
  }
  const {runs,skipped}=convertWorldRuns(records,game);
  // Fail closed when source definitions change, preserving the last complete snapshot.
  if(!runs.length)throw new Error('Source returned no valid Individual Worlds runs');
  if(skipped.length)throw new Error(`Unmapped or invalid runs: ${skipped.join(', ')}`);
  const output={source:'https://www.speedrun.com/yiext',fetchedAt:new Date().toISOString(),category:{id:category.id,name:category.name,rules:category.rules},variables,runs};
  fs.writeFileSync(path.join(__dirname,'../data/individual-worlds.json'),JSON.stringify(output,null,2)+'\n');
  console.log(`Imported ${runs.length} Individual Worlds runs.`);
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={convertWorldRuns};

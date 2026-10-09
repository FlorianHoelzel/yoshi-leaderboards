// Leaderboard queries. Inputs are explicit so this layer does not depend on the UI.
const runPlatform=run=>run.platform==='VC'?'vc':'snes';
function rankedRuns(runs,category,region='all',platform='snes'){
  const sorted=runs.filter(r=>r.category===category&&runPlatform(r)===platform&&r.status==='verified'&&(region==='all'||r.region===region)).sort((a,b)=>a.timeMs-b.timeMs||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const seen=new Set();let previous=null,rank=0;
  return sorted.filter(r=>{if(seen.has(r.runner))return false;seen.add(r.runner);return true;}).map((r,i)=>{if(r.timeMs!==previous)rank=i+1;previous=r.timeMs;return {...r,rank};});
}
function runStats(runs,levelBoardDefinitions){
  const verified=runs.filter(run=>run.status==='verified');
  const levelSlugs=new Set(levelBoardDefinitions.map(board=>board.slug));
  const levelRuns=verified.filter(run=>levelSlugs.has(run.category)).length;
  return {total:verified.length,fullGame:verified.length-levelRuns,levels:levelRuns,players:new Set(verified.map(run=>run.runner)).size,timeMs:verified.reduce((sum,run)=>sum+run.timeMs,0)};
}
function worldRecordProgression(category,runs,platform='snes'){
  // Dates have day precision: use the fastest verified run for each day.
  const chronological=runs.filter(run=>run.status==='verified'&&run.category===category&&runPlatform(run)===platform&&/^\d{4}-\d{2}-\d{2}$/.test(run.date)).sort((a,b)=>a.date.localeCompare(b.date)||a.timeMs-b.timeMs||a.id.localeCompare(b.id));
  let record=Infinity;
  return chronological.filter(run=>{if(run.timeMs>=record)return false;record=run.timeMs;return true;});
}
function profileProgression(runs,category,platform){
  const dated=runs.filter(run=>run.category===category&&runPlatform(run)===platform&&run.date).sort((a,b)=>a.date.localeCompare(b.date)||a.timeMs-b.timeMs||a.id.localeCompare(b.id));
  let best=Infinity;
  return dated.filter(run=>{if(run.timeMs>=best)return false;best=run.timeMs;return true;});
}

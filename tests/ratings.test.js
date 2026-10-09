const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
for(const file of ['runs','ratings'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/assets/js/domain',file+'.js'),'utf8'),context);
const boards=[{slug:'full'},{slug:'second'},{slug:'level',level:'1-1'}];
const run=(runner,timeMs,category='full',platform='SNES',status='verified')=>({id:runner+'-'+category+'-'+platform+'-'+timeMs,runner,timeMs,category,platform,status,date:'2026-01-01'});
function ratings(runs,definitions=boards,cached=false){
  context.runs=runs;context.definitions=definitions;
  return JSON.parse(vm.runInContext(`JSON.stringify(${cached?'cachedOverallRatings':'overallRatings'}(runs,definitions))`,context));
}
const byName=entries=>Object.fromEntries(entries.map(entry=>[entry.name,entry]));

test('one finite overall rating combines full game, levels and VC without ordering dependence',()=>{
  const runs=[run('Fern',1000),run('Birch',2000),run('Fern',100,'level'),run('Birch',200,'level'),run('Fern',3000,'second','VC'),run('Birch',4000,'second','VC')];
  const result=ratings(runs);
  assert.equal(result.length,2);
  assert.ok(result[0].rating>1500);assert.ok(result[1].rating<1500);
  assert.equal(result[0].pbs,3);assert.equal(result[0].comparedBoards,3);
  assert.deepEqual(result,ratings([...runs].reverse(),[...boards].reverse()));
  assert.ok(result.every(entry=>Number.isFinite(entry.rating)&&entry.status==='Provisional'));
});

test('ties share ratings and competition ranks; no opponents means unrated',()=>{
  const result=byName(ratings([run('Fern',1000),run('Birch',1000),run('Cedar',2000),run('Solo',100,'level')]));
  assert.equal(result.Fern.rating,result.Birch.rating);
  assert.equal(result.Fern.rank,1);assert.equal(result.Birch.rank,1);assert.equal(result.Cedar.rank,3);
  assert.equal(result.Solo.rating,null);assert.equal(result.Solo.status,'Unrated');
  assert.deepEqual(ratings([]),[]);
  assert.equal(ratings([run('Fern',1000),run('Birch',1000)])[0].rating,1500);
});

test('only verified PBs matter and SNES/emulator compare while VC stays separate',()=>{
  const runs=[run('Fern',1000),run('Birch',2000,'full','Emulator')];
  const original=ratings(runs);
  assert.deepEqual(ratings([...runs,run('Fern',3000),run('Pending',1,'full','SNES','pending'),run('Rejected',1,'full','SNES','rejected'),run('Unknown',1,'missing')]),original);
  const separate=byName(ratings([run('Fern',1000),run('Birch',2000,'full','VC')]));
  assert.equal(separate.Fern.rating,null);assert.equal(separate.Birch.rating,null);
  assert.deepEqual(ratings([...runs,runs[0]]),original);
});

test('PB improvements and moderation corrections invalidate the cached snapshot',()=>{
  const runs=[run('Fern',2000),run('Birch',1000)];
  const before=byName(ratings(runs,boards,true));
  const improved=byName(ratings([...runs,run('Fern',500)],boards,true));
  assert.ok(improved.Fern.rating>before.Fern.rating);
  assert.ok(improved.Birch.rating<before.Birch.rating);
  assert.deepEqual(ratings(runs,boards,true),ratings(runs));
  runs[0].status='rejected';
  assert.equal(ratings(runs,boards,true)[0].rating,null);
});

test('beating a stronger connected opponent yields higher fitted strength at equal board weights',()=>{
  const result=byName(ratings([
    run('Strong',1000),run('Middle',2000),run('Weak',3000),
    run('Challenger',1000,'second'),run('Strong',2000,'second'),
    run('Other',1000,'third'),run('Weak',2000,'third'),
  ],[{slug:'full'},{slug:'second'},{slug:'third'}]));
  // Strong sparse-field limits can round these scores to the same integer.
  assert.ok(result.Challenger.strength>result.Other.strength);
  assert.equal(result.Challenger.group,result.Other.group);
});

test('repeating level boards does not multiply the level evidence budget',()=>{
  const runs=[run('Fern',1000),run('Birch',2000),run('Birch',100,'level'),run('Fern',200,'level')];
  const original=ratings(runs);
  const expanded=[...boards,...Array.from({length:20},(_,i)=>({slug:'level-'+i,level:'1-1'}))];
  const copies=expanded.filter(board=>board.slug.startsWith('level-')).flatMap(board=>[run('Birch',100,board.slug),run('Fern',200,board.slug)]);
  const repeated=ratings([...runs,...copies],expanded);
  // The opponent fit retains its normalized level budget. Aggregated category
  // rewards can shrink under diminishing returns, but must not multiply.
  const initial=byName(original);
  repeated.forEach(entry=>assert.ok(Math.abs(entry.strength-initial[entry.name].strength)<1e-9));
  assert.ok(Math.max(...repeated.map(entry=>entry.rating))<=Math.max(...original.map(entry=>entry.rating)));
});

test('strongest highlight uses weighted PB evidence; latest uses verified run dates including slower history',()=>{
  const runs=[
    run('Fern',1000),run('Birch',2000),
    run('Fern',200,'level'),run('Birch',100,'level'),
    {...run('Fern',3000),date:'2026-03-01'},
    {...run('Fern',1,'full','SNES','pending'),date:'2026-04-01'},
  ];
  context.runs=runs;context.definitions=boards;
  const result=JSON.parse(vm.runInContext('JSON.stringify(overallRatingHighlights(runs,definitions,overallRatings(runs,definitions)))',context));
  const fern=result.find(entry=>entry.name==='Fern');
  assert.equal(fern.strongestRun.category,'full');
  assert.equal(fern.strongestRun.timeMs,1000);assert.equal(fern.strongestRun.rank,1);
  assert.equal(fern.latestRun.timeMs,3000);assert.equal(fern.latestRun.date,'2026-03-01');
  assert.ok(fern.strongestContribution>0);
  assert.ok(fern.strongestPoints>0);
  assert.equal(fern.latestPoints,0);
  assert.ok(fern.pbContributions.some(pb=>pb.points<0));
  for(const entry of result){
    const total=entry.pbContributions.reduce((sum,pb)=>sum+pb.points,0);
    const rawTotal=entry.pbContributions.reduce((sum,pb)=>sum+pb.rawPoints,0);
    assert.ok(Math.abs(rawTotal-entry.strength*400/Math.LN10)<1e-4);
    assert.equal(total,entry.totalPoints);
    assert.equal(Math.round(1500+total),entry.rating);
  }
  runs[0].date='2026-05-01';
  const updated=JSON.parse(vm.runInContext('JSON.stringify(overallRatingHighlights(runs,definitions,overallRatings(runs,definitions)))',context)).find(entry=>entry.name==='Fern');
  assert.equal(updated.latestRun.id,updated.strongestRun.id);
  assert.equal(updated.latestPoints,updated.strongestPoints);
  assert.equal(updated.latestRun.rank,updated.strongestRun.rank);
});

test('small fields reduce run contributions without renormalizing away the penalty',()=>{
  // Hold estimates fixed to isolate field size, placement and exposure weights.
  context.runs=[run('Fern',1000),run('Birch',2000)];context.definitions=[{slug:'full'}];
  const points=vm.runInContext(`overallRatingHighlights(runs,definitions,[
    {name:'Fern',strength:0,rating:1500},{name:'Birch',strength:0,rating:1500}
  ])[0].strongestPoints`,context);
  const smallLimit=20000/2501;
  const placement=(1+1/Math.sqrt(2))/2;
  const smallExposure=smallLimit/(400/Math.LN10)*0.05*placement;
  assert.ok(Math.abs(points-0.5*smallLimit*placement/Math.sqrt(1+smallExposure))<1e-9);
  context.runs=[run('Fern',1000),...Array.from({length:10},(_,i)=>run('Opponent '+i,2000+i))];
  const larger=vm.runInContext(`overallRatingHighlights(runs,definitions,runs.map(run=>({name:run.runner,strength:0,rating:1500})))[0].strongestPoints`,context);
  assert.ok(larger>points);
});

test('SNES/emulator and VC share one category budget, without merging time boards',()=>{
  const single=[run('Fern',1000),run('Birch',2000),run('Fern',1000,'second'),run('Birch',2000,'second')];
  const original=ratings(single);
  const both=[...single,run('Fern',1000,'full','VC'),run('Birch',2000,'full','VC')];
  // Identical evidence on a second platform must not raise the overall rating.
  assert.deepEqual(ratings(both).map(entry=>[entry.name,entry.rating]),original.map(entry=>[entry.name,entry.rating]));
  context.runs=both;context.definitions=boards;
  const result=JSON.parse(vm.runInContext('JSON.stringify(overallRatingHighlights(runs,definitions,overallRatings(runs,definitions)))',context));
  const fern=result.find(entry=>entry.name==='Fern');
  const full=fern.pbContributions.filter(pb=>pb.runId.includes('-full-'));
  const second=fern.pbContributions.find(pb=>pb.runId.includes('-second-'));
  assert.equal(full.length,2);assert.ok(full.every(pb=>pb.points>0));
  assert.ok(Math.abs(full.reduce((sum,pb)=>sum+pb.rawPoints,0)-second.rawPoints)<1e-9);
  assert.equal(fern.pbs,3);
  assert.equal(Math.round(1500+fern.totalPoints),fern.rating);
});

test('each comparison has shared influence and scores match fitted strengths',()=>{
  const runs=[run('Fern',1000),run('Birch',2000),run('Fern',1000,'second'),run('Birch',2000,'second'),run('Fern',100,'level'),run('Birch',200,'level')];
  context.runs=runs;context.definitions=boards;
  const result=JSON.parse(vm.runInContext('JSON.stringify(overallRatingHighlights(runs,definitions,overallRatings(runs,definitions)))',context));
  const fern=result.find(entry=>entry.name==='Fern');
  const birch=result.find(entry=>entry.name==='Birch');
  assert.ok(birch.pbContributions.every(pb=>pb.points<0));
  assert.ok(Math.abs(fern.totalPoints+birch.totalPoints)<1e-9);
  result.forEach(entry=>{
    assert.equal(entry.rating,Math.round(1500+entry.totalPoints));
    assert.ok(Math.abs(entry.totalPoints-entry.strength*400/Math.LN10)<1e-4);
  });
  // More total evidence decreases the multiplier equally in either direction.
  context.low=new Map([['Fern',1],['Birch',1]]);context.high=new Map([['Fern',4],['Birch',4]]);
  assert.ok(vm.runInContext("overallPairWeight(1,'Fern','Birch',high,1,2)<overallPairWeight(1,'Fern','Birch',low,1,2)",context));
  assert.equal(vm.runInContext("overallPairWeight(1,'Fern','Birch',low,1,2)",context),vm.runInContext("overallPairWeight(1,'Birch','Fern',low,2,1)",context));
});

test('placement weighting distinguishes elite finishes and treats tied ranks equally',()=>{
  const weight=(a,b)=>vm.runInContext(`overallPlacementWeight(${a},${b})`,context);
  assert.equal(weight(1,1),1);
  assert.equal(weight(4,4),0.5);
  assert.equal(weight(25,25),0.2);
  assert.ok(weight(1,100)>weight(6,100)*2);
  assert.equal(weight(1,25),weight(25,1));
  assert.ok(weight(25,100)<weight(6,100));
});

test('two WRs in deep fields outrank several moderate placements on the imported snapshot', {skip:!fs.existsSync(path.join(__dirname,'../data/mock-runs.json'))},()=>{
  const input=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/mock-runs.json'),'utf8')).runs;
  for(const file of ['levels','catalog'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/assets/js/domain',file+'.js'),'utf8'),context);
  context.snapshot=input;
  const result=JSON.parse(vm.runInContext('JSON.stringify(overallRatingHighlights(snapshot,boards,cachedOverallRatings(snapshot,boards)))',context));
  const specialist=result.find(entry=>entry.name==='Calco2'), broader=result.find(entry=>entry.name==='aboo_oxo');
  assert.ok(specialist.rating>broader.rating);assert.ok(specialist.rank<broader.rank);
  const broadStrong=result.find(entry=>entry.name==='mt');
  const moderate=result.find(entry=>entry.name==='andykuma');
  assert.ok(specialist.rating>broadStrong.rating);
  assert.ok(broadStrong.rating>moderate.rating);
  assert.ok(broadStrong.rating>broader.rating);assert.ok(broadStrong.rank<broader.rank);
  const noAce=broadStrong.pbContributions.find(pb=>pb.category==='no-ace');
  const warps=broadStrong.pbContributions.find(pb=>pb.category==='warps');
  assert.ok(noAce.points<0&&Math.abs(noAce.points)<40);
  assert.ok(warps.points>Math.abs(noAce.points));
  const specialistWr=specialist.pbContributions.find(pb=>pb.category==='warpless');
  const broadWarpless=broadStrong.pbContributions.find(pb=>pb.category==='warpless');
  assert.ok(specialistWr.points>broadWarpless.points*1.5);
  for(const entry of result)if(entry.rating!==null){
    assert.equal(entry.rating,Math.round(1500+entry.pbContributions.reduce((sum,pb)=>sum+pb.points,0)));
    assert.ok(Math.abs(entry.totalPoints-entry.strength*400/Math.LN10)<1e-4);
    assert.ok(entry.pbContributions.every(pb=>Math.abs(pb.points)<=pb.pointLimit+1e-8));
  }
});

test('field-dependent limits are symmetric and tighter for sparse categories',()=>{
  const limits=[2,5,11,60,120,242].map(n=>vm.runInContext(`overallBoardPointLimit(${n},8)`,context));
  limits.slice(1).forEach((limit,i)=>assert.ok(limit>limits[i]));
  assert.ok(limits.every(limit=>limit<20000/8));
  assert.ok(limits[2]<limits[4]/10);
  // Stress opposing outcomes with fixed extreme strengths, independently of fit.
  context.runs=[run('Fern',1000),run('Birch',2000)];context.definitions=[{slug:'full'}];
  const result=JSON.parse(vm.runInContext(`JSON.stringify(overallRatingHighlights(runs,definitions,[
    {name:'Fern',strength:-100,rating:1500},{name:'Birch',strength:100,rating:1500}
  ]))`,context));
  assert.ok(result[0].strongestPoints>0);assert.ok(result[1].strongestPoints<0);
  assert.ok(Math.abs(result[0].strongestPoints+result[1].strongestPoints)<1e-9);
  result.forEach(entry=>assert.ok(Math.abs(entry.strongestPoints)<=entry.pbContributions[0].pointLimit));
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const domain=path.join(__dirname,'../public/assets/js/domain');
function model(){
  const context=vm.createContext({Math});
  for(const file of ['runs','ratings','recommendations'])vm.runInContext(fs.readFileSync(path.join(domain,file+'.js'),'utf8'),context);
  return context;
}
const run=(runner,timeMs,category='full',platform='SNES',status='verified')=>({id:`${runner}-${category}-${platform}-${timeMs}`,runner,timeMs,category,platform,status,date:''});
const read=(context,source)=>JSON.parse(vm.runInContext(`JSON.stringify(${source})`,context));

test('targets beat distinct times and tied groups by one integer millisecond',()=>{
  const context=model();context.definitions=[{slug:'full'}];
  context.runs=[run('Fern',5000),run('Birch',4000),run('Cedar',4000),run('Pine',2000),run('Pending',1,'full','SNES','pending')];
  const targets=read(context,"overallRecommendationCandidates(runs,definitions,'Fern')");
  assert.equal(targets.length,1);assert.equal(targets[0].timeMs,3999);assert.equal(targets[0].targetBoardRank,2);
  context.runs=[run('Fern',1),run('Birch',1)];
  assert.deepEqual(read(context,"overallRecommendationCandidates(runs,definitions,'Fern')"),[]);
});

test('long-run targets use whole seconds strictly faster than the selected time',()=>{
  const context=model();context.definitions=[{slug:'full'}];
  context.runs=[run('Fern',200000),run('Birch',164400),run('Cedar',164100),run('Pine',164000)];
  const candidates=read(context,"overallRecommendationCandidates(runs,definitions,'Fern')");
  assert.ok(candidates.length);
  for(const item of candidates){
    assert.equal(item.timeMs%1000,0);assert.ok(item.timeMs<200000);
    context.candidate=item;
    const pb=read(context,"rankedRuns(overallRecommendationScenario(runs,'Fern',candidate),'full').find(run=>run.runner==='Fern')");
    assert.equal(pb.rank,item.targetBoardRank);
  }
});

test('new boards require comparable personal evidence and respect type and platform filters',()=>{
  const context=model();context.definitions=[{slug:'first'},{slug:'second'},{slug:'new'},{slug:'level',level:'1-1'}];
  context.runs=[run('Fern',2000,'first'),run('Birch',1000,'first'),run('Cedar',3000,'first'),
    run('Fern',2000,'second','Emulator'),run('Birch',1000,'second'),run('Cedar',3000,'second'),
    run('Birch',1000,'new'),run('Cedar',2000,'new'),run('Pine',3000,'new'),
    run('Birch',1000,'new','VC'),run('Cedar',2000,'new','VC'),
    run('Birch',100,'level'),run('Cedar',200,'level')];
  const targets=read(context,"overallRecommendationCandidates(runs,definitions,'Fern',{type:'full',platform:'snes'})");
  const newBoard=targets.find(item=>item.category==='new');
  assert.equal(newBoard.targetType,'new');assert.equal(newBoard.targetBoardRank,2);assert.equal(newBoard.timeMs,1999);
  assert.ok(targets.every(item=>!item.level&&item.platform==='snes'));
  assert.deepEqual(read(context,"overallRecommendationCandidates(runs,definitions,'Fern',{type:'levels'})"),[]);
  assert.deepEqual(read(context,"overallRecommendationCandidates(runs,definitions,'Fern',{platform:'vc'})"),[]);
});

test('recommendations independently refit the whole community without changing runs or rating cache',()=>{
  const context=model();context.definitions=[{slug:'full'},{slug:'second'}];
  context.runs=[run('Fern',3000),run('Birch',2000),run('Cedar',1000),run('Fern',3000,'second'),run('Birch',2000,'second'),run('Cedar',1000,'second')];
  const before=JSON.stringify(context.runs),cached=read(context,'cachedOverallRatings(runs,definitions)');
  const result=read(context,"overallRunRecommendations(runs,definitions,'Fern')");
  assert.equal(result.recommendations.length,2);
  for(const item of result.recommendations){
    context.candidate=item;
    const simulated=read(context,"overallRatings(overallRecommendationScenario(runs,'Fern',candidate),definitions)");
    const fern=simulated.find(entry=>entry.name==='Fern');
    assert.equal(item.estimatedRating,fern.rating);assert.equal(item.estimatedRank,fern.rank);
    assert.equal(item.gain,fern.rating-result.baseline.rating);assert.ok(item.gain>0);
    const pb=read(context,"rankedRuns(overallRecommendationScenario(runs,'Fern',candidate),candidate.category,'all',candidate.platform).find(run=>run.runner==='Fern')");
    assert.equal(pb.rank,item.targetBoardRank);
    assert.notDeepEqual(simulated.filter(entry=>entry.name!=='Fern'),cached.filter(entry=>entry.name!=='Fern'));
  }
  assert.equal(JSON.stringify(context.runs),before);
  assert.deepEqual(read(context,'cachedOverallRatings(runs,definitions)'),cached);
  assert.deepEqual(read(context,"overallRunRecommendations([],definitions,'Absent').recommendations"),[]);
  context.runs=[run('Solo',1000)];
  assert.deepEqual(read(context,"overallRunRecommendations(runs,definitions,'Solo').recommendations"),[]);
});

test('worker loads packaged dependencies and sends progress, results and failures',()=>{
  const context=model(),messages=[];
  context.self={postMessage:message=>messages.push(JSON.parse(JSON.stringify(message)))};
  // Match browser importScripts in a fresh worker global.
  const workerContext=vm.createContext({Math,self:context.self});
  workerContext.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.join(domain,file),'utf8'),workerContext));
  vm.runInContext(fs.readFileSync(path.join(domain,'recommendations-worker.js'),'utf8'),workerContext);
  workerContext.self.onmessage({data:{name:'Fern',runs:[run('Fern',2000),run('Birch',1000)],boards:[{slug:'full'}],options:{}}});
  assert.ok(messages.some(message=>message.type==='progress'));
  assert.equal(messages.at(-1).type,'result');assert.ok(messages.at(-1).result.recommendations.length);
  workerContext.self.onmessage({data:{}});
  assert.deepEqual(messages.at(-1),{type:'error'});
});

test('Volpey full-game recommendations match separate global recalculations', {skip:!fs.existsSync(path.join(__dirname,'../data/mock-runs.json'))},()=>{
  const context=model();
  for(const file of ['levels','catalog'])vm.runInContext(fs.readFileSync(path.join(domain,file+'.js'),'utf8'),context);
  context.runs=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/mock-runs.json'),'utf8')).runs;
  const before=JSON.stringify(context.runs);
  const result=read(context,"overallRunRecommendations(runs,boards,'Volpey',{type:'full',platform:'snes'})");
  assert.equal(result.baseline.rating,1541);assert.equal(result.baseline.rank,53);
  assert.ok(result.recommendations.some(item=>item.currentTimeMs===null));
  assert.ok(result.recommendations.some(item=>item.currentTimeMs!==null));
  assert.ok(result.recommendations.length<=5);
  assert.equal(new Set(result.recommendations.map(item=>item.category+'/'+item.platform)).size,result.recommendations.length);
  for(const item of result.recommendations){
    context.candidate=item;
    const entry=read(context,"overallRatings(overallRecommendationScenario(runs,'Volpey',candidate),boards).find(entry=>entry.name==='Volpey')");
    assert.equal(item.estimatedRating,entry.rating);assert.equal(item.estimatedRank,entry.rank);
    assert.ok(item.estimatedRank<result.baseline.rank);assert.ok(Number.isInteger(item.timeMs)&&item.timeMs>0);
  }
  assert.equal(JSON.stringify(context.runs),before);
});

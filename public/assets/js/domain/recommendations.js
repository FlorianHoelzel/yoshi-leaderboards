// Planning targets only: every scenario changes one verified PB independently.
function overallRecommendationCandidates(runs,definitions,name,options={}) {
  const snapshots=definitions.flatMap(board=>['snes','vc'].map(platform=>({board,platform,pbs:rankedRuns(runs,board.slug,'all',platform)})));
  const placements=new Map();
  for(const {board,platform,pbs} of snapshots){
    const own=pbs.find(run=>run.runner===name);
    if(!own||pbs.length<2)continue;
    const key=`${board.level?'levels':'full'}/${platform}`;
    if(!placements.has(key))placements.set(key,[]);
    placements.get(key).push((own.rank-1)/(pbs.length-1));
  }
  const candidates=[];
  for(const {board,platform,pbs} of snapshots){
    if(options.type&&options.type!=='all'&&Boolean(board.level)!==(options.type==='levels'))continue;
    if(options.platform&&options.platform!=='all'&&options.platform!==platform)continue;
    const own=pbs.find(run=>run.runner===name),opponents=pbs.filter(run=>run.runner!==name);
    if(!opponents.length)continue;
    let targets;
    if(own){
      // Next distinct time, plus a modest stretch of 20% of the current rank.
      const faster=opponents.filter(run=>run.timeMs<=own.timeMs);
      if(!faster.length)continue;
      const next=faster.at(-1);
      const desired=Math.max(1,own.rank-Math.max(1,Math.ceil(own.rank*0.2)));
      const stretch=faster[Math.min(desired-1,faster.length-1)];
      targets=[{opponent:next,targetType:'next'},{opponent:stretch,targetType:'stretch'}];
    }else{
      // Do not transfer a full-game percentile to levels, or across platforms.
      const history=placements.get(`${board.level?'levels':'full'}/${platform}`);
      if(!history||history.length<2||opponents.length<2)continue;
      const sorted=[...history].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
      const percentile=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
      targets=[{opponent:opponents[Math.min(opponents.length-1,Math.floor(percentile*opponents.length))],targetType:'new'}];
    }
    const seen=new Set();
    for(const {opponent,targetType} of targets){
      // Use whole-second goals for longer runs, strictly below the opponent.
      // Short level targets retain millisecond precision, including tied groups.
      const timeMs=opponent.timeMs>=60000?Math.ceil(opponent.timeMs/1000)*1000-1000:opponent.timeMs-1;
      if(timeMs<1||seen.has(timeMs)||own&&timeMs>=own.timeMs)continue;
      seen.add(timeMs);
      candidates.push({category:board.slug,platform,level:Boolean(board.level),targetType,timeMs,
        currentTimeMs:own?.timeMs??null,currentBoardRank:own?.rank??null,
        targetBoardRank:1+opponents.filter(run=>run.timeMs<timeMs).length,
        fieldSize:opponents.length+1});
    }
  }
  return candidates;
}

function overallRecommendationScenario(runs,name,candidate) {
  // Replace that board's history in the temporary snapshot. Never persist it.
  return [...runs.filter(run=>!(run.runner===name&&run.category===candidate.category&&runPlatform(run)===candidate.platform)),
    {id:'elo-recommendation',runner:name,category:candidate.category,
      platform:candidate.platform==='vc'?'VC':'SNES',timeMs:candidate.timeMs,date:'',status:'verified'}];
}

function overallRunRecommendations(runs,definitions,name,options={},onProgress=()=>{}) {
  const baselineRatings=overallRatings(runs,definitions);
  const baseline=baselineRatings.find(entry=>entry.name===name);
  if(!baseline||baseline.rating===null)return {baseline:baseline||null,recommendations:[],tested:0};
  const candidates=overallRecommendationCandidates(runs,definitions,name,options),best=new Map();
  candidates.forEach((candidate,index)=>{
    // Refit all opponents and re-rank the whole community for each scenario.
    const simulated=overallRatings(overallRecommendationScenario(runs,name,candidate),definitions,baselineRatings).find(entry=>entry.name===name);
    const gain=simulated.rating-baseline.rating;
    if(gain>0){
      const result={...candidate,estimatedRating:simulated.rating,estimatedRank:simulated.rank,gain};
      const key=`${candidate.category}/${candidate.platform}`,previous=best.get(key);
      if(!previous||gain>previous.gain||gain===previous.gain&&candidate.timeMs>previous.timeMs)best.set(key,result);
    }
    onProgress(index+1,candidates.length);
  });
  const recommendations=[...best.values()].sort((a,b)=>b.gain-a.gain||a.estimatedRank-b.estimatedRank||a.category.localeCompare(b.category)||a.platform.localeCompare(b.platform)).slice(0,5);
  return {baseline,recommendations,tested:candidates.length};
}

// Snapshot Elo-style rating with placement and diminishing evidence weights.
// Scores share one pool across all categories and platform boards.
const overallEloVersion = 'pb-elo-v7';
const overallEloPrior = 0.05;
const overallEloScale = 400 / Math.LN10;
const overallEloFieldPrior = 5;
const overallEloInfluenceBudget = 20000;
const overallEloInfluenceField = 50;
function overallBoardPointLimit(runners, budgetDivisor) {
  const opponents=runners-1;
  return overallEloInfluenceBudget/budgetDivisor * opponents**2/(opponents**2+overallEloInfluenceField**2);
}
function overallBoardWeight(runners, budgetDivisor) {
  // Small-field suppression with logarithmic competitive depth. Category and
  // platform budget division still prevents quadratic field-size growth.
  const opponents=runners-1;
  const depthWeight=Math.log2(runners)/((opponents+overallEloFieldPrior)*budgetDivisor);
  // Bound the largest possible signed PB contribution before exposure reduction.
  // Since |actual - expected| <= 1, this bound holds for both wins and losses.
  const boundedWeight=overallBoardPointLimit(runners,budgetDivisor)*overallEloPrior/(overallEloScale*opponents);
  return Math.min(depthWeight,boundedWeight);
}
function overallCategoryBudgets(pbsLists) {
  // Each category gets one share of its board-type budget. Comparable platform
  // boards split that share, rather than each receiving a separate full share.
  const platforms=new Map();
  for(const pbs of pbsLists){const category=pbs[0].category;platforms.set(category,(platforms.get(category)||0)+1);}
  return pbsLists.map(pbs=>({pbs,budgetDivisor:platforms.size*platforms.get(pbs[0].category)}));
}
function overallComparisonModel(groups) {
  const boards=Object.values(groups).flatMap(group=>overallCategoryBudgets(group).map(({pbs,budgetDivisor})=>({pbs,weight:overallBoardWeight(pbs.length,budgetDivisor),pointLimit:overallBoardPointLimit(pbs.length,budgetDivisor)})));
  const exposure=new Map();
  for(const {pbs,weight} of boards)for(const run of pbs){
    let evidence=0;
    for(const opponent of pbs)if(opponent.runner!==run.runner)evidence+=weight*overallPlacementWeight(run.rank,opponent.rank);
    exposure.set(run.runner,(exposure.get(run.runner)||0)+evidence);
  }
  return {boards,exposure};
}
function overallPlacementWeight(rankA,rankB) {
  // Absolute board rank distinguishes a WR from a high percentile in a large
  // field. Sharing the factor preserves equal influence for both opponents.
  return (1/Math.sqrt(rankA)+1/Math.sqrt(rankB))/2;
}
function overallPairWeight(weight,a,b,exposure,rankA,rankB) {
  // Top placements carry more evidence; additional evidence grows sublinearly.
  // Both sides of each comparison use exactly the same weight.
  return weight*overallPlacementWeight(rankA,rankB)/Math.sqrt(1+(exposure.get(a)+exposure.get(b))/2);
}
function overallRatings(runs, boardDefinitions, initialRatings=[]) {
  const groups = {full: [], levels: []};
  const people = new Map();
  for (const board of [...boardDefinitions].sort((a,b)=>a.slug.localeCompare(b.slug))) {
    for (const platform of ['snes', 'vc']) {
      const pbs = rankedRuns(runs, board.slug, 'all', platform);
      for (const run of pbs) {
        if (!people.has(run.runner)) people.set(run.runner, {name:run.runner, pbs:0, comparedBoards:0, opponents:new Set()});
        people.get(run.runner).pbs++;
      }
      if (pbs.length > 1) groups[board.level ? 'levels' : 'full'].push(pbs);
    }
  }
  const entries = [...people.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const indices = new Map(entries.map((entry,index)=>[entry.name,index]));
  const edges = [], degree = entries.map(()=>0);
  const model=overallComparisonModel(groups);
  for(const {pbs,weight:boardWeight} of model.boards){
    for(const run of pbs)people.get(run.runner).comparedBoards++;
    for(let i=0;i<pbs.length;i++)for(let j=i+1;j<pbs.length;j++){
      const a=indices.get(pbs[i].runner),b=indices.get(pbs[j].runner);
      const weight=overallPairWeight(boardWeight,pbs[i].runner,pbs[j].runner,model.exposure,pbs[i].rank,pbs[j].rank);
      edges.push({a,b,weight,score:pbs[i].timeMs===pbs[j].timeMs?0.5:1});
      degree[a]+=weight;degree[b]+=weight;
      entries[a].opponents.add(b);entries[b].opponents.add(a);
    }
  }
  // L2 prior around 1500 prevents divergence for undefeated runners and
  // anchors disconnected fields. All updates use the same previous snapshot.
  const prior=overallEloPrior, step=1/(prior+Math.max(0,...degree)/2);
  // Simulations can reuse a converged snapshot as a starting point. The same
  // objective, tolerance and global refit still determine the final strengths.
  const initialStrengths=new Map(initialRatings.map(entry=>[entry.name,entry.strength]));
  let strengths=entries.map(entry=>initialStrengths.get(entry.name)||0);
  for (let iteration=0; iteration<1000; iteration++) {
    const gradient=strengths.map(value=>prior*value);
    for (const {a,b,weight,score} of edges) {
      const error=weight*(1/(1+Math.exp(strengths[b]-strengths[a]))-score);
      gradient[a]+=error;gradient[b]-=error;
    }
    const next=strengths.map((value,i)=>value-step*gradient[i]);
    const change=next.reduce((max,value,i)=>Math.max(max,Math.abs(value-strengths[i])),0);
    strengths=next;
    if (change<1e-9) break;
  }
  // Expose disconnected comparison groups; cross-group ordering is uncertain.
  const components=new Map();
  for (let i=0; i<entries.length; i++) {
    if (components.has(i)) continue;
    const pending=[i], members=[];
    components.set(i,i);
    while (pending.length) {
      const member=pending.pop();members.push(member);
      for (const opponent of entries[member].opponents) if (!components.has(opponent)) {
        components.set(opponent,i);pending.push(opponent);
      }
    }
    for (const member of members) entries[member].groupSize=members.length;
  }
  const rated=entries.map((entry,i)=>({name:entry.name,
    rating:degree[i] ? Math.round(1500+strengths[i]*overallEloScale) : null,
    strength:strengths[i],
    pbs:entry.pbs, comparedBoards:entry.comparedBoards, opponents:entry.opponents.size,
    status:!degree[i] ? 'Unrated' : entry.comparedBoards<3 || entry.opponents.size<5 ? 'Provisional' : 'Established',
    group:components.get(i)+1, groupSize:entry.groupSize, rank:null,
  }));
  rated.sort((a,b)=>(b.rating??-Infinity)-(a.rating??-Infinity)||a.name.localeCompare(b.name));
  let previous=null, rank=0;
  rated.forEach((entry,i)=>{if(entry.rating===null)return;if(entry.rating!==previous)rank=i+1;entry.rank=rank;previous=entry.rating;});
  return rated;
}

// Cache only the effective PB snapshot. Names, statuses, times, category and
// platform changes still invalidate it; slower historical runs do not.
let overallRatingCache={key:null,entries:[]};
function cachedOverallRatings(runs, boardDefinitions) {
  const pbs=boardDefinitions.flatMap(board=>['snes','vc'].flatMap(platform=>
    rankedRuns(runs,board.slug,'all',platform).map(run=>[board.slug,Boolean(board.level),platform,run.runner,run.timeMs])));
  const key=JSON.stringify([overallEloVersion,pbs]);
  if(key!==overallRatingCache.key) overallRatingCache={key,entries:overallRatings(runs,boardDefinitions)};
  return overallRatingCache.entries;
}

// Strongest PB = largest signed contribution under the fitted comparison weights.
function overallRatingHighlights(runs, boardDefinitions, ratings) {
  const entries=new Map(ratings.map(entry=>[entry.name,{...entry,strongestRun:null,latestRun:null,strongestContribution:null,strongestPoints:0,latestPoints:0,totalPoints:0,pbContributions:[]}]));
  const groups={full:[],levels:[]};
  const validBoards=new Set(boardDefinitions.map(board=>board.slug));
  for(const run of runs){
    if(run.status!=='verified'||!validBoards.has(run.category))continue;
    const entry=entries.get(run.runner);if(!entry)continue;
    if(!entry.latestRun||(run.date||'')>(entry.latestRun.date||'')||((run.date||'')===(entry.latestRun.date||'')&&run.id.localeCompare(entry.latestRun.id)<0))entry.latestRun=run;
  }
  for(const board of [...boardDefinitions].sort((a,b)=>a.slug.localeCompare(b.slug))){
    for(const platform of ['snes','vc']){
      const pbs=rankedRuns(runs,board.slug,'all',platform);
      if(pbs.length>1)groups[board.level?'levels':'full'].push(pbs);
      for(const run of pbs){
        const entry=entries.get(run.runner);
        if(!entry.strongestRun)entry.strongestRun=run;
        if(entry.latestRun?.id===run.id)entry.latestRun=run;
      }
    }
  }
  const model=overallComparisonModel(groups);
  for(const {pbs,weight:boardWeight,pointLimit} of model.boards){
    for(const run of pbs){
      const entry=entries.get(run.runner);
      let contribution=0;
      for(const opponent of pbs){
        if(opponent.runner===run.runner)continue;
        const expected=1/(1+Math.exp(entries.get(opponent.runner).strength-entry.strength));
        const score=run.timeMs===opponent.timeMs?0.5:run.timeMs<opponent.timeMs?1:0;
        const weight=overallPairWeight(boardWeight,run.runner,opponent.runner,model.exposure,run.rank,opponent.rank);
        contribution+=weight*(score-expected);
      }
      // The same signed evidence used in the fit partitions rating minus 1500.
      const points=contribution*overallEloScale/overallEloPrior;
      entry.totalPoints+=points;
      entry.pbContributions.push({runId:run.id,category:run.category,rawPoints:points,points,pointLimit});
      if(entry.latestRun?.id===run.id)entry.latestPoints=points;
      if(entry.strongestContribution===null||contribution>entry.strongestContribution){entry.strongestContribution=contribution;entry.strongestRun=run;entry.strongestPoints=points;}
    }
  }
  return [...entries.values()];
}

/* Visual prototype. Optional mock data is loaded separately from user submissions. */
const boardHref=board=>(board.level?`#levels/${board.world}/${board.level}/${board.mode}`:`#leaderboard/${board.slug}`)+platformQuery();
function groupedCategories(renderCategory,openGroups){return categoryGroups.map(group=>`<details class="category-group" data-group="${group.name}" ${openGroups.has(group.name)?'open':''}><summary class="category-group-label ${state.page==='leaderboard'&&currentCategory().group===group.name?'selected':''}">${group.name}</summary><div class="category-group-items">${group.categories.map(renderCategory).join('')}</div></details>`).join('');}
function categoryOptions(){return categoryGroups.map(group=>{const options=group.categories.map(cat=>`<option value="${cat.slug}" ${cat.slug===state.category?'selected':''}>${cat.label}</option>`).join('');return group.name?`<optgroup label="${group.name}">${options}</optgroup>`:options;}).join('');}
const selectedGroupCategories={};
function categorySelector(cat){
  selectedGroupCategories[cat.group]=cat.slug;
  const group=categoryGroups.find(group=>group.name===cat.group);
  return `<div class="board-header"><div class="category-tabs" role="group" aria-label="Category">${categoryGroups.map(group=>`<button data-category="${selectedGroupCategories[group.name]||group.categories[0].slug}" class="${group.name===cat.group?'active':''}" aria-pressed="${group.name===cat.group}">${group.name||'100%'}</button>`).join('')}</div>${boardActions(cat)}</div><div class="board-filters"><div class="run-type-selector"><span class="filter-label">Run Type</span>${group.name?`<div class="subcategory-tabs" role="group" aria-label="${group.name} subcategories">${group.categories.map(c=>`<button data-category="${c.slug}" class="${c.slug===cat.slug?'active':''}" aria-pressed="${c.slug===cat.slug}">${c.label}</button>`).join('')}</div>`:''}</div>${platformSelector()}</div>`;
}
// Optional, disposable fixture; never persisted with user submissions.
let state={page:'leaderboard',category:categoryGroups[0].categories[0].slug,level:'1-1',levelCategory:'any',region:'all',search:'',statsBoard:'warpless',statsView:'chart',platform:'snes'};
const main=document.querySelector('main');
const modal=document.querySelector('#modal');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const currentCategory=()=>state.page==='levels'?levelBoards.find(board=>board.level===state.level&&board.mode===state.levelCategory):categories.find(c=>c.slug===state.category)||categories[0];
const platformQuery=()=>state.platform==='vc'?'?platform=vc':'';
function platformSelector(){return `<div class="platform-selector"><span>Platform</span><div class="platform-tabs" role="group" aria-label="Platform">${[{value:'snes',label:'SNES'},{value:'vc',label:'VC'}].map(platform=>`<button type="button" data-platform="${platform.value}" aria-pressed="${state.platform===platform.value}"><span>${platform.label}</span></button>`).join('')}</div></div>`;}
function bestRuns(category,region='all',platform=state.platform){return rankedRuns(allRuns(),category,region,platform);}
function speedrunStats(runs=allRuns()){return runStats(runs,levelBoards);}
function recordProgression(category,runs=allRuns(),platform=state.platform){return worldRecordProgression(category,runs,platform);}
function avatar(name,large=false){const runner=runners.find(r=>r.name===name);return `<span class="avatar${large?' large':''}" style="background:${runner?.color||'#e5edda'}">${escapeHtml(name.slice(0,2).toUpperCase())}</span>`;}
function runnerCountry(name,tag='p'){const country=runners.find(r=>r.name===name)?.country;return country?`<${tag} class="runner-location">${escapeHtml(country)}</${tag}>`:'';}
function profileButton(name){return `<button class="runner-button" data-profile="${escapeHtml(name)}" title="${escapeHtml(name)}"><span>${escapeHtml(name)}${runnerCountry(name,'span')}</span></button>`;}
function render(){
  const sectionNames={leaderboard:'Leaderboards',levels:'Individual levels',runners:'Runners',resources:'Resources',stats:'Stats',rules:'Rules & resources','my-runs':'My submissions'};
  const crumbs=[{label:'Yoshi’s Island',href:'#leaderboard'},{label:sectionNames[state.page],href:`#${state.page}`}];
  if(state.page==='levels'){const level=levels.find(level=>level.slug===state.level);crumbs.push({label:`World ${level.world}`,href:`#levels/${level.world}`},{label:`${level.slug}: ${level.name}`});}
  if(state.page==='leaderboard')crumbs.push({label:currentCategory().name});
  document.querySelector('#breadcrumbs').innerHTML=crumbs.map((crumb,index)=>`<li>${index?'<span class="breadcrumb-separator" aria-hidden="true">/</span>':''}${index===crumbs.length-1?`<strong aria-current="page">${escapeHtml(crumb.label)}</strong>`:`<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`}</li>`).join('');
  document.querySelectorAll('[data-page]').forEach(link=>{const active=link.dataset.page===state.page||(link.dataset.page==='leaderboard'&&['levels','rules'].includes(state.page));link.classList.toggle('active',active);active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');});
  const categoryNav=document.querySelector('#category-nav');
  if(!categoryNav.innerHTML)categoryNav.innerHTML=groupedCategories(cat=>`<a href="#leaderboard/${cat.slug}">${cat.label}</a>`,new Set())+levelNavigation(new Set());
  categoryNav.querySelectorAll('summary').forEach(summary=>summary.classList.toggle('selected',summary.parentElement.dataset.group===(state.page==='levels'?'levels':state.page==='leaderboard'?currentCategory().group:null)));
  categoryNav.querySelectorAll('a').forEach(link=>{
    const active=state.page==='leaderboard'&&link.getAttribute('href').split('?')[0]===`#leaderboard/${state.category}`;
    link.classList.toggle('selected',active);
    active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');
    if(link.getAttribute('href').startsWith('#leaderboard/')||link.getAttribute('href')==='#levels'||link.getAttribute('href').startsWith('#levels?'))link.setAttribute('href',link.getAttribute('href').split('?')[0]+platformQuery());
    const world=link.getAttribute('href').match(/^#levels\/(\d+)\//)?.[1];
    if(world)link.setAttribute('href',`#levels/${world}/${world}-1/${state.levelCategory}${platformQuery()}`);
  });
  document.querySelector('#account-button').textContent=saved.viewer?`${saved.viewer}`:'Sign in';
  if(state.page==='home')renderHome();
  else if(state.page==='leaderboard'||state.page==='levels')renderLeaderboard();
  else if(state.page==='runners')renderRunners();
  else if(state.page==='resources')renderResources();
  else if(state.page==='stats')renderStats();
  else if(state.page==='rules')renderRules();
  else renderMyRuns();
}
function levelNavigation(openGroups){
  return `<details class="category-group individual-level-group" data-group="levels" ${openGroups.has('levels')?'open':''}><summary class="category-group-label ${state.page==='levels'?'selected':''}">Individual Levels</summary><div class="category-group-items"><a href="#levels">All levels</a>${Array.from({length:6},(_,i)=>i+1).map(world=>`<a href="#levels/${world}/${world}-1/${state.levelCategory}${platformQuery()}">World ${world}</a>`).join('')}</div></details>`;
}
function leaderboardNavigation(){
  return `<nav class="leaderboard-navigation" aria-label="Leaderboard navigation">${[{page:'leaderboard',label:'Full game',href:`#leaderboard/${state.category}${platformQuery()}`},{page:'levels',label:'Individual levels',href:`#levels/${levels.find(level=>level.slug===state.level).world}/${state.level}/${state.levelCategory}${platformQuery()}`}].map(item=>`<a href="${item.href}" class="${state.page===item.page?'active':''}" ${state.page===item.page?'aria-current="page"':''}>${item.label}</a>`).join('')}</nav>`;
}
function levelSelector(board){
  const level=levels.find(level=>level.slug===board.level);
  return `<div class="board-header"><div class="category-tabs" role="group" aria-label="World">${Array.from({length:6},(_,i)=>i+1).map(world=>`<a href="#levels/${world}/${world}-1/${board.mode}${platformQuery()}" class="${world===board.world?'active':''}" ${world===board.world?'aria-current="true"':''}>World ${world}</a>`).join('')}</div>${boardActions(board)}</div>
  <div class="subcategory-tabs level-tabs" role="group" aria-label="Level">${levels.filter(level=>level.world===board.world).map(level=>`<a href="#levels/${board.world}/${level.slug}/${board.mode}${platformQuery()}" class="${level.slug===board.level?'active':''}" ${level.slug===board.level?'aria-current="true"':''}>${level.slug}</a>`).join('')}</div>
  <div class="level-heading"><h3>${level.slug}: ${escapeHtml(level.name)}</h3></div>
  <div class="board-filters"><div class="run-type-selector"><span class="filter-label">Category</span><div class="subcategory-tabs" role="group" aria-label="Level category">${levelCategories.map(category=>`<a href="#levels/${board.world}/${board.level}/${category.slug}${platformQuery()}" class="${category.slug===board.mode?'active':''}" ${category.slug===board.mode?'aria-current="true"':''}>${category.name}</a>`).join('')}</div></div>${platformSelector()}</div>`;
}
function renderSubmissionBoardFields(){
  const fields=document.querySelector('#submission-board-fields');
  if(document.querySelector('#submission-type').value==='full'){
    fields.innerHTML=`<label class="field">Category<select name="category">${categoryOptions()}</select></label>`;
    return;
  }
  const selected=levels.find(level=>level.slug===state.level);
  fields.innerHTML=`<div class="form-grid"><label class="field">World<select id="submission-world">${Array.from({length:6},(_,i)=>i+1).map(world=>`<option value="${world}" ${world===selected.world?'selected':''}>World ${world}</option>`).join('')}</select></label><label class="field">Category<select id="submission-mode">${levelCategories.map(category=>`<option value="${category.slug}" ${category.slug===state.levelCategory?'selected':''}>${category.name}</option>`).join('')}</select></label><label class="field full">Level<select id="submission-level"></select></label><input type="hidden" name="category" id="submission-category"></div>`;
  const updateCategory=()=>{document.querySelector('#submission-category').value=`il-${document.querySelector('#submission-level').value}-${document.querySelector('#submission-mode').value}`;};
  const updateLevels=()=>{
    const world=Number(document.querySelector('#submission-world').value);
    document.querySelector('#submission-level').innerHTML=levels.filter(level=>level.world===world).map(level=>`<option value="${level.slug}" ${level.slug===selected.slug?'selected':''}>${level.slug}: ${escapeHtml(level.name)}</option>`).join('');
    updateCategory();
  };
  document.querySelector('#submission-world').addEventListener('change',updateLevels);
  document.querySelector('#submission-level').addEventListener('change',updateCategory);
  document.querySelector('#submission-mode').addEventListener('change',updateCategory);
  updateLevels();
}
function renderLeaderboard(){
  const cat=currentCategory();const board=bestRuns(cat.slug);
  const rows=board.map(run=>`<tr class="${run.rank===1?'record':''}" data-run-row="${escapeHtml(run.id)}"><td><span class="rank ${run.rank===1?'first':''}">${run.rank}</span></td><td>${profileButton(run.runner)}</td><td><button class="time-button" data-run="${run.id}">${formatTime(run.timeMs)}</button></td><td class="platform-col"><span class="platform">${run.platform}</span></td><td class="region-col"><span class="region">${run.region}</span></td><td><span class="run-date">${dateLabel(run.date)}</span></td></tr>`).join('');
  main.innerHTML=`${leaderboardNavigation()}<div class="page-heading"><div><h2>${state.page==='levels'?'Individual levels':'Leaderboards'}</h2></div></div>
  <div class="layout"><section class="board" aria-label="${cat.name} leaderboard">${state.page==='levels'?levelSelector(cat):categorySelector(cat)}
  <div class="table-wrap"><table class="leaderboard-table"><colgroup><col class="rank-column"><col class="runner-column"><col class="time-column"><col class="platform-column"><col class="region-column"><col class="date-column"></colgroup><thead><tr><th scope="col">RANK</th><th scope="col">RUNNER</th><th scope="col">TIME</th><th scope="col" class="platform-col">PLATFORM</th><th scope="col" class="region-col">REGION</th><th scope="col">DATE</th></tr></thead><tbody>${rows}</tbody></table>${!board.length?'<div class="empty"><h3>No verified runs yet</h3></div>':''}</div>
  </section>
  <aside class="side-panel">
  <section class="panel"><h3>Recent verified runs</h3><div class="activity">${allRuns().filter(r=>r.status==='verified'&&r.category===cat.slug&&runPlatform(r)===state.platform).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(r=>`<div class="activity-row"><div><button class="text-button" data-profile="${escapeHtml(r.runner)}">${escapeHtml(r.runner)}</button><p>${formatTime(r.timeMs)} · ${cat.name}</p><small>${dateLabel(r.date)}</small></div></div>`).join('')}</div></section>
  </aside></div>`;

}
function statsDate(date){return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});}
const chartRunnerHues=new Map();
function chartRunnerStyle(name){
  if(!chartRunnerHues.has(name))chartRunnerHues.set(name,Math.round(chartRunnerHues.size*137.508)%360);
  const hue=chartRunnerHues.get(name);
  return `--runner-light:hsl(${hue} 58% 40%);--runner-dark:hsl(${hue} 65% 70%)`;
}
function chartDateBounds(records,endDate){
  const start=Date.parse(`${records[0].date}T00:00:00Z`);
  return {start,end:Math.max(Date.parse(`${endDate}T00:00:00Z`),Date.parse(`${records.at(-1).date}T00:00:00Z`),start+86400000)};
}
function chartViewport(bounds,viewport,action,factor=1,anchor=.5,offset=0){
  if(action==='reset')return {...bounds};
  const full=bounds.end-bounds.start,current=viewport.end-viewport.start;
  // Keep day-resolution labels readable and bound zoom for long histories.
  const minimumSpan=Math.min(full,Math.max(7*86400000,full/100));
  const span=Math.max(minimumSpan,Math.min(full,current*(action==='in'?.5:action==='out'?2:action==='zoom'?factor:1)));
  const shift=action==='earlier'?-current*.5:action==='later'?current*.5:action==='pan'?offset:0;
  const start=Math.max(bounds.start,Math.min(bounds.end-span,viewport.start+(current-span)*anchor+shift));
  return {start,end:start+span};
}
function setupRecordCharts(root,records,title='World record progression',endDate='2026-10-07'){
  root.querySelectorAll('.history-chart').forEach(chart=>{
    const bounds=chartDateBounds(records,endDate);let viewport={...bounds},drag=null,suppressClick=false;
    const svg=chart.querySelector('.record-chart');
    function draw(){
      const holder=document.createElement('div');holder.innerHTML=recordChart(records,title,endDate,viewport);
      svg.innerHTML=holder.querySelector('.record-chart').innerHTML;
      chart.querySelector('.chart-range').textContent=holder.querySelector('.chart-range').textContent;
    }
    svg.addEventListener('wheel',event=>{
      if(drag||!event.deltaY)return;
      event.preventDefault();
      const rect=svg.getBoundingClientRect(),anchor=Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*900-112)/758));
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
      viewport=chartViewport(bounds,viewport,'zoom',Math.exp(Math.max(-1,Math.min(1,delta*.002))),anchor);
      draw();
    },{passive:false});
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==0||drag)return;
      suppressClick=false;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,viewport:{...viewport},width:svg.getBoundingClientRect().width*758/900,moved:false};
    });
    chart.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<4)return;
      if(!drag.moved)chart.setPointerCapture(event.pointerId);
      drag.moved=true;chart.classList.add('is-dragging');
      const offset=-(event.clientX-drag.x)/drag.width*(drag.viewport.end-drag.viewport.start);
      viewport=chartViewport(bounds,drag.viewport,'pan',1,.5,offset);draw();
    });
    function finishDrag(event){
      if(!drag||event.pointerId!==drag.id)return;
      suppressClick=drag.moved;drag=null;chart.classList.remove('is-dragging');
      if(chart.hasPointerCapture(event.pointerId))chart.releasePointerCapture(event.pointerId);
    }
    chart.addEventListener('pointerup',finishDrag);
    chart.addEventListener('pointercancel',finishDrag);
    chart.addEventListener('lostpointercapture',finishDrag);
    chart.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)drag=null;});
    svg.addEventListener('dblclick',()=>{viewport={...bounds};draw();});
    chart.addEventListener('click',event=>{
      if(suppressClick){suppressClick=false;return;}
      const point=event.target.closest('[data-record]');
      if(point){runDetails(point.dataset.record);return;}
    });
    chart.addEventListener('keydown',event=>{
      const point=event.target.closest('[data-record]');
      if(point&&(event.key==='Enter'||event.key===' ')){event.preventDefault();runDetails(point.dataset.record);}
      if(point)return;
      const action={'+':'in','=':'in','-':'out',ArrowLeft:'earlier',ArrowRight:'later',Home:'reset'}[event.key];
      if(action){event.preventDefault();viewport=chartViewport(bounds,viewport,action);draw();}
    });
  });
}
function recordChart(records,title='World record progression',endDate='2026-10-07',viewport=null){
  if(!records.length)return '<div class="empty"><h3>No verified runs yet</h3></div>';
  const left=112,right=870,top=28,bottom=292;
  const bounds=chartDateBounds(records,endDate),{start,end}=viewport||bounds;
  const timestamp=run=>Date.parse(`${run.date}T00:00:00Z`);
  const visible=records.filter(run=>timestamp(run)>=start&&timestamp(run)<=end);
  const preceding=records.filter(run=>timestamp(run)<start).at(-1);
  const values=[...visible,...(preceding?[preceding]:[])];
  const fastest=Math.min(...values.map(run=>run.timeMs)),slowest=Math.max(...values.map(run=>run.timeMs)),padding=Math.max((slowest-fastest)*.15,slowest*.005,1);
  const low=Math.max(0,fastest-padding),high=slowest+padding;
  const x=date=>left+(Date.parse(`${date}T00:00:00Z`)-start)/(end-start)*(right-left);
  const y=time=>bottom-(time-low)/(high-low)*(bottom-top);
  const segments=records.map((run,index)=>{
    const from=Math.max(start,timestamp(run)),to=Math.min(end,index+1<records.length?timestamp(records[index+1]):end);
    if(to<from)return '';
    const fromX=left+(from-start)/(end-start)*(right-left),toX=left+(to-start)/(end-start)*(right-left);
    const next=records[index+1],vertical=next&&timestamp(next)<=end?` V ${y(next.timeMs)}`:'';
    return `<path class="chart-line" d="M ${fromX} ${y(run.timeMs)} H ${toX}${vertical}"/>`;
  }).join('');
  const grid=Array.from({length:5},(_,i)=>{const time=Math.round(high-(high-low)*i/4),cy=top+(bottom-top)*i/4;return `<line class="chart-grid" x1="${left}" y1="${cy}" x2="${right}" y2="${cy}"/><text class="chart-label" x="${left-14}" y="${cy+5}" text-anchor="end">${high-low<10000?formatTime(time):formatTime(time).replace(/\.\d{3}$/,'')}</text>`;}).join('');
  const dates=Array.from({length:4},(_,i)=>{const timestamp=start+(end-start)*i/3,cx=left+(right-left)*i/3;return `<text class="chart-label" x="${cx}" y="${bottom+34}" text-anchor="${i===0?'start':i===3?'end':'middle'}">${new Date(timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</text>`;}).join('');
  const points=visible.map(run=>`<circle class="record-point runner-series" style="${chartRunnerStyle(run.runner)}" cx="${x(run.date)}" cy="${y(run.timeMs)}" r="5" tabindex="0" role="button" data-record="${escapeHtml(run.id)}" aria-label="${escapeHtml(`${run.runner}, ${formatTime(run.timeMs)}, ${statsDate(run.date)}. View run details`)}"><title>${escapeHtml(`${run.runner} · ${formatTime(run.timeMs)} · ${statsDate(run.date)}`)}</title></circle>`).join('');
  const legend=[...new Set(records.map(run=>run.runner))].map(name=>`<li style="${chartRunnerStyle(name)}"><span class="runner-swatch" aria-hidden="true"></span>${escapeHtml(name)}</li>`).join('');
  const zoom=(bounds.end-bounds.start)/(end-start),date=timestamp=>new Date(timestamp).toISOString().slice(0,10);
  return `<div class="history-chart"><div class="chart-controls"><span>Scroll to zoom · Drag to pan · Double-click to reset</span><span class="chart-range">${Number(zoom.toFixed(1))}× · ${statsDate(date(start))} – ${statsDate(date(end))}</span></div><div class="record-chart-scroll"><svg class="record-chart" viewBox="0 0 900 350" role="group" tabindex="0" aria-labelledby="record-chart-title record-chart-description"><title id="record-chart-title">${escapeHtml(title)}</title><desc id="record-chart-description">${records.length} improvements from ${statsDate(records[0].date)} to ${statsDate(records.at(-1).date)}. Time on the vertical axis and run date on the horizontal axis. Select a point for run details. Scroll to zoom, drag to pan, or double-click to reset. Keyboard: plus or minus to zoom, arrow keys to pan, Home to reset.</desc>${grid}${segments}${dates}${points}</svg></div><ul class="chart-legend" aria-label="Runners">${legend}</ul></div>`;
}
function recordList(records){
  if(!records.length)return '<div class="empty"><h3>No verified runs yet</h3></div>';
  return `<div class="table-wrap"><table><caption class="sr-only">World record progression, oldest first</caption><thead><tr><th scope="col">DATE</th><th scope="col">RUNNER</th><th scope="col">TIME</th><th scope="col">IMPROVEMENT</th></tr></thead><tbody>${records.map((run,i)=>`<tr><td class="run-date">${statsDate(run.date)}</td><td>${profileButton(run.runner)}</td><td><button class="time-button" data-run="${escapeHtml(run.id)}">${formatTime(run.timeMs)}</button></td><td class="record-improvement">${i?`−${formatTime(records[i-1].timeMs-run.timeMs)}`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderStats(){
  const stats=speedrunStats(),board=boards.find(board=>board.slug===state.statsBoard)||categories[0],records=recordProgression(board.slug);
  const group=categoryGroups.find(group=>group.name===board.group);
  const categoryTabs=`<div class="run-type-selector"><span class="filter-label">Category</span><div class="subcategory-tabs" role="group" aria-label="Category">${categoryGroups.map(item=>`<button type="button" data-stats-category="${item.name===group?.name?board.slug:item.categories[0].slug}" class="${item===group?'active':''}" aria-pressed="${item===group}">${item.name}</button>`).join('')}<button type="button" data-stats-category="${board.level?board.slug:levelBoards[0].slug}" class="${board.level?'active':''}" aria-pressed="${Boolean(board.level)}">Individual levels</button></div></div>`;
  const runTypes=group?`<div class="board-filters stats-run-types"><div class="run-type-selector"><span class="filter-label">Run Type</span><div class="subcategory-tabs" role="group" aria-label="Run Type">${group.categories.map(category=>`<button type="button" data-stats-category="${category.slug}" class="${category.slug===board.slug?'active':''}" aria-pressed="${category.slug===board.slug}">${category.label}</button>`).join('')}</div></div></div>`:`<div class="stats-level-navigation"><div class="category-tabs" role="group" aria-label="World">${Array.from({length:6},(_,i)=>i+1).map(world=>`<button type="button" data-stats-category="il-${world===board.world?board.level:world+'-1'}-${board.mode}" class="${world===board.world?'active':''}" aria-pressed="${world===board.world}">World ${world}</button>`).join('')}</div><div class="subcategory-tabs level-tabs" role="group" aria-label="Level">${levels.filter(level=>level.world===board.world).map(level=>`<button type="button" data-stats-category="il-${level.slug}-${board.mode}" class="${level.slug===board.level?'active':''}" aria-pressed="${level.slug===board.level}" title="${escapeHtml(level.name)}">${level.slug}</button>`).join('')}</div><div class="board-filters stats-run-types"><div class="run-type-selector"><span class="filter-label">Category</span><div class="subcategory-tabs" role="group" aria-label="Level category">${levelCategories.map(category=>`<button type="button" data-stats-category="il-${board.level}-${category.slug}" class="${category.slug===board.mode?'active':''}" aria-pressed="${category.slug===board.mode}">${category.name}</button>`).join('')}</div></div></div></div>`;
  main.innerHTML=`<div class="page-heading"><div><h2>Stats</h2><p class="subtext">Verified runs · Sample data</p></div></div><dl class="stats-grid">${[['Total runs',stats.total],['Full game runs',stats.fullGame],['Level runs',stats.levels],['Total players',stats.players]].map(([label,value])=>`<div class="stat-card"><dt>${label}</dt><dd>${value.toLocaleString('en-US')}</dd></div>`).join('')}<div class="stat-card stat-duration"><dt>Total run time</dt><dd>${totalRunTime(stats.timeMs)}</dd></div></dl><section class="board stats-board" aria-labelledby="progression-title"><div class="stats-heading"><h3 id="progression-title">World record progression</h3></div><div class="board-filters stats-filters">${categoryTabs}${platformSelector()}</div>${runTypes}<div class="stats-toolbar"><div class="stats-views" role="group" aria-label="Progression view"><button type="button" data-stats-view="chart" aria-pressed="${state.statsView==='chart'}">Chart</button><button type="button" data-stats-view="list" aria-pressed="${state.statsView==='list'}">List</button></div></div>${state.statsView==='list'?recordList(records):recordChart(records)}${records.length?`<div class="record-summary"><span>${records.length} records</span><span>Current record <button class="time-button" data-run="${escapeHtml(records.at(-1).id)}">${formatTime(records.at(-1).timeMs)}</button> · ${escapeHtml(records.at(-1).runner)}</span></div>`:''}</section>`;
  const selectCategory=slug=>{state.statsBoard=slug;location.hash=`stats/${state.statsBoard}${platformQuery()}`;renderStats();};
  document.querySelectorAll('[data-stats-category]').forEach(button=>button.addEventListener('click',()=>{selectCategory(button.dataset.statsCategory);document.querySelector(`[data-stats-category="${state.statsBoard}"]`)?.focus();}));
  document.querySelectorAll('[data-stats-view]').forEach(button=>button.addEventListener('click',()=>{state.statsView=button.dataset.statsView;renderStats();document.querySelector(`[data-stats-view="${state.statsView}"]`).focus();}));
  setupRecordCharts(main,records);
}
function renderRunners(){
  main.innerHTML=`<div class="page-heading"><div><h2>Runners</h2></div></div><div class="runners-toolbar"><label class="runners-search" for="runner-search">Search runners<input id="runner-search" type="search" placeholder="Runner name" autocomplete="off" aria-controls="runner-results" value="${escapeHtml(state.runnerSearch||'')}"></label><p id="runner-count" class="subtext" role="status" aria-live="polite" aria-atomic="true"></p></div><div id="runner-results"></div>`;
  renderRunnerResults();
  document.querySelector('#runner-search').addEventListener('input',event=>{
    state.runnerSearch=event.target.value;
    renderRunnerResults();
  });
}
function renderRunnerResults(){
  const counts=new Map();
  allRuns().filter(run=>run.status==='verified').forEach(run=>counts.set(run.runner,(counts.get(run.runner)||0)+1));
  const query=(state.runnerSearch||'').trim().toLowerCase();
  const names=[...counts.keys()].filter(name=>name.toLowerCase().includes(query));
  document.querySelector('#runner-count').textContent=`${names.length} ${names.length===1?'runner':'runners'}`;
  document.querySelector('#runner-results').innerHTML=names.length?`<div class="runner-grid">${names.map(name=>`<button class="runner-card" data-profile="${escapeHtml(name)}">${avatar(name,true)}<span><strong>${escapeHtml(name)}</strong>${runnerCountry(name)}<p>${counts.get(name)} verified runs</p></span></button>`).join('')}</div>`:`<div class="empty"><h3>${query?'No runners found':'No runners yet'}</h3></div>`;
}
function renderResources(){
  main.innerHTML=`<div class="page-heading"><div><h2>Resources</h2></div></div><div class="resource-grid">${[
    {title:'Guides',layout:'resource-guides'},
    {title:'Tools',layout:'resource-tools'},
    {title:'Routes',layout:'resource-routes'},
    {title:'Community links',layout:'resource-community'},
  ].map(resource=>`<section class="resource-card ${resource.layout}"><h3>${resource.title}</h3><p class="resource-status">Placeholder</p></section>`).join('')}</div>`;
}
function renderRules(){main.innerHTML=`${leaderboardNavigation()}<div class="page-heading"><h2>Rules</h2></div><section class="content-card">${categoryGroups.flatMap(group=>group.categories).map(board=>`<article class="rule-block"><h3>${board.name}</h3>${boardRulesButton(board)}</article>`).join('')}</section>`;}
function renderMyRuns(){const own=saved.runs.filter(r=>r.runner===saved.viewer).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));main.innerHTML=`<div class="page-heading"><div><h2>My submissions</h2></div></div><div class="notice">Demo moderation</div><section class="board">${own.length?`<div class="table-wrap"><table><thead><tr><th>CATEGORY</th><th>TIME</th><th>DATE</th><th>STATUS</th><th>PREVIEW REVIEW</th></tr></thead><tbody>${own.map(r=>`<tr data-run-row="${escapeHtml(r.id)}"><td>${boards.find(c=>c.slug===r.category).name}</td><td><button class="time-button" data-run="${r.id}">${formatTime(r.timeMs)}</button></td><td class="run-date">${dateLabel(r.date)}</td><td><span class="status ${r.status}">${r.status[0].toUpperCase()+r.status.slice(1)}</span></td><td>${r.status==='pending'?`<button class="text-button" data-verify="${r.id}">Verify</button> · <button class="text-button" data-reject="${r.id}">Reject</button>`:'<span class="subtext">Reviewed</span>'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>No submissions</h3></div>`}</section>`;}
let lastModalTitle='';
function openModal(title,body){if(title==='Run details'&&lastModalTitle==='Runner profile'&&modal.open)body='<button class="text-button profile-back" data-profile-return>Back to profile</button>'+body;lastModalTitle=title;document.querySelector('#modal-content').innerHTML=`<div class="modal-header"><h2 id="dialog-title">${title}</h2><button class="close-button" type="button" data-close aria-label="Close dialog"><span aria-hidden="true"></span></button></div><div class="modal-body">${body}</div>`;if(!modal.open)modal.showModal();}
let profileState={name:'',view:'bests',type:'all',platform:'all',board:'',page:0};
function profileData(name){
  const runs=allRuns().filter(run=>run.runner===name&&run.status==='verified');
  const pbs=boards.flatMap(cat=>['snes','vc'].map(platform=>({cat,platform,run:bestRuns(cat.slug,'all',platform).find(run=>run.runner===name)}))).filter(entry=>entry.run);
  return {runs,pbs};
}
function profile(name,preserve=false){
  if(!preserve)profileState={name,view:'bests',type:'all',platform:'all',board:'',page:0};
  const {runs,pbs}=profileData(name);
  openModal('Runner profile',`<section class="runner-profile"><header class="runner-identity"><div><h3>${escapeHtml(name)}</h3>${runnerCountry(name)}</div></header><dl class="profile-summary"><div><dt>Verified runs</dt><dd>${runs.length}</dd></div><div><dt>Personal bests</dt><dd>${pbs.length}</dd></div><div><dt>Current #1s</dt><dd>${pbs.filter(entry=>entry.run.rank===1).length}</dd></div></dl><nav class="profile-views" aria-label="Profile view">${[['bests','Personal bests'],['progress','Progression'],['history','Run history']].map(([value,label])=>`<button type="button" data-profile-view="${value}" aria-pressed="${value==='bests'}">${label}</button>`).join('')}</nav><div class="profile-filters"><label>Board type<select id="profile-type"><option value="all">All boards</option><option value="full">Full game</option><option value="levels">Individual levels</option></select></label><label>Platform<select id="profile-platform"><option value="all">All platforms</option><option value="snes">SNES / Emulator</option><option value="vc">VC</option></select></label></div><div id="profile-content"></div></section>`);
  document.querySelectorAll('[data-profile-view]').forEach(button=>button.addEventListener('click',()=>{profileState.view=button.dataset.profileView;profileState.page=0;renderProfileContent();}));
  for(const filter of ['type','platform'])document.querySelector(`#profile-${filter}`).addEventListener('change',event=>{profileState[filter]=event.target.value;profileState.page=0;renderProfileContent();});
  document.querySelector('#profile-type').value=profileState.type;
  document.querySelector('#profile-platform').value=profileState.platform;
  renderProfileContent();
}
function renderProfileContent(){
  const {runs,pbs}=profileData(profileState.name);
  const matches=run=>(profileState.type==='all'||Boolean(boards.find(board=>board.slug===run.category)?.level)===(profileState.type==='levels'))&&(profileState.platform==='all'||runPlatform(run)===profileState.platform);
  const bests=pbs.filter(entry=>matches(entry.run));
  const history=runs.filter(matches).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||a.id.localeCompare(b.id));
  document.querySelectorAll('[data-profile-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.profileView===profileState.view)));
  const content=document.querySelector('#profile-content');
  if(profileState.view==='bests'){
    const pages=Math.ceil(bests.length/12);profileState.page=Math.max(0,Math.min(profileState.page,pages-1));
    content.innerHTML=bests.length?`<div class="profile-best-grid">${bests.slice(profileState.page*12,profileState.page*12+12).map(({cat,platform,run})=>`<button class="profile-best" data-run="${escapeHtml(run.id)}"><span class="profile-best-heading"><span>${escapeHtml(cat.name)}</span><span class="profile-place ${run.rank===1?'profile-record':''}">#${run.rank}</span></span><strong>${formatTime(run.timeMs)}</strong><span class="profile-best-meta"><span>${platform==='vc'?'VC':'SNES / Emulator'}</span><span>${dateLabel(run.date)}</span></span></button>`).join('')}</div>${pages>1?`<div class="profile-pagination"><span>${profileState.page*12+1}-${Math.min(bests.length,(profileState.page+1)*12)} of ${bests.length} PBs</span><div><button class="button secondary" id="profile-prev" ${profileState.page===0?'disabled':''}>Previous</button><button class="button secondary" id="profile-next" ${profileState.page+1>=pages?'disabled':''}>Next</button></div></div>`:''}`:'<div class="empty"><h3>No verified PBs for these filters</h3></div>';
    for(const [id,step] of [['prev',-1],['next',1]])document.querySelector(`#profile-${id}`)?.addEventListener('click',()=>{profileState.page+=step;renderProfileContent();document.querySelector(`#profile-${id}`)?.focus();});
  }else if(profileState.view==='history'){
    const pages=Math.ceil(history.length/10);profileState.page=Math.max(0,Math.min(profileState.page,pages-1));
    content.innerHTML=history.length?`<div class="table-wrap"><table class="profile-history"><caption class="sr-only">Verified run history, newest first</caption><thead><tr><th scope="col">BOARD</th><th scope="col">TIME</th><th scope="col">PLATFORM</th><th scope="col">DATE</th></tr></thead><tbody>${history.slice(profileState.page*10,profileState.page*10+10).map(run=>`<tr><td>${escapeHtml(boards.find(board=>board.slug===run.category).name)}</td><td><button class="time-button" data-run="${escapeHtml(run.id)}">${formatTime(run.timeMs)}</button></td><td>${escapeHtml(run.platform||'SNES')}</td><td>${dateLabel(run.date)}</td></tr>`).join('')}</tbody></table></div><div class="profile-pagination"><span>${profileState.page*10+1}-${Math.min(history.length,(profileState.page+1)*10)} of ${history.length} runs</span><div><button class="button secondary" id="profile-prev" ${profileState.page===0?'disabled':''}>Previous</button><button class="button secondary" id="profile-next" ${profileState.page+1>=pages?'disabled':''}>Next</button></div></div>`:'<div class="empty"><h3>No verified runs for these filters</h3></div>';
    for(const [id,step] of [['prev',-1],['next',1]])document.querySelector(`#profile-${id}`)?.addEventListener('click',()=>{profileState.page+=step;renderProfileContent();document.querySelector(`#profile-${id}`)?.focus();});
  }else{
    if(!bests.some(entry=>`${entry.cat.slug}/${entry.platform}`===profileState.board))profileState.board=bests.length?`${bests[0].cat.slug}/${bests[0].platform}`:'';
    const [category,platform]=profileState.board.split('/'),records=profileProgression(runs,category,platform);
    content.innerHTML=bests.length?`<label class="profile-progress-select">Board<select id="profile-board">${bests.map(entry=>{const key=`${entry.cat.slug}/${entry.platform}`;return `<option value="${key}" ${key===profileState.board?'selected':''}>${escapeHtml(entry.cat.name)} (${entry.platform==='vc'?'VC':'SNES / Emulator'})</option>`;}).join('')}</select></label>${records.length?`<div class="profile-progress-summary"><div><span>First dated PB</span><strong>${formatTime(records[0].timeMs)}</strong></div><div><span>Latest dated PB</span><strong>${formatTime(records.at(-1).timeMs)}</strong></div><div><span>Total improvement</span><strong>${formatTime(records[0].timeMs-records.at(-1).timeMs)}</strong></div></div>${recordChart(records,'Personal best progression',records.at(-1).date)}<div class="table-wrap"><table><caption class="sr-only">Personal best progression, oldest first</caption><thead><tr><th scope="col">DATE</th><th scope="col">TIME</th><th scope="col">IMPROVEMENT</th></tr></thead><tbody>${records.map((run,index)=>`<tr><td>${dateLabel(run.date)}</td><td><button class="time-button" data-run="${escapeHtml(run.id)}">${formatTime(run.timeMs)}</button></td><td>${index?formatTime(records[index-1].timeMs-run.timeMs):'First dated PB'}</td></tr>`).join('')}</tbody></table></div><p class="profile-note">Runs without a date are excluded from progression.</p>`:'<div class="empty"><h3>No dated runs for this board</h3></div>'}`:'<div class="empty"><h3>No verified PBs for these filters</h3></div>';
    document.querySelector('#profile-board')?.addEventListener('change',event=>{profileState.board=event.target.value;renderProfileContent();document.querySelector('#profile-board')?.focus();});
    if(records.length)setupRecordCharts(content,records,'Personal best progression',records.at(-1).date);
  }
}
function runDetails(id){const run=allRuns().find(r=>r.id===id);if(!run)return;const cat=boards.find(c=>c.slug===run.category);const pb=bestRuns(run.category,'all',runPlatform(run)).find(r=>r.runner===run.runner);const earlier=allRuns().filter(r=>r.runner===run.runner&&r.category===run.category&&runPlatform(r)===runPlatform(run)&&r.status==='verified'&&r.date&&run.date&&r.date<run.date).sort((a,b)=>a.timeMs-b.timeMs)[0];openModal('Run details',`<div class="run-heading"><h3><button class="text-button" data-profile="${escapeHtml(run.runner)}">${escapeHtml(run.runner)}</button></h3><p>${cat.name}</p></div><div class="detail-time-row"><div class="detail-time">${formatTime(run.timeMs)}</div>${earlier&&run.timeMs<earlier.timeMs?`<span class="pb-improvement" aria-label="Improvement over previous PB: ${formatTime(earlier.timeMs-run.timeMs)}" title="Improvement over previous PB"><span class="pb-improvement-value">−${formatTime(earlier.timeMs-run.timeMs)}</span><span>vs. previous PB</span></span>`:''}</div><span class="status ${run.status}">${run.status[0].toUpperCase()+run.status.slice(1)}</span><dl class="detail-grid"><div><dt>Rank</dt><dd>${run.status==='verified'?(pb?.id===id?`#${pb.rank}`:'Previous verified run'):(run.status==='rejected'?'Not ranked':'Awaiting verification')}</dd></div><div><dt>Run date</dt><dd>${escapeHtml(run.date||'Unknown')}</dd></div><div><dt>Platform</dt><dd>${escapeHtml(run.platform)}</dd></div><div><dt>Region</dt><dd>${escapeHtml(run.region)}</dd></div><div><dt>Timing method</dt><dd>RTA</dd></div><div><dt>Reviewed by</dt><dd>${escapeHtml(run.reviewer||'Not reviewed yet')}</dd></div></dl>${run.rejectionReason?`<div class="notice">Rejection reason: ${escapeHtml(run.rejectionReason)}</div>`:''}<p>${escapeHtml(run.comment)}</p>${runVideo(run.video)}`);}
function submitForm(){openModal('Submit a run',`<p>Demo submissions are stored in this browser.</p><form id="submit-form"><div id="form-error" role="alert"></div><div class="form-grid"><label class="field full">Runner name<input name="runner" required maxlength="24" value="${escapeHtml(saved.viewer)}" placeholder="Your runner name" autocomplete="nickname"></label><label class="field full">Board type<select id="submission-type"><option value="full">Full game</option><option value="level" ${state.page==='levels'?'selected':''}>Individual level</option></select></label><div class="field full" id="submission-board-fields"></div><label class="field">RTA time<input name="time" required placeholder="2:06:31.420" aria-describedby="time-help"><small id="time-help">H:MM:SS.mmm, MM:SS.mmm or SS.mmm</small></label><div class="field"><label for="run-date">Run date</label><div class="date-control"><input id="run-date" name="date" type="date" required max="2026-10-07" value="2026-10-07"><button type="button" id="date-toggle" popovertarget="run-calendar" aria-label="Choose run date">▦</button></div><section id="run-calendar" class="date-calendar" popover aria-label="Choose run date"></section></div><label class="field">Platform<select name="platform"><option ${state.platform==='snes'?'selected':''}>SNES</option><option>Emulator</option><option ${state.platform==='vc'?'selected':''}>VC</option></select></label><label class="field">Region<select name="region"><option>NTSC-U</option><option>NTSC-J</option><option>PAL</option></select></label><label class="field full">Video URL<input name="video" type="url" required placeholder="https://www.youtube.com/watch?v=…"><small>A public YouTube or Twitch link.</small></label><label class="field full">Comment <small>(optional)</small><textarea name="comment" maxlength="1000" placeholder="Comment"></textarea></label></div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button type="submit" class="button">Submit for review</button></div></form>`);renderSubmissionBoardFields();setupRunDatePicker();document.querySelector('[name="time"]').addEventListener('blur',event=>{event.target.value=normalizeTime(event.target.value);});document.querySelector('#submission-type').addEventListener('change',renderSubmissionBoardFields);document.querySelector('#submit-form').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const timeMs=parseTime(data.time);let error='';let url;try{url=new URL(data.video);}catch{}if(!data.runner.trim())error='Please enter a runner name.';else if(!boards.some(board=>board.slug===data.category))error='Please select a leaderboard.';else if(!timeMs)error='Use a positive time such as 2:06:31.420 or 48:12.050.';else if(data.date>'2026-10-07')error='The run date cannot be in the future.';else if(!videoEmbedUrl(data.video))error='Please use a YouTube video, Twitch VOD or Twitch clip URL.';if(error){document.querySelector('#form-error').innerHTML=`<p class="error">${error}</p>`;return;}saved.viewer=data.runner.trim();saved.runs.push({id:`demo-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,runner:saved.viewer,category:data.category,timeMs,date:data.date,platform:data.platform,region:data.region,video:url.href,comment:data.comment,status:'pending',submittedAt:new Date().toISOString()});persist();modal.close();location.hash='my-runs';state.page='my-runs';render();toast('Run submitted · Pending');});}
function account(){openModal(saved.viewer?'Demo account':'Demo account',saved.viewer?`<div class="profile-heading">${avatar(saved.viewer,true)}<div><h3>${escapeHtml(saved.viewer)}</h3><p>Local demo session</p></div></div><p>Demo session · No authentication</p><div class="form-actions"><button class="button secondary" id="sign-out">Sign out</button><button class="button" data-my-runs>My submissions</button></div>`:`<p>Demo session · No authentication</p><form id="account-form"><label class="field">Runner name<input name="name" required maxlength="24" placeholder="Runner name" autocomplete="nickname"></label><div class="form-actions"><button class="button" type="submit">Enter demo</button></div></form>`);document.querySelector('#account-form')?.addEventListener('submit',event=>{event.preventDefault();const name=new FormData(event.target).get('name').trim();if(!name)return;saved.viewer=name;persist();modal.close();render();toast('Demo session started.');});document.querySelector('#sign-out')?.addEventListener('click',()=>{saved.viewer='';persist();modal.close();render();toast('Signed out.');});}
let toastTimer;function toast(message){const element=document.querySelector('#toast');element.textContent=message;element.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),4000);}
document.addEventListener('click',event=>{const target=event.target.closest('button');if(!target){const row=event.target.closest('[data-run-row]');if(row)runDetails(row.dataset.runRow);return;}
  if(target.hasAttribute('data-close'))modal.close();
  else if(target.hasAttribute('data-submit'))submitForm();
  else if(target.dataset.platform){state.platform=target.dataset.platform;const base=state.page==='stats'?`stats/${state.statsBoard}`:state.page==='levels'?`levels/${currentCategory().world}/${state.level}/${state.levelCategory}`:`leaderboard/${state.category}`;location.hash=base+`?platform=${state.platform}`;render();}
  else if(target.dataset.category){state.category=target.dataset.category;state.region='all';state.search='';state.page='leaderboard';modal.close();location.hash=`leaderboard/${state.category}${platformQuery()}`;render();}
  else if(target.hasAttribute('data-profile-return'))profile(profileState.name,true);
  else if(target.dataset.profile)profile(target.dataset.profile);
  else if(target.dataset.run)runDetails(target.dataset.run);
  else if(target.dataset.rules)showBoardRules(target.dataset.rules);
  else if(target.hasAttribute('data-clear')){state.region='all';state.search='';render();}
  else if(target.hasAttribute('data-my-runs')){modal.close();location.hash='my-runs';}
  else if(target.dataset.verify){const run=saved.runs.find(r=>r.id===target.dataset.verify);if(run){run.status='verified';run.reviewer='Demo moderator';persist();render();toast('Run verified.');}}
  else if(target.dataset.reject){const id=target.dataset.reject;openModal('Preview rejection',`<form id="reject-form"><label class="field">Reason<textarea name="reason" required maxlength="500" placeholder="Explain what needs to be corrected."></textarea></label><div class="form-actions"><button class="button secondary" type="button" data-close>Cancel</button><button class="button danger">Reject run</button></div></form>`);document.querySelector('#reject-form').addEventListener('submit',event=>{event.preventDefault();const reason=new FormData(event.target).get('reason').trim();if(!reason)return;const run=saved.runs.find(r=>r.id===id);run.status='rejected';run.reviewer='Demo moderator';run.rejectionReason=reason;persist();modal.close();render();toast('Run rejected.');});}
});
modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
document.querySelector('#account-button').addEventListener('click',account);
// Rule text is independent for each full-game category or individual-level board.
// Summaries of category and Run Type rules from the public speedrun.com API,
// checked 2026-10-07. Preserve combined SNES/emulator boards with separate VC and millisecond RTA.
function boardActions(board){return `<div class="board-actions"><a class="board-rules" href="#stats/${board.slug}${platformQuery()}" aria-label="World record history for ${escapeHtml(board.name)}">History</a>${boardRulesButton(board)}</div>`;}
function boardRulesButton(board){return `<button class="board-rules" type="button" data-rules="${board.slug}" aria-label="Rules for ${escapeHtml(board.name)}">Rules</button>`;}
function showBoardRules(slug){
  const board=boards.find(board=>board.slug===slug);if(!board)return;
  const rules=board.level?{...levelRules,requirements:[board.mode==='100'?'Complete the selected stage with a score of 100.':'Complete the selected stage.']}:categoryRules[slug];
  const sections=[['requirements','Requirements'],['timing','Timing'],['bans','Not allowed'],['verification','Verification']];
  openModal('Rules',`<h3 class="rules-category">${escapeHtml(board.name)}</h3><div class="category-rules">${sections.filter(([key])=>rules[key]).map(([key,title])=>`<section><h4>${title}</h4><ul>${rules[key].map(rule=>`<li>${escapeHtml(rule)}</li>`).join('')}</ul></section>`).join('')}</div>`);
}
function videoEmbedUrl(value,parent=location.hostname){
  let url;try{url=new URL(value);}catch{return null;}
  if(url.protocol!=='https:')return null;
  const host=url.hostname,parts=url.pathname.split('/').filter(Boolean);
  if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host)){
    const id=host==='youtu.be'?parts[0]:parts[0]==='watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;
    if(!/^[\w-]{11}$/.test(id||''))return null;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=0`;
  }
  const params=new URLSearchParams({parent:parent||'localhost',autoplay:'false'});
  if(['twitch.tv','www.twitch.tv'].includes(host)&&parts[0]==='videos'&&/^\d+$/.test(parts[1]||'')){
    params.set('video',`v${parts[1]}`);return `https://player.twitch.tv/?${params}`;
  }
  const clip=host==='clips.twitch.tv'?parts[0]:['twitch.tv','www.twitch.tv'].includes(host)&&parts[1]==='clip'?parts[2]:null;
  if(clip&&/^[\w-]+$/.test(clip)){params.set('clip',clip);return `https://clips.twitch.tv/embed?${params}`;}
  return null;
}
function runVideo(value){
  const src=videoEmbedUrl(value);
  if(!src)return '<div class="notice">Video URL is unavailable or unsupported.</div>';
  return `<div class="run-video"><iframe src="${escapeHtml(src)}" title="Submission video" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a class="text-button video-link" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">Open video</a>`;
}
function setupRunDatePicker(){
  const input=document.querySelector('#run-date'),calendar=document.querySelector('#run-calendar'),toggle=document.querySelector('#date-toggle');
  const max=input.max;
  let month=input.value.slice(0,7);
  const months=Array.from({length:12},(_,i)=>new Date(2000,i,1).toLocaleDateString('en-US',{month:'long'}));
  const dateString=(year,month,day)=>`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  function draw(){
    const [year,number]=month.split('-').map(Number),index=number-1;
    const first=(new Date(year,index,1).getDay()+6)%7,days=new Date(year,number,0).getDate();
    calendar.innerHTML=`<div class="calendar-header"><button type="button" data-month-step="-1" aria-label="Previous month">‹</button><select aria-label="Calendar month">${months.map((name,i)=>`<option value="${i+1}" ${i===index?'selected':''}>${name}</option>`).join('')}</select><select aria-label="Calendar year">${Array.from({length:Number(max.slice(0,4))-1900+1},(_,i)=>1900+i).reverse().map(value=>`<option ${value===year?'selected':''}>${value}</option>`).join('')}</select><button type="button" data-month-step="1" aria-label="Next month" ${month>=max.slice(0,7)?'disabled':''}>›</button></div><div class="calendar-days">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(day=>`<span>${day}</span>`).join('')}${'<span aria-hidden="true"></span>'.repeat(first)}${Array.from({length:days},(_,i)=>{const value=dateString(year,index,i+1);return `<button type="button" data-date="${value}" aria-label="${months[index]} ${i+1}, ${year}" aria-pressed="${input.value===value}" ${value>max?'disabled':''}>${i+1}</button>`;}).join('')}</div><button class="calendar-today" type="button" data-date="${max}">Today</button>`;
  }
  calendar.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    if(button.dataset.date){input.value=button.dataset.date;calendar.hidePopover();input.dispatchEvent(new Event('change',{bubbles:true}));toggle.focus();}
    else if(button.dataset.monthStep){const [year,number]=month.split('-').map(Number);const next=new Date(year,number-1+Number(button.dataset.monthStep),1);if(next.getFullYear()<1900)return;month=dateString(next.getFullYear(),next.getMonth(),1).slice(0,7);draw();calendar.querySelector(`[data-month-step="${button.dataset.monthStep}"]`).focus();}
  });
  calendar.addEventListener('change',event=>{
    const selectMonth=calendar.querySelector('[aria-label="Calendar month"]'),selectYear=calendar.querySelector('[aria-label="Calendar year"]');
    const label=event.target.getAttribute('aria-label');
    month=`${selectYear.value}-${selectMonth.value.padStart(2,'0')}`;draw();calendar.querySelector(`[aria-label="${label}"]`).focus();
  });
  calendar.addEventListener('beforetoggle',event=>{
    if(event.newState!=='open')return;
    month=(input.value||max).slice(0,7);draw();
    const rect=toggle.getBoundingClientRect();
    calendar.style.left=`${Math.max(8,Math.min(rect.right-300,window.innerWidth-308))}px`;
    calendar.style.top=`${Math.max(8,Math.min(rect.bottom+8,window.innerHeight-340))}px`;
  });
  calendar.addEventListener('toggle',event=>{
    if(event.newState!=='open')return;
    calendar.style.top=`${Math.max(8,Math.min(toggle.getBoundingClientRect().bottom+8,window.innerHeight-calendar.getBoundingClientRect().height-8))}px`;
    calendar.querySelector('[aria-pressed="true"]:not(:disabled)')?.focus();
  });
}
function route(){
  if(location.hash==='#main')return;
  const previousPage=state.page;
  const [path,query='']=location.hash.slice(1).split('?');
  const [page,category,levelSlug,mode]=path.split('/');
  if(['leaderboard','levels','stats'].includes(page))state.platform=new URLSearchParams(query).get('platform')==='vc'?'vc':'snes';
  state.page=['leaderboard','levels','runners','resources','stats','rules','my-runs'].includes(page)?page:'leaderboard';
  if(state.page==='stats'&&boards.some(board=>board.slug===category))state.statsBoard=category;
  if(state.page==='levels'){
    const world=Number(category);
    const level=levels.find(level=>level.slug===levelSlug&&level.world===world)||levels.find(level=>level.world===world)||levels.find(level=>level.slug===state.level);
    state.level=level.slug;
    if(levelCategories.some(category=>category.slug===mode))state.levelCategory=mode;
    state.region='all';state.search='';
  }else if(category&&categories.some(c=>c.slug===category)){state.category=category;state.region='all';state.search='';}
  if(state.page!==previousPage)window.scrollTo(0,0);
  render();
}
window.addEventListener('hashchange',route);route();

/* Visual prototype only. All runners and records below are fictional sample data. */
const categories = [
  {slug:'100-percent',name:'100%: No Major Glitches',label:'No Major Glitches',group:'100%'},
  {slug:'warpless',name:'All Main Stages: Warpless',label:'Warpless',group:'All Main Stages'},
  {slug:'warps',name:'All Main Stages: Warps',label:'Warps',group:'All Main Stages'},
  {slug:'magical-journey',name:'All Main Stages: Magical Journey',label:'Magical Journey',group:'All Main Stages'},
  {slug:'credits-warp',name:'Any%: Credits Warp',label:'Credits Warp',group:'Any%'},
  {slug:'beat-bowser',name:'Any%: Beat Bowser',label:'Beat Bowser',group:'Any%'},
  {slug:'no-ace',name:'Any%: No ACE',label:'No ACE',group:'Any%'},
  {slug:'reverse-boss-order',name:'Any%: Reverse Boss Order',label:'Reverse Boss Order',group:'Any%'},
  {slug:'100-percent-no-restrictions',name:'100%: No Restrictions',label:'No Restrictions',group:'100%'},
];
const boards=[...categories,...levelBoards];
const boardHref=board=>board.level?`#levels/${board.world}/${board.level}/${board.mode}`:`#leaderboard/${board.slug}`;
const categoryGroups=['All Main Stages','100%','Any%'].map(name=>({name,categories:categories.filter(cat=>cat.group===name)}));
function groupedCategories(renderCategory,openGroups){return categoryGroups.map(group=>`<details class="category-group" data-group="${group.name}" ${openGroups.has(group.name)?'open':''}><summary class="category-group-label ${state.page==='leaderboard'&&currentCategory().group===group.name?'selected':''}">${group.name}</summary><div class="category-group-items">${group.categories.map(renderCategory).join('')}</div></details>`).join('');}
function categoryOptions(){return categoryGroups.map(group=>{const options=group.categories.map(cat=>`<option value="${cat.slug}" ${cat.slug===state.category?'selected':''}>${cat.label}</option>`).join('');return group.name?`<optgroup label="${group.name}">${options}</optgroup>`:options;}).join('');}
const selectedGroupCategories={};
function categorySelector(cat){
  selectedGroupCategories[cat.group]=cat.slug;
  const group=categoryGroups.find(group=>group.name===cat.group);
  return `<div class="category-tabs" role="group" aria-label="Category">${categoryGroups.map(group=>`<button data-category="${selectedGroupCategories[group.name]||group.categories[0].slug}" class="${group.name===cat.group?'active':''}" aria-pressed="${group.name===cat.group}">${group.name||'100%'}</button>`).join('')}</div>${group.name?`<div class="subcategory-tabs" role="group" aria-label="${group.name} subcategories">${group.categories.map(c=>`<button data-category="${c.slug}" class="${c.slug===cat.slug?'active':''}" aria-pressed="${c.slug===cat.slug}">${c.label}</button>`).join('')}</div>`:''}`;
}
const runners = [
  {name:'aura',country:'Japan',color:'#e5edda'},
  {name:'puddles',country:'United States',color:'#e5eaf2'},
  {name:'orbit',country:'Germany',color:'#f3e4d6'},
  {name:'greenbean',country:'Canada',color:'#dfece0'},
  {name:'moss',country:'United Kingdom',color:'#e8e3ef'},
  {name:'littlecloud',country:'France',color:'#f1e5e8'},
  {name:'sunny',country:'Australia',color:'#f2ebd4'},
  {name:'eggroll',country:'Sweden',color:'#e2ecec'},
  {name:'fern',country:'Netherlands',color:'#e8ecda'},
  {name:'patches',country:'United States',color:'#eee3d9'},
  {name:'pixelmoth',country:'Finland',color:'#e6e4ee'},
  {name:'sprout',country:'New Zealand',color:'#e3edde'},
];
const baseTimes=[7591420,6124100,2118230,5021860,162420,1837420,2076800,3312110,7321840];
const sampleRuns=categories.flatMap((cat,c)=>runners.map((runner,i)=>({
  id:`sample-${c}-${i}`,runner:runner.name,category:cat.slug,
  timeMs:baseTimes[c]+(i===1?0:i*42317+c*i*317),
  date:`2026-09-${String(28-i).padStart(2,'0')}`,
  platform:i%4===2?'Emulator':'SNES',region:['NTSC-U','NTSC-J','PAL'][i%3],
  video:'',comment:'',
  status:'verified',reviewer:'Community moderator',sample:true,
})));
// An older, slower verified submission demonstrates that only one PB per runner appears.
sampleRuns.push({...sampleRuns[0],id:'sample-older',timeMs:sampleRuns[0].timeMs+92500,date:'2026-08-14'});
// Fictional samples for individual-level boards; these are not speedrun.com records.
sampleRuns.push(...levelBoards.flatMap((board,c)=>runners.slice(0,4).map((runner,i)=>({
  id:`sample-il-${c}-${i}`,runner:runner.name,category:board.slug,
  timeMs:24000+(c%9)*17321+(board.mode==='100'?65000:0)+(i<2?0:i*1237),
  date:`2026-09-${String(20-i).padStart(2,'0')}`,platform:i%2?'Emulator':'SNES',
  region:['NTSC-U','NTSC-J','PAL'][i%3],video:'',comment:'',status:'verified',reviewer:'Community moderator',sample:true,
}))));
const storageKey='yoshi-visual-prototype-v1';
let saved={runs:[],viewer:''};
try { const value=JSON.parse(localStorage.getItem(storageKey)); if(value&&Array.isArray(value.runs)){saved.runs=value.runs.filter(r=>r&&typeof r.runner==='string'&&boards.some(c=>c.slug===r.category)&&Number.isSafeInteger(r.timeMs)&&r.timeMs>0&&['pending','verified','rejected'].includes(r.status));saved.viewer=typeof value.viewer==='string'?value.viewer:'';} } catch {}
let state={page:'leaderboard',category:categoryGroups[0].categories[0].slug,level:'1-1',levelCategory:'any',region:'all',search:''};
const main=document.querySelector('main');
const modal=document.querySelector('#modal');
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const allRuns=()=>[...sampleRuns,...saved.runs];
const currentCategory=()=>state.page==='levels'?levelBoards.find(board=>board.level===state.level&&board.mode===state.levelCategory):categories.find(c=>c.slug===state.category)||categories[0];
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{toast('Browser storage is unavailable; changes last for this session.');}}
function formatTime(ms){const hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,seconds=Math.floor(ms/1000)%60;return `${hours?hours+':':''}${hours?String(minutes).padStart(2,'0'):minutes}:${String(seconds).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;}
function normalizeTime(value){const text=value.trim();return /^([0-5]?\d)\.\d{1,3}$/.test(text)?`0:${text.split('.')[0].padStart(2,'0')}.${text.split('.')[1]}`:text;}
function parseTime(value){const match=normalizeTime(value).match(/^(?:(\d{1,3}):)?([0-5]?\d):([0-5]\d)(?:\.(\d{1,3}))?$/);if(!match)return null;const ms=(Number(match[1]||0)*3600+Number(match[2])*60+Number(match[3]))*1000+Number((match[4]||'').padEnd(3,'0'));return ms>0?ms:null;}
function dateLabel(date){return new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});}
function bestRuns(category,region='all'){
  const sorted=allRuns().filter(r=>r.category===category&&r.status==='verified'&&(region==='all'||r.region===region)).sort((a,b)=>a.timeMs-b.timeMs||a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const seen=new Set();let previous=null,rank=0;
  return sorted.filter(r=>{if(seen.has(r.runner))return false;seen.add(r.runner);return true;}).map((r,i)=>{if(r.timeMs!==previous)rank=i+1;previous=r.timeMs;return {...r,rank};});
}
function avatar(name,large=false){const runner=runners.find(r=>r.name===name);return `<span class="avatar${large?' large':''}" style="background:${runner?.color||'#e5edda'}">${escapeHtml(name.slice(0,2).toUpperCase())}</span>`;}
function profileButton(name){return `<button class="runner-button" data-profile="${escapeHtml(name)}">${avatar(name)}<span>${escapeHtml(name)}<span class="runner-location">${escapeHtml(runners.find(r=>r.name===name)?.country||'Community runner')}</span></span></button>`;}
function render(){
  const sectionNames={leaderboard:'Leaderboards',levels:'Individual levels',runners:'Runners',rules:'Rules & resources','my-runs':'My submissions'};
  const crumbs=[{label:'Yoshi’s Island',href:'#leaderboard'},{label:sectionNames[state.page],href:`#${state.page}`}];
  if(state.page==='levels'){const level=levels.find(level=>level.slug===state.level);crumbs.push({label:`World ${level.world}`,href:`#levels/${level.world}`},{label:`${level.slug}: ${level.name}`});}
  if(state.page==='leaderboard')crumbs.push({label:currentCategory().name});
  document.querySelector('#breadcrumbs').innerHTML=crumbs.map((crumb,index)=>`<li>${index?'<span class="breadcrumb-separator" aria-hidden="true">/</span>':''}${index===crumbs.length-1?`<strong aria-current="page">${escapeHtml(crumb.label)}</strong>`:`<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>`}</li>`).join('');
  document.querySelectorAll('[data-page]').forEach(link=>{const active=link.dataset.page===state.page||(link.dataset.page==='leaderboard'&&['levels','rules'].includes(state.page));link.classList.toggle('active',active);active?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current');});
  const openGroups=new Set(Array.from(document.querySelectorAll('#category-nav details[open]'),group=>group.dataset.group));
  document.querySelector('#category-nav').innerHTML=groupedCategories(cat=>`<a href="#leaderboard/${cat.slug}" class="${state.page==='leaderboard'&&state.category===cat.slug?'selected':''}" ${state.page==='leaderboard'&&state.category===cat.slug?'aria-current="page"':''}>${cat.label}</a>`,openGroups)+levelNavigation(openGroups);
  document.querySelector('#account-button').textContent=saved.viewer?`${saved.viewer} ↗`:'Sign in ↗';
  if(state.page==='home')renderHome();
  else if(state.page==='leaderboard'||state.page==='levels')renderLeaderboard();
  else if(state.page==='runners')renderRunners();
  else if(state.page==='rules')renderRules();
  else renderMyRuns();
}
function levelNavigation(openGroups){
  return `<details class="category-group individual-level-group" data-group="levels" ${openGroups.has('levels')?'open':''}><summary class="category-group-label ${state.page==='levels'?'selected':''}">Individual Levels</summary><div class="category-group-items"><a href="#levels">All levels</a>${Array.from({length:6},(_,i)=>i+1).map(world=>`<a href="#levels/${world}/${world}-1/${state.levelCategory}">World ${world}</a>`).join('')}</div></details>`;
}
function leaderboardNavigation(){
  return `<nav class="leaderboard-navigation" aria-label="Leaderboard navigation">${[{page:'leaderboard',label:'Full game',href:`#leaderboard/${state.category}`},{page:'levels',label:'Individual levels',href:`#levels/${levels.find(level=>level.slug===state.level).world}/${state.level}/${state.levelCategory}`},{page:'rules',label:'Rules',href:'#rules'}].map(item=>`<a href="${item.href}" class="${state.page===item.page?'active':''}" ${state.page===item.page?'aria-current="page"':''}>${item.label}</a>`).join('')}</nav>`;
}
function levelSelector(board){
  const level=levels.find(level=>level.slug===board.level);
  return `<div class="category-tabs" role="group" aria-label="World">${Array.from({length:6},(_,i)=>i+1).map(world=>`<a href="#levels/${world}/${world}-1/${board.mode}" class="${world===board.world?'active':''}" ${world===board.world?'aria-current="true"':''}>World ${world}</a>`).join('')}</div>
  <div class="subcategory-tabs level-tabs" role="group" aria-label="Level">${levels.filter(level=>level.world===board.world).map(level=>`<a href="#levels/${board.world}/${level.slug}/${board.mode}" class="${level.slug===board.level?'active':''}" ${level.slug===board.level?'aria-current="true"':''}>${level.slug}${level.slug.endsWith('E')?' · Extra':''}</a>`).join('')}</div>
  <div class="level-heading"><h3>${level.slug}: ${escapeHtml(level.name)}</h3><a class="text-button" href="https://www.speedrun.com/yi/levels" target="_blank" rel="noopener noreferrer">Speedrun.com ↗</a></div>
  <div class="subcategory-tabs" role="group" aria-label="Level category">${levelCategories.map(category=>`<a href="#levels/${board.world}/${board.level}/${category.slug}" class="${category.slug===board.mode?'active':''}" ${category.slug===board.mode?'aria-current="true"':''}>${category.name}</a>`).join('')}</div>`;
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
  const cat=currentCategory();const board=bestRuns(cat.slug,state.region);const filtered=board.filter(r=>r.runner.toLowerCase().includes(state.search.toLowerCase()));
  const rows=filtered.map(run=>`<tr class="${run.rank===1?'record':''}"><td><span class="rank ${run.rank===1?'first':''}">${run.rank===1?'♛ ':''}${run.rank}</span></td><td>${profileButton(run.runner)}</td><td><button class="time-button" data-run="${run.id}">${formatTime(run.timeMs)}</button></td><td class="platform-col"><span class="platform">${run.platform}</span></td><td class="region-col"><span class="region">${run.region}</span></td><td><span class="run-date">${dateLabel(run.date)}</span></td><td><button class="watch" data-run="${run.id}" aria-label="View ${escapeHtml(run.runner)}’s run">↗</button></td></tr>`).join('');
  main.innerHTML=`${leaderboardNavigation()}<div class="page-heading"><div><h2>${state.page==='levels'?'Individual levels':'Leaderboards'}</h2></div><button class="button" data-submit><span aria-hidden="true">＋</span> Submit a run</button></div>
  <div class="layout"><section class="board" aria-label="${cat.name} leaderboard">${state.page==='levels'?levelSelector(cat):categorySelector(cat)}
  <div class="board-toolbar"><div class="filters"><select id="region-filter" class="filter-select" aria-label="Filter by region"><option value="all">All regions</option>${['NTSC-U','NTSC-J','PAL'].map(r=>`<option ${state.region===r?'selected':''}>${r}</option>`).join('')}</select><span class="platform">RTA</span></div><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="runner-search" aria-label="Search runners" placeholder="Find a runner…" value="${escapeHtml(state.search)}"></label></div>
  <div class="table-wrap"><table><thead><tr><th scope="col">RANK</th><th scope="col">RUNNER</th><th scope="col">TIME</th><th scope="col" class="platform-col">PLATFORM</th><th scope="col" class="region-col">REGION</th><th scope="col">DATE</th><th scope="col"><span class="sr-only">Details</span></th></tr></thead><tbody>${rows}</tbody></table>${!filtered.length?'<div class="empty"><h3>No runners found</h3><p>Try another name or region.</p><button class="button secondary" data-clear>Clear filters</button></div>':''}</div>
  </section>
  <aside class="side-panel">
  <section class="panel"><h3>Recent verified runs</h3><div class="activity">${allRuns().filter(r=>r.status==='verified'&&r.category===cat.slug).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(r=>`<div class="activity-row">${avatar(r.runner)}<div><button class="text-button" data-profile="${escapeHtml(r.runner)}">${escapeHtml(r.runner)}</button><p>${formatTime(r.timeMs)} · ${cat.name}</p><small>${dateLabel(r.date)}</small></div></div>`).join('')}</div></section>
  </aside></div>`;
  document.querySelector('#region-filter').addEventListener('change',event=>{state.region=event.target.value;renderLeaderboard();});
  document.querySelector('#runner-search').addEventListener('input',event=>{const position=event.target.selectionStart;state.search=event.target.value;renderLeaderboard();const input=document.querySelector('#runner-search');input.focus();input.setSelectionRange(position,position);});
}
function renderRunners(){main.innerHTML=`<div class="page-heading"><div><h2>Runners</h2></div><button class="button" data-submit>Submit a run</button></div><div class="runner-grid">${[...new Set(allRuns().filter(r=>r.status==='verified').map(r=>r.runner))].map(name=>`<button class="runner-card" data-profile="${escapeHtml(name)}">${avatar(name,true)}<span><strong>${escapeHtml(name)}</strong><p>${escapeHtml(runners.find(r=>r.name===name)?.country||'Community runner')}</p><p>${allRuns().filter(r=>r.runner===name&&r.status==='verified').length} verified runs <span aria-hidden="true">↗</span></p></span></button>`).join('')}</div>`;}
function renderRules(){main.innerHTML=`${leaderboardNavigation()}<div class="page-heading"><div><h2>Rules & resources</h2></div></div><section class="content-card"><div class="notice">Category rules are not configured.</div><h3>Leaderboard conventions</h3><p class="subtext">SNES and emulator runs share a leaderboard. Times use RTA to the millisecond. Equal times share a rank (1, 1, 3). Each board shows one best verified run per runner, with previous runs kept in their history.</p>${categories.map(cat=>`<article class="rule-block" id="rule-${cat.slug}"><h3>${cat.name}</h3><p>Rules pending.</p><button class="text-button" data-category="${cat.slug}">Leaderboard ↗</button></article>`).join('')}</section>`;}
function renderMyRuns(){const own=saved.runs.filter(r=>r.runner===saved.viewer).sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt));main.innerHTML=`<div class="page-heading"><div><h2>My submissions</h2></div><button class="button" data-submit>Submit a run</button></div><div class="notice">Demo moderation</div><section class="board">${own.length?`<div class="table-wrap"><table><thead><tr><th>CATEGORY</th><th>TIME</th><th>DATE</th><th>STATUS</th><th>PREVIEW REVIEW</th></tr></thead><tbody>${own.map(r=>`<tr><td>${boards.find(c=>c.slug===r.category).name}</td><td><button class="time-button" data-run="${r.id}">${formatTime(r.timeMs)}</button></td><td class="run-date">${dateLabel(r.date)}</td><td><span class="status ${r.status}">${r.status[0].toUpperCase()+r.status.slice(1)}</span></td><td>${r.status==='pending'?`<button class="text-button" data-verify="${r.id}">Verify</button> · <button class="text-button" data-reject="${r.id}">Reject</button>`:'<span class="subtext">Reviewed</span>'}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty"><h3>No submissions</h3><button class="button" data-submit>Submit a run</button></div>`}</section>`;}
function openModal(title,body){document.querySelector('#modal-content').innerHTML=`<div class="modal-header"><h2 id="dialog-title">${title}</h2><button class="close-button" data-close aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div>`;if(!modal.open)modal.showModal();}
function profile(name){const runs=allRuns().filter(r=>r.runner===name&&r.status==='verified');const pbs=boards.map(cat=>({cat,run:bestRuns(cat.slug).find(r=>r.runner===name)})).filter(x=>x.run);openModal('Runner profile',`<div class="profile-heading">${avatar(name,true)}<div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(runners.find(r=>r.name===name)?.country||'Community runner')}</p></div></div><div class="metric-grid"><div class="metric"><strong>${runs.length}</strong>Verified runs</div><div class="metric"><strong>${pbs.length}</strong>Category PBs</div><div class="metric"><strong>${pbs.filter(x=>x.run.rank===1).length}</strong>Category records</div></div><h3>Personal bests</h3><div class="pb-list">${pbs.map(({cat,run})=>`<button class="text-button pb-row" data-run="${run.id}"><span>${cat.name} <small>· #${run.rank}</small></span><strong>${formatTime(run.timeMs)} ↗</strong></button>`).join('')||'<p class="subtext">No verified PBs yet.</p>'}</div><h3>Run history</h3><div class="pb-list">${runs.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<button class="text-button pb-row" data-run="${r.id}"><span>${dateLabel(r.date)} · ${boards.find(c=>c.slug===r.category).name}</span><strong>${formatTime(r.timeMs)}</strong></button>`).join('')}</div>`);}
function runDetails(id){const run=allRuns().find(r=>r.id===id);if(!run)return;const cat=boards.find(c=>c.slug===run.category);const pb=bestRuns(run.category).find(r=>r.runner===run.runner);const earlier=allRuns().filter(r=>r.runner===run.runner&&r.category===run.category&&r.status==='verified'&&r.date<run.date).sort((a,b)=>a.timeMs-b.timeMs)[0];openModal('Run details',`<div class="profile-heading">${avatar(run.runner)}<div><button class="text-button" data-profile="${escapeHtml(run.runner)}">${escapeHtml(run.runner)} ↗</button><p>${cat.name}</p></div></div><div class="detail-time">${formatTime(run.timeMs)}</div><span class="status ${run.status}">${run.status[0].toUpperCase()+run.status.slice(1)}</span><dl class="detail-grid"><div><dt>Rank</dt><dd>${run.status==='verified'?(pb?.id===id?`#${pb.rank}`:'Previous verified run'):(run.status==='rejected'?'Not ranked':'Awaiting verification')}</dd></div><div><dt>Run date</dt><dd>${escapeHtml(run.date)}</dd></div><div><dt>Platform</dt><dd>${escapeHtml(run.platform)}</dd></div><div><dt>Region</dt><dd>${escapeHtml(run.region)}</dd></div><div><dt>Timing method</dt><dd>RTA · milliseconds</dd></div><div><dt>Reviewed by</dt><dd>${escapeHtml(run.reviewer||'Not reviewed yet')}</dd></div></dl>${earlier&&run.timeMs<earlier.timeMs?`<div class="notice">Improvement over previous PB: ${formatTime(earlier.timeMs-run.timeMs)}</div>`:''}${run.rejectionReason?`<div class="notice">Rejection reason: ${escapeHtml(run.rejectionReason)}</div>`:''}<p>${escapeHtml(run.comment)}</p>${run.sample?'<div class="notice">Sample run · No video</div>':runVideo(run.video)}`);}
function submitForm(){openModal('Submit a run',`<p>Demo submissions are stored in this browser.</p><form id="submit-form"><div id="form-error" role="alert"></div><div class="form-grid"><label class="field full">Runner name<input name="runner" required maxlength="24" value="${escapeHtml(saved.viewer)}" placeholder="Your runner name" autocomplete="nickname"></label><label class="field full">Board type<select id="submission-type"><option value="full">Full game</option><option value="level" ${state.page==='levels'?'selected':''}>Individual level</option></select></label><div class="field full" id="submission-board-fields"></div><label class="field">RTA time<input name="time" required placeholder="2:06:31.420" aria-describedby="time-help"><small id="time-help">H:MM:SS.mmm, MM:SS.mmm or SS.mmm</small></label><div class="field"><label for="run-date">Run date</label><div class="date-control"><input id="run-date" name="date" type="date" required max="2026-10-07" value="2026-10-07"><button type="button" id="date-toggle" popovertarget="run-calendar" aria-label="Choose run date">▦</button></div><section id="run-calendar" class="date-calendar" popover aria-label="Choose run date"></section></div><label class="field">Platform<select name="platform"><option>SNES</option><option>Emulator</option></select></label><label class="field">Region<select name="region"><option>NTSC-U</option><option>NTSC-J</option><option>PAL</option></select></label><label class="field full">Video URL<input name="video" type="url" required placeholder="https://www.youtube.com/watch?v=…"><small>A public YouTube or Twitch link.</small></label><label class="field full">Comment <small>(optional)</small><textarea name="comment" maxlength="1000" placeholder="Comment"></textarea></label></div><div class="form-actions"><button type="button" class="button secondary" data-close>Cancel</button><button type="submit" class="button">Submit for review ↗</button></div></form>`);renderSubmissionBoardFields();setupRunDatePicker();document.querySelector('[name="time"]').addEventListener('blur',event=>{event.target.value=normalizeTime(event.target.value);});document.querySelector('#submission-type').addEventListener('change',renderSubmissionBoardFields);document.querySelector('#submit-form').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const timeMs=parseTime(data.time);let error='';let url;try{url=new URL(data.video);}catch{}if(!data.runner.trim())error='Please enter a runner name.';else if(!boards.some(board=>board.slug===data.category))error='Please select a leaderboard.';else if(!timeMs)error='Use a positive time such as 2:06:31.420 or 48:12.050.';else if(data.date>'2026-10-07')error='The run date cannot be in the future.';else if(!videoEmbedUrl(data.video))error='Please use a YouTube video, Twitch VOD or Twitch clip URL.';if(error){document.querySelector('#form-error').innerHTML=`<p class="error">${error}</p>`;return;}saved.viewer=data.runner.trim();saved.runs.push({id:`demo-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,runner:saved.viewer,category:data.category,timeMs,date:data.date,platform:data.platform,region:data.region,video:url.href,comment:data.comment,status:'pending',submittedAt:new Date().toISOString()});persist();modal.close();location.hash='my-runs';state.page='my-runs';render();toast('Run submitted · Pending');});}
function account(){openModal(saved.viewer?'Demo account':'Demo account',saved.viewer?`<div class="profile-heading">${avatar(saved.viewer,true)}<div><h3>${escapeHtml(saved.viewer)}</h3><p>Local demo session</p></div></div><p>Demo session · No authentication</p><div class="form-actions"><button class="button secondary" id="sign-out">Sign out</button><button class="button" data-my-runs>My submissions</button></div>`:`<p>Demo session · No authentication</p><form id="account-form"><label class="field">Runner name<input name="name" required maxlength="24" placeholder="Runner name" autocomplete="nickname"></label><div class="form-actions"><button class="button" type="submit">Enter demo ↗</button></div></form>`);document.querySelector('#account-form')?.addEventListener('submit',event=>{event.preventDefault();const name=new FormData(event.target).get('name').trim();if(!name)return;saved.viewer=name;persist();modal.close();render();toast('Demo session started.');});document.querySelector('#sign-out')?.addEventListener('click',()=>{saved.viewer='';persist();modal.close();render();toast('Signed out.');});}
let toastTimer;function toast(message){const element=document.querySelector('#toast');element.textContent=message;element.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),4000);}
document.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;
  if(target.hasAttribute('data-close'))modal.close();
  else if(target.hasAttribute('data-submit'))submitForm();
  else if(target.dataset.category){state.category=target.dataset.category;state.region='all';state.search='';state.page='leaderboard';modal.close();location.hash=`leaderboard/${state.category}`;render();}
  else if(target.dataset.profile)profile(target.dataset.profile);
  else if(target.dataset.run)runDetails(target.dataset.run);
  else if(target.dataset.rules){location.hash='rules';state.page='rules';render();document.querySelector(`#rule-${target.dataset.rules}`).scrollIntoView({behavior:'smooth',block:'center'});}
  else if(target.hasAttribute('data-clear')){state.region='all';state.search='';render();}
  else if(target.hasAttribute('data-my-runs')){modal.close();location.hash='my-runs';}
  else if(target.dataset.verify){const run=saved.runs.find(r=>r.id===target.dataset.verify);if(run){run.status='verified';run.reviewer='Demo moderator';persist();render();toast('Run verified.');}}
  else if(target.dataset.reject){const id=target.dataset.reject;openModal('Preview rejection',`<form id="reject-form"><label class="field">Reason<textarea name="reason" required maxlength="500" placeholder="Explain what needs to be corrected."></textarea></label><div class="form-actions"><button class="button secondary" type="button" data-close>Cancel</button><button class="button danger">Reject run</button></div></form>`);document.querySelector('#reject-form').addEventListener('submit',event=>{event.preventDefault();const reason=new FormData(event.target).get('reason').trim();if(!reason)return;const run=saved.runs.find(r=>r.id===id);run.status='rejected';run.reviewer='Demo moderator';run.rejectionReason=reason;persist();modal.close();render();toast('Run rejected.');});}
});
modal.addEventListener('click',event=>{if(event.target===modal){const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)modal.close();}});
document.querySelector('#account-button').addEventListener('click',account);
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
  return `<div class="run-video"><iframe src="${escapeHtml(src)}" title="Submission video" allow="fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div><a class="text-button video-link" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">Open video ↗</a>`;
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
  window.scrollTo(0,0);
  const [page,category,levelSlug,mode]=location.hash.slice(1).split('/');
  state.page=['leaderboard','levels','runners','rules','my-runs'].includes(page)?page:'leaderboard';
  if(state.page==='levels'){
    const world=Number(category);
    const level=levels.find(level=>level.slug===levelSlug&&level.world===world)||levels.find(level=>level.world===world)||levels.find(level=>level.slug===state.level);
    state.level=level.slug;
    if(levelCategories.some(category=>category.slug===mode))state.levelCategory=mode;
    state.region='all';state.search='';
  }else if(category&&categories.some(c=>c.slug===category)){state.category=category;state.region='all';state.search='';}
  render();
}
window.addEventListener('hashchange',route);route();

globalThis.YOSHI_MOCK_DATA = (() => {
const categories = ["100-percent","warpless","warps","magical-journey","credits-warp","beat-bowser","no-ace","reverse-boss-order","100-percent-no-restrictions"].map(slug=>({slug}));
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
  timeMs:baseTimes[c]+(i*42317+c*i*317),
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
  timeMs:24000+(c%9)*17321+(board.mode==='100'?65000:0)+(i*1237),
  date:`2026-09-${String(20-i).padStart(2,'0')}`,platform:i%2?'Emulator':'SNES',
  region:['NTSC-U','NTSC-J','PAL'][i%3],video:'',comment:'',status:'verified',reviewer:'Community moderator',sample:true,
}))));
return {enabled:true,runs:sampleRuns};
})();

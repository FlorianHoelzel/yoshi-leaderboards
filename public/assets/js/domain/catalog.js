// Board configuration and category rules. Load after levels.js.
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
const categoryGroups=['All Main Stages','100%','Any%'].map(name=>({name,categories:categories.filter(cat=>cat.group===name)}));

const startRule='Start timing when selecting a new file.';
const bowserEnd='Stop timing on the first frame of Bowser’s explosion.';
const mainStagesRule='Enter stages 1–8 in each of the six worlds from the world map and finish each with a score.';
const hundredRules=['Score 100 on every stage, including all Extra stages.'];
const hundredTiming=[startRule,'Stop timing when the final completed stage’s card flips over.'];
const categoryRules={
  'warpless':{source:'zd37zv2n-onvxxw58.q75pnjy1',requirements:[mainStagesRule],timing:[startRule,'Stop timing on the final input advancing the last text box after defeating Bowser (JRTA).'],bans:['Resets, 1-1 warps, Tongue Glitch, Null Egg Glitch, and arbitrary code execution (ACE).']},
  'warps':{source:'zd37zv2n-onvxxw58.qke5rjyq',requirements:[mainStagesRule],timing:[startRule,bowserEnd],bans:['Null Egg Glitch and arbitrary code execution (ACE).']},
  'magical-journey':{source:'zd37zv2n-onvxxw58.1gn5jvnl',requirements:[mainStagesRule],timing:[startRule,bowserEnd],bans:['Save corruption and arbitrary code execution (ACE).']},
  '100-percent':{source:'9d8gzlkn-yn2kk2jn.1w49mp5q',requirements:hundredRules,timing:hundredTiming,bans:['1-1 warps, Tongue Glitch, Null Egg Glitch, and arbitrary code execution (ACE).'],verification:['After finishing, check scores in every world, or reset and show the six stars on the title screen. This verification is recommended by speedrun.com.']},
  '100-percent-no-restrictions':{source:'9d8gzlkn-yn2kk2jn.qox9yp2q',requirements:hundredRules,timing:hundredTiming},
  'credits-warp':{source:'z27qx5k0-jlz0r082.jq6v2ro1',timing:[startRule,'Stop timing once the screen is fully black before the credits.']},
  'beat-bowser':{source:'z27qx5k0-jlz0r082.jqz7g9gl',timing:[startRule,bowserEnd]},
  'no-ace':{source:'z27qx5k0-jlz0r082.klr3ydwl',timing:[startRule,bowserEnd],bans:['Arbitrary code execution (ACE).']},
  'reverse-boss-order':{source:'z27qx5k0-jlz0r082.lmopxk41',requirements:['Defeat each boss once in reverse order, from 6-8 to 1-4, then warp to the credits.','A boss defeat counts at the first explosion frame; resetting from that point is allowed.'],timing:[startRule,'Stop timing once the screen is fully black before the credits.']},
};
const levelRules={
  timing:['Start timing on the frame the “10” appears.','Stop timing when Yoshi first starts throwing Baby Mario into the goal ring and the camera resumes moving right, or at the first boss explosion frame in boss stages.'],
  bans:['No strategies may depend on setup performed before timing starts.','Do not use eggs or items collected before timing starts.','Do not use Tongue Glitch Cancels that depend on pre-initializing the goal Yoshi sprite slot.','Do not execute ACE payloads written partly before timing starts, or execute ACE before timing to alter routines or stage data.'],
};

importScripts('runs.js','ratings.js','recommendations.js');
self.onmessage=({data})=>{
  try{
    const result=overallRunRecommendations(data.runs,data.boards,data.name,data.options,(completed,total)=>self.postMessage({type:'progress',completed,total}));
    self.postMessage({type:'result',result});
  }catch{
    self.postMessage({type:'error'});
  }
};

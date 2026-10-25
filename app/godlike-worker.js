/* Only receives RoyaleGodlikePolicy.observe(): current hands, wounds and active attack. */
'use strict';
importScripts('../gamecore.js','../sdk/godlike-policy.js?v=godlike1');
self.onmessage=({data})=>{
  try{
    const started=performance.now(),result=RoyaleGodlikePolicy.search(data.observation);
    self.postMessage({id:data.id,...result,version:RoyaleGodlikePolicy.version,searchMs:performance.now()-started});
  }catch(error){self.postMessage({id:data.id,error:error.message});}
};

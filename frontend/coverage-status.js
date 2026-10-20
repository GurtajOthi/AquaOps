(function(root){
 'use strict';
 const defaults={criticalWithinMinutes:120};
 function policy(state){return state.coveragePolicy||defaults;}
 function assess(slot,requests=[],settings=defaults,now=Date.now(),{filled=false,sourceId='',interval=slot}={}){
  const start=Date.parse(interval.start),end=Date.parse(interval.end),minutes=Math.ceil((start-now)/60000),active=start<=now&&end>now,critical=active||(end>now&&minutes<=settings.criticalWithinMinutes),matching=requests.filter(r=>r.targetId===slot.id&&(r.sourceId||'')===sourceId&&r.payload?.start===slot.start&&r.payload?.end===slot.end&&r.payload?.location===slot.location&&(r.payload?.requirements||'')===(slot.requirements||''));
  const awaiting=matching.filter(r=>(r.kind==='Offer'&&r.status==='Accepted')||(r.kind==='Volunteer'&&r.status==='Pending')),offered=matching.filter(r=>r.kind==='Offer'&&r.status==='Offered');
  const urgency=active?'Active gap':critical?'Starts soon':'Upcoming gap',timing=active?'Coverage period is active':end<=now?'Coverage period has ended':`Starts in ${Math.max(0,minutes)} minutes; critical window ${settings.criticalWithinMinutes} minutes`;
  if(filled)return {status:'resolved',tone:'green',label:'Resolved coverage',critical:false,reason:'Configured coverage is filled by the saved schedule',offered:0,awaiting:0};
  if(end<=now)return {status:'past',tone:'muted',label:'Past unfilled interval',critical:false,reason:timing,offered:0,awaiting:0};
  const unresolved=sourceId?'replacement requested':'still unfilled';return {status:awaiting.length?'awaiting-approval':offered.length?'offered':critical?'critical':'upcoming',tone:awaiting.length||offered.length?'orange':'red',label:awaiting.length?'Awaiting approval — '+unresolved:offered.length?'Offer pending — '+unresolved:critical?active?'Critical · active gap':'Critical · starts soon':'Upcoming · unfilled',critical,urgency,reason:timing,offered:offered.length,awaiting:awaiting.length};
 }
 const api={defaults,policy,assess};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AquaCoverageStatus=api;
})(typeof globalThis!=='undefined'?globalThis:this);

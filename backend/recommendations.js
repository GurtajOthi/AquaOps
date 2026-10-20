'use strict';
// Explainable scheduling fit, not a probability, credential verification or AI model.
const M=require('../frontend/model');
function evaluateCandidate(state,person,slot,preferences={locations:'',weeklyHours:0}){
  const issues=M.schedulingIssues(state,person.id,slot,{explicitAvailability:true});
  if(Date.parse(slot.end)<=Date.now())issues.push('Coverage period has ended');
  const policy=state.schedulingPolicy||{maxWeeklyHours:0,minRestHours:0,eligibility:[]};
  const monday=new Date(slot.start);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
  const until=new Date(monday);until.setDate(until.getDate()+7);
  const others=state.shifts.filter(s=>s.staffId===person.id&&s.id!==slot.id),duration=(Date.parse(slot.end)-Date.parse(slot.start))/3600000;
  const hours=others.reduce((sum,s)=>sum+Math.max(0,Math.min(Date.parse(s.end),until.getTime())-Math.max(Date.parse(s.start),monday.getTime()))/3600000,0);
  const conflicts=others.filter(s=>M.overlaps(s,slot)).map(s=>({start:s.start,end:s.end,location:s.location}));
  const rest=others.map(s=>Date.parse(s.end)<=Date.parse(slot.start)?(Date.parse(slot.start)-Date.parse(s.end))/3600000:Date.parse(s.start)>=Date.parse(slot.end)?(Date.parse(s.start)-Date.parse(slot.end))/3600000:0);
  const nearestRestHours=rest.length?Math.floor(Math.min(...rest)*100)/100:null;
  const preferredArea=M.requirements(preferences.locations).includes(slot.location.trim().toLowerCase());
  const withinPreferredHours=!preferences.weeklyHours||hours+duration<=preferences.weeklyHours;
  const referenceHours=policy.maxWeeklyHours||40,points={workload:Math.round(70*Math.max(0,1-hours/referenceHours)),preferredHours:withinPreferredHours?20:0,preferredArea:!preferences.locations.trim()||preferredArea?10:0};
  const checks=[
    {name:'Active employee',passed:person.status!=='Inactive',detail:person.status==='Inactive'?'Inactive employee':'Active record'},
    {name:'Qualifications',passed:!M.missingQualifications(state,person.id,slot).length,detail:slot.requirements?`Required through ${slot.end.slice(0,10)}: ${M.requirements(slot.requirements).join(', ')}`:'No required qualifications configured; supervisor must review'},
    {name:'Availability',passed:!issues.some(i=>/availability|unavailable/i.test(i)),detail:'Confirmed availability must cover the entire period; unavailable periods take precedence'},
    {name:'Scheduling conflicts',passed:!conflicts.length,detail:conflicts.length?conflicts.map(s=>`${s.start} – ${s.end} · ${s.location}`).join('; '):'No overlapping assigned shifts'},
    {name:'Rest requirement',passed:!issues.includes('Minimum rest period not met'),detail:`${policy.minRestHours?policy.minRestHours+'h minimum':'No minimum rest configured'}; ${nearestRestHours===null?'no adjacent assignments':nearestRestHours+'h to nearest assignment'}`},
    {name:'Weekly hour limit',passed:!issues.includes('Configured weekly hour limit exceeded'),detail:`${Math.round(hours*10)/10}h scheduled in week of ${monday.toLocaleDateString()}; +${Math.round(duration*10)/10}h proposed. ${policy.maxWeeklyHours?policy.maxWeeklyHours+'h limit checked in every overlapping week':'No maximum configured'}`},
    {name:'Facility area',passed:!issues.includes('Employee is not eligible for this coverage area'),detail:'Checked against configured employee area restrictions'}
  ];
  const eligible=!issues.length,matchScore=eligible?Object.values(points).reduce((a,b)=>a+b,0):null;
  const scoreExplanation=`Workload ${points.workload}/70 (${Math.round(hours*10)/10}h / ${referenceHours}h scoring reference); preferred weekly hours ${points.preferredHours}/20 (${preferences.weeklyHours?preferences.weeklyHours+'h preferred':'no preference'}); area preference ${points.preferredArea}/10 (${preferences.locations||'no preference'}).`;
  return {staffId:person.id,name:person.name,eligible,issues,scheduledHours:Math.round(hours*10)/10,proposedHours:Math.round(duration*10)/10,nearestRestHours,preferredArea,withinPreferredHours,qualifications:M.currentQualifications(state,person.id).map(q=>({name:q.name,expiry:q.expiry})),checks,conflicts,matchScore,scoreBreakdown:{...points,referenceHours},explanation:eligible?`Qualified, available for the entire period, no recorded conflicts; ${Math.round(hours*10)/10} hours scheduled this week. ${scoreExplanation} Preferences never override mandatory rules.`:issues.join('; '),scoreExplanation};
}
function rankCandidates(rows){return rows.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||(b.matchScore??-1)-(a.matchScore??-1)||a.scheduledHours-b.scheduledHours||a.name.localeCompare(b.name)).map((r,i,all)=>({...r,rank:r.eligible?all.slice(0,i+1).filter(c=>c.eligible).length:null}));}
module.exports={evaluateCandidate,rankCandidates};

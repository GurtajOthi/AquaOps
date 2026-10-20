(function(root){
  'use strict';
  // Local civil-time geometry. Dates are advanced by calendar day, never by 24h milliseconds.
  const dateKey=d=>`${String(d.getFullYear()).padStart(4,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
  function addDays(date,count){if(!validDate(date))throw Error('Choose a valid schedule date.');const d=new Date(date+'T12:00');d.setDate(d.getDate()+count);return dateKey(d);}
  function range(date,mode='Week'){if(!validDate(date))throw Error('Choose a valid schedule date.');const d=new Date(date+'T12:00'),first=mode==='Day'?date:addDays(date,-((d.getDay()+6)%7)),days=mode==='Day'?1:7;return {first,last:addDays(first,days-1),end:addDays(first,days),dates:Array.from({length:days},(_,i)=>addDays(first,i))};}
  const minute=value=>Number(value.slice(11,13))*60+Number(value.slice(14,16));
  function split(event,dates){return dates.flatMap(date=>{const from=date+'T00:00',to=addDays(date,1)+'T00:00';if(event.start>=to||event.end<=from)return [];const start=event.start<from?0:minute(event.start),end=event.end>=to?1440:minute(event.end);if(end<=start)return [];return [{...event,date,startMinute:start,endMinute:end,continuedBefore:event.start<from,continuedAfter:event.end>to}];});}
  function layout(segments){
    const sorted=segments.map(s=>({...s})).sort((a,b)=>a.startMinute-b.startMinute||a.endMinute-b.endMinute||String(a.key).localeCompare(String(b.key)));let group=[],groupEnd=-1,lanes=[];
    const finish=()=>{for(const s of group){s.lanes=lanes.length;s.span=1;for(let lane=s.lane+1;lane<lanes.length;lane++){if(group.some(other=>other.lane===lane&&other.startMinute<s.endMinute&&s.startMinute<other.endMinute))break;s.span++;}}group=[];lanes=[];};
    for(const s of sorted){if(group.length&&s.startMinute>=groupEnd)finish();if(!group.length)groupEnd=-1;let lane=lanes.findIndex(end=>end<=s.startMinute);if(lane<0)lane=lanes.length;lanes[lane]=s.endMinute;s.lane=lane;group.push(s);groupEnd=Math.max(groupEnd,s.endMinute);}finish();return sorted;
  }
  const transitionCache=new Map();
  function transitions(date){
    if(transitionCache.has(date))return transitionCache.get(date);
    const from=new Date(date+'T00:00'),until=new Date(addDays(date,1)+'T00:00'),changes=[];let previous=from.getTimezoneOffset();
    for(let at=from.getTime()+60000;at<=until.getTime();at+=60000){const d=new Date(at),offset=d.getTimezoneOffset();if(offset===previous)continue;const delta=previous-offset,end=d.getHours()*60+d.getMinutes();changes.push({kind:delta>0?'skipped':'repeated',start:delta>0?end-delta:end,end:delta>0?end:end-delta,minutes:Math.abs(delta)});previous=offset;}
    const result={hours:(until-from)/3600000,changes};if(transitionCache.size>=128)transitionCache.delete(transitionCache.keys().next().value);transitionCache.set(date,result);return result;
  }
  function timeReview(event){
    const dates=[...new Set([event.start.slice(0,10),event.end.slice(0,10)])],warnings=[];
    for(const date of dates)for(const t of transitions(date).changes)for(const [label,value]of [['start',event.start],['end',event.end]])if(value.slice(0,10)===date&&minute(value)>=t.start&&minute(value)<t.end)warnings.push(t.kind==='skipped'?`Shift ${label} is in a skipped local hour; review the saved time`:`Shift ${label} is in a repeated local hour; no UTC offset is stored, so the occurrence is ambiguous`);
    const elapsed=(Date.parse(event.end)-Date.parse(event.start))/3600000;
    return {warnings:[...new Set(warnings)],elapsedHours:warnings.length?null:elapsed};
  }
  const areaTone=area=>{let hash=0;for(const char of area.trim().toLowerCase())hash=(hash*31+char.charCodeAt(0))>>>0;return hash%8;};
  const api={dateKey,validDate,addDays,range,minute,split,layout,transitions,timeReview,areaTone};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AquaCalendarModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);

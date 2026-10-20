(function(root){
  'use strict';
  const schemas = {
    tasks: {name:['Task name','text',true],status:['Status',['Scheduled','Confirmed','In Progress','Completed']],priority:['Priority',['Normal','Low','High']],due:['Due date','date'],owner:['Assigned employee','text'],category:['Category',['Maintenance','Safety','Inspection','General']]},
    reports: {category:['Category',['Incident','Maintenance','Inspection']],title:['Title','text',true],owner:['Recorded by','text',true],notes:['Details','textarea',true]},
    documents: {name:['Document name','text',true],category:['Category','text',true],url:['Document URL (http or https)','url',true]},
    inventory: {name:['Supply or equipment','text',true],quantity:['Quantity','number',true,0],unit:['Unit','text',true],threshold:['Restock threshold','number',true,0]},
    chemistry: {chlorine:['Free chlorine (ppm)','number',true,0],ph:['pH','number',true,0,14],temperature:['Temperature (°C)','number',true],alkalinity:['Alkalinity (ppm)','number',true,0],notes:['Notes','text'],measuredAt:['Measured at (optional)','datetime-local']},
    staff: {name:['Name','text',true],role:['Employee role','text',true],email:['Contact email','text'],notes:['Qualifications / notes','textarea'],status:['Employment status',['Active','Inactive']]},
    qualifications: {staffId:['Employee','text',true],name:['Certification / qualification','text',true],expiry:['Expiration date','date',true],reference:['Credential reference','text']},
    shifts: {staffId:['Employee','text',true],start:['Shift start','datetime-local',true],end:['Shift end','datetime-local',true],location:['Coverage area','text',true],requirements:['Required certifications (one per line)','textarea']},
    availability: {staffId:['Employee','text',true],start:['Window start','datetime-local',true],end:['Window end','datetime-local',true],type:['Availability',['Available','Unavailable']],notes:['Notes','textarea']},
    coverage: {location:['Coverage area','text',true],start:['Coverage start','datetime-local',true],end:['Coverage end','datetime-local',true],minimum:['Minimum qualified staff','number',true,1,50],requirements:['Required certifications (one per line)','textarea']},
    thresholds: {measurement:['Measurement',['chlorine','ph','temperature','alkalinity']],minimum:['Facility minimum','number',true],maximum:['Facility maximum','number',true],notes:['Facility procedure / rationale','textarea',true]},
    chemistryactions: {readingId:['Chemistry reading','text',true],action:['Corrective action / observation','textarea',true],owner:['Responsible employee','text'],due:['Follow-up task due (optional)','date']},
    incidents: {title:['Incident title','text',true],occurredAt:['Occurred at','datetime-local',true],location:['Location','text',true],severity:['Severity',['Low','Moderate','High']],description:['Incident details (minimum necessary)','textarea',true],response:['Immediate response','textarea',true],status:['Status',['Open','Under review','Closed']]},
    templates: {name:['Checklist name','text',true],items:['Checklist items (one per line)','textarea',true],nextDue:['Next inspection due','date',true]},
    equipment: {name:['Equipment name','text',true],status:['Status',['Running','Needs attention','Out of service']],notes:['Maintenance / status notes','textarea'],nextDue:['Next maintenance due','date']},
    facility: {name:['Facility name','text',true],status:['Operating status',['Not assessed','Open','Restricted','Closed']],notes:['Status / restriction notes','textarea',true],chemistryInterval:['Chemistry reminder interval (minutes, optional)','number',false,1,10080]}
  };
  const blank = () => ({version:4,...Object.fromEntries(Object.keys(schemas).map(k=>[k,[]])),adjustments:[],inspections:[],taskupdates:[],assignments:[]});
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const validId = value => typeof value==='string'&&/^[a-zA-Z0-9._-]{1,100}$/.test(value);
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  const safeUrl = s => {try{return ['http:','https:'].includes(new URL(s).protocol);}catch{return false;}};
  function validate(s){
    if (!s || s.version !== 4) throw Error('Unsupported workspace version.');
    for(const kind of Object.keys(schemas))if(!Array.isArray(s[kind]))throw Error(`Invalid ${kind} list.`);
    if(s.demo!==undefined&&typeof s.demo!=='boolean')throw Error('Invalid demo classification.');
    if(s.coveragePolicy!==undefined&&(!s.coveragePolicy||typeof s.coveragePolicy!=='object'||!Number.isInteger(s.coveragePolicy.criticalWithinMinutes)||s.coveragePolicy.criticalWithinMinutes<0||s.coveragePolicy.criticalWithinMinutes>10080))throw Error('Coverage urgency window must be a whole number from 0 to 10080 minutes.');
    if(s.setupDraft!==undefined){const d=s.setupDraft,keys=['name','areas','operatingHours','staffRoles','certificationRequirements','maintenanceCategories','inventoryCategories','notes','chemistryInterval'];if(!d||typeof d!=='object'||!d.fields||typeof d.fields!=='object'||Array.isArray(d.fields)||Object.entries(d.fields).some(([key,value])=>!keys.includes(key)||typeof value!=='string'||value.length>2000)||!Number.isInteger(d.step)||d.step<1||d.step>3||typeof d.updatedBy!=='string'||d.updatedBy.length>150||typeof d.updatedAt!=='string'||!Number.isFinite(Date.parse(d.updatedAt)))throw Error('Invalid saved facility setup draft.');}
    if(s.chemistryParameters!==undefined){if(!Array.isArray(s.chemistryParameters)||s.chemistryParameters.length>30)throw Error('Use at most 30 additional chemistry parameters.');const ids=new Set(),names=new Set();for(const p of s.chemistryParameters){if(!p||!validId(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>150||typeof p.unit!=='string'||!p.unit.trim()||p.unit.length>40||![p.minimum,p.maximum].every(Number.isFinite)||p.minimum>p.maximum||typeof p.notes!=='string'||!p.notes.trim()||p.notes.length>2000||typeof p.required!=='boolean'||typeof p.active!=='boolean')throw Error('Invalid additional chemistry parameter or reviewed limits.');ids.add(p.id);if(p.active){const name=p.name.trim().toLowerCase();if(names.has(name))throw Error('Active additional parameter names must be unique.');names.add(name);}}}
    if(s.facilitySetup!==undefined){if(!s.facilitySetup||typeof s.facilitySetup!=='object'||['areas','operatingHours','staffRoles','certificationRequirements','maintenanceCategories','inventoryCategories'].some(key=>typeof s.facilitySetup[key]!=='string'||s.facilitySetup[key].length>2000))throw Error('Invalid facility setup.');}
    if(s.schedulingPolicy!==undefined){const p=s.schedulingPolicy;if(!p||typeof p!=='object'||![p.maxWeeklyHours,p.minRestHours].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=168)||!Array.isArray(p.eligibility)||new Set(p.eligibility.map(r=>r?.staffId)).size!==p.eligibility.length||p.eligibility.some(r=>!r||!s.staff.some(e=>e.id===r.staffId)||typeof r.locations!=='string'||r.locations.length>2000))throw Error('Invalid scheduling policy.');}
    for(const [kind,schema] of Object.entries(schemas)){
      if(!Array.isArray(s[kind])) throw Error(`Invalid ${kind} list.`);
      const ids=new Set();
      for(const row of s[kind]){
        if(!row || !validId(row.id) || ids.has(row.id)) throw Error(`Invalid ${kind} ID.`); ids.add(row.id);
        for(const [key,[label,type,required,min,max]] of Object.entries(schema)){
          const v=row[key];
          if(v===undefined&&(key==='requirements'||(kind==='staff'&&key==='status')||(kind==='chemistry'&&key==='measuredAt')||(kind==='facility'&&key==='chemistryInterval')))continue;
          if(Array.isArray(type)){if(!type.includes(v)) throw Error(`Invalid ${label}.`);}
          else if(type==='number'){if(v===''&&!required)continue;if(typeof v!=='number'||!Number.isFinite(v)||(min!==undefined&&v<min)||(max!==undefined&&v>max)) throw Error(`Invalid ${label}.`);}
          else {if(typeof v!=='string'||v.length>10000||(required&&!v.trim()&&!(kind==='documents'&&key==='url'&&typeof row.fileId==='string'))) throw Error(`Invalid ${label}.`);
            if(v&&type==='date'&&!validDate(v)) throw Error(`Invalid ${label}.`);
            if(v&&type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw Error(`Invalid ${label}.`);
            if(v&&type==='datetime-local'&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw Error(`Invalid ${label}.`);
            if(v&&type==='datetime-local'&&(!validDate(v.slice(0,10))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.slice(11)))) throw Error(`Invalid ${label}.`);
            if(type==='url'&&!safeUrl(v)&&!(kind==='documents'&&row.fileId&&v==='')) throw Error('Document link must use http or https.');
          }
        }
        if(['shifts','availability','coverage'].includes(kind)&&row.start>=row.end) throw Error('Shift end must be after start.');
        if(kind==='coverage'&&!Number.isInteger(row.minimum))throw Error('Minimum staffing must be a whole number.');
        if(kind==='tasks'&&row.equipmentId!==undefined&&(typeof row.equipmentId!=='string'||(row.equipmentId&&!s.equipment.some(e=>e.id===row.equipmentId))))throw Error('Select existing equipment for this maintenance task.');
        if(kind==='chemistry'&&row.additional!==undefined){if(!Array.isArray(row.additional)||row.additional.length>30||new Set(row.additional.map(r=>r?.parameterId)).size!==row.additional.length)throw Error('Invalid additional measurement list.');for(const r of row.additional)if(!r||!validId(r.parameterId)||typeof r.name!=='string'||!r.name.trim()||r.name.length>150||typeof r.unit!=='string'||!r.unit.trim()||r.unit.length>40||![r.value,r.minimum,r.maximum].every(Number.isFinite)||r.minimum>r.maximum||typeof r.notes!=='string'||r.notes.length>2000)throw Error('Invalid saved additional measurement snapshot.');}
        if(kind==='facility'&&row.chemistryInterval!==undefined&&row.chemistryInterval!==''&&!Number.isInteger(row.chemistryInterval))throw Error('Chemistry reminder interval must be a whole number of minutes.');
        if(kind==='documents'&&row.access!==undefined&&!['All staff','Supervisors'].includes(row.access))throw Error('Invalid document access.');
        if(kind==='documents'&&row.fileId!==undefined&&(typeof row.fileId!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(row.fileId)))throw Error('Invalid document file reference.');
        if(kind==='thresholds'&&(row.minimum>row.maximum||(['chlorine','alkalinity'].includes(row.measurement)&&row.minimum<0)||(row.measurement==='ph'&&(row.minimum<0||row.maximum>14))))throw Error('Invalid facility chemistry limits.');
        if(kind==='templates'&&(row.items.split(/\r?\n/).some(x=>!x.trim())||row.items.split(/\r?\n/).length>100)) throw Error('Use 1–100 nonempty checklist lines.');
        if(['reports','chemistry'].includes(kind) && !(kind==='chemistry'&&row.recordedAt===null&&typeof row.legacyTime==='string') && !(typeof row.recordedAt==='string'&&Number.isFinite(Date.parse(row.recordedAt)))) throw Error('Invalid record timestamp.');
      }
    }
    if(s.facility.length>1) throw Error('Only one facility is supported.');
    for(const kind of ['qualifications','shifts','availability']) for(const row of s[kind]) if(!s.staff.some(p=>p.id===row.staffId)) throw Error('Select an existing employee.');
    if(new Set(s.thresholds.map(t=>t.measurement)).size!==s.thresholds.length)throw Error('Use one limit pair per measurement.');
    for(const r of s.chemistryactions)if(!s.chemistry.some(c=>c.id===r.readingId))throw Error('Select an existing chemistry reading.');
    const employeeShifts=new Map();for(const shift of s.shifts){if(!employeeShifts.has(shift.staffId))employeeShifts.set(shift.staffId,[]);employeeShifts.get(shift.staffId).push(shift);}
    for(const shifts of employeeShifts.values()){shifts.sort((a,b)=>a.start.localeCompare(b.start));for(let i=1;i<shifts.length;i++)if(shifts[i].start<shifts[i-1].end)throw Error('Employee shifts cannot overlap.');}
    if(!Array.isArray(s.inspections)) throw Error('Invalid inspections.');
    const inspectionIds=new Set();
    for(const r of s.inspections){
      if(!r||!validId(r.id)||inspectionIds.has(r.id)||typeof r.name!=='string'||typeof r.owner!=='string'||!r.owner.trim()||!Number.isFinite(Date.parse(r.recordedAt))||!Array.isArray(r.results)||!r.results.length||r.results.length>100)throw Error('Invalid inspection history.');
      inspectionIds.add(r.id);
      if(r.staffId!==undefined&&!s.staff.some(p=>p.id===r.staffId))throw Error('Inspection employee identity is missing.');
      for(const item of r.results){if(!item||typeof item.label!=='string'||!item.label.trim()||!['Pass','Fail','Not applicable'].includes(item.result)||typeof item.notes!=='string'||(item.result==='Fail'&&!item.taskId))throw Error('Invalid inspection result or corrective task.');if(item.taskId&&!s.tasks.some(t=>t.id===item.taskId&&t.inspectionId===r.id))throw Error('Inspection corrective task is missing or linked to another inspection.');}
    }
    if(!Array.isArray(s.adjustments)||s.adjustments.some(a=>!a||typeof a.id!=='string'||typeof a.itemId!=='string'||typeof a.name!=='string'||typeof a.reason!=='string'||!Number.isFinite(a.delta)||!Number.isFinite(Date.parse(a.recordedAt)))) throw Error('Invalid stock history.');
    if(s.adjustments.some(a=>!validId(a.id))||new Set(s.adjustments.map(a=>a.id)).size!==s.adjustments.length)throw Error('Invalid or duplicate stock history ID.');
    for(const t of s.tasks){if(t.inspectionId&&!s.inspections.some(i=>i.id===t.inspectionId&&i.results.some(r=>r.taskId===t.id)))throw Error('Task inspection link is missing or inconsistent.');if(t.chemistryActionId&&!s.chemistryactions.some(a=>a.id===t.chemistryActionId&&a.taskId===t.id))throw Error('Task chemistry action link is missing or inconsistent.');}
    for(const a of s.chemistryactions)if(a.taskId&&!s.tasks.some(t=>t.id===a.taskId&&t.chemistryActionId===a.id))throw Error('Chemistry follow-up task is missing or inconsistent.');
    for(const d of s.documents)if(d.taskId&&!s.tasks.some(t=>t.id===d.taskId))throw Error('Document task link is missing.');
    for(const d of s.documents)if(d.inspectionId&&(!s.inspections.some(i=>i.id===d.inspectionId)||!d.fileId||typeof d.evidenceNotes!=='string'||!d.evidenceNotes.trim()||d.evidenceNotes.length>10000||!Number.isFinite(Date.parse(d.recordedAt))))throw Error('Invalid inspection evidence link or details.');
    for(const key of ['taskupdates','assignments']){
      if(!Array.isArray(s[key]))throw Error('Invalid operations history.');const ids=new Set();
      for(const r of s[key]){if(!r||!validId(r.id)||ids.has(r.id)||!Number.isFinite(Date.parse(r.recordedAt))||typeof r.actor!=='string')throw Error('Invalid operations history record.');ids.add(r.id);
        if(key==='taskupdates'&&(!s.tasks.some(t=>t.id===r.taskId)||typeof r.notes!=='string'||!r.notes.trim()||r.notes.length>10000||!Number.isFinite(r.completion)||r.completion<0||r.completion>100))throw Error('Invalid task progress record.');
        if(key==='assignments'&&(typeof r.staffId!=='string'||typeof r.shiftId!=='string'||typeof r.coverageId!=='string'))throw Error('Invalid assignment approval.');
      }
    }
    return s;
  }
  function upgrade(input){
    if(input?.version===4)return validate(structuredClone(input));
    if([2,3].includes(input?.version))return validate({...blank(),...structuredClone(input),version:4});
    if(input?.version!==1)throw Error('Unsupported workspace version.');
    const s={...blank(),...structuredClone(input),version:4};
    s.tasks=s.tasks.map(t=>({...t,category:'General'}));
    s.staff=s.staff.map(p=>{
      if(p.expiry)s.qualifications.push({id:'legacy-q-'+p.id,staffId:p.id,name:p.role||'Legacy certification',expiry:p.expiry,reference:''});
      if(p.shiftDate&&p.start&&p.end)s.shifts.push({id:'legacy-s-'+p.id,staffId:p.id,start:p.shiftDate+'T'+p.start,end:p.shiftDate+'T'+p.end,location:'Legacy shift'});
      return {id:p.id,name:p.name,role:p.role,email:'',notes:''};
    });
    return validate(s);
  }
  function migrate(tasks,readings){
    const s=blank();
    const seen=new Map();
    function legacyId(kind,row){const value=kind+':'+(row.id===undefined?JSON.stringify(row):String(row.id));let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}const key=kind+'-'+(hash>>>0).toString(16),ordinal=seen.get(key)||0;seen.set(key,ordinal+1);return 'legacy-'+key+'-'+ordinal;}
    if(tasks!==null){if(!Array.isArray(tasks))throw Error('Invalid legacy tasks.');s.tasks=tasks.map(t=>({id:legacyId('task',t),name:t.name,status:t.status,priority:'Normal',due:'',owner:'',category:'General'}));}
    if(readings!==null){if(!Array.isArray(readings))throw Error('Invalid legacy chemistry.');s.chemistry=readings.map(r=>({id:legacyId('reading',r),chlorine:Number(r.chlorine),ph:Number(r.ph),temperature:(Number(r.temperature)-32)*5/9,alkalinity:Number(r.alkalinity),notes:r.notes||'',recordedAt:null,legacyTime:String(r.time||'Unknown time')}));}
    return validate(s);
  }
  const overlaps=(a,b)=>a.start<b.end&&b.start<a.end;
  const requirements=value=>String(value||'').split(/\r?\n|,/).map(x=>x.trim().toLowerCase()).filter(Boolean);
  function currentQualifications(s,staffId){const current=new Map();for(const q of s.qualifications){if(staffId!==undefined&&q.staffId!==staffId)continue;const key=q.staffId+'|'+q.name.trim().toLowerCase(),previous=current.get(key);if(!previous||q.expiry>previous.expiry)current.set(key,q);}return [...current.values()];}
  function missingQualifications(s,staffId,shift){return requirements(shift.requirements).filter(name=>!s.qualifications.some(q=>q.staffId===staffId&&q.name.trim().toLowerCase()===name&&q.expiry>=shift.end.slice(0,10)));}
  function schedulingIssues(s,staffId,shift,{explicitAvailability=false}={}){
    const issues=[];
    if(!s.staff.some(p=>p.id===staffId))return ['Employee not found'];
    if(s.staff.find(p=>p.id===staffId).status==='Inactive')issues.push('Employee is inactive');
    if(s.shifts.some(other=>other.id!==shift.id&&other.staffId===staffId&&overlaps(other,shift)))issues.push('Conflicting assigned shift');
    const availability=s.availability.filter(a=>a.staffId===staffId);
    if(availability.some(a=>a.type==='Unavailable'&&overlaps(a,shift)))issues.push('Employee marked unavailable');
    const windows=availability.filter(a=>a.type==='Available').sort((a,b)=>a.start.localeCompare(b.start));
    if(explicitAvailability||windows.length){let until=shift.start;for(const w of windows){if(w.start<=until&&w.end>until)until=w.end;}if(until<shift.end)issues.push('No confirmed availability covering the full shift');}
    const missing=missingQualifications(s,staffId,shift);if(missing.length)issues.push('Missing or expiring certifications: '+missing.join(', '));
    const policy=s.schedulingPolicy;
    if(policy){
      const others=s.shifts.filter(r=>r.staffId===staffId&&r.id!==shift.id),start=Date.parse(shift.start),end=Date.parse(shift.end);
      if(policy.minRestHours&&others.some(r=>{const a=Date.parse(r.start),b=Date.parse(r.end);return (b<=start&&start-b<policy.minRestHours*3600000)||(a>=end&&a-end<policy.minRestHours*3600000);}))issues.push('Minimum rest period not met');
      if(policy.maxWeeklyHours){const first=new Date(shift.start);first.setHours(0,0,0,0);first.setDate(first.getDate()-((first.getDay()+6)%7));for(let week=first.getTime();week<end;){const next=new Date(week);next.setDate(next.getDate()+7);const until=next.getTime(),hours=[...others,shift].reduce((sum,r)=>sum+Math.max(0,Math.min(Date.parse(r.end),until)-Math.max(Date.parse(r.start),week))/3600000,0);if(hours>policy.maxWeeklyHours){issues.push('Configured weekly hour limit exceeded');break;}week=until;}}
      const restriction=policy.eligibility.find(r=>r.staffId===staffId);if(restriction?.locations.trim()&&!requirements(restriction.locations).includes(String(shift.location).trim().toLowerCase()))issues.push('Employee is not eligible for this coverage area');
    }
    return issues;
  }
  function coverageGaps(s,rule){
    const shifts=s.shifts.filter(t=>t.location.trim().toLowerCase()===rule.location.trim().toLowerCase()&&overlaps(t,rule)&&!missingQualifications(s,t.staffId,{...rule,end:t.end>rule.end?rule.end:t.end}).length&&!schedulingIssues(s,t.staffId,t).some(i=>/rest period|weekly hour|eligible for this/.test(i)));
    const windows=s.availability.filter(a=>shifts.some(t=>t.staffId===a.staffId)&&overlaps(a,rule));
    const points=[...new Set([rule.start,rule.end,...[...shifts,...windows].flatMap(t=>[t.start<rule.start?rule.start:t.start,t.end>rule.end?rule.end:t.end])])].sort();
    return points.slice(0,-1).flatMap((start,i)=>{const end=points[i+1],count=new Set(shifts.filter(t=>t.start<=start&&t.end>=end&&!schedulingIssues(s,t.staffId,{...t,start,end,requirements:rule.requirements}).length).map(t=>t.staffId)).size;return count<rule.minimum?[{start,end,assigned:count,missing:rule.minimum-count}]:[];});
  }
  function chemistryAlerts(s,reading){if(!reading)return [];const primary=s.thresholds.filter(t=>Number.isFinite(reading[t.measurement])&&(reading[t.measurement]<t.minimum||reading[t.measurement]>t.maximum)).map(t=>({measurement:t.measurement,value:reading[t.measurement],minimum:t.minimum,maximum:t.maximum}));const extra=(s.chemistryParameters||[]).filter(p=>p.active).flatMap(p=>{const r=(reading.additional||[]).find(r=>r.parameterId===p.id);if(!r)return p.required?[{measurement:p.name,value:null,minimum:p.minimum,maximum:p.maximum,missing:true}]:[];if(r.unit!==p.unit)return [{measurement:p.name,value:r.value,unit:r.unit,expectedUnit:p.unit,unitMismatch:true}];return r.value<p.minimum||r.value>p.maximum?[{measurement:p.name,value:r.value,minimum:p.minimum,maximum:p.maximum,unit:p.unit}]:[];});return [...primary,...extra];}
  function captureAdditional(s,supplied,old){
    const definitions=s.chemistryParameters||[],previous=old?.additional||[];if(supplied===undefined){if(!old&&definitions.some(p=>p.active&&p.required))throw Error('Record all required additional facility measurements.');return structuredClone(previous);}
    if(!Array.isArray(supplied)||supplied.length>30||new Set(supplied.map(r=>r?.parameterId)).size!==supplied.length||supplied.some(r=>!r||!definitions.some(p=>p.id===r.parameterId&&p.active)||!Number.isFinite(r.value)))throw Error('Send values for current active additional parameters only.');
    const result=previous.filter(r=>!definitions.some(p=>p.id===r.parameterId&&p.active)).map(r=>structuredClone(r));
    for(const p of definitions.filter(p=>p.active)){const r=supplied.find(r=>r.parameterId===p.id);if(!r){if(p.required&&(!old||previous.some(r=>r.parameterId===p.id)))throw Error('Record '+p.name+' using approved facility procedures.');continue;}const prior=previous.find(x=>x.parameterId===p.id);result.push(prior&&prior.value===r.value?structuredClone(prior):{parameterId:p.id,name:p.name,unit:p.unit,value:r.value,minimum:p.minimum,maximum:p.maximum,notes:p.notes});}return result;
  }
  function chemistryTimestamp(reading){const value=reading?.measuredAt||reading?.recordedAt;if(!value)return null;const at=Date.parse(value);return Number.isFinite(at)?at:null;}
  function latestChemistry(s){return [...s.chemistry].reverse().filter(r=>chemistryTimestamp(r)!==null).sort((a,b)=>chemistryTimestamp(b)-chemistryTimestamp(a)||(Date.parse(b.recordedAt)||0)-(Date.parse(a.recordedAt)||0))[0];}
  function chemistryRecency(s,now=Date.now()){
    const reading=latestChemistry(s),at=chemistryTimestamp(reading),interval=Number(s.facility[0]?.chemistryInterval)||0,configured=interval>0;
    return {configured,interval,missing:at===null,future:at!==null&&at>now+5*60000,overdue:configured&&(at===null||now>=at+interval*60000),dueAt:configured&&at!==null?at+interval*60000:null};
  }
  function filterShifts(s,{from='',through='',staffId='',search=''}={}){
    if((from&&!validDate(from))||(through&&!validDate(through))||(from&&through&&from>through))throw Error('Choose a valid schedule date range with From on or before Through.');
    const query=String(search).trim().toLowerCase();
    return s.shifts.filter(r=>(!from||r.end>from+'T00:00')&&(!through||r.start<=through+'T23:59')&&(!staffId||r.staffId===staffId)&&(!query||`${s.staff.find(p=>p.id===r.staffId)?.name||''} ${r.location}`.toLowerCase().includes(query))).sort((a,b)=>a.start.localeCompare(b.start)||a.location.localeCompare(b.location));
  }
  function planPattern(s,input){
    if(!input||!['Shift','Available','Unavailable','Coverage'].includes(input.type)||!validDate(input.from)||!validDate(input.through)||input.from>input.through||(Date.parse(input.through)-Date.parse(input.from))/86400000>89)throw Error('Choose a valid pattern type and a date range of at most 90 days.');
    if(!Array.isArray(input.weekdays)||!input.weekdays.length||input.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Select at least one valid weekday.');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.endTime))throw Error('Enter valid start and end times.');
    if(input.type!=='Coverage'&&!s.staff.some(p=>p.id===input.staffId))throw Error('Select an existing employee.');
    if(['Shift','Coverage'].includes(input.type)&&(typeof input.location!=='string'||!input.location.trim()))throw Error('Enter the coverage area.');
    if(input.type==='Coverage'&&(!Number.isInteger(input.minimum)||input.minimum<1||input.minimum>50))throw Error('Minimum staffing must be a whole number from 1 to 50.');
    const kind=input.type==='Coverage'?'coverage':input.type==='Shift'?'shifts':'availability',staged=structuredClone(s),rows=[];
    const dateText=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    for(let date=new Date(input.from+'T12:00');dateText(date)<=input.through;date.setDate(date.getDate()+1)){
      if(!input.weekdays.includes(date.getDay()))continue;
      const endDate=new Date(date);if(input.endTime<=input.startTime)endDate.setDate(endDate.getDate()+1);
      const record={id:id(),start:dateText(date)+'T'+input.startTime,end:dateText(endDate)+'T'+input.endTime,...(kind==='coverage'?{location:input.location.trim(),minimum:input.minimum,requirements:input.requirements||''}:{staffId:input.staffId,...(kind==='shifts'?{location:input.location.trim(),requirements:input.requirements||''}:{type:input.type,notes:input.notes||''})})};
      validate({...blank(),staff:s.staff,qualifications:s.qualifications,[kind]:[record]});
      const sameArea=r=>r.location.trim().toLowerCase()===record.location.toLowerCase(),sameRequirements=r=>requirements(r.requirements).sort().join()===requirements(record.requirements).sort().join();
      const duplicate=s[kind].some(r=>r.start===record.start&&r.end===record.end&&(kind==='coverage'?sameArea(r)&&r.minimum===record.minimum&&sameRequirements(r):r.staffId===record.staffId&&(kind==='shifts'?sameArea(r)&&sameRequirements(r):r.type===record.type)));
      const conflictingRule=kind==='coverage'&&!duplicate&&s.coverage.some(r=>r.start===record.start&&r.end===record.end&&sameArea(r));
      const issues=kind==='shifts'?schedulingIssues(staged,record.staffId,record):kind==='coverage'?(conflictingRule?['A different requirement exists for this area/time. Edit that period directly.']:[`${coverageGaps(staged,record).length} current staffing gap intervals; requirements do not assign employees`]):staged.shifts.filter(r=>r.staffId===record.staffId&&overlaps(r,record)&&input.type==='Unavailable').map(()=> 'This unavailability conflicts with an existing assigned shift');
      const blocked=!duplicate&&((kind==='shifts'&&issues.length>0)||conflictingRule);
      rows.push({record,duplicate,blocked,issues:duplicate?[]:issues});if(!duplicate&&!blocked)staged[kind].push(record);
    }
    if(!rows.length)throw Error('No selected weekdays occur in the chosen date range.');
    return {kind,rows};
  }
  const api={schemas,blank,id,validate,migrate,upgrade,safeUrl,validDate,overlaps,requirements,currentQualifications,missingQualifications,schedulingIssues,coverageGaps,chemistryAlerts,captureAdditional,chemistryTimestamp,latestChemistry,chemistryRecency,planPattern,filterShifts};
  if(typeof module!=='undefined')module.exports=api;else root.AquaModel=api;
})(globalThis);

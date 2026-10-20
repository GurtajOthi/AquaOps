const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../frontend/model');
test('legacy migration preserves statuses, converts Fahrenheit, and does not invent dates',()=>{
  const tasks=[{id:1,name:'Backwash',status:'Confirmed'}], readings=[{time:'09:00',chlorine:'2.5',ph:'7.4',temperature:'84.2',alkalinity:'90',notes:'Opening'}];
  const s=M.migrate(tasks,readings);
  assert.equal(s.tasks[0].status,'Confirmed');assert.equal(s.tasks[0].due,'');assert.ok(Math.abs(s.chemistry[0].temperature-29)<0.0001);assert.equal(s.chemistry[0].recordedAt,null);assert.equal(readings[0].temperature,'84.2');
});
test('invalid imports reject unsafe links, impossible dates and malformed records',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,test','file:///secret']){const s=M.blank();s.documents.push({id:'1',name:'Guide',category:'Safety',url});assert.throws(()=>M.validate(s));}
  assert.equal(M.validDate('2026-02-30'),false);
  assert.throws(()=>M.validate({...M.blank(),tasks:[{id:'1',name:'Incomplete'}]}));
  assert.throws(()=>M.migrate({},null));
});
test('validation permits zero readings and stock but rejects negative stock and invalid pH',()=>{
  const s=M.blank();s.chemistry.push({id:'r',chlorine:0,ph:0,temperature:0,alkalinity:0,notes:'',recordedAt:new Date().toISOString()});
  s.inventory.push({id:'i',name:'Gloves',unit:'boxes',quantity:0,threshold:0});assert.equal(M.validate(s),s);
  s.chemistry[0].ph=15;assert.throws(()=>M.validate(s));s.chemistry[0].ph=7;s.inventory[0].quantity=-1;assert.throws(()=>M.validate(s));
});
test('duplicate IDs and invalid shifts cannot replace saved state',()=>{
  const s=M.blank(),t={id:'t',name:'Check',status:'Scheduled',priority:'Normal',due:'',owner:'',category:'General'};s.tasks=[t,{...t}];assert.throws(()=>M.validate(s),/ID/);
  const p=M.blank();p.staff=[{id:'s',name:'Alex',role:'Lifeguard',email:'',notes:''}];p.shifts=[{id:'shift',staffId:'s',start:'2026-10-17T12:00',end:'2026-10-17T09:00',location:'Main pool'}];assert.throws(()=>M.validate(p),/Shift end/);
});
test('v1 upgrade splits certifications and shifts without mutating the original workspace',()=>{
  const old={version:1,tasks:[],chemistry:[],reports:[],documents:[],inventory:[],adjustments:[],staff:[{id:'s',name:'Alex',role:'Lifeguard',expiry:'2027-01-01',shiftDate:'2026-10-17',start:'09:00',end:'17:00'}]};
  const upgraded=M.upgrade(old);assert.equal(upgraded.qualifications[0].staffId,'s');assert.equal(upgraded.shifts[0].start,'2026-10-17T09:00');assert.equal(upgraded.staff[0].email,'');assert.equal(old.version,1);assert.equal(old.staff[0].expiry,'2027-01-01');
});
test('repeated legacy imports have stable IDs while retaining identical original readings',()=>{
  const tasks=[{id:7,name:'Backwash',status:'Scheduled'}],r={time:'09:00',chlorine:'2.5',ph:'7.4',temperature:'84',alkalinity:'90',notes:''},readings=[r,{...r}];
  const first=M.migrate(tasks,readings),second=M.migrate(tasks,readings);assert.deepEqual(first,second);assert.notEqual(first.chemistry[0].id,first.chemistry[1].id);
  tasks[0].status='Completed';assert.equal(M.migrate(tasks,readings).tasks[0].id,first.tasks[0].id);
});
test('schedule filtering includes overnight intersections, employees and locations without mutating rows',()=>{
  const s=M.blank();s.staff=[{id:'a',name:'Alex',role:'Guard',email:'',notes:''},{id:'b',name:'Bailey',role:'Guard',email:'',notes:''}];
  s.shifts=[{id:'late',staffId:'a',start:'2027-03-03T09:00',end:'2027-03-03T17:00',location:'Deck'},{id:'night',staffId:'b',start:'2027-03-01T22:00',end:'2027-03-02T06:00',location:'Main pool'},{id:'midnight',staffId:'a',start:'2027-03-01T20:00',end:'2027-03-02T00:00',location:'Training'}];
  assert.deepEqual(M.filterShifts(s,{from:'2027-03-02',through:'2027-03-02'}).map(r=>r.id),['night']);assert.deepEqual(M.filterShifts(s,{staffId:'a',search:' DECK '}).map(r=>r.id),['late']);assert.equal(M.filterShifts(s,{search:'Bailey'}).length,1);assert.equal(s.shifts[0].id,'late');
  for(const filter of [{from:'2027-02-30'},{from:'2027-03-02',through:'2027-03-01'}])assert.throws(()=>M.filterShifts(s,filter),/date range/);
});
test('chemistry chronology uses measurement time, preserves save time and never invents legacy dates',()=>{
  const s=M.blank(),newer={id:'new',chlorine:2,ph:7.4,temperature:29,alkalinity:90,notes:'',measuredAt:'2027-01-02T09:00',recordedAt:'2027-01-02T12:00:00Z'},backfill={...newer,id:'old',measuredAt:'2027-01-01T09:00',recordedAt:'2027-01-03T12:00:00Z'},unknown={...newer,id:'legacy',measuredAt:'',recordedAt:null,legacyTime:'09:00'};s.chemistry=[newer,backfill,unknown];M.validate(s);assert.equal(M.latestChemistry(s).id,'new');assert.equal(M.chemistryTimestamp(unknown),null);assert.equal(backfill.recordedAt,'2027-01-03T12:00:00Z');assert.equal(s.chemistry[0],newer);assert.equal(M.chemistryTimestamp({...newer,measuredAt:''}),Date.parse(newer.recordedAt));
});
test('chemistry reminders require a configured interval and flag missing, overdue or future timestamps without safety claims',()=>{
  const s=M.blank(),now=Date.parse('2027-01-01T12:00:00Z');assert.equal(M.chemistryRecency(s,now).overdue,false);s.facility=[{id:'f',name:'Pool',status:'Not assessed',notes:'Test procedure',chemistryInterval:60}];assert.equal(M.chemistryRecency(s,now).overdue,true);s.chemistry=[{id:'r',chlorine:2,ph:7.4,temperature:29,alkalinity:90,notes:'',recordedAt:'2027-01-01T11:01:00Z'}];assert.equal(M.chemistryRecency(s,now).overdue,false);s.chemistry[0].recordedAt='2027-01-01T11:00:00Z';assert.equal(M.chemistryRecency(s,now).overdue,true);s.chemistry[0].recordedAt='2027-01-01T13:00:00Z';assert.equal(M.chemistryRecency(s,now).future,true);s.facility[0].chemistryInterval='';assert.equal(M.chemistryRecency(s,now).configured,false);
});
test('v3 workspaces upgrade to v4 without changing historical timestamps or adding invented measurements',()=>{
  const old={...M.blank(),version:3};old.chemistry=[{id:'r',chlorine:2,ph:7.4,temperature:29,alkalinity:90,notes:'Original',recordedAt:'2026-10-01T09:00:00Z'}];old.staff=[{id:'p',name:'Pat',role:'Guard',email:'',notes:''}];const next=M.upgrade(old);assert.equal(next.version,4);assert.deepEqual(next.chemistry,old.chemistry);assert.deepEqual(next.staff,old.staff);assert.equal(old.version,3);assert.equal(next.chemistry[0].measuredAt,undefined);
});
test('renewed credentials supersede older expiration reminders without deleting qualification history',()=>{
  const s=M.blank();s.qualifications=[{id:'old',staffId:'a',name:'First aid',expiry:'2020-01-01',reference:'Original'},{id:'new',staffId:'a',name:' FIRST AID ',expiry:'2035-01-01',reference:'Renewal'},{id:'other',staffId:'b',name:'First aid',expiry:'2021-01-01',reference:'Other employee'}];assert.deepEqual(M.currentQualifications(s,'a').map(q=>q.id),['new']);assert.equal(M.currentQualifications(s).length,2);assert.equal(s.qualifications.length,3);assert.equal(s.qualifications[0].id,'old');
});

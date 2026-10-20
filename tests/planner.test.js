'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../frontend/model'),{createServer}=require('../server');
const pattern={type:'Available',staffId:'a',from:'2027-01-04',through:'2027-01-15',weekdays:[1,2,3,4,5],startTime:'08:00',endTime:'18:00',notes:'Confirmed',location:'Pool',requirements:''};
function sample(){const s=M.blank();s.staff=[{id:'a',name:'Alex',role:'Guard',email:'',notes:''}];return s;}
test('weekly patterns generate only selected weekdays and support overnight end dates',()=>{
  const s=sample(),plan=M.planPattern(s,pattern);assert.equal(plan.rows.length,10);assert.equal(plan.rows[0].record.start,'2027-01-04T08:00');assert.equal(plan.rows.at(-1).record.start,'2027-01-15T08:00');assert.equal(s.availability.length,0);
  const overnight=M.planPattern(s,{...pattern,from:'2027-01-04',through:'2027-01-04',startTime:'22:00',endTime:'06:00'});assert.equal(overnight.rows[0].record.end,'2027-01-05T06:00');
});
test('pattern validation rejects unbounded dates, empty weekdays, invalid times and missing employees',()=>{
  const s=sample();for(const changes of [{through:'2028-01-04'},{weekdays:[]},{weekdays:[9]},{from:'2027-02-30'},{startTime:'24:00'},{staffId:'missing'},{type:'Other'}])assert.throws(()=>M.planPattern(s,{...pattern,...changes}));
});
test('pattern preview detects conflicts and exact existing records without mutating them',()=>{
  const s=sample(),rows=M.planPattern(s,pattern).rows;s.availability=rows.map(r=>r.record);assert.ok(M.planPattern(s,pattern).rows.every(r=>r.duplicate));
  s.availability.push({id:'leave',staffId:'a',start:'2027-01-06T10:00',end:'2027-01-06T11:00',type:'Unavailable',notes:'Leave'});
  const preview=M.planPattern(s,{...pattern,type:'Shift',startTime:'09:00',endTime:'17:00'});assert.equal(preview.rows.filter(r=>r.blocked).length,1);assert.equal(s.shifts.length,0);
});
test('weekly coverage requirements need no employee and protect existing differing minimums',()=>{
  const s=M.blank(),input={...pattern,type:'Coverage',staffId:'',minimum:2,requirements:'Lifeguard'};const plan=M.planPattern(s,input);assert.equal(plan.kind,'coverage');assert.equal(plan.rows.length,10);assert.equal(plan.rows[0].record.minimum,2);assert.equal(plan.rows[0].record.staffId,undefined);assert.ok(plan.rows.every(r=>!r.blocked));s.coverage=plan.rows.map(r=>r.record);assert.ok(M.planPattern(s,input).rows.every(r=>r.duplicate));const changed=M.planPattern(s,{...input,minimum:3});assert.ok(changed.rows.every(r=>r.blocked));assert.equal(s.coverage[0].minimum,2);assert.throws(()=>M.planPattern(s,{...input,minimum:1.5}),/whole number/);
});
test('supervisor pattern preview/apply is atomic, non-destructive and duplicate-safe',async()=>{
  const root=path.join(__dirname,'../test-data');fs.mkdirSync(root,{recursive:true});const dataDir=fs.mkdtempSync(path.join(root,'planner-')),server=createServer({dataDir});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;let revision=0,state,cookie='',csrf='';
  async function req(route,method='GET',data,status=200){const r=await fetch(base+route,{method,headers:{Cookie:cookie,'Content-Type':'application/json','X-AquaOps-Client':'1','X-CSRF-Token':csrf},...(data?{body:JSON.stringify({...data,revision:data.revision??revision})}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const body=await r.json();assert.equal(r.status,status,JSON.stringify(body));if(body.csrf)csrf=body.csrf;if(body.state){state=body.state;revision=body.revision;}return body;}
  try{
    await req('/api/setup','POST',{token:fs.readFileSync(path.join(dataDir,'setup-token.txt'),'utf8'),username:'admin',name:'Supervisor',password:'planner-test-password'});
    await req('/api/records/staff','POST',{record:{name:'Alex',role:'Guard',email:'',notes:''}});const input={...pattern,staffId:state.staff[0].id};
    const preview=await req('/api/schedule/preview','POST',{pattern:input});assert.equal(preview.rows.length,10);assert.equal(state.availability.length,0);
    await req('/api/schedule/apply','POST',{pattern:input},201);assert.equal(state.availability.length,10);const repeated=await req('/api/schedule/preview','POST',{pattern:input});assert.ok(repeated.rows.every(r=>r.duplicate));await req('/api/schedule/apply','POST',{pattern:input},409);assert.equal(state.availability.length,10);
    await req('/api/records/qualifications','POST',{record:{staffId:input.staffId,name:'Lifeguard',expiry:'2030-01-01',reference:'CERT'}});
    await req('/api/records/availability','POST',{record:{staffId:input.staffId,start:'2027-01-06T10:00',end:'2027-01-06T11:00',type:'Unavailable',notes:'Leave'}});const leave=state.availability.at(-1);
    const shifts={...input,type:'Shift',startTime:'09:00',endTime:'17:00',requirements:'Lifeguard'};
    assert.equal((await req('/api/schedule/preview','POST',{pattern:shifts})).rows.filter(r=>r.blocked).length,1);await req('/api/schedule/apply','POST',{pattern:shifts},409);assert.equal(state.shifts.length,0);
    await req('/api/records/availability/'+leave.id,'DELETE',{});await req('/api/schedule/apply','POST',{pattern:shifts},201);assert.equal(state.shifts.length,10);
    const ids=state.shifts.map(s=>s.id);await req('/api/schedule/apply','POST',{pattern:shifts},409);assert.deepEqual(state.shifts.map(s=>s.id),ids);
    await req('/api/schedule/apply','POST',{pattern:{...shifts,from:'2027-02-01',through:'2027-02-05'},revision:0},409);
    const audit=await req('/api/audit');assert.equal(audit.filter(a=>a.action==='Apply weekly scheduling pattern').length,2);
    const coverage={...input,type:'Coverage',staffId:'',minimum:1,requirements:'Lifeguard',startTime:'09:00',endTime:'17:00'};assert.equal((await req('/api/schedule/preview','POST',{pattern:coverage})).kind,'coverage');await req('/api/schedule/apply','POST',{pattern:coverage},201);assert.equal(state.coverage.length,10);assert.equal(state.shifts.length,10);await req('/api/schedule/apply','POST',{pattern:{...coverage,minimum:2}},409);assert.equal(state.coverage.length,10);assert.ok(state.coverage.every(c=>c.minimum===1));
    await req('/api/users','POST',{username:'operator',name:'Operator',role:'operator',password:'planner-test-password'},201);await req('/api/logout','POST',{});await req('/api/login','POST',{username:'operator',password:'planner-test-password'});await req('/api/schedule/preview','POST',{pattern:input},403);await req('/api/schedule/apply','POST',{pattern:input},403);
  }finally{await new Promise(r=>server.close(r));}
});
